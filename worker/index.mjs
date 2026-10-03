/*
 * Kroger price server for the meal planner.
 *
 * A tiny Cloudflare Worker that keeps the Kroger API keys private and lets the
 * site ask for nearby Kroger-family stores and their current shelf prices.
 *
 *   GET  /locations?lat=..&lon=..&radius=..   nearby Kroger-family stores
 *   POST /prices  { locationId, items: [{ key, term }] }   one product per term
 *
 * Secrets (set with `wrangler secret put`): KROGER_CLIENT_ID, KROGER_CLIENT_SECRET.
 * Optional var: ALLOWED_ORIGIN (defaults to *).
 */

const API = 'https://api.kroger.com/v1';
const MAX_ITEMS = 250;
const CONCURRENCY = 6;
const PRICE_TTL = 6 * 60 * 60; // seconds; shelf prices change at most daily

let token = null; // { value, expires }
let pending = null; // in-flight sign-in, shared by parallel lookups

export async function getToken(env, fetchImpl = fetch, now = Date.now()) {
  if (token && token.expires > now + 60000) return token.value;
  if (!env.KROGER_CLIENT_ID || !env.KROGER_CLIENT_SECRET) throw new HttpError(500, 'Kroger keys are not set on the server');
  if (!pending) {
    pending = (async () => {
      const res = await fetchImpl(`${API}/connect/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + btoa(`${env.KROGER_CLIENT_ID}:${env.KROGER_CLIENT_SECRET}`),
        },
        body: 'grant_type=client_credentials&scope=product.compact',
      });
      if (!res.ok) throw new HttpError(502, `Kroger sign-in failed (${res.status})`);
      const json = await res.json();
      token = { value: json.access_token, expires: now + (json.expires_in || 1800) * 1000 };
      return token.value;
    })().finally(() => {
      pending = null;
    });
  }
  return pending;
}

export function resetToken() {
  token = null;
  pending = null;
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function kroger(path, env, fetchImpl) {
  const t = await getToken(env, fetchImpl);
  const res = await fetchImpl(`${API}${path}`, { headers: { Authorization: `Bearer ${t}`, Accept: 'application/json' } });
  if (res.status === 401) resetToken();
  if (!res.ok) throw new HttpError(502, `Kroger request failed (${res.status})`);
  return res.json();
}

// Kroger also lists back-of-house sites (warehouses, forecast and delivery hubs)
// that nobody can shop at; their names give them away.
const NOT_A_STORE = /\b(spoke|forecast|shed|warehouse|unused|fulfillment|trans)\b/i;

export function isShoppable(l) {
  return !NOT_A_STORE.test(`${l.name || ''}`);
}

export function shapeLocation(l) {
  const a = l.address || {};
  return {
    id: l.locationId,
    name: l.name || l.chain,
    chain: l.chain,
    lat: l.geolocation && l.geolocation.latitude,
    lon: l.geolocation && l.geolocation.longitude,
    address: [a.addressLine1, a.city, a.state, a.zipCode].filter(Boolean).join(', '),
  };
}

export function shapeProduct(p) {
  if (!p) return null;
  const item = (p.items || [])[0] || {};
  const price = item.price || {};
  const regular = Number(price.regular) || 0;
  const promo = Number(price.promo) || 0;
  if (!regular && !promo) return null; // not sold at this store right now
  return {
    description: p.description,
    brand: p.brand || '',
    size: item.size || '',
    soldBy: item.soldBy || '',
    price: promo > 0 && promo < regular ? promo : regular,
    regular,
    onSale: promo > 0 && promo < regular,
  };
}

async function locations(url, env, fetchImpl) {
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  const radius = Math.min(100, Math.max(1, Number(url.searchParams.get('radius')) || 10));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new HttpError(400, 'lat and lon are required');
  const q = `filter.lat.near=${lat}&filter.lon.near=${lon}&filter.radiusInMiles=${radius}&filter.limit=30`;
  const json = await kroger(`/locations?${q}`, env, fetchImpl);
  return { stores: (json.data || []).filter(isShoppable).map(shapeLocation).slice(0, 20) };
}

// Kroger wants 3+ characters and at most 8 words.
export function cleanTerm(term) {
  return String(term || '')
    .replace(/[^\p{L}\p{N}&' -]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .join(' ');
}

async function prices(body, env, fetchImpl, cache) {
  const locationId = String((body && body.locationId) || '');
  if (!/^\w{3,20}$/.test(locationId)) throw new HttpError(400, 'locationId is required');
  const items = Array.isArray(body.items) ? body.items.slice(0, MAX_ITEMS) : [];
  const out = {};
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const { key, term } = items[i++] || {};
      const t = cleanTerm(term);
      if (!key || t.length < 3) continue;
      const path = `/products?filter.term=${encodeURIComponent(t)}&filter.locationId=${locationId}&filter.limit=1`;
      const cacheKey = cache && new Request(`https://kroger-cache.local${path}`);
      let json = cache && (await cache.match(cacheKey).then((r) => r && r.json()).catch(() => null));
      if (!json) {
        try {
          json = await kroger(path, env, fetchImpl);
        } catch (e) {
          out[key] = null;
          continue;
        }
        if (cache) {
          const res = new Response(JSON.stringify(json), { headers: { 'Cache-Control': `max-age=${PRICE_TTL}` } });
          await cache.put(cacheKey, res).catch(() => {});
        }
      }
      out[key] = shapeProduct((json.data || [])[0]);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return { locationId, prices: out };
}

function cors(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function handle(request, env, fetchImpl = fetch, cache = null) {
  const headers = { ...cors(env), 'Content-Type': 'application/json' };
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
  const url = new URL(request.url);
  try {
    let data;
    if (request.method === 'GET' && url.pathname === '/locations') data = await locations(url, env, fetchImpl);
    else if (request.method === 'POST' && url.pathname === '/prices') data = await prices(await request.json(), env, fetchImpl, cache);
    else throw new HttpError(404, 'Not found');
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: e.status || 500, headers });
  }
}

export default {
  fetch(request, env) {
    return handle(request, env, fetch, typeof caches !== 'undefined' ? caches.default : null);
  },
};

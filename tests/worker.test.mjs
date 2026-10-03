import test from 'node:test';
import assert from 'node:assert/strict';
import { handle, resetToken, cleanTerm, shapeProduct, isShoppable } from '../worker/index.mjs';

const env = { KROGER_CLIENT_ID: 'id', KROGER_CLIENT_SECRET: 'secret' };

function fakeKroger(calls) {
  return async (url, opts = {}) => {
    calls.push(String(url));
    const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
    if (String(url).includes('/oauth2/token')) {
      assert.equal(opts.headers.Authorization, 'Basic ' + btoa('id:secret'));
      return json({ access_token: 'tok', expires_in: 1800 });
    }
    assert.equal(opts.headers.Authorization, 'Bearer tok');
    if (String(url).includes('/locations')) {
      return json({ data: [{ locationId: '01400943', chain: 'KROGER', name: 'Kroger Clark St', geolocation: { latitude: 41.92, longitude: -87.65 }, address: { addressLine1: '1 Clark St', city: 'Chicago', state: 'IL', zipCode: '60614' } }] });
    }
    if (String(url).includes('filter.term=Hot%20Pockets')) {
      return json({ data: [{ description: 'Hot Pockets Pepperoni Pizza', brand: 'Hot Pockets', items: [{ size: '2 ct', soldBy: 'UNIT', price: { regular: 3.49, promo: 2.99 } }] }] });
    }
    if (String(url).includes('filter.term=Nothing')) return json({ data: [] });
    return json({}, 500);
  };
}

test('worker lists nearby Kroger stores', async () => {
  resetToken();
  const calls = [];
  const res = await handle(new Request('https://w.dev/locations?lat=41.9&lon=-87.6&radius=5'), env, fakeKroger(calls));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.stores[0].id, '01400943');
  assert.equal(body.stores[0].address, '1 Clark St, Chicago, IL, 60614');
  assert.match(calls[1], /filter\.radiusInMiles=5/);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
});

test('worker prices items, uses sale prices and tolerates misses', async () => {
  resetToken();
  const calls = [];
  const req = new Request('https://w.dev/prices', {
    method: 'POST',
    body: JSON.stringify({ locationId: '01400943', items: [{ key: 'hot_pocket', term: 'Hot Pockets' }, { key: 'x', term: 'Nothing here' }, { key: 'y', term: 'Broken' }] }),
  });
  const res = await handle(req, env, fakeKroger(calls));
  const body = await res.json();
  assert.equal(body.prices.hot_pocket.price, 2.99);
  assert.equal(body.prices.hot_pocket.onSale, true);
  assert.equal(body.prices.hot_pocket.size, '2 ct');
  assert.equal(body.prices.x, null);
  assert.equal(body.prices.y, null);
  assert.equal(calls.filter((c) => c.includes('oauth2')).length, 1, 'token is reused');
});

test('worker rejects bad requests and missing keys', async () => {
  resetToken();
  const bad = await handle(new Request('https://w.dev/prices', { method: 'POST', body: '{}' }), env, fakeKroger([]));
  assert.equal(bad.status, 400);
  const nokeys = await handle(new Request('https://w.dev/locations?lat=1&lon=2'), {}, fakeKroger([]));
  assert.equal(nokeys.status, 500);
  assert.match((await nokeys.json()).error, /keys are not set/);
  assert.equal((await handle(new Request('https://w.dev/nope'), env, fakeKroger([]))).status, 404);
});

test('search terms and products are cleaned up', () => {
  assert.equal(cleanTerm("Totino's Pizza Rolls!"), "Totino's Pizza Rolls");
  assert.equal(cleanTerm('a b c d e f g h i j').split(' ').length, 8);
  assert.equal(shapeProduct({ items: [{ price: { regular: 0, promo: 0 } }] }), null);
  assert.equal(shapeProduct({ description: 'Milk', items: [{ size: '1 gal', price: { regular: 3.29, promo: 0 } }] }).price, 3.29);
});

test('worker hides Kroger back-of-house locations', () => {
  for (const name of ['Kroger - Spoke Forecast', 'Kroger - Forecast Shed', 'Kroger - Zero Warehouse', 'Harris Teeter - - Unused Spoke', 'Harris Teeter - Spoke Forecast - HT Trans']) {
    assert.equal(isShoppable({ name }), false, name);
  }
  for (const name of ['Kroger - Kroger On the Rhine', 'Kroger Marketplace - Oakley OH Marketplace', 'Kroger - Bellevue Kroger']) {
    assert.equal(isShoppable({ name }), true, name);
  }
});

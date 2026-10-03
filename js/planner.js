/*
 * Pure planning logic: filtering recipes by plan style and appliances,
 * estimating costs, auto-filling a week, building the shopping list and
 * finding nearby grocery stores via OpenStreetMap's Overpass API.
 *
 * No DOM access here so it can be unit tested in Node.
 */
(function (root) {
  'use strict';

  const D =
    typeof module === 'object' && module.exports ? require('./data.js') : root.MPData;

  const RECIPE_BY_ID = {};
  D.RECIPES.forEach((rec) => {
    RECIPE_BY_ID[rec.id] = rec;
  });

  const MAIN_MEALS = ['breakfast', 'lunch', 'dinner'];

  // Weekday mornings are rushed, so those breakfasts lean on things you can grab in 5 minutes or less.
  const QUICK_GRAB_MINUTES = 5;
  const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  function isQuickGrab(recipe) {
    return !!recipe && recipe.time <= QUICK_GRAB_MINUTES;
  }

  function isRushSlot(day, meal) {
    return meal === 'breakfast' && WEEKDAYS.includes(day);
  }

  function getRecipe(id) {
    return id ? RECIPE_BY_ID[id] || null : null;
  }

  // ---------- Live store prices (Kroger) ----------
  // With a live-priced store selected, costs use its shelf prices. Anything the
  // store doesn't price, or whose package size we can't convert, stays estimated.
  let live = null; // { [ingredientKey]: product from the price server }

  function setLivePrices(prices) {
    live = prices || null;
  }

  // Search term for an ingredient: its name without notes in brackets or after a comma.
  function searchTerm(key) {
    const i = D.INGREDIENTS[key];
    if (!i) return '';
    return (i.term || i.name).replace(/\(.*?\)/g, '').split(',')[0].replace(/\s+/g, ' ').trim();
  }

  // "12 ct", "1 gal", "16 oz", "1/2 gal", "6 ct / 1.5 oz" -> { n, u } from the first part.
  function parseSize(size) {
    const m = String(size || '')
      .toLowerCase()
      .split('/ ')[0]
      .match(/(\d+(?:\.\d+)?(?:\/\d+)?)\s*(fl\.? ?oz|oz|lbs?|ct|count|each|ea|pk|gal|qt|pt|ml|l|g|kg)\b/);
    if (!m) return null;
    const [a, b] = m[1].split('/');
    const n = b ? Number(a) / Number(b) : Number(a);
    let u = m[2].replace(/\.|\s/g, '');
    if (u === 'lbs') u = 'lb';
    if (u === 'count' || u === 'each' || u === 'ea' || u === 'pk') u = 'ct';
    return n > 0 ? { n, u } : null;
  }

  // Rough ounces per cup for things sold by weight but used by the cup.
  const OZ_PER_CUP = { cheddar: 4, mozzarella: 4, oats: 3, rice: 6.5, quinoa: 6, cereal: 1.3, frozen_fries: 3, frozen_veg: 5, frozen_berries: 5, spinach: 1, granola: 4 };

  // How many of our recipe units one package holds, or null when we can't tell.
  function unitsPerPack(key, product) {
    const i = D.INGREDIENTS[key];
    const sz = product && parseSize(product.size);
    if (!i || !product) return null;
    if (product.soldBy && /weight/i.test(product.soldBy) && i.unit !== 'lb' && i.unit !== 'oz') return null;
    if (!sz) return i.unit === 'each' || i.unit === 'can' ? 1 : null;
    const { n, u } = sz;
    const floz = u === 'floz' ? n : u === 'gal' ? n * 128 : u === 'qt' ? n * 32 : u === 'pt' ? n * 16 : u === 'l' ? n * 33.8 : u === 'ml' ? n / 29.57 : null;
    const oz = u === 'oz' ? n : u === 'lb' ? n * 16 : u === 'g' ? n / 28.35 : u === 'kg' ? n * 35.27 : null;
    switch (i.unit) {
      case 'each':
      case 'can':
        return u === 'ct' ? n : 1; // a single packaged item (e.g. "3.2 oz" Lunchables) is one
      case 'cup':
        if (floz) return floz / 8;
        if (oz) return oz / (OZ_PER_CUP[key] || 8);
        return null;
      case 'tbsp':
        return floz ? floz * 2 : oz ? oz * 2 : null;
      case 'tsp':
        return floz ? floz * 6 : oz ? oz * 6 : null;
      case 'oz':
        return oz || floz || null;
      case 'lb':
        return oz ? oz / 16 : null;
      case 'slice':
        return u === 'ct' ? n : oz || null;
      case 'scoop':
        return oz ? oz / 1.06 : null;
      default:
        return null;
    }
  }

  // Exact spend for buying `qty` units of an ingredient from a live product, or null.
  function liveCost(key, qty, product) {
    const per = unitsPerPack(key, product);
    if (!per || !(product.price > 0)) return null;
    const packs = Math.max(1, Math.ceil(qty / per - 1e-9));
    return { packs, cost: packs * product.price, unitPrice: product.price / per };
  }

  function unitPrice(key) {
    const product = live && live[key];
    const lc = product && liveCost(key, 1, product);
    return lc ? lc.unitPrice : D.INGREDIENTS[key].price;
  }

  function recipeCost(recipe) {
    return recipe.ingredients.reduce((sum, [key, qty]) => sum + unitPrice(key) * qty, 0);
  }

  function recipeFlags(recipe) {
    const flags = { meat: false, fish: false, dairy: false, egg: false, gluten: false, honey: false, heavy: false };
    recipe.ingredients.forEach(([key]) => {
      const i = D.INGREDIENTS[key];
      Object.keys(flags).forEach((f) => {
        if (i[f]) flags[f] = true;
      });
    });
    return flags;
  }

  // [main meal threshold, snack threshold]
  const LIMITS = {
    highProtein: [25, 12],
    highFiber: [8, 4],
    lowCarb: [25, 12],
    keto: [12, 6],
    moneySaver: [2.5, 1],
    lowCalorie: [450, 180],
    heartHealthy: [4, 2],
  };

  function matchesStyle(recipe, styleId) {
    const idx = recipe.meal === 'snack' ? 1 : 0;
    const lim = LIMITS[styleId] ? LIMITS[styleId][idx] : null;
    const f = recipeFlags(recipe);
    switch (styleId) {
      case 'balanced':
        return true;
      case 'highProtein':
        return recipe.protein >= lim;
      case 'highFiber':
        return recipe.fiber >= lim;
      case 'lowCarb':
      case 'keto':
        return recipe.carbs <= lim;
      case 'moneySaver':
        return recipeCost(recipe) <= lim;
      case 'lowCalorie':
        return recipe.kcal <= lim;
      case 'vegetarian':
        return !f.meat && !f.fish;
      case 'vegan':
        return !f.meat && !f.fish && !f.dairy && !f.egg && !f.honey;
      case 'pescatarian':
        return !f.meat;
      case 'glutenFree':
        return !f.gluten;
      case 'heartHealthy':
        return !f.heavy && recipe.fiber >= lim;
      case 'readyMade':
        return !!recipe.ready;
      case 'mediterranean':
        return !!recipe.med;
      case 'quick':
        return recipe.time <= 15;
      default:
        return true;
    }
  }

  function fitsStyles(recipe, styles) {
    return (styles || []).every((s) => matchesStyle(recipe, s));
  }

  // Every requirement must be met; "a|b" is satisfied by either appliance.
  function hasAppliances(recipe, appliances) {
    const have = new Set(appliances || []);
    return recipe.appliances.every((req) => req.split('|').some((a) => have.has(a)));
  }

  function fitsPrefs(recipe, prefs) {
    return fitsStyles(recipe, prefs.styles) && hasAppliances(recipe, prefs.appliances);
  }

  // Money saver lists the cheapest meals first; otherwise alphabetical.
  function recipeOptions(meal, prefs) {
    const cheapFirst = (prefs.styles || []).includes('moneySaver');
    return D.RECIPES.filter((rec) => rec.meal === meal && fitsPrefs(rec, prefs)).sort(
      (a, b) => (cheapFirst ? recipeCost(a) - recipeCost(b) : 0) || a.name.localeCompare(b.name)
    );
  }

  function emptyPlan() {
    const plan = {};
    D.DAYS.forEach((day) => {
      plan[day] = { breakfast: null, lunch: null, dinner: null, snack: null };
    });
    return plan;
  }

  function isDayMainComplete(plan, day) {
    return MAIN_MEALS.every((m) => !!(plan[day] && plan[day][m]));
  }

  function countMainFilled(plan) {
    let n = 0;
    D.DAYS.forEach((day) => {
      MAIN_MEALS.forEach((m) => {
        if (plan[day] && plan[day][m]) n++;
      });
    });
    return n;
  }

  function isWeekComplete(plan) {
    return D.DAYS.every((day) => isDayMainComplete(plan, day));
  }

  function plannedRecipes(plan) {
    const out = [];
    D.DAYS.forEach((day) => {
      D.MEALS.forEach(({ id }) => {
        const rec = getRecipe(plan[day] && plan[day][id]);
        if (rec) out.push(rec);
      });
    });
    return out;
  }

  // Nutrition per person for one day (snack included when picked).
  function dayTotals(plan, day) {
    const t = { kcal: 0, protein: 0, carbs: 0, fiber: 0, cost: 0, meals: 0 };
    D.MEALS.forEach(({ id }) => {
      const rec = getRecipe(plan[day] && plan[day][id]);
      if (!rec) return;
      t.kcal += rec.kcal;
      t.protein += rec.protein;
      t.carbs += rec.carbs;
      t.fiber += rec.fiber;
      t.cost += recipeCost(rec);
      t.meals += 1;
    });
    return t;
  }

  function buildShoppingList(plan, servings) {
    const n = Math.max(1, Number(servings) || 1);
    const totals = {};
    plannedRecipes(plan).forEach((rec) => {
      rec.ingredients.forEach(([key, qty]) => {
        totals[key] = (totals[key] || 0) + qty * n;
      });
    });
    const items = Object.keys(totals).map((key) => {
      const i = D.INGREDIENTS[key];
      const qty = totals[key];
      const buyQty = D.WHOLE_UNITS.includes(i.unit) ? Math.ceil(qty - 1e-9) : qty;
      const product = live && live[key];
      const lc = product && liveCost(key, qty, product);
      if (lc) {
        return { key, name: i.name, cat: i.cat, unit: i.unit, qty, buyQty, cost: lc.cost, staple: i.staple, live: { ...product, packs: lc.packs } };
      }
      return {
        key,
        name: i.name,
        cat: i.cat,
        unit: i.unit,
        qty,
        buyQty,
        cost: buyQty * i.price,
        staple: i.staple,
      };
    });
    items.sort(
      (a, b) => D.CATEGORIES.indexOf(a.cat) - D.CATEGORIES.indexOf(b.cat) || a.name.localeCompare(b.name)
    );
    return items;
  }

  function groupBy(items, fn) {
    const groups = [];
    const index = {};
    items.forEach((item) => {
      const k = fn(item);
      if (!(k in index)) {
        index[k] = groups.length;
        groups.push({ key: k, items: [] });
      }
      groups[index[k]].items.push(item);
    });
    return groups;
  }

  function listTotal(items, excluded) {
    const skip = excluded || {};
    return items.reduce((sum, it) => (skip[it.key] ? sum : sum + it.cost), 0);
  }

  function weeklyCost(plan, servings) {
    return listTotal(buildShoppingList(plan, servings));
  }

  // Fill every empty slot with a fitting recipe, trying to stay within budget
  // and avoiding repeating a recipe more than twice a week.
  function autofill(plan, prefs, rng) {
    const rand = rng || Math.random;
    const servings = Math.max(1, Number(prefs.servings) || 1);
    const next = JSON.parse(JSON.stringify(plan));
    const uses = {};
    plannedRecipes(next).forEach((rec) => {
      uses[rec.id] = (uses[rec.id] || 0) + 1;
    });

    const slots = [];
    D.DAYS.forEach((day) => {
      D.MEALS.forEach(({ id }) => {
        if (!next[day][id]) slots.push([day, id]);
      });
    });

    const budget = Number(prefs.budget) || 0;
    let spent = plannedRecipes(next).reduce((s, rec) => s + recipeCost(rec) * servings, 0);

    slots.forEach(([day, meal], i) => {
      let options = recipeOptions(meal, prefs);
      if (isRushSlot(day, meal) && options.some(isQuickGrab)) options = options.filter(isQuickGrab);
      if (!options.length) return;
      const remainingSlots = slots.length - i;
      const target = budget > 0 ? ((budget * 0.92 - spent) / remainingSlots) : Infinity;
      const fresh = options.filter((rec) => (uses[rec.id] || 0) < 2);
      const pool = fresh.length ? fresh : options;
      const affordable = pool.filter((rec) => recipeCost(rec) * servings <= target);
      let pick;
      if (affordable.length) {
        pick = affordable[Math.floor(rand() * affordable.length)];
      } else {
        pick = pool.slice().sort((a, b) => recipeCost(a) - recipeCost(b))[0];
      }
      next[day][meal] = pick.id;
      uses[pick.id] = (uses[pick.id] || 0) + 1;
      spent += recipeCost(pick) * servings;
    });
    return next;
  }

  const FRACTIONS = [
    [0, ''],
    [0.25, '¼'],
    [1 / 3, '⅓'],
    [0.5, '½'],
    [2 / 3, '⅔'],
    [0.75, '¾'],
    [1, ''],
  ];

  function fractionString(q) {
    let whole = Math.floor(q);
    const rest = q - whole;
    let best = FRACTIONS[0];
    FRACTIONS.forEach((f) => {
      if (Math.abs(f[0] - rest) < Math.abs(best[0] - rest)) best = f;
    });
    if (best[0] === 1) whole += 1;
    const frac = best[0] === 1 ? '' : best[1];
    if (!whole && !frac) return '¼';
    return whole ? (frac ? `${whole} ${frac}` : String(whole)) : frac;
  }

  const UNIT_LABELS = {
    cup: ['cup', 'cups'],
    tbsp: ['tbsp', 'tbsp'],
    tsp: ['tsp', 'tsp'],
    oz: ['oz', 'oz'],
    lb: ['lb', 'lb'],
    can: ['can', 'cans'],
    slice: ['slice', 'slices'],
    clove: ['clove', 'cloves'],
    stalk: ['stalk', 'stalks'],
    scoop: ['scoop', 'scoops'],
  };

  function formatQty(qty, unit) {
    if (unit === 'each') return String(Math.ceil(qty - 1e-9));
    let text;
    if (unit === 'lb') text = (Math.ceil(qty * 4 - 1e-9) / 4).toString();
    else if (unit === 'oz') text = String(Math.ceil(qty - 1e-9));
    else if (unit === 'tbsp' || unit === 'tsp') text = String(Math.ceil(qty - 1e-9));
    else if (D.WHOLE_UNITS.includes(unit)) text = String(Math.ceil(qty - 1e-9));
    else text = fractionString(qty);
    const labels = UNIT_LABELS[unit] || [unit, unit];
    const plural = parseFloat(text) > 1 || /\d \S/.test(text);
    return `${text} ${plural ? labels[1] : labels[0]}`;
  }

  // Recipe amounts: exact fractions, no rounding up to whole packages.
  function formatAmount(qty, unit) {
    let text;
    if (unit === 'lb' || unit === 'oz') text = String(Math.round(qty * 100) / 100);
    else text = fractionString(qty);
    if (unit === 'each') return text;
    const labels = UNIT_LABELS[unit] || [unit, unit];
    const plural = parseFloat(text) > 1 || /\d \S/.test(text);
    return `${text} ${plural ? labels[1] : labels[0]}`;
  }

  // Ingredient lines for one recipe, scaled to the household.
  function recipeIngredients(recipe, servings) {
    const n = Math.max(1, Number(servings) || 1);
    return recipe.ingredients.map(([key, qty]) => {
      const i = D.INGREDIENTS[key];
      let name = i.name;
      // "½ Onion", not "½ Onions"
      if (i.unit === 'each' && qty * n <= 1) name = name.replace(/oes$/, 'o').replace(/s$/, '');
      return { key, name, amount: formatAmount(qty * n, i.unit), staple: i.staple };
    });
  }

  function money(n) {
    return '$' + (Math.round(n * 100) / 100).toFixed(2);
  }

  // ---- Store search (OpenStreetMap) ----

  const MILE_M = 1609.344;

  function haversineMiles(lat1, lon1, lat2, lon2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const STORE_SHOPS = ['supermarket', 'greengrocer'];

  function buildOverpassQuery(lat, lon, radiusMiles) {
    const meters = Math.round(Math.min(Math.max(radiusMiles, 0.5), 50) * MILE_M);
    return (
      `[out:json][timeout:25];` +
      `nwr["shop"~"^(${STORE_SHOPS.join('|')})$"](around:${meters},${lat},${lon});` +
      `out center tags 200;`
    );
  }

  function formatAddress(tags) {
    const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
    const city = [tags['addr:city'], tags['addr:state']].filter(Boolean).join(', ');
    return [street, city].filter(Boolean).join(', ');
  }

  const SHOP_LABELS = {
    supermarket: 'Supermarket',
    grocery: 'Grocery',
    greengrocer: 'Produce market',
  };

  function storeTier(name) {
    const n = String(name || '').toLowerCase();
    if (D.TIER_CHAINS.discount.some((c) => n.includes(c))) return 'discount';
    if (D.TIER_CHAINS.premium.some((c) => n.includes(c))) return 'premium';
    return 'standard';
  }

  // Estimated cost of the list at a store, using its price tier.
  // A live store prices each item from its own shelf (falling back to the estimate);
  // other stores scale the estimate by their price tier.
  function storeTotal(items, store, excluded) {
    return storeBreakdown(items, store, excluded).total;
  }

  function storeBreakdown(items, store, excluded) {
    const skip = excluded || {};
    const kept = items.filter((it) => !skip[it.key]);
    if (store && store.prices) {
      let total = 0;
      let priced = 0;
      kept.forEach((it) => {
        const lc = store.prices[it.key] && liveCost(it.key, it.qty, store.prices[it.key]);
        if (lc) priced++;
        total += lc ? lc.cost : D.INGREDIENTS[it.key].price * it.buyQty;
      });
      return { total, priced, count: kept.length };
    }
    const tier = D.STORE_TIERS[(store && store.tier) || 'standard'] || D.STORE_TIERS.standard;
    const base = kept.reduce((sum, it) => sum + (it.live ? D.INGREDIENTS[it.key].price * it.buyQty : it.cost), 0);
    return { total: base * tier.factor, priced: 0, count: kept.length };
  }

  // Kroger-family stores from the price server, in the same shape as map stores.
  function shapeKrogerStores(list, lat, lon) {
    return (list || [])
      .filter((s) => s && s.id && s.lat != null && s.lon != null)
      .map((s) => ({
        id: `kroger/${s.id}`,
        krogerId: s.id,
        name: s.name,
        brand: s.chain || '',
        type: 'Kroger family',
        tier: 'standard',
        live: true,
        address: s.address || '',
        lat: s.lat,
        lon: s.lon,
        distance: haversineMiles(lat, lon, s.lat, s.lon),
      }));
  }

  function parseOverpassStores(json, lat, lon, radiusMiles) {
    const seen = new Set();
    const stores = [];
    ((json && json.elements) || []).forEach((el) => {
      const tags = el.tags || {};
      const sLat = el.lat != null ? el.lat : el.center && el.center.lat;
      const sLon = el.lon != null ? el.lon : el.center && el.center.lon;
      if (sLat == null || sLon == null) return;
      const name = tags.name || tags.brand;
      if (!name) return;
      const distance = haversineMiles(lat, lon, sLat, sLon);
      if (radiusMiles && distance > radiusMiles * 1.02) return;
      const dedupe = `${name.toLowerCase()}@${sLat.toFixed(3)},${sLon.toFixed(3)}`;
      if (seen.has(dedupe)) return;
      seen.add(dedupe);
      stores.push({
        id: `${el.type}/${el.id}`,
        name,
        brand: tags.brand || '',
        type: SHOP_LABELS[tags.shop] || 'Grocery',
        tier: storeTier(`${name} ${tags.brand || ''}`),
        address: formatAddress(tags),
        lat: sLat,
        lon: sLon,
        distance,
      });
    });
    stores.sort((a, b) => a.distance - b.distance);
    return stores;
  }

  function shoppingListText(items, opts) {
    const o = opts || {};
    const stores = o.stores || [];
    const assign = o.assignments || {};
    const excluded = o.excluded || {};
    const storeName = (id) => {
      const s = stores.find((x) => x.id === id);
      return s ? s.name : 'Any store';
    };
    const kept = items.filter((it) => !excluded[it.key]);
    const groups = o.byStore
      ? groupBy(kept, (it) => storeName(assign[it.key]))
      : groupBy(kept, (it) => it.cat);
    const lines = [o.title || 'Shopping list', ''];
    groups.forEach((g) => {
      lines.push(g.key.toUpperCase());
      g.items.forEach((it) => {
        lines.push(
          it.live
            ? `- ${it.live.description} (${it.live.size}) x${it.live.packs}: ${money(it.cost)}`
            : `- ${it.name}: ${formatQty(it.buyQty, it.unit)} (~${money(it.cost)})`
        );
      });
      lines.push('');
    });
    lines.push(`${kept.some((it) => it.live) ? 'Total' : 'Estimated total'}: ${money(listTotal(kept))}`);
    return lines.join('\n');
  }

  const api = {
    MAIN_MEALS,
    setLivePrices,
    searchTerm,
    parseSize,
    unitsPerPack,
    liveCost,
    storeBreakdown,
    shapeKrogerStores,
    QUICK_GRAB_MINUTES,
    WEEKDAYS,
    isQuickGrab,
    isRushSlot,
    getRecipe,
    recipeCost,
    recipeFlags,
    matchesStyle,
    fitsStyles,
    hasAppliances,
    fitsPrefs,
    recipeOptions,
    emptyPlan,
    isDayMainComplete,
    countMainFilled,
    isWeekComplete,
    plannedRecipes,
    dayTotals,
    buildShoppingList,
    groupBy,
    listTotal,
    weeklyCost,
    autofill,
    formatQty,
    formatAmount,
    recipeIngredients,
    money,
    haversineMiles,
    buildOverpassQuery,
    parseOverpassStores,
    storeTier,
    storeTotal,
    shoppingListText,
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.MPPlanner = api;
  }
})(typeof self !== 'undefined' ? self : this);

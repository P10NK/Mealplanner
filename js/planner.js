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

  function getRecipe(id) {
    return id ? RECIPE_BY_ID[id] || null : null;
  }

  function recipeCost(recipe) {
    return recipe.ingredients.reduce((sum, [key, qty]) => sum + D.INGREDIENTS[key].price * qty, 0);
  }

  function recipeFlags(recipe) {
    const flags = { meat: false, fish: false, dairy: false, egg: false, gluten: false, honey: false };
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

  function recipeOptions(meal, prefs) {
    return D.RECIPES.filter((rec) => rec.meal === meal && fitsPrefs(rec, prefs)).sort((a, b) =>
      a.name.localeCompare(b.name)
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
      const options = recipeOptions(meal, prefs);
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

  const STORE_SHOPS = ['supermarket', 'grocery', 'greengrocer', 'wholesale', 'health_food', 'butcher'];

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
    wholesale: 'Warehouse club',
    health_food: 'Health food',
    butcher: 'Butcher',
  };

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
        lines.push(`- ${it.name}: ${formatQty(it.buyQty, it.unit)} (~${money(it.cost)})`);
      });
      lines.push('');
    });
    lines.push(`Estimated total: ${money(listTotal(kept))}`);
    return lines.join('\n');
  }

  const api = {
    MAIN_MEALS,
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
    buildShoppingList,
    groupBy,
    listTotal,
    weeklyCost,
    autofill,
    formatQty,
    money,
    haversineMiles,
    buildOverpassQuery,
    parseOverpassStores,
    shoppingListText,
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.MPPlanner = api;
  }
})(typeof self !== 'undefined' ? self : this);

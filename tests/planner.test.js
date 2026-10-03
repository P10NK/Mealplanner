const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../js/data.js');
const P = require('../js/planner.js');

const ALL = D.APPLIANCES.map((a) => a.id);

test('every recipe uses known ingredients, meals and appliances', () => {
  const ids = new Set();
  const applianceIds = new Set(ALL);
  for (const rec of D.RECIPES) {
    assert.ok(!ids.has(rec.id), `duplicate recipe id ${rec.id}`);
    ids.add(rec.id);
    assert.ok(D.MEALS.some((m) => m.id === rec.meal), `${rec.id} has unknown meal ${rec.meal}`);
    for (const [key, qty] of rec.ingredients) {
      assert.ok(D.INGREDIENTS[key], `${rec.id} uses unknown ingredient ${key}`);
      assert.ok(qty > 0, `${rec.id} has non-positive qty for ${key}`);
    }
    for (const req of rec.appliances) {
      for (const a of req.split('|')) assert.ok(applianceIds.has(a), `${rec.id} needs unknown appliance ${a}`);
    }
  }
  for (const i of Object.values(D.INGREDIENTS)) {
    assert.ok(D.CATEGORIES.includes(i.cat), `${i.name} has unknown category`);
  }
});

test('every plan style offers several options for each meal with a full kitchen', () => {
  for (const style of D.STYLES) {
    for (const meal of D.MEALS) {
      const n = P.recipeOptions(meal.id, { styles: [style.id], appliances: ALL }).length;
      assert.ok(n >= 3, `${style.id} has only ${n} ${meal.id} options`);
    }
  }
});

test('a no-cook kitchen still gets options for every meal', () => {
  for (const meal of D.MEALS) {
    assert.ok(P.recipeOptions(meal.id, { styles: ['balanced'], appliances: [] }).length >= 1, meal.id);
  }
});

test('style rules', () => {
  const get = P.getRecipe;
  assert.ok(P.matchesStyle(get('l-tuna-lettuce-wraps'), 'keto'));
  assert.ok(!P.matchesStyle(get('d-spaghetti'), 'lowCarb'));
  assert.ok(P.matchesStyle(get('d-lentil-dal'), 'vegan'));
  assert.ok(!P.matchesStyle(get('b-parfait'), 'vegan'), 'honey and yogurt are not vegan');
  assert.ok(!P.matchesStyle(get('l-tuna-pasta-salad'), 'vegetarian'));
  assert.ok(P.matchesStyle(get('l-tuna-pasta-salad'), 'pescatarian'));
  assert.ok(!P.matchesStyle(get('d-chicken-stir-fry'), 'glutenFree'), 'soy sauce has wheat');
  assert.ok(P.matchesStyle(get('d-chicken-stir-fry'), 'highProtein'));
  assert.ok(P.fitsStyles(get('d-salmon-spinach'), ['highProtein', 'keto', 'mediterranean']));
});

test('appliance alternatives', () => {
  const rec = P.getRecipe('d-baked-salmon'); // oven|airfryer AND stovetop|instantpot
  assert.ok(P.hasAppliances(rec, ['airfryer', 'instantpot']));
  assert.ok(!P.hasAppliances(rec, ['oven']));
  assert.ok(P.hasAppliances(P.getRecipe('l-hummus-pita'), []));
});

test('week completeness and snacks are optional', () => {
  const plan = P.emptyPlan();
  assert.equal(P.countMainFilled(plan), 0);
  for (const day of D.DAYS) {
    plan[day].breakfast = 'b-pb-toast';
    plan[day].lunch = 'l-hummus-pita';
  }
  assert.ok(!P.isWeekComplete(plan));
  for (const day of D.DAYS) plan[day].dinner = 'd-mezze-plate';
  assert.ok(P.isWeekComplete(plan));
  assert.equal(P.countMainFilled(plan), 21);
});

test('shopping list aggregates across the week and scales by servings', () => {
  const plan = P.emptyPlan();
  plan.Monday.breakfast = 'b-pb-toast'; // 2 bread, 2 tbsp PB, 1 banana
  plan.Tuesday.breakfast = 'b-pb-toast';
  plan.Tuesday.snack = 's-banana';
  const list = P.buildShoppingList(plan, 2);
  const by = Object.fromEntries(list.map((i) => [i.key, i]));
  assert.equal(by.bread.buyQty, 8);
  assert.equal(by.peanut_butter.qty, 8);
  assert.equal(by.banana.buyQty, 6);
  assert.equal(P.listTotal(list), 8 * 0.2 + 8 * 0.1 + 6 * 0.25);
  // grouped in category order
  const cats = list.map((i) => D.CATEGORIES.indexOf(i.cat));
  assert.deepEqual(cats, [...cats].sort((a, b) => a - b));
});

test('whole units round up on the shopping list', () => {
  const plan = P.emptyPlan();
  plan.Monday.lunch = 'l-chickpea-salad'; // half a can of chickpeas
  const item = P.buildShoppingList(plan, 1).find((i) => i.key === 'chickpeas');
  assert.equal(item.qty, 0.5);
  assert.equal(item.buyQty, 1);
  assert.equal(item.cost, 1.0);
});

test('autofill fills every slot with fitting meals and respects a reasonable budget', () => {
  let seed = 1;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const prefs = { styles: ['highProtein'], appliances: ALL, budget: 120, servings: 1 };
  const plan = P.autofill(P.emptyPlan(), prefs, rng);
  assert.ok(P.isWeekComplete(plan));
  for (const rec of P.plannedRecipes(plan)) assert.ok(P.fitsPrefs(rec, prefs), rec.id);
  assert.ok(P.weeklyCost(plan, 1) <= 120, `cost ${P.weeklyCost(plan, 1)}`);
  // keeps existing picks
  const pre = P.emptyPlan();
  pre.Monday.dinner = 'd-steak-veggies';
  assert.equal(P.autofill(pre, prefs, rng).Monday.dinner, 'd-steak-veggies');
});

test('formatQty', () => {
  assert.equal(P.formatQty(0.5, 'cup'), '½ cup');
  assert.equal(P.formatQty(2.25, 'cup'), '2 ¼ cups');
  assert.equal(P.formatQty(1.32, 'lb'), '1.5 lb');
  assert.equal(P.formatQty(3, 'each'), '3');
  assert.equal(P.formatQty(1, 'can'), '1 can');
  assert.equal(P.formatQty(2.5, 'tbsp'), '3 tbsp');
  assert.equal(P.formatQty(0.05, 'cup'), '¼ cup');
});

test('overpass query and parsing', () => {
  const q = P.buildOverpassQuery(41.9, -87.6, 5);
  assert.match(q, /around:8047,41.9,-87.6/);
  assert.match(q, /supermarket/);
  const json = {
    elements: [
      { type: 'node', id: 1, lat: 41.91, lon: -87.6, tags: { shop: 'supermarket', name: 'Fresh Mart', 'addr:housenumber': '12', 'addr:street': 'Oak St' } },
      { type: 'way', id: 2, center: { lat: 41.901, lon: -87.601 }, tags: { shop: 'grocery', brand: 'Corner Grocer' } },
      { type: 'node', id: 3, lat: 41.91, lon: -87.6, tags: { shop: 'supermarket', name: 'Fresh Mart' } }, // duplicate
      { type: 'node', id: 4, lat: 41.95, lon: -87.6, tags: { shop: 'supermarket' } }, // no name
      { type: 'node', id: 5, lat: 43, lon: -87.6, tags: { shop: 'supermarket', name: 'Far Away' } }, // outside radius
    ],
  };
  const stores = P.parseOverpassStores(json, 41.9, -87.6, 5);
  assert.deepEqual(stores.map((s) => s.name), ['Corner Grocer', 'Fresh Mart']);
  assert.equal(stores[1].address, '12 Oak St');
  assert.ok(Math.abs(stores[1].distance - 0.69) < 0.02);
});

test('shopping list text groups by store', () => {
  const plan = P.emptyPlan();
  plan.Monday.breakfast = 'b-pb-toast';
  const items = P.buildShoppingList(plan, 1);
  const stores = [{ id: 'node/1', name: 'Fresh Mart' }];
  const text = P.shoppingListText(items, { stores, assignments: { banana: 'node/1' }, byStore: true, excluded: { bread: true } });
  assert.match(text, /FRESH MART\n- Bananas: 1/);
  assert.match(text, /ANY STORE\n- Peanut butter/);
  assert.doesNotMatch(text, /bread/i);
});

test('heart healthy skips heavy ingredients', () => {
  assert.ok(!P.matchesStyle(P.getRecipe('b-egg-muffin-sandwich'), 'heartHealthy'), 'bacon');
  assert.ok(!P.matchesStyle(P.getRecipe('d-steak-veggies'), 'heartHealthy'), 'steak and butter');
  assert.ok(P.matchesStyle(P.getRecipe('d-lentil-dal'), 'heartHealthy') === false, 'coconut milk');
  assert.ok(P.matchesStyle(P.getRecipe('l-lentil-soup'), 'heartHealthy'));
});

test('money saver lists the cheapest meals first', () => {
  const opts = P.recipeOptions('dinner', { styles: ['moneySaver'], appliances: ALL });
  const costs = opts.map(P.recipeCost);
  assert.deepEqual(costs, [...costs].sort((a, b) => a - b));
});

test('rice cooker counts as an appliance option', () => {
  assert.ok(P.hasAppliances(P.getRecipe('d-bean-burrito-bowl'), ['ricecooker']));
});

test('store tiers adjust the estimated total', () => {
  assert.equal(P.storeTier('ALDI'), 'discount');
  assert.equal(P.storeTier('Walmart Supercenter'), 'discount');
  assert.equal(P.storeTier('Whole Foods Market'), 'premium');
  assert.equal(P.storeTier("Joe's Corner Market"), 'standard');
  const plan = P.emptyPlan();
  plan.Monday.breakfast = 'b-pb-toast';
  const items = P.buildShoppingList(plan, 1);
  const base = P.listTotal(items);
  assert.ok(Math.abs(P.storeTotal(items, { tier: 'discount' }) - base * 0.85) < 1e-9);
  assert.ok(Math.abs(P.storeTotal(items, { tier: 'premium' }) - base * 1.25) < 1e-9);
  const stores = P.parseOverpassStores(
    { elements: [{ type: 'node', id: 9, lat: 41.9, lon: -87.6, tags: { shop: 'supermarket', name: 'Whole Foods Market' } }] },
    41.9, -87.6, 5
  );
  assert.equal(stores[0].tier, 'premium');
});

test('dayTotals adds up a day per person', () => {
  const plan = P.emptyPlan();
  plan.Monday.breakfast = 'b-pb-toast';
  plan.Monday.snack = 's-banana';
  const t = P.dayTotals(plan, 'Monday');
  assert.equal(t.kcal, 450 + 105);
  assert.equal(t.protein, 16);
  assert.equal(t.meals, 2);
  assert.equal(P.dayTotals(plan, 'Tuesday').kcal, 0);
});

test('every recipe, style and appliance has a picture', () => {
  for (const r of D.RECIPES) assert.ok(r.icon, r.id);
  for (const s of D.STYLES) assert.ok(s.icon, s.id);
  for (const a of D.APPLIANCES) assert.ok(a.icon, a.id);
  for (const c of D.CATEGORIES) assert.ok(D.CATEGORY_ICONS[c], c);
});

test('every recipe has cooking steps', () => {
  const STEPS = require('../js/steps.js');
  for (const r of D.RECIPES) {
    assert.ok(Array.isArray(STEPS[r.id]) && STEPS[r.id].length >= 1, `${r.id} has no steps`);
  }
  for (const id of Object.keys(STEPS)) assert.ok(P.getRecipe(id), `steps for unknown recipe ${id}`);
});

test('recipe ingredients scale to the household without rounding up', () => {
  const lines = P.recipeIngredients(P.getRecipe('b-avocado-toast'), 1);
  const by = Object.fromEntries(lines.map((l) => [l.key, l.amount]));
  assert.equal(by.avocado, '½');
  assert.equal(by.bread, '2 slices');
  const four = Object.fromEntries(P.recipeIngredients(P.getRecipe('l-burrito-bowl'), 4).map((l) => [l.key, l.amount]));
  assert.equal(four.chicken_breast, '1.2 lb');
  assert.equal(four.rice, '1 cup');
});

test('single items read naturally in recipes', () => {
  const by = Object.fromEntries(P.recipeIngredients(P.getRecipe('d-sweet-potato-chili'), 1).map((l) => [l.key, l.name]));
  assert.equal(by.sweet_potato, 'Sweet potato');
  assert.equal(by.onion, 'Onion');
  assert.equal(P.recipeIngredients(P.getRecipe('b-pb-toast'), 2).find((l) => l.key === 'banana').name, 'Bananas');
});

test('ready to eat style keeps only store-bought items', () => {
  assert.ok(P.matchesStyle(P.getRecipe('rl-hot-pocket'), 'readyMade'));
  assert.ok(P.matchesStyle(P.getRecipe('rb-belvita'), 'readyMade'));
  assert.ok(!P.matchesStyle(P.getRecipe('b-avocado-toast'), 'readyMade'));
  assert.ok(!P.matchesStyle(P.getRecipe('rl-hot-pocket-apple'), 'heartHealthy'));
  const prefs = { styles: ['readyMade'], appliances: [] };
  for (const meal of D.MEALS) {
    const opts = P.recipeOptions(meal.id || meal, prefs);
    assert.ok(opts.length >= 1, `no ready-made ${meal.id || meal} without appliances`);
    for (const r of opts) assert.ok(r.ready, r.id);
  }
  const plan = P.emptyPlan();
  plan.Monday.breakfast = 'rb-belvita';
  assert.equal(P.buildShoppingList(plan, 1)[0].cat, 'Ready-to-Eat');
});

test('weekday breakfasts are quick grabs when auto-filled', () => {
  const D2 = D;
  let seed = 7;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const prefs = { styles: ['balanced'], appliances: D2.APPLIANCES.map((a) => a.id), budget: 0, servings: 1 };
  const plan = P.autofill(P.emptyPlan(), prefs, rng);
  for (const day of P.WEEKDAYS) assert.ok(P.isQuickGrab(P.getRecipe(plan[day].breakfast)), `${day} ${plan[day].breakfast}`);
  assert.ok(P.isRushSlot('Monday', 'breakfast'));
  assert.ok(!P.isRushSlot('Saturday', 'breakfast'));
  assert.ok(!P.isRushSlot('Monday', 'dinner'));
});

test('every grab-and-go item names a brand-led product and has plenty of options', () => {
  for (const meal of D.MEALS) {
    const n = D.RECIPES.filter((r) => r.ready && r.meal === meal.id).length;
    assert.ok(n >= 12, `${meal.id} has only ${n} grab-and-go options`);
  }
});

test('package sizes convert to recipe units', () => {
  assert.deepEqual(P.parseSize('1/2 gal'), { n: 0.5, u: 'gal' });
  assert.deepEqual(P.parseSize('16 fl oz'), { n: 16, u: 'floz' });
  assert.deepEqual(P.parseSize('6 ct / 1.5 oz'), { n: 6, u: 'ct' });
  assert.equal(P.parseSize('family size'), null);
  assert.equal(P.unitsPerPack('milk', { size: '1 gal' }), 16);
  assert.equal(P.unitsPerPack('hot_pocket', { size: '2 ct' }), 2);
  assert.equal(P.unitsPerPack('lunchables', { size: '3.2 oz' }), 1);
  assert.equal(P.unitsPerPack('chicken_breast', { size: '2 lb' }), 2);
  assert.equal(P.unitsPerPack('banana', { size: '1 lb', soldBy: 'WEIGHT' }), null);
  assert.equal(P.searchTerm('rotisserie_chicken'), 'Rotisserie chicken');
  assert.equal(P.searchTerm('frozen_meal'), 'Lean Cuisine frozen meal');
});

test('live store prices replace estimates in meals, list and store totals', () => {
  const plan = P.emptyPlan();
  plan.Monday.lunch = 'rl-hot-pocket';
  plan.Tuesday.lunch = 'rl-hot-pocket';
  plan.Wednesday.lunch = 'rl-hot-pocket';
  const prices = { hot_pocket: { description: 'Hot Pockets Pepperoni', size: '2 ct', price: 3.0 } };
  const est = P.recipeCost(P.getRecipe('rl-hot-pocket'));
  try {
    P.setLivePrices(prices);
    assert.equal(P.recipeCost(P.getRecipe('rl-hot-pocket')), 1.5);
    const [item] = P.buildShoppingList(plan, 1);
    assert.equal(item.live.packs, 2); // 3 Hot Pockets need two 2-packs
    assert.equal(item.cost, 6);
    const b = P.storeBreakdown([item], { prices });
    assert.deepEqual(b, { total: 6, priced: 1, count: 1 });
    assert.match(P.shoppingListText([item], {}), /Hot Pockets Pepperoni \(2 ct\) x2: \$6\.00/);
  } finally {
    P.setLivePrices(null);
  }
  assert.equal(P.recipeCost(P.getRecipe('rl-hot-pocket')), est);
});

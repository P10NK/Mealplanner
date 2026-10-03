# Weekly Meal Planner

Plan a week of meals around your diet style, your kitchen and your budget, then build a shopping list for grocery stores near you. Works on phones and desktops, no install or account needed.

## What it does

1. **Your plan.** Pick one or more plan styles (balanced, high protein, high fiber, low carb, keto, money saver, low calorie, vegetarian, vegan, pescatarian, gluten free, Mediterranean, quick), tick the cooking appliances you have, and set a weekly budget and how many people are eating.
2. **Your week.** Pick a day (Monday to Sunday) and choose breakfast, lunch and dinner from dropdowns that only list meals fitting your styles and appliances. A snack slot unlocks once a day's three meals are set. "Auto-fill empty meals" fills the rest of the week while trying to stay under budget. A budget meter tracks the estimated grocery cost.
3. **Stores & shopping list.** Once every day has breakfast, lunch and dinner, enter a zip code or address (or use your location) and a radius to find nearby grocery stores. The shopping list combines ingredients across the whole week, grouped by aisle, with quantities and estimated costs. Assign items, or whole aisles, to the stores you'll shop at, view the list by store, check items off, copy it or print it.

Your plan is saved in your browser (localStorage).

### About prices and stores

Ingredient prices are estimates based on typical US supermarket prices (see `js/data.js`). Free store data does not include live prices, so actual totals vary by store. Store locations come from [OpenStreetMap](https://www.openstreetmap.org/copyright) via the Overpass API, and addresses are looked up with Nominatim. Both are free and keyless.

## Running it

It's a static site with no build step. Open `index.html` in a browser, or serve the folder:

```sh
npm start   # python3 -m http.server 8000, then open http://localhost:8000
```

To publish it, turn on GitHub Pages (Settings → Pages → Deploy from branch → `main` / root).

## Project layout

- `index.html`, `css/styles.css`: the page
- `js/data.js`: ingredients (with estimated prices), recipes, plan styles, appliances
- `js/planner.js`: filtering, costs, auto-fill, shopping list, store search parsing (no DOM, unit tested)
- `js/app.js`: UI wiring
- `tests/`: unit tests, run with `npm test` (Node 18+)

## Adding recipes

Add an entry to `RECIPES` in `js/data.js` with per-serving ingredient quantities, macros and the appliances it needs (`'oven|airfryer'` means either works). Plan styles are worked out from the macros and ingredients automatically. `npm test` checks that every style still has enough options.

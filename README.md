# Weekly Meal Planner

Plan a week of meals around your diet style, your kitchen and your budget, then build a shopping list for grocery stores near you. Works on phones and desktops, no install or account needed.

## What it does

1. **Your plan.** Pick one or more plan styles (balanced, high protein, high fiber, low carb, keto, money saver, low calorie, heart healthy, vegetarian, vegan, pescatarian, gluten free, Mediterranean, quick, ready to eat), tick the cooking appliances you have, and set a weekly budget and how many people are eating.
2. **Your week.** Pick a day (Monday to Sunday) and choose breakfast, lunch and dinner from dropdowns that only list meals fitting your styles and appliances (Money saver lists the cheapest first). The whole-week grid below has a dropdown for every slot too. A snack slot unlocks once a day's three meals are set. "Auto-fill empty meals" fills the rest of the week while trying to stay under budget. A budget meter tracks the estimated grocery cost. Tap "View recipe" (or a meal's picture) to see its ingredients, scaled to your household, and step-by-step cooking instructions.

   Alongside home-cooked meals there are store-bought, ready-to-eat options (Greek yogurt cups, belVita biscuits, Hot Pockets, frozen burritos and entrées, rotisserie chicken, Uncrustables, protein bars and more). They carry a "Store-bought" tag and come with the heating directions you'd find on the box. Pick the **Ready to eat** style to see only those. Their nutrition is typical for the product type, so check the label of the brand you buy.
3. **Stores & shopping list.** Once every day has breakfast, lunch and dinner, enter a zip code or address (or use your location) and a radius to find nearby grocery stores. Each store shows an estimated total for the whole list based on its price tier. The shopping list combines ingredients across the whole week, grouped by aisle, with quantities and estimated costs. Assign items, or whole aisles, to the stores you'll shop at, view the list by store, check items off, copy it or print it.

Your plan is saved in your browser (localStorage).

### About prices and stores

Ingredient prices are estimates based on typical US supermarket prices (see `js/data.js`). Each store gets a price tier from its name: discount chains such as Aldi and Walmart are about 15% cheaper, premium stores such as Whole Foods about 25% more expensive, and everything else uses the standard price. The search covers supermarkets and produce markets. If the plan is over budget the app warns you but still builds the list. Free store data does not include live prices, so actual totals vary by store. Store locations come from [OpenStreetMap](https://www.openstreetmap.org/copyright) via the Overpass API, and addresses are looked up with Nominatim. Both are free and keyless.

## Running it

It's a static site with no build step. Open `index.html` in a browser, or serve the folder:

```sh
npm start   # python3 -m http.server 8000, then open http://localhost:8000
```

To publish it, turn on GitHub Pages (Settings → Pages → Deploy from branch → `main` / root).

## Project layout

- `index.html`, `css/styles.css`: the page
- `js/data.js`: ingredients (with estimated prices), recipes, plan styles, appliances
- `js/steps.js`: cooking steps for every recipe
- `js/planner.js`: filtering, costs, auto-fill, shopping list, store search parsing (no DOM, unit tested)
- `js/app.js`: UI wiring
- `tests/`: unit tests, run with `npm test` (Node 18+)

## Adding recipes

Add an entry to `RECIPES` in `js/data.js` (plus a picture in `RECIPE_ICONS` and cooking steps in `js/steps.js`) with per-serving ingredient quantities, macros and the appliances it needs (`'oven|airfryer'` means either works). Add `READY` as the last argument for a store-bought item. Plan styles are worked out from the macros and ingredients automatically. `npm test` checks that every style still has enough options.

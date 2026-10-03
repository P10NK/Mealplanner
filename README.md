# Weekly Meal Planner

Plan a week of everyday meals, from Pop-Tarts and pizza rolls to easy home cooking, then build a shopping list for grocery stores near you. Works on phones and desktops, no install or account needed.

## What it does

1. **What do you like?** Pick one or more styles (Anything goes, Ready to eat, Cheap eats, Quick, High protein, Vegetarian), set a weekly budget and how many people are eating. The kitchen picker is folded away; open it to change which appliances you have.
2. **Your week.** Pick a day (Monday to Sunday) and choose breakfast, lunch and dinner. Each dropdown lists "Grab & go" store-bought items first, then "Cook it yourself" meals (Cheap eats lists the cheapest first). Weekday breakfasts list quick grabs (5 minutes or less) first, and auto-fill only picks quick grabs for them. A snack slot unlocks once a day's three meals are set. "Auto-fill empty meals" fills the rest of the week while trying to stay under budget. The week at a glance shows every meal; tap one to change it. Tap "How to make it" to see ingredients scaled to your household and the steps.

   There are 68 brand-name grab-and-go items (Chobani, belVita, Hot Pockets, Totino's, DiGiorno, Stouffer's, Lay's, Oreo and more), each with the heating directions you'd find on the box. Nutrition and prices are typical for the product, so check the label of what you buy.
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

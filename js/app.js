/* UI wiring for the meal planner. Logic lives in planner.js, data in data.js. */
(function () {
  'use strict';

  const D = window.MPData;
  const P = window.MPPlanner;
  const STEPS = window.MPSteps || {};
  const STORAGE_KEY = 'mealplanner:v1';
  const OVERPASS_URLS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  const PRICE_API = String((window.MP_CONFIG || {}).priceApi || '').replace(/\/+$/, '');
  const PRICE_MAX_AGE = 6 * 60 * 60 * 1000;

  const defaults = () => ({
    prefs: {
      styles: ['balanced'],
      appliances: ['stovetop', 'oven', 'microwave', 'toaster'],
      budget: 100,
      servings: 1,
    },
    plan: P.emptyPlan(),
    day: D.DAYS[0],
    location: '',
    radius: 5,
    stores: [],
    selectedStores: [],
    assignments: {},
    checked: {},
    view: 'category',
    livePrices: {}, // Kroger location id -> { at, prices }
  });

  let state = load();

  function load() {
    const base = defaults();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        const merged = Object.assign(base, saved);
        merged.prefs = Object.assign(defaults().prefs, saved.prefs || {});
        // Drop styles that are no longer offered so they can't filter meals invisibly.
        merged.prefs.styles = (merged.prefs.styles || []).filter((id) => D.STYLES.some((s) => s.id === id));
        if (!merged.prefs.styles.length) merged.prefs.styles = ['balanced'];
        merged.plan = Object.assign(P.emptyPlan(), saved.plan || {});
        if (!D.DAYS.includes(merged.day)) merged.day = D.DAYS[0];
        return merged;
      }
    } catch (e) {
      /* storage unavailable or corrupt: start fresh */
    }
    return base;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore */
    }
  }

  // Tiny element helper. Children may be strings (inserted as text) or nodes.
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k in el && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    children.flat().forEach((c) => {
      if (c == null || c === false) return;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    });
    return el;
  }

  const $ = (id) => document.getElementById(id);
  const servings = () => Math.max(1, Number(state.prefs.servings) || 1);
  const applianceLabel = (id) => (D.APPLIANCES.find((a) => a.id === id) || { label: id }).label;

  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ---------- Step 1: preferences ----------

  function tile(cls, input, icon, name, desc) {
    return h(
      'label',
      { class: `tile ${cls}`, title: desc || null },
      input,
      h(
        'span',
        { class: 'tile-body' },
        h('span', { class: 'tile-icon', 'aria-hidden': 'true' }, icon),
        h('span', { class: 'tile-name' }, name),
        desc ? h('span', { class: 'tile-desc' }, desc) : null
      )
    );
  }

  function renderPrefs() {
    $('style-chips').replaceChildren(
      ...D.STYLES.map((s) =>
        tile(
          'style',
          h('input', {
            type: 'checkbox',
            value: s.id,
            checked: state.prefs.styles.includes(s.id),
            onchange: (e) => toggleStyle(s.id, e.target.checked),
          }),
          s.icon,
          s.label,
          s.desc
        )
      )
    );

    $('appliance-checks').replaceChildren(
      ...D.APPLIANCES.map((a) =>
        tile(
          'appl',
          h('input', {
            type: 'checkbox',
            value: a.id,
            checked: state.prefs.appliances.includes(a.id),
            onchange: (e) => {
              const set = new Set(state.prefs.appliances);
              if (e.target.checked) set.add(a.id);
              else set.delete(a.id);
              state.prefs.appliances = [...set];
              renderKitchenSummary();
              update();
            },
          }),
          a.icon,
          a.label
        )
      )
    );

    renderKitchenSummary();
    $('budget').value = state.prefs.budget;
    $('servings').value = state.prefs.servings;
    $('stat-recipes').textContent = D.RECIPES.length;
    $('stat-ready').textContent = D.RECIPES.filter((r) => r.ready).length;
  }

  function renderKitchenSummary() {
    const names = D.APPLIANCES.filter((a) => state.prefs.appliances.includes(a.id)).map((a) => a.label);
    $('kitchen-summary').textContent = names.length ? names.join(', ') : 'No-cook only';
  }

  function toggleStyle(id, on) {
    let styles = state.prefs.styles.filter((s) => s !== id);
    if (on) {
      styles = id === 'balanced' ? ['balanced'] : styles.filter((s) => s !== 'balanced').concat(id);
    }
    if (!styles.length) styles = ['balanced'];
    state.prefs.styles = styles;
    renderPrefs();
    update();
  }

  // ---------- Step 2: week ----------

  const RING = 2 * Math.PI * 50;

  function setRing(el, fraction) {
    el.style.strokeDashoffset = String(RING * (1 - Math.max(0, Math.min(1, fraction))));
  }

  function renderBudget() {
    const cost = P.weeklyCost(state.plan, servings());
    const budget = Number(state.prefs.budget) || 0;
    const over = budget > 0 && cost > budget;
    $('budget-text').textContent = `${P.money(cost)}${budget ? ` of ${P.money(budget)}` : ''}`;
    $('budget-left').textContent = budget
      ? over
        ? `${P.money(cost - budget)} over budget`
        : `${P.money(budget - cost)} left`
      : 'No budget set';
    $('budget-pct').textContent = budget ? `${Math.round((cost / budget) * 100)}%` : '–';
    setRing($('budget-ring'), budget ? cost / budget : 0);
    $('budget-meter').classList.toggle('over', over);

    const filled = P.countMainFilled(state.plan);
    $('meal-count').textContent = filled;
    $('meal-progress').textContent = filled === 21 ? 'Week complete' : `${21 - filled} to go`;
    setRing($('meal-ring'), filled / 21);

  }

  function renderTabs() {
    $('day-tabs').replaceChildren(
      ...D.DAYS.map((day) => {
        const plates = D.MEALS.filter((m) => m.id !== 'snack' || state.plan[day].snack).map((m) => {
          const rec = P.getRecipe(state.plan[day][m.id]);
          return rec ? h('span', null, rec.icon) : h('span', { class: 'empty-dot' });
        });
        const done = P.isDayMainComplete(state.plan, day);
        return h(
          'button',
          {
            type: 'button',
            role: 'tab',
            class: 'day-tab' + (done ? ' complete' : ''),
            'aria-selected': String(day === state.day),
            'aria-label': `${day}, ${P.MAIN_MEALS.filter((m) => state.plan[day][m]).length} of 3 meals planned`,
            onclick: () => selectDay(day),
          },
          h('span', { class: 'd' }, day.slice(0, 3)),
          h('span', { class: 'plates', 'aria-hidden': 'true' }, plates)
        );
      })
    );
  }

  function selectDay(day) {
    state.day = day;
    save();
    renderTabs();
    renderDay();
    renderWeekGrid();
  }

  function recipeLabel(rec) {
    return `${rec.name} · ${P.money(P.recipeCost(rec) * servings())}`;
  }

  function renderDay() {
    const day = state.day;
    const mainDone = P.isDayMainComplete(state.plan, day);
    const panel = $('day-panel');
    panel.setAttribute('aria-label', day);
    const cards = D.MEALS.map((meal) => {
      const locked = meal.id === 'snack' && !mainDone;
      const current = P.getRecipe(state.plan[day][meal.id]);
      const options = P.recipeOptions(meal.id, state.prefs);
      const select = h('select', {
        id: `slot-${meal.id}`,
        disabled: locked,
        'aria-label': `${day} ${meal.label.toLowerCase()}`,
        onchange: (e) => {
          state.plan[day][meal.id] = e.target.value || null;
          update();
        },
      });
      select.append(
        h(
          'option',
          { value: '' },
          options.length
            ? `Choose ${meal.label.toLowerCase()}…`
            : `No ${meal.label.toLowerCase()} matches. Try fewer styles or more appliances.`
        )
      );
      const rush = P.isRushSlot(day, meal.id);
      appendOptions(select, options, recipeLabel, rush);
      if (current && !options.includes(current)) {
        select.append(
          h('optgroup', { label: "Doesn't fit your current plan" }, h('option', { value: current.id }, recipeLabel(current)))
        );
      }
      select.value = current ? current.id : '';

      let details = null;
      if (locked) {
        details = h('p', { class: 'needs' }, 'Unlocks once breakfast, lunch and dinner are picked for this day.');
      } else if (current) {
        const fits = P.fitsPrefs(current, state.prefs);
        const needs = current.appliances.map((req) => req.split('|').map(applianceLabel).join(' or '));
        details = [
          h(
            'div',
            { class: 'chips' },
            h('span', { class: 'chip cost' }, `${P.money(P.recipeCost(current) * servings())}${servings() > 1 ? ` for ${servings()}` : ''}`),
            current.ready ? h('span', { class: 'chip fit' }, '📦 Store-bought') : null,
            rush && P.isQuickGrab(current) ? h('span', { class: 'chip fit' }, '⚡ Quick grab') : null,
            h('span', { class: 'chip' }, `⏱ ${current.time} min`),
            rush && !P.isQuickGrab(current) ? h('span', { class: 'chip warn' }, 'Slow for a weekday morning') : null,
            fits ? null : h('span', { class: 'chip warn' }, "Doesn't match your style or appliances")
          ),
          h(
            'div',
            { class: 'card-foot' },
            h('span', { class: 'needs' }, needs.length ? `Needs: ${needs.join(', ')}` : 'No cooking needed'),
            h('button', { type: 'button', class: 'btn small', onclick: () => openRecipe(current.id) }, '📖 How to make it')
          ),
        ];
      }

      return h(
        'div',
        { class: `meal-card ${meal.id}` + (locked ? ' locked' : '') },
        current
          ? h('button', { type: 'button', class: 'plate', title: `Recipe for ${current.name}`, 'aria-label': `Open recipe for ${current.name}`, onclick: () => openRecipe(current.id) }, current.icon)
          : h('div', { class: 'plate empty', 'aria-hidden': 'true' }, meal.icon),
        h(
          'div',
          { class: 'meal-main' },
          h('label', { class: 'meal-label', for: `slot-${meal.id}` }, meal.label, rush ? h('span', { class: 'rush-tag' }, ' · weekday, quick grabs first') : null),
          select,
          details
        )
      );
    });
    const t = P.dayTotals(state.plan, day);
    panel.replaceChildren(
      h(
        'div',
        { class: 'day-panel-head' },
        h('h3', null, day),
        h(
          'span',
          { class: 'day-sum' },
          t.meals ? `${P.money(t.cost * servings())} for the day` : 'Nothing planned yet'
        )
      ),
      h('div', { class: 'meal-cards' }, cards)
    );
  }

  // Grab-and-go items first, then things you cook, so the long list is easy to scan.
  // On weekday mornings, quick grabs come first instead.
  function appendOptions(select, options, label, rush) {
    const add = (title, list) => {
      if (!list.length) return;
      select.append(h('optgroup', { label: title }, list.map((rec) => h('option', { value: rec.id }, label(rec)))));
    };
    if (rush) {
      add(`Quick grab (${P.QUICK_GRAB_MINUTES} min or less)`, options.filter(P.isQuickGrab));
      add('Takes longer', options.filter((r) => !P.isQuickGrab(r)));
      return;
    }
    const ready = options.filter((r) => r.ready);
    const cook = options.filter((r) => !r.ready);
    add('Grab & go', ready);
    add('Cook it yourself', cook);
  }

  // Read-only overview of the week. Tapping a meal opens that day above, focused on that slot.
  function renderWeekGrid() {
    $('week-grid').replaceChildren(
      ...D.DAYS.map((day) =>
        h(
          'div',
          { class: 'week-day' + (day === state.day ? ' active' : '') },
          h('button', { type: 'button', class: 'week-day-name', onclick: () => jumpTo(day) }, day),
          D.MEALS.map((meal) => {
            const current = P.getRecipe(state.plan[day][meal.id]);
            return h(
              'button',
              {
                type: 'button',
                class: `wcell ${meal.id}` + (current ? '' : ' empty'),
                'aria-label': `${day} ${meal.label.toLowerCase()}: ${current ? current.name : 'not picked'}. Change it`,
                onclick: () => jumpTo(day, meal.id),
              },
              h('b', null, meal.label),
              h(
                'span',
                { class: 'wrow' },
                h('span', { class: 'wicon', 'aria-hidden': 'true' }, current ? current.icon : '+'),
                h('span', { class: 'wname' }, current ? current.name : meal.id === 'snack' ? 'Optional' : 'Pick one')
              )
            );
          })
        )
      )
    );
  }

  function jumpTo(day, mealId) {
    selectDay(day);
    $('day-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    const sel = mealId && $(`slot-${mealId}`);
    if (sel && !sel.disabled) sel.focus({ preventScroll: true });
  }

  // ---------- Recipe view ----------

  function openRecipe(id) {
    const rec = P.getRecipe(id);
    if (!rec) return;
    const n = servings();
    const meal = D.MEALS.find((m) => m.id === rec.meal);
    const needs = rec.appliances.map((req) => req.split('|').map(applianceLabel).join(' or '));
    const styles = D.STYLES.filter((s) => s.id !== 'balanced' && P.matchesStyle(rec, s.id));
    const steps = STEPS[rec.id] || [];
    const dlg = $('recipe-dialog');
    $('recipe-body').replaceChildren(
      h('button', { type: 'button', class: 'recipe-close', 'aria-label': 'Close recipe', onclick: () => closeRecipe() }, '✕'),
      h(
        'header',
        { class: `recipe-head ${rec.meal}` },
        h('div', { class: 'plate big', 'aria-hidden': 'true' }, rec.icon),
        h(
          'div',
          null,
          h('p', { class: 'meal-label' }, meal ? meal.label : ''),
          h('h2', { id: 'recipe-title' }, rec.name),
          h(
            'div',
            { class: 'chips' },
            rec.ready ? h('span', { class: 'chip fit' }, '📦 Store-bought') : null,
            h('span', { class: 'chip' }, `⏱ ${rec.time} min`),
            h('span', { class: 'chip cost' }, `${P.money(P.recipeCost(rec) * n)} for ${n}`)
          )
        )
      ),
      h(
        'div',
        { class: 'recipe-cols' },
        h(
          'section',
          null,
          h('h3', null, `Ingredients`, h('small', null, ` for ${n} ${n === 1 ? 'person' : 'people'}`)),
          h(
            'ul',
            { class: 'ing-list' },
            P.recipeIngredients(rec, n).map((l) => h('li', null, h('b', null, l.amount), ` ${l.name}`, l.staple ? h('small', null, ' (pantry)') : null))
          ),
          h('p', { class: 'needs' }, needs.length ? `You'll need: ${needs.join(', ')}` : 'No cooking needed'),
          styles.length ? h('div', { class: 'chips' }, styles.map((s) => h('span', { class: 'chip fit' }, `${s.icon} ${s.label}`))) : null,
          h('p', { class: 'needs' }, `About ${rec.kcal} calories and ${rec.protein}g protein per person.`)
        ),
        h(
          'section',
          null,
          h('h3', null, 'Steps'),
          h('ol', { class: 'step-list' }, steps.map((t) => h('li', null, t)))
        )
      ),
      h('p', { class: 'note' }, rec.ready ? 'Directions are typical for this product. Follow the box if it says something different.' : 'Amounts and cost scale with the number of people eating.')
    );
    if (typeof dlg.showModal === 'function') {
      if (!dlg.open) dlg.showModal();
    } else {
      dlg.setAttribute('open', '');
    }
    dlg.querySelector('.recipe-close').focus();
  }

  function closeRecipe() {
    const dlg = $('recipe-dialog');
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.removeAttribute('open');
  }

  // ---------- Step 3: stores + shopping list ----------

  // Stores carry their shelf prices once loaded, so totals can use them.
  function withPrices(s) {
    const lp = s.live && state.livePrices[s.krogerId];
    return lp ? Object.assign({}, s, { prices: lp.prices }) : s;
  }

  function selectedStores() {
    return state.stores.filter((s) => state.selectedStores.includes(s.id)).map(withPrices);
  }

  // The first selected store with shelf prices sets meal prices everywhere.
  function priceStore() {
    return selectedStores().find((s) => s.prices) || null;
  }

  function applyLivePrices() {
    const ps = priceStore();
    P.setLivePrices(ps ? ps.prices : null);
  }

  const loadingPrices = new Set();

  async function loadLivePrices(store, force) {
    if (!PRICE_API || !store || !store.live) return;
    const have = state.livePrices[store.krogerId];
    if (!force && have && Date.now() - have.at < PRICE_MAX_AGE) return;
    if (loadingPrices.has(store.krogerId)) return;
    loadingPrices.add(store.krogerId);
    renderStores();
    try {
      const items = Object.keys(D.INGREDIENTS).map((key) => ({ key, term: P.searchTerm(key) }));
      const res = await fetch(`${PRICE_API}/prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: store.krogerId, items }),
      });
      if (!res.ok) throw new Error(`Price server error (${res.status})`);
      const json = await res.json();
      state.livePrices[store.krogerId] = { at: Date.now(), prices: json.prices || {} };
      loadingPrices.delete(store.krogerId);
      update();
      toast(`Prices now come from ${store.name}`);
    } catch (e) {
      loadingPrices.delete(store.krogerId);
      renderStores();
      toast(`Couldn't get prices from ${store.name}. Showing estimates.`);
    }
  }

  function renderShop() {
    const complete = P.isWeekComplete(state.plan);
    $('shop-body').hidden = !complete;
    $('shop-locked').hidden = complete;
    if (!complete) {
      const filled = P.countMainFilled(state.plan);
      const left = 21 - filled;
      $('shop-locked-text').textContent = `Pick breakfast, lunch and dinner for every day to unlock your shopping list. ${left} meal${
        left === 1 ? '' : 's'
      } to go. Snacks are optional.`;
      $('locked-bar').style.width = `${(filled / 21) * 100}%`;
      return;
    }
    $('location').value = state.location || '';
    $('radius').value = String(state.radius);
    renderStores();
    renderList();
  }

  function renderStores() {
    const list = $('store-list');
    const items = P.buildShoppingList(state.plan, servings());
    const stores = state.stores.map(withPrices);
    const breakdowns = stores.map((s) => P.storeBreakdown(items, s));
    const totals = breakdowns.map((b) => b.total);
    const cheapest = totals.length ? Math.min(...totals) : 0;
    list.replaceChildren(
      ...stores.map((s, i) => {
        const on = state.selectedStores.includes(s.id);
        const b = breakdowns[i];
        const loading = loadingPrices.has(s.krogerId);
        const tier = D.STORE_TIERS[s.tier || 'standard'];
        const dir = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`;
        return h(
          'li',
          { class: 'store' + (on ? ' selected' : '') },
          h('input', {
            type: 'checkbox',
            checked: on,
            'aria-label': `Shop at ${s.name}`,
            onchange: (e) => toggleStore(s.id, e.target.checked),
          }),
          h(
            'div',
            null,
            h('div', { class: 'store-name' }, s.name),
            h(
              'div',
              null,
              s.prices
                ? h('span', { class: 'pill live' }, 'Shelf prices')
                : loading
                  ? h('span', { class: 'pill live' }, 'Getting prices…')
                  : h('span', { class: `pill ${s.tier || 'standard'}` }, s.live && PRICE_API ? 'Select for shelf prices' : `${tier.label} prices (est.)`),
              totals[i] === cheapest && state.stores.length > 1 ? h('span', { class: 'pill cheapest' }, 'Cheapest') : null
            ),
            h('div', { class: 'store-total' }, P.money(totals[i]), h('small', null, s.prices ? ' for the whole list' : ' estimated')),
            s.prices && b.priced < b.count
              ? h('div', { class: 'store-meta' }, `${b.priced} of ${b.count} items at shelf price, the rest estimated`)
              : null,
            h('div', { class: 'store-meta' }, `${s.type} · ${s.distance.toFixed(1)} mi away`),
            s.address ? h('div', { class: 'store-meta' }, s.address) : null,
            h('a', { href: dir, target: '_blank', rel: 'noopener', class: 'store-meta' }, 'Directions')
          )
        );
      })
    );
  }

  function toggleStore(id, on) {
    const set = new Set(state.selectedStores);
    if (on) set.add(id);
    else {
      set.delete(id);
      Object.keys(state.assignments).forEach((k) => {
        if (state.assignments[k] === id) delete state.assignments[k];
      });
    }
    state.selectedStores = state.stores.filter((s) => set.has(s.id)).map((s) => s.id);
    update();
    if (on) loadLivePrices(state.stores.find((s) => s.id === id));
  }

  function storeSelect(value, label, onchange) {
    const stores = selectedStores();
    const sel = h('select', { 'aria-label': label, onchange });
    sel.append(h('option', { value: '' }, stores.length ? 'Any store' : 'Find stores above to assign'));
    stores.forEach((s) => sel.append(h('option', { value: s.id }, `${s.name} (${s.distance.toFixed(1)} mi)`)));
    sel.value = stores.some((s) => s.id === value) ? value : '';
    sel.disabled = !stores.length;
    return sel;
  }

  function renderList() {
    const items = P.buildShoppingList(state.plan, servings());
    const total = P.listTotal(items);
    const remaining = P.listTotal(items, state.checked);
    const budget = Number(state.prefs.budget) || 0;
    const ps = priceStore();
    $('list-total').textContent =
      (ps ? `Total ${P.money(total)} at ${ps.name}` : `Estimated total ${P.money(total)} at standard prices`) +
      (budget ? ` (budget ${P.money(budget)})` : '') +
      (remaining !== total ? ` · ${P.money(remaining)} left to buy` : '');
    const over = budget > 0 && total > budget;
    $('over-budget').hidden = !over;
    if (over) {
      $('over-budget').textContent = `This plan is about ${P.money(total - budget)} over your weekly budget. Swap a few meals for cheaper ones, try Cheap eats, or shop at a discount store.`;
    }

    document.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('on', b.dataset.view === state.view));

    const stores = selectedStores();
    const storeName = (id) => (stores.find((s) => s.id === id) || {}).name;
    const groups =
      state.view === 'store'
        ? P.groupBy(items, (it) => storeName(state.assignments[it.key]) || 'Not assigned to a store')
        : P.groupBy(items, (it) => it.cat);
    if (state.view === 'store') {
      const order = stores.map((s) => s.name);
      groups.sort((a, b) => {
        const ia = order.indexOf(a.key);
        const ib = order.indexOf(b.key);
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
      });
    }

    $('shopping-list').replaceChildren(
      ...groups.map((g) => {
        const store = state.view === 'store' ? stores.find((s) => s.name === g.key) : null;
        const head = h(
          'div',
          { class: 'group-head' },
          h(
            'h4',
            null,
            h('span', { class: 'gicon', 'aria-hidden': 'true' }, state.view === 'store' ? (store ? '🏪' : '🛒') : D.CATEGORY_ICONS[g.key] || '🛒'),
            g.key
          ),
          store
            ? h('span', { class: 'store-meta' }, `≈ ${P.money(P.storeTotal(g.items, store, state.checked))} at ${D.STORE_TIERS[store.tier || 'standard'].label.toLowerCase()} prices`)
            : null
        );
        if (state.view === 'category' && stores.length) {
          head.append(
            storeSelect('', `Send all ${g.key} to a store`, (e) => {
              g.items.forEach((it) => {
                if (e.target.value) state.assignments[it.key] = e.target.value;
                else delete state.assignments[it.key];
              });
              save();
              renderList();
            })
          );
          head.lastChild.options[0].textContent = 'Send whole aisle to…';
        }
        return h(
          'div',
          { class: 'group' },
          head,
          g.items.map((it) =>
            h(
              'div',
              { class: 'item' + (state.checked[it.key] ? ' done' : '') },
              h('input', {
                type: 'checkbox',
                checked: !!state.checked[it.key],
                'aria-label': `Got ${it.name}`,
                onchange: (e) => {
                  if (e.target.checked) state.checked[it.key] = true;
                  else delete state.checked[it.key];
                  save();
                  renderList();
                },
              }),
              it.live
                ? h(
                    'div',
                    { class: 'item-name' },
                    it.live.description,
                    h(
                      'small',
                      null,
                      `${it.live.packs} × ${it.live.size || 'pack'} · ${P.money(it.live.price)} each` +
                        (it.live.onSale ? ' · on sale' : '') +
                        (it.staple ? ' · pantry staple, check if you have it' : '')
                    )
                  )
                : h(
                    'div',
                    { class: 'item-name' },
                    it.name,
                    h(
                      'small',
                      null,
                      P.formatQty(it.buyQty, it.unit) + (ps ? ' · estimated' : '') + (it.staple ? ' · pantry staple, check if you have it' : '')
                    )
                  ),
              h('div', { class: 'item-cost' }, P.money(it.cost)),
              stores.length &&
              storeSelect(state.assignments[it.key], `Store for ${it.name}`, (e) => {
                if (e.target.value) state.assignments[it.key] = e.target.value;
                else delete state.assignments[it.key];
                save();
                renderList();
              })
            )
          )
        );
      })
    );
  }

  function setStatus(msg, isError, retry) {
    const el = $('store-status');
    el.replaceChildren(msg);
    if (retry) el.append(' ', h('button', { type: 'button', class: 'btn ghost small', onclick: retry }, 'Try again'));
    el.classList.toggle('error', !!isError);
  }

  async function geocode(query) {
    const url = `${NOMINATIM_URL}?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('Address lookup failed');
    const rows = await res.json();
    if (!rows.length) throw new Error(`Couldn't find "${query}". Try a zip code or a fuller address.`);
    return { lat: Number(rows[0].lat), lon: Number(rows[0].lon) };
  }

  async function fetchStores(lat, lon, radius) {
    const body = 'data=' + encodeURIComponent(P.buildOverpassQuery(lat, lon, radius));
    let lastErr;
    for (const url of OVERPASS_URLS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        });
        if (!res.ok) throw new Error(`Store search failed (${res.status})`);
        return P.parseOverpassStores(await res.json(), lat, lon, radius);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('Store search failed');
  }

  async function fetchKrogerStores(lat, lon, radius) {
    if (!PRICE_API) return [];
    const res = await fetch(`${PRICE_API}/locations?lat=${lat}&lon=${lon}&radius=${radius}`);
    if (!res.ok) throw new Error('Kroger store search failed');
    const json = await res.json();
    return P.shapeKrogerStores(json.stores, lat, lon).filter((s) => s.distance <= radius * 1.02);
  }

  async function searchStores(coords) {
    const radius = Number($('radius').value) || 5;
    state.radius = radius;
    setStatus('Searching for grocery stores…');
    try {
      let point = coords;
      if (!point) {
        const q = $('location').value.trim();
        if (!q) {
          setStatus('Enter a zip code or address, or use your location.', true);
          return;
        }
        state.location = q;
        point = await geocode(q);
      }
      const [mapRes, krogerRes] = await Promise.allSettled([
        fetchStores(point.lat, point.lon, radius),
        fetchKrogerStores(point.lat, point.lon, radius),
      ]);
      if (mapRes.status === 'rejected' && !(krogerRes.value || []).length) throw mapRes.reason;
      const kroger = krogerRes.value || [];
      // Kroger's own listing replaces the map's copy of the same store.
      const letters = (t) => String(t || '').toLowerCase().replace(/[^a-z]/g, '');
      const sameStore = (s, k) =>
        P.haversineMiles(s.lat, s.lon, k.lat, k.lon) < 0.15 &&
        [k.brand, k.name.split(' ')[0]].some((c) => letters(c).length > 2 && letters(s.name).includes(letters(c)));
      const mapStores = (mapRes.value || []).filter((s) => !kroger.some((k) => sameStore(s, k)));
      const stores = mapStores.concat(kroger).sort((a, b) => a.distance - b.distance).slice(0, 60);
      state.stores = stores;
      const pick = stores.slice(0, 3);
      const nearestLive = stores.find((s) => s.live);
      if (nearestLive && !pick.includes(nearestLive)) pick[Math.min(2, pick.length - 1)] = nearestLive;
      state.selectedStores = pick.map((s) => s.id);
      state.assignments = {};
      save();
      setStatus(
        stores.length
          ? `Found ${stores.length} grocery store${stores.length === 1 ? '' : 's'} within ${radius} mi. The 3 closest are selected; tick the ones you'll shop at.`
          : `No grocery stores found within ${radius} mi. Try a bigger radius.`,
        !stores.length
      );
      update();
      loadLivePrices(nearestLive);
    } catch (e) {
      const msg =
        e instanceof TypeError || /Store search failed/.test(e.message)
          ? "Couldn't reach the store map service. It may be busy."
          : e.message;
      setStatus(msg, true, () => searchStores(coords));
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setStatus("Your browser can't share location. Enter a zip code instead.", true);
      return;
    }
    setStatus('Getting your location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.location = '';
        $('location').value = '';
        searchStores({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        setStatus('Location permission was denied. Enter a zip code or address instead.', true);
        $('location').focus();
      },
      { timeout: 15000, maximumAge: 600000 }
    );
  }

  async function copyList() {
    const text = P.shoppingListText(P.buildShoppingList(state.plan, servings()), {
      title: 'Shopping list',
      stores: selectedStores(),
      assignments: state.assignments,
      excluded: state.checked,
      byStore: state.view === 'store',
    });
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = h('textarea', { style: 'position:fixed;opacity:0' });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast('Shopping list copied');
  }

  // ---------- wiring ----------

  function update() {
    applyLivePrices();
    save();
    renderBudget();
    renderTabs();
    renderDay();
    renderWeekGrid();
    renderShop();
  }

  function bind() {
    $('budget').addEventListener('input', (e) => {
      state.prefs.budget = Math.max(0, Number(e.target.value) || 0);
      save();
      renderBudget();
      if (P.isWeekComplete(state.plan)) renderList();
    });
    $('servings').addEventListener('input', (e) => {
      const n = Math.round(Number(e.target.value));
      if (!n || n < 1) return;
      state.prefs.servings = Math.min(12, n);
      update();
    });
    document.querySelectorAll('.step-btn').forEach((b) =>
      b.addEventListener('click', () => {
        const n = Math.min(12, Math.max(1, servings() + Number(b.dataset.step)));
        state.prefs.servings = n;
        $('servings').value = n;
        update();
      })
    );
    $('autofill').addEventListener('click', () => {
      const before = P.countMainFilled(state.plan);
      state.plan = P.autofill(state.plan, state.prefs);
      update();
      const added = P.countMainFilled(state.plan) - before;
      toast(added || P.isWeekComplete(state.plan) ? 'Week filled in. Swap anything you like.' : 'No matching meals to add.');
    });
    // Two taps to clear, so a stray tap can't wipe the week.
    let clearArmed = null;
    const disarm = (btn) => {
      clearTimeout(clearArmed);
      clearArmed = null;
      btn.textContent = 'Clear week';
      btn.classList.remove('confirming');
    };
    $('clear-week').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      if (!clearArmed) {
        btn.textContent = 'Tap again to clear';
        btn.classList.add('confirming');
        clearArmed = setTimeout(() => disarm(btn), 3000);
        return;
      }
      disarm(btn);
      state.plan = P.emptyPlan();
      state.checked = {};
      update();
    });
    $('store-form').addEventListener('submit', (e) => {
      e.preventDefault();
      searchStores();
    });
    $('use-location').addEventListener('click', useMyLocation);
    $('radius').addEventListener('change', (e) => {
      state.radius = Number(e.target.value);
      save();
    });
    document.querySelectorAll('.seg-btn').forEach((b) =>
      b.addEventListener('click', () => {
        state.view = b.dataset.view;
        save();
        renderList();
      })
    );
    $('copy-list').addEventListener('click', copyList);
    // Clicking the dimmed backdrop closes the recipe.
    $('recipe-dialog').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeRecipe();
    });
    $('print-list').addEventListener('click', () => window.print());
  }

  renderPrefs();
  bind();
  update();
})();

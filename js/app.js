/* UI wiring for the meal planner. Logic lives in planner.js, data in data.js. */
(function () {
  'use strict';

  const D = window.MPData;
  const P = window.MPPlanner;
  const STORAGE_KEY = 'mealplanner:v1';
  const OVERPASS_URLS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

  const defaults = () => ({
    prefs: {
      styles: ['balanced'],
      appliances: ['stovetop', 'oven', 'microwave'],
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
  });

  let state = load();

  function load() {
    const base = defaults();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        const merged = Object.assign(base, saved);
        merged.prefs = Object.assign(defaults().prefs, saved.prefs || {});
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

  function renderPrefs() {
    const chips = $('style-chips');
    chips.replaceChildren(
      ...D.STYLES.map((s) =>
        h(
          'label',
          { class: 'chip', title: s.desc },
          h('input', {
            type: 'checkbox',
            value: s.id,
            checked: state.prefs.styles.includes(s.id),
            onchange: (e) => toggleStyle(s.id, e.target.checked),
          }),
          h('span', null, s.label)
        )
      )
    );

    const checks = $('appliance-checks');
    checks.replaceChildren(
      ...D.APPLIANCES.map((a) =>
        h(
          'label',
          null,
          h('input', {
            type: 'checkbox',
            value: a.id,
            checked: state.prefs.appliances.includes(a.id),
            onchange: (e) => {
              const set = new Set(state.prefs.appliances);
              if (e.target.checked) set.add(a.id);
              else set.delete(a.id);
              state.prefs.appliances = [...set];
              update();
            },
          }),
          a.label
        )
      )
    );

    $('budget').value = state.prefs.budget;
    $('servings').value = state.prefs.servings;
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

  function renderBudget() {
    const cost = P.weeklyCost(state.plan, servings());
    const budget = Number(state.prefs.budget) || 0;
    const over = budget > 0 && cost > budget;
    $('budget-text').textContent = `Estimated groceries: ${P.money(cost)}${budget ? ` of ${P.money(budget)}` : ''}`;
    $('budget-left').textContent = budget
      ? over
        ? `${P.money(cost - budget)} over budget`
        : `${P.money(budget - cost)} left`
      : 'No budget set';
    $('budget-fill').style.width = budget ? `${Math.min(100, (cost / budget) * 100)}%` : '0%';
    $('budget-meter').classList.toggle('over', over);
    const filled = P.countMainFilled(state.plan);
    $('meal-progress').textContent = `${filled} of 21 main meals planned`;
  }

  function renderTabs() {
    $('day-tabs').replaceChildren(
      ...D.DAYS.map((day) => {
        const dots = P.MAIN_MEALS.map((m) => h('span', { class: 'dot' + (state.plan[day][m] ? ' on' : '') }));
        return h(
          'button',
          {
            type: 'button',
            role: 'tab',
            class: 'day-tab',
            'aria-selected': String(day === state.day),
            'aria-label': `${day}, ${P.MAIN_MEALS.filter((m) => state.plan[day][m]).length} of 3 meals planned`,
            onclick: () => selectDay(day),
          },
          day.slice(0, 3),
          h('span', { class: 'dots', 'aria-hidden': 'true' }, dots)
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
    const slots = D.MEALS.map((meal) => {
      const isSnack = meal.id === 'snack';
      const locked = isSnack && !mainDone;
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
      options.forEach((rec) => select.append(h('option', { value: rec.id }, recipeLabel(rec))));
      if (current && !options.includes(current)) {
        select.append(
          h('optgroup', { label: "Doesn't fit your current plan" }, h('option', { value: current.id }, recipeLabel(current)))
        );
      }
      select.value = current ? current.id : '';

      let info = null;
      if (locked) {
        info = h('div', { class: 'slot-info' }, 'Snacks unlock once breakfast, lunch and dinner are picked for this day.');
      } else if (current) {
        const fits = P.fitsPrefs(current, state.prefs);
        const needs = current.appliances.map((req) => req.split('|').map(applianceLabel).join(' or '));
        info = h(
          'div',
          { class: 'slot-info' },
          h('span', null, `${current.time} min`),
          h('span', null, `${current.kcal} kcal`),
          h('span', null, `${current.protein}g protein`),
          h('span', null, `${current.carbs}g carbs`),
          h('span', null, `${current.fiber}g fiber`),
          h('span', null, `${P.money(P.recipeCost(current) * servings())} for ${servings()}`),
          h('span', null, needs.length ? `Needs: ${needs.join(', ')}` : 'No cooking'),
          fits ? null : h('span', { class: 'warn' }, "Doesn't match your current style or appliances")
        );
      } else if (!options.length) {
        info = null;
      }

      return h(
        'div',
        { class: 'slot' + (locked ? ' disabled' : '') },
        h('label', { class: 'slot-label', for: `slot-${meal.id}` }, meal.label),
        select,
        info
      );
    });
    panel.replaceChildren(h('h3', null, day), ...slots);
  }

  // 7 days x 4 slots, every cell a dropdown. Same plan as the day panel above.
  function renderWeekGrid() {
    const optionsByMeal = {};
    D.MEALS.forEach((m) => {
      optionsByMeal[m.id] = P.recipeOptions(m.id, state.prefs);
    });
    $('week-grid').replaceChildren(
      ...D.DAYS.map((day) => {
        const mainDone = P.isDayMainComplete(state.plan, day);
        return h(
          'div',
          { class: 'week-day' + (day === state.day ? ' active' : '') },
          h('button', { type: 'button', class: 'week-day-name', onclick: () => selectDay(day) }, day),
          D.MEALS.map((meal) => {
            const current = P.getRecipe(state.plan[day][meal.id]);
            const options = optionsByMeal[meal.id];
            const locked = meal.id === 'snack' && !mainDone;
            const sel = h('select', {
              disabled: locked,
              title: current ? current.name : '',
              'aria-label': `${day} ${meal.label.toLowerCase()}`,
              onchange: (e) => {
                state.plan[day][meal.id] = e.target.value || null;
                update();
              },
            });
            sel.append(h('option', { value: '' }, locked ? 'After 3 meals' : meal.id === 'snack' ? 'Optional' : '—'));
            options.forEach((rec) => sel.append(h('option', { value: rec.id }, rec.name)));
            if (current && !options.includes(current)) {
              sel.append(h('optgroup', { label: "Doesn't fit your plan" }, h('option', { value: current.id }, current.name)));
            }
            sel.value = current ? current.id : '';
            return h(
              'label',
              { class: 'm' + (current && !P.fitsPrefs(current, state.prefs) ? ' misfit' : '') },
              h('b', null, meal.label),
              sel
            );
          })
        );
      })
    );
  }

  // ---------- Step 3: stores + shopping list ----------

  function selectedStores() {
    return state.stores.filter((s) => state.selectedStores.includes(s.id));
  }

  function renderShop() {
    const complete = P.isWeekComplete(state.plan);
    $('shop-body').hidden = !complete;
    $('shop-locked').hidden = complete;
    if (!complete) {
      const left = 21 - P.countMainFilled(state.plan);
      $('shop-locked').textContent = `Pick breakfast, lunch and dinner for every day to build your shopping list (${left} meal${
        left === 1 ? '' : 's'
      } to go). Snacks are optional.`;
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
    const totals = state.stores.map((s) => P.storeTotal(items, s));
    const cheapest = totals.length ? Math.min(...totals) : 0;
    list.replaceChildren(
      ...state.stores.map((s, i) => {
        const on = state.selectedStores.includes(s.id);
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
            h('div', { class: 'store-meta' }, `${s.type} · ${s.distance.toFixed(1)} mi · ${tier.label} prices`),
            h(
              'div',
              { class: 'store-total' },
              `Whole list ≈ ${P.money(totals[i])}`,
              totals[i] === cheapest && state.stores.length > 1 ? h('span', { class: 'badge' }, 'Cheapest') : null
            ),
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
    save();
    renderStores();
    renderList();
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
    $('list-total').textContent =
      `Estimated total ${P.money(total)} at standard prices` +
      (budget ? ` (budget ${P.money(budget)})` : '') +
      (remaining !== total ? ` · ${P.money(remaining)} left to buy` : '');
    const over = budget > 0 && total > budget;
    $('over-budget').hidden = !over;
    if (over) {
      $('over-budget').textContent = `This plan is about ${P.money(total - budget)} over your weekly budget. Swap a few meals for cheaper ones, try the Money saver style, or shop at a discount store.`;
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
          h('h4', null, g.key),
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
              h(
                'div',
                { class: 'item-name' },
                it.name,
                h('small', null, P.formatQty(it.buyQty, it.unit) + (it.staple ? ' · pantry staple, check if you have it' : ''))
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
      const stores = (await fetchStores(point.lat, point.lon, radius)).slice(0, 60);
      state.stores = stores;
      state.selectedStores = stores.slice(0, 3).map((s) => s.id);
      state.assignments = {};
      save();
      setStatus(
        stores.length
          ? `Found ${stores.length} grocery store${stores.length === 1 ? '' : 's'} within ${radius} mi. The 3 closest are selected; tick the ones you'll shop at.`
          : `No grocery stores found within ${radius} mi. Try a bigger radius.`,
        !stores.length
      );
      renderStores();
      renderList();
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
    $('autofill').addEventListener('click', () => {
      const before = P.countMainFilled(state.plan);
      state.plan = P.autofill(state.plan, state.prefs);
      update();
      const added = P.countMainFilled(state.plan) - before;
      toast(added || P.isWeekComplete(state.plan) ? 'Week filled in. Swap anything you like.' : 'No matching meals to add.');
    });
    $('clear-week').addEventListener('click', () => {
      if (!confirm('Clear every meal from this week?')) return;
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
    $('print-list').addEventListener('click', () => window.print());
  }

  renderPrefs();
  bind();
  update();
})();

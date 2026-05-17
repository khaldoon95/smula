import './styles/main.css';
import { foods, tierColors, tierLabels, tierBg, modeWeights, tierOverrides } from './data/foods.js';

let activeMode = "maintain";

function getEffectiveTier(food) {
  if (tierOverrides[food.name]) return tierOverrides[food.name][activeMode];
  return food.tier;
}

function score(f) {
  const w = modeWeights[activeMode];
  return Math.round((f.sat/5)*w.sat*100 + (f.pro/5)*w.pro*100 + (f.mic/5)*w.mic*100);
}

function tierChanged(food) {
  if (!tierOverrides[food.name]) return false;
  return tierOverrides[food.name][activeMode] !== tierOverrides[food.name]["maintain"];
}

const CATEGORIES = ["All", ...new Set(foods.map(f => f.category))];
const TIERS = [{id:0,label:"All"},{id:1,label:"Essential"},{id:2,label:"Solid"},{id:3,label:"Occasional"},{id:4,label:"Limit"}];
const BUDGETS = [{id:0,label:"All prices"},{id:1,label:"💰 Budget"},{id:2,label:"💰💰 Mid"},{id:3,label:"💰💰💰 Premium"}];

let activeTier = 0, activeCategory = "All", activeBudget = 0, sortBy = "score", searchVal = "", expandedName = null;
let shoppingList = [];
let checkedItems = new Set();

function tierCount(tid) {
  if (tid === 0) return foods.length;
  return foods.filter(f => getEffectiveTier(f) === tid).length;
}

function rebuildTierChips() {
  const tierRow = document.getElementById("tier-row");
  tierRow.innerHTML = "";
  TIERS.forEach(t => {
    const btn = document.createElement("button");
    btn.className = "tier-chip" + (t.id === activeTier ? " active" : "");
    btn.innerHTML = `${t.label} <span style="opacity:0.5;font-size:8px">${tierCount(t.id)}</span>`;
    btn.style.color = t.id === activeTier ? "#1c1a16" : (tierColors[t.id] || "#6a6258");
    if (t.id === activeTier) { btn.style.borderColor = "#1c1a16"; btn.style.background = "rgba(28,26,22,0.06)"; }
    btn.dataset.tier = t.id;
    tierRow.appendChild(btn);
  });
}

rebuildTierChips();

const catRow = document.getElementById("cat-row");
CATEGORIES.forEach(cat => {
  const btn = document.createElement("button");
  btn.className = "cat-chip" + (cat === "All" ? " active" : "");
  btn.textContent = cat;
  btn.dataset.cat = cat;
  catRow.appendChild(btn);
});

const budgetRow = document.getElementById("budget-row");
BUDGETS.forEach(b => {
  const btn = document.createElement("button");
  btn.className = "cat-chip" + (b.id === 0 ? " active" : "");
  btn.textContent = b.label;
  btn.dataset.budget = b.id;
  budgetRow.appendChild(btn);
});

window.onerror = function(msg, url, line) {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#8a3528;color:#ece4d4;padding:10px;font-size:12px;z-index:9999;';
  div.textContent = '⚠ ' + msg + ' (line ' + line + ')';
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 8000);
  return false;
};

function addTapListener(el, handler) {
  let touchMoved = false;
  el.addEventListener('touchstart', () => { touchMoved = false; }, { passive: true });
  el.addEventListener('touchmove', () => { touchMoved = true; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (touchMoved) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    e.preventDefault();
    handler(e);
  });
  el.addEventListener('click', handler);
}

addTapListener(document.getElementById("mode-bar"), (e) => {
  const modeBtn = e.target.closest(".mode-btn");
  if (!modeBtn) return;
  activeMode = modeBtn.dataset.mode;
  document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
  modeBtn.classList.add("active");
  rebuildTierChips();
  render();
  renderPlate();
  showHint('modeswitch');
});

addTapListener(document.getElementById("controls"), (e) => {
  const tierChip = e.target.closest(".tier-chip");
  if (tierChip) {
    activeTier = parseInt(tierChip.dataset.tier);
    document.querySelectorAll(".tier-chip").forEach(c => {
      c.classList.remove("active");
      const tid = parseInt(c.dataset.tier);
      c.style.color = tid === 0 ? "#6a6258" : (tierColors[tid] || "#6a6258");
      c.style.borderColor = "#d4cabb";
      c.style.background = "transparent";
    });
    tierChip.classList.add("active");
    tierChip.style.color = activeTier === 0 ? "#1c1a16" : tierColors[activeTier];
    tierChip.style.borderColor = activeTier === 0 ? "#1c1a16" : tierColors[activeTier];
    tierChip.style.background = activeTier === 0 ? "rgba(28,26,22,0.06)" : `rgba(${activeTier===1?'90,113,64':activeTier===2?'168,122,37':activeTier===3?'168,90,54':'138,53,40'},0.06)`;
    render(); return;
  }
  const catChip = e.target.closest("#cat-row .cat-chip");
  if (catChip) {
    activeCategory = catChip.dataset.cat;
    document.querySelectorAll("#cat-row .cat-chip").forEach(c => c.classList.remove("active"));
    catChip.classList.add("active");
    render(); return;
  }
  const budgetChip = e.target.closest("#budget-row .cat-chip");
  if (budgetChip) {
    activeBudget = parseInt(budgetChip.dataset.budget);
    document.querySelectorAll("#budget-row .cat-chip").forEach(c => c.classList.remove("active"));
    budgetChip.classList.add("active");
    render(); return;
  }
  const sortBtn = e.target.closest(".sort-btn");
  if (sortBtn) {
    sortBy = sortBtn.dataset.sort;
    document.querySelectorAll(".sort-btn").forEach(b => b.classList.remove("active"));
    sortBtn.classList.add("active");
    render(); return;
  }
});

const searchInput = document.getElementById("search");
searchInput.addEventListener("input", () => { searchVal = searchInput.value; render(); });
searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { searchInput.blur(); } });

addTapListener(document.getElementById("food-list"), (e) => {
  const btn = e.target.closest("[data-action]");
  if (btn) {
    const action = btn.dataset.action;
    const foodName = btn.dataset.food;
    const food = foods.find(f => f.name === foodName);
    if (action === 'shop') { toggleCart(foodName, btn.dataset.cat, e); showHint('addshop'); return; }
    if (action === 'plate') {
      if (food) {
        const existing = plateItems.findIndex(i => i.food.name === foodName);
        if (existing === -1) { addToPlate(food, 'M'); showHint('addplate'); }
        else { plateItems.splice(existing, 1); renderPlate(); savePlate(); render(); }
      }
      return;
    }
    if (action === 'detail') {
      const panelId = "detail-" + foodName.replace(/[^a-z0-9]/gi,'_');
      const panel = document.getElementById(panelId);
      if (panel) {
        panel.classList.toggle("open");
        btn.textContent = panel.classList.contains("open") ? "− Less" : "+ More";
      }
      return;
    }
  }
  const foodRow = e.target.closest(".food-row");
  if (foodRow) {
    const item = foodRow.closest(".food-item");
    const isOpening = expandedName !== item.dataset.foodName;
    expandedName = isOpening ? item.dataset.foodName : null;
    render();
    if (isOpening) showHint('foodrow');
  }
});

addTapListener(document.getElementById("list-items"), (e) => {
  const remove = e.target.closest(".list-remove");
  if (remove) { toggleCart(remove.dataset.name, remove.dataset.cat, e); renderPanel(); return; }
  const shopToPlate = e.target.closest(".shop-to-plate-btn");
  if (shopToPlate) {
    const food = foods.find(f => f.name === shopToPlate.dataset.name);
    if (food) { addToPlate(food, 'M'); switchPanel('plate'); }
    return;
  }
  const row = e.target.closest(".list-item");
  if (row && row.dataset.name) {
    const name = row.dataset.name;
    if (checkedItems.has(name)) checkedItems.delete(name);
    else checkedItems.add(name);
    renderPanel(); render();
  }
});

addTapListener(document.getElementById("cart-fab"), openPanel);
addTapListener(document.getElementById("overlay"), closePanel);
addTapListener(document.querySelector(".panel-close"), closePanel);
addTapListener(document.getElementById('ph-add-cta'), () => { openPanel(); switchPanel('plate'); });
addTapListener(document.getElementById('plate-score-toggle'), () => {
  document.getElementById('ph-score-value').classList.toggle('hidden');
});

function toggleCart(foodName, foodCategory, e) {
  if (e) e.stopPropagation();
  const idx = shoppingList.findIndex(i => i.name === foodName);
  if (idx === -1) shoppingList.push({ name: foodName, category: foodCategory });
  else { shoppingList.splice(idx, 1); checkedItems.delete(foodName); }
  updateFab();
  saveList();
  render();
  if (document.getElementById("list-panel").classList.contains("open")) renderPanel();
}

function updateFab() {
  const fab = document.getElementById("cart-fab");
  const cartBadge = document.getElementById("cart-count");
  const plateBadge = document.getElementById("plate-count");
  cartBadge.textContent = shoppingList.length;
  shoppingList.length > 0 ? cartBadge.classList.remove('hidden') : cartBadge.classList.add('hidden');
  plateBadge.textContent = plateItems.length;
  plateItems.length > 0 ? plateBadge.classList.remove('hidden') : plateBadge.classList.add('hidden');
  fab.style.display = 'flex';
}

let _bodyScrollY = 0;

function openPanel() {
  _bodyScrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${_bodyScrollY}px`;
  document.body.style.width = '100%';
  document.getElementById("list-panel").classList.add("open");
  document.getElementById("overlay").classList.add("open");
  renderPanel();
}

function closePanel() {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  window.scrollTo(0, _bodyScrollY);
  document.getElementById("list-panel").classList.remove("open");
  document.getElementById("overlay").classList.remove("open");
}

function clearList() {
  shoppingList = []; checkedItems.clear();
  updateFab(); render(); renderPanel();
}

function renderPanel() {
  const container = document.getElementById("list-items");
  const countLabel = document.getElementById("item-count-label");
  const done = shoppingList.filter(i => checkedItems.has(i.name)).length;
  countLabel.textContent = `${done} of ${shoppingList.length} items checked`;
  if (shoppingList.length === 0) {
    container.innerHTML = '<div class="list-empty">No items yet<br><br>Tap \'Add to shop\' on any food</div>';
    return;
  }
  const grouped = {};
  shoppingList.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });
  container.innerHTML = "";
  Object.keys(grouped).forEach(cat => {
    const catHeader = document.createElement("div");
    catHeader.style.cssText = "padding:8px 18px 4px;font-size:8px;color:var(--muted);letter-spacing:1.5px;";
    catHeader.textContent = cat;
    container.appendChild(catHeader);
    grouped[cat].forEach(item => {
      const isChecked = checkedItems.has(item.name);
      const div = document.createElement("div");
      div.className = "list-item";
      div.dataset.name = item.name;
      div.dataset.cat = item.category;
      div.style.cursor = "pointer";
      div.innerHTML = `
        <div class="list-item-left">
          <div class="list-check ${isChecked ? 'checked' : ''}" data-name="${item.name}">
            ${isChecked ? '<span style="font-size:10px;color:#ece4d4">✓</span>' : ''}
          </div>
          <div class="list-item-name ${isChecked ? 'checked' : ''}">${item.name}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <button class="shop-to-plate-btn" data-name="${item.name}" title="Add to plate" style="background:none;border:1px solid var(--t3);color:var(--t3);font-size:9px;padding:3px 8px;border-radius:6px;cursor:pointer;font-family:'DM Sans',sans-serif;touch-action:manipulation;-webkit-user-select:none;user-select:none;letter-spacing:1px;">🍽</button>
          <button class="list-remove" data-name="${item.name}" data-cat="${item.category}">×</button>
        </div>
      `;
      container.appendChild(div);
    });
  });
}

function matchesSearch(food, val) {
  if (!val) return true;
  const q = val.toLowerCase();
  return food.name.toLowerCase().includes(q)
    || food.category.toLowerCase().includes(q)
    || food.note.toLowerCase().includes(q)
    || food.micros.some(m => m.toLowerCase().includes(q));
}

function render() {
  const list = document.getElementById("food-list");
  const filtered = foods
    .filter(f => activeTier === 0 || getEffectiveTier(f) === activeTier)
    .filter(f => activeCategory === "All" || f.category === activeCategory)
    .filter(f => activeBudget === 0 || f.cost === activeBudget)
    .filter(f => matchesSearch(f, searchVal))
    .sort((a,b) => {
      if (sortBy === "score") return score(b) - score(a);
      if (sortBy === "sat") return b.sat - a.sat;
      if (sortBy === "pro") return b.pro - a.pro;
      if (sortBy === "mic") return b.mic - a.mic;
      if (sortBy === "cal") return a.cal - b.cal;
      return 0;
    });
  document.getElementById("food-count").textContent = filtered.length + " foods";
  document.getElementById("empty").style.display = filtered.length === 0 ? "block" : "none";
  list.innerHTML = "";
  filtered.forEach((food, idx) => {
    const effectiveTier = getEffectiveTier(food);
    const c = tierColors[effectiveTier];
    const s = score(food);
    const isOpen = expandedName === food.name;
    const inCart = shoppingList.some(i => i.name === food.name);
    const onPlate = plateItems.some(i => i.food.name === food.name);
    const changed = tierChanged(food);
    const maintainTier = food.tier;
    const tierWentUp = effectiveTier < maintainTier;
    const tierWentDown = effectiveTier > maintainTier;
    const rowBg = idx % 2 === 1 ? "background:var(--surface-2);" : "background:var(--bg);";

    const item = document.createElement("div");
    item.className = "food-item";
    item.dataset.foodName = food.name;
    item.dataset.foodCat = food.category;
    item.style.borderLeftColor = isOpen ? c : "transparent";
    if (isOpen) item.style.background = tierBg[effectiveTier];

    const modeTagHtml = changed
      ? `<span class="mode-tag ${tierWentUp ? 'mode-tag-bulk' : 'mode-tag-cut'}">${tierWentUp ? '▲' : '▼'} ${activeMode}</span>`
      : '';

    item.innerHTML = `
      <div class="food-row" style="${rowBg}">
        <div class="name-col">
          <div class="food-name">${food.name}${modeTagHtml}</div>
          <div class="food-meta">
            <span class="cat-tag">${food.category}</span>
            <span style="font-size:8px;color:${c};letter-spacing:1px">${tierLabels[effectiveTier]}</span>
          </div>
        </div>
        <div class="score-col" style="color:${c}">${s}</div>
        <div class="bars-col">
          <div class="bar-row"><span class="bar-label" style="color:var(--t1)">Ful</span><div class="bar-track"><div class="bar-fill" style="width:${food.sat*20}%;background:var(--t1)"></div></div></div>
          <div class="bar-row"><span class="bar-label" style="color:var(--blue)">Pro</span><div class="bar-track"><div class="bar-fill" style="width:${food.pro*20}%;background:var(--blue)"></div></div></div>
          <div class="bar-row"><span class="bar-label" style="color:var(--purple)">Nou</span><div class="bar-track"><div class="bar-fill" style="width:${food.mic*20}%;background:var(--purple)"></div></div></div>
        </div>
        <div class="chevron-col">${isOpen ? "▲" : "▼"}</div>
      </div>
      <div class="food-expanded ${isOpen ? 'open' : ''}" style="border-left-color:${c};background:${tierBg[effectiveTier]}">
        <div class="expanded-inner">
          <div class="expand-note">${food.note}</div>
          <div class="expand-grid">
            <div class="expand-stat"><div class="expand-stat-val" style="color:var(--muted)">${food.cal}</div><div class="expand-stat-label">kcal/100g</div></div>
            <div class="expand-stat"><div class="expand-stat-val" style="color:var(--t2)">${food.protein}g</div><div class="expand-stat-label">protein</div></div>
            <div class="expand-stat"><div class="expand-stat-val" style="color:${c}">${s}</div><div class="expand-stat-label">score</div></div>
          </div>
          <div style="margin-bottom:10px">
            <span style="font-size:9px;color:var(--muted);letter-spacing:1px;">Price (Sweden) </span>
            <span style="font-size:12px">${"💰".repeat(food.cost)}</span>
            <span style="font-size:9px;color:var(--muted);margin-left:4px">${["","Budget","Mid","Premium"][food.cost]}</span>
          </div>
          ${changed ? `<div style="font-size:10px;color:${c};margin-bottom:8px;letter-spacing:1px">
            ${tierWentUp ? '▲' : '▼'} Tier changes on ${activeMode} — ${tierWentUp ? 'more useful for your goal' : 'less useful for your goal'}
          </div>` : ''}
          ${food.micros.length > 0 ? `<div class="micros-title">Key micronutrients</div><div class="micros-list">${food.micros.map(m => `<span class="micro-tag">${m}</span>`).join('')}</div>` : ''}
          <div class="food-actions">
            <button class="btn-action btn-shop ${inCart ? 'active' : ''}" data-action="shop" data-food="${food.name}" data-cat="${food.category}">🛒 ${inCart ? 'In shop list' : 'Add to shop'}</button>
            <button class="btn-action btn-plate ${onPlate ? 'active' : ''}" data-action="plate" data-food="${food.name}">🍽 ${onPlate ? 'On plate' : 'Add to plate'}</button>
            <button class="btn-action btn-detail" data-action="detail" data-food="${food.name}">+ More</button>
          </div>
          <div class="detail-panel" id="detail-${food.name.replace(/[^a-z0-9]/gi,'_')}">
            <div style="font-size:8px;color:var(--muted);letter-spacing:1px;margin-bottom:8px">Full macros per 100g</div>
            <div class="macro-grid">
              <div class="macro-stat"><div class="macro-val">${food.carbs}g</div><div class="macro-label">Carbs</div></div>
              <div class="macro-stat"><div class="macro-val">${food.fat}g</div><div class="macro-label">Fat</div></div>
              <div class="macro-stat"><div class="macro-val">${food.fiber}g</div><div class="macro-label">Fiber</div></div>
              <div class="macro-stat"><div class="macro-val">${food.sugar}g</div><div class="macro-label">Sugar</div></div>
            </div>
            <div class="tier-reason" style="border-left-color:${c}">
              <span style="font-size:8px;letter-spacing:1px;color:${c}">Why ${tierLabels[effectiveTier]}</span><br>
              ${food.tierReason}
            </div>
          </div>
        </div>
      </div>
    `;
    list.appendChild(item);
  });
}

// ── PLATE STATE ───────────────────────────────────────────────────────────
let plateItems = [];
let activePanel = 'shop';

const PORTIONS = { S: 0.8, M: 1.0, L: 1.3 };
const PORTION_GRAMS = { S: '~80g', M: '~150g', L: '~250g' };

function plateGrams(portion) { return { S:80, M:150, L:250 }[portion]; }

function calcPlate() {
  if (plateItems.length === 0) return null;
  let totalCalLow = 0, totalCalHigh = 0;
  let weightedSat = 0, weightedPro = 0, totalWeight = 0;
  let micSum = 0;

  plateItems.forEach(({ food, portion }) => {
    const g = plateGrams(portion);
    const calContrib = (food.cal * g) / 100;
    totalCalLow += (food.cal * g * 0.85) / 100;
    totalCalHigh += (food.cal * g * 1.15) / 100;
    const w = Math.max(calContrib, 20);
    weightedSat += food.sat * w;
    weightedPro += food.pro * w;
    totalWeight += w;
    micSum += food.mic;
  });

  const sat = Math.round((weightedSat / (totalWeight * 5)) * 100);
  const pro = Math.round((weightedPro / (totalWeight * 5)) * 100);
  const mic = Math.round((micSum / (plateItems.length * 5)) * 100);
  const w = modeWeights[activeMode];
  const mealScore = Math.round((sat/100)*w.sat*100 + (pro/100)*w.pro*100 + (mic/100)*w.mic*100);

  return { sat, pro, mic, mealScore, calLow: Math.round(totalCalLow), calHigh: Math.round(totalCalHigh) };
}

function getPlateFlags(p) {
  const flags = [];
  const mode = activeMode;
  const avoidFoods = plateItems.filter(i => getEffectiveTier(i.food) === 4);
  const modFoods = plateItems.filter(i => getEffectiveTier(i.food) === 3);
  if (avoidFoods.length > 0) flags.push({ type:'warn', text:`⚠ Your plate has some foods worth limiting: ${avoidFoods.map(i => i.food.name).join(', ')}` });
  if (modFoods.length > plateItems.length / 2) flags.push({ type:'warn', text:'⚠ Most of this plate is Occasional foods. Fine sometimes, not as a habit.' });
  if (p.sat >= 60 && p.pro >= 55 && p.mic >= 55) flags.push({ type:'good', text:'✓ Good plate. Filling, protein-covered, nutritious.' });
  if (p.sat < 35) flags.push({ type:'warn', text:'⚠ This might not keep you full. Consider adding something with more fiber or protein.' });
  if (p.pro < 30) flags.push({ type:'warn', text:'⚠ Protein is low here. Add an egg, some chicken, or legumes.' });
  if (p.mic < 35) flags.push({ type:'warn', text:'⚠ Not much nutritional variety. Throw some vegetables in.' });
  if (p.pro >= 65) flags.push({ type:'good', text:'✓ Protein is solid here. Your muscles will be fine.' });
  if (p.mic >= 65) flags.push({ type:'good', text:'✓ Good variety of nutrients. This plate is doing real work.' });
  const calThresholds = { cut: 600, maintain: 900, bulk: 1400 };
  const calWarnHigh = { cut: 900, maintain: 1300, bulk: 2000 };
  if (p.calHigh > calWarnHigh[mode]) flags.push({ type:'warn', text:`⚠ Very high calories for ${mode}. Consider smaller portions.` });
  else if (p.calHigh > calThresholds[mode]) flags.push({ type:'warn', text:`⚠ Getting up there in calories for ${mode} mode.` });
  if (mode === 'bulk' && p.calHigh < 400) flags.push({ type:'info', text:'💡 If you\'re bulking, this isn\'t enough. Add something calorie-dense and nutritious.' });
  if (flags.length === 0) flags.push({ type:'info', text:'💡 A balanced plate. Add more if you\'re hungry.' });
  return flags;
}

function getPhraseFromPlate(p) {
  if (!p) return null;
  const sorted = [p.sat, p.pro, p.mic].slice().sort((a, b) => b - a);
  if (sorted[0] - sorted[1] < 5) return 'Solid plate.';
  if (p.sat === sorted[0]) return 'Filling plate.';
  if (p.pro === sorted[0]) return 'Protein-forward.';
  return 'Nutrient-rich.';
}

function renderPlateInto(p, flags, isHome) {
  if (isHome) {
    const ph = document.getElementById('plate-home');
    if (!p) {
      ph.classList.remove('has-items');
      document.getElementById('ph-collapsed-phrase').textContent = 'Your plate';
      document.getElementById('ph-collapsed-meta').textContent = '';
      return;
    }
    ph.classList.add('has-items');
    const phrase = getPhraseFromPlate(p);
    document.getElementById('ph-phrase').textContent = phrase || '';
    document.getElementById('ph-items').innerHTML = plateItems.map(e =>
      `<span class="ph-item-chip">${e.food.name}<span class="ph-item-portion">${e.portion}</span></span>`
    ).join('');
    document.getElementById('ph-cal').textContent = `~${p.calLow}–${p.calHigh} kcal`;
    document.getElementById('ph-sat-bar').style.width = Math.min(p.sat, 100) + '%';
    document.getElementById('ph-pro-bar').style.width = Math.min(p.pro, 100) + '%';
    document.getElementById('ph-mic-bar').style.width = Math.min(p.mic, 100) + '%';
    document.getElementById('ph-flags').innerHTML = flags.map(f =>
      `<div class="plate-flag plate-flag-${f.type}">${f.text}</div>`
    ).join('');
    document.getElementById('ph-score-value').textContent = p.mealScore;
    document.getElementById('ph-collapsed-phrase').textContent = phrase || '';
    document.getElementById('ph-collapsed-meta').textContent = `${plateItems.length} item${plateItems.length > 1 ? 's' : ''}`;
  } else {
    const summary = document.getElementById('plate-summary');
    const itemsEl = document.getElementById('plate-items');
    if (!p) {
      summary.style.display = 'none';
      itemsEl.innerHTML = '<div class="plate-empty">Plate is empty<br><br>Search above or tap<br>\'Add to plate\' on any food</div>';
      return;
    }
    summary.style.display = 'block';
    const scoreColor = p.mealScore >= 70 ? 'var(--t1)' : p.mealScore >= 45 ? 'var(--t2)' : 'var(--t4)';
    document.getElementById('plate-cal').innerHTML = `
      <span style="font-family:'DM Serif Display',serif;font-size:26px;color:${scoreColor};font-weight:400">${p.mealScore}</span>
      <span style="font-size:9px;color:var(--muted);letter-spacing:1px;margin-left:4px">Meal score</span>
      <span style="float:right;font-size:11px;color:var(--muted)">~${p.calLow} – ${p.calHigh} kcal</span>
    `;
    document.getElementById('plate-sat-bar').style.width = Math.min(p.sat, 100) + '%';
    document.getElementById('plate-pro-bar').style.width = Math.min(p.pro, 100) + '%';
    document.getElementById('plate-mic-bar').style.width = Math.min(p.mic, 100) + '%';
    document.getElementById('plate-sat-pct').textContent = p.sat + '%';
    document.getElementById('plate-pro-pct').textContent = p.pro + '%';
    document.getElementById('plate-mic-pct').textContent = p.mic + '%';
    document.getElementById('plate-flags').innerHTML = flags.map(f =>
      `<div class="plate-flag plate-flag-${f.type}">${f.text}</div>`
    ).join('');
    itemsEl.innerHTML = '';
    plateItems.forEach((entry, idx) => {
      const div = document.createElement('div');
      div.className = 'plate-item';
      div.innerHTML = `
        <div class="plate-item-left">
          <div class="plate-item-name">${entry.food.name}</div>
          <div class="plate-item-sub">${PORTION_GRAMS[entry.portion]} · ${entry.food.cal} kcal/100g</div>
        </div>
        <div class="plate-item-right">
          <button class="portion-btn ${entry.portion === 'S' ? 'active' : ''}" data-idx="${idx}" data-portion="S">S</button>
          <button class="portion-btn ${entry.portion === 'M' ? 'active' : ''}" data-idx="${idx}" data-portion="M">M</button>
          <button class="portion-btn ${entry.portion === 'L' ? 'active' : ''}" data-idx="${idx}" data-portion="L">L</button>
          <button class="plate-remove" data-idx="${idx}">×</button>
        </div>
      `;
      itemsEl.appendChild(div);
    });
  }
}

function renderPlate() {
  const p = calcPlate();
  const flags = p ? getPlateFlags(p) : [];
  const plateBadge = document.getElementById('plate-count');
  const countLabel = document.getElementById('plate-count-label');
  if (plateItems.length > 0) { plateBadge.textContent = plateItems.length; plateBadge.classList.remove('hidden'); }
  else { plateBadge.classList.add('hidden'); }
  countLabel.textContent = plateItems.length > 0 ? `${plateItems.length} item${plateItems.length > 1 ? 's' : ''} on plate` : '';
  renderPlateInto(p, flags, false);
  renderPlateInto(p, flags, true);
}

function addToPlate(food, portion) {
  const existing = plateItems.findIndex(i => i.food.name === food.name);
  if (existing === -1) plateItems.push({ food, portion: portion || 'M' });
  else plateItems[existing].portion = portion || plateItems[existing].portion;
  renderPlate();
  savePlate();
  render();
}

function savePlate() {
  try { localStorage.setItem('lago_plate', JSON.stringify(plateItems.map(i => ({ name: i.food.name, portion: i.portion })))); } catch(e) {}
}

function loadPlate() {
  try {
    // Migrate from old key
    const old = localStorage.getItem('fg_plate');
    if (old && !localStorage.getItem('lago_plate')) localStorage.setItem('lago_plate', old);
    const saved = localStorage.getItem('lago_plate');
    if (saved) {
      const items = JSON.parse(saved);
      items.forEach(({ name, portion }) => {
        const food = foods.find(f => f.name === name);
        if (food) plateItems.push({ food, portion });
      });
    }
  } catch(e) {}
}

function switchPanel(mode) {
  activePanel = mode;
  document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.panel-tab[data-panel="${mode}"]`).classList.add('active');
  const shopContent = document.getElementById('shop-content');
  const plateContent = document.getElementById('plate-content');
  const panelTitle = document.getElementById('panel-title');
  if (mode === 'shop') {
    shopContent.classList.remove('hidden');
    plateContent.classList.remove('active');
    panelTitle.textContent = '🛒 Shop';
    renderPanel();
  } else {
    shopContent.classList.add('hidden');
    plateContent.classList.add('active');
    panelTitle.textContent = '🍽 Build a plate';
    renderPlate();
  }
}

addTapListener(document.querySelector('.panel-tabs'), (e) => {
  const tab = e.target.closest('.panel-tab');
  if (tab) switchPanel(tab.dataset.panel);
});

addTapListener(document.getElementById('plate-items'), (e) => {
  const portionBtn = e.target.closest('.portion-btn');
  if (portionBtn) {
    const idx = parseInt(portionBtn.dataset.idx);
    plateItems[idx].portion = portionBtn.dataset.portion;
    renderPlate(); savePlate(); return;
  }
  const removeBtn = e.target.closest('.plate-remove');
  if (removeBtn) {
    const idx = parseInt(removeBtn.dataset.idx);
    plateItems.splice(idx, 1);
    renderPlate(); savePlate();
  }
});

const plateSearchInput = document.getElementById('plate-search-input');
const plateSearchResults = document.getElementById('plate-search-results');

plateSearchInput.addEventListener('input', () => {
  const q = plateSearchInput.value.toLowerCase().trim();
  if (!q) { plateSearchResults.style.display = 'none'; return; }
  let results = foods.filter(f => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q));
  // Prioritize foods already in shopping list
  const inShop = results.filter(f => shoppingList.some(i => i.name === f.name));
  const notInShop = results.filter(f => !shoppingList.some(i => i.name === f.name));
  results = [...inShop, ...notInShop].slice(0, 8);
  if (results.length === 0) { plateSearchResults.style.display = 'none'; return; }
  plateSearchResults.innerHTML = results.map(f => `
    <div class="plate-search-item" data-food="${f.name}">
      <div>${f.name}</div>
      <div class="plate-search-item-sub">${f.category} · ${tierLabels[f.tier]}${shoppingList.some(i=>i.name===f.name)?' · in shop':''}</div>
    </div>
  `).join('');
  plateSearchResults.style.display = 'block';
});

addTapListener(plateSearchResults, (e) => {
  const item = e.target.closest('.plate-search-item');
  if (item) {
    const food = foods.find(f => f.name === item.dataset.food);
    if (food) { addToPlate(food, 'M'); plateSearchInput.value = ''; plateSearchResults.style.display = 'none'; }
  }
});

addTapListener(document.getElementById('clear-shop-btn'), () => clearList());
addTapListener(document.getElementById('clear-plate-btn'), () => { plateItems = []; renderPlate(); savePlate(); });

function saveList() {
  try {
    localStorage.setItem('lago_shopping', JSON.stringify(shoppingList));
    localStorage.setItem('lago_checked', JSON.stringify([...checkedItems]));
  } catch(e) {}
}

function loadList() {
  try {
    // Migrate from old keys
    const oldS = localStorage.getItem('fg_shopping');
    const oldC = localStorage.getItem('fg_checked');
    if (oldS && !localStorage.getItem('lago_shopping')) localStorage.setItem('lago_shopping', oldS);
    if (oldC && !localStorage.getItem('lago_checked')) localStorage.setItem('lago_checked', oldC);
    const s = localStorage.getItem('lago_shopping');
    const c = localStorage.getItem('lago_checked');
    if (s) shoppingList = JSON.parse(s);
    if (c) checkedItems = new Set(JSON.parse(c));
  } catch(e) {}
}

const _origToggle = toggleCart;
toggleCart = function(foodName, foodCategory, e) {
  _origToggle(foodName, foodCategory, e);
  saveList();
};
const _origClear = clearList;
clearList = function() {
  _origClear();
  saveList();
};
document.getElementById("list-items").addEventListener("click", () => { setTimeout(saveList, 50); });

loadList();
loadPlate();
updateFab();
renderPlate();

// ── HINT SYSTEM ──────────────────────────────────────────────────────────
let hintVisible = false;
let hintTimer = null;
let activeHintId = null;

const HINT_KEYS = {
  foodrow: 'lago_hint_foodrow',
  addshop: 'lago_hint_addshop',
  addplate: 'lago_hint_addplate',
  modeswitch: 'lago_hint_modeswitch'
};
const HINT_TEXTS = {
  foodrow: 'Each bar is independent — fullness, protein, nutrition. Higher is better.',
  addshop: 'Your shopping list. Saves between sessions.',
  addplate: 'Build a plate, pick portions, get a meal score.'
};

function showHint(hintId) {
  if (!HINT_KEYS[hintId] || localStorage.getItem(HINT_KEYS[hintId])) return;
  if (hintVisible) return; // another hint is showing — discard (documented decision)
  hintVisible = true;
  activeHintId = hintId;
  if (hintId === 'modeswitch') {
    document.getElementById('hint-modeswitch').classList.remove('hidden');
  } else {
    document.getElementById('hint-global-text').textContent = HINT_TEXTS[hintId];
    document.getElementById('hint-global').classList.remove('hidden');
  }
  clearTimeout(hintTimer);
  hintTimer = setTimeout(dismissHint, 4000);
}

function dismissHint() {
  if (activeHintId) localStorage.setItem(HINT_KEYS[activeHintId], '1');
  hintVisible = false;
  activeHintId = null;
  clearTimeout(hintTimer);
  document.getElementById('hint-global').classList.add('hidden');
  document.getElementById('hint-modeswitch').classList.add('hidden');
}

addTapListener(document.getElementById('hint-global-x'), dismissHint);
addTapListener(document.getElementById('hint-modeswitch-x'), dismissHint);

// ── WELCOME SCREEN (v7.2 — contextual, single screen) ────────────────────
const WELCOME_CONTENT = {
  cut: {
    icon: '✂',
    headline: 'Eat less without suffering.',
    valueprop: 'Lago ranks foods by how filling they are — so hunger doesn\'t make the decisions.',
    cta: 'Let\'s not be hungry →'
  },
  maintain: {
    icon: '◎',
    headline: 'Eat well without overthinking it.',
    valueprop: 'Which foods are worth eating, which aren\'t. Open it, decide, close it.',
    cta: 'Take me to the food →'
  },
  bulk: {
    icon: '▲',
    headline: 'Eat more of the right stuff.',
    valueprop: 'Food that actually feeds you when you have to eat a lot: protein-rich, nutrient-dense, real food.',
    cta: 'Bring on the food →'
  }
};

function openContextualWelcome(mode) {
  const content = WELCOME_CONTENT[mode] || WELCOME_CONTENT.maintain;
  document.getElementById('welcome-icon').textContent = content.icon;
  document.getElementById('welcome-headline').textContent = content.headline;
  document.getElementById('welcome-valueprop').textContent = content.valueprop;
  document.getElementById('welcome-cta').textContent = content.cta;
  document.getElementById('welcome-overlay').classList.remove('hidden');
}

function closeContextualWelcome() {
  document.getElementById('welcome-overlay').classList.add('hidden');
  localStorage.setItem('lago_welcomed_v72', '1');
}

addTapListener(document.getElementById('welcome-cta'), closeContextualWelcome);
addTapListener(document.getElementById('welcome-skip-link'), closeContextualWelcome);

// ── HELP PANEL (? button) ─────────────────────────────────────────────────
function openHelp() {
  document.getElementById('help-overlay').classList.remove('hidden');
}
function closeHelp() {
  document.getElementById('help-overlay').classList.add('hidden');
}

addTapListener(document.getElementById('info-btn'), openHelp);
addTapListener(document.getElementById('help-close'), closeHelp);
addTapListener(document.getElementById('help-overlay'), (e) => {
  if (e.target === document.getElementById('help-overlay')) closeHelp();
});

// ── FIRST-RUN FLOW ────────────────────────────────────────────────────────
const hasSeenGoalPicker = localStorage.getItem('lago_welcomed_v71');
const hasSeenNewWelcome = localStorage.getItem('lago_welcomed_v72');

if (!hasSeenGoalPicker) {
  document.getElementById('goal-overlay').classList.remove('hidden');
} else if (!hasSeenNewWelcome) {
  openContextualWelcome(activeMode);
}

// Goal picker
addTapListener(document.getElementById('goal-panel'), (e) => {
  const btn = e.target.closest('.goal-btn');
  if (btn) {
    const goal = btn.dataset.goal;
    activeMode = goal;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.mode-btn[data-mode="${goal}"]`).classList.add('active');
    rebuildTierChips();
    render();
    document.getElementById('goal-overlay').classList.add('hidden');
    localStorage.setItem('lago_welcomed_v71', '1');
    openContextualWelcome(goal);
  }
});

addTapListener(document.getElementById('goal-skip'), () => {
  document.getElementById('goal-overlay').classList.add('hidden');
  localStorage.setItem('lago_welcomed_v71', '1');
  openContextualWelcome(activeMode);
});

render();

const _phSentinel = document.getElementById('plate-home-sentinel');
if (_phSentinel && window.IntersectionObserver) {
  new IntersectionObserver((entries) => {
    document.getElementById('plate-home').classList.toggle('collapsed', !entries[0].isIntersecting);
  }, { threshold: 0 }).observe(_phSentinel);
}

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Lago** (repo: smula) is a food-choice simplification app. It ranks foods by fullness, protein, and micronutrient density across three goal modes. No account, no tracking — open it, decide what to eat, close it.

**The Vite migration is complete.** The live app is entirely in `src/` + `index.html`. `lago-v7.1.html` is a legacy reference file — do not edit it or treat it as the source of truth for anything.

Live URL: **https://khaldoon95.github.io/smula**
Deploys automatically via GitHub Actions on every push to `main`.

## Commands

```bash
npm run dev      # Vite dev server, hot reload
npm run build    # production build → dist/
npm run preview  # preview dist/ locally
```

No test runner is configured.

## File structure

```
index.html                 App shell — all static HTML
src/
  main.js                  All app logic (state, rendering, events, panels)
  styles/main.css          All styles (CSS variables, layout, every component)
  data/foods.js            Food data + scoring config — single source of truth
.github/workflows/
  deploy.yml               CI: npm ci → vite build → deploy dist/ to GitHub Pages
lago-v7.1.html             Legacy reference only. Do not touch.
```

---

## Food scoring system

### Axes (per food, scale 0–5)

| Field | Meaning |
|-------|---------|
| `sat` | Satiety — how filling per calorie (based on Holt et al. 1995) |
| `pro` | Protein — content and quality |
| `mic` | Micronutrients — vitamin/mineral density per calorie |

### Score formula

```
score = (sat/5)*w.sat*100 + (pro/5)*w.pro*100 + (mic/5)*w.mic*100
```

Result is 0–100. Weights come from `modeWeights[activeMode]`.

### Mode weights (`src/data/foods.js`)

| Mode | sat | pro | mic |
|------|-----|-----|-----|
| cut | 0.40 | 0.35 | 0.25 |
| maintain | 0.35 | 0.35 | 0.30 |
| bulk | 0.20 | 0.40 | 0.40 |

Cut prioritises fullness. Bulk deprioritises it and emphasises protein + nutrients.

### Tiers

| Tier | Label | Color var |
|------|-------|-----------|
| 1 | Essential | `--t1` (green) |
| 2 | Solid | `--t2` (gold) |
| 3 | Occasional | `--t3` (orange) |
| 4 | Limit | `--t4` (red) |

### Tier overrides (`tierOverrides` in foods.js)

Some foods have a different effective tier depending on the active mode. Examples: Salmon is T2 on Cut/Maintain, T1 on Bulk. Dried Fruit is T4 on Cut/Maintain, T3 on Bulk. Overrides are applied in `getEffectiveTier(food)` — the food's base `tier` field is never mutated.

**Do not modify `foods`, `modeWeights`, `tierOverrides`, or scoring logic without explicit instruction.**

---

## index.html

Static shell. Key elements:

- `#goal-overlay` — first-run goal picker (Cut / Maintain / Bulk)
- `#welcome-overlay` — contextual single-screen welcome after goal pick (v7.2)
- `#help-overlay` — educational help panel, opened by `?` button
- `#header` — sticky; contains app title, food count, `#info-btn` (`?`)
- `#mode-bar` — Cut / Maintain / Bulk mode switcher
- `#hint-modeswitch` — inline hint div below mode bar
- `#controls` — tier chips, category chips, budget chips, search input, sort buttons
- `#food-list` — food rows, populated by `render()`
- `#hint-global` — fixed hint banner above FAB
- `#cart-fab` — floating action button, opens the panel
- `#list-panel` — bottom-sheet panel with shop + plate tabs
- `#overlay` — dim backdrop behind panel

---

## src/main.js

Single ES module. Sections in file order:

1. **Scoring helpers** — `getEffectiveTier()`, `score()`, `tierChanged()`
2. **UI state** — `activeTier`, `activeCategory`, `activeBudget`, `sortBy`, `searchVal`, `expandedName`
3. **Chip builders** — `rebuildTierChips()`, category and budget chip setup on load
4. **`addTapListener(el, handler)`** — unified click + touch wrapper; suppresses scroll-triggered taps
5. **Mode bar handler** — updates `activeMode`, rebuilds chips, calls `render()` + `renderPlate()`
6. **Controls handler** — delegates tier / category / budget / sort chip taps
7. **Food list handler** — row expand, shop/plate action buttons, hint triggers
8. **Panel interaction handlers** — shop list items, FAB, overlay, panel-close
9. **`render()`** — filters + sorts `foods`, rebuilds entire food list DOM
10. **Plate state** — `plateItems[]`, `calcPlate()`, `getPlateFlags()`, `renderPlate()`, `addToPlate()`, `savePlate()`, `loadPlate()`
11. **Panel** — `openPanel()` / `closePanel()` (iOS scroll lock), `switchPanel()`, `renderPanel()`, `clearList()`
12. **Persistence** — `saveList()` / `loadList()` with migration from legacy `fg_*` keys
13. **Hint system** — `showHint(id)`, `dismissHint()` — one per session, 4s auto-dismiss, discard on collision
14. **Welcome** — `openContextualWelcome(mode)` / `closeContextualWelcome()` — sets content from `WELCOME_CONTENT[mode]`
15. **Help panel** — `openHelp()` / `closeHelp()`
16. **First-run flow** — checks `lago_welcomed_v71` / `lago_welcomed_v72`, shows goal picker or welcome

---

## src/styles/main.css

### CSS custom properties (`:root`)

```
--bg / --bg-soft          cream background / slightly darker
--surface / --surface-2   card / alternating row surfaces
--text / --text-2         primary / secondary text
--muted / --muted-2 / --dim   text hierarchy (mid → faint)
--border / --border-light strong / soft dividers
--t1  #5a7140  green   Essential
--t2  #a87a25  gold    Solid
--t3  #a85a36  orange  Occasional
--t4  #8a3528  red     Limit
--blue   #4a5870   protein axis
--purple #6e5266   nourishment axis
--t1-soft … --t4-soft    8% opacity tints for backgrounds
```

Stylesheet sections: header · mode switcher · controls · col headers · food rows · expanded cards · action buttons · detail panel · overlay · shopping panel · panel tabs · plate builder · FAB · welcome screen (v7.2) · help panel · inline hints.

---

## localStorage keys

| Key | Purpose |
|-----|---------|
| `lago_welcomed_v71` | User completed original goal picker |
| `lago_welcomed_v72` | User dismissed v7.2 contextual welcome |
| `lago_shopping` | Shopping list — JSON array of `{name, category}` |
| `lago_checked` | Checked items in shop list — JSON array of names |
| `lago_plate` | Saved plate — JSON array of `{name, portion}` |
| `lago_hint_foodrow` | Food row expansion hint dismissed |
| `lago_hint_addshop` | Add-to-shop hint dismissed |
| `lago_hint_addplate` | Add-to-plate hint dismissed |
| `lago_hint_modeswitch` | Mode-switch hint dismissed |

Do not remove or rename existing keys — they may already be set on users' devices.

---

## Architecture notes

- **No framework.** Vanilla JS; Vite is bundler only. Every state change calls `render()` which rebuilds the food list DOM from scratch. No diffing.
- **iOS scroll lock.** `openPanel()` saves `window.scrollY`, sets `body` to `position:fixed` to stop rubber-band scroll behind the panel. `closePanel()` restores position.
- **Touch handling.** `addTapListener` fires on `touchend` (if no scroll occurred) and on `click`, preventing double-fires and ghost taps from scrolling.
- **Tier overrides are read-only at runtime.** `getEffectiveTier()` reads `tierOverrides[food.name][activeMode]` but never writes back to `food.tier`.

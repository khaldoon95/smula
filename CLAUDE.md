# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Lago** is a food-choice simplification app (repo name: smula). It ranks foods by fullness, protein, and micronutrient density across three goal modes (Cut / Maintain / Bulk). No account, no tracking — open it, decide what to eat, close it.

The Vite migration is complete. The live app is fully in `src/`. `lago-v7.1.html` is kept as a reference file only — do not treat it as the source of truth.

## Commands

```bash
npm run dev       # Vite dev server with hot reload
npm run build     # production build → dist/
npm run preview   # preview the production build locally
```

No test runner is configured. Deploy is automated via GitHub Actions on push to `main` (`.github/workflows/deploy.yml`) — builds Vite and deploys `dist/` to GitHub Pages.

## File structure

```
index.html               Entry point. All app HTML lives here.
src/
  main.js                All app logic — state, rendering, events, panels, welcome flow
  styles/main.css        All styles — CSS custom properties, layout, components
  data/foods.js          Food data + scoring config (single source of truth)
lago-v7.1.html           Reference only. Do not edit or treat as live.
```

### index.html

Static shell. Contains:
- Goal picker overlay (`#goal-overlay`) — first-run, sets active mode
- Contextual welcome overlay (`#welcome-overlay`) — single-screen, goal-specific (v7.2)
- Help panel overlay (`#help-overlay`) — opened by the `?` button
- Sticky header with `?` button (`#info-btn`)
- Mode bar (`#mode-bar`) — Cut / Maintain / Bulk switcher
- Hint banners: `#hint-modeswitch` (inline below mode bar), `#hint-global` (fixed above FAB)
- Controls: tier chips, category chips, budget chips, search input, sort buttons
- Food list container (`#food-list`) — populated by `render()`
- FAB (`#cart-fab`) — opens the shop/plate panel
- Combined shop + plate panel (`#list-panel`) — bottom sheet

### src/data/foods.js

Exports:
- `foods` — array of food objects. Each food has: `name`, `tier` (1–4), `cal`, `protein`, `sat` (satiety 0–5), `pro` (protein score 0–5), `mic` (micronutrient score 0–5), `cost` (1–3), `category`, `carbs`, `fat`, `fiber`, `sugar`, `note`, `tierReason`, `micros[]`
- `tierColors`, `tierLabels`, `tierBg` — display maps keyed by tier number
- `modeWeights` — `{ cut, maintain, bulk }` each with `{ sat, pro, mic }` weights (must sum to 1)
- `tierOverrides` — per-food tier overrides for specific modes (e.g. salmon goes T1 on bulk)

**Do not modify food data, `modeWeights`, `tierOverrides`, or scoring logic without explicit instruction.**

### src/main.js

Single JS module. Key sections in order:

1. **Scoring** — `getEffectiveTier(food)`, `score(food)`, `tierChanged(food)`
2. **Filter/sort state** — `activeTier`, `activeCategory`, `activeBudget`, `sortBy`, `searchVal`, `expandedName`
3. **Chip builders** — `rebuildTierChips()`, category/budget chip setup
4. **Event helpers** — `addTapListener(el, handler)` — unified click + touch handler that suppresses scroll-induced taps
5. **Mode bar handler** — switches `activeMode`, calls `rebuildTierChips()`, `render()`, `renderPlate()`
6. **Controls handler** — delegates tier/category/budget/sort chip taps
7. **Food list handler** — row expand (sets `expandedName`), shop/plate action buttons, hint triggers
8. **Panel handlers** — shop list interactions, FAB open, overlay close
9. **`render()`** — filters + sorts foods, builds full food list DOM including expanded cards
10. **Plate state** — `plateItems[]`, `calcPlate()`, `getPlateFlags()`, `renderPlate()`, `addToPlate()`, `savePlate()`, `loadPlate()`
11. **Panel** — `openPanel()`, `closePanel()`, `switchPanel()`, `renderPanel()`, `clearList()`
12. **Persistence** — `saveList()`, `loadList()` with migration from old `fg_*` keys
13. **Hint system** — `showHint(id)`, `dismissHint()` — one-time hints with 4s auto-dismiss
14. **Welcome screen** — `openContextualWelcome(mode)`, `closeContextualWelcome()` — goal-specific single screen
15. **Help panel** — `openHelp()`, `closeHelp()` — educational content behind `?` button
16. **First-run flow** — checks `lago_welcomed_v71` / `lago_welcomed_v72`, shows goal picker or welcome

### src/styles/main.css

Single stylesheet. CSS custom properties defined in `:root`:
- `--bg`, `--surface`, `--surface-2` — cream background tones
- `--text`, `--text-2`, `--muted`, `--muted-2`, `--dim` — text hierarchy
- `--t1` (green) / `--t2` (gold) / `--t3` (orange) / `--t4` (red) — tier colors
- `--blue`, `--purple` — protein and nourishment axis colors
- `--border`, `--border-light` — dividers

Sections: header, controls, food rows, expanded cards, action buttons, overlay, mode switcher, panel, plate builder, FAB, detail panel, welcome screen (v7.2), help panel, inline hints.

## Architecture notes

- **No framework.** Vanilla JS + Vite for bundling only. `render()` rebuilds the food list DOM on every state change — no virtual DOM or diffing.
- **Single render function.** All filtering, sorting, and HTML generation happens in `render()`. `renderPlate()` and `renderPanel()` are separate for their respective panels.
- **Touch handling.** `addTapListener` wraps every interactive element to prevent ghost clicks and scroll-triggered taps on mobile.
- **iOS scroll lock.** `openPanel()` uses `position:fixed` + saved `scrollY` to prevent rubber-band scroll behind open panels on iOS Safari. `closePanel()` restores scroll position.
- **Scoring.** `score(food)` = `(sat/5)*w.sat*100 + (pro/5)*w.pro*100 + (mic/5)*w.mic*100` where weights come from `modeWeights[activeMode]`. Score is 0–100.

## localStorage keys

| Key | Purpose |
|-----|---------|
| `lago_welcomed_v71` | User has seen the original goal picker |
| `lago_welcomed_v72` | User has seen the v7.2 contextual welcome screen |
| `lago_shopping` | Shopping list (JSON array) |
| `lago_checked` | Checked-off items in shop list (JSON array) |
| `lago_plate` | Saved plate items (JSON array of `{name, portion}`) |
| `lago_hint_foodrow` | Food row hint dismissed |
| `lago_hint_addshop` | Add-to-shop hint dismissed |
| `lago_hint_addplate` | Add-to-plate hint dismissed |
| `lago_hint_modeswitch` | Mode-switch hint dismissed |

Do not remove or rename existing keys — they may be set on users' devices.

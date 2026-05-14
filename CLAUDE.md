# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**smula** is a food-choice simplification app. The project has two parallel tracks:

- `lago-v7.1.html` — the current working app: a self-contained single-file HTML/CSS/JS app with no build step. This is the live, functional version.
- `src/` + `index.html` — a Vite scaffold (vanilla JS, no framework) that is still the default Vite starter template, not yet wired up to the actual app logic.

## Commands

```bash
npm run dev       # start Vite dev server (hot reload)
npm run build     # production build to dist/
npm run preview   # preview the production build
```

No test runner is configured.

## Architecture

### lago-v7.1.html (current app)

A single-file app. All HTML, CSS, and JS live in one file. Key UI areas:

- **Header** — sticky app title + food count
- **Controls** — tier chips (T1–T4), category chips, search input, sort buttons
- **Food list** — each row is a grid (`1fr 40px 88px 28px`): name / tier / category / cart toggle
- **Cart panel** — slide-in panel triggered by a floating action button (`#cart-fab`)

Data is defined as a JS array inside the file. Filtering and sorting are done client-side on each render. The design uses CSS custom properties (`--bg`, `--text`, `--t1`–`--t4`, etc.) and is mobile-first with PWA meta tags.

### Vite project (src/)

Standard Vite vanilla-JS scaffold. Entry point is `index.html` → `src/main.js`. Styles live in `src/styles/main.css`. The `src/main.js` currently references a `./counter.js` that does not exist yet — this file needs to be created or the import removed before `npm run dev` will work without errors.

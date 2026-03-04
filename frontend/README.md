# Training Planner — Frontend

A browser-only single-page app built with **Vite + React (JavaScript)**.  
Data is persisted locally via **Dexie (IndexedDB)**; the backend is used only for CSV import/export and plan recalculation.

---

## Prerequisites

- **Node.js** ≥ 18 (LTS recommended)
- **npm** ≥ 9

---

## Install & run

```bash
# 1. Move into the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

The dev server starts at **http://localhost:5173** by default.

---

## Available scripts

| Script | What it does |
|--------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the production build locally |

---

## Environment variables

Copy `.env.example` to `.env.local` and adjust:

```bash
cp .env.example .env.local
```

| Variable | Default | Used from |
|----------|---------|-----------|
| `VITE_BACKEND_URL` | `http://localhost:8000` | Step 14 (CSV export/import) |

> `.env.local` is git-ignored. Never commit real secrets.

---

## Project structure

```
frontend/
├── index.html            Entry HTML
├── vite.config.js        Vite configuration
├── package.json          Dependencies & scripts
├── .env.example          Environment variable template
├── frontspec.md          Frontend specification (do not edit)
└── src/
    ├── main.jsx          React app entry point
    ├── App.jsx           Root component (Step 0 scaffold)
    ├── App.css           Root component styles
    ├── index.css         Global reset / base styles
    ├── db/               (Step 1) Dexie schema + query helpers
    ├── domain/           (Step 2) Pure utilities (dates, sorts, types)
    ├── api/              (Step 14+) Backend client wrappers
    ├── components/       (Step 3+) UI components
    └── state/            (Step 17) Undo controller
```

---

## Implementation plan

This frontend follows the phased plan in `../frontplan.md`:

| Step | Milestone |
|------|-----------|
| **0** | ✅ Scaffold (this step) |
| 1 | Dexie bootstrap + data load |
| 2 | Domain layer + Vitest harness |
| 3 | RaceBar display + active race selection |
| 4 | Create race modal |
| 5 | Single-active enforcement prompt |
| 6 | Calendar — week view |
| 7 | Calendar — month view + toggle |
| 8 | Planned workout cards + selection |
| 9 | Planned workout modal editing + locking |
| 10 | Drag/drop rescheduling + confirm |
| 11 | Logs in modal (chronological) |
| 12 | Add logs (attached + unplanned) |
| 13 | Attach unplanned logs |
| 14 | CSV export via backend |
| 15 | CSV import via backend |
| 16 | Recalculate plan (backend) |
| 17 | Undo until next action |

---

## Manual QA checklist — Step 0

- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts without errors
- [ ] Browser opens `http://localhost:5173` and shows **"Training Planner"** heading
- [ ] Status line reads **"Status: scaffold ready — Step 0 complete ✓"**
- [ ] `npm run build` completes and produces `dist/`
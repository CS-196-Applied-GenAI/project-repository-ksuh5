# Training Planner — Frontend

Vite + React (JavaScript) SPA.

## Install & run dev server

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## Other commands

```bash
npm run build    # production build → dist/
npm run preview  # preview production build locally
```

## Environment variables

Copy `.env.example` to `.env` and configure before Step 14+:

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_BACKEND_URL` | `http://localhost:8000` | Backend API base URL |

## Project structure (planned)

```
src/
  db/         Dexie schema + query helpers       (Step 1)
  domain/     Pure utilities (dates, sorts, …)   (Step 2)
  api/        Backend client wrappers            (Step 14+)
  components/ UI components                      (Step 3+)
  state/      Undo controller                    (Step 17)
```

## Next step

**Step 1 — Dexie bootstrap:** add Dexie, define schema (races / plannedWorkouts / workoutLogs), load state on app start.
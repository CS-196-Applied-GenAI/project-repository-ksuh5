# stackplan.md — Backend ↔ Frontend Integration Plan

Current date: 2026-03-12
Frontend: Vite + React + Dexie (IndexedDB), at `frontend/`
Backend: FastAPI + Python, at `backend/`
Backend base URL (dev): `http://localhost:8000`

---

## What the Backend Provides

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness check |
| `/plan/recalculate` | POST | Recalculate unlocked future workouts |
| `/csv/export` | POST | Serialize planned workouts + logs → CSV strings |
| `/csv/import` | POST | Parse CSV strings → structured workout/log objects |
| `/state/save` | POST | Persist full app snapshot to SQLite |
| `/state/load` | GET | Load last saved snapshot from SQLite |
| `/routes/snap` | POST | Snap waypoints to road via OSRM |

---

## Key Field-Name Differences (Frontend → Backend)

The frontend uses camelCase; the backend uses snake_case. The frontend also uses
different field names and enum values in some cases. This mapping must be handled
in the API client layer — **never** scattered across components.

| Frontend field | Backend field |
|---|---|
| `raceId` | `race_id` |
| `durationMinutes` | `target_duration_min` |
| `distance` | `target_distance_km` |
| `paceLow` | `target_pace_min_per_km_low` |
| `paceHigh` | `target_pace_min_per_km_high` |
| `structureText` | `structure_text` |
| `type: 'easy'` | `type: 'easy run'` |
| `type: 'long_run'` | `type: 'long run'` |
| `type: 'cross_train'` | `type: 'cross-training'` |
| `type: 'rest'` | `type: 'rest day'` |
| `status: 'active'` | `status: 'Active'` |
| `status: 'archived'` | `status: 'Archived'` |
| `status: 'completed'` | `status: 'Completed'` |

---

## Blueprint — Full Integration Phases

### Phase A: Foundation (API client infrastructure)
Set up the plumbing so the frontend can talk to the backend at all.
- Create `src/api/` directory
- Create `src/api/config.js` — reads `VITE_BACKEND_URL` from env, exports base URL
- Create `src/api/http.js` — thin `apiFetch` wrapper around `fetch` with error handling
- Create `src/api/mappers.js` — pure functions to convert frontend ↔ backend shapes
- Unit-test all mappers thoroughly (no network needed)

### Phase B: Health check
Wire up the `/health` endpoint to prove the pipeline works end-to-end before
touching any real data.
- Create `src/api/healthApi.js`
- Add a "Backend status" indicator to `App.jsx` that shows ok/offline

### Phase C: Plan Recalculate
Connect the "Recalculate Plan" button to `POST /plan/recalculate`.
- Create `src/api/recalcApi.js`
- Map active planned workouts to backend shape, POST, map response back
- Upsert returned workouts into Dexie
- Add undo snapshot before applying (already partially designed in state/)
- Show toast with Undo action

### Phase D: CSV Export
Wire the "Export" button to `POST /csv/export`, then trigger browser download.
- Create `src/api/csvApi.js` with `exportCsv(plannedWorkouts, workoutLogs)`
- Map both collections to backend shape
- Receive CSV strings from backend
- Trigger two file downloads (planned_workouts.csv, workout_logs.csv)

### Phase E: CSV Import
Wire an "Import" file input to `POST /csv/import`, then upsert results into Dexie.
- Add `importCsv(plannedCsvText, logsCsvText)` to `csvApi.js`
- Map returned items back to frontend shape and bulk-upsert into Dexie
- Show an errors table for any rows that failed to parse

### Phase F: State Persistence (Save/Load)
Wire `POST /state/save` and `GET /state/load` to sync full app state to the
backend SQLite database.
- Create `src/api/stateApi.js`
- On app load, call `/state/load` and hydrate Dexie if snapshot exists
- After each mutation, auto-save to `/state/save`
- Handle empty/null snapshot gracefully (first run)

### Phase G: Route Snapping (OSRM)
Wire the route-snap feature to `POST /routes/snap`.
- Create `src/api/routesApi.js`
- Accept a list of `{ lat, lng }` waypoints, POST to backend
- Render returned GeoJSON geometry on the workout modal (or a map component)
- Show a 503-graceful error if OSRM is unavailable

---

## Chunks → Small Steps

---

### Chunk 1 — API Infrastructure (no UI, pure functions)

**Step 1.1 — `src/api/config.js`**
- Create `frontend/src/api/config.js`
- Export `BASE_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'`
- Unit test: import the module and assert BASE_URL is a non-empty string

**Step 1.2 — `src/api/http.js`**
- Create `frontend/src/api/http.js`
- Export `apiFetch(path, options)`:
  - Prepends `BASE_URL`
  - Sets `Content-Type: application/json` on POST
  - Throws a typed `ApiError` (with `status` and `message`) on non-2xx responses
- Unit tests:
  - Mock `fetch`; assert correct URL is constructed
  - Mock a 422 response; assert `ApiError` is thrown with correct status
  - Mock a 200 response; assert parsed JSON is returned

**Step 1.3 — `src/api/mappers.js`**
- Create `frontend/src/api/mappers.js`
- Export pure functions:
  - `frontendWorkoutToBackend(pw)` — maps camelCase fields + type/status enums
  - `backendWorkoutToFrontend(bw)` — reverse
  - `frontendLogToBackend(log)`
  - `backendLogToFrontend(blog)`
  - `frontendRaceStatusToBackend(status)` / `backendRaceStatusToFrontend(status)`
- Unit tests for every mapper:
  - Round-trip: `backendWorkoutToFrontend(frontendWorkoutToBackend(x))` equals `x`
  - All enum values covered (easy, tempo, interval, long_run, cross_train, rest)
  - All status values covered (active, archived, completed)
  - Null fields pass through correctly

---

### Chunk 2 — Health Check (first live wire)

**Step 2.1 — `src/api/healthApi.js`**
- Create `frontend/src/api/healthApi.js`
- Export `checkHealth()` → calls `GET /health` → returns `{ status, version }`
- Unit test: mock `apiFetch`; assert return shape

**Step 2.2 — Wire health check to `App.jsx`**
- Add a `useEffect` on mount that calls `checkHealth()`
- Store result in `backendStatus` state (`'checking' | 'ok' | 'offline'`)
- Render a small status badge in the header: 🟢 Backend ok / 🔴 Backend offline
- No new unit tests needed here (covered by manual dev-server check)

---

### Chunk 3 — Plan Recalculate

**Step 3.1 — `src/api/recalcApi.js`**
- Create `frontend/src/api/recalcApi.js`
- Export `recalculatePlan({ today, raceStatus, plannedWorkouts })`:
  - Maps inputs with `frontendWorkoutToBackend` + `frontendRaceStatusToBackend`
  - POSTs to `/plan/recalculate`
  - Maps response array with `backendWorkoutToFrontend`
  - Returns `updatedWorkouts[]`
- Unit tests:
  - Mock `apiFetch`; assert request payload shape (snake_case, correct enums)
  - Assert response is mapped back to camelCase

**Step 3.2 — Undo snapshot module**
- Create `frontend/src/state/undoStore.js`
- Export: `setSnapshot(workouts)`, `getSnapshot()`, `clearSnapshot()`
  - Stores array in module-level variable (not React state)
- Unit tests:
  - `getSnapshot()` returns null initially
  - `setSnapshot` then `getSnapshot` returns correct value
  - `clearSnapshot` resets to null
  - Second `setSnapshot` overwrites first

**Step 3.3 — Wire Recalculate button to `App.jsx`**
- Add a "🔁 Recalculate Plan" button (only enabled when activeRace exists)
- On click:
  1. Call `setSnapshot(activePlannedWorkouts)` (undo save-point)
  2. Call `recalculatePlan(...)` with today's date, race status, active workouts
  3. Bulk-upsert returned workouts into Dexie via `db.plannedWorkouts.bulkPut`
  4. Call `reload()`
  5. Show a Toast with "Plan recalculated" + Undo button
- Toast component:
  - Create `src/components/Toast.jsx` — renders message + optional action button
  - Auto-dismisses after 5 seconds
  - Unit test: renders message, renders action button when provided, calls callback on click

**Step 3.4 — Undo recalculate**
- When Undo is clicked in the Toast:
  1. Call `getSnapshot()` to retrieve prior workouts
  2. Bulk-upsert snapshot back into Dexie
  3. Call `reload()`
  4. Call `clearSnapshot()`
- Unit test: `clearSnapshot` is called after undo (mock Dexie)
- Any subsequent mutation (race create, workout edit, log save) calls `clearSnapshot()`

---

### Chunk 4 — CSV Export

**Step 4.1 — `src/api/csvApi.js` (export only)**
- Create `frontend/src/api/csvApi.js`
- Export `exportCsv({ plannedWorkouts, workoutLogs })`:
  - Maps both arrays to backend shapes
  - POSTs to `/csv/export`
  - Returns `{ plannedWorkoutsCsv: string, workoutLogsCsv: string }`
- Unit tests:
  - Mock `apiFetch`; assert payload contains both mapped arrays
  - Assert response fields are passed through as strings

**Step 4.2 — `src/utils/downloadFile.js`**
- Create `frontend/src/utils/downloadFile.js`
- Export `downloadTextFile(filename, text)`:
  - Creates a Blob + object URL
  - Clicks a hidden `<a>` tag programmatically
  - Revokes the object URL
- Unit test: mock `document.createElement`; assert `href` and `download` are set

**Step 4.3 — Wire Export button to `App.jsx`**
- Add an "⬇ Export CSV" button (enabled when activeRace exists)
- On click:
  1. Call `exportCsv({ activePlannedWorkouts, workoutLogs })`
  2. Call `downloadTextFile('planned_workouts.csv', result.plannedWorkoutsCsv)`
  3. Call `downloadTextFile('workout_logs.csv', result.workoutLogsCsv)`
  4. Show loading/error feedback (use existing error pattern)

---

### Chunk 5 — CSV Import

**Step 5.1 — Add `importCsv` to `src/api/csvApi.js`**
- Export `importCsv({ plannedWorkoutsCsv, workoutLogsCsv })`:
  - POSTs to `/csv/import`
  - Maps returned `items` arrays with `backendWorkoutToFrontend` / `backendLogToFrontend`
  - Returns `{ plannedWorkouts: [], workoutLogs: [], errors: [] }`
- Unit tests:
  - Mock `apiFetch`; assert request payload shape
  - Assert items are mapped to frontend shape
  - Assert errors pass through as-is

**Step 5.2 — `src/components/CsvImportPanel.jsx`**
- Render two `<input type="file">` fields (one for planned, one for logs)
- On file selection, read text via `FileReader`
- On submit, call `importCsv(...)`
- On success: bulk-upsert `items` into Dexie, call `reload()`
- On partial error: show an `<ImportErrorTable>` listing row numbers + messages
- Unit tests:
  - Renders two file inputs
  - Calls `importCsv` with correct strings when submitted
  - Renders error table when errors are returned

**Step 5.3 — Mount `CsvImportPanel` in `App.jsx`**
- Add a collapsible "Import / Export" section in the Dev tools area
- Place `CsvImportPanel` and "Export CSV" button together

---

### Chunk 6 — State Persistence (Save / Load)

**Step 6.1 — `src/api/stateApi.js`**
- Export `saveState(snapshot)` → `POST /state/save` with `{ snapshot: { data: snapshot } }`
- Export `loadState()` → `GET /state/load` → returns `snapshot.data` or `null`
- Unit tests:
  - Mock `apiFetch`; assert `saveState` sends correct payload
  - Assert `loadState` returns null when `snapshot` is null in response
  - Assert `loadState` returns data when snapshot is present

**Step 6.2 — `src/db/snapshotHelpers.js`**
- Export `buildSnapshot(races, plannedWorkouts, workoutLogs)` → plain JS object
- Export `applySnapshot(snapshot)` → bulk-clears and re-populates Dexie tables
- Unit tests (pure):
  - `buildSnapshot` includes all three collections
  - `applySnapshot` calls `db.races.clear()` then `db.races.bulkPut()` (mock Dexie)

**Step 6.3 — Load on startup**
- In `useAppData.js` (or a new `useBootstrap.js` hook):
  - On mount, call `loadState()`
  - If snapshot is non-null and Dexie is empty, call `applySnapshot(snapshot)`
  - Then trigger the normal Dexie `reload()`
- Unit test: if snapshot returned, `applySnapshot` is called; if null, it is not

**Step 6.4 — Auto-save after mutations**
- Create `src/api/useAutoSave.js` hook:
  - Accepts `{ races, plannedWorkouts, workoutLogs }`
  - Debounces 1500ms after any change
  - Calls `saveState(buildSnapshot(...))`
  - On error: logs to console (no user-visible failure for auto-save)
- Unit tests:
  - Does NOT fire before debounce delay
  - Fires once after debounce with correct payload
  - Does not fire if data has not changed

---

### Chunk 7 — Route Snapping (OSRM)

**Step 7.1 — `src/api/routesApi.js`**
- Export `snapRoute(waypoints: Array<{ lat, lng }>)`:
  - Validates `waypoints.length >= 2` (throws if not)
  - POSTs to `/routes/snap`
  - Returns `{ distanceKm, geometry, start, end }`
- Unit tests:
  - Throws on fewer than 2 waypoints
  - Mock `apiFetch`; assert payload shape
  - Assert response mapped correctly (camelCase keys)

**Step 7.2 — `src/components/RouteSnapPanel.jsx`**
- Renders a textarea for pasting JSON waypoints (array of `{lat, lng}`)
- On submit, calls `snapRoute`
- On success: displays `distanceKm` and raw GeoJSON (pre tag)
- On 503: shows "OSRM unavailable" message
- On other error: shows error message
- Unit tests:
  - Renders textarea and submit button
  - Shows distance result on success
  - Shows OSRM-unavailable message on 503

**Step 7.3 — Mount `RouteSnapPanel` in `PlannedWorkoutModal`**
- Add a collapsible "Snap route" section inside the planned workout detail modal
- On snap success, store `routeId` (or geometry) on the workout record in Dexie

---

## Final Step Sizing Review

| Step | Scope | Test type | Safe to ship alone? |
|---|---|---|---|
| 1.1 config | 5 lines | unit | ✅ |
| 1.2 http | 30 lines | unit (mock fetch) | ✅ |
| 1.3 mappers | 60 lines | unit (pure) | ✅ |
| 2.1 healthApi | 10 lines | unit (mock) | ✅ |
| 2.2 health badge | UI only | manual | ✅ |
| 3.1 recalcApi | 20 lines | unit (mock) | ✅ |
| 3.2 undoStore | 15 lines | unit (pure) | ✅ |
| 3.3 recalc button + toast | UI + Dexie write | unit + manual | ✅ |
| 3.4 undo | Dexie write | unit + manual | ✅ |
| 4.1 csvApi export | 20 lines | unit (mock) | ✅ |
| 4.2 downloadFile | 15 lines | unit (mock DOM) | ✅ |
| 4.3 export button | UI only | manual | ✅ |
| 5.1 csvApi import | 20 lines | unit (mock) | ✅ |
| 5.2 CsvImportPanel | UI + Dexie write | unit + manual | ✅ |
| 5.3 mount panel | 5 lines | manual | ✅ |
| 6.1 stateApi | 20 lines | unit (mock) | ✅ |
| 6.2 snapshotHelpers | 20 lines | unit (pure) | ✅ |
| 6.3 load on startup | hook | unit (mock) | ✅ |
| 6.4 auto-save hook | hook + debounce | unit (fake timers) | ✅ |
| 7.1 routesApi | 20 lines | unit (mock) | ✅ |
| 7.2 RouteSnapPanel | UI only | unit + manual | ✅ |
| 7.3 mount in modal | 5 lines | manual | ✅ |

---

## File Map (new files to create)

```
frontend/src/
  api/
    config.js          ← Step 1.1
    http.js            ← Step 1.2
    mappers.js         ← Step 1.3
    healthApi.js       ← Step 2.1
    recalcApi.js       ← Step 3.1
    csvApi.js          ← Steps 4.1, 5.1
    stateApi.js        ← Step 6.1
    routesApi.js       ← Step 7.1
  state/
    undoStore.js       ← Step 3.2
  utils/
    downloadFile.js    ← Step 4.2
  db/
    snapshotHelpers.js ← Step 6.2
  hooks/
    useAutoSave.js     ← Step 6.4
  components/
    Toast.jsx          ← Step 3.3
    CsvImportPanel.jsx ← Step 5.2
    RouteSnapPanel.jsx ← Step 7.2
```

---

## Notes

- The `src/api/` directory does **not yet exist** in `frontend/src/`. All files in the
  File Map above are **new files**.
- All mapper functions live in one file (`mappers.js`) so enum translation is never
  duplicated.
- The backend's `WorkoutType` enum uses spaces (`"easy run"`, `"long run"`,
  `"rest day"`, `"cross-training"`), while the frontend uses short slugs (`"easy"`,
  `"long_run"`, `"rest"`, `"cross_train"`). This is the most error-prone difference
  — the mapper unit tests cover every value explicitly.
- CORS must be enabled on the backend (add `fastapi.middleware.cors`) before any
  browser-side fetch will work. Do this before Step 2.2.
- The auto-save in Chunk 6 is intentionally "fire and forget" — it never blocks the UI
  and does not show errors to the user (only logs to console). This keeps the UX
  snappy while still persisting state.
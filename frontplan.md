# Frontend Plan (Blueprint + Iterative Steps) — Vite + React + Dexie (Local-only v1)

Primary frontend spec: `frontend/frontspec.md`  
Additional context: `spec.md` (full product spec), `plan.md` (backend blueprint)  
Target: a browser-only SPA with IndexedDB persistence; backend used for CSV import/export, recalculation, and (later) routing snap-to-roads.

---

## 0) Inputs distilled (what the frontend must support)

### From `frontend/frontspec.md` (must-haves)
- Vite + React (JS) + Dexie persistence.
- Races: statuses `active|archived|completed`, **exactly one active**.
- Calendar planning: **multiple planned workouts per day**, drag/drop across any date (including past).
- When dropping onto a day with existing planned workouts: show confirm, cancel aborts move.
- Planned workout modal: details + attached workout logs **sorted chronologically** + **Add another log**.
- Unplanned logs via explicit “+ Log workout” and later attachable to planned workout.
- Recalculate: send **active race planned workouts including locked**, apply immediately, toast + Undo until next action.
- CSV: backend-driven `/csv/export` and `/csv/import`, export **two separate files**, import independently, partial success with error table.

### From `spec.md` (additional must-haves / clarifications)
- Calendar must support **week view and month view** with a **toggle**.
- Planned workout fields include: type, target distance, target duration, target pace range, workout structure.
- Manual edits are “user-locked” (frontend: set `locked=true` when user edits; backend also respects locked).
- Recalc affects **future-only** (backend rule) and drag/drop does not auto-recalc (frontend rule).
- Logging on a planned day should link logs to planned workout (“Option a”), and allow multiple logs per day.
- Routes & mapping (OSM + snap-to-roads + saved routes + attach to workout) exists in full spec, but:
  - `frontend/frontspec.md` explicitly says ignore race_id↔route_id coupling.
  - CSV does **not** include routes.

### From `plan.md` (backend surface and constraints)
- Backend endpoints relevant to frontend:
  - `POST /plan/recalculate` (backend blueprint)
  - `POST /csv/export` and `POST /csv/import` (already defined in your backend snippet)
  - `POST /routes/snap` (future: OSRM/Valhalla) for snap-to-roads route builder
  - `GET /health` (optional for frontend diagnostics)
- Backend planning rules include: future-only + do not override locked + frozen old races.
  - Frontend should:
    - send `today` if backend expects it (plan.md mentions it; frontspec doesn’t). We’ll design API wrapper to be adaptable.
    - prevent user from recalculating archived/completed race by only exposing recalc for active race.

---

## 1) Detailed blueprint (what to build, in what order)

### 1.1 App architecture (frontend)
**Key principle:** Dexie is persistence, React state is UI cache. Write-through on every mutation.

Recommended folders:
- `src/db/` Dexie schema + query helpers
- `src/domain/` pure utilities (dates, sorts, type checks, volume computations)
- `src/api/` backend client wrappers (CSV, recalc, routing later)
- `src/components/` UI (Calendar, modals, lists)
- `src/state/` Undo controller and “action boundary” helpers

Data strategy:
- On load, query Dexie tables and set React state:
  - `races[]`, `plannedWorkouts[]`, `workoutLogs[]`, (later) `routes[]`
- For display:
  - active race determines calendar range + planned workouts displayed
  - logs displayed either:
    - attached under planned workout modal
    - unplanned list (plannedWorkoutId=null)

### 1.2 Data models (frontend)
Use the superset fields to satisfy `spec.md` while staying compatible with backend CSV models:
- **Race**
  - `id, name, startDate, endDate, status, createdAt, updatedAt`
- **PlannedWorkout**
  - `id, raceId, date, type, locked`
  - targets: `distance`, `durationMinutes`, `paceLow`, `paceHigh`, `structureText`
  - plus `title, notes` if desired (optional)
- **WorkoutLog**
  - `id, plannedWorkoutId|null, date, time|null, type, distance, durationMinutes, notes`
- (Later) **Route** (from spec.md / plan.md)
  - `id, name, distance, geometry, start, end, createdAt, updatedAt`

Important mapping choices:
- Workout types: align labels between frontend and backend:
  - spec.md uses “easy run / long run / tempo / intervals / recover / rest day / cross-training”
  - frontspec uses `easy|tempo|interval|long_run|cross_train|rest`
  - Plan: define a single canonical enum in frontend and provide mapping at the API boundary if backend differs.

### 1.3 Views & components (frontend)
**Global top bar**
- Active race selector (enforced single active)
- New Race
- Toggle: Week / Month view
- Recalculate plan (active race only)
- CSV Export/Import
- + Log workout

**Calendar**
- supports:
  - **Week view**: 7 columns, 1 row
  - **Month view**: 7 columns, 5–6 rows
- Displays planned workouts for active race
- Drag/drop planned workouts
- Confirm drop if day already contains workouts

**Planned workout modal**
- Edit planned workout fields:
  - type
  - date
  - target distance/duration/pace range/structure
- Any manual edit sets `locked=true` (or expose lock toggle; spec.md implies edits cause lock)
- Logs section:
  - list attached logs chronologically
  - “Add another log” (attached)
- (Later) route attachment section (from spec.md)

**+ Log workout modal**
- Creates unplanned log (plannedWorkoutId=null)
- Should support attaching later
- If user chooses a date that has planned workouts, you may offer convenience to attach now (optional); minimum requirement: separate attach flow exists.

**Unplanned logs panel**
- List logs with plannedWorkoutId=null
- Attach action opens “Attach to planned workout” modal filtered to active race planned workouts

**CSV Import modal**
- Choose planned CSV and/or logs CSV independently
- Import planned only or logs only
- Show errors table

**Toast**
- Supports Undo action for recalculate

### 1.4 Backend integrations (frontend)
#### `/csv/export`
- POST with `{ planned_workouts: [...], workout_logs: [...] }`
- Download as two separate CSV files:
  - planned_workouts.csv
  - workout_logs.csv

#### `/csv/import`
- POST with `{ planned_workouts_csv: string, workout_logs_csv: string }`
- Apply:
  - upsert items into Dexie (do not wipe all local data unless explicitly chosen)
  - display returned row errors
- Partial success: always import valid rows even if errors exist.

#### `/plan/recalculate` (from plan.md)
- POST with active race context + current planned workouts
- Frontend must:
  - send only active race planned workouts
  - include locked workouts (backend returns them unchanged)
  - apply backend response by overwriting active race planned workouts

> Note: plan.md’s example payload includes `today`, `active_race`, optional `workout_logs`. frontspec.md does not.  
> Plan: implement a flexible API wrapper that can be configured to send either:
> - `{ planned_workouts: [...] }` or
> - `{ current_planned_workouts: [...], today: YYYY-MM-DD, active_race: {...} }`
> based on a single switch in `src/api/recalc.js`.

#### `/routes/snap` (future)
- Map UI uses Leaflet + OSM tiles
- Route builder collects waypoints and calls backend snap endpoint
- Store routes in Dexie and allow attach to planned workouts
- CSV export/import: do not include routes (spec.md)

### 1.5 Undo semantics (recalculate only)
- Snapshot of active race planned workouts before recalc.
- After recalc apply:
  - show toast “Plan recalculated” with Undo
- **Undo window ends on next action**:
  - any mutation (edit, drag/drop, add log, import, etc.) clears undo snapshot.
- Undo restores only the planned workouts for active race (as they were before recalc).

### 1.6 Testing strategy (frontend)
Because this is a new scaffold, testing needs to be incremental and not overkill.

**Add a test runner early**
- Add **Vitest** and **@testing-library/react** (recommended).
- Split testing into:
  1) Unit tests for pure utilities and controllers
  2) Small component tests for crucial UX behavior

Core unit tests:
- log chronological sort
- week/month calendar date generation
- “single active race enforcement” helper logic
- undo controller (consume snapshot once; cleared on action)
- “apply recalc overwrite strategy”: returned set replaces active race set deterministically

Component tests (thin):
- planned workout modal renders logs sorted
- undo toast calls undo handler
- calendar drop confirm calls update only on confirm

Manual test checklist should exist for steps that touch drag/drop and browser file APIs.

---

## 2) First breakdown: milestones (big iterative chunks)

### Milestone A — Project foundation
- Vite + React scaffold
- Styling baseline
- Dexie DB and read/write pipeline
- Domain types & utilities
- Add Vitest test harness (recommended)

### Milestone B — Races (single active rule)
- Race list/selector and active race state
- Create race modal
- Prompt to archive/complete previous active race (Cancel aborts)
- Persist race data

### Milestone C — Calendar (week + month views)
- Week view calendar
- Month view calendar
- Toggle between views
- Display planned workouts (multiple per day)
- Select planned workout

### Milestone D — Planned workout edit + drag/drop reschedule
- Planned workout modal editing (locks on edit)
- Drag/drop move workout date
- Confirm drop on occupied day
- Delete planned workout (logs become unplanned)

### Milestone E — Logs (planned + unplanned + attach)
- Add logs to planned workouts
- Chronological display
- + Log workout (unplanned)
- Unplanned logs panel
- Attach unplanned log to planned workout

### Milestone F — CSV import/export (backend)
- Export planned/logs → download 2 files
- Import planned/logs independently
- Partial success imports and error table

### Milestone G — Recalculate plan + Undo
- Call backend `/plan/recalculate`
- Apply overwrite to active race planned workouts
- Toast + Undo until next action

### Milestone H (future, from spec.md) — Routes & map
- Leaflet map route builder
- Call `/routes/snap` and persist saved routes
- Attach route to planned workouts (UI + persistence)
- Not part of `frontend/frontspec.md` deliverables, but in full product spec.

---

## 3) Second breakdown: milestones → smaller chunks

### A — Foundation (smaller)
A1. Scaffold Vite+React app + render basic layout  
A2. Add Dexie schema and load state on app start  
A3. Add data mutation helpers (upsert/delete) that update Dexie + React state  
A4. Add domain utilities + tests harness

### B — Races (smaller)
B1. RaceBar component shows active race + new race button  
B2. RaceModal creates first active race  
B3. Enforce single active race on create with prompt (archive/complete/cancel)  
B4. Make archived/completed races viewable (optional list panel)

### C — Calendar (smaller)
C1. Week view grid based on active race range  
C2. Month view grid based on active race range  
C3. Toggle persists in state (optionally Dexie settings table)  
C4. Render planned workout cards in cells (multiple per day)  
C5. Click card opens planned workout modal

### D — Planned workouts (smaller)
D1. Planned workout modal fields include pace range + structure text  
D2. Any edit sets `locked=true` (or explicit lock toggle)  
D3. Drag/drop moves workout date  
D4. Confirm dialog when dropping on occupied day  
D5. Delete planned workout; re-home logs as unplanned

### E — Logs (smaller)
E1. Log sorting comparator + unit tests  
E2. Show attached logs in planned workout modal  
E3. Add another log attached to planned workout  
E4. + Log workout creates unplanned  
E5. Attach flow for unplanned logs

### F — CSV (smaller)
F1. API client wrapper + backend base URL env  
F2. Export: call `/csv/export` and download 2 files  
F3. Import planned-only and logs-only via `/csv/import`  
F4. Upsert imported items, show errors table

### G — Recalc + Undo (smaller)
G1. API wrapper supports backend payload variations (config)  
G2. Snapshot active race planned workouts before apply  
G3. Apply overwrite strategy, update Dexie  
G4. Toast + Undo; clear snapshot on next action

---

## 4) Third breakdown: “right-sized steps” (final iteration)

Each step is meant to be:
- small enough to implement safely with tests + manual checklist
- large enough to clearly advance functionality
- low-risk ordering: persistence + correctness first, then UX polish, then backend integration

### Step 0 — Setup & docs
0.1 Create Vite + React app under `frontend/` (or repo root if agreed)  
0.2 Ensure `frontend/frontspec.md` is present and complete  
0.3 Create `frontend/frontplan.md` (this doc)  
**Tests:** none  
**Manual:** `npm i && npm run dev` loads page

---

### Step 1 — Dexie bootstrap + data load plumbing
1.1 Add Dexie and define schema: races, plannedWorkouts, workoutLogs (routes later)  
1.2 Implement app start load: `db.table.toArray()` → React state  
1.3 Add minimal debug display: counts of races/planned/logs to verify persistence  
**Tests:** unit test for “db schema exports” is optional (Dexie is hard to unit test)  
**Manual:** create a sample entry via temporary button; refresh and ensure it persists

---

### Step 2 — Domain layer + test harness (Vitest)
2.1 Add Vitest + basic test command  
2.2 Implement and test:
- workout type enum mapping (spec.md labels ↔ internal)
- `isQualityType` (tempo/interval/long_run)
- log sort comparator (date/time/null/createdAt)
- calendar date helpers (week/month grids)
**Exit:** `npm test` passes; helpers used in app without errors

---

### Step 3 — RaceBar display + active race selection
3.1 Render RaceBar with active race info and selector  
3.2 On load, auto-pick active race if exactly one active exists  
3.3 Disable recalc/calendar actions when no active race  
**Tests:** unit test for helper “getActiveRaceId(races)” (pure)  
**Manual:** seed multiple races and ensure only active is selectable

---

### Step 4 — Create race modal (basic)
4.1 Create RaceModal form (name/start/end)  
4.2 Create new race as `active`, persist to Dexie, set activeRaceId  
4.3 Seed one planned workout on start date (optional convenience)  
**Tests:** unit test for “new race object has required fields”  
**Manual:** create race, refresh, ensure still active

---

### Step 5 — Single-active enforcement prompt (archive/complete/cancel)
5.1 If an active race exists, prompt user on new race create:
- archive / complete / cancel
5.2 Cancel aborts creation
5.3 Archive/complete updates old race, then new race created active  
**Tests:** pure tests for reducer-like function:
- `applyNewRaceDecision(existingActive, decision)`  
**Manual:** ensure never ends with 2 active races

---

### Step 6 — Calendar view: Week grid MVP
6.1 Render week view grid for active race range (show at least the current week within range)  
6.2 Render DayCells with date labels  
6.3 Add placeholder “no workouts” state  
**Tests:** unit test for “week grid includes 7 days starting Monday”  
**Manual:** check dates align with weekdays

---

### Step 7 — Calendar view: Month grid MVP + toggle
7.1 Implement month grid generation and rendering  
7.2 Add toggle Week/Month in top bar, store in React state  
7.3 Ensure both views show the same planned workouts (just arranged differently)  
**Tests:** unit test month grid generates 5–6 weeks with leading/trailing padding  
**Manual:** switch toggle; no data loss

---

### Step 8 — Planned workouts rendering + selection
8.1 Group planned workouts by date for active race  
8.2 Render multiple PlannedWorkoutCards per day  
8.3 Click a card �� opens PlannedWorkoutModal (read-only first)  
**Tests:** unit test grouping function (pure)  
**Manual:** add multiple planned workouts same day and verify both appear

---

### Step 9 — Planned workout modal editing + locking semantics
9.1 Add fields required by spec.md:
- type
- target distance
- target duration
- target pace low/high
- structure text
9.2 Saving updates Dexie and React state
9.3 Lock behavior:
- either: any edit sets `locked=true` automatically
- or: a “Locked” checkbox + also auto-lock on edit (recommended)
**Tests:** unit test for `applyPlannedWorkoutEdit(old, patch)` sets locked correctly  
**Manual:** edit a field, refresh, verify locked stays true

---

### Step 10 — Drag/drop rescheduling + occupied-day confirm
10.1 Implement HTML5 drag payload for planned workout id  
10.2 DayCell accepts drop and updates workout date  
10.3 If target day already has planned workouts: confirm prompt; cancel aborts move  
**Tests:** component test (optional) for “drop handler respects confirm result” using mock confirm  
**Manual:** drag onto occupied day; cancel keeps original date

---

### Step 11 — Logs in planned workout modal (chronological)
11.1 Query logs attached to selected planned workout  
11.2 Display sorted logs (date/time/null last/createdAt)  
11.3 Ensure multiple logs per day supported  
**Tests:** unit tests for log sort comparator  
**Manual:** create 3 logs with different times; verify ordering

---

### Step 12 — Add logs (attached + unplanned)
12.1 “Add another log” from planned workout modal opens Log modal prefilled and attached  
12.2 Global “+ Log workout” opens Log modal unplanned  
12.3 Save writes to Dexie and updates UI  
**Tests:** unit test for log creation normalization (time empty → null, number parsing)  
**Manual:** add attached log and unplanned log; refresh; both persist

---

### Step 13 — Attach unplanned logs to planned workouts
13.1 Create unplanned logs panel (plannedWorkoutId=null)  
13.2 Attach modal lists planned workouts for active race with basic filtering  
13.3 Attaching updates log’s plannedWorkoutId  
**Tests:** unit test for `attachLog(log, plannedWorkoutId)` (pure)  
**Manual:** attach and verify it moves from unplanned list to planned modal list

---

### Step 14 — CSV export via backend
14.1 Implement API client base URL env `VITE_BACKEND_URL`  
14.2 Export button calls `/csv/export` with all planned/logs  
14.3 Download two files with correct names  
**Tests:** unit test download helper (mock Blob/URL) optional; focus on API wrapper test with mocked fetch  
**Manual:** verify browser downloads two CSV files

---

### Step 15 — CSV import via backend (partial success + errors)
15.1 Import modal: planned file and logs file independent  
15.2 Planned-only import calls `/csv/import` with planned CSV string and empty logs  
15.3 Logs-only import calls `/csv/import` with logs CSV string and empty planned  
15.4 Upsert imported items; show error table from response  
**Tests:** API wrapper tests for request shapes; unit test “merge imported items into state”  
**Manual:** import with intentionally broken row; confirm valid rows imported and errors displayed

---

### Step 16 — Recalculate plan apply (backend integration)
16.1 Implement `/plan/recalculate` wrapper that can be configured to match backend schema:
- minimal: `{ planned_workouts: [...] }`
- extended: `{ current_planned_workouts: [...], today, active_race }`
16.2 Recalc button sends **only active race planned workouts including locked**  
16.3 Apply overwrite strategy:
- delete active race planned workouts not present in backend response
- upsert backend returned workouts
**Tests:** unit test overwrite strategy function:
- input currentActive, backendReturned → expectedActiveAfter  
**Manual:** verify recalc changes active race only

---

### Step 17 — Undo until next action (recalc-only)
17.1 Before applying recalc, snapshot active race planned workouts  
17.2 After apply, show toast with Undo  
17.3 Undo restores snapshot; can be used once  
17.4 Any subsequent mutation clears snapshot (“until the next action”)  
**Tests:** unit test undo controller:
- set snapshot → consume snapshot once
- clear on “action”  
**Manual:** recalc → undo works → then drag something → undo no longer available

---

## 5) Review / sanity check (coverage vs specs)

### Frontend coverage vs `frontend/frontspec.md`
- Races + prompt + cancel: covered (Steps 3–5)
- Calendar multi per day + drag/drop confirm: covered (Steps 6–10)
- Planned workout modal + logs chronological + add another log: covered (Steps 8–12)
- Unplanned logs + attach: covered (Steps 12–13)
- CSV export/import backend: covered (Steps 14–15)
- Recalc apply + undo: covered (Steps 16–17)

### Additional coverage vs `spec.md`
- Week/month view toggle: covered (Steps 6–7)
- Planned workout fields: pace range + structure added (Step 9)
- Manual edit locking semantics: covered (Step 9)
- Drag/drop does not auto-recalc: ensured by separation of concerns
- Routes & mapping: called out as Milestone H (future)

### Alignment vs `plan.md`
- Uses `/plan/recalculate`, `/csv/export`, `/csv/import`
- Allows backend to own “future-only” and “respect locks”
- Frontend ensures only active race is recalculated and old races are effectively frozen

---

## 6) Notes on sequencing and risk
- Highest-risk correctness is persistence + race single-active enforcement + recalc overwrite + undo semantics.
- These are placed early enough to validate architecture, but not so early that the UI is missing essentials.
- Routes/map is intentionally deferred because it requires significant UI + a running routing engine.

---

## 7) Optional “definition of done” for v1 frontend
- All acceptance criteria in `frontend/frontspec.md` met.
- Week/month toggle present.
- Basic Vitest suite exists with coverage for all core pure logic.
- Manual QA checklist documented in README (optional but helpful).

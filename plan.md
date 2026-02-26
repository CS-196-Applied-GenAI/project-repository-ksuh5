# Backend Blueprint (Python) — Local-Only Running Planner Web App (v1)

**Goal:** Build a simple Python “local backend” that runs on `localhost` and provides:
- training plan recalculation logic (future-only + respect user locks)
- route building support for snap-to-roads (via a local routing engine)
- CSV import/export for planned workouts + workout logs
- lightweight persistence (optional) for backups, but **no accounts** and **single local profile**

This keeps the web app local-only while still using Python for “backend” responsibilities.

---

## 0) Key constraints from spec (must-haves)

### Local-only & single profile
- No auth, no multi-user, no remote DB.
- Treat all data as belonging to a single implicit athlete profile.

### Planned workout rules
- Users can manually edit a planned workout; those workouts become **locked** and **must not be overridden** by recalculation.
- Drag/drop rescheduling **does not** auto-recalculate.
- Recalculate is **explicit** and affects **future workouts only** (not today/past).

### Logging rules
- Logging on a planned day links the log to that planned workout and marks it completed.
- Multiple logs per day allowed.
- If log differs from plan => **modified**, not “missed”.

### Routes
- Use OSM map in frontend; backend supports:
  - snap-to-roads routing (not straight lines)
  - saving/reusing routes
  - attach route to a workout
- CSV import/export does NOT include saved routes.

### Goal races
- Exactly one **Active** race at a time.
- When a new race becomes active:
  - prompt to mark previous as Archived or Completed
  - previous plan becomes frozen (no recalculation ever again)
  - new active race gets a new plan that can be recalculated (future-only)

---

## 1) Architecture (simple, local, Python)

### 1.1 Components
1. **Python API service (FastAPI)**
   - Exposes HTTP JSON endpoints
   - Runs locally (no cloud)
2. **Local routing engine**
   - For snap-to-roads: run **OSRM** locally (Docker) or Valhalla.
   - Python service calls it to compute a route geometry and distance.
3. **Storage**
   - Primary storage can remain in the browser (IndexedDB) to satisfy “local-only”.
   - Python service can additionally store a “backup mirror” on disk using SQLite for:
     - plan recalculation inputs/outputs
     - CSV imports
     - easier debugging and tests
   - Keep the system usable even if you skip mirroring at first.

### 1.2 Recommended stack
- **FastAPI** (easy, typed, good docs)
- **Pydantic** models for validation
- **SQLite** via `sqlmodel` or `sqlite3` (simple)
- **pytest** for tests
- **httpx** for integration tests of API endpoints
- **Docker** for OSRM (optional but recommended for snap-to-roads)

### 1.3 Data ownership rule
- Backend is “stateless by default”: endpoints accept and return JSON.
- Optional: backend can store “latest state” in SQLite to support export/import and backups.
- This lets you start simple and later add persistence without redesigning everything.

---

## 2) Data model (v1) — conceptual entities

### 2.1 Enums
WorkoutType:
- easy run, long run, tempo, intervals, recover, rest day, cross-training

RaceStatus:
- Active, Completed, Archived

PlannedWorkoutStatus (derived):
- planned, completed, modified

### 2.2 PlannedWorkout
Fields:
- id (uuid)
- date (YYYY-MM-DD)
- type (enum)
- target_distance_km (float | null)
- target_duration_min (int | null)
- target_pace_min_per_km_low (float | null)
- target_pace_min_per_km_high (float | null)
- structure_text (string | null)
- locked (bool)  ← true if user manually edited
- race_id (uuid)  ← belongs to a specific race plan
- route_id (uuid | null)  ← optional attachment
- created_at, updated_at

### 2.3 WorkoutLog
Fields:
- id (uuid)
- date (YYYY-MM-DD)
- type (enum)
- actual_distance_km (float | null)
- actual_duration_min (int | null)
- notes (string | null)
- linked_planned_workout_id (uuid | null)
- created_at

Rules:
- Multiple logs per day allowed.
- On creation, if a planned workout exists on that date for the active race:
  - link it (if user chooses default “a”) and mark plan completed/modified accordingly.

### 2.4 Route
Fields:
- id (uuid)
- name (string)
- distance_km (float)
- geometry (GeoJSON LineString or encoded polyline)
- start_lat, start_lng
- end_lat, end_lng
- created_at, updated_at

### 2.5 Race
Fields:
- id (uuid)
- name (string)
- date (YYYY-MM-DD)
- status (Active/Completed/Archived)
- created_at, updated_at

Rules:
- Exactly one Active at a time.
- When active changes:
  - previous active becomes Completed or Archived
  - its plan becomes frozen (no recalculation allowed)

---

## 3) API surface (v1)

Keep endpoints small and mostly “pure functions” initially.

### 3.1 Health & version
- GET `/health` → ok + version

### 3.2 Planning / recalculation
- POST `/plan/recalculate`
  - Input:
    - active_race (race object or id)
    - current_planned_workouts (list)
    - workout_logs (list) (optional; used to adapt future plan later, can be ignored v1)
    - today (date)
  - Output:
    - updated_planned_workouts (list)
  - Rules:
    - only update workouts with date > today
    - do not override `locked == true`
    - do nothing for races not Active (frozen)

### 3.3 Logging helpers
- POST `/logs/link`
  - Input: logs + planned workouts for date
  - Output: logs with linked IDs + planned workout status flags
  - (This can be frontend-only; backend helper is optional.)

### 3.4 Routes (snap-to-roads)
- POST `/routes/snap`
  - Input: list of waypoints (lat/lng) + profile (running)
  - Output: snapped geometry + distance + start/end
  - Implementation: call OSRM `/route/v1/...` and return simplified result.

### 3.5 CSV import/export
- POST `/csv/export`
  - Input: planned workouts + logs
  - Output: two CSV strings (or a zipped file later)
- POST `/csv/import`
  - Input: planned_workouts_csv, logs_csv
  - Output: validated objects + row-level errors

---

## 4) Implementation blueprint (step-by-step)

### Phase A — Foundation (API + models + tests)
1. Create Python project structure
   - `app/main.py` FastAPI app
   - `app/models.py` Pydantic models/enums
   - `tests/` pytest setup
2. Add `GET /health` endpoint
3. Add strict validation for WorkoutType enum

**Testing:**
- unit tests for model validation (invalid workout type rejects)
- integration test: `/health` returns 200 + version

---

### Phase B — Recalculation engine (pure, test-driven)
Goal: implement the trickiest spec constraints early.

1. Implement a pure function:
   - `recalculate_plan(today, planned_workouts, race_status)` → updated list
2. Rules in function:
   - if race_status != Active: return unchanged
   - only modify workouts where date > today
   - never modify workouts with `locked == true`
3. For v1, keep the “planning algorithm” intentionally simple:
   - Example:
     - preserve workout types already present for unlocked future days
     - if a future day has missing targets, fill with defaults based on type:
       - easy: pace range wide, distance modest
       - long: increase distance gradually
       - rest day: distance/duration null
   - The purpose is correctness around locking & future-only, not sophisticated coaching.

4. Expose endpoint `POST /plan/recalculate` that calls the pure function.

**Testing:**
- unit tests covering:
  - locked workouts unchanged
  - workouts on today unchanged
  - workouts in past unchanged
  - only future & unlocked change
  - non-active race returns unchanged

---

### Phase C — CSV export/import (validated, incremental)
1. Define deterministic CSV schemas:
   - `planned_workouts.csv` columns:
     - id,date,type,target_distance_km,target_duration_min,pace_low,pace_high,structure_text,locked,race_id,route_id
   - `workout_logs.csv` columns:
     - id,date,type,actual_distance_km,actual_duration_min,notes,linked_planned_workout_id
2. Implement export:
   - input objects → CSV string (with header)
3. Implement import:
   - parse CSV → objects
   - collect row-level errors (don’t crash entire import)
4. Expose endpoints `/csv/export` and `/csv/import`

**Testing:**
- roundtrip test: objects → CSV → objects equals (within normalization)
- invalid rows produce errors but still import valid rows

---

### Phase D — Snap-to-roads routing (OSRM) + route normalization
1. Provide a config flag:
   - `OSRM_BASE_URL` default `http://localhost:5000`
2. Implement `/routes/snap`:
   - validate waypoints list length >= 2
   - call OSRM route API
   - output:
     - distance_km
     - geometry (GeoJSON or polyline)
     - start/end lat/lng
3. Add “no OSRM” fallback (developer-friendly):
   - if OSRM unavailable, return 503 with clear error
   - (Optional later: straight-line fallback, but spec wants snap-to-roads)

**Testing:**
- unit tests for input validation
- integration tests can be marked optional/skipped unless OSRM is running

---

### Phase E — Optional local persistence (SQLite mirror) for backup/debug
Only do this if needed; keep it simple.

1. Add SQLite schema for races/plans/logs/routes
2. Add endpoints:
   - `/state/save` accepts full state snapshot
   - `/state/load` returns last snapshot
3. This is **not** multi-user; just one record (latest snapshot).

**Testing:**
- save then load returns same data

---

## 5) Iterative chunks → then broken down into smaller steps

Below are the phases above, broken into “chunks”, then into “small steps”.

### Chunk 1: API skeleton + models
Small steps:
1. Create repo folders: `app/`, `tests/`
2. Add FastAPI app in `app/main.py`
3. Add Pydantic enums/models in `app/models.py`
4. Add `/health`
5. Add pytest + one integration test for `/health`

### Chunk 2: Recalculation pure function + endpoint
Small steps:
1. Create `app/planning.py` with `recalculate_plan(...)` stub returning input unchanged
2. Write tests that currently fail (future-only, locked, active vs inactive)
3. Implement rules one by one until tests pass
4. Add `POST /plan/recalculate` endpoint that calls the function
5. Add endpoint integration tests

### Chunk 3: CSV export
Small steps:
1. Define CSV column order constants
2. Implement `export_planned_workouts_csv(planned_workouts)`
3. Implement `export_workout_logs_csv(logs)`
4. Add endpoint `/csv/export`
5. Test: export includes headers, stable order, correct escaping for commas/newlines

### Chunk 4: CSV import
Small steps:
1. Implement CSV parser that yields dict rows + row numbers
2. Implement row-to-model conversion with error capture
3. Add endpoint `/csv/import`
4. Test: mixed valid/invalid rows produce partial results + errors

### Chunk 5: OSRM route snapping
Small steps:
1. Add config + `httpx` client wrapper
2. Implement input validation (>=2 waypoints)
3. Implement OSRM call and response parsing
4. Add `/routes/snap`
5. Add optional integration test gated by env var

### Chunk 6: (Optional) SQLite snapshot persistence
Small steps:
1. Decide snapshot schema (single table with JSON blob is simplest)
2. Implement `/state/save` + `/state/load`
3. Test save/load roundtrip

---

## 6) “One more round” — right-sizing the steps for safe implementation

To keep each PR/iteration safe and testable, implement in this order:

### Iteration 1 (very small, safe)
1. FastAPI app + `/health`
2. Pydantic enums for WorkoutType
3. Tests for `/health` and enum validation

### Iteration 2
1. Add planning models (PlannedWorkout + Race minimal)
2. Add `recalculate_plan` stub + tests (red)
3. Implement future-only + locked rules (green)

### Iteration 3
1. Add `/plan/recalculate` endpoint
2. Add endpoint integration tests

### Iteration 4
1. Add CSV export helpers + tests
2. Add `/csv/export`

### Iteration 5
1. Add CSV import helpers + tests
2. Add `/csv/import`

### Iteration 6
1. Add OSRM client wrapper + validation tests
2. Add `/routes/snap` with clear 503 error if OSRM missing

### Iteration 7 (optional)
1. Add SQLite snapshot store
2. Add `/state/save` and `/state/load` + tests

Each iteration is:
- small enough to test thoroughly
- big enough to move the project forward
- aligned with the spec’s highest-risk constraints (locking + future-only recalculation) early

---

## 7) Testing strategy (minimal but strong)

### Unit tests (pure functions)
- planning recalculation rules
- CSV parsing/formatting
- OSRM response parsing (using fixture JSON)

### Integration tests (FastAPI TestClient)
- `/health`
- `/plan/recalculate` end-to-end request/response
- `/csv/export` and `/csv/import`

### Optional integration tests (external dependency)
- OSRM route snapping (skipped unless OSRM running)

---

## 8) Developer runbook (local)

### Run API
- `uvicorn app.main:app --reload --port 8000`

### Run tests
- `pytest -q`

### Run OSRM (example; optional)
- Use Docker + an OSRM image and a small regional `.osm.pbf` extract.
- Configure `OSRM_BASE_URL=http://localhost:5000`

---

## 9) Open questions (decide early, but can defer)
1. Does backend store canonical state (SQLite) or is it stateless helper?
   - start stateless; add snapshot store later if needed.
2. What route geometry format do we return? (GeoJSON vs polyline)
   - It should use GeoJSON LineString 
3. How exactly does “modified” get computed?
   - v1: if linked log type != planned type OR distance differs by threshold → modified.

(These can be implemented progressively without blocking early iterations.)

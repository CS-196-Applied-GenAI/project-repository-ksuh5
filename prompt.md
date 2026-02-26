# TDD Code-Generation Prompts (Python Backend) — Local-Only Running Planner v1

Use these prompts **in order** with your code-generation LLM. Each prompt is designed to:
- be **small and safe**
- be **test-driven** (tests first, then implementation)
- avoid orphaned code (everything wired into the running FastAPI app or test suite)
- keep complexity low while still making forward progress

Assumptions for the LLM:
- Repository already contains `plan.md`.
- You will create a Python backend under a top-level folder (e.g., `backend/`).
- Use FastAPI + pytest.
- Prefer simple, explicit code over clever abstractions.

---

## Prompt 01 — Create backend skeleton + tooling + first failing test

```text
You are implementing the backend described in plan.md.

Task: Create the initial Python backend project skeleton using FastAPI and pytest, with the smallest possible running surface area.

Requirements:
1) Create a new folder `backend/` with:
   - `backend/app/main.py` (FastAPI app instance)
   - `backend/app/__init__.py`
   - `backend/tests/test_health.py`
   - `backend/pyproject.toml` (use uv or poetry-style dependencies, but keep it minimal)
   - `backend/README.md` with exact run/test commands

2) Test-driven:
   - Write `backend/tests/test_health.py` FIRST with a failing test that calls GET `/health` and expects:
     - status_code == 200
     - JSON has keys: `status` == "ok" and `version` is a non-empty string

3) Implement the minimal `/health` endpoint in `backend/app/main.py` to make the test pass.

4) Use FastAPI TestClient for integration tests.
5) Keep code extremely small and readable.

Deliverables:
- All new files created
- Tests pass with `pytest`

Do NOT add any extra endpoints or models yet. Wire everything so running `pytest` from inside `backend/` works.
```

---

## Prompt 02 — Add WorkoutType enum model + validation tests

```text
Build on the existing backend/ code.

Goal: Introduce the WorkoutType enum in a strict, validated way, with tests first, without changing endpoint behavior (yet).

Steps (TDD):
1) Add `backend/app/models.py` containing:
   - a `WorkoutType` enum with exact string values:
     "easy run", "long run", "tempo", "intervals", "recover", "rest day", "cross-training"
   - Use Pydantic-friendly patterns (e.g., `enum.StrEnum` if available, or `str, Enum`).

2) Add a small Pydantic model in `models.py` ONLY for testing validation, e.g.:
   - `WorkoutTypeHolder` with one field `type: WorkoutType`

3) Write unit tests first in `backend/tests/test_models_workout_type.py`:
   - Valid strings parse successfully (parameterized).
   - An invalid string (e.g., "junk") fails validation.

4) Ensure imports are clean and nothing is unused.
5) Do not add new endpoints.

Acceptance:
- All tests pass.
- No orphaned code: models are imported by tests and are in `app/`.
```

---

## Prompt 03 — Add minimal planning models (Race + PlannedWorkout) + tests for parsing

```text
Build on the existing backend/ code.

Goal: Add minimal Pydantic models needed for planning and later endpoints, with tests first.

TDD steps:
1) In `backend/app/models.py`, add:
   - `RaceStatus` enum: "Active", "Completed", "Archived"
   - `Race` model with: id (uuid string), name (string), date (YYYY-MM-DD string), status (RaceStatus)
   - `PlannedWorkout` model with the fields from plan.md that are necessary for recalculation rules:
     - id (uuid string)
     - date (YYYY-MM-DD string)
     - type (WorkoutType)
     - locked (bool)
     - target_distance_km (float | None)
     - target_duration_min (int | None)
     - target_pace_min_per_km_low (float | None)
     - target_pace_min_per_km_high (float | None)
     - structure_text (str | None)
     - race_id (uuid string)
     - route_id (uuid string | None)

2) Tests first in `backend/tests/test_models_planned_workout.py`:
   - Valid PlannedWorkout parses from dict.
   - Invalid workout type fails.
   - locked must be boolean (reject a nonsense type).
   - date must be parseable as a date-like string OR use pydantic date type (choose one and test it).

Constraints:
- Keep models simple (Pydantic BaseModel).
- Prefer using `datetime.date` fields if that simplifies comparisons later; if you do, update tests accordingly.

Acceptance:
- All tests pass.
- No endpoints added yet.
```

---

## Prompt 04 — Planning engine stub (pure function) + failing rule tests

```text
Build on the existing backend/ code.

Goal: Create the pure planning recalculation function (initially stub), and write failing tests for the core spec constraints:
- only future workouts change (date > today)
- locked workouts never change
- if race is not Active, nothing changes

TDD steps:
1) Create `backend/app/planning.py` with function signature:
   `recalculate_plan(today: date, planned_workouts: list[PlannedWorkout], race_status: RaceStatus) -> list[PlannedWorkout]`

2) Initially implement it as a stub that returns the input unchanged.

3) Write tests FIRST in `backend/tests/test_planning_recalculate_rules.py` that will FAIL with the stub:
   - Setup planned workouts on: past, today, future.
   - Mark one future workout locked=True.
   - Call recalculate_plan with race_status Active.
   - Assert:
     - past workout unchanged
     - today's workout unchanged
     - locked future workout unchanged
     - at least one unlocked future workout is modified in some detectable way (e.g., target_distance_km gets defaulted from None to a value)
   - Another test: race_status Completed -> returned list equals original list (deep equality)

Notes:
- You may need a deterministic “defaulting” behavior to detect a change; for now require that if an unlocked future workout has all targets None, it gains a default target_distance_km.
- Keep the tests readable and deterministic.

Acceptance:
- Tests fail before implementation changes (red).
- After stub exists, proceed to next prompt to implement logic.
```

---

## Prompt 05 — Implement future-only + locked + active-only rules to satisfy tests

```text
Continue from the previous prompt where tests are failing.

Goal: Implement the minimum logic in `recalculate_plan` to pass the rule tests, without adding complexity.

Implementation requirements:
1) If race_status != RaceStatus.Active: return planned_workouts unchanged (but be careful about copying vs identity; make tests pass consistently).
2) For each PlannedWorkout:
   - If workout.date <= today: do not change.
   - If workout.locked is True: do not change.
   - Else if date > today and unlocked: apply deterministic defaults ONLY when targets are missing:
     - If type == "rest day": set target_distance_km and target_duration_min to None (leave as None).
     - Else: if target_distance_km is None, set to a small default (e.g., 5.0).
     - Keep other fields unchanged unless needed by tests.

3) Keep function pure:
   - Do not mutate input objects in-place unless you are sure tests expect that. Prefer returning new PlannedWorkout copies for modified ones.

4) Add any small helper functions if it improves clarity, but keep it minimal.

Acceptance:
- All existing tests pass.
- No endpoints added yet.
```

---

## Prompt 06 — Add POST /plan/recalculate endpoint + integration tests

```text
Build on the existing backend/ code.

Goal: Wire the planning function into the FastAPI app with a real endpoint and integration tests.

TDD steps:
1) Define request/response models in `backend/app/models.py`:
   - `PlanRecalculateRequest` with:
     - today (date)
     - race_status (RaceStatus) OR active_race.status (pick one, but keep it minimal)
     - current_planned_workouts: list[PlannedWorkout]
   - `PlanRecalculateResponse` with:
     - updated_planned_workouts: list[PlannedWorkout]

2) Write integration test FIRST in `backend/tests/test_plan_recalculate_endpoint.py`:
   - Call POST `/plan/recalculate` with:
     - today
     - race_status Active
     - planned workouts (include one unlocked future workout with target_distance_km None)
   - Expect 200 and response includes updated_planned_workouts with that workout defaulted.

3) Implement endpoint in `backend/app/main.py`:
   - import models + recalculate_plan
   - validate input using Pydantic
   - return response model

Constraints:
- Keep endpoint synchronous (normal def), unless you need async.
- Do not add persistence.
- Ensure `/health` still works and tests still pass.

Acceptance:
- All tests pass including integration tests.
- Endpoint is wired to the planning engine (no orphan logic).
```

---

## Prompt 07 — CSV export helpers (planned workouts + logs) + unit tests

```text
Build on the existing backend/ code.

Goal: Add deterministic CSV export functions with unit tests first. Keep it pure and simple.

TDD steps:
1) In `backend/app/models.py`, add `WorkoutLog` model (minimal fields from plan.md needed for CSV):
   - id (uuid string)
   - date (date)
   - type (WorkoutType)
   - actual_distance_km (float | None)
   - actual_duration_min (int | None)
   - notes (str | None)
   - linked_planned_workout_id (uuid string | None)

2) Create `backend/app/csv_io.py` with:
   - constants for column order:
     - PLANNED_WORKOUT_COLUMNS
     - WORKOUT_LOG_COLUMNS
   - `export_planned_workouts_csv(planned_workouts: list[PlannedWorkout]) -> str`
   - `export_workout_logs_csv(logs: list[WorkoutLog]) -> str`
   - Use Python's `csv` module with `StringIO`.

3) Write unit tests FIRST in `backend/tests/test_csv_export.py`:
   - Export includes header row with exact column order.
   - Export is stable/deterministic.
   - Fields with commas/newlines in structure_text/notes are properly quoted.

Implementation notes:
- Decide how to serialize None (empty string is fine); test it.
- Use ISO date strings.

Acceptance:
- All tests pass.
- No endpoints yet.
```

---

## Prompt 08 — Add POST /csv/export endpoint + integration test

```text
Build on the existing backend/ code.

Goal: Wire CSV export helpers into a FastAPI endpoint, with integration test first.

TDD steps:
1) Add request/response models in `backend/app/models.py`:
   - `CsvExportRequest` with:
     - planned_workouts: list[PlannedWorkout]
     - workout_logs: list[WorkoutLog]
   - `CsvExportResponse` with:
     - planned_workouts_csv: str
     - workout_logs_csv: str

2) Write integration test FIRST in `backend/tests/test_csv_export_endpoint.py`:
   - POST `/csv/export` with 1 planned workout + 1 log
   - Expect 200 and both CSV strings contain headers and at least one data row.

3) Implement POST `/csv/export` in `backend/app/main.py` calling the export helpers.

Constraints:
- Keep response as JSON containing CSV strings.
- Do not zip files yet.

Acceptance:
- All tests pass.
- Endpoint uses helper functions (wired, no orphan code).
```

---

## Prompt 09 — CSV import parser with row-level errors + unit tests

```text
Build on the existing backend/ code.

Goal: Add CSV import with partial success and row-level errors, with unit tests first.

Design:
- For each CSV, return:
  - `items`: parsed models
  - `errors`: list of {row_number, message}

TDD steps:
1) In `backend/app/models.py`, add error/result models:
   - `CsvRowError`: row_number (int), message (str)
   - `CsvImportResultPlannedWorkouts`: items (list[PlannedWorkout]), errors (list[CsvRowError])
   - `CsvImportResultWorkoutLogs`: items (list[WorkoutLog]), errors (list[CsvRowError])

2) In `backend/app/csv_io.py`, implement:
   - `import_planned_workouts_csv(csv_text: str) -> CsvImportResultPlannedWorkouts`
   - `import_workout_logs_csv(csv_text: str) -> CsvImportResultWorkoutLogs`
   - Use `csv.DictReader`.
   - Row numbers should align with human expectation (header is row 1, first data row is row 2).

3) Tests FIRST in `backend/tests/test_csv_import.py`:
   - A CSV with one valid row imports 1 item, 0 errors.
   - A CSV with one invalid row (bad workout type) yields 0 items, 1 error with correct row_number.
   - A mixed CSV yields partial items and errors.

Constraints:
- Do not crash on errors; accumulate them.
- Keep conversions minimal and explicit.

Acceptance:
- All tests pass.
- No endpoint yet.
```

---

## Prompt 10 — Add POST /csv/import endpoint + integration test

```text
Build on the existing backend/ code.

Goal: Wire CSV import functions into an endpoint with integration tests.

TDD steps:
1) Add request/response models in `backend/app/models.py`:
   - `CsvImportRequest`: planned_workouts_csv (str), workout_logs_csv (str)
   - `CsvImportResponse`: planned_workouts (CsvImportResultPlannedWorkouts), workout_logs (CsvImportResultWorkoutLogs)

2) Write integration test FIRST in `backend/tests/test_csv_import_endpoint.py`:
   - Provide simple planned_workouts_csv and workout_logs_csv (with headers + one row each)
   - Expect 200 and parsed items lengths match.

3) Implement POST `/csv/import` in `backend/app/main.py`.

Acceptance:
- All tests pass.
- Endpoint is wired to import helpers (no orphan code).
```

---

## Prompt 11 — OSRM client wrapper + validation tests (no external dependency required)

```text
Build on the existing backend/ code.

Goal: Add the route snap endpoint incrementally. Start with input validation + a client wrapper that can be mocked in tests, so tests do not require OSRM running.

TDD steps:
1) In `backend/app/models.py`, add:
   - `LatLng` model: lat (float), lng (float)
   - `RouteSnapRequest`: waypoints (list[LatLng])
   - `RouteSnapResponse`:
     - distance_km (float)
     - geometry (GeoJSON-like dict) OR a typed model; keep it simple as dict
     - start (LatLng)
     - end (LatLng)

2) Add `backend/app/osrm_client.py` with:
   - `class OsrmClient` initialized with base_url
   - method `route(waypoints: list[LatLng]) -> RouteSnapResponse` (or raw parsed dict)
   - For now, you can raise NotImplementedError in the method.

3) Write tests FIRST in `backend/tests/test_routes_snap_validation.py` for the endpoint validation behavior:
   - If waypoints length < 2, endpoint returns 422 (pydantic validation) OR 400 with explicit message (choose one and test it).
   - Ensure route_id etc not involved.

4) Add POST `/routes/snap` endpoint skeleton in `backend/app/main.py` that:
   - validates request
   - (for now) returns 503 "OSRM not configured" or similar, until client is implemented in next prompt

Acceptance:
- Tests pass for validation and error behavior without needing OSRM.
- Endpoint exists and is wired, even if it returns 503 for now.
```

---

## Prompt 12 — Implement OSRM call with httpx + mock-based tests + real wiring

```text
Continue from the previous prompt where /routes/snap exists but returns 503.

Goal: Implement actual OSRM integration in a way that is testable without OSRM by mocking HTTP calls.

TDD steps:
1) Implement OsrmClient.route using httpx:
   - Build OSRM route URL: /route/v1/driving/{lng,lat;lng,lat...}?geometries=geojson&overview=full
   - Parse response:
     - total distance meters -> distance_km
     - geometry -> GeoJSON LineString dict
     - start/end from first/last waypoint
   - Handle non-200 responses with a clear exception.

2) Update `/routes/snap` endpoint to:
   - create OsrmClient with env var `OSRM_BASE_URL` defaulting to http://localhost:5000
   - call client.route
   - return RouteSnapResponse
   - if OSRM request fails (connection error), return 503 with helpful message.

3) Write tests FIRST in `backend/tests/test_routes_snap_endpoint.py`:
   - Mock httpx to return a sample OSRM JSON response
   - Assert endpoint returns 200 and correct distance_km and geometry shape
   - Also test connection error -> 503

Constraints:
- Keep GeoJSON format simple:
  { "type": "LineString", "coordinates": [[lng,lat], ...] }
- Do not add persistence.

Acceptance:
- All tests pass.
- Endpoint is fully wired to client implementation.
```

---

## Prompt 13 (Optional) — SQLite snapshot save/load with roundtrip tests

```text
Only do this prompt if you want optional persistence per plan.md.

Goal: Add a minimal snapshot store that saves the entire state as JSON in SQLite. Keep it one-record (single profile) and simple.

TDD steps:
1) Create `backend/app/state_store.py`:
   - sqlite initialization (create table if not exists)
   - `save_snapshot(snapshot_json: str) -> None`
   - `load_snapshot() -> str | None`

2) Add models in `backend/app/models.py`:
   - `StateSnapshot` (a dict-like model or structured model containing races/workouts/logs/routes)
   - `StateSaveRequest`, `StateLoadResponse`

3) Tests FIRST in `backend/tests/test_state_store.py`:
   - save then load returns same JSON string

4) Add endpoints:
   - POST `/state/save`
   - GET `/state/load`

Constraints:
- Use a file `backend/.local/state.db` (ensure folder exists).
- Keep it single-profile: always overwrite the latest snapshot.

Acceptance:
- All tests pass.
- Endpoints wired to state_store.
```

---

## Prompt 14 — Final wiring pass + docs + “no orphan code” audit

```text
Goal: Perform a final wiring and cleanup pass so everything is cohesive and beginner-friendly.

Tasks:
1) Ensure `backend/app/main.py` includes all endpoints:
   - GET /health
   - POST /plan/recalculate
   - POST /csv/export
   - POST /csv/import
   - POST /routes/snap
   - (optional) /state/save and /state/load

2) Ensure all modules are imported and used (no dead code):
   - models.py used by endpoints + tests
   - planning.py used by /plan/recalculate
   - csv_io.py used by csv endpoints
   - osrm_client.py used by /routes/snap

3) Update `backend/README.md`:
   - how to run uvicorn
   - how to run tests
   - how to set OSRM_BASE_URL
   - explain that backend is local-only helper

4) Run through tests mentally and fix any flakiness or brittle assumptions.

Acceptance:
- All tests pass.
- No unused files.
- Clear run instructions.
```

---

# Code-Generation Prompts (TDD, Incremental) — Python Backend

These prompts are designed to be fed **one at a time** to a code-generation LLM.  
Each prompt assumes the codebase state produced by the previous prompt.  
Every prompt enforces **test-first**, small diffs, and *no orphaned code*: anything added must be imported/used, and tests must pass.

> Conventions to keep consistent across prompts:
> - Use `pytest`.
> - Prefer `dataclasses` for domain models.
> - Keep logic in `services/` and data models in `domain/`.
> - Add a thin `persistence/` layer with an in-memory store first.
> - Avoid external dependencies beyond stdlib + pytest unless required.
> - Prefer deterministic behavior; inject “today” date into services for tests.

---

## Prompt 1 — Project skeleton + pytest harness

```text
You are implementing the Python backend described by spec.md and plan.md.

Task (TDD):
1) Create a minimal Python package layout:
   - domain/
   - services/
   - persistence/
   - tests/
2) Add pytest configuration so `pytest` runs tests successfully.
3) Write a first trivial test (e.g., asserts True) to validate the harness.
4) Ensure imports work and nothing is unused or orphaned.

Constraints:
- Keep the change minimal.
- Provide exact file contents for any new/modified files.
- Make sure `pytest -q` passes.

Output:
- A concise summary of created files.
- The full file diffs/contents.
```

---

## Prompt 2 — Domain enums + basic validation utilities

```text
Continue from the existing repository state.

Goal: implement the domain enums needed by the app and a small validation helper.

TDD steps:
1) Write tests first:
   - WorkoutType enum contains: easy_run, long_run, tempo, intervals, recover, rest_day, cross_training
   - RaceStatus enum contains: active, archived, completed
   - Add a helper `parse_enum(enum_cls, value: str)` that maps case-insensitively and raises ValueError on invalid values.
2) Implement enums and helper in domain/ (choose file names that make sense).
3) Ensure tests pass and code is used (no dead code).

Constraints:
- Use only stdlib + pytest.
- Keep API stable and simple.

Output:
- Files changed with full contents.
- Ensure `pytest -q` passes.
```

---

## Prompt 3 — Minimal AppState + InMemoryStateStore

```text
Continue from current state.

Goal: create a minimal AppState container and an in-memory store that will back services.

TDD steps:
1) Add tests for:
   - AppState has a schema_version int defaulting to 1
   - InMemoryStateStore returns an AppState instance from get_state()
   - save_state() replaces stored state
2) Implement:
   - domain/app_state.py: AppState dataclass (minimal fields for now)
   - persistence/state_store.py: InMemoryStateStore with get_state/save_state
3) Wire imports cleanly.

Constraints:
- Keep AppState minimal but extensible (can add dicts later).
- Avoid premature complexity.

Output:
- Full file contents for touched files.
- Tests passing.
```

---

## Prompt 4 — JSON serialization round-trip for AppState (snapshot v1)

```text
Continue from current state.

Goal: add JSON-serializable snapshot support for AppState (even if it’s minimal initially).

TDD steps:
1) Write tests:
   - AppState.to_dict() returns primitives only (dict/list/str/int/bool/None)
   - AppState.from_dict(to_dict(state)) reconstructs equivalent state
2) Implement to_dict/from_dict on AppState.
3) Add a simple `persistence/json_snapshot.py` helper:
   - dumps_state(state) -> str (JSON)
   - loads_state(json_str) -> AppState
4) Ensure tests cover dumps/loads round-trip.

Constraints:
- Keep schema_version included.
- Don’t add entities yet unless needed.

Output:
- Full contents of modified/new files.
- All tests passing.
```

---

## Prompt 5 — PlannedWorkout model (required fields + validation)

```text
Continue from current state.

Goal: implement the PlannedWorkout domain model with fields required by spec.md, plus basic validation.

Fields required:
- id (uuid string)
- date (YYYY-MM-DD string for now)
- type (WorkoutType)
- target_distance_m (int|None)
- target_duration_s (int|None)
- target_pace_range (optional object; implement PaceRange)
- structure (str)
- route_id (str|None)
- is_user_locked (bool)
- completion_state (string enum-like: planned/completed/modified)

TDD steps:
1) Add tests for:
   - PlannedWorkout can be constructed with required fields
   - structure cannot be empty/blank (raise ValueError)
   - PaceRange validates min <= max
2) Implement:
   - domain/value_objects.py: PaceRange dataclass with validation
   - domain/planned_workout.py: PlannedWorkout dataclass with validation in __post_init__
3) Update AppState to include `planned_workouts: dict[str, PlannedWorkout]` default empty.
4) Update serialization to include planned_workouts (to_dict/from_dict) with type-safe conversions.

Constraints:
- Use uuid4 for ids (service will generate later).
- Keep serialization deterministic and tested.
- No orphaned code: tests must instantiate and serialize at least one PlannedWorkout.

Output:
- Full file contents for touched files.
- `pytest -q` passes.
```

---

## Prompt 6 — Create planned workout service

```text
Continue from current state.

Goal: implement a service function to create planned workouts and store them in AppState via InMemoryStateStore.

TDD steps:
1) Write tests:
   - create_planned_workout returns a new id
   - created workout is stored in state.planned_workouts
   - default is_user_locked is False
   - default completion_state is "planned"
2) Implement services/planned_workouts.py:
   - create_planned_workout(store, date, type, target_distance_m, target_duration_s, target_pace_range, structure, route_id=None) -> str
   - It should generate uuid4 id and persist to store.
3) Ensure service is imported/used only by tests (fine), but no dead code.

Constraints:
- Keep API simple, pure where possible.
- Validate inputs by relying on PlannedWorkout validation.

Output:
- Full file contents and tests passing.
```

---

## Prompt 7 — Edit planned workout + locking behavior

```text
Continue from current state.

Goal: implement editing planned workouts and enforce locking on edit.

TDD steps:
1) Write tests:
   - editing a workout updates specified fields (e.g., structure)
   - any edit sets is_user_locked=True
   - editing a non-existent id raises KeyError
2) Implement in services/planned_workouts.py:
   - edit_planned_workout(store, planned_workout_id, patch: dict) -> None
   - Allowed patch keys: type, target_distance_m, target_duration_s, target_pace_range, structure, route_id
   - Set is_user_locked True after applying patch
3) Update serialization tests if needed.

Constraints:
- Avoid partial silent failures; unknown patch keys should raise ValueError.
- Keep it incremental.

Output:
- Files changed, full contents, tests passing.
```

---

## Prompt 8 — WorkoutLog model + add log service (no linking yet)

```text
Continue from current state.

Goal: add WorkoutLog entity and a basic add_workout_log service that supports multiple logs per day.

WorkoutLog fields (v1):
- id (uuid string)
- date (YYYY-MM-DD str)
- type (WorkoutType)
- actual_distance_m (int|None)
- actual_duration_s (int|None)
- actual_pace_s_per_km (int|None)
- notes (str default "")
- linked_planned_workout_id (str|None)
- diff_classification ("completed"|"modified"|"")

TDD steps:
1) Tests:
   - can create WorkoutLog and serialize in AppState
   - add_workout_log adds logs to state.workout_logs
   - multiple logs with same date are both stored (different ids)
2) Implement:
   - domain/workout_log.py
   - AppState.workout_logs: dict[str, WorkoutLog]
   - serialization support
   - services/workout_logs.py add_workout_log(store, date, type, ...) -> str
3) Keep linking out of scope for now (linked_planned_workout_id remains None).

Constraints:
- notes may be empty.
- Ensure no orphan serialization helpers.

Output:
- Full file contents for all touched files.
- Tests passing.
```

---

## Prompt 9 — Auto-link log to planned workout (single planned workout on that date)

```text
Continue from current state.

Goal: implement the rule: if a user logs on a date with a planned workout, link and mark completed/modified later.
In this step: only handle the simple case where exactly ONE planned workout exists on that date.

TDD steps:
1) Write tests:
   - given one planned workout on date D, adding a log on D links linked_planned_workout_id to that workout
2) Implement in services/workout_logs.py:
   - enhance add_workout_log: after storing log, search planned_workouts for same date; if exactly one, link it
3) Do NOT implement diff classification or completion_state updates yet.

Constraints:
- Keep behavior limited to exactly-one-planned-workout case.

Output:
- Full file contents, tests passing.
```

---

## Prompt 10 — Diff classifier v1 + mark planned workout completed vs modified

```text
Continue from current state.

Goal: implement minimal diff classification and update planned workout completion_state when a linked log is added.

Diff rules (v1, simple):
- If planned.type != log.type => modified
- Else if both have distance and abs(diff)/planned_distance > 0.10 => modified
- Else => completed

TDD steps:
1) Tests:
   - matching type + close distance -> planned completion_state becomes "completed" and log.diff_classification "completed"
   - type mismatch -> planned completion_state "modified" and log.diff_classification "modified"
2) Implement:
   - services/diff_classifier.py with a function classify(planned, log) -> "completed"|"modified"
   - integrate into add_workout_log: if log linked, compute classification and update both the log and planned workout
3) Ensure updates persist through the store.

Constraints:
- Keep thresholds as constants in diff_classifier.
- No additional heuristics yet.

Output:
- Full file contents; all tests passing.
```

---

## Prompt 11 — Multiple planned workouts on the same day: matching heuristic

```text
Continue from current state.

Goal: implement linking when multiple planned workouts exist on the same date:
- Prefer same workout type
- Else choose first workout on that date whose completion_state is "planned"
- If none, choose the first workout on that date

TDD steps:
1) Tests:
   - two planned workouts same date (easy_run, tempo), logging tempo links to tempo workout
   - if logging type doesn't match any, links to first with completion_state planned
2) Implement helper in services/workout_logs.py:
   - find_best_planned_workout_for_log(state, log) -> PlannedWorkout|None
3) Ensure diff classification still runs after linking.

Constraints:
- Keep deterministic ordering: sort by planned_workout.id or insertion order (define it and test it).
- Do not change other behaviors.

Output:
- Full file contents; tests passing.
```

---

## Prompt 12 — Race + TrainingPlan models + serialization

```text
Continue from current state.

Goal: add Race and TrainingPlan entities and store them in AppState with serialization support.

Race:
- id, name, date (YYYY-MM-DD), status (RaceStatus), plan_id (str|None)

TrainingPlan:
- id, race_id, created_at (ISO string ok), is_frozen (bool)

TDD steps:
1) Tests:
   - can create and serialize/deserialize Race and TrainingPlan via AppState JSON snapshot
2) Implement:
   - domain/race.py
   - domain/training_plan.py
   - AppState.races: dict[str, Race]
   - AppState.plans: dict[str, TrainingPlan]
   - Update to_dict/from_dict accordingly

Constraints:
- Keep created_at as string for now to avoid datetime pitfalls; ensure ISO formatting in service later.

Output:
- Full file contents; tests passing.
```

---

## Prompt 13 — Enforce single active race invariant (helper + tests)

```text
Continue from current state.

Goal: enforce the invariant "at most one race active".

TDD steps:
1) Add tests:
   - get_active_race(state) returns None when no races
   - returns the active race when exactly one active exists
   - raises ValueError if more than one active race exists (corrupt state)
2) Implement in services/races.py:
   - get_active_race(state) -> Race|None with validation
3) Use this helper in future services (no new service yet).

Constraints:
- Do not auto-fix corrupt state; fail loudly.

Output:
- Full contents and tests passing.
```

---

## Prompt 14 — ActivateRaceService (prompt disposition input) + freeze old plan + create new plan

```text
Continue from current state.

Goal: implement ActivateRaceService that:
- Takes new_active_race_id and previous_race_disposition ("archived" or "completed")
- Finds current active race (if any)
- Sets old active race status accordingly
- Freezes old active race's plan (if it exists)
- Sets new race status to active
- Creates a new TrainingPlan for the new active race and assigns plan_id
- Enforces single active invariant

TDD steps:
1) Tests:
   - starting with race A active (with plan), activating race B prompts disposition input (provided) -> A becomes archived/completed, A's plan frozen, B active with new plan
   - if no active race exists, just activate B and create new plan
2) Implement in services/races.py:
   - activate_race(store, new_active_race_id, previous_race_disposition, now_iso: str) -> None
3) Ensure persistence through store and serialization continues to work.

Constraints:
- previous_race_disposition must be validated.
- Keep the function small and deterministic (now_iso passed in).

Output:
- Full file contents, tests passing.
```

---

## Prompt 15 — Deterministic plan generator (toy but complete required fields)

```text
Continue from current state.

Goal: implement a minimal deterministic plan generator that outputs PlannedWorkouts with all required fields, suitable for future recalculation.

Approach (toy but deterministic):
- For each date in [start_date, end_date], generate:
  - rest_day on 1 day/week
  - long_run on weekend day
  - easy_run otherwise
- Fill required fields:
  - target_distance_m (e.g., easy 5000, long 12000)
  - target_duration_s (roughly distance * constant pace)
  - target_pace_range (simple fixed range)
  - structure (non-empty string)

TDD steps:
1) Tests:
   - generate_plan_workouts(start,end) returns workouts for each date (or a subset if you decide; specify expected)
   - each workout has non-empty structure and required fields
   - deterministic given same inputs
2) Implement services/plan_generator.py:
   - generate_plan_workouts(start_date, end_date) -> list[PlannedWorkout-like dicts or PlannedWorkout objects]
3) Keep it isolated; do not integrate into state yet.

Constraints:
- Use only stdlib date handling.
- Keep logic simple and tested.

Output:
- Full file contents and tests passing.
```

---

## Prompt 16 — RecalculateFutureService (future-only + respects locks)

```text
Continue from current state.

Goal: implement recalculation for the active race:
- Only future workouts are recalculated (date > today)
- Locked planned workouts are never overwritten
- Frozen plans are never recalculated
- Recalc only happens when explicitly called

TDD steps:
1) Tests:
   - Setup: active race with plan, with planned workouts across past/today/future
   - Mark one future workout is_user_locked=True and change its structure
   - Call recalc_future(store, today="YYYY-MM-DD", horizon_end="YYYY-MM-DD")
   - Assert:
     - past/today workouts unchanged
     - locked future workout unchanged
     - other future workouts updated to match generator output
2) Implement services/recalculation.py:
   - recalc_future(store, today, horizon_end) -> None
   - Must read active race, ensure plan not frozen, call generate_plan_workouts(today+1..horizon_end), then merge.
3) Ensure merge logic is deterministic and covered by tests.

Constraints:
- Define merge key as (date, maybe type). Use date-based replacement for simplicity in v1, but must not override locked workouts on that date.
- Keep it small; no complex training theory required.

Output:
- Full contents, tests passing.
```

---

## Prompt 17 — Reschedule planned workout service (drag-drop support)

```text
Continue from current state.

Goal: implement rescheduling:
- reschedule_planned_workout(id, new_date) changes only that workout's date
- does NOT trigger any recalculation or modify other workouts

TDD steps:
1) Tests:
   - Create two planned workouts; reschedule one; assert the other unchanged
   - Ensure is_user_locked is not automatically changed by reschedule (remains what it was)
2) Implement in services/planned_workouts.py:
   - reschedule_planned_workout(store, planned_workout_id, new_date) -> None

Constraints:
- Validate new_date format minimally (YYYY-MM-DD) or leave to later; but test expected behavior.

Output:
- Full files and passing tests.
```

---

## Prompt 18 — Route model + create/update services

```text
Continue from current state.

Goal: implement Route entity and CRUD (create/update) services.

Route required fields:
- id, name, distance_m, path (string), start_location (lat/lon), end_location (lat/lon)

TDD steps:
1) Tests:
   - create_route stores route in AppState.routes and returns id
   - update_route can rename route
   - serialization round-trip preserves routes
2) Implement:
   - domain/route.py (with small Location dataclass)
   - AppState.routes: dict[str, Route]
   - services/routes.py create_route/update_route
   - Update AppState serialization

Constraints:
- Keep path as string (GeoJSON or encoded polyline) without parsing in backend.
- Validate lat/lon ranges.

Output:
- Full contents; tests passing.
```

---

## Prompt 19 — Attach route to planned workout (integrated edit path)

```text
Continue from current state.

Goal: support attaching a route to a planned workout by setting route_id via edit_planned_workout.

TDD steps:
1) Tests:
   - create route, create planned workout, edit planned workout route_id to route.id -> success and locks workout
   - editing route_id to a non-existent id raises ValueError (or KeyError) — choose one behavior, document it, and test it
2) Implement route existence validation in edit_planned_workout.

Constraints:
- Must remain backwards compatible for other edit fields.
- Ensure no dangling route references created.

Output:
- Full contents; tests passing.
```

---

## Prompt 20 — CSV export planned workouts

```text
Continue from current state.

Goal: implement CSV export for planned workouts only (routes excluded, per spec).

TDD steps:
1) Define a CSV schema (headers). Include at least:
   - id, date, type, target_distance_m, target_duration_s, pace_min_s_per_km, pace_max_s_per_km, structure, route_id, is_user_locked, completion_state
2) Tests:
   - create two planned workouts; export -> CSV string
   - parse via csv.DictReader -> expected number of rows and key fields match
3) Implement services/csv_io.py:
   - export_planned_workouts_csv(state) -> str

Constraints:
- Use stdlib csv module.
- Ensure newline handling is stable in tests.

Output:
- Full file contents; tests passing.
```

---

## Prompt 21 — CSV export workout logs

```text
Continue from current state.

Goal: implement CSV export for workout logs.

CSV headers (at least):
- id, date, type, actual_distance_m, actual_duration_s, actual_pace_s_per_km, notes, linked_planned_workout_id, diff_classification

TDD steps:
1) Tests:
   - create logs, export, parse, fields match
2) Implement in services/csv_io.py:
   - export_workout_logs_csv(state) -> str

Constraints:
- Keep exports separate functions.
- Do not export routes.

Output:
- Full contents; tests passing.
```

---

## Prompt 22 — CSV import planned workouts

```text
Continue from current state.

Goal: implement CSV import for planned workouts. IDs in CSV should NOT be trusted; create new IDs to avoid collisions.

TDD steps:
1) Tests:
   - given a CSV string with 2 planned workouts, import into empty state -> 2 workouts created with new ids
   - fields map correctly; type parsing works; pace range optional works
2) Implement in services/csv_io.py:
   - import_planned_workouts_csv(store, csv_str) -> list[str] (new ids)
3) Ensure validation errors raise ValueError with useful messages.

Constraints:
- Do not override existing workouts.
- For optional ints, treat empty as None.

Output:
- Full contents; tests passing.
```

---

## Prompt 23 — CSV import workout logs

```text
Continue from current state.

Goal: implement CSV import for workout logs. Allow multiple logs per day; generate new IDs.

TDD steps:
1) Tests:
   - import logs CSV with two logs same date -> both created
   - linked_planned_workout_id may be empty -> None
2) Implement in services/csv_io.py:
   - import_workout_logs_csv(store, csv_str) -> list[str]
3) Do not attempt to auto-link imported logs; preserve linked_planned_workout_id only if present and valid (decide and test).

Constraints:
- Keep it simple and safe.
- If linked_planned_workout_id provided but not found, either set None or raise; choose behavior and test.

Output:
- Full files; tests passing.
```

---

## Prompt 24 — End-to-end invariants + wiring: scenario test

```text
Continue from current state.

Goal: add an end-to-end scenario test that wires the system together and validates key invariants from spec.md.

Scenario to test:
1) Create race A and activate it, generating a plan placeholder.
2) Create planned workouts for a date range (via create_planned_workout or recalc_future).
3) Edit one future planned workout structure -> locks it.
4) Recalculate future -> locked workout unchanged; other future workouts updated.
5) Add a workout log on a planned day -> links and marks modified/completed.
6) Create race B and activate it with disposition "archived" for race A -> race A not active, old plan frozen, B active with new plan.

TDD steps:
- Write the scenario test first.
- If any missing wiring or helper makes the test too awkward, refactor services minimally (no big redesign) to make the scenario clean.
- Ensure all tests pass and there is no unused code.

Constraints:
- Keep the test deterministic by injecting today/now_iso.
- Ensure only one active race.

Output:
- Full contents; `pytest -q` passes.
```

---

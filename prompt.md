# TDD Code-Gen Prompt Pack (Backend, Python/FastAPI) — built from `plan.md`

Use these prompts **in order** with a code-generation LLM. Each prompt is designed to be:
- test-driven (write tests first / alongside code),
- incremental (no large jumps),
- fully integrated (no orphan code),
- and ends by **wiring new code into the running app**.

## Assumptions (apply to every prompt unless overridden)
- Backend language: **Python**
- Web-first: API consumed by JavaScript frontend
- Framework: **FastAPI**
- DB: **PostgreSQL**
- ORM: **SQLAlchemy 2.x** (async and stay consistent)
- Migrations: **Alembic**
- Tests: **pytest** + **httpx** (for API) + **testcontainers** (or docker-compose) for Postgres in CI
- Validation: **Pydantic v2**
- Code structure target (suggested):
  - `app/main.py` (FastAPI app)
  - `app/db.py` (engine/session)
  - `app/models/*` (SQLAlchemy models)
  - `app/schemas/*` (Pydantic)
  - `app/routers/*` (FastAPI routers)
  - `app/services/*` (domain logic)
  - `tests/*`

**Auth stub**: v1 can use a fixed user (e.g., `ksuh5`) via middleware/dependency that returns `user_id=1`. All DB reads/writes must be scoped by this user id.

---

## Prompt 0 — Repo baseline: tooling, CI-ready tests, health endpoint

```text
You are implementing the backend in Python using FastAPI.

Goal (Step 0 from plan.md): Add linting/formatting, CI-friendly test runner setup, and a health endpoint with a simple DB connection check test.

Requirements:
1) Create a minimal FastAPI app in app/main.py with:
   - GET /api/v1/health returning {"status":"ok"}.
2) Add a database module app/db.py that can create a SQLAlchemy engine and session factory.
   - Do NOT add any domain models yet.
3) Add pytest configuration and a first integration test:
   - Start the app with TestClient or httpx AsyncClient.
   - Test GET /api/v1/health returns 200 and expected JSON.
4) Add a second test that validates DB connectivity in a controlled way:
   - If you can’t connect to a real Postgres in tests yet, structure the test to be skipped unless DATABASE_URL is provided.
   - Prefer testcontainers if available; otherwise implement a clear skip with message.

Best practices:
- Keep code extremely small.
- Make the test suite runnable locally with a single command.
- Ensure imports and package layout are correct.
- No orphan code: everything created should be used by either the app or the tests.

Output:
- Implement the code and tests.
- Ensure tests pass.
- Wire the router prefix /api/v1 into the app.
```

---

## Prompt 1 — DB + migrations foundation: users table + Alembic

```text
Goal (Step 1): Add migrations and create the base `users` table.

You must:
1) Introduce Alembic:
   - alembic.ini, env.py, versions/ migration.
   - Ensure migrations can run against DATABASE_URL.
2) Add a SQLAlchemy model for users:
   - Table: users
   - Columns: id (pk), login (unique, non-null), units (enum or constrained string: "mi"|"km"), created_at, updated_at.
3) Add a startup script or documented command to run migrations.

Testing (TDD):
- Add an integration test that:
  - migrates the database (or assumes migrations applied in test fixture),
  - inserts a user record using a session,
  - queries it back,
  - asserts uniqueness constraint works (attempt inserting same login should fail).

Constraints:
- Keep auth stub assumption: ksuh5 maps to user row id=1 eventually, but don’t hardcode yet—just implement the model and migration.
- No unused code. If you add a model, ensure tests exercise it.

Wire-up:
- Ensure app/db.py exposes get_session dependency usable by future routers.
```

---

## Prompt 2 — Auth stub + /me endpoint (minimal but real)

```text
Goal: Introduce a minimal auth stub and implement GET /api/v1/me.

You must:
1) Create an auth dependency in app/auth.py:
   - In dev/test, always return a "current user" with login "ksuh5".
   - Resolve (and if missing, create) the user in DB so that GET /me always returns a persistent user row.
2) Add router app/routers/me.py:
   - GET /api/v1/me returns {id, login, units}.
3) Add Pydantic schemas for the response.

Testing (TDD):
- Add an integration test:
  - Calls GET /api/v1/me twice,
  - Asserts same user id is returned both times,
  - Asserts login is "ksuh5".

Wire-up:
- Register the router in app/main.py under /api/v1.
- Ensure test database is clean per test session, but /me creates user if missing.
```

---

## Prompt 3 — Preferences MVP: table + GET/PUT /me/preferences with validation

```text
Goal (Step 2): Add `user_preferences` and implement GET/PUT /api/v1/me/preferences.

You must:
1) Add DB model + Alembic migration for user_preferences:
   - user_id (pk, fk users.id)
   - days_per_week (int)
   - weekly_mileage_target_m (int nullable)
   - preferred_long_run_weekday (0-6)
   - hard_sessions_per_week (int)
   - hard_session_type_preferences (json)
   - fitness_goal (string/enum)
2) Add router endpoints:
   - GET /api/v1/me/preferences: return preferences for current user (create defaults if none).
   - PUT /api/v1/me/preferences: update preferences.

Validation rules (test them):
- units stay in users table, not here.
- days_per_week: 1..7
- preferred_long_run_weekday: 0..6
- hard_sessions_per_week: 0..3 (choose 3 max for v1 unless plan says otherwise)
- weekly_mileage_target_m: if present must be >0

Testing (TDD):
- Integration test for:
  - default creation on GET (returns stable defaults),
  - PUT then GET returns updated values,
  - invalid payloads return 422.

Wire-up:
- Ensure /me endpoint still works.
- Ensure preferences are user-scoped via auth dependency.
```

---

## Prompt 4 — Performance results MVP: model + CRUD endpoints

```text
Goal (Step 3): Add performance results endpoints.

You must:
1) Add performance_results model + migration:
   - id, user_id fk, distance_m, time_s, result_date (date required), label, created_at.
2) Implement endpoints:
   - POST /api/v1/performance-results
   - GET /api/v1/performance-results
   - DELETE /api/v1/performance-results/{id}

Validation:
- distance_m > 0
- time_s > 0
- result_date required
- Ensure ownership: user can only delete their own.

Testing (TDD):
- Integration tests:
  - create result then list returns it,
  - delete removes it,
  - cannot delete non-existent => 404,
  - cannot delete other user’s => 404 (or 403, pick one and standardize).

Wire-up:
- Add router registration.
- Ensure /me and /me/preferences tests still pass.
```

---

## Prompt 5 — Fitness profile MVP (phase 1): VDOT interface + deterministic stub + endpoint

```text
Goal (Step 4.1-4.4): Implement /api/v1/fitness-profile using a stub VDOT calculator first.

You must:
1) Add fitness_profiles model + migration:
   - user_id (pk, fk), current_vdot numeric, source_result_id fk, computed_at.
2) Create service app/services/vdot.py:
   - Define an interface/protocol: compute_vdot(distance_m, time_s) -> float
   - Provide a stub implementation that returns a deterministic value based on distance/time (simple formula) so tests can assert exact output.
3) Create service app/services/fitness_profile.py:
   - Select "best within last 90 days":
     - compute vdot per result (stub)
     - choose max vdot from results where result_date >= today-90d
     - store in fitness_profiles with source_result_id and computed_at
4) Implement GET /api/v1/fitness-profile:
   - If no results exist, return 404 or a payload indicating "no_data" (choose one and document).
   - Otherwise return current_vdot and source result metadata (distance, time, date).
   - Pace ranges can be omitted in stub phase; just include placeholders or empty.

Testing (TDD):
- Unit test selection logic: if two results in window, pick higher vdot.
- Integration test:
  - create two performance results,
  - call /fitness-profile,
  - assert chosen source_result_id matches expected based on stub vdot.
- Add a test for "no results" behavior.

Wire-up:
- Ensure fitness profile endpoint is registered and uses auth scoping.
```

---

## Prompt 6 — Fitness profile (phase 2): replace stub with Daniels-style table/model + golden tests

```text
Goal (Step 4.5): Replace stub VDOT with Daniels VDOT-style equivalency.

You must:
1) Implement a Daniels-style VDOT computation:
   - Use a table-based approach or a well-defined approximation.
   - It must be deterministic and testable.
2) Implement pace derivation from VDOT:
   - Return at least easy, tempo, interval pace ranges (sec per km stored; convert in response based on user units).
   - Include RPE guidance as strings or numeric range.
3) Update /fitness-profile response to include:
   - vdot
   - paces: {easy: {min,max}, tempo: {min,max}, interval: {min,max}} in user units
   - rpe guidance per type

Testing (TDD):
- Golden tests:
  - Pick 2-3 known input performances (e.g., 5K in 25:00, 10K in 50:00) and assert VDOT and derived paces match expected reference outputs for your chosen method.
- Integration test:
  - create performance result, call /fitness-profile, ensure paces exist and are plausible (easy slower than tempo, etc.).

Wire-up:
- Ensure no other code relies on stub behavior; update selection tests accordingly.
```

---

## Prompt 7 — Scheduled workouts MVP: model + CRUD + range listing + hard-day helper

```text
Goal (Step 5): Implement scheduled workouts CRUD and list by date range.

You must:
1) Add training_plans + scheduled_workouts tables (models + migrations):
   - training_plans minimal fields as in plan.md
   - scheduled_workouts fields as in plan.md
2) Define workout_type enum with at least:
   - easy, recovery, long, tempo, intervals, hills, cross_train, strength, mobility, rest
3) Implement endpoints:
   - POST /api/v1/scheduled-workouts
   - GET /api/v1/scheduled-workouts?start=YYYY-MM-DD&end=YYYY-MM-DD
   - PATCH /api/v1/scheduled-workouts/{id}
4) Implement a domain helper:
   - is_hard_day(workout_type) -> bool
   - Hard day types: tempo/intervals/hills

Testing (TDD):
- Unit test is_hard_day classification.
- Integration tests:
  - create scheduled workout and list it in range,
  - patch updates fields,
  - only returns workouts for current user.

Wire-up:
- Register router.
- Ensure existing endpoints unaffected.
```

---

## Prompt 8 — Completion logging MVP: completed_workouts + complete endpoint + immutability

```text
Goal (Step 6): Allow completing a scheduled workout.

You must:
1) Add completed_workouts model + migration:
   - unique constraint on scheduled_workout_id
2) Implement:
   - POST /api/v1/scheduled-workouts/{id}/complete
     - creates completed_workout linked to scheduled_workout_id
     - marks scheduled_workouts.status = "completed"
3) Ensure completed workouts are immutable:
   - Do not create PATCH for completed workouts in v1.
   - If needed, allow only GET endpoints.

Testing (TDD):
- Integration test:
  - create scheduled workout,
  - complete it,
  - assert completed_workout exists and scheduled status changed.
- Test completing twice returns 409 (or 400) with clear error.
- Test cannot complete a workout belonging to another user.

Wire-up:
- Add GET /api/v1/completed-workouts?start&end basic listing.
```

---

## Prompt 9 — Mileage endpoint MVP: planned vs completed + stride rules + cross-training exclusion

```text
Goal (Step 7): Implement mileage totals endpoint.

You must:
1) Implement domain function stride_distance_m(stride_count):
   - if <=4 => 0
   - else => stride_count * 80
2) Implement GET /api/v1/mileage?start=...&end=... returning:
   - planned_distance_m_total
   - completed_distance_m_total
   - (optional) breakdown by day
3) Planned includes scheduled_workouts in range where:
   - status != skipped
   - workout_type in running types only (easy,recovery,long,tempo,intervals,hills)
   - planned_distance_m + stride_distance
4) Completed includes completed_workouts in range:
   - completed_distance_m + stride_distance
5) Cross-training counts 0 mileage (even if duration exists).

Testing (TDD):
- Unit tests for stride_distance_m thresholds.
- Integration tests:
  - planned with stride_count=4 adds 0
  - planned with stride_count=5 adds 400m
  - completed totals add stride distance too
  - cross_train scheduled workout excluded from planned mileage

Wire-up:
- Register endpoint.
- Ensure totals match DB inserts.
```

---

## Prompt 10 — Routes storage MVP: templates + instances

```text
Goal (Step 8): Store routes (polyline + distance).

You must:
1) Add route_templates and route_instances models + migrations.
2) Endpoints:
   - POST /api/v1/routes/templates
   - GET /api/v1/routes/templates
   - POST /api/v1/routes/instances
   - GET /api/v1/routes/instances/{id}
3) Validation:
   - polyline required (string)
   - distance_m required and > 0
   - elevation_gain_m optional >=0

Testing (TDD):
- Integration tests:
  - create template then list includes it
  - create instance then fetch returns it
  - ownership scoping enforced

Wire-up:
- Register routes router.
```

---

## Prompt 11 — Attach route to scheduled workout + default planned distance

```text
Goal (Step 9): Attach a route instance to a scheduled workout and default planned distance.

You must:
1) Add route_instance_id FK to scheduled_workouts (migration).
2) Update PATCH /api/v1/scheduled-workouts/{id} to accept route_instance_id.
3) Business rule:
   - When route_instance_id is set and planned_distance_m is null, set planned_distance_m = route_instance.distance_m
   - If planned_distance_m is already set, do not overwrite it.

Testing (TDD):
- Integration test:
  - create scheduled workout with planned_distance_m null
  - create route instance
  - patch scheduled workout with route_instance_id
  - assert planned_distance_m is now route distance
- Test that planned_distance_m is NOT overwritten if already set.

Wire-up:
- Ensure mileage endpoint reflects updated planned_distance_m.
```

---

## Prompt 12 — Goal plan generation: create plan + generate 7 scheduled workouts with constraints

```text
Goal (Step 10): Implement goal plan creation and generate a 1-week schedule.

You must:
1) Implement POST /api/v1/plans/goal:
   - inputs: race_date, goal_time_s (or hh:mm:ss parsing), plus use existing preferences
   - creates training_plan row plan_type="goal"
2) Implement a generator service app/services/plan_generator.py:
   - Given start_date (next Monday or today) generate 7 days of scheduled workouts.
   - Must include at least 1 key workout (tempo/intervals/hills) in the week.
   - Must enforce no back-to-back hard days (tempo/intervals/hills).
   - Long run is not automatically key.
   - Use VDOT-derived paces (from fitness profile) for the key workout target_paces.
3) Persist generated scheduled_workouts linked to plan_id.

Testing (TDD):
- Integration test:
  - create preferences, create performance result (so fitness profile exists),
  - create goal plan,
  - verify 7 scheduled workouts created for a week window,
  - verify >=1 workout_type in {tempo,intervals,hills},
  - verify no consecutive hard days.

Wire-up:
- Ensure generated workouts appear in scheduled workouts list endpoint.
```

---

## Prompt 13 — Adaptive plan generation: rolling weekly generation endpoint

```text
Goal (Step 11): Implement adaptive plan and generate-week endpoint.

You must:
1) POST /api/v1/plans/adaptive:
   - creates plan_type="adaptive"
   - stores generation params from preferences (weekly target, days/week, hard sessions/week)
2) POST /api/v1/plans/{id}/generate-week:
   - generates the next 7-day block after the last scheduled workout date for that plan (or starting upcoming week if none)
   - respects same constraints:
     - >=1 key workout/week
     - no back-to-back hard days
3) Must not duplicate dates if called twice:
   - either idempotent by checking existing scheduled_workouts for that date range or return 409.

Testing (TDD):
- Integration test:
  - create adaptive plan
  - call generate-week twice
  - assert second call does not create duplicates (choose behavior and test it)
- Constraint tests similar to goal plan.

Wire-up:
- Ensure generated workouts show in calendar range listing.
```

---

## Prompt 14 — Cross-training similarity predicate + planned-duration derivation

```text
Goal (Step 12): Implement cross-training similarity logic as a pure domain helper.

You must:
1) Implement service app/services/substitution.py with:
   - derive_planned_duration_s(planned_distance_m, easy_pace_s_per_km) -> int
   - is_cross_training_similar(planned_duration_s, planned_rpe, xt_duration_s, xt_rpe) -> bool
     - duration within ±10%
     - RPE within ±1
2) If a planned run has duration already, use it.
   If not, derive it using VDOT easy/long pace (choose easy pace for most; document).
3) Add unit tests covering boundary conditions (exactly 10%, just over 10%, etc.).

Wire-up:
- No API endpoint required yet; just ensure it is imported by future adaptation code (to avoid orphan code, add a tiny internal usage in a service module or add a “TODO wired later” is not allowed).
- Best approach: add a small internal function in adaptation service that calls it, even if adaptation endpoint not implemented yet, and test that function.

Testing:
- Unit tests only are fine here.
```

---

## Prompt 15 — Missed-run make-up logic (non-injury adaptation) wired into weekly generation

```text
Goal (Step 13): Implement missed-run detection and make-up scheduling, wired into adaptive generate-week.

You must:
1) Define what "missed" means for v1:
   - scheduled workout in the past with status "planned" (not completed, not skipped) by end of week.
2) Implement service app/services/adaptation.py:
   - compute_missed_mileage_m(...)
   - compute_makeup_mileage_m(missed_m, cap_range=(0.50,0.75)) -> int (choose deterministic, e.g., 0.60 for v1)
   - reschedule_makeup_as_easy_runs(...) ensuring:
     - only adds easy workouts
     - does not create back-to-back hard days (should be easy, but enforce anyway)
3) If cross-training was done instead, use similarity check:
   - If similar, missed mileage is considered covered => 0 makeup

Wiring (important):
- Modify POST /plans/{id}/generate-week (adaptive) to:
   - look at last week’s misses and substitutions
   - add makeup easy mileage into the newly generated week, within safe bounds

Testing (TDD):
- Integration test:
  - create a planned run last week, leave it uncompleted
  - call generate-week
  - assert some makeup easy distance is scheduled (bounded by 50–75% of missed)
- Integration test:
  - log a cross-training completed workout similar to planned duration/RPE
  - call generate-week
  - assert makeup is not added

Keep it simple:
- Don’t implement complex shuffling; just add 1-2 easy runs with small distances.
- Ensure everything is persisted and visible via list endpoint.
```

---

## Prompt 16 — Injury endpoints (CRUD-ish) + active retrieval

```text
Goal (Step 14): Implement injury report endpoints.

You must:
1) Add injury_reports model + migration.
2) Endpoints:
   - POST /api/v1/injury-reports (creates active report; resolve any existing active by setting to resolved OR reject—pick one and test)
   - PATCH /api/v1/injury-reports/{id}
   - POST /api/v1/injury-reports/{id}/resolve
   - GET /api/v1/injury-reports/active
3) Validation:
   - pain_level 1..10
   - start_date required
   - can_run required
   - allowed_activities is array (may be empty)
   - status transitions allowed

Testing (TDD):
- Integration tests for:
  - create and fetch active
  - update pain/can_run
  - resolve removes active
  - user scoping

Wire-up:
- Add router and ensure it does not break generation endpoints.
```

---

## Prompt 17 — Injury adaptation engine wired into plan generation + return-to-run gating flag

```text
Goal (Step 15): Implement injury constraints that affect plan generation and return-to-run progression.

You must:
1) Implement service app/services/injury_adaptation.py:
   - choose_injury_mode(pain_level): option1/option2/option3
     - pain < 2 => option3
     - pain >= 4 => option2
     - pain >= 6 => option1
   - rest_extension logic:
     - if option1 and "no improvement", extend by +1 day (define no improvement as pain not decreased vs prior report update)
   - return-to-run plan:
     - resume allowed when can_run==true and pain<=2 (1 day)
     - schedule only easy runs at 50–60% of pre-injury volume
     - increase weekly volume by 10% per week until baseline
   - relapse detection:
     - pain > 4 => relapse => drop to cross-training/no-run modes
   - "explicit confirmation" gating:
     - add a boolean field on scheduled workouts like `requires_explicit_confirmation` (migration)
     - first quality session back should set this true

Wiring:
- Modify plan generation (goal + adaptive) to consult active injury report:
  - If option1: generate rest/cross-train only (no running)
  - If option2: no running, allow cross-train if allowed
  - If option3: easy running only (no key workouts)
- Modify completion flow or a simple endpoint to confirm readiness before first quality session:
  - For v1, implement PATCH scheduled workout to set confirmed=true (add field) OR add a dedicated endpoint /confirm.
  - Ensure generator sets requires_explicit_confirmation for first post-injury quality session.

Testing (TDD):
- Unit tests for mode selection and relapse predicate.
- Integration tests:
  - with active injury pain=7 => generated week has no running workouts
  - with pain=1 and can_run true => generated week has only easy running, no tempo/interval/hills
  - return-to-run volume reduction is applied (50–60%) and then +10% next week (simulate by calling generate-week twice with injury active)
  - first quality session back is gated by requires_explicit_confirmation=true (and is absent until the “1 week easy no relapse” condition is satisfied; keep v1 logic minimal but test the gating trigger)

No orphan code:
- All new fields must be used by generator or endpoints and covered by tests.
```

---

## Prompt 18 — Final wiring & regression pass: OpenAPI sanity, error shapes, and end-to-end flow test

```text
Goal: Ensure everything is wired, consistent, and test-covered.

You must:
1) Add a single end-to-end integration test that:
   - GET /me -> ensure user exists
   - PUT /me/preferences
   - POST performance result
   - GET fitness-profile
   - POST /plans/adaptive
   - POST /plans/{id}/generate-week
   - GET scheduled workouts for that week
   - complete one scheduled workout
   - GET mileage totals for that week and assert completed > 0 and planned >= completed

2) Standardize API error responses:
   - Use FastAPI HTTPException with consistent detail messages.
   - Ensure 404/409 behaviors are consistent across endpoints.

3) Confirm OpenAPI docs generate without errors and include all routers.

4) Run full test suite and ensure it passes.

Do not add new features. Only wiring, consistency, and tests.
```

---

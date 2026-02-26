# TDD Code-Generation Prompts (Python/FastAPI Backend)

Use these prompts **in order** with a code-generation LLM. Each prompt is designed to be:
- **small, incremental, test-driven**
- **integrated** (no orphaned modules)
- **safe to merge** (tests + wiring each step)
- **beginner-friendly** (clear acceptance checks)

Assumptions:
- Backend uses **FastAPI**, **SQLAlchemy**, **Alembic**, **Pytest**.
- The step-by-step plan is in `plan.md` (Steps 0–8).
- If you’re using Docker/Compose for Postgres, you can add it later (Step 8); early steps can use SQLite for tests *or* a dedicated test Postgres.

> Instruction for the code-gen LLM in every step: **Do not implement future steps early.** Only implement what this prompt asks. Keep diffs minimal and ensure all tests pass.

---

## Prompt 0.1 — Create minimal FastAPI app + /health + first test

```text
You are implementing Step 0.1 from plan.md.

Goal: Create a minimal FastAPI application with a GET /health endpoint that returns JSON { "status": "ok" } and a passing pytest test.

Requirements:
1) Create a Python project structure that matches plan.md at a minimal level:
   - app/main.py (FastAPI instance + router wiring)
   - app/api/routers/health.py (health endpoint)
   - app/tests/test_health.py
2) Add pytest configuration if needed (pyproject.toml or requirements.txt is fine; keep it minimal).
3) Test-driven approach:
   - Write the failing test first (test expects 200 + JSON).
   - Implement endpoint to make it pass.
4) Use FastAPI's TestClient (from fastapi.testclient) for the test.
5) Ensure the app is runnable (e.g., uvicorn app.main:app).
6) Wire the router into the app so the endpoint is live (no orphan router).

Acceptance:
- `pytest` passes.
- `GET /health` returns 200 and exact JSON {"status":"ok"}.

After changes, output:
- A brief list of files changed/added and why.
- Any commands to run tests locally.
```

---

## Prompt 0.2 — Add config module (env-driven) + keep app working

```text
Implement Step 0.2 from plan.md.

Goal: Add a simple configuration system that reads environment variables, without breaking existing /health functionality.

Requirements:
1) Create app/core/config.py using Pydantic Settings (pydantic-settings) OR a tiny manual env reader.
   - Must support at least: DATABASE_URL (optional for now), JWT_SECRET (optional for now), ENV (dev/test).
   - Provide safe defaults for dev/test.
2) Update app/main.py to load config (but do NOT connect to the DB yet).
3) Add a small test that proves the config object can be imported and has defaults.
4) Keep /health endpoint and existing tests passing.

Acceptance:
- All tests pass.
- No new runtime dependencies beyond what you use (add to requirements/pyproject).

After changes, output:
- Files changed
- How to set ENV vars for local runs (brief)
```

---

## Prompt 1.1 — Add SQLAlchemy engine/session + dependency (no models yet)

```text
Implement Step 1.1 from plan.md.

Goal: Add SQLAlchemy engine + SessionLocal + a FastAPI dependency that yields a DB session per request, without adding models yet.

Requirements:
1) Add app/db/session.py:
   - create_engine using config.DATABASE_URL
   - SessionLocal = sessionmaker(...)
   - get_db() dependency that yields a session and closes it safely
2) Add app/db/base.py with a Base = declarative_base() (or SQLAlchemy 2.0 DeclarativeBase).
3) Ensure app/main.py still runs and /health still works.
4) Testing:
   - Add a test that imports get_db and can create/close a session in a controlled way.
   - If DATABASE_URL is not set, tests should still work. You may set DATABASE_URL to sqlite:///./test.db or sqlite+pysqlite:///:memory: for tests only.
5) Keep things simple: no Alembic yet.

Acceptance:
- All tests pass.
- Session dependency exists and is importable.

After changes, include:
- Any notes about how tests choose a DB URL.
```

---

## Prompt 1.2 — Add Alembic baseline migration wiring

```text
Implement Step 1.2 from plan.md.

Goal: Add Alembic to the project and create a baseline migration setup. No tables required yet.

Requirements:
1) Add alembic.ini and alembic/ directory with env.py configured to use app.core.config settings.
2) Ensure Alembic can run in principle:
   - Document command to create a migration and upgrade (do not require user to actually run in CI yet unless easy).
3) Do not introduce models or migrations that create tables yet.
4) Tests:
   - Add a lightweight test that imports Alembic env configuration modules (or at least verifies alembic package is installed).
   - Keep tests robust and not dependent on an external database if possible.

Acceptance:
- Existing endpoint tests still pass.
- Alembic config exists and points to the configured DB URL.

After changes:
- Provide commands:
  - alembic revision --autogenerate -m "..."
  - alembic upgrade head
```

---

## Prompt 2.1 — Implement User model + migration + DB-level uniqueness

```text
Implement Step 2.1 from plan.md.

Goal: Add a User model, create an Alembic migration for it, and add tests for basic persistence and uniqueness.

Requirements:
1) Create app/db/models/user.py defining User with:
   - id (UUID primary key; use uuid4)
   - email (unique, indexed, non-null)
   - password_hash (non-null)
   - created_at (timestamp default now)
2) Update app/db/models/__init__.py and app/db/base.py imports so Alembic autogenerate can see metadata.
3) Create an Alembic migration that creates the users table.
4) Testing:
   - Add pytest fixtures to create a temporary database and apply migrations (choose the simplest workable approach).
   - Add tests:
     a) can insert a user and retrieve it
     b) inserting duplicate email raises an integrity error (or results in a controlled failure)
5) Keep /health tests passing.

Acceptance:
- All tests pass.
- Migration exists and is applied in tests.

After changes:
- Explain briefly how migrations are run in the test setup.
```

---

## Prompt 2.2 — Add User Pydantic schema (no password leaks)

```text
Implement Step 2.2 from plan.md.

Goal: Add Pydantic schemas for User to ensure responses never leak password_hash.

Requirements:
1) Create app/schemas/user.py:
   - UserRead schema: id, email, created_at
   - (Optional) UserCreate schema: email, password
2) Add a unit test that confirms password_hash is not present in UserRead serialization.
3) Do not add auth endpoints yet; just schemas + tests.
4) Keep all existing tests passing.

Acceptance:
- Tests pass and schemas are integrated (importable, used where relevant).
```

---

## Prompt 3.1 — Password hashing utilities + unit tests

```text
Implement Step 3.1 from plan.md.

Goal: Add password hashing utilities using passlib[bcrypt] (recommended) and test them.

Requirements:
1) Create app/core/security.py with:
   - hash_password(plain: str) -> str
   - verify_password(plain: str, hashed: str) -> bool
2) Add unit tests:
   - correct password verifies true
   - wrong password verifies false
   - hash output is not equal to input
3) No API changes yet (no new endpoints).
4) Keep existing tests passing.

Acceptance:
- All tests pass.
```

---

## Prompt 3.2 — JWT utilities + unit tests

```text
Implement Step 3.2 from plan.md.

Goal: Add JWT creation and validation helpers and test them.

Requirements:
1) In app/core/security.py (or a new module if cleaner), add:
   - create_access_token(subject: str, expires_minutes: int | None = None) -> str
   - decode_access_token(token: str) -> dict (or a structured object)
2) Token must include:
   - sub = user_id (string)
   - exp (expiry) if configured
3) Use config.JWT_SECRET and config.JWT_ALGORITHM (default HS256).
4) Tests:
   - token decodes and includes sub
   - expired token is rejected (if you implement expiry; otherwise add a simple invalid token test)

Acceptance:
- All tests pass.
- No endpoints added yet.
```

---

## Prompt 4.1 — Implement POST /auth/register with tests

```text
Implement Step 4.1 from plan.md.

Goal: Add POST /auth/register to create a user with hashed password.

Requirements:
1) Create app/api/routers/auth.py and wire it in app/main.py.
2) Endpoint: POST /auth/register
   - Request body: email, password
   - Validate email format (Pydantic EmailStr)
   - Hash password
   - Store user in DB
   - Return UserRead (id, email, created_at)
   - Reject duplicate email with a 400 (or 409) and clear error message
3) Testing (TDD):
   - test successful register
   - test duplicate register fails
4) Ensure database session dependency is used.
5) Keep /health endpoint working.

Acceptance:
- Tests pass.
- Router is wired; no orphan code.
```

---

## Prompt 4.2 — Implement POST /auth/login with tests (returns JWT)

```text
Implement Step 4.2 from plan.md.

Goal: Add POST /auth/login to authenticate and return an access token.

Requirements:
1) Endpoint: POST /auth/login
   - Request body: email, password
   - Verify user exists and password matches
   - Return JSON: { "access_token": "...", "token_type": "bearer" }
2) Tests:
   - login success returns bearer token
   - wrong password returns 401
   - non-existent user returns 401
3) Keep register tests passing.

Acceptance:
- All tests pass.
- Tokens decode to the right subject if tested.
```

---

## Prompt 4.3 — Add get_current_user dependency + GET /me + tests

```text
Implement Step 4.3 from plan.md.

Goal: Add authentication dependency that reads Authorization: Bearer <token> and provides the current user. Add GET /me as a protected endpoint.

Requirements:
1) Add app/api/deps.py:
   - oauth2 scheme (OAuth2PasswordBearer is okay)
   - get_current_user(db=Depends(get_db), token=Depends(oauth2_scheme))
   - Decode token, get user by id, raise 401 if invalid/missing
2) Add router endpoint GET /me (can be in auth router):
   - Returns UserRead for the authenticated user
3) Tests:
   - GET /me without token -> 401
   - GET /me with valid token -> 200 and correct user
4) Keep existing tests passing.

Acceptance:
- All tests pass.
- Dependency is used by /me.
```

---

## Prompt 5.1 — Add Route model + migration + minimal DB test

```text
Implement Step 5.1 from plan.md.

Goal: Add Route model and migration.

Requirements:
1) Create app/db/models/route.py with fields:
   - id UUID pk
   - user_id FK -> users.id (on delete cascade optional)
   - name (non-null)
   - notes (nullable)
   - polyline_points (JSON) storing list of {lat, lng}
   - distance_meters (nullable int)
   - created_at, updated_at
2) Add relationship to User if helpful.
3) Create Alembic migration for routes table.
4) Tests:
   - basic insert route for a user works.

Acceptance:
- All tests pass.
- Alembic sees the new model.
```

---

## Prompt 5.2 — POST /routes with tests

```text
Implement Step 5.2 from plan.md.

Goal: Create an authenticated endpoint to create a route.

Requirements:
1) Add app/schemas/route.py:
   - RouteCreate (name, notes?, polyline_points, distance_meters?)
   - RouteRead (id, name, notes, polyline_points, distance_meters, created_at, updated_at)
2) Add app/api/routers/routes.py and wire into app/main.py.
3) POST /routes:
   - Requires auth (Depends(get_current_user))
   - Creates route for current user
   - Returns RouteRead
4) Tests:
   - unauth request -> 401
   - auth request -> 200 + returns created route
5) Keep changes minimal and integrated.

Acceptance:
- Tests pass.
- Router wired.
```

---

## Prompt 5.3 — GET /routes list (only mine) + tests

```text
Implement Step 5.3 from plan.md.

Goal: Add list endpoint for routes scoped to the current user.

Requirements:
1) GET /routes:
   - Requires auth
   - Returns list of RouteRead for current user
2) Tests:
   - Create two users, create routes for each
   - Listing as user A returns only A's routes

Acceptance:
- All tests pass.
```

---

## Prompt 5.4 — GET /routes/{id} with ownership enforcement + tests

```text
Implement Step 5.4 from plan.md.

Goal: Add route detail endpoint with correct permission behavior.

Requirements:
1) GET /routes/{route_id}:
   - Requires auth
   - If route doesn't exist -> 404
   - If route exists but belongs to another user -> 403 (or 404, but pick one and be consistent)
2) Tests for:
   - can fetch own route
   - cannot fetch others' route
   - missing id returns 404

Acceptance:
- Tests pass.
```

---

## Prompt 5.5 — PUT /routes/{id} update + tests

```text
Implement Step 5.5 from plan.md.

Goal: Add update endpoint for routes.

Requirements:
1) Add RouteUpdate schema (all optional fields you want to allow).
2) PUT /routes/{route_id}:
   - Requires auth
   - Ownership enforcement
   - Updates fields and updated_at
3) Tests:
   - update own route works
   - cannot update others

Acceptance:
- Tests pass.
```

---

## Prompt 5.6 — DELETE /routes/{id} + tests

```text
Implement Step 5.6 from plan.md.

Goal: Add delete endpoint for routes.

Requirements:
1) DELETE /routes/{route_id}:
   - Requires auth
   - Ownership enforcement
   - Returns 204 No Content
2) Tests:
   - delete own route works
   - cannot delete others
   - deleted route is gone

Acceptance:
- Tests pass.
```

---

## Prompt 6.1 — Add Workout model + migration + minimal DB test

```text
Implement Step 6.1 from plan.md.

Goal: Add Workout model and migration.

Requirements:
1) Create app/db/models/workout.py with:
   - id UUID pk
   - user_id FK -> users.id
   - name non-null
   - type enum (easy/tempo/intervals/long_run/strength/other) or string with validation
   - description text nullable
   - target_duration_minutes nullable int
   - target_distance_meters nullable int
   - created_at, updated_at
2) Migration for workouts table.
3) Tests:
   - can insert a workout for a user

Acceptance:
- Tests pass.
```

---

## Prompt 6.2 — Workouts CRUD endpoints mirroring Routes + tests

```text
Implement Step 6.2 from plan.md.

Goal: Add workouts router with full CRUD, following the same patterns as routes.

Requirements:
1) Add app/schemas/workout.py: WorkoutCreate, WorkoutRead, WorkoutUpdate.
2) Add app/api/routers/workouts.py and wire into app/main.py.
3) Implement:
   - POST /workouts
   - GET /workouts
   - GET /workouts/{id}
   - PUT /workouts/{id}
   - DELETE /workouts/{id}
4) Tests:
   - unauth rejected
   - ownership enforced
   - happy path for create/list/get/update/delete

Acceptance:
- Tests pass and endpoints are wired.
```

---

## Prompt 7.1 — Add CalendarEvent model + migration + minimal DB test

```text
Implement Step 7.1 from plan.md.

Goal: Add CalendarEvent model and migration.

Requirements:
1) Create app/db/models/calendar_event.py with:
   - id UUID pk
   - user_id FK -> users.id
   - date (DATE) non-null
   - title non-null
   - event_type (run/workout/rest/race/other) as enum or constrained string
   - route_id nullable FK -> routes.id
   - workout_id nullable FK -> workouts.id
   - notes nullable
   - status (planned/completed/skipped) default planned
   - created_at, updated_at
2) Migration for calendar_events table.
3) Tests:
   - can insert an event

Acceptance:
- Tests pass.
```

---

## Prompt 7.2 — POST /calendar/events with ownership validation + tests

```text
Implement Step 7.2 from plan.md.

Goal: Create an authenticated endpoint to create calendar events and validate referenced route/workout ownership.

Requirements:
1) Add app/schemas/calendar_event.py:
   - CalendarEventCreate (date, title, event_type, route_id?, workout_id?, notes?, status?)
   - CalendarEventRead
   - CalendarEventUpdate
2) Add app/api/routers/calendar.py wired into app/main.py.
3) POST /calendar/events:
   - Requires auth
   - If route_id provided: ensure route exists and belongs to user
   - If workout_id provided: ensure workout exists and belongs to user
   - Create event
4) Tests:
   - create event with no references works
   - create event referencing own route/workout works
   - referencing another user's route/workout fails (403/404 consistent with your policy)

Acceptance:
- Tests pass and router wired.
```

---

## Prompt 7.3 — GET /calendar/events date-range query + tests

```text
Implement Step 7.3 from plan.md.

Goal: Add endpoint to fetch calendar events in an inclusive date range.

Requirements:
1) GET /calendar/events?start=YYYY-MM-DD&end=YYYY-MM-DD
   - Requires auth
   - Validates start <= end
   - Returns events for current user with date between start and end inclusive
2) Tests:
   - returns only items in range
   - returns only current user's items
   - invalid range returns 422 or 400 with a clear error

Acceptance:
- Tests pass.
```

---

## Prompt 7.4 — Calendar event GET/PUT/DELETE + tests

```text
Implement Step 7.4 from plan.md.

Goal: Complete CRUD for calendar events.

Requirements:
1) Implement:
   - GET /calendar/events/{id}
   - PUT /calendar/events/{id}
   - DELETE /calendar/events/{id} -> 204
2) Ownership enforcement for all.
3) Tests:
   - get/update/delete own event works
   - cannot access others
   - missing id returns 404

Acceptance:
- Tests pass.
```

---

## Prompt 8.1 — Pagination (limit/offset) for list endpoints + tests

```text
Implement Step 8.1 from plan.md.

Goal: Add simple pagination to list endpoints:
- GET /routes
- GET /workouts
- GET /calendar/events (date range endpoint may also accept pagination)

Requirements:
1) Add optional query params: limit (default 50, max 200) and offset (default 0).
2) Apply ordering consistently (e.g., created_at desc or date asc for calendar range).
3) Tests:
   - create multiple items and verify limit/offset slices correctly.

Acceptance:
- Tests pass.
- Backwards compatible defaults.
```

---

## Prompt 8.2 — Consistent error handling (401/403/404) + tests

```text
Implement Step 8.2 from plan.md.

Goal: Make error behavior consistent across resources and add tests to lock it down.

Requirements:
1) Pick a policy and apply consistently:
   - 401: missing/invalid token
   - 404: resource not found (and optionally also when it exists but belongs to another user to avoid leaking)
   - OR 403 for forbidden access (be consistent everywhere)
2) Refactor duplicated ownership checks into helper functions in services/ or router utilities.
3) Tests:
   - Ensure at least one endpoint per resource confirms the chosen policy (routes/workouts/events).

Acceptance:
- Tests pass and behavior is consistent across endpoints.
```

---

## Prompt 8.3 — Final wiring & documentation pass (no new features)

```text
Implement Step 8.3 from plan.md.

Goal: Ensure everything is wired together cleanly and the developer experience is straightforward.

Requirements:
1) Add OpenAPI tags and short descriptions for routers.
2) Add a minimal README.md with:
   - setup
   - env vars
   - run server
   - run tests
   - run migrations
3) Make sure imports, router registration, and directory structure are consistent.
4) Do not introduce new functionality beyond documentation and minor wiring cleanup.
5) All tests must pass.

Acceptance:
- Tests pass.
- A new developer can run the server and tests by following README.
```

---
## Optional prompts (only if needed)

### Optional — Docker Compose for Postgres (Ops)
```text
Add docker-compose.yml for a local Postgres, plus instructions in README.
Do not change application logic beyond DATABASE_URL examples.
Add no tests unless you already have integration tests requiring Postgres.
Keep all existing tests passing.
```

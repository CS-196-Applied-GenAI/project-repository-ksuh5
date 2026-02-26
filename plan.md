# Backend Blueprint (Python) — Running Routes + Calendar + Scheduled Workouts

Current date: 2026-02-26  
Audience: someone with limited fullstack familiarity  
Goal: a simple, testable Python backend for:
- runners creating/saving **routes**
- adding routes to a **calendar**
- **scheduling runs and workouts**
- retrieving plans by day/week/month

> Note: You referenced a “spec document” but it wasn’t included in the chat. This plan is written to match your description; if you paste the spec, I can align fields, edge-cases, and endpoints exactly.

---

## 0) Tech choices (keep it boring)

### Stack
- **Framework**: FastAPI (simple, typed, great docs)
- **DB**: PostgreSQL (via SQLAlchemy)
- **Migrations**: Alembic
- **Auth**: Email + password (JWT access token) OR “magic link” later (start with password)
- **Validation**: Pydantic models
- **Testing**: Pytest + httpx TestClient (or FastAPI TestClient)
- **Containerization (optional early, recommended)**: Docker Compose for Postgres

### Project structure (simple but scalable)
```
app/
  main.py
  api/
    deps.py
    routers/
      auth.py
      routes.py
      calendar.py
      workouts.py
      health.py
  core/
    config.py
    security.py
    logging.py
  db/
    base.py
    session.py
    models/
      user.py
      route.py
      workout.py
      calendar_event.py
  schemas/
    user.py
    route.py
    workout.py
    calendar_event.py
  services/
    route_service.py
    schedule_service.py
    workout_service.py
  tests/
    conftest.py
    test_health.py
    test_auth.py
    test_routes.py
    test_calendar.py
    test_workouts.py
alembic/
  versions/
```

---

## 1) Core domain model (minimal, extend later)

### Entities

#### User
- `id` (uuid)
- `email` (unique)
- `password_hash`
- `created_at`

#### Route
A saved running route.
- `id` (uuid)
- `user_id` (fk)
- `name`
- `notes` (optional)
- **geometry**: start simple:
  - store an ordered list of lat/lng points as JSON (`polyline_points: [{lat, lng}, ...]`)
  - optionally store `distance_meters` (computed client-side at first)
- `created_at`, `updated_at`

#### Workout
A workout template (e.g., “Easy Run 30 min”, “Intervals 6x400m”).
- `id` (uuid)
- `user_id` (fk)
- `name`
- `type` (enum: easy, tempo, intervals, long_run, strength, other)
- `description` (text)
- `target_duration_minutes` (optional)
- `target_distance_meters` (optional)
- `created_at`, `updated_at`

#### CalendarEvent (Scheduled item)
This is what appears on the calendar.
- `id` (uuid)
- `user_id` (fk)
- `date` (YYYY-MM-DD) OR `start_datetime` (if you want time-of-day)
- `title` (string)
- `event_type` (enum: run, workout, rest, race, other)
- `route_id` (optional fk)
- `workout_id` (optional fk)
- `notes` (optional)
- `status` (planned, completed, skipped)
- `created_at`, `updated_at`

**Rules (keep minimal)**
- A CalendarEvent belongs to exactly one user.
- `route_id` and `workout_id` are optional; an event can reference either or both.
- Later: recurring events, sharing, coach access, etc.

---

## 2) API surface (first version)

### Health
- `GET /health` → `{status: "ok"}`

### Auth
- `POST /auth/register` (email, password)
- `POST /auth/login` (email, password) → access token
- (Optional later) `POST /auth/logout` (client-side token discard)

### Routes
- `POST /routes`
- `GET /routes` (list mine)
- `GET /routes/{route_id}`
- `PUT /routes/{route_id}`
- `DELETE /routes/{route_id}`

### Workouts
- `POST /workouts`
- `GET /workouts`
- `GET /workouts/{workout_id}`
- `PUT /workouts/{workout_id}`
- `DELETE /workouts/{workout_id}`

### Calendar / Schedule
- `POST /calendar/events`
- `GET /calendar/events?start=YYYY-MM-DD&end=YYYY-MM-DD`
- `GET /calendar/events/{event_id}`
- `PUT /calendar/events/{event_id}`
- `DELETE /calendar/events/{event_id}`

**Why this shape**
- You can build the UI with basic CRUD + a calendar view that queries a date range.

---

## 3) Backend building blocks (step-by-step)

### A) Configuration
- `DATABASE_URL`
- `JWT_SECRET`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`
- password hashing settings

### B) Database layer
- SQLAlchemy models + relationships
- Alembic migrations
- Session management per request

### C) Security
- Password hashing (passlib/bcrypt)
- JWT issuance + dependency that extracts current user from Authorization header

### D) Services (where logic lives)
- RouteService: create/update, ensure ownership
- WorkoutService: create/update, ensure ownership
- ScheduleService:
  - create event referencing route/workout
  - validate referenced objects belong to the same user
  - query by date range

### E) Testing approach
- Use a test database (recommended: Postgres in Docker) or SQLite for speed (but Postgres is closer to prod)
- Pytest fixtures:
  - `db_session`
  - `client`
  - `user_factory`, `auth_headers`
- For each endpoint:
  - happy path
  - unauthorized
  - forbidden (access someone else’s data)
  - validation errors (bad dates, missing fields)

---

## 4) Iterative delivery plan (chunks that build on each other)

### Round 1 — Large chunks
1. **Project skeleton + health endpoint + test harness**
2. **Database setup + migrations + User model**
3. **Auth (register/login) with JWT**
4. **Routes CRUD**
5. **Workouts CRUD**
6. **Calendar events CRUD + date-range query**
7. **Hardening: permissions, validation, error handling, pagination**
8. **Operational basics: Docker Compose, env docs, seed data (optional)**

---

## 5) Round 2 — Break chunks into smaller iterations

### Chunk 1: Skeleton + health
1.1 Create FastAPI app + `/health`  
1.2 Add pytest + a single health test  
1.3 Add basic logging + config loader (env vars)

### Chunk 2: DB + migrations + user
2.1 Add SQLAlchemy + DB session dependency  
2.2 Create `User` model  
2.3 Add Alembic + initial migration  
2.4 Add test DB fixture and verify a simple DB operation works

### Chunk 3: Auth
3.1 Password hashing helpers  
3.2 `POST /auth/register` + tests  
3.3 `POST /auth/login` + tests  
3.4 `get_current_user` dependency + a protected test endpoint

### Chunk 4: Routes CRUD
4.1 Create `Route` model + migration  
4.2 `POST /routes` + tests  
4.3 `GET /routes` (list) + tests  
4.4 `GET /routes/{id}` + tests  
4.5 `PUT /routes/{id}` + tests  
4.6 `DELETE /routes/{id}` + tests  
4.7 Ownership enforcement tests (cannot access others)

### Chunk 5: Workouts CRUD
5.1 Create `Workout` model + migration  
5.2 CRUD endpoints + tests (same pattern as routes)  
5.3 Ownership enforcement tests

### Chunk 6: Calendar events
6.1 Create `CalendarEvent` model + migration  
6.2 `POST /calendar/events` + validate route/workout ownership + tests  
6.3 `GET /calendar/events?start&end` + tests (range query)  
6.4 Single event GET/PUT/DELETE + tests  
6.5 Status transitions (planned/completed/skipped) basic validation + tests

### Chunk 7: Hardening
7.1 Consistent error responses (404 vs 403) + tests  
7.2 Pagination for list endpoints (limit/offset) + tests  
7.3 Basic input constraints (max lengths, date format) + tests

### Chunk 8: Ops
8.1 Docker compose for Postgres  
8.2 `README` run instructions  
8.3 Minimal seed script (optional)

---

## 6) Round 3 — Make steps “right-sized” (safe + testable)

Below is the final set of “right-sized” steps. Each step should:
- be doable in ~1–3 hours for a beginner-friendly pace
- include tests
- leave the main branch working

### Step 0 — Repo init (no DB yet)
0.1 Create FastAPI app with `/health`  
**Tests**: `test_health_ok`

0.2 Add configuration module (reads env, provides defaults for dev)  
**Tests**: unit test config parsing (optional), at least import test

---

### Step 1 — DB foundation
1.1 Add SQLAlchemy engine + `SessionLocal` + request-scoped dependency  
**Tests**: can create a session in tests

1.2 Add Alembic and generate an empty baseline migration  
**Tests**: in CI/local, run migrations then run tests (documented)

---

### Step 2 — User model + basic persistence
2.1 Implement `User` model + migration  
**Tests**: create user directly in DB, verify uniqueness constraint works (or at least behaves)

2.2 Add `schemas/user.py` (Pydantic) for responses (no password leak)  
**Tests**: serialization doesn’t include password_hash

---

### Step 3 — Security primitives
3.1 Password hashing utilities (hash + verify)  
**Tests**: hash/verify roundtrip; verify fails for wrong pw

3.2 JWT utilities (create token + decode/validate)  
**Tests**: token contains `sub=user_id`; expired token rejected (if you implement expiry)

---

### Step 4 — Auth endpoints
4.1 `POST /auth/register`  
- validates email format
- rejects duplicates
- stores hashed password  
**Tests**: successful register; duplicate email fails

4.2 `POST /auth/login`  
- returns JWT  
**Tests**: login success; wrong password fails

4.3 Auth dependency `get_current_user` + protect a dummy endpoint `GET /me`  
**Tests**: unauthorized rejected; authorized returns my user

---

### Step 5 — Routes (minimal CRUD)
5.1 Add `Route` model + migration (store points JSON)  
**Tests**: migration applies; can insert a route

5.2 `POST /routes` (authenticated)  
**Tests**: create route; unauth rejected

5.3 `GET /routes` list (authenticated)  
**Tests**: returns only my routes

5.4 `GET /routes/{id}` + ownership enforcement  
**Tests**: can read mine; cannot read someone else’s

5.5 `PUT /routes/{id}`  
**Tests**: update name/points; cannot update others

5.6 `DELETE /routes/{id}`  
**Tests**: delete mine; cannot delete others

---

### Step 6 — Workouts (minimal CRUD)
6.1 Add `Workout` model + migration  
**Tests**: can insert

6.2 Implement CRUD endpoints mirroring Routes  
**Tests**: same coverage: auth + ownership + validation

---

### Step 7 — Calendar events (the scheduler)
7.1 Add `CalendarEvent` model + migration  
- include `date` (simple) and `status`  
**Tests**: can insert

7.2 `POST /calendar/events`  
- validate referenced `route_id`/`workout_id` exist and belong to user  
**Tests**: create event; reject referencing others’ route/workout

7.3 `GET /calendar/events?start&end`  
- inclusive range  
**Tests**: returns events within range only; only mine

7.4 `GET /calendar/events/{id}`, `PUT`, `DELETE`  
**Tests**: standard auth + ownership tests

---

### Step 8 — Small “quality” improvements (keep limited)
8.1 Add pagination to list endpoints (`limit`, `offset`)  
**Tests**: limit works

8.2 Add consistent error handling pattern  
- 401 unauthorized, 403 forbidden, 404 not found  
**Tests**: check codes for common cases

8.3 Add minimal OpenAPI tags + descriptions (FastAPI does most of this)  
**Tests**: none required

---

## 7) Acceptance criteria (for “backend v1”)
- A user can register/login and receive a token
- A user can CRUD routes and workouts
- A user can schedule calendar events with optional route/workout references
- A user can query their calendar for a date range
- Tests cover auth, permissions, and basic validation
- Migrations produce the schema from scratch

---

## 8) Testing checklist (quick)
For each resource (routes, workouts, events):
- [ ] 401 when no token
- [ ] 403 when accessing another user’s resource (or 404 if you prefer not to leak existence—pick one and be consistent)
- [ ] 404 on missing id
- [ ] happy path CRUD works
- [ ] list endpoints only return my data

---

## 9) “Later” (explicitly out of scope for first pass)
- Route generation / map-matching / GPX import/export
- Distance/time calculations server-side
- Recurring events, training plans, notifications
- Social sharing, multi-user calendars
- Admin tooling

---

## 10) Questions to confirm (optional, but helps)
1. Do calendar items need **time-of-day** or just date?
2. Should “workouts” be **templates** (reused) or one-off scheduled workouts only?
3. Do you want to support **GPX** uploads or only lat/lng point lists for now?
4. Any need for **public** routes or everything private?

If you paste the spec document, I can update the models/endpoints and ensure naming matches it exactly.

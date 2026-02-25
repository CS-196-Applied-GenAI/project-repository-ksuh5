# Backend Blueprint (v1) — Running Planner + Workouts + Routes + Mileage + Injury Adaptation

Current date: 2026-02-25  
Owner login: ksuh5

This document is a step-by-step blueprint for building the backend, followed by iterative decomposition into right-sized implementation steps with testing expectations.

---

## 0) What we are building (backend responsibilities)

### Core backend capabilities
1. **Users & Preferences**
   - Units (mi/km)
   - Days/week, weekly mileage target
   - Preferred long-run day
   - Hard sessions/week and type preferences
   - Fitness goal (adaptive plan)

2. **Performance Results (dated)**
   - Store race/time-trial/custom efforts
   - Distances: 1 mile, 3K, 5K, 10K, half, marathon + custom
   - Date required for each result

3. **Fitness Estimation**
   - Compute Daniels VDOT-style estimate per result
   - Pick current VDOT (best within last 90 days in v1)
   - Generate pace ranges per workout type (pace ranges + RPE guidance)

4. **Plan Generation**
   - Goal plan: requires race date + goal time + workout preferences
   - Adaptive plan: week-by-week generation (no race date)
   - Constraints:
     - at least 1 key workout/week (tempo/interval/hills)
     - no back-to-back hard days
     - long runs are *not always key*
   - Output: scheduled workouts on calendar (future dated items)

5. **Calendar + Scheduling**
   - CRUD scheduled workouts
   - Attach routes
   - Mark scheduled workouts: planned / completed / skipped

6. **Routes**
   - Save route templates and instances (polyline)
   - Compute/store distance (required), elevation gain (optional)
   - Attach route to scheduled workouts

7. **Logging / Completion**
   - Create completed workouts (linked to scheduled workouts when possible)
   - Store completed distance/duration/RPE/strides
   - Preserve immutability of completed data

8. **Mileage Accounting**
   - Planned vs completed totals over date windows
   - Stride rule:
     - strides add 0 miles unless stride_count ≥ 5
     - if ≥5: add conservative estimate of 80m per stride
     - strides are additive on top of base run distance
   - Cross-training counts **time only**, 0 mileage

9. **Adaptation**
   - Non-injury: missed runs, extra rest, cross-training substitution
     - cross-training similarity: duration ±10% and RPE ±1 vs planned run
     - if similar: do not make up miles
     - if not similar: make up only 50–75% missed mileage (easy), respecting constraints
   - Injury: pain thresholds + return-to-run progression + relapse rules

### Non-goals (v1)
- HR-zone based prescriptions (use pace + RPE)
- Counting cross-training as mileage equivalents
- Complex training load modeling (CTL/ATL)

---

## 1) Architecture blueprint

### 1.1 API style
- REST/JSON (v1), versioned under `/api/v1`
- Idempotency on key write operations where helpful (e.g., completion events)
- Pagination on list endpoints

### 1.2 Suggested tech choices (can be swapped)
- Language/runtime: Node.js (TypeScript) or Python (FastAPI)
- DB: Postgres
- Migrations: Prisma/Drizzle (TS) or Alembic/SQLModel (Python)
- Auth: session or JWT (v1 can be simple; use user id from auth middleware)
- Background jobs: optional in v1; can do synchronous generation for now
- Geo: store polyline as text + distance meters; PostGIS optional later

### 1.3 Separation of concerns
- **Domain services** (pure logic):
  - VDOT computation, pace zones
  - plan generator
  - mileage calculator
  - adaptation engine (non-injury + injury)
- **Repositories** (DB I/O):
  - users, results, plans, workouts, routes, injury reports
- **Controllers/handlers**:
  - validate input, call services, return DTOs

### 1.4 Key invariants to enforce
- PerformanceResult.date is required
- CompletedWorkout is immutable after creation (except possibly notes)
- No back-to-back hard days in generated plan
- Stride distance is computed consistently everywhere
- Cross-training never increments mileage totals

---

## 2) Data model (minimum viable schema)

> Store canonical distances in meters and times in seconds.

### 2.1 users
- id (pk)
- login (unique)
- units (`mi`|`km`)
- created_at, updated_at

### 2.2 user_preferences
- user_id (pk/fk users)
- days_per_week (int)
- weekly_mileage_target_m (int, nullable)
- preferred_long_run_weekday (0-6)
- hard_sessions_per_week (int)
- hard_session_type_preferences (json)
- fitness_goal (enum/string)

### 2.3 performance_results
- id (pk)
- user_id (fk)
- distance_m (int)
- time_s (int)
- result_date (date) **required**
- label (string) e.g., "5K race", "TT", "custom"
- created_at

### 2.4 fitness_profiles
- user_id (pk/fk)
- current_vdot (numeric)
- source_result_id (fk performance_results)
- computed_at

### 2.5 training_plans
- id (pk)
- user_id (fk)
- plan_type (`goal`|`adaptive`)
- start_date, end_date (date, nullable for rolling)
- race_date (date, nullable)
- goal_time_s (int, nullable)
- generation_params (json)
- created_at

### 2.6 scheduled_workouts
- id (pk)
- user_id (fk)
- plan_id (fk nullable)
- workout_date (date)
- workout_type (enum)
- planned_distance_m (int, nullable)
- planned_duration_s (int, nullable)
- planned_rpe (numeric/int nullable)
- target_paces (json nullable)  // pace ranges per segment or per workout
- stride_count (int default 0)
- route_instance_id (fk nullable)
- status (`planned`|`completed`|`skipped`)
- created_at, updated_at

### 2.7 completed_workouts
- id (pk)
- user_id (fk)
- scheduled_workout_id (fk nullable unique)
- start_time (timestamp)
- completed_distance_m (int)
- completed_duration_s (int)
- rpe (numeric/int nullable)
- stride_count (int default 0)
- route_instance_id (fk nullable)
- created_at

### 2.8 route_templates
- id (pk)
- user_id (fk)
- name (string)
- polyline (text)
- distance_m (int)
- elevation_gain_m (int nullable)
- created_at, updated_at

### 2.9 route_instances
- id (pk)
- user_id (fk)
- template_id (fk nullable)
- polyline (text)
- distance_m (int)
- elevation_gain_m (int nullable)
- created_at

### 2.10 injury_reports
- id (pk)
- user_id (fk)
- start_date (date)
- pain_level (int 1-10)
- can_run (bool)
- allowed_activities (json array)
- injury_body_part (string)
- status (`active`|`resolved`)
- created_at, updated_at

---

## 3) Domain logic specs (implementable)

### 3.1 Stride distance calculator
- Input: stride_count
- If stride_count ≤ 4 => 0
- Else: stride_distance_m = stride_count * 80
- Total run distance = base_run_distance + stride_distance_m

### 3.2 Mileage counters
For a date range:
- planned_m = sum over scheduled_workouts where status != skipped AND workout_type is running:
  - (planned_distance_m || 0) + stride_distance_m(stride_count)
- completed_m = sum over completed_workouts:
  - completed_distance_m + stride_distance_m(stride_count)

Cross-training contributes 0 to both mileage totals.

### 3.3 Cross-training similarity
Given planned run duration and planned RPE:
- similar iff:
  - |xt_duration - planned_duration| / planned_duration ≤ 0.10
  - |xt_rpe - planned_rpe| ≤ 1
If a planned run has distance only (no duration):
- derive planned_duration from the relevant easy/long pace estimate (VDOT-based) and distance.

### 3.4 Key workouts & constraints
- Key workouts are only: tempo, intervals, hills
- Must schedule at least 1 key workout/week
- No back-to-back key workouts (hard days) — enforce during generation and during user edits (warn or block)

### 3.5 Injury adaptation (recap)
- pain < 2 => Option 3
- pain ≥ 4 => Option 2
- pain ≥ 6 => Option 1 (pause)
Option 1:
- at least 1 day no running
- introduce cross-training if allowed
- if no improvement, extend by +1 day
Return:
- can_run && pain ≤ 2 (1 day)
- easy only at 50–60% pre-injury volume
- +10% weekly until full
Workouts:
- none until 1 week easy without relapse
- relapse = pain > 4 => drop to cross-training/no-running modes
- explicit confirmation before first quality session

---

## 4) API endpoint blueprint (v1)

### 4.1 Users / preferences
- GET `/api/v1/me`
- PUT `/api/v1/me/preferences`

### 4.2 Performance results
- POST `/api/v1/performance-results`
- GET `/api/v1/performance-results`
- DELETE `/api/v1/performance-results/:id`

### 4.3 Fitness profile
- GET `/api/v1/fitness-profile` (returns current vdot + derived paces)

### 4.4 Plans
- POST `/api/v1/plans/goal` (race date + goal time required)
- POST `/api/v1/plans/adaptive` (no race date)
- GET `/api/v1/plans/:id`
- POST `/api/v1/plans/:id/generate-week` (adaptive)

### 4.5 Scheduled workouts
- POST `/api/v1/scheduled-workouts`
- GET `/api/v1/scheduled-workouts?start=YYYY-MM-DD&end=YYYY-MM-DD`
- PATCH `/api/v1/scheduled-workouts/:id`
- POST `/api/v1/scheduled-workouts/:id/skip`
- POST `/api/v1/scheduled-workouts/:id/complete` (creates completed_workout)

### 4.6 Completed workouts
- GET `/api/v1/completed-workouts?start=...&end=...`
- GET `/api/v1/completed-workouts/:id`

### 4.7 Routes
- POST `/api/v1/routes/templates`
- GET `/api/v1/routes/templates`
- POST `/api/v1/routes/instances` (create from draw or from template)
- GET `/api/v1/routes/instances/:id`

### 4.8 Mileage totals
- GET `/api/v1/mileage?start=...&end=...`
  - returns planned_miles, completed_miles, plus optional breakdown by day

### 4.9 Injury
- POST `/api/v1/injury-reports` (create/activate)
- PATCH `/api/v1/injury-reports/:id` (update pain/can_run/etc.)
- POST `/api/v1/injury-reports/:id/resolve`
- GET `/api/v1/injury-reports/active`

---

## 5) Testing strategy (backend)

### 5.1 Unit tests (pure domain)
- stride distance calculator
- mileage aggregation logic
- cross-training similarity predicate
- hard-day constraint checker
- injury state machine (thresholds, relapse behavior)
- VDOT conversion + pace zone derivation (golden tests with known examples)

### 5.2 Integration tests (API + DB)
- create results => fitness profile updates
- generate plan => scheduled workouts created with constraints
- complete workout => completed mileage increments, planned unchanged
- skip => planned totals drop (if you implement that behavior)
- attach route => planned distance uses route distance
- mileage endpoint matches sums in DB

### 5.3 Contract tests / fixtures
- stable JSON shapes for key endpoints
- date boundary tests for weekly totals

---

## 6) Iterative build chunks (Round 1 — coarse)

1. Project skeleton + DB + migrations + auth stub
2. Users/preferences + performance results CRUD
3. VDOT + pace derivation service + fitness-profile endpoint
4. Scheduled workouts CRUD + calendar range queries
5. Completed workouts + linking to scheduled + immutability rules
6. Mileage totals endpoint + stride rules + cross-training time-only
7. Plan generation (goal + adaptive) with key workout + no-back-to-back-hard constraint
8. Adaptation engine (missed runs + cross-training similarity)
9. Injury reporting + injury adaptation + return-to-run progression
10. Routes (templates + instances) + attach to workouts + distance integration
11. Hardening: testing, validation, observability, performance

---

## 7) Iterative chunks (Round 2 — smaller, buildable increments)

### Chunk 1: Infrastructure baseline
1.1 Create API server skeleton, health endpoint, request logging  
1.2 Set up Postgres, migrations, test database  
1.3 Add basic auth middleware (dev: fixed user; prod: pluggable)  

### Chunk 2: User preferences
2.1 Create `users` and `user_preferences` tables + CRUD endpoints  
2.2 Validation: units, weekdays, days/week bounds  
2.3 Unit tests for preferences validation  

### Chunk 3: Performance results
3.1 Create performance results table + endpoints  
3.2 Enforce required date + distance/time validation  
3.3 Integration tests for CRUD  

### Chunk 4: VDOT + pace service
4.1 Implement VDOT computation module (stubbed lookup first)  
4.2 Select current VDOT (best within 90 days)  
4.3 Derive pace ranges + expose `/fitness-profile`  
4.4 Golden tests for VDOT and paces  

### Chunk 5: Scheduled workouts
5.1 Schema + endpoints to create/update/list scheduled workouts  
5.2 Calendar range query (start/end date)  
5.3 Enforce workout_type enums, stride_count default  
5.4 Unit tests for hard-day classification helper  

### Chunk 6: Completion logging
6.1 Create completed_workouts + endpoint to complete scheduled workout  
6.2 Enforce 1:1 link uniqueness (scheduled_workout_id unique)  
6.3 Make completed workouts immutable (no PATCH except maybe notes)  
6.4 Integration tests: complete run persists, scheduled status flips  

### Chunk 7: Mileage totals
7.1 Implement stride mileage calculator (≥5 => 80m each)  
7.2 Implement planned and completed aggregation queries  
7.3 Implement `/mileage` endpoint  
7.4 Tests: stride threshold, cross-training excluded, date ranges  

### Chunk 8: Routes
8.1 Route templates CRUD (store polyline + distance)  
8.2 Route instances creation from template/draw  
8.3 Attach route_instance_id to scheduled workout  
8.4 Planned distance default from route instance if missing  
8.5 Tests: attaching routes updates planned distance appropriately  

### Chunk 9: Plan generation
9.1 Minimal plan record creation (goal/adaptive)  
9.2 Generate 1 week of scheduled workouts from preferences + VDOT paces  
9.3 Enforce no back-to-back hard days  
9.4 Ensure ≥1 key workout/week  
9.5 Tests: constraint satisfaction and stable output  

### Chunk 10: Adaptation (non-injury)
10.1 Missed run handling: compute missed mileage and make-up cap 50–75%  
10.2 Cross-training similarity predicate (±10% duration, ±1 RPE)  
10.3 Rescheduler that respects hard-day constraints  
10.4 Tests: make-up rules + no back-to-back hard days  

### Chunk 11: Injury system
11.1 Injury report endpoints + active injury retrieval  
11.2 Injury option selection based on pain thresholds  
11.3 Return-to-run progression (50–60%, +10% weekly)  
11.4 Relapse handling (pain > 4) and dropping modes  
11.5 Explicit confirmation gating flag for first workout back  
11.6 Tests: injury state transitions + relapse resets  

---

## 8) Iterative steps (Round 3 — right-sized PR-sized steps)

Each step below is intended to be implementable safely with strong testing and minimal coupling.

### Step 0: Repo baseline
0.1 Add linting/formatting, CI, and a test runner  
0.2 Add health check endpoint + simple DB connection check test  

### Step 1: DB + migration foundation
1.1 Add migrations framework and create base `users` table  
1.2 Add test DB setup + migration run in CI  

### Step 2: Preferences MVP
2.1 Add `user_preferences` table  
2.2 Implement GET/PUT `/me/preferences` with validation  
2.3 Integration test: save and fetch preferences  

### Step 3: Performance results MVP
3.1 Add `performance_results` table  
3.2 Implement POST/GET/DELETE endpoints  
3.3 Validate required date; validate distance/time > 0  
3.4 Integration tests for CRUD and ownership scoping  

### Step 4: Fitness profile MVP (VDOT stub -> real)
4.1 Create `fitness_profiles` table  
4.2 Implement a VDOT interface + stub implementation (returns deterministic values)  
4.3 Implement `/fitness-profile` endpoint using stub  
4.4 Unit tests for selection logic (best within 90 days)  
4.5 Replace stub with Daniels-style table/model and add golden tests  

### Step 5: Scheduled workouts MVP
5.1 Add `training_plans` and `scheduled_workouts` tables  
5.2 Implement scheduled workouts CRUD + list by date range  
5.3 Add hard-day classification helper + unit tests  

### Step 6: Completed workouts MVP
6.1 Add `completed_workouts` table with unique scheduled link  
6.2 Implement complete endpoint to create completed workout and mark scheduled completed  
6.3 Integration tests for linkage and immutability expectation  

### Step 7: Mileage endpoint MVP
7.1 Implement stride distance helper (threshold + 80m) with unit tests  
7.2 Implement `/mileage` endpoint with planned vs completed totals  
7.3 Integration tests covering:
   - cross-training excluded
   - strides add only when ≥5
   - strides additive on top

### Step 8: Route storage MVP
8.1 Add `route_templates` and `route_instances` tables  
8.2 Implement create/list route templates  
8.3 Implement create route instance (from draw)  
8.4 Tests: distance stored and returned correctly  

### Step 9: Attach route to workout
9.1 Add route_instance_id to scheduled_workouts (migration)  
9.2 Implement attach endpoint or PATCH scheduled workout to set route  
9.3 Business rule: if planned_distance is null, default it to route distance  
9.4 Integration tests for defaulting behavior  

### Step 10: Generate a 1-week plan (goal)
10.1 Implement plan creation endpoint `/plans/goal`  
10.2 Implement generator producing 7 days of scheduled workouts with at least 1 key workout  
10.3 Enforce no back-to-back hard days  
10.4 Integration test: generated week satisfies constraints  

### Step 11: Generate a 1-week plan (adaptive)
11.1 Implement plan creation endpoint `/plans/adaptive`  
11.2 Implement `/plans/:id/generate-week` producing next week  
11.3 Test: respects user preferences and constraints  

### Step 12: Cross-training similarity predicate
12.1 Add helper: derive planned duration when only distance exists (uses VDOT easy/long pace)  
12.2 Implement similarity check: duration ±10% and RPE ±1  
12.3 Unit tests for boundary conditions  

### Step 13: Missed-run make-up logic
13.1 Implement missed-run detector (scheduled planned, not completed, not skipped by end of day/week)  
13.2 Implement make-up rule: 50–75% cap (easy miles only)  
13.3 Ensure reschedule does not violate no back-to-back hard days  
13.4 Tests: make-up miles bounded and scheduled safely  

### Step 14: Injury endpoints
14.1 Add `injury_reports` table + active retrieval  
14.2 Implement POST/PATCH/resolve endpoints with validation  
14.3 Integration tests for lifecycle  

### Step 15: Injury adaptation engine
15.1 Implement option selection based on pain thresholds  
15.2 Implement Option 1 rest extension (+1 day each no-improvement)  
15.3 Implement return-to-run progression (50–60%, +10% weekly)  
15.4 Implement relapse rule (pain > 4 => drop to cross-training/no-run)  
15.5 Implement explicit confirmation flag for first quality session back  
15.6 Unit/integration tests for transitions  

---

## 9) Final review: are steps right-sized?

### Why these steps are “safe”
- Each step adds a small number of tables and endpoints.
- Domain logic is separated into unit-testable modules.
- Integration tests ensure DB + API correctness at every milestone.
- Hard constraints (stride rules, key workout definition, no back-to-back hard days) are enforced early.

### Why these steps still move fast
- You get value early: preferences + results + VDOT paces + calendar + mileage.
- Plan generation becomes possible once workouts + paces exist.
- Routes can be added after the calendar is usable.
- Adaptation and injury features come after core tracking is stable.

---

## 10) Implementation notes / guardrails (recommendations)
- Store all distances in meters, pace in seconds per km internally; convert at API boundary based on user units.
- Always scope queries by authenticated user id.
- Avoid updating completed_workouts; prefer append-only with audit fields if you later need edits.
- Add consistent date handling (UTC) and define week boundaries (e.g., Monday start vs user setting if needed later).

---

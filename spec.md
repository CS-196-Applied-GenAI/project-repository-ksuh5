# Product + Backend Spec (v1) — Running Planner, Workouts, Routes, Mileage, Injury Adaptation

Current date: 2026-02-26  
Primary user: `ksuh5`  
Platforms: Web (first)  
Backend: Python (FastAPI)  
Frontend: JavaScript (web)

---

## 1) Problem statement

Build a web-first running training app that:
- Generates training plans (race-based or adaptive week-by-week).
- Schedules future runs on a calendar.
- Allows users to plan/draw running routes for scheduled runs.
- Prescribes workout paces using **Daniels VDOT-style equivalency tables**, expressed as **target pace ranges + RPE**.
- Tracks **planned mileage vs completed mileage** (with special stride counting rules).
- Adapts plans for missed runs, cross-training substitution, and injury/pain.

---

## 2) Key definitions

### 2.1 Workout types
Running (counts toward mileage):
- `easy`, `recovery`, `long`, `tempo`, `intervals`, `hills`

Non-running (does not count toward mileage):
- `cross_train` (time only), `strength`, `mobility`, `rest`

### 2.2 Hard day / Key workout
- Hard day = `tempo` OR `intervals` OR `hills`
- Key workouts are only: `tempo`, `intervals`, `hills`
- Constraint: **no back-to-back hard days**

### 2.3 Plan types
- **Goal plan**: requires race date + goal time
- **Adaptive plan**: no race date; generates week-by-week

### 2.4 Units
- Canonical storage: distance in **meters**, time in **seconds**
- Display and API responses may be in `mi` or `km` depending on user preference.

---

## 3) Required user inputs (v1)

### 3.1 For goal plans
Minimum required:
- Race date (required)
- Goal time (required)
- Preferred long-run day
- Types of workouts desired (e.g., tempo/interval/hills selection)

### 3.2 For adaptive plans (no race date)
User must be able to set:
- Weekly mileage target
- Days per week
- Number of hard sessions per week
- Intensity preferences:
  - how many hard sessions they want
  - what type of intensity they want during hard sessions (e.g., speedwork) and pacing style (pace ranges + RPE)
- Fitness goal (user-defined category; string/enum)

### 3.3 Performance results (for VDOT)
User enters **dated** results for:
- 1 mile, 3K, 5K, 10K, half marathon, marathon (first-class)
- Custom distance/time (allowed)
- **Date is required for each result**

---

## 4) Fitness estimation and pacing

### 4.1 VDOT estimation (no training history)
- When the user has no logged training history, estimate fitness from performance results:
  - Compute VDOT-like estimate from each result using Daniels VDOT-style equivalency tables/model.
  - Choose current fitness as the **best (highest) VDOT within last 90 days** (v1 default).

### 4.2 Prescribed pacing format
- Prescribe workouts using:
  - **target pace ranges** (primary)
  - **RPE guidance** (secondary)
- No HR-based prescribing in v1.

### 4.3 Pace categories (minimum)
Return pace ranges for at least:
- Easy / Recovery
- Tempo / Threshold
- Intervals / VO₂max

(Optionally long-run and repetition can be added later.)

---

## 5) Calendar scheduling and logging

### 5.1 Scheduling
Users can:
- Create, edit, delete (optional), and move scheduled workouts.
- Attach an optional planned route to a scheduled workout.
- Mark scheduled workouts: `planned`, `completed`, `skipped`.

### 5.2 Completion logging
When completing a scheduled workout, store:
- Completed distance (meters)
- Completed duration (seconds)
- RPE
- Stride count
- Link back to scheduled workout
- Completed workouts should be treated as **immutable** after creation in v1.

---

## 6) Routes (planning and reuse)

### 6.1 Route drawing and storage
Users can:
- Draw a route (polyline) and save it as a route instance.
- Save reusable route templates.

Store per route:
- polyline
- computed distance (required)
- elevation gain (optional)

### 6.2 Attaching routes to workouts
- A scheduled workout may reference a route instance.
- If a route is attached and the workout has no planned distance, default planned distance to the route’s distance.

---

## 7) Mileage counters (planned vs completed)

### 7.1 Planned mileage
Sum of scheduled running workouts (easy/recovery/long/tempo/intervals/hills) in a date window where:
- status is not `skipped`
- includes stride additive rule (below)

### 7.2 Completed mileage
Sum of completed running workouts in a date window:
- includes stride additive rule (below)

### 7.3 Stride additive rule (critical)
- Strides do **not** contribute to mileage unless **stride_count > 4**.
- If `stride_count >= 5`, estimate conservatively:
  - **80 meters per stride**
- Stride distance is **added on top of** the workout’s base distance.

### 7.4 Cross-training
- Cross training is tracked as **time only**
- Cross training contributes **0** to mileage totals

---

## 8) Non-injury adaptation rules (missed runs & cross-training substitution)

### 8.1 Key workout protection
- Tempo/intervals/hills are protected as key workouts.
- Long runs are **not always key** (they may be reduced/moved before key workouts if needed).

### 8.2 No back-to-back hard days
- Never schedule two key workouts on consecutive days.

### 8.3 Missed run make-up rules
If a run is missed due to extra rest:
- Make up only **50–75%** of missed mileage (easy running only), while respecting constraints.

### 8.4 Cross-training substitution similarity
Cross training is considered a sufficient substitute if:
- duration is within **±10%** of planned run duration AND
- RPE is within **±1** of planned run RPE

If cross training is similar:
- do **not** add make-up mileage

If not similar:
- optionally add make-up mileage (50–75% cap), easy only, respecting constraints.

---

## 9) Injury/pain system (critical)

### 9.1 Pain thresholds
- Pain < 2 → Option 3 (reduced intensity; easy running allowed)
- Pain >= 4 → Option 2 (cross-training / no running modes)
- Pain >= 6 → Option 1 (pause running)

### 9.2 Option 1: pause running logic
- Minimum rest: 1 day
- If no improvement: extend by **+1 day** each time

### 9.3 Return-to-run criteria
User can resume when:
- pain <= 2 AND
- user marks `can_run`
- only **1 day** at pain <= 2 required before resuming

Return volume:
- Start at **50–60%** of pre-injury volume
- Increase weekly volume by **10%** each week until full plan volume

### 9.4 Workouts reintroduction
- Workouts (tempo/interval/hills) are not allowed until the user has completed:
  - **at least 1 week of easy runs** without relapse

Relapse definition:
- pain rises **above 4**

If relapse occurs:
- drop to cross-training/no-running modes (Option 2/1 depending on severity)

Explicit gating:
- Require **explicit confirmation** before the first quality session back.

---

## 10) API specification (v1)

### 10.1 Authentication (v1)
- Web-first: cookie session or simple auth stub acceptable for early versions.
- All endpoints operate on the authenticated user.

### 10.2 Endpoints (minimum set)

Users / preferences:
- `GET /api/v1/me`
- `GET /api/v1/me/preferences`
- `PUT /api/v1/me/preferences`

Performance results:
- `POST /api/v1/performance-results`
- `GET /api/v1/performance-results`
- `DELETE /api/v1/performance-results/{id}`

Fitness profile:
- `GET /api/v1/fitness-profile`

Plans:
- `POST /api/v1/plans/goal`
- `POST /api/v1/plans/adaptive`
- `GET /api/v1/plans/{id}`
- `POST /api/v1/plans/{id}/generate-week` (adaptive week generation)

Scheduled workouts:
- `POST /api/v1/scheduled-workouts`
- `GET /api/v1/scheduled-workouts?start=YYYY-MM-DD&end=YYYY-MM-DD`
- `PATCH /api/v1/scheduled-workouts/{id}`
- `POST /api/v1/scheduled-workouts/{id}/skip`
- `POST /api/v1/scheduled-workouts/{id}/complete`

Completed workouts:
- `GET /api/v1/completed-workouts?start=YYYY-MM-DD&end=YYYY-MM-DD`
- `GET /api/v1/completed-workouts/{id}`

Routes:
- `POST /api/v1/routes/templates`
- `GET /api/v1/routes/templates`
- `POST /api/v1/routes/instances`
- `GET /api/v1/routes/instances/{id}`

Mileage:
- `GET /api/v1/mileage?start=YYYY-MM-DD&end=YYYY-MM-DD`

Injury:
- `POST /api/v1/injury-reports`
- `PATCH /api/v1/injury-reports/{id}`
- `POST /api/v1/injury-reports/{id}/resolve`
- `GET /api/v1/injury-reports/active`

---

## 11) Data integrity & invariants
- All queries are scoped to user_id from auth.
- Completed workouts are immutable after creation (v1).
- Generated schedules and adaptations must obey:
  - at least 1 key workout/week (unless injury restriction disables workouts)
  - no back-to-back hard days
- Cross-training never contributes to mileage totals.
- Stride counting rule is applied consistently in planned and completed totals.

---

## 12) Testing requirements (v1)
- Unit tests:
  - stride distance calculator
  - mileage aggregation
  - cross-training similarity predicate
  - hard-day constraint checker
  - injury threshold logic + relapse behavior
  - VDOT + pace derivation golden tests
- Integration tests:
  - CRUD flows for preferences and performance results
  - generating a week and listing scheduled workouts
  - completing workouts and verifying mileage counters
  - injury constraints affecting generation

---

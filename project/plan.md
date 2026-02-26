# Backend Blueprint (Local-Only “Backend”) — Step-by-Step Plan + Iterative Chunks

This project has **no server** in v1 (per `spec.md`). “Backend” therefore means the **data/model layer, persistence, planning engine, import/export, and route storage** implemented client-side, with clear boundaries so a future server backend could replace it.

This plan is organized in 3 layers:
1) **Detailed blueprint** (architecture + data model + key flows)
2) **Iterative chunks** (milestone-sized increments)
3) **Chunks broken down further** into right-sized, safe steps with testing guidance

---

## 0) Goals & Non-Goals (v1 backend)

### Goals
- Local persistence for:
  - **Planned workouts** (including user edits lock)
  - **Workout logs** (multiple per day, linked to plan, “modified” status)
  - **Goal races** (single active race rule, switch prompt archived vs completed, plan freezing)
  - **Routes library** (OSM-based paths; attach routes to workouts)
- Deterministic training plan generation:
  - Generates workouts with required fields (type, target distance/duration/pace range/structure)
  - Supports **“recalculate future only”** while **not overriding user-locked edits**
- CSV import/export for **planned workouts** and **workout logs** only

### Non-goals
- No authentication, no remote sync, no multi-profile
- No CSV import/export for routes
- No “auto recalculation” on drag/drop (only explicit recalc)

---

## 1) Detailed Step-by-Step Backend Blueprint

## 1.1 Tech choices (recommended)
- **TypeScript** for strict domain modeling and safer migrations.
- Persistence: **IndexedDB** (preferred) via a thin wrapper (e.g., `idb`) or a custom minimal wrapper.
  - Rationale: local-only, structured data, larger storage than localStorage.
- Testing:
  - Unit tests for pure logic (planning, linking, CSV parsing) using Vitest/Jest.
  - IndexedDB tests using `fake-indexeddb` in Node test environment.

> If the project is already using a specific stack, align with it; the concepts below still apply.

---

## 1.2 Domain Model (entities + invariants)

### 1.2.1 IDs and timestamps
- Use stable string IDs (e.g., `crypto.randomUUID()`).
- Store dates as ISO strings:
  - **Day keys** as `YYYY-MM-DD` (local calendar semantics)
  - **DateTime** as full ISO for logs if needed (`2026-02-26T...Z`), but day bucketing uses the day key.

### 1.2.2 Core entities

#### Race
- `id`
- `name`
- `date` (goal race date)
- `status`: `"active" | "archived" | "completed"`
- `createdAt`, `updatedAt`
- **Invariant:** exactly one race may be `"active"` at a time.

#### Plan (per race)
- `id`
- `raceId`
- `createdAt`
- `frozen`: boolean
  - **Active race plan**: `frozen = false`
  - Non-active race plans: `frozen = true`
- `version` / `algorithmVersion` (optional but helpful)

#### PlannedWorkout
- `id`
- `raceId` (or `planId`, but raceId is convenient for queries; can store both)
- `date` (`YYYY-MM-DD`)
- `type`
- `targetDistance` (number + unit or meters)
- `targetDuration` (seconds)
- `targetPaceMin` / `targetPaceMax` (seconds per km/mi)
- `structure` (string or structured segments)
- `routeId?` (optional link to saved route)
- `isUserEdited`: boolean
- `editedFields?`: list of fields edited (optional)
- `completedStatus`: `"planned" | "completed" | "modified"` (or separate flags)
- **Invariant:** user-edited planned workouts must never be overwritten by recalculation.

#### WorkoutLog
- `id`
- `date` (`YYYY-MM-DD`)
- `startedAt?` (datetime) / `createdAt`
- `type`
- `distance?`, `duration?`, `pace?` (as recorded)
- `notes?`
- `linkedPlannedWorkoutId?`
- `matchStatus`: `"matched" | "modified" | "unlinked"`
- **Rules:**
  - Multiple logs per day allowed.
  - If a log is created on a day with a planned workout, default behavior is to **link** and mark plan completed.
  - If differing, mark as **modified**.

#### Route
- `id`
- `name`
- `distance`
- `path` (GeoJSON LineString or encoded polyline)
- `startLocation` (lat/lng + optional label)
- `endLocation` (lat/lng + optional label)
- `createdAt`, `updatedAt`

---

## 1.3 Persistence Layer Design (repositories)

Implement a “data access” layer with repositories. Keep it independent of UI framework.

Suggested stores (IndexedDB object stores):
- `races`
- `plans`
- `plannedWorkouts` (indexed by `raceId`, `date`)
- `workoutLogs` (indexed by `date`, maybe `linkedPlannedWorkoutId`)
- `routes`

### Repository interfaces (examples)
- `RaceRepository`: `create`, `update`, `setActiveRaceWithPromptDecision`, `list`, `getActive`
- `PlanRepository`: `createForRace`, `freezeByRaceId`, `getByRaceId`
- `PlannedWorkoutRepository`: `upsert`, `bulkUpsert`, `listByRaceIdAndDateRange`, `getById`, `markEdited`, `attachRoute`
- `WorkoutLogRepository`: `create`, `listByDateRange`, `listByDay`, `linkToPlan`
- `RouteRepository`: `create`, `update`, `list`, `getById`, `delete`

### Schema migration
- Add `dbVersion` with migration steps:
  - v1 initial schema
  - future: add indices, new fields, etc.

---

## 1.4 Core Business Logic (services)

### 1.4.1 Race switching service
`RaceService.setActiveRace(raceId, previousRaceDisposition: "archived"|"completed")`
- Find current active race (if any)
- If different:
  - Prompt is UI; service accepts the disposition.
  - Set previous active `status` to disposition
  - Freeze previous race’s plan (set `frozen=true`)
- Set new race to `status="active"`
- Ensure only one active race invariant holds.

### 1.4.2 Plan generation + recalculation service
`PlanService.generateInitialPlan(raceId, startDate, raceDate, inputs...)`
- Create `Plan`
- Generate planned workouts for all dates in range

`PlanService.recalculateFuture(raceId, fromDateExclusiveOrInclusive)`
- Only allowed for active race plan that is not frozen
- Load planned workouts for future date range
- For each future day:
  - If `isUserEdited`: keep as-is
  - Else: replace with regenerated values (upsert)
- Keep past workouts unchanged

> Exactly how workouts are generated depends on training algorithm. The backend must support the data shape + edit locks + future-only recalc.

### 1.4.3 Logging service
`LogService.createLogAndAutoLink(log)`
- Create log
- Find planned workout(s) for that day and active race context (if applicable)
  - Decide linking heuristic (v1 simplest):
    - If exactly one planned workout that day for active race: link to it
    - If multiple planned workouts: require UI selection (backend supports passing plannedWorkoutId)
- Determine match vs modified:
  - If type differs OR distance differs beyond tolerance OR duration differs: mark log `modified` and plannedWorkout `modified`
  - Else mark completed/matched
- Allow multiple logs per day always

### 1.4.4 Route attach service
- Attach a saved `routeId` to a planned workout (and optionally to logs later)

---

## 1.5 CSV Import/Export (planned workouts + logs)

### Export
- Planned workouts CSV columns:
  - `id, raceId, date, type, targetDistance, targetDuration, targetPaceMin, targetPaceMax, structure, isUserEdited, completedStatus, routeId`
- Workout logs CSV columns:
  - `id, date, type, distance, duration, notes, linkedPlannedWorkoutId, matchStatus, createdAt`

### Import
- Validate headers and parse rows
- Upsert by `id` (or generate id if missing)
- Ensure dates are valid `YYYY-MM-DD`
- Do **not** import routes (per spec)

### Testing
- Golden-file tests: export -> import round trip
- Validation tests for malformed CSV

---

## 1.6 Testing Strategy (backend layer)

### Unit tests (pure logic)
- Race single active invariant
- Race switching freezes old plan and preserves old planned workouts
- Recalculate future:
  - does not touch user-edited workouts
  - does not touch past workouts
- Logging:
  - links to plan
  - multiple logs same day preserved
  - mismatch sets modified statuses

### Persistence tests
- Repositories CRUD
- Indices and queries by date range
- Migration tests (seed v1 schema, reopen db with higher version)

---

## 2) Iterative Chunks (milestone-sized increments)

Chunk A — Foundation: domain types + DB + repositories  
Chunk B — Races + active race invariant + plan freezing  
Chunk C — Planned workouts CRUD + edit locking + route attach field  
Chunk D — Plan generation + “recalculate future only” with edit protection  
Chunk E — Logging + auto-link + modified status + multiple logs/day  
Chunk F — CSV import/export (planned workouts + logs)  
Chunk G — Routes repository support (save/reuse + attach) and integrity checks  
Chunk H — Hardening: migrations, data validation, and performance for date-range queries

---

## 3) Second Round: Break Each Chunk into Smaller Steps

Below, each milestone chunk is broken into implementable PR-sized steps with strong tests.

### Chunk A — Foundation
A1. Define domain types (TS interfaces) + shared date utilities (`YYYY-MM-DD`)
- Add parsing/validation helpers: `isDayKey`, `toDayKey(Date)`
- Tests for date utilities

A2. Add IndexedDB setup module with versioned schema
- Create object stores + indices (raceId, date)
- Tests using fake-indexeddb: open db, verify stores exist

A3. Implement base repository helpers
- `get`, `put`, `delete`, `getAllByIndex`, `bulkPut`
- Tests for bulk operations

### Chunk B — Races + active race invariant + plan freezing
B1. RaceRepository CRUD + “getActiveRace”
- Tests for create/list/update/getActive

B2. PlanRepository create/get/freeze
- Tests: create plan for race, freeze toggles

B3. RaceService.setActiveRace (service takes disposition)
- Behavior:
  - switch active
  - set previous status to archived/completed
  - freeze previous plan
  - enforce single active
- Tests for all branches

### Chunk C — Planned workouts CRUD + edit locking + route attach field
C1. PlannedWorkoutRepository CRUD + list by raceId/date-range
- Tests: range queries, ordering

C2. Edit locking API
- `markUserEdited(workoutId, patch)`
- Store `isUserEdited=true`
- Tests: patch updates, flag persists

C3. Attach route id
- `attachRoute(plannedWorkoutId, routeId|null)`
- Tests: attach/detach

### Chunk D — Plan generation + recalculate future only
D1. Define “planning algorithm interface”
- `generateWorkoutForDay(context, date)` returns PlannedWorkout fields
- Stub/simple deterministic generator for now
- Tests: deterministic output given seed inputs

D2. Initial plan generation for a race (bulk insert)
- Generate date range; do not create duplicates unexpectedly
- Tests: correct count, correct dates

D3. Recalculate future-only
- Input: `raceId`, `fromDate` (today)
- Replace only future, skip `isUserEdited`, keep past unchanged
- Tests: snapshot before/after; verify invariants

### Chunk E — Logging + auto-link + modified status
E1. WorkoutLogRepository CRUD + list by date-range + list by day
- Tests: multiple logs/day preserved

E2. LogService.createLogAndAutoLink (simple linking)
- If one planned workout on that day (active race), link automatically
- Mark planned workout completed vs modified based on comparison rules
- Tests:
  - matched log -> completed
  - mismatch -> modified
  - multiple logs -> both stored

E3. Handle ambiguity (optional v1)
- Backend supports passing explicit `plannedWorkoutId` to link
- Tests: explicit linking works even if multiple planned workouts exist

### Chunk F — CSV import/export
F1. CSV export for planned workouts
- Stable column ordering
- Tests: export matches expected header and rows

F2. CSV export for logs
- Tests: same

F3. CSV import (planned workouts)
- Validate headers, parse types, upsert
- Tests: invalid rows rejected; round-trip

F4. CSV import (logs)
- Tests: round-trip

### Chunk G — Routes repository support
G1. RouteRepository CRUD
- Save name/distance/path/start/end
- Tests: create/list/update/get/delete

G2. Integrity rules
- When deleting a route, detach from planned workouts (or prevent delete)
- Pick one behavior and test it (recommend: detach automatically)

### Chunk H — Hardening
H1. Validation layer (zod/io-ts or custom)
- Validate persisted objects at boundaries (import, db reads)
- Tests: invalid objects are rejected/handled

H2. Migration test harness
- Seed old db versions and verify upgrade path

H3. Performance pass
- Ensure indices exist for key queries:
  - plannedWorkouts by (raceId, date)
  - logs by date
- Add tests that queries use indexed paths where possible (lightweight)

---

## 4) Third Round: Right-Size Into Small, Safe Steps (PR-level)

This is the final “right-sized” step list: small enough for safe implementation with tests, but meaningful progress each step.

### Step 1 — Domain + date utilities
- Add types: Race, Plan, PlannedWorkout, WorkoutLog, Route
- Add `DayKey` utilities
- Add unit tests for date functions

### Step 2 — IndexedDB bootstrap (v1 schema)
- Implement db open + schema creation
- Create stores + indices
- Add fake-indexeddb tests verifying schema

### Step 3 — Repository primitives
- Implement generic helpers: `put/get/delete/bulkPut/queryByIndex`
- Tests for basic CRUD and bulkPut

### Step 4 — Race repository + active race query
- Implement RaceRepository
- Tests: CRUD + getActive

### Step 5 — Plan repository + freeze flag
- Implement PlanRepository
- Tests: create/get/freeze

### Step 6 — Race switching service (single active + prompt decision input)
- Implement RaceService.setActiveRace(raceId, disposition)
- Tests:
  - switching sets previous to archived/completed
  - exactly one active enforced
  - freezes previous plan

### Step 7 — Planned workouts repository (range queries)
- Implement PlannedWorkoutRepository with `listByRaceIdAndDateRange`
- Tests: date range correctness

### Step 8 — User edit locking
- Implement `updatePlannedWorkout(workoutId, patch, {markEdited:true})`
- Ensure `isUserEdited` is set and preserved
- Tests: recalculation later will respect (test harness can be simple now)

### Step 9 — Planning algorithm stub + initial plan generation
- Implement a minimal deterministic generator (e.g., alternating easy/long/rest) producing required fields
- Implement `generateInitialPlan(raceId, startDate, raceDate)`
- Tests: correct fields present; correct number of workouts

### Step 10 — Recalculate future-only w/ edit protection
- Implement `recalculateFuture(raceId, fromDate)`
- Must not modify:
  - past dates
  - `isUserEdited=true` future workouts
- Tests: before/after comparisons

### Step 11 — Logs repository + multiple logs/day
- Implement WorkoutLogRepository
- Tests: multiple inserts same day + listByDay returns all

### Step 12 — Create log + auto-link + modified status
- Implement LogService.createLogAndAutoLink
- Define tolerance rules (explicit):
  - Type mismatch => modified
  - Distance/duration mismatch beyond tolerance => modified
- Update linked PlannedWorkout `completedStatus` appropriately
- Tests: matched vs modified + linking

### Step 13 — Route repository + attach route to planned workout
- Implement RouteRepository CRUD
- Implement attach route id to planned workout
- Tests: route CRUD + attach/detach

### Step 14 — CSV export (planned + logs)
- Implement planned export
- Implement logs export
- Tests: expected CSV output

### Step 15 — CSV import (planned + logs)
- Implement planned import with validation
- Implement logs import with validation
- Tests: round-trip import/export + invalid handling

### Step 16 — Hardening: validation + migration scaffolding
- Add runtime validation at import and db boundaries
- Add migration harness pattern even if only v1 exists
- Tests: validation rejects malformed objects

---

## 5) Notes on “Prompt the user” vs backend responsibilities

The “prompt archived vs completed” is a **UI interaction**, but the backend should:
- expose a method that **requires** a disposition parameter when switching away from an active race, OR
- expose a method that returns a “needsDisposition” result.

Recommended pattern:
- UI calls `RaceService.getActiveRace()`; if switching, UI prompts, then calls `RaceService.setActiveRace(newRaceId, disposition)`.

---

## 6) Deliverables Checklist (backend-complete for v1)

- [ ] IndexedDB schema + migration versioning
- [ ] Repositories for races/plans/plannedWorkouts/logs/routes
- [ ] RaceService: single-active invariant + freeze old plan + disposition handling
- [ ] PlanService: generate + recalc future-only + edit-lock protection
- [ ] LogService: multi-log/day + auto-link + modified status
- [ ] CSV import/export for planned + logs
- [ ] Tests: unit + persistence + CSV round-trip

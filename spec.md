# Local-Only Running Planner Web App — v1 Specification

**Date:** 2026-02-26  
**User:** ksuh5

## 1) Core Concepts & Data Storage

### 1.1 Local-only storage (single profile per browser)
- v1 has **no accounts/login**.
- All data is stored **locally in the browser** (e.g., IndexedDB/localStorage).
- Exactly **one athlete profile per browser** (implicit single user).

### 1.2 Workout Types (enumeration)
Planned and logged workouts use these types:
- **easy run**
- **long run**
- **tempo**
- **intervals**
- **recover**
- **rest day**
- **cross-training**

## 2) Planned Workouts (Training Plan)

### 2.1 Planned workout fields (v1)
Each planned workout contains:
- **type**
- **target distance**
- **target duration**
- **target pace range**
- **workout structure** (e.g., warmup + reps + cooldown)

### 2.2 Manual edits are user-locked
- Users can **manually edit** generated planned workouts (distance/pace/structure/etc.).
- The planning algorithm **must not override user edits**.

### 2.3 Recalculation behavior
- Drag-and-drop rescheduling **does not** trigger automatic recalculation.
- Recalculation happens **only** when the user explicitly triggers it.
- When recalculating, **only future workouts** are recalculated (not today/past).

## 3) Workout Logging

### 3.1 Logging on a planned day
If a user logs an actual workout on a day that already has a planned workout:
- The app should **link the log to that planned workout** and mark it completed. (Option “a”)

### 3.2 Multiple logs per day
- The app must **allow multiple logs per day**.

### 3.3 Plan vs actual mismatch status
- If the logged workout differs from the plan, it should be marked as **modified** (not “missed”).

## 4) Calendar / Planner UX

### 4.1 Views
- The calendar must support **both week view and month view**.
- The user can switch via a **toggle**.

### 4.2 Drag-and-drop rescheduling
- Users can **drag-and-drop** planned workouts to reschedule to another day.
- Drag-and-drop **keeps everything else as-is** (no automatic plan adjustment).
- Any broader adjustments happen only via an explicit **Recalculate** action.

## 5) Routes & Mapping

### 5.1 Interactive map route builder
- v1 includes an **interactive map route builder** for planning distances by drawing routes.

### 5.2 Map provider
- Use **OpenStreetMap** (e.g., via a library like Leaflet).

### 5.3 Snap-to-roads routing
- The route builder must support **snap-to-roads routing** (auto-follow roads/trails), not just straight-line segments.

### 5.4 Route saving & reuse
- Routes must be:
  - **saved and reusable** (a library of routes), and also
  - **attachable to a specific calendar workout**.

### 5.5 Route fields to store (v1)
Each saved route includes:
- **name**
- **distance**
- **path** (route geometry)
- **start location**
- **end location**

## 6) CSV Import / Export

### 6.1 Supported entities
CSV import/export supports:
- **workout logs**
- **planned workouts**

CSV import/export does **not** need to support saved routes in v1 (path geometry in CSV is avoided).

## 7) Goal Races & “Single Active Race” Rule

### 7.1 Race states
- Exactly **one** race is **Active** at a time.
- All other races are **Completed** or **Archived**.

### 7.2 Auto-switch on new active race
When the user creates a new goal race or activates a different race:
- The app **auto-switches** so the selected/new race becomes **Active**.
- The app **prompts the user** to mark the previously-active race as:
  - **Archived**, or
  - **Completed**.

### 7.3 Plan retention & freezing
- The previous active race’s plan remains **saved and viewable**, but is **frozen**:
  - No further recalculation applies to it.
- The newly active race gets a **new plan**, and only that plan can be recalculated (future-only) going forward.

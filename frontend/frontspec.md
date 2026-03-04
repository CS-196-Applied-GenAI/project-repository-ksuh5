# Frontend Specification (Vite + React + Dexie) — Local-only v1

Current date: 2026-03-03  
Backend base URL (dev): `http://localhost:8000` (also possible `http://127.0.0.1:<port>`)  
Auth: none (unauthenticated, local-only)

## Goals
Build a new single-page web app to plan running training:
- Manage **Races** (exactly one `active` at a time).
- Plan **Planned Workouts** on a calendar (multiple per day).
- Track **Workout Logs** (can be attached to a planned workout or unplanned).
- Persist data in-browser using **Dexie (IndexedDB)**.
- Import/export via backend **CSV endpoints**.
- Recalculate plan via backend call, applying rules week-by-week.

---

## Tech Stack
- Vite + React (JavaScript)
- Dexie for IndexedDB persistence
- Minimal CSS (no required UI library)
- Drag & drop for moving planned workouts on the calendar (HTML5 DnD is acceptable)

---

## Data Model (frontend)
### Race
- `id: string` (uuid)
- `name: string`
- `startDate: string` (YYYY-MM-DD)
- `endDate: string` (YYYY-MM-DD)
- `status: "active" | "archived" | "completed"`
- `createdAt: string` (ISO)
- `updatedAt: string` (ISO)

Rules:
- There can be **only one active race at a time**.
- When creating a new race while an active race exists, prompt user to **Archive** or **Complete** the previous race (or Cancel).
  - If Cancel: abort creating the new race.
  - If Archive/Complete: update previous race status, then create the new race with status `active`.

### PlannedWorkout
Belongs to a race.
- `id: string` (uuid)
- `raceId: string`
- `date: string` (YYYY-MM-DD)
- `type: "easy" | "tempo" | "interval" | "long_run" | "cross_train" | "rest"` (type set includes at least tempo/interval/long_run as quality)
- `title: string` (optional display label)
- `distance: number | null` (miles in v1, optional)
- `durationMinutes: number | null` (optional)
- `notes: string` (optional)
- `locked: boolean` (if true, recalc must not change it)
- `createdAt: string` (ISO)
- `updatedAt: string` (ISO)

Quality workouts:
- `tempo`, `interval`, `long_run`
Cross-training is **not** considered quality for the “no back-to-back quality workouts” rule.

### WorkoutLog
- `id: string` (uuid)
- `plannedWorkoutId: string | null` (null = unplanned)
- `date: string` (YYYY-MM-DD, required)
- `time: string | null` (`HH:MM`, optional but used for chronological ordering)
- `type: same enum as PlannedWorkout.type`
- `distance: number | null`
- `durationMinutes: number | null`
- `notes: string` (optional)
- `createdAt: string` (ISO)
- `updatedAt: string` (ISO)

Unplanned logs:
- Created via a separate explicit **“+ Log workout”** action.
- Must be attachable to a planned workout later (similar to “attach route” UX concept).
- If attached, it should appear under that planned workout’s modal log list.

---

## Primary UI/UX
### Layout
- A calendar view for the active race date range (month/week view acceptable; must show days).
- Controls:
  - Race selector + “New Race”
  - “Recalculate Plan” button (for active race)
  - CSV: Export and Import (planned and logs independently)

### Calendar behavior (planned workouts)
- Multiple planned workouts can exist on the same date.
- Drag & drop planned workouts to any date, including past dates.
- When dropping onto a day that already has planned workouts:
  - Show a warning/prompt like “This day already has workouts. Continue?” and allow cancel.
  - If canceled: revert the drag.

### Planned Workout modal (selected workout modal)
When a planned workout is selected:
- Show planned workout details at the top.
- Show all workout logs linked to that planned workout below, **chronologically**:
  - Order by `date`, then `time` (null times sort last), then `createdAt`.
- Provide an **“Add another log”** button:
  - Adds a new log associated to this planned workout.

### Unplanned log creation
- A separate explicit “+ Log workout” action (not inside planned workout modal).
- Creates a log with `plannedWorkoutId = null`.
- UI should allow attaching an unplanned log to a planned workout later.

---

## Recalculate Plan
### Trigger
- A button in the UI: “Recalculate Plan”.

### Request scope
- Send **only the currently active race’s planned workouts** to backend.
- Include `locked=true` workouts in request; backend should return them unchanged.

### Semantics / constraints (week-by-week)
Recalculate should update things **on a week-by-week basis** and adjust the plan so:
- No **back-to-back quality workouts** (quality = tempo/interval/long_run). Cross-train does not count as quality.
- There is at least **one quality workout per week**.
- Weekly volume constraints:
  - Weekly volume should not drop more than **10%** (week-to-week).
  - Weekly mileage should be kept generally the same.
  - Do not increase any **individual run** more than **10–15%**.

### Apply + Undo UX
- Apply results immediately.
- Show a toast notification.
- Allow **Undo until the next action**.
  - Undo should revert **only planned workouts that changed for the active race**.
  - Undo window ends on the next user action (any new edit/drag/add/etc.).

Backend endpoint for recalc is assumed to exist; the frontend should call it with the active race’s planned workouts and then overwrite those workouts with the backend response (treat response as source of truth for the affected workouts).

---

## CSV Import/Export (backend-driven)
### Backend endpoints
- `POST /csv/export` -> returns JSON: `{ planned_workouts_csv: string, workout_logs_csv: string }`
- `POST /csv/import` -> accepts JSON: `{ planned_workouts_csv: string, workout_logs_csv: string }`
  - returns:
    - `planned_workouts: { items: PlannedWorkout[], errors: {row_number, message}[] }`
    - `workout_logs: { items: WorkoutLog[], errors: {row_number, message}[] }`

### Export UX
- Must download **two separate files**:
  - `planned_workouts.csv`
  - `workout_logs.csv`

### Import UX
- Users can import files **independently**:
  - Import planned only, or logs only.
- If backend returns row errors:
  - Import the valid rows anyway.
  - Show an error table listing row number + message.

---

## Non-goals / Clarifications
- Ignore any special relationship between `race_id` and `route_id`.
- No auth.
- Local-only v1.

---

## Acceptance criteria (high level)
- Data persists across refresh via Dexie.
- Exactly one active race is enforced with prompt on creating a new race.
- Planned workouts can be moved via drag/drop; warning shown when dropping onto an already-filled day.
- Planned workout modal lists logs chronologically and supports “Add another log”.
- Unplanned logs can be created and later attached to planned workouts.
- Recalculate sends only active race planned workouts and supports immediate apply + undo-until-next-action.
- CSV export downloads two files; import supports independent file import; partial success imports valid rows and displays errors.

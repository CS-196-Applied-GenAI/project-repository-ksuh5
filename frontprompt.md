# Frontend Code-Gen Prompt Series (TDD, incremental) — Based on `frontplan.md`

Use these prompts sequentially with a code-generation LLM.  
They are designed to: (1) keep steps small, (2) add tests early, (3) ensure every change is wired into the running app, and (4) avoid orphaned code.

**Repository assumption:** you are working in the repo that contains `frontplan.md` and `frontspec.md`.  
**Stack:** Vite + React (JS), Dexie, Vitest + Testing Library.  
**Rule:** Each step must end with a working app (`npm run dev`) and passing tests (`npm test` / `npm run test`).

---

## Prompt 0 — Setup & docs (scaffold)
```text
You are implementing the frontend described in `frontspec.md` following the phased plan in `frontplan.md`.

Step 0: Setup & docs
Goal:
- Create a new Vite + React (JavaScript) app inside the `frontend/` directory (if it doesn't already exist).
- Ensure `frontspec.md` and `frontplan.md` remain unchanged.
- Add/ensure `frontprompt.md` is present (this file will be created/updated by me later—do not generate it now unless it doesn't exist).

Requirements:
1) Use Vite + React template (JS).
2) Add a minimal `App.jsx` that renders a title like "Training Planner" and a short status line.
3) Add a `README.md` in `frontend/` with how to install and run dev server.
4) Ensure `npm run dev` works.

Testing:
- Do not add tests yet in this step; just make sure the scaffold builds.

Deliverable:
- Provide the full file tree under `frontend/`.
- Include exact commands to run dev server.
- Confirm everything runs without errors.
```

---

## Prompt 1 — Dexie bootstrap + load plumbing (persistence smoke test)
```text
Step 1: Dexie bootstrap + data load plumbing (from `frontplan.md` Step 1)

Goal:
- Add Dexie for persistence with tables: races, plannedWorkouts, workoutLogs.
- On app start, load these tables and display counts in the UI (races/planned/logs).
- Add a temporary "Seed sample data" button that inserts:
  - 1 active race
  - 1 planned workout (for the race)
  - 1 workout log (unplanned or attached—your choice)
and then refresh the counts.
- Make sure refresh (browser reload) preserves data (IndexedDB).

Constraints:
- Keep the UI very simple and functional.
- Use write-through: every mutation writes to Dexie then updates state.

Testing:
- Add Vitest now (lightweight): configure `npm run test`.
- Add at least one unit test (pure) that doesn’t depend on Dexie, e.g. a helper that formats counts or returns a boolean. Keep it trivial—this step is about wiring Dexie, not full logic.

Wiring:
- Ensure the seed button is visible in the running app and actually seeds data.

Acceptance:
- After seeding, refreshing the page still shows the seeded counts.

Output:
- Show the key files you created/modified.
- Include instructions to run tests and dev server.
```

---

## Prompt 2 — Domain layer + test harness (workout types, quality, log sorting, date helpers)
```text
Step 2: Domain layer + test harness (from `frontplan.md` Step 2)

Goal:
Create `src/domain/` utilities and add meaningful unit tests.

Implement:
1) Workout types:
- Define a canonical internal enum/object for workout types that covers:
  easy run, long run, tempo, intervals, recover, rest day, cross-training.
- Provide helpers:
  - `isQualityType(type)` => true for tempo/intervals/long run only (cross-training is NOT quality).
  - `displayWorkoutType(type)` => friendly label.

2) Log sorting:
- `compareLogsChronological(a, b)` sorting by:
  date ASC, then time ASC where null times sort last, then createdAt ASC.

3) Calendar date helpers:
- `startOfWeek(ymd)` Monday-based
- `addDays(ymd, n)`
- `getWeekDays(ymd)` returns 7 YMD strings for that week

Testing (Vitest):
- Add unit tests for each helper above:
  - isQualityType correctness
  - sorting correctness (include null time case)
  - date helper correctness (week starts Monday)

Wiring:
- Use at least one domain helper in the UI so it’s not orphaned:
  - e.g., display the active race status label using `displayWorkoutType` somewhere is wrong; instead show planned workout type labels when you render a sample planned workout list (you can add a tiny section under counts).

Constraints:
- Keep changes minimal; don’t build calendar UI yet.

Output:
- Provide file diffs or full contents of new domain files and their tests.
- Confirm tests pass.
```

---

## Prompt 3 — RaceBar display + active race selection (no creation yet)
```text
Step 3: RaceBar display + active race selection (from `frontplan.md` Step 3)

Goal:
- Add a RaceBar UI component that:
  - Displays the current active race (name + date range).
  - Lets user select the active race from a dropdown of races with status "active".
- On load:
  - if there is exactly one active race, select it automatically.
  - if none, show a clear message: "No active race".

Implementation details:
- Add `RaceStatus` enum/object to `src/domain/`.
- Store `activeRaceId` in React state.
- Ensure selection is persisted in Dexie by virtue of the race status (active). You don’t need a separate settings table.

Testing:
- Add a pure helper `getActiveRace(races)` or `getActiveRaceId(races)` and test it:
  - returns the active race when exactly one exists
  - returns null when none
- Add a small component test for RaceBar rendering (optional, if not too heavy); at minimum, unit tests for helpers.

Wiring:
- Integrate RaceBar into App and make it functional with real data from Dexie.
- Keep seed button from Step 1 but update it if needed to seed multiple races (e.g., an archived race too) to verify dropdown behavior.

Output:
- List modified/new files.
- Show manual verification steps for selecting active race.
```

---

## Prompt 4 — Create race modal (basic create active race, persist)
```text
Step 4: Create race modal (from `frontplan.md` Step 4)

Goal:
- Implement a RaceModal for creating a race with:
  name, startDate, endDate.
- "Create" creates a new race with status active and persists to Dexie.
- After creation, it becomes the selected active race in UI.
- Optionally seed one planned workout at startDate (keep it minimal).

Testing:
- Add unit tests for a pure function `makeRace({name,startDate,endDate})` to ensure:
  - has id
  - has createdAt/updatedAt ISO strings
  - status is active
- Keep tests simple and deterministic (mock date/uuid or inject).

Wiring:
- Add "New Race" button in RaceBar that opens RaceModal.
- Ensure modal closes on cancel and after create.

Constraints:
- Do not implement archive/complete prompt yet (that’s next step).

Output:
- Updated UI shows new race and persisted on refresh.
- Tests pass.
```

---

## Prompt 5 — Single-active enforcement prompt (archive/complete/cancel)
```text
Step 5: Single-active enforcement prompt (from `frontplan.md` Step 5)

Goal:
Enforce exactly one active race at a time when creating a new race.

Behavior:
- If there is an existing active race and user tries to create a new one:
  - Prompt user to choose: Archive or Complete the previous active race, or Cancel.
  - If Cancel: abort creation (no new race added).
  - If Archive/Complete: update previous race status accordingly, then create the new race as active.

Implementation:
- For v1 you may use `window.prompt` or a simple custom modal; prefer a custom modal if easy, otherwise prompt is acceptable.
- Implement pure logic helper:
  - `applyNewRaceDecision({existingActiveRace, decision})` => returns updates to apply.
- Update Dexie and state with a single transaction if possible.

Testing:
- Unit test `applyNewRaceDecision`:
  - cancel => no changes
  - archive => previous becomes archived + new active created
  - complete => previous becomes completed + new active created

Wiring:
- Ensure RaceModal creation flow now goes through this prompt.
- Confirm no scenario results in >1 active race in Dexie.

Output:
- Include manual test checklist.
- Ensure all tests pass.
```

---

## Prompt 6 — Calendar Week view MVP (render 7 days, show date labels)
```text
Step 6: Calendar view Week MVP (from `frontplan.md` Step 6)

Goal:
- Add a Week calendar component that renders a 7-column grid for a selected week.
- Use Monday-based week.
- Show each day cell with YMD label and day-of-week.
- The week should be determined as:
  - if active race exists: start from activeRace.startDate week
  - otherwise: show current week but with disabled interactions

Keep it minimal:
- No month view yet.
- No drag/drop yet.

Data wiring:
- Filter planned workouts for active race and show a tiny list in the appropriate day cell (just type label).

Testing:
- Unit test `getWeekDays(ymd)` already exists; add one more test for a helper:
  - `groupPlannedByDate(plannedWorkouts)` returns a map/object keyed by date.

Wiring:
- Integrate WeekCalendar into App, displayed only when an active race exists.

Output:
- Updated app shows week view grid with day cells.
- Tests pass.
```

---

## Prompt 7 — Month view MVP + toggle (week/month)
```text
Step 7: Month view MVP + toggle (from `frontplan.md` Step 7)

Goal:
- Implement MonthCalendar:
  - 7 columns
  - 5–6 week rows
  - includes leading/trailing padding days
- Add a toggle UI (Week / Month) in the top bar.
- Both views must display the same planned workouts.

Implementation:
- Add date helper `getMonthGridDays(ymd)` that returns an array of days (length multiple of 7).
- Toggle stored in React state.

Testing:
- Unit tests for `getMonthGridDays`:
  - returns length multiple of 7
  - includes the 1st of month
  - starts on Monday

Wiring:
- Ensure toggle works without losing selected active race.

Output:
- Demonstrate switching views.
- Tests pass.
```

---

## Prompt 8 — Planned workouts rendering + selection
```text
Step 8: Planned workouts rendering + selection (from `frontplan.md` Step 8)

Goal:
- Render planned workouts cards within day cells (multiple per day).
- Each card displays:
  - workout type (display label)
  - distance/duration if present
  - locked indicator if locked
- Clicking a card opens a PlannedWorkoutModal (read-only for now).

Implementation:
- Add `PlannedWorkoutCard` component, `PlannedWorkoutModal` component.
- Store `selectedPlannedWorkoutId` in state.

Testing:
- Unit test `groupPlannedByDate` for multiple items in same day.
- Add a simple component test:
  - render card list, click card, modal opens with correct content (if feasible).

Wiring:
- Ensure modal close works.
- Ensure selection works in both week and month views.

Output:
- App shows selectable planned workouts.
- Tests pass.
```

---

## Prompt 9 — Planned workout modal editing + locking semantics + required fields
```text
Step 9: Planned workout modal editing + locking semantics (from `frontplan.md` Step 9)

Goal:
- Expand PlannedWorkout model and modal to include required fields from spec.md:
  - target distance
  - target duration
  - target pace low/high
  - workout structure text
- Add editing in the modal with Save.
- Locking semantics:
  - Any user edit should set `locked=true` (or set locked on first edit).
  - Include a visible indicator that workout is locked.
- Persist changes in Dexie and update UI immediately.

Implementation:
- Add pure helper `applyPlannedWorkoutPatch(workout, patch)` that:
  - applies changes
  - sets locked true if patch modifies any user-editable field
  - updates updatedAt

Testing:
- Unit tests for applyPlannedWorkoutPatch:
  - unchanged patch does not change locked
  - changing distance sets locked true
  - updatedAt changes

Wiring:
- Ensure save closes modal or stays open but shows updated values.

Output:
- Provide manual steps to edit a workout, refresh, confirm persisted and locked.
- Tests pass.
```

---

## Prompt 10 — Drag/drop rescheduling + occupied-day confirm
```text
Step 10: Drag/drop rescheduling + occupied-day confirm (from `frontplan.md` Step 10)

Goal:
- Implement HTML5 drag/drop for PlannedWorkoutCard.
- Drop onto a day cell updates the workout's `date`.
- If drop target day already has planned workouts:
  - show confirm dialog "This day already has workouts. Move anyway?"
  - cancel => abort move

Implementation:
- Use `dataTransfer` with a custom MIME type like `application/x-plannedWorkoutId`.
- Ensure drag/drop works in both Week and Month views.

Testing:
- Add unit test for pure helper:
  - `shouldConfirmDrop(targetDayWorkoutCount)` returns true when >0
- If component tests are too painful for drag/drop, document a strong manual test checklist.

Wiring:
- Ensure this does not trigger recalc automatically.

Output:
- Manual test checklist for drag/drop, including confirm cancel path.
- Tests pass.
```

---

## Prompt 11 — Logs in planned workout modal (chronological list)
```text
Step 11: Logs in planned workout modal (from `frontplan.md` Step 11)

Goal:
- Show all workout logs linked to the selected planned workout.
- Display chronologically using `compareLogsChronological`.

Implementation:
- In PlannedWorkoutModal, add a Logs section that:
  - lists logs
  - shows date + optional time + type + distance/duration + notes.

Testing:
- Unit tests for compareLogsChronological (ensure null times sort last).
- Unit test `getLogsForPlanned(logs, plannedWorkoutId)`.

Wiring:
- Seed button should optionally seed multiple logs to visually confirm sorting.
- No “add log” yet in this step.

Output:
- Logs appear in planned workout modal sorted correctly.
- Tests pass.
```

---

## Prompt 12 — Add logs (attached + unplanned) + Log modal
```text
Step 12: Add logs flows (from `frontplan.md` Step 12)

Goal:
- Add "Add another log" button inside PlannedWorkoutModal:
  - opens LogWorkoutModal prefilled and attaches plannedWorkoutId.
- Add a global "+ Log workout" button:
  - opens LogWorkoutModal with plannedWorkoutId null.
- Save writes to Dexie and updates UI.

Implementation:
- Create pure helper `normalizeLogFormInput(formState)` to:
  - convert "" to null for time
  - parse numbers
  - ensure required date/type
- Use `compareLogsChronological` for display.

Testing:
- Unit tests for normalizeLogFormInput.
- Component test optional: opening modal and saving adds to list (if feasible).

Wiring:
- Ensure attached logs appear immediately in planned workout modal after adding.

Output:
- Manual steps for adding attached and unplanned logs.
- Tests pass.
```

---

## Prompt 13 — Unplanned logs panel + attach to planned workout
```text
Step 13: Attach unplanned logs to planned workouts (from `frontplan.md` Step 13)

Goal:
- Create an "Unplanned logs" section showing logs where plannedWorkoutId is null.
- Each unplanned log has an "Attach..." button.
- Clicking "Attach..." opens AttachPlannedWorkoutModal listing planned workouts for active race.
- Selecting a planned workout sets log.plannedWorkoutId and persists.

Implementation:
- Add pure helper `attachLogToPlanned(log, plannedWorkoutId)`.

Testing:
- Unit tests for attachLogToPlanned.
- Unit test `getUnplannedLogs(logs)`.

Wiring:
- After attaching, log disappears from unplanned list and appears under the planned workout.

Output:
- Manual attach flow verification.
- Tests pass.
```

---

## Prompt 14 — CSV export integration (backend)
```text
Step 14: CSV export via backend (from `frontplan.md` Step 14)

Goal:
- Implement backend client base URL from `VITE_BACKEND_URL` with default `http://localhost:8000`.
- Implement Export button:
  - POST `/csv/export` with { planned_workouts: [...], workout_logs: [...] }
  - receive { planned_workouts_csv, workout_logs_csv }
  - download two separate files: planned_workouts.csv and workout_logs.csv

Implementation:
- Create `src/api/client.js` with `postJson`.
- Create `src/api/csv.js` with `csvExport` and `downloadTextFile`.

Testing:
- Unit test api client with mocked fetch:
  - correct method, headers, URL, body
- Unit test downloadTextFile can be minimal (mock URL.createObjectURL and anchor click).

Wiring:
- Ensure Export button is wired and does not crash if backend is not running (show an error toast/alert).

Output:
- Manual steps for export.
- Tests pass.
```

---

## Prompt 15 — CSV import integration (partial success + error table)
```text
Step 15: CSV import via backend (from `frontplan.md` Step 15)

Goal:
- Implement Import modal:
  - choose planned CSV file and/or logs CSV file independently
  - planned-only import calls `/csv/import` with planned string and empty logs string
  - logs-only import calls `/csv/import` with logs string and empty planned string
- Upsert returned `items` into Dexie.
- Display error tables for `planned_workouts.errors` and `workout_logs.errors`.
- Partial success: valid rows imported even if errors exist.

Implementation:
- Create `readFileAsText(file)` helper.
- Create `src/api/csv.js` `csvImport(plannedCsv, logsCsv)`.

Testing:
- Unit test `readFileAsText` can be mocked; focus on pure helper:
  - `mergeImportedItems(existing, imported)` if you implement it
- API wrapper tests with mocked fetch for correct request payloads.

Wiring:
- After import, refresh state from Dexie to ensure UI reflects imported data.

Output:
- Manual import steps including error case.
- Tests pass.
```

---

## Prompt 16 — Recalculate plan apply (backend)
```text
Step 16: Recalculate plan apply (from `frontplan.md` Step 16)

Goal:
- Add Recalculate Plan button (active race only).
- Call backend `/plan/recalculate` with only active race planned workouts including locked workouts.
- Apply backend response by overwriting active race planned workouts:
  - delete active-race planned workouts not returned
  - upsert returned planned workouts
- Do not affect other races.

Implementation:
- Create `src/api/recalc.js` with a configurable request shape:
  - default minimal payload: { planned_workouts: [...] }
  - optionally support extended payload: { current_planned_workouts, today, active_race } behind a flag.
- Create pure function `applyRecalcOverwrite(currentActiveWorkouts, returnedWorkouts)` that:
  - returns { toDeleteIds, toUpsertItems } or final list.

Testing:
- Unit tests for applyRecalcOverwrite.
- API wrapper test for correct request body.

Wiring:
- Ensure UI updates after apply (reload planned from Dexie or update state accordingly).
- If backend not running, show user-friendly error.

Output:
- Manual test: recalc changes active race workouts only.
- Tests pass.
```

---

## Prompt 17 — Undo until next action (recalc-only)
```text
Step 17: Undo until next action (from `frontplan.md` Step 17)

Goal:
- Add undo snapshot system for recalc only:
  - before applying recalc, store snapshot of active race planned workouts
  - show toast with Undo action after apply
  - Undo restores snapshot (active race only)
  - undo window ends on next action: any subsequent mutation clears snapshot

Implementation:
- Create `src/state/undoController.js` with:
  - setSnapshot, hasSnapshot, consumeSnapshot, clearSnapshot
- Create `nextAction()` function used at start of any mutation handler to clear snapshot.
- Add Toast component if not already present.

Testing:
- Unit tests for undoController:
  - consumeSnapshot returns once
  - clearSnapshot works
- Unit tests for "nextAction clears snapshot" behavior (can be simple).

Wiring:
- Ensure Undo restores planned workouts and UI updates.
- Ensure other actions (edit, drag/drop, add log, import) call nextAction first.

Output:
- Manual test: recalc then undo works; recalc then edit something disables undo.
- Tests pass.
```

---

## Final wiring prompt — Cleanup, remove seed-only UI, confirm no orphan code
```text
Final wiring & cleanup

Goal:
- Remove or hide any temporary debug UI that was only for seeding/testing, or gate it behind a small "Developer tools" collapse section.
- Confirm all key features from `frontspec.md` are accessible from the UI:
  - create race with prompt
  - week/month toggle
  - planned workouts on calendar, multiple/day, drag/drop confirm
  - planned workout modal editing + locked behavior + logs chronological + add another log
  - + log workout (unplanned) + attach
  - CSV export/import with error table
  - recalc + toast undo until next action
- Ensure there is no unused/orphaned code:
  - remove dead helpers not referenced
  - ensure every helper has either tests or usage

Testing:
- Run full test suite.
- Add a short "Manual QA checklist" section to `frontend/README.md`.

Output:
- Provide final file tree and instructions to run.
- Confirm tests pass.
```

--- 

## Notes for the code-generation LLM
- Prefer pure helpers and unit tests for logic-heavy parts.
- Keep UI simple; correctness > styling.
- Every prompt should result in a running app and passing tests.
- If an endpoint contract mismatch is discovered, implement a small config flag rather than rewriting large sections.

/**
 * Pure helpers for PlannedWorkout domain logic.
 * No side-effects — safe to unit-test in Node.
 */

/**
 * Applies a partial patch to a PlannedWorkout and returns a new object.
 *
 * Rules:
 *  - `locked` is NEVER changed by this function — locking is manual only.
 *  - `updatedAt` is refreshed whenever any field actually changes.
 *  - Returns the original reference unchanged when nothing differs.
 *
 * @param {object} workout
 * @param {object} patch
 * @param {{ now?: string }} [opts]
 * @returns {object}
 */
export function applyPlannedWorkoutPatch(workout, patch, opts = {}) {
  const now = opts.now ?? new Date().toISOString();

  const anyChanged = Object.keys(patch).some((key) => patch[key] !== workout[key]);
  if (!anyChanged) return workout;

  return {
    ...workout,
    ...patch,
    // locked is spread from patch if explicitly included, otherwise preserved as-is
    updatedAt: now,
  };
}

/**
 * Moves a PlannedWorkout to a new date WITHOUT touching locked.
 * Drag/drop rescheduling must not affect the lock flag.
 *
 * Returns the original reference unchanged when `newDate === workout.date`.
 *
 * @param {object} workout
 * @param {string} newDate  YYYY-MM-DD
 * @param {{ now?: string }} [opts]
 * @returns {object}
 */
export function movePlannedWorkout(workout, newDate, opts = {}) {
  if (workout.date === newDate) return workout;
  const now = opts.now ?? new Date().toISOString();
  return {
    ...workout,
    date:      newDate,
    // locked intentionally NOT changed
    updatedAt: now,
  };
}

/**
 * Returns true when the user should be shown a confirmation dialog before
 * completing a drag/drop move onto a target day.
 *
 * @param {number} targetDayWorkoutCount
 * @returns {boolean}
 */
export function shouldConfirmDrop(targetDayWorkoutCount) {
  return targetDayWorkoutCount > 0;
}

/**
 * Parses a string value for a numeric workout field.
 * Returns null for empty / non-numeric / negative input.
 *
 * @param {string} raw
 * @returns {number | null}
 */
export function parseWorkoutNumber(raw) {
  if (raw === '' || raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Normalises a raw form submission into a clean patch object.
 * Converts empty strings → null for numeric fields.
 *
 * @param {object} rawForm
 * @returns {object}
 */
export function normaliseWorkoutForm(rawForm) {
  return {
    ...(rawForm.type            !== undefined && { type:            rawForm.type }),
    ...(rawForm.date            !== undefined && { date:            rawForm.date }),
    ...(rawForm.title           !== undefined && { title:           rawForm.title }),
    ...(rawForm.distance        !== undefined && { distance:        parseWorkoutNumber(rawForm.distance) }),
    ...(rawForm.durationMinutes !== undefined && { durationMinutes: parseWorkoutNumber(rawForm.durationMinutes) }),
    ...(rawForm.paceLow         !== undefined && { paceLow:         rawForm.paceLow  || null }),
    ...(rawForm.paceHigh        !== undefined && { paceHigh:        rawForm.paceHigh || null }),
    ...(rawForm.structureText   !== undefined && { structureText:   rawForm.structureText }),
    ...(rawForm.notes           !== undefined && { notes:           rawForm.notes }),
  };
}
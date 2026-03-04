/**
 * Pure helpers for PlannedWorkout domain logic.
 */

import { WORKOUT_TYPES } from './workoutTypes.js';

/** Fields whose change triggers auto-lock. */
const LOCKABLE_FIELDS = new Set([
  'type', 'date', 'distance', 'durationMinutes',
  'paceLow', 'paceHigh', 'structureText', 'title', 'notes',
]);

/**
 * Applies a partial patch to a PlannedWorkout and returns a new object.
 * Sets locked=true when any lockable field actually changes.
 * Returns the original reference if nothing changed.
 *
 * @param {object} workout
 * @param {object} patch
 * @param {{ now?: string }} [opts]
 * @returns {object}
 */
export function applyPlannedWorkoutPatch(workout, patch, opts = {}) {
  const now = opts.now ?? new Date().toISOString();
  const lockableChanged = Object.keys(patch).some(
    (k) => LOCKABLE_FIELDS.has(k) && patch[k] !== workout[k]
  );
  const anyChanged = Object.keys(patch).some((k) => patch[k] !== workout[k]);
  if (!anyChanged) return workout;
  return {
    ...workout,
    ...patch,
    locked:    lockableChanged ? true : workout.locked,
    updatedAt: now,
  };
}

/**
 * Returns a new workout with the `date` changed to `targetDate`.
 * Sets locked=true because date is a lockable field.
 * Does NOT trigger recalculation — that is the caller's responsibility (or non-responsibility).
 *
 * Pure function — no Dexie side-effects.
 *
 * @param {object} workout        PlannedWorkout
 * @param {string} targetDate     YYYY-MM-DD
 * @param {{ now?: string }} [opts]
 * @returns {object}
 */
export function movePlannedWorkout(workout, targetDate, opts = {}) {
  if (workout.date === targetDate) return workout; // no-op
  return applyPlannedWorkoutPatch(workout, { date: targetDate }, opts);
}

/**
 * Returns true if a confirmation dialog should be shown before
 * dropping a workout onto the target day.
 *
 * Rule: confirm when the target day already contains ≥1 planned workout
 * that is NOT the workout being dragged.
 *
 * @param {number} targetDayWorkoutCount  number of existing workouts on the target day
 *                                        (excluding the dragged workout itself)
 * @returns {boolean}
 */
export function shouldConfirmDrop(targetDayWorkoutCount) {
  return targetDayWorkoutCount > 0;
}

/**
 * Parses a string value for a numeric workout field.
 * Returns null for empty / non-numeric / negative input.
 *
 * @param {string|null|undefined} raw
 * @returns {number | null}
 */
export function parseWorkoutNumber(raw) {
  if (raw === '' || raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Normalises raw form values into a clean patch object.
 * Converts empty strings → null for numeric/pace fields.
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
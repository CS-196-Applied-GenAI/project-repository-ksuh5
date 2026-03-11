/**
 * Pure helpers for PlannedWorkout domain logic.
 * No side-effects — safe to unit-test in Node.
 */

import { WORKOUT_TYPES } from './workoutTypes.js';

/**
 * All fields that count as "user-editable" for locking purposes.
 * Editing any of these automatically sets locked=true.
 */
const LOCKABLE_FIELDS = new Set([
  'type',
  'date',
  'distance',
  'durationMinutes',
  'paceLow',
  'paceHigh',
  'structureText',
  'title',
  'notes',
]);

/**
 * Applies a partial patch to a PlannedWorkout and returns a new object.
 *
 * Rules:
 *  - If the patch touches any lockable field whose value actually changed,
 *    `locked` is set to `true`.
 *  - `updatedAt` is always refreshed to `now` when any field changes.
 *  - If the patch changes nothing at all, the original object is returned
 *    unchanged (referential equality preserved).
 *
 * Pure: does not mutate inputs; does not call Date.now() directly —
 * accepts an optional `now` override so tests are deterministic.
 *
 * @param {object} workout  Existing PlannedWorkout record.
 * @param {object} patch    Partial fields to apply.
 * @param {object} [opts]
 * @param {string} [opts.now]  ISO timestamp override (for tests).
 * @returns {object}  New PlannedWorkout (or original if nothing changed).
 */
export function applyPlannedWorkoutPatch(workout, patch, opts = {}) {
  const now = opts.now ?? new Date().toISOString();

  // Determine which lockable fields actually changed value
  const lockableChanged = Object.keys(patch).some(
    (key) => LOCKABLE_FIELDS.has(key) && patch[key] !== workout[key]
  );

  // Determine if anything at all changed (to avoid pointless updates)
  const anyChanged = Object.keys(patch).some((key) => patch[key] !== workout[key]);

  if (!anyChanged) return workout; // nothing to do

  return {
    ...workout,
    ...patch,
    locked:    lockableChanged ? true : workout.locked,
    updatedAt: now,
  };
}

/**
 * Parses a string value for a numeric workout field.
 * Returns null for empty / non-numeric input.
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
 * @param {{
 *   type?: string,
 *   date?: string,
 *   title?: string,
 *   distance?: string,
 *   durationMinutes?: string,
 *   paceLow?: string,
 *   paceHigh?: string,
 *   structureText?: string,
 *   notes?: string,
 * }} rawForm
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
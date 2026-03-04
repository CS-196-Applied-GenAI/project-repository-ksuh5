/**
 * Pure helpers for WorkoutLog creation, normalization, and projection.
 */

/**
 * Normalizes raw LogWorkoutModal form state into a clean object
 * suitable for persisting as a WorkoutLog.
 */
export function normalizeLogFormInput(formState) {
  const date = (formState.date ?? '').trim();
  if (!date) throw new Error('date is required');

  const type = (formState.type ?? '').trim();
  if (!type) throw new Error('type is required');

  const time             = (formState.time ?? '').trim() || null;
  const distance         = parseNonNegativeNumber(formState.distance);
  const durationMinutes  = parseNonNegativeNumber(formState.durationMinutes);
  const notes            = (formState.notes ?? '').trim();

  return { date, time, type, distance, durationMinutes, notes };
}

/**
 * Builds a new WorkoutLog record ready for Dexie persistence.
 */
export function makeWorkoutLog(fields, overrides = {}) {
  const id  = overrides.id  ?? crypto.randomUUID();
  const now = overrides.now ?? new Date().toISOString();
  return {
    id,
    plannedWorkoutId: fields.plannedWorkoutId ?? null,
    date:             fields.date,
    time:             fields.time             ?? null,
    type:             fields.type,
    distance:         fields.distance         ?? null,
    durationMinutes:  fields.durationMinutes  ?? null,
    notes:            fields.notes            ?? '',
    createdAt:        now,
    updatedAt:        now,
  };
}

/**
 * Projects a WorkoutLog into the PlannedWorkout shape so it can be
 * rendered and edited through PlannedWorkoutModal without any changes
 * to the modal itself.
 *
 * The returned object carries a `_isLog: true` sentinel and the original
 * `_logId` so callers can tell it apart from real planned workouts.
 *
 * Fields mapped:
 *   log.id               → pw.id
 *   log.date             → pw.date
 *   log.type             → pw.type
 *   log.distance         → pw.distance
 *   log.durationMinutes  → pw.durationMinutes
 *   log.notes            → pw.notes  (also structureText for display)
 *   log.time             → pw.title  (shown in modal header as context)
 *
 * @param {object} log  WorkoutLog
 * @returns {object}    PlannedWorkout-shaped object
 */
export function logToPlannedWorkout(log) {
  return {
    // Identity
    id:              log.id,
    _isLog:          true,          // sentinel — never stored in Dexie
    _logId:          log.id,
    // Calendar fields
    raceId:          null,          // logs have no raceId
    date:            log.date,
    type:            log.type,
    title:           log.time ? `Log · ${log.time}` : 'Workout log',
    // Target fields (logs store actuals in the same columns)
    distance:        log.distance        ?? null,
    durationMinutes: log.durationMinutes ?? null,
    paceLow:         null,
    paceHigh:        null,
    structureText:   '',
    notes:           log.notes           ?? '',
    // Logs are never locked by the planning engine
    locked:          false,
    createdAt:       log.createdAt,
    updatedAt:       log.updatedAt,
  };
}

/**
 * Converts a PlannedWorkout-shaped patch (from PlannedWorkoutModal) back
 * into a WorkoutLog patch suitable for Dexie.
 *
 * Only fields that exist on WorkoutLog are forwarded.
 *
 * @param {object} pwPatch  Patch from normaliseWorkoutForm
 * @returns {object}        WorkoutLog patch
 */
export function plannedPatchToLogPatch(pwPatch) {
  const patch = {};
  if (pwPatch.date            !== undefined) patch.date            = pwPatch.date;
  if (pwPatch.type            !== undefined) patch.type            = pwPatch.type;
  if (pwPatch.distance        !== undefined) patch.distance        = pwPatch.distance;
  if (pwPatch.durationMinutes !== undefined) patch.durationMinutes = pwPatch.durationMinutes;
  if (pwPatch.notes           !== undefined) patch.notes           = pwPatch.notes;
  // title → time: strip the "Log · " prefix if present
  if (pwPatch.title !== undefined) {
    const raw = (pwPatch.title ?? '').replace(/^Log\s*·\s*/, '').trim();
    patch.time = raw || null;
  }
  return patch;
}

// ── internal ──────────────────────────────────────────────

function parseNonNegativeNumber(raw) {
  if (raw === '' || raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
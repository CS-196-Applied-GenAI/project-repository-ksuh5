/**
 * Canonical internal workout type definitions.
 *
 * Internal keys align with frontspec.md enum:
 *   easy | tempo | interval | long_run | cross_train | rest
 *
 * We also accept spec.md's "recover" as an alias for "rest" at the
 * API boundary (see displayWorkoutType below).
 */

/** Canonical workout type keys (internal enum). */
export const WORKOUT_TYPES = /** @type {const} */ ({
  EASY: 'easy',
  TEMPO: 'tempo',
  INTERVAL: 'interval',
  LONG_RUN: 'long_run',
  CROSS_TRAIN: 'cross_train',
  REST: 'rest',
});

/** All valid internal type keys as an array. */
export const ALL_WORKOUT_TYPES = Object.values(WORKOUT_TYPES);

/**
 * Quality workout types (per frontspec.md):
 *   tempo, interval, long_run.
 * cross_train is explicitly NOT quality.
 */
const QUALITY_TYPES = new Set([
  WORKOUT_TYPES.TEMPO,
  WORKOUT_TYPES.INTERVAL,
  WORKOUT_TYPES.LONG_RUN,
]);

/**
 * Returns true if the given type is a "quality" workout.
 * Cross-training is NOT quality. Unknown types return false.
 *
 * @param {string} type
 * @returns {boolean}
 */
export function isQualityType(type) {
  return QUALITY_TYPES.has(type);
}

/**
 * Human-readable display labels for each internal type.
 * Also handles spec.md aliases (e.g. "recover" → "Recovery run").
 */
const DISPLAY_LABELS = {
  [WORKOUT_TYPES.EASY]: 'Easy run',
  [WORKOUT_TYPES.TEMPO]: 'Tempo run',
  [WORKOUT_TYPES.INTERVAL]: 'Intervals',
  [WORKOUT_TYPES.LONG_RUN]: 'Long run',
  [WORKOUT_TYPES.CROSS_TRAIN]: 'Cross-training',
  [WORKOUT_TYPES.REST]: 'Rest day',
  // spec.md aliases
  recover: 'Recovery run',
  rest_day: 'Rest day',
  intervals: 'Intervals',
  easy_run: 'Easy run',
  long_run: 'Long run',
  tempo: 'Tempo run',
  cross_training: 'Cross-training',
};

/**
 * Returns a friendly display label for a workout type.
 * Falls back to the raw type string (title-cased) for unknown types.
 *
 * @param {string} type
 * @returns {string}
 */
export function displayWorkoutType(type) {
  if (!type) return 'Unknown';
  return DISPLAY_LABELS[type] ?? toTitleCase(type);
}

/** @param {string} s */
function toTitleCase(s) {
  return s
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
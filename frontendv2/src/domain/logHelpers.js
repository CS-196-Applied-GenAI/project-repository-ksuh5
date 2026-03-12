/**
 * Pure helpers for WorkoutLog domain logic.
 * No side-effects — safe to unit-test in Node.
 */

import { compareLogsChronological } from './logSort.js';

/**
 * Returns all logs that belong to a given planned workout id,
 * sorted chronologically (date → time → createdAt).
 *
 * @param {object[]} logs            All WorkoutLog records.
 * @param {string}   plannedWorkoutId
 * @returns {object[]}
 */
export function getLogsForPlanned(logs, plannedWorkoutId) {
  return logs
    .filter((l) => l.plannedWorkoutId === plannedWorkoutId)
    .sort(compareLogsChronological);
}

/**
 * Returns all logs that are unplanned (plannedWorkoutId is null),
 * sorted chronologically.
 *
 * @param {object[]} logs
 * @returns {object[]}
 */
export function getUnplannedLogs(logs) {
  return logs
    .filter((l) => l.plannedWorkoutId == null)
    .sort(compareLogsChronological);
}

/**
 * Formats a WorkoutLog's time field for display.
 * Returns '' when time is null.
 *
 * @param {string|null} time  HH:MM
 * @returns {string}
 */
export function formatLogTime(time) {
  if (!time) return '';
  return time; // already HH:MM; extend here for 12h display if needed
}

/**
 * Builds a compact one-line summary string for a log entry.
 * e.g. "3 mi · 30 min" or "30 min" or "3 mi"
 *
 * @param {{ distance: number|null, durationMinutes: number|null }} log
 * @returns {string}
 */
export function logSummary(log) {
  const parts = [];
  if (log.distance)        parts.push(`${log.distance} mi`);
  if (log.durationMinutes) parts.push(`${log.durationMinutes} min`);
  return parts.join(' · ');
}
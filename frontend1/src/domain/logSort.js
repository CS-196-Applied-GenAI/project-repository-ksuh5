/**
 * Helpers for WorkoutLog sorting and filtering.
 */
import { displayWorkoutType } from './workoutTypes.js';

export function compareLogsChronological(a, b) {
  if (a.date < b.date) return -1;
  if (a.date > b.date) return 1;

  const aTime = a.time ?? null;
  const bTime = b.time ?? null;

  if (aTime !== null && bTime !== null) {
    if (aTime < bTime) return -1;
    if (aTime > bTime) return 1;
  } else if (aTime === null && bTime !== null) {
    return 1;
  } else if (aTime !== null && bTime === null) {
    return -1;
  }

  if (a.createdAt < b.createdAt) return -1;
  if (a.createdAt > b.createdAt) return 1;
  return 0;
}

export function getLogsForPlanned(logs, plannedWorkoutId) {
  return logs
    .filter((l) => l.plannedWorkoutId === plannedWorkoutId)
    .sort(compareLogsChronological);
}

export function getUnplannedLogs(logs) {
  return logs
    .filter((l) => l.plannedWorkoutId == null)
    .sort(compareLogsChronological);
}

/**
 * Groups logs by their `date` field (YYYY-MM-DD), sorted chronologically
 * within each day. Used by calendar components.
 *
 * @param {WorkoutLog[]} logs
 * @returns {Record<string, WorkoutLog[]>}
 */
export function groupLogsByDate(logs) {
  const map = {};
  for (const log of logs) {
    if (!map[log.date]) map[log.date] = [];
    map[log.date].push(log);
  }
  // Sort each bucket chronologically
  for (const date in map) {
    map[date].sort(compareLogsChronological);
  }
  return map;
}

export function logSummary(log) {
  const parts = [displayWorkoutType(log.type)];
  if (log.distance)        parts.push(`${log.distance} mi`);
  if (log.durationMinutes) parts.push(`${log.durationMinutes} min`);
  return parts.join(' · ');
}
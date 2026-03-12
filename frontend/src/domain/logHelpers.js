/**
 * Pure helpers for WorkoutLog domain logic.
 * No side-effects — safe to unit-test in Node.
 */

import { compareLogsChronological } from './logSort.js';

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

export function formatLogTime(time) {
  if (!time) return '';
  return time; // already HH:MM; extend here for 12h display if needed
}

export function logSummary(log) {
  const parts = [];
  if (log.distance)        parts.push(`${log.distance} mi`);
  if (log.durationMinutes) parts.push(`${log.durationMinutes} min`);
  return parts.join(' · ');
}

/**
 * Completed planned-workout IDs stored client-side.
 * Used by summary UI to compute completed run totals.
 */
export const COMPLETED_PLANNED_WORKOUTS_LS_KEY = 'pw:completedIds:v1';

export function getCompletedPlannedWorkoutIds() {
  try {
    const raw = localStorage.getItem(COMPLETED_PLANNED_WORKOUTS_LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
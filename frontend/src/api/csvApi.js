import { apiFetch } from './http.js';
import {
  frontendWorkoutToBackend,
  frontendLogToBackend,
  backendWorkoutToFrontend,
  backendLogToFrontend,
} from './mappers.js';

/**
 * Calls POST /csv/export.
 * @param {object} params
 * @param {Array}  params.plannedWorkouts  - array of frontend-shaped planned workout objects
 * @param {Array}  params.workoutLogs      - array of frontend-shaped workout log objects
 * @returns {Promise<{ plannedWorkoutsCsv: string, workoutLogsCsv: string }>}
 */
export async function exportCsv({ plannedWorkouts, workoutLogs }) {
  const payload = {
    planned_workouts: plannedWorkouts.map(frontendWorkoutToBackend),
    workout_logs:     workoutLogs.map(frontendLogToBackend),
  };

  const response = await apiFetch('/csv/export', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    plannedWorkoutsCsv: response.planned_workouts_csv,
    workoutLogsCsv:     response.workout_logs_csv,
  };
}

/**
 * Calls POST /csv/import.
 * @param {object} params
 * @param {string} params.plannedWorkoutsCsv  - CSV text for planned workouts
 * @param {string} params.workoutLogsCsv      - CSV text for workout logs
 * @returns {Promise<{ plannedWorkouts: Array, workoutLogs: Array, errors: Array }>}
 */
export async function importCsv({ plannedWorkoutsCsv, workoutLogsCsv }) {
  const payload = {
    planned_workouts_csv: plannedWorkoutsCsv,
    workout_logs_csv:     workoutLogsCsv,
  };

  const response = await apiFetch('/csv/import', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    plannedWorkouts: (response.planned_workouts ?? []).map(backendWorkoutToFrontend),
    workoutLogs:     (response.workout_logs     ?? []).map(backendLogToFrontend),
    errors:          response.errors ?? [],
  };
}
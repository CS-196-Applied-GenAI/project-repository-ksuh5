import { apiFetch } from './http.js';
import { frontendWorkoutToBackend, frontendLogToBackend } from './mappers.js';

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
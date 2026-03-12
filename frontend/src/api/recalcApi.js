import { apiFetch } from './http.js';
import {
  frontendWorkoutToBackend,
  backendWorkoutToFrontend,
  frontendRaceStatusToBackend,
} from './mappers.js';

/**
 * Calls POST /plan/recalculate.
 * @param {object} params
 * @param {string} params.today              - ISO date string (YYYY-MM-DD)
 * @param {object} params.raceStatus         - frontend race status string e.g. 'active'
 * @param {Array}  params.plannedWorkouts    - array of frontend-shaped planned workout objects
 * @returns {Promise<Array>} updatedWorkouts - array of frontend-shaped planned workout objects
 */
export async function recalculatePlan({ today, raceStatus, plannedWorkouts }) {
  const payload = {
    today,
    race_status: frontendRaceStatusToBackend(raceStatus),
    planned_workouts: plannedWorkouts.map(frontendWorkoutToBackend),
  };

  const response = await apiFetch('/plan/recalculate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.map(backendWorkoutToFrontend);
}
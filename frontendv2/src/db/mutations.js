/**
 * Write-through mutation helpers.
 *
 * Pattern: write to Dexie, return the record so the caller
 * can update React state immediately.
 */
import db from './db.js';

// ── Races ────────────────────────────────────────────────

/** Insert or fully replace a race. Returns the record. */
export async function upsertRace(race) {
  await db.races.put(race);
  return race;
}

/** Delete a race by id. */
export async function deleteRace(id) {
  await db.races.delete(id);
}

// ── PlannedWorkouts ──────────────────────────────────────

/** Insert or fully replace a planned workout. Returns the record. */
export async function upsertPlannedWorkout(workout) {
  await db.plannedWorkouts.put(workout);
  return workout;
}

/** Delete a planned workout by id. */
export async function deletePlannedWorkout(id) {
  await db.plannedWorkouts.delete(id);
}

// ── WorkoutLogs ──────────────────────────────────────────

/** Insert or fully replace a workout log. Returns the record. */
export async function upsertWorkoutLog(log) {
  await db.workoutLogs.put(log);
  return log;
}

/** Delete a workout log by id. */
export async function deleteWorkoutLog(id) {
  await db.workoutLogs.delete(id);
}
/**
 * Write-through mutation helpers.
 *
 * Pattern: write to Dexie first, return the record so the caller
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

// ── Compound: create race (+ optional starter workout) ───

/**
 * Persists a new race and optionally seeds one "easy" planned workout
 * on the race's startDate.
 *
 * Returns { race, workout: PlannedWorkout | null }.
 *
 * @param {object} race            A Race object (from makeRace).
 * @param {boolean} seedWorkout    If true, inserts a starter planned workout.
 */
export async function createRaceWithOptionalWorkout(race, seedWorkout = false) {
  let workout = null;

  await db.transaction('rw', db.races, db.plannedWorkouts, async () => {
    await db.races.put(race);

    if (seedWorkout) {
      const now = new Date().toISOString();
      workout = {
        id:              crypto.randomUUID(),
        raceId:          race.id,
        date:            race.startDate,
        type:            'easy',
        title:           'Opening run',
        distance:        null,
        durationMinutes: null,
        notes:           '',
        locked:          false,
        createdAt:       now,
        updatedAt:       now,
      };
      await db.plannedWorkouts.put(workout);
    }
  });

  return { race, workout };
}
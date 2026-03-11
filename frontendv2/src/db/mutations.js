/**
 * Write-through mutation helpers.
 *
 * Pattern: write to Dexie first, return the record so the caller
 * can update React state immediately.
 */
import db from './db.js';
import { applyNewRaceDecision } from '../domain/raceHelpers.js';

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
 * @param {object}  race          A Race object (from makeRace).
 * @param {boolean} seedWorkout   If true, inserts a starter planned workout.
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

// ── Compound: enforce single-active then create ───────────

/**
 * Enforces the single-active-race constraint in a single transaction.
 *
 * Steps:
 *  1. Look up any current active race in Dexie (source of truth).
 *  2. If one exists, apply the user's decision via `applyNewRaceDecision`.
 *  3. If cancelled → return { cancelled: true }, touching nothing.
 *  4. If archive/complete → update previous race + write new race in one tx.
 *  5. Optionally seed a starter planned workout.
 *
 * Returns:
 *   { cancelled: true }
 *   { cancelled: false, race, workout: PlannedWorkout | null }
 *
 * @param {{
 *   newRace:      object,
 *   decision:     'archive' | 'complete' | 'cancel' | null,
 *   seedWorkout:  boolean,
 * }} params
 */
export async function createRaceEnforcingSingleActive({
  newRace,
  decision,
  seedWorkout = false,
}) {
  // Read current active race directly from Dexie (not stale React state)
  const existingActive = await db.races
    .where('status')
    .equals('active')
    .first();

  // No conflict — just create
  if (!existingActive) {
    const result = await createRaceWithOptionalWorkout(newRace, seedWorkout);
    return { cancelled: false, ...result };
  }

  // Conflict — apply decision
  const outcome = applyNewRaceDecision({
    existingActiveRace: existingActive,
    decision,
  });

  if (outcome.cancelled) {
    return { cancelled: true };
  }

  // Write both updates atomically
  let workout = null;
  await db.transaction('rw', db.races, db.plannedWorkouts, async () => {
    // Demote previous active race
    await db.races.put(outcome.updatedExisting);

    // Create new active race
    await db.races.put(newRace);

    if (seedWorkout) {
      const now = new Date().toISOString();
      workout = {
        id:              crypto.randomUUID(),
        raceId:          newRace.id,
        date:            newRace.startDate,
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

  return { cancelled: false, race: newRace, workout };
}
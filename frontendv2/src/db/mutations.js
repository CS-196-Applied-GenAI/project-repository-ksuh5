/**
 * Write-through mutation helpers.
 */
import db from './db.js';
import { applyNewRaceDecision }      from '../domain/raceHelpers.js';
import { applyPlannedWorkoutPatch }  from '../domain/workoutHelpers.js';

// ── Races ────────────────────────────────────────────────

export async function upsertRace(race) {
  await db.races.put(race);
  return race;
}

export async function deleteRace(id) {
  await db.races.delete(id);
}

// ── PlannedWorkouts ──────────────────────────────────────

export async function upsertPlannedWorkout(workout) {
  await db.plannedWorkouts.put(workout);
  return workout;
}

export async function deletePlannedWorkout(id) {
  await db.plannedWorkouts.delete(id);
}

/**
 * Apply a patch to an existing planned workout.
 * Uses applyPlannedWorkoutPatch for locking semantics, then persists.
 * Returns the updated workout.
 *
 * @param {object} existing  Current workout from React state.
 * @param {object} patch     Fields to change.
 * @returns {Promise<object>}
 */
export async function updatePlannedWorkout(existing, patch) {
  const updated = applyPlannedWorkoutPatch(existing, patch);
  if (updated === existing) return existing; // nothing changed
  await db.plannedWorkouts.put(updated);
  return updated;
}

// ── WorkoutLogs ──────────────────────────────────────────

export async function upsertWorkoutLog(log) {
  await db.workoutLogs.put(log);
  return log;
}

export async function deleteWorkoutLog(id) {
  await db.workoutLogs.delete(id);
}

// ── Compound: create race ────────────────────────────────

export async function createRaceWithOptionalWorkout(race, seedWorkout = false) {
  let workout = null;
  await db.transaction('rw', db.races, db.plannedWorkouts, async () => {
    await db.races.put(race);
    if (seedWorkout) {
      const now = new Date().toISOString();
      workout = {
        id: crypto.randomUUID(), raceId: race.id,
        date: race.startDate, type: 'easy', title: 'Opening run',
        distance: null, durationMinutes: null,
        paceLow: null, paceHigh: null, structureText: '', notes: '',
        locked: false, createdAt: now, updatedAt: now,
      };
      await db.plannedWorkouts.put(workout);
    }
  });
  return { race, workout };
}

export async function createRaceEnforcingSingleActive({ newRace, decision, seedWorkout = false }) {
  const existingActive = await db.races.where('status').equals('active').first();

  if (!existingActive) {
    const result = await createRaceWithOptionalWorkout(newRace, seedWorkout);
    return { cancelled: false, ...result };
  }

  const outcome = applyNewRaceDecision({ existingActiveRace: existingActive, decision });
  if (outcome.cancelled) return { cancelled: true };

  let workout = null;
  await db.transaction('rw', db.races, db.plannedWorkouts, async () => {
    await db.races.put(outcome.updatedExisting);
    await db.races.put(newRace);
    if (seedWorkout) {
      const now = new Date().toISOString();
      workout = {
        id: crypto.randomUUID(), raceId: newRace.id,
        date: newRace.startDate, type: 'easy', title: 'Opening run',
        distance: null, durationMinutes: null,
        paceLow: null, paceHigh: null, structureText: '', notes: '',
        locked: false, createdAt: now, updatedAt: now,
      };
      await db.plannedWorkouts.put(workout);
    }
  });
  return { cancelled: false, race: newRace, workout };
}
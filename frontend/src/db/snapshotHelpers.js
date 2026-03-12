import db from './db.js';

/**
 * Builds a full snapshot of the current Dexie database state.
 * @returns {Promise<{ races: Array, plannedWorkouts: Array, workoutLogs: Array }>}
 */
export async function buildSnapshot() {
  const [races, plannedWorkouts, workoutLogs] = await Promise.all([
    db.races.toArray(),
    db.plannedWorkouts.toArray(),
    db.workoutLogs.toArray(),
  ]);
  return { races, plannedWorkouts, workoutLogs };
}

/**
 * Clears all three Dexie tables and re-populates them from a snapshot.
 * @param {{ races: Array, plannedWorkouts: Array, workoutLogs: Array }} snapshot
 * @returns {Promise<void>}
 */
export async function applySnapshot(snapshot) {
  await db.transaction('rw', db.races, db.plannedWorkouts, db.workoutLogs, async () => {
    await db.races.clear();
    await db.plannedWorkouts.clear();
    await db.workoutLogs.clear();

    if (snapshot.races?.length)           await db.races.bulkPut(snapshot.races);
    if (snapshot.plannedWorkouts?.length) await db.plannedWorkouts.bulkPut(snapshot.plannedWorkouts);
    if (snapshot.workoutLogs?.length)     await db.workoutLogs.bulkPut(snapshot.workoutLogs);
  });
}
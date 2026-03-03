import { db } from './db.js';

export async function loadAllData() {
  const [races, plannedWorkouts, workoutLogs] = await Promise.all([
    db.races.toArray(),
    db.plannedWorkouts.toArray(),
    db.workoutLogs.toArray(),
  ]);
  return { races, plannedWorkouts, workoutLogs };
}

export async function seedSampleData() {
  const now = new Date().toISOString();
  const today = new Date().toISOString().slice(0, 10);

  const raceId = crypto.randomUUID();
  const plannedWorkoutId = crypto.randomUUID();
  const workoutLogId = crypto.randomUUID();

  await db.races.put({
    id: raceId,
    name: 'Sample Race',
    startDate: today,
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  await db.plannedWorkouts.put({
    id: plannedWorkoutId,
    raceId: raceId,
    date: today,
    type: 'easy',
    title: 'Easy run',
    distance: 5,
    durationMinutes: 40,
    notes: '',
    locked: false,
    paceLow: null,
    paceHigh: null,
    structureText: '',
    createdAt: now,
    updatedAt: now,
  });

  await db.workoutLogs.put({
    id: workoutLogId,
    plannedWorkoutId: null,
    date: today,
    time: null,
    type: 'easy',
    distance: 3,
    durationMinutes: 25,
    notes: 'Unplanned run',
    createdAt: now,
    updatedAt: now,
  });

  return loadAllData();
}

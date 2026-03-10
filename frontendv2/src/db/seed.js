/**
 * Inserts a fixed set of sample data for manual QA / demo purposes.
 * Safe to call multiple times — uses put() so existing records are replaced.
 */
import db from './db.js';

const NOW = new Date().toISOString();

const SAMPLE_RACE = {
  id: 'seed-race-001',
  name: 'Spring 5K',
  startDate: '2026-03-10',
  endDate: '2026-05-01',
  status: 'active',
  createdAt: NOW,
  updatedAt: NOW,
};

const SAMPLE_PLANNED_WORKOUT = {
  id: 'seed-pw-001',
  raceId: 'seed-race-001',
  date: '2026-03-10',
  type: 'easy',
  title: 'Opening easy run',
  distance: 3,
  durationMinutes: 30,
  notes: 'Shake-out pace.',
  locked: false,
  createdAt: NOW,
  updatedAt: NOW,
};

const SAMPLE_LOG = {
  id: 'seed-log-001',
  plannedWorkoutId: null, // unplanned log
  date: '2026-03-03',
  time: '07:30',
  type: 'easy',
  distance: 2.5,
  durationMinutes: 25,
  notes: 'Morning jog before the plan starts.',
  createdAt: NOW,
  updatedAt: NOW,
};

export async function seedSampleData() {
  await db.transaction('rw', db.races, db.plannedWorkouts, db.workoutLogs, async () => {
    await db.races.put(SAMPLE_RACE);
    await db.plannedWorkouts.put(SAMPLE_PLANNED_WORKOUT);
    await db.workoutLogs.put(SAMPLE_LOG);
  });
}
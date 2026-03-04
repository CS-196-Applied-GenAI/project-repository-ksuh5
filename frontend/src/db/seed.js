/**
 * Inserts a fixed set of sample data for manual QA / demo purposes.
 * Safe to call multiple times — uses put() so existing records are replaced.
 *
 * Seeds:
 *   - 1 active race   (Spring 5K)
 *   - 1 archived race (Winter Race) — lets you verify RaceBar only shows active
 *   - 1 planned workout (for the active race)
 *   - 1 unplanned workout log
 */
import db from './db.js';

const NOW = new Date().toISOString();

const SAMPLE_RACES = [
  {
    id: 'seed-race-001',
    name: 'Spring 5K',
    startDate: '2026-03-10',
    endDate: '2026-05-01',
    status: 'active',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'seed-race-002',
    name: 'Winter Race',
    startDate: '2025-11-01',
    endDate: '2026-01-15',
    status: 'archived',
    createdAt: NOW,
    updatedAt: NOW,
  },
];

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
  await db.transaction(
    'rw',
    db.races,
    db.plannedWorkouts,
    db.workoutLogs,
    async () => {
      for (const race of SAMPLE_RACES) {
        await db.races.put(race);
      }
      await db.plannedWorkouts.put(SAMPLE_PLANNED_WORKOUT);
      await db.workoutLogs.put(SAMPLE_LOG);
    }
  );
}
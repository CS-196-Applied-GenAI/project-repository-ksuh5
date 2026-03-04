/**
 * Seeds sample data for manual QA / demo purposes.
 * Safe to call multiple times — uses put() so existing records are replaced.
 *
 * Seeds:
 *   - 1 active race   (Spring 5K)
 *   - 1 archived race (Winter Race)
 *   - 1 planned workout (for the active race)
 *   - 4 workout logs:
 *       • 3 attached to the planned workout (different times to verify sort)
 *       • 1 unplanned log (plannedWorkoutId = null)
 */
import db from './db.js';

const NOW = new Date().toISOString();

const SAMPLE_RACES = [
  {
    id: 'seed-race-001', name: 'Spring 5K',
    startDate: '2026-03-10', endDate: '2026-05-01',
    status: 'active', createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'seed-race-002', name: 'Winter Race',
    startDate: '2025-11-01', endDate: '2026-01-15',
    status: 'archived', createdAt: NOW, updatedAt: NOW,
  },
];

const SAMPLE_PLANNED_WORKOUT = {
  id: 'seed-pw-001', raceId: 'seed-race-001',
  date: '2026-03-10', type: 'easy', title: 'Opening easy run',
  distance: 3, durationMinutes: 30,
  paceLow: '9:30', paceHigh: '10:00',
  structureText: 'Comfortable effort throughout. Keep HR zone 2.',
  notes: 'Shake-out pace.',
  locked: false, createdAt: NOW, updatedAt: NOW,
};

// Three logs attached to the planned workout, intentionally out of order
// so the UI sort can be verified visually.
const SAMPLE_LOGS = [
  {
    id: 'seed-log-001',
    plannedWorkoutId: 'seed-pw-001',  // attached
    date: '2026-03-10',
    time: '09:15',                    // middle time
    type: 'easy',
    distance: 3.1, durationMinutes: 32,
    notes: 'Felt great. HR stayed low the whole run.',
    createdAt: '2026-03-10T09:50:00.000Z',
    updatedAt: '2026-03-10T09:50:00.000Z',
  },
  {
    id: 'seed-log-002',
    plannedWorkoutId: 'seed-pw-001',  // attached — latest time
    date: '2026-03-10',
    time: '18:00',                    // evening, should sort last among timed
    type: 'easy',
    distance: 1, durationMinutes: 12,
    notes: 'Short evening shakeout.',
    createdAt: '2026-03-10T18:15:00.000Z',
    updatedAt: '2026-03-10T18:15:00.000Z',
  },
  {
    id: 'seed-log-003',
    plannedWorkoutId: 'seed-pw-001',  // attached — earliest time
    date: '2026-03-10',
    time: '06:30',                    // morning, should sort first
    type: 'easy',
    distance: 2, durationMinutes: 20,
    notes: 'Early morning warmup.',
    createdAt: '2026-03-10T06:55:00.000Z',
    updatedAt: '2026-03-10T06:55:00.000Z',
  },
  {
    id: 'seed-log-004',
    plannedWorkoutId: null,            // unplanned
    date: '2026-03-03',
    time: null,                        // no time — should sort last within same date
    type: 'easy',
    distance: 2.5, durationMinutes: 25,
    notes: 'Morning jog before the plan starts.',
    createdAt: '2026-03-03T07:00:00.000Z',
    updatedAt: '2026-03-03T07:00:00.000Z',
  },
];

export async function seedSampleData() {
  await db.transaction(
    'rw',
    db.races,
    db.plannedWorkouts,
    db.workoutLogs,
    async () => {
      for (const race of SAMPLE_RACES) await db.races.put(race);
      await db.plannedWorkouts.put(SAMPLE_PLANNED_WORKOUT);
      for (const log of SAMPLE_LOGS) await db.workoutLogs.put(log);
    }
  );
}
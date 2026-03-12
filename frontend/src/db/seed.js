/**
 * Inserts a fixed set of sample data for manual QA / demo purposes.
 * Safe to call multiple times — uses put() so existing records are replaced.
 *
 * Seeds:
 *   - 1 active race   (Spring 5K)
 *   - 1 archived race (Winter Race)
 *   - 1 planned workout on 2026-03-10
 *   - 3 logs attached to the planned workout (different times → verify sort)
 *   - 1 unplanned log
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
  paceLow: null,
  paceHigh: null,
  structureText: '',
  notes: 'Shake-out pace.',
  locked: false,
  createdAt: NOW,
  updatedAt: NOW,
};

// Three attached logs — intentionally seeded OUT of chronological order
// so the UI sort is visually verifiable:
//   Expected display order: log-003 (09:00) → log-001 (11:30) → log-002 (null time, last)
const ATTACHED_LOG_LATE_MORNING = {
  id: 'seed-log-001',
  plannedWorkoutId: 'seed-pw-001',
  date: '2026-03-10',
  time: '11:30',
  type: 'easy',
  distance: 3.1,
  durationMinutes: 32,
  notes: 'Felt good, slight headwind.',
  createdAt: '2026-03-10T11:35:00.000Z',
  updatedAt: '2026-03-10T11:35:00.000Z',
};

const ATTACHED_LOG_NO_TIME = {
  id: 'seed-log-002',
  plannedWorkoutId: 'seed-pw-001',
  date: '2026-03-10',
  time: null,           // no time recorded → should sort LAST
  type: 'easy',
  distance: null,
  durationMinutes: 28,
  notes: 'Evening stroll, forgot to check clock.',
  createdAt: '2026-03-10T19:00:00.000Z',
  updatedAt: '2026-03-10T19:00:00.000Z',
};

const ATTACHED_LOG_EARLY = {
  id: 'seed-log-003',
  plannedWorkoutId: 'seed-pw-001',
  date: '2026-03-10',
  time: '09:00',        // earliest → should sort FIRST
  type: 'easy',
  distance: 2.5,
  durationMinutes: 25,
  notes: 'Quick morning shakeout.',
  createdAt: '2026-03-10T09:10:00.000Z',
  updatedAt: '2026-03-10T09:10:00.000Z',
};

const UNPLANNED_LOG = {
  id: 'seed-log-004',
  plannedWorkoutId: null, // unplanned
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
      await db.workoutLogs.put(ATTACHED_LOG_LATE_MORNING);
      await db.workoutLogs.put(ATTACHED_LOG_NO_TIME);
      await db.workoutLogs.put(ATTACHED_LOG_EARLY);
      await db.workoutLogs.put(UNPLANNED_LOG);
    }
  );
}
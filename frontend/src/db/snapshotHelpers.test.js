import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildSnapshot, applySnapshot } from './snapshotHelpers.js';

// ── Mock Dexie db ─────────────────────────────────────────────────────────────
// All mock fns MUST be defined inside the factory (vi.mock is hoisted to the
// top of the file, so any top-level variables are not yet initialised).

vi.mock('./db.js', () => {
  const clearMock   = vi.fn().mockResolvedValue(undefined);
  const bulkPutMock = vi.fn().mockResolvedValue(undefined);

  return {
    default: {
      races: {
        toArray: vi.fn(),
        clear:   clearMock,
        bulkPut: bulkPutMock,
      },
      plannedWorkouts: {
        toArray: vi.fn(),
        clear:   clearMock,
        bulkPut: bulkPutMock,
      },
      workoutLogs: {
        toArray: vi.fn(),
        clear:   clearMock,
        bulkPut: bulkPutMock,
      },
      transaction: vi.fn(async (_mode, _t1, _t2, _t3, fn) => fn()),
    },
  };
});

// ── Test data ─────────────────────────────────────────────────────────────────

const mockRaces           = [{ id: 'r1', name: 'Marathon' }];
const mockPlannedWorkouts = [{ id: 'pw1', type: 'easy' }];
const mockWorkoutLogs     = [{ id: 'wl1', type: 'easy' }];

// ── buildSnapshot ─────────────────────────────────────────────────────────────

describe('buildSnapshot', () => {
  beforeEach(async () => {
    const { default: db } = await import('./db.js');
    db.races.toArray.mockResolvedValue(mockRaces);
    db.plannedWorkouts.toArray.mockResolvedValue(mockPlannedWorkouts);
    db.workoutLogs.toArray.mockResolvedValue(mockWorkoutLogs);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('returns all three collections from Dexie', async () => {
    const snapshot = await buildSnapshot();
    expect(snapshot).toEqual({
      races:           mockRaces,
      plannedWorkouts: mockPlannedWorkouts,
      workoutLogs:     mockWorkoutLogs,
    });
  });

  test('calls toArray on all three tables', async () => {
    const { default: db } = await import('./db.js');
    await buildSnapshot();
    expect(db.races.toArray).toHaveBeenCalledTimes(1);
    expect(db.plannedWorkouts.toArray).toHaveBeenCalledTimes(1);
    expect(db.workoutLogs.toArray).toHaveBeenCalledTimes(1);
  });
});

// ── applySnapshot ─────────────────────────────────────────────────────────────

describe('applySnapshot', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('clears all three tables before re-populating', async () => {
    const { default: db } = await import('./db.js');
    await applySnapshot({
      races:           mockRaces,
      plannedWorkouts: mockPlannedWorkouts,
      workoutLogs:     mockWorkoutLogs,
    });
    expect(db.races.clear).toHaveBeenCalled();
    expect(db.plannedWorkouts.clear).toHaveBeenCalled();
    expect(db.workoutLogs.clear).toHaveBeenCalled();
  });

  test('calls bulkPut with correct data for each table', async () => {
    const { default: db } = await import('./db.js');
    await applySnapshot({
      races:           mockRaces,
      plannedWorkouts: mockPlannedWorkouts,
      workoutLogs:     mockWorkoutLogs,
    });
    expect(db.races.bulkPut).toHaveBeenCalledWith(mockRaces);
    expect(db.plannedWorkouts.bulkPut).toHaveBeenCalledWith(mockPlannedWorkouts);
    expect(db.workoutLogs.bulkPut).toHaveBeenCalledWith(mockWorkoutLogs);
  });

  test('skips bulkPut when a collection is empty', async () => {
    const { default: db } = await import('./db.js');
    await applySnapshot({
      races:           [],
      plannedWorkouts: [],
      workoutLogs:     [],
    });
    expect(db.races.bulkPut).not.toHaveBeenCalled();
    expect(db.plannedWorkouts.bulkPut).not.toHaveBeenCalled();
    expect(db.workoutLogs.bulkPut).not.toHaveBeenCalled();
  });

  test('runs inside a Dexie transaction', async () => {
    const { default: db } = await import('./db.js');
    await applySnapshot({ races: [], plannedWorkouts: [], workoutLogs: [] });
    expect(db.transaction).toHaveBeenCalledWith(
      'rw',
      db.races,
      db.plannedWorkouts,
      db.workoutLogs,
      expect.any(Function)
    );
  });
});
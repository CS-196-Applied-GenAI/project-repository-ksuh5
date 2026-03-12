import { describe, test, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAppData } from './useAppData.js';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../db/db.js', () => ({
  default: {
    races:           { toArray: vi.fn(), count: vi.fn() },
    plannedWorkouts: { toArray: vi.fn(), count: vi.fn() },
    workoutLogs:     { toArray: vi.fn(), count: vi.fn() },
  },
}));

vi.mock('../api/stateApi.js', () => ({
  loadState: vi.fn(),
}));

vi.mock('../db/snapshotHelpers.js', () => ({
  applySnapshot: vi.fn(),
}));

async function getModules() {
  const { default: db }    = await import('../db/db.js');
  const { loadState }      = await import('../api/stateApi.js');
  const { applySnapshot }  = await import('../db/snapshotHelpers.js');
  return { db, loadState, applySnapshot };
}

afterEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAppData — normal load', () => {
  test('loads all three collections from Dexie', async () => {
    const { db, loadState } = await getModules();
    db.races.count.mockResolvedValue(1);
    db.plannedWorkouts.count.mockResolvedValue(0);
    db.workoutLogs.count.mockResolvedValue(0);
    db.races.toArray.mockResolvedValue([{ id: 'r1' }]);
    db.plannedWorkouts.toArray.mockResolvedValue([{ id: 'pw1' }]);
    db.workoutLogs.toArray.mockResolvedValue([{ id: 'wl1' }]);
    loadState.mockResolvedValue(null);

    const { result } = renderHook(() => useAppData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.races).toEqual([{ id: 'r1' }]);
    expect(result.current.plannedWorkouts).toEqual([{ id: 'pw1' }]);
    expect(result.current.workoutLogs).toEqual([{ id: 'wl1' }]);
  });
});

describe('useAppData — bootstrap when Dexie is empty', () => {
  test('calls applySnapshot when Dexie is empty and snapshot exists', async () => {
    const { db, loadState, applySnapshot } = await getModules();
    // Dexie is empty
    db.races.count.mockResolvedValue(0);
    db.plannedWorkouts.count.mockResolvedValue(0);
    db.workoutLogs.count.mockResolvedValue(0);
    db.races.toArray.mockResolvedValue([]);
    db.plannedWorkouts.toArray.mockResolvedValue([]);
    db.workoutLogs.toArray.mockResolvedValue([]);

    const snapshot = { races: [{ id: 'r1' }], plannedWorkouts: [], workoutLogs: [] };
    loadState.mockResolvedValue(snapshot);
    applySnapshot.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAppData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(applySnapshot).toHaveBeenCalledWith(snapshot);
  });

  test('does NOT call applySnapshot when Dexie is non-empty', async () => {
    const { db, loadState, applySnapshot } = await getModules();
    // Dexie has data
    db.races.count.mockResolvedValue(2);
    db.plannedWorkouts.count.mockResolvedValue(0);
    db.workoutLogs.count.mockResolvedValue(0);
    db.races.toArray.mockResolvedValue([{ id: 'r1' }]);
    db.plannedWorkouts.toArray.mockResolvedValue([]);
    db.workoutLogs.toArray.mockResolvedValue([]);
    loadState.mockResolvedValue(null);

    const { result } = renderHook(() => useAppData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(applySnapshot).not.toHaveBeenCalled();
    expect(loadState).not.toHaveBeenCalled();
  });

  test('does NOT call applySnapshot when snapshot is null', async () => {
    const { db, loadState, applySnapshot } = await getModules();
    db.races.count.mockResolvedValue(0);
    db.plannedWorkouts.count.mockResolvedValue(0);
    db.workoutLogs.count.mockResolvedValue(0);
    db.races.toArray.mockResolvedValue([]);
    db.plannedWorkouts.toArray.mockResolvedValue([]);
    db.workoutLogs.toArray.mockResolvedValue([]);
    loadState.mockResolvedValue(null);

    const { result } = renderHook(() => useAppData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(applySnapshot).not.toHaveBeenCalled();
  });

  test('still calls load() even if bootstrap throws', async () => {
    const { db, loadState } = await getModules();
    db.races.count.mockResolvedValue(0);
    db.plannedWorkouts.count.mockResolvedValue(0);
    db.workoutLogs.count.mockResolvedValue(0);
    db.races.toArray.mockResolvedValue([]);
    db.plannedWorkouts.toArray.mockResolvedValue([]);
    db.workoutLogs.toArray.mockResolvedValue([]);
    loadState.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAppData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
  });
});
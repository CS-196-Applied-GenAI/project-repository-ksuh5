import { describe, test, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAutoSave } from './useAutoSave.js';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../db/snapshotHelpers.js', () => ({
  buildSnapshot: vi.fn(),
}));

vi.mock('../api/stateApi.js', () => ({
  saveState: vi.fn(),
}));

async function getModules() {
  const { buildSnapshot } = await import('../db/snapshotHelpers.js');
  const { saveState }     = await import('../api/stateApi.js');
  return { buildSnapshot, saveState };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAutoSave', () => {
  test('does NOT fire saveState on initial mount', async () => {
    vi.useFakeTimers();
    const { saveState } = await getModules();

    renderHook(() =>
      useAutoSave({ races: [], plannedWorkouts: [], workoutLogs: [] })
    );

    vi.advanceTimersByTime(2000);
    expect(saveState).not.toHaveBeenCalled();
  });

  test('fires saveState once after debounce delay when data changes', async () => {
    vi.useFakeTimers();
    const { buildSnapshot, saveState } = await getModules();
    const snapshot = { races: [{ id: 'r1' }], plannedWorkouts: [], workoutLogs: [] };
    buildSnapshot.mockResolvedValue(snapshot);
    saveState.mockResolvedValue(undefined);

    const { rerender } = renderHook(
      ({ races }) => useAutoSave({ races, plannedWorkouts: [], workoutLogs: [] }),
      { initialProps: { races: [] } }
    );

    // Trigger a change
    rerender({ races: [{ id: 'r1' }] });

    // Should not have fired yet
    expect(saveState).not.toHaveBeenCalled();

    // Advance past debounce
    await vi.runAllTimersAsync();

    expect(buildSnapshot).toHaveBeenCalledTimes(1);
    expect(saveState).toHaveBeenCalledWith(snapshot);
  });

  test('fires only once when data changes multiple times within debounce window', async () => {
    vi.useFakeTimers();
    const { buildSnapshot, saveState } = await getModules();
    buildSnapshot.mockResolvedValue({ races: [], plannedWorkouts: [], workoutLogs: [] });
    saveState.mockResolvedValue(undefined);

    const { rerender } = renderHook(
      ({ races }) => useAutoSave({ races, plannedWorkouts: [], workoutLogs: [] }),
      { initialProps: { races: [] } }
    );

    // Multiple rapid changes within debounce window
    rerender({ races: [{ id: 'r1' }] });
    vi.advanceTimersByTime(500);
    rerender({ races: [{ id: 'r1' }, { id: 'r2' }] });
    vi.advanceTimersByTime(500);
    rerender({ races: [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }] });

    // Still within debounce window — should not have fired
    expect(saveState).not.toHaveBeenCalled();

    // Advance past debounce
    await vi.runAllTimersAsync();

    // Should have fired exactly once
    expect(saveState).toHaveBeenCalledTimes(1);
  });

  test('logs error to console when saveState throws, without rethrowing', async () => {
    vi.useFakeTimers();
    const { buildSnapshot, saveState } = await getModules();
    buildSnapshot.mockResolvedValue({ races: [], plannedWorkouts: [], workoutLogs: [] });
    saveState.mockRejectedValue(new Error('Network error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender } = renderHook(
      ({ races }) => useAutoSave({ races, plannedWorkouts: [], workoutLogs: [] }),
      { initialProps: { races: [] } }
    );

    rerender({ races: [{ id: 'r1' }] });
    await vi.runAllTimersAsync();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Auto-save failed:',
      expect.any(Error)
    );
  });
});
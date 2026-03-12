import { describe, test, expect, vi, afterEach } from 'vitest';
import { recalculatePlan } from './recalcApi.js';
import * as http from './http.js';

vi.mock('./http.js', () => ({
  apiFetch: vi.fn(),
}));

describe('recalculatePlan', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('sends correct snake_case payload with mapped enums', async () => {
    http.apiFetch.mockResolvedValue([]);

    await recalculatePlan({
      today: '2026-03-12',
      raceStatus: 'active',
      plannedWorkouts: [
        {
          raceId: 'r1',
          durationMinutes: 45,
          distance: 8,
          paceLow: 4.5,
          paceHigh: 5.5,
          structureText: 'easy pace',
          type: 'long_run',
        },
      ],
    });

    expect(http.apiFetch).toHaveBeenCalledWith(
      '/plan/recalculate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          today: '2026-03-12',
          race_status: 'Active',
          planned_workouts: [
            {
              race_id: 'r1',
              target_duration_min: 45,
              target_distance_km: 8,
              target_pace_min_per_km_low: 4.5,
              target_pace_min_per_km_high: 5.5,
              structure_text: 'easy pace',
              type: 'long run',
            },
          ],
        }),
      })
    );
  });

  test('maps response array back to camelCase frontend shape', async () => {
    http.apiFetch.mockResolvedValue([
      {
        race_id: 'r1',
        target_duration_min: 45,
        target_distance_km: 8,
        target_pace_min_per_km_low: 4.5,
        target_pace_min_per_km_high: 5.5,
        structure_text: 'easy pace',
        type: 'long run',
      },
    ]);

    const result = await recalculatePlan({
      today: '2026-03-12',
      raceStatus: 'active',
      plannedWorkouts: [],
    });

    expect(result).toEqual([
      expect.objectContaining({
        raceId: 'r1',
        durationMinutes: 45,
        distance: 8,
        paceLow: 4.5,
        paceHigh: 5.5,
        structureText: 'easy pace',
        type: 'long_run',
      }),
    ]);
  });

  test('returns an empty array when backend returns empty array', async () => {
    http.apiFetch.mockResolvedValue([]);

    const result = await recalculatePlan({
      today: '2026-03-12',
      raceStatus: 'active',
      plannedWorkouts: [],
    });

    expect(result).toEqual([]);
  });
});
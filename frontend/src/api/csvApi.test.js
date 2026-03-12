import { describe, test, expect, vi, afterEach } from 'vitest';
import { exportCsv } from './csvApi.js';
import * as http from './http.js';

vi.mock('./http.js', () => ({
  apiFetch: vi.fn(),
}));

describe('exportCsv', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('sends payload with both mapped arrays to /csv/export', async () => {
    http.apiFetch.mockResolvedValue({
      planned_workouts_csv: 'pw_csv',
      workout_logs_csv: 'wl_csv',
    });

    await exportCsv({
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
      workoutLogs: [
        {
          raceId: 'r1',
          durationMinutes: 30,
          distance: 5,
          type: 'easy',
        },
      ],
    });

    const [path, options] = http.apiFetch.mock.calls[0];
    expect(path).toBe('/csv/export');
    expect(options.method).toBe('POST');

    const body = JSON.parse(options.body);
    // Planned workout mapped to snake_case
    expect(body.planned_workouts[0]).toMatchObject({
      race_id: 'r1',
      target_duration_min: 45,
      target_distance_km: 8,
      type: 'long run',
    });
    // Log mapped to snake_case
    expect(body.workout_logs[0]).toMatchObject({
      race_id: 'r1',
      target_duration_min: 30,
      target_distance_km: 5,
      type: 'easy run',
    });
  });

  test('returns plannedWorkoutsCsv and workoutLogsCsv as strings', async () => {
    http.apiFetch.mockResolvedValue({
      planned_workouts_csv: 'id,date,type\nr1,2026-03-12,easy run',
      workout_logs_csv:     'id,date,type\nl1,2026-03-12,easy run',
    });

    const result = await exportCsv({ plannedWorkouts: [], workoutLogs: [] });

    expect(typeof result.plannedWorkoutsCsv).toBe('string');
    expect(typeof result.workoutLogsCsv).toBe('string');
    expect(result.plannedWorkoutsCsv).toBe('id,date,type\nr1,2026-03-12,easy run');
    expect(result.workoutLogsCsv).toBe('id,date,type\nl1,2026-03-12,easy run');
  });

  test('sends empty arrays when both collections are empty', async () => {
    http.apiFetch.mockResolvedValue({
      planned_workouts_csv: '',
      workout_logs_csv: '',
    });

    await exportCsv({ plannedWorkouts: [], workoutLogs: [] });

    const body = JSON.parse(http.apiFetch.mock.calls[0][1].body);
    expect(body.planned_workouts).toEqual([]);
    expect(body.workout_logs).toEqual([]);
  });
});
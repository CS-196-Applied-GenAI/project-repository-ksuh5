import { describe, test, expect, vi, afterEach } from 'vitest';
import { exportCsv, importCsv } from './csvApi.js';
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
    expect(body.planned_workouts[0]).toMatchObject({
      race_id: 'r1',
      target_duration_min: 45,
      target_distance_km: 8,
      type: 'long run',
    });
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

describe('importCsv', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('sends correct payload shape to /csv/import', async () => {
    http.apiFetch.mockResolvedValue({
      planned_workouts: [],
      workout_logs: [],
      errors: [],
    });

    await importCsv({
      plannedWorkoutsCsv: 'id,date,type\nr1,2026-03-12,easy run',
      workoutLogsCsv:     'id,date,type\nl1,2026-03-12,easy run',
    });

    const [path, options] = http.apiFetch.mock.calls[0];
    expect(path).toBe('/csv/import');
    expect(options.method).toBe('POST');

    const body = JSON.parse(options.body);
    expect(body.planned_workouts_csv).toBe('id,date,type\nr1,2026-03-12,easy run');
    expect(body.workout_logs_csv).toBe('id,date,type\nl1,2026-03-12,easy run');
  });

  test('maps returned planned workouts and logs to frontend shape', async () => {
    http.apiFetch.mockResolvedValue({
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
      workout_logs: [
        {
          race_id: 'r1',
          target_duration_min: 30,
          target_distance_km: 5,
          type: 'easy run',
        },
      ],
      errors: [],
    });

    const result = await importCsv({
      plannedWorkoutsCsv: 'csv',
      workoutLogsCsv: 'csv',
    });

    expect(result.plannedWorkouts[0]).toMatchObject({
      raceId: 'r1',
      durationMinutes: 45,
      distance: 8,
      type: 'long_run',
    });
    expect(result.workoutLogs[0]).toMatchObject({
      raceId: 'r1',
      durationMinutes: 30,
      distance: 5,
      type: 'easy',
    });
  });

  test('passes errors through as-is', async () => {
    const errors = [
      { row: 2, message: 'Invalid date format' },
      { row: 5, message: 'Missing required field: type' },
    ];
    http.apiFetch.mockResolvedValue({
      planned_workouts: [],
      workout_logs: [],
      errors,
    });

    const result = await importCsv({ plannedWorkoutsCsv: '', workoutLogsCsv: '' });

    expect(result.errors).toEqual(errors);
  });

  test('returns empty arrays when response fields are missing', async () => {
    http.apiFetch.mockResolvedValue({});

    const result = await importCsv({ plannedWorkoutsCsv: '', workoutLogsCsv: '' });

    expect(result.plannedWorkouts).toEqual([]);
    expect(result.workoutLogs).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});
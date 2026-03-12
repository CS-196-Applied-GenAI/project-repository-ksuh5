import {
  frontendWorkoutToBackend,
  backendWorkoutToFrontend,
  frontendLogToBackend,
  backendLogToFrontend,
  frontendRaceStatusToBackend,
  backendRaceStatusToFrontend,
} from './mappers';

// ─── Workout type enum coverage ───────────────────────────────────────────────

const workoutTypeMap = [
  ['easy', 'easy run'],
  ['tempo', 'tempo'],
  ['interval', 'interval'],
  ['long_run', 'long run'],
  ['cross_train', 'cross-training'],
  ['rest', 'rest day'],
];

describe('frontendWorkoutToBackend — type enum', () => {
  test.each(workoutTypeMap)('maps type "%s" → "%s"', (fe, be) => {
    const result = frontendWorkoutToBackend({ type: fe });
    expect(result.type).toBe(be);
  });
});

describe('backendWorkoutToFrontend — type enum', () => {
  test.each(workoutTypeMap)('maps type "%s" → "%s"', (fe, be) => {
    const result = backendWorkoutToFrontend({ type: be });
    expect(result.type).toBe(fe);
  });
});

// ─── Workout field mapping ────────────────────────────────────────────────────

describe('frontendWorkoutToBackend — field names', () => {
  test('maps all camelCase fields to snake_case', () => {
    const input = {
      raceId: 'r1',
      durationMinutes: 60,
      distance: 10,
      paceLow: 5.0,
      paceHigh: 6.0,
      structureText: '3x1mile',
      type: 'easy',
    };
    const result = frontendWorkoutToBackend(input);
    expect(result).toMatchObject({
      race_id: 'r1',
      target_duration_min: 60,
      target_distance_km: 10,
      target_pace_min_per_km_low: 5.0,
      target_pace_min_per_km_high: 6.0,
      structure_text: '3x1mile',
      type: 'easy run',
    });
  });
});

describe('backendWorkoutToFrontend — field names', () => {
  test('maps all snake_case fields to camelCase', () => {
    const input = {
      race_id: 'r1',
      target_duration_min: 60,
      target_distance_km: 10,
      target_pace_min_per_km_low: 5.0,
      target_pace_min_per_km_high: 6.0,
      structure_text: '3x1mile',
      type: 'easy run',
    };
    const result = backendWorkoutToFrontend(input);
    expect(result).toMatchObject({
      raceId: 'r1',
      durationMinutes: 60,
      distance: 10,
      paceLow: 5.0,
      paceHigh: 6.0,
      structureText: '3x1mile',
      type: 'easy',
    });
  });
});

// ─── Round-trip ───────────────────────────────────────────────────────────────

describe('workout round-trip', () => {
  test('backendWorkoutToFrontend(frontendWorkoutToBackend(x)) equals x', () => {
    const original = {
      raceId: 'r1',
      durationMinutes: 45,
      distance: 8,
      paceLow: 4.5,
      paceHigh: 5.5,
      structureText: 'easy pace',
      type: 'long_run',
    };
    const result = backendWorkoutToFrontend(frontendWorkoutToBackend(original));
    expect(result).toMatchObject(original);
  });
});

// ─── Null fields ──────────────────────────────────────────────────────────────

describe('null fields pass through correctly', () => {
  test('frontendWorkoutToBackend handles null fields', () => {
    const result = frontendWorkoutToBackend({
      raceId: null,
      durationMinutes: null,
      distance: null,
      paceLow: null,
      paceHigh: null,
      structureText: null,
      type: null,
    });
    expect(result.race_id).toBeNull();
    expect(result.target_duration_min).toBeNull();
    expect(result.target_distance_km).toBeNull();
    expect(result.target_pace_min_per_km_low).toBeNull();
    expect(result.target_pace_min_per_km_high).toBeNull();
    expect(result.structure_text).toBeNull();
    expect(result.type).toBeNull();
  });

  test('backendWorkoutToFrontend handles null fields', () => {
    const result = backendWorkoutToFrontend({
      race_id: null,
      target_duration_min: null,
      target_distance_km: null,
      target_pace_min_per_km_low: null,
      target_pace_min_per_km_high: null,
      structure_text: null,
      type: null,
    });
    expect(result.raceId).toBeNull();
    expect(result.durationMinutes).toBeNull();
    expect(result.distance).toBeNull();
    expect(result.paceLow).toBeNull();
    expect(result.paceHigh).toBeNull();
    expect(result.structureText).toBeNull();
    expect(result.type).toBeNull();
  });
});

// ─── Log mappers ──────────────────────────────────────────────────────────────

describe('frontendLogToBackend / backendLogToFrontend', () => {
  test('maps log fields to backend shape', () => {
    const log = { raceId: 'r2', durationMinutes: 30, distance: 5, type: 'cross_train' };
    const result = frontendLogToBackend(log);
    expect(result.race_id).toBe('r2');
    expect(result.target_duration_min).toBe(30);
    expect(result.target_distance_km).toBe(5);
    expect(result.type).toBe('cross-training');
  });

  test('maps log fields back to frontend shape', () => {
    const blog = { race_id: 'r2', target_duration_min: 30, target_distance_km: 5, type: 'cross-training' };
    const result = backendLogToFrontend(blog);
    expect(result.raceId).toBe('r2');
    expect(result.durationMinutes).toBe(30);
    expect(result.distance).toBe(5);
    expect(result.type).toBe('cross_train');
  });
});

// ─── Race status mappers ──────────────────────────────────────────────────────

const statusMap = [
  ['active', 'Active'],
  ['archived', 'Archived'],
  ['completed', 'Completed'],
];

describe('frontendRaceStatusToBackend', () => {
  test.each(statusMap)('maps "%s" → "%s"', (fe, be) => {
    expect(frontendRaceStatusToBackend(fe)).toBe(be);
  });
});

describe('backendRaceStatusToFrontend', () => {
  test.each(statusMap)('maps "%s" → "%s"', (fe, be) => {
    expect(backendRaceStatusToFrontend(be)).toBe(fe);
  });
});
import { describe, it, expect } from 'vitest';
import { getLogsForPlanned, getUnplannedLogs, logSummary } from './logHelpers.js';

// ── fixtures ──────────────────────────────────────────────

function makeLog(overrides) {
  return {
    id:               'log-default',
    plannedWorkoutId: null,
    date:             '2026-03-10',
    time:             null,
    type:             'easy',
    distance:         null,
    durationMinutes:  null,
    notes:            '',
    createdAt:        '2026-01-01T00:00:00.000Z',
    updatedAt:        '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const PW_ID = 'pw-001';

const ATTACHED_EARLY = makeLog({
  id: 'log-001', plannedWorkoutId: PW_ID,
  date: '2026-03-10', time: '06:00',
  distance: 3, durationMinutes: 30,
  createdAt: '2026-01-01T08:00:00.000Z',
});

const ATTACHED_LATE = makeLog({
  id: 'log-002', plannedWorkoutId: PW_ID,
  date: '2026-03-10', time: '09:00',
  distance: 5, durationMinutes: 45,
  createdAt: '2026-01-01T09:00:00.000Z',
});

const ATTACHED_NO_TIME = makeLog({
  id: 'log-003', plannedWorkoutId: PW_ID,
  date: '2026-03-10', time: null,
  createdAt: '2026-01-01T07:00:00.000Z',
});

const UNPLANNED = makeLog({
  id: 'log-004', plannedWorkoutId: null,
  date: '2026-03-03', time: '07:30',
});

const OTHER_PW = makeLog({
  id: 'log-005', plannedWorkoutId: 'pw-999',
  date: '2026-03-11', time: '08:00',
});

const ALL_LOGS = [ATTACHED_LATE, UNPLANNED, ATTACHED_NO_TIME, OTHER_PW, ATTACHED_EARLY];

// ── getLogsForPlanned ─────────────────────────────────────

describe('getLogsForPlanned', () => {
  it('returns only logs for the given plannedWorkoutId', () => {
    const result = getLogsForPlanned(ALL_LOGS, PW_ID);
    expect(result.map((l) => l.id)).toEqual(
      expect.arrayContaining(['log-001', 'log-002', 'log-003'])
    );
    expect(result).toHaveLength(3);
  });

  it('excludes logs belonging to other planned workouts', () => {
    const result = getLogsForPlanned(ALL_LOGS, PW_ID);
    expect(result.find((l) => l.id === 'log-005')).toBeUndefined();
  });

  it('excludes unplanned logs (null plannedWorkoutId)', () => {
    const result = getLogsForPlanned(ALL_LOGS, PW_ID);
    expect(result.find((l) => l.id === 'log-004')).toBeUndefined();
  });

  it('returns results sorted chronologically: time ASC, null times last', () => {
    const result = getLogsForPlanned(ALL_LOGS, PW_ID);
    expect(result[0].id).toBe('log-001'); // 06:00
    expect(result[1].id).toBe('log-002'); // 09:00
    expect(result[2].id).toBe('log-003'); // null time → last
  });

  it('returns an empty array when no logs match', () => {
    expect(getLogsForPlanned(ALL_LOGS, 'pw-nonexistent')).toEqual([]);
  });

  it('returns an empty array for empty input', () => {
    expect(getLogsForPlanned([], PW_ID)).toEqual([]);
  });

  it('does not mutate the original array', () => {
    const copy = [...ALL_LOGS];
    getLogsForPlanned(ALL_LOGS, PW_ID);
    expect(ALL_LOGS).toEqual(copy);
  });

  it('handles multiple logs on different dates and sorts by date first', () => {
    const logDay1 = makeLog({ id: 'a', plannedWorkoutId: PW_ID, date: '2026-03-10', time: '09:00', createdAt: '2026-01-01T00:00:00.000Z' });
    const logDay2 = makeLog({ id: 'b', plannedWorkoutId: PW_ID, date: '2026-03-11', time: '07:00', createdAt: '2026-01-01T00:00:00.000Z' });
    const result  = getLogsForPlanned([logDay2, logDay1], PW_ID);
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
  });
});

// ── getUnplannedLogs ──────────────────────────────────────

describe('getUnplannedLogs', () => {
  it('returns only logs with null plannedWorkoutId', () => {
    const result = getUnplannedLogs(ALL_LOGS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('log-004');
  });

  it('returns empty array when none are unplanned', () => {
    const onlyAttached = [ATTACHED_EARLY, ATTACHED_LATE];
    expect(getUnplannedLogs(onlyAttached)).toHaveLength(0);
  });
});

// ── logSummary ────────────────────────────────────────────

describe('logSummary', () => {
  it('returns "3 mi · 30 min" when both present',  () => expect(logSummary({ distance: 3, durationMinutes: 30 })).toBe('3 mi · 30 min'));
  it('returns "3 mi" when only distance',           () => expect(logSummary({ distance: 3, durationMinutes: null })).toBe('3 mi'));
  it('returns "30 min" when only duration',         () => expect(logSummary({ distance: null, durationMinutes: 30 })).toBe('30 min'));
  it('returns "" when both null',                   () => expect(logSummary({ distance: null, durationMinutes: null })).toBe(''));
});
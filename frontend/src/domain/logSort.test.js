import { describe, it, expect } from 'vitest';
import {
  compareLogsChronological,
  getLogsForPlanned,
  getUnplannedLogs,
  logSummary,
} from './logSort.js';

// ── fixtures ──────────────────────────────────────────────

/** Minimal log factory */
function log(id, date, time, createdAt = '2026-01-01T00:00:00.000Z', plannedWorkoutId = null) {
  return { id, date, time, createdAt, plannedWorkoutId, type: 'easy', distance: null, durationMinutes: null };
}

// ── compareLogsChronological ──────────────────────────────

describe('compareLogsChronological', () => {
  it('sorts by date ascending', () => {
    const a = log('a', '2026-03-01', '07:00');
    const b = log('b', '2026-03-02', '07:00');
    expect(compareLogsChronological(a, b)).toBeLessThan(0);
    expect(compareLogsChronological(b, a)).toBeGreaterThan(0);
  });

  it('same date: sorts by time ascending', () => {
    const a = log('a', '2026-03-01', '06:00');
    const b = log('b', '2026-03-01', '09:00');
    expect(compareLogsChronological(a, b)).toBeLessThan(0);
    expect(compareLogsChronological(b, a)).toBeGreaterThan(0);
  });

  it('null time sorts AFTER a non-null time on the same date', () => {
    const withTime = log('a', '2026-03-01', '06:00');
    const noTime   = log('b', '2026-03-01', null);
    expect(compareLogsChronological(withTime, noTime)).toBeLessThan(0);
    expect(compareLogsChronological(noTime, withTime)).toBeGreaterThan(0);
  });

  it('both null time: sorts by createdAt ascending', () => {
    const a = log('a', '2026-03-01', null, '2026-01-01T08:00:00.000Z');
    const b = log('b', '2026-03-01', null, '2026-01-01T09:00:00.000Z');
    expect(compareLogsChronological(a, b)).toBeLessThan(0);
    expect(compareLogsChronological(b, a)).toBeGreaterThan(0);
  });

  it('identical records return 0', () => {
    const a = log('a', '2026-03-01', '07:00', '2026-01-01T00:00:00.000Z');
    const b = log('b', '2026-03-01', '07:00', '2026-01-01T00:00:00.000Z');
    expect(compareLogsChronological(a, b)).toBe(0);
  });

  it('sorts a mixed array correctly', () => {
    const logs = [
      log('d', '2026-03-02', null,    '2026-01-01T01:00:00.000Z'),
      log('c', '2026-03-01', null,    '2026-01-01T02:00:00.000Z'),
      log('b', '2026-03-01', '09:00', '2026-01-01T00:00:00.000Z'),
      log('a', '2026-03-01', '06:00', '2026-01-01T00:00:00.000Z'),
      log('c2','2026-03-01', null,    '2026-01-01T01:00:00.000Z'),
    ];
    const sorted = [...logs].sort(compareLogsChronological);
    expect(sorted[0].id).toBe('a');   // earliest time
    expect(sorted[1].id).toBe('b');   // later time
    expect(sorted[2].id).toBe('c2');  // null time, earlier createdAt
    expect(sorted[3].id).toBe('c');   // null time, later createdAt
    expect(sorted[4].id).toBe('d');   // later date
  });

  it('time "00:00" sorts before time "23:59"', () => {
    const midnight = log('a', '2026-03-01', '00:00');
    const lastMin  = log('b', '2026-03-01', '23:59');
    expect(compareLogsChronological(midnight, lastMin)).toBeLessThan(0);
  });

  it('does not mutate input array', () => {
    const arr = [
      log('b', '2026-03-02', null),
      log('a', '2026-03-01', null),
    ];
    const original = [...arr];
    [...arr].sort(compareLogsChronological);
    expect(arr).toEqual(original);
  });
});

// ── getLogsForPlanned ─────────────────────────────────────

describe('getLogsForPlanned', () => {
  const pw1Logs = [
    { ...log('p1-b', '2026-03-10', '09:00', '2026-01-01T00:00:00.000Z'), plannedWorkoutId: 'pw-001' },
    { ...log('p1-a', '2026-03-10', '06:00', '2026-01-01T00:00:00.000Z'), plannedWorkoutId: 'pw-001' },
    { ...log('p1-c', '2026-03-11', null,    '2026-01-01T00:00:00.000Z'), plannedWorkoutId: 'pw-001' },
  ];
  const pw2Log = { ...log('p2-a', '2026-03-10', '07:00'), plannedWorkoutId: 'pw-002' };
  const unplanned = { ...log('u-1', '2026-03-10', '08:00'), plannedWorkoutId: null };

  const allLogs = [...pw1Logs, pw2Log, unplanned];

  it('returns only logs for the given plannedWorkoutId', () => {
    const result = getLogsForPlanned(allLogs, 'pw-001');
    expect(result).toHaveLength(3);
    result.forEach((l) => expect(l.plannedWorkoutId).toBe('pw-001'));
  });

  it('returns an empty array when no logs match', () => {
    expect(getLogsForPlanned(allLogs, 'pw-999')).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(getLogsForPlanned([], 'pw-001')).toHaveLength(0);
  });

  it('sorts results chronologically', () => {
    const result = getLogsForPlanned(allLogs, 'pw-001');
    expect(result[0].id).toBe('p1-a'); // 06:00
    expect(result[1].id).toBe('p1-b'); // 09:00
    expect(result[2].id).toBe('p1-c'); // next day, null time
  });

  it('does not include logs from a different plannedWorkoutId', () => {
    const result = getLogsForPlanned(allLogs, 'pw-001');
    expect(result.find((l) => l.id === 'p2-a')).toBeUndefined();
  });

  it('does not include unplanned logs (plannedWorkoutId=null)', () => {
    const result = getLogsForPlanned(allLogs, 'pw-001');
    expect(result.find((l) => l.plannedWorkoutId === null)).toBeUndefined();
  });

  it('handles a single matching log', () => {
    const result = getLogsForPlanned(allLogs, 'pw-002');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p2-a');
  });
});

// ── getUnplannedLogs ──────────────────────────────────────

describe('getUnplannedLogs', () => {
  it('returns only logs with plannedWorkoutId=null', () => {
    const logs = [
      { ...log('a', '2026-03-10', null), plannedWorkoutId: null },
      { ...log('b', '2026-03-10', null), plannedWorkoutId: 'pw-001' },
    ];
    const result = getUnplannedLogs(logs);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('returns empty array when all logs are attached', () => {
    const logs = [
      { ...log('a', '2026-03-10', null), plannedWorkoutId: 'pw-001' },
    ];
    expect(getUnplannedLogs(logs)).toHaveLength(0);
  });

  it('sorts results chronologically', () => {
    const logs = [
      { ...log('b', '2026-03-10', '09:00'), plannedWorkoutId: null },
      { ...log('a', '2026-03-10', '06:00'), plannedWorkoutId: null },
    ];
    const result = getUnplannedLogs(logs);
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
  });
});

// ── logSummary ────────────────────────────────────────────

describe('logSummary', () => {
  it('includes the workout type label', () => {
    const l = { type: 'easy', distance: null, durationMinutes: null };
    expect(logSummary(l)).toBe('Easy run');
  });

  it('includes distance when present', () => {
    const l = { type: 'easy', distance: 3.1, durationMinutes: null };
    expect(logSummary(l)).toContain('3.1 mi');
  });

  it('includes duration when present', () => {
    const l = { type: 'tempo', distance: null, durationMinutes: 30 };
    expect(logSummary(l)).toContain('30 min');
  });

  it('includes both when present', () => {
    const l = { type: 'long_run', distance: 12, durationMinutes: 90 };
    const s = logSummary(l);
    expect(s).toContain('Long run');
    expect(s).toContain('12 mi');
    expect(s).toContain('90 min');
  });
});
import { describe, it, expect } from 'vitest';
import { compareLogsChronological } from './logSort.js';

/** Minimal log factory */
function log(date, time, createdAt = '2026-01-01T00:00:00.000Z') {
  return { date, time, createdAt };
}

describe('compareLogsChronological', () => {
  it('sorts by date ascending', () => {
    const a = log('2026-03-01', '07:00');
    const b = log('2026-03-02', '07:00');
    expect(compareLogsChronological(a, b)).toBeLessThan(0);
    expect(compareLogsChronological(b, a)).toBeGreaterThan(0);
  });

  it('same date: sorts by time ascending', () => {
    const a = log('2026-03-01', '06:00');
    const b = log('2026-03-01', '09:00');
    expect(compareLogsChronological(a, b)).toBeLessThan(0);
    expect(compareLogsChronological(b, a)).toBeGreaterThan(0);
  });

  it('same date: null time sorts AFTER a non-null time', () => {
    const withTime = log('2026-03-01', '06:00');
    const noTime   = log('2026-03-01', null);
    expect(compareLogsChronological(withTime, noTime)).toBeLessThan(0);
    expect(compareLogsChronological(noTime, withTime)).toBeGreaterThan(0);
  });

  it('same date + both null time: sorts by createdAt ascending', () => {
    const a = log('2026-03-01', null, '2026-01-01T08:00:00.000Z');
    const b = log('2026-03-01', null, '2026-01-01T09:00:00.000Z');
    expect(compareLogsChronological(a, b)).toBeLessThan(0);
    expect(compareLogsChronological(b, a)).toBeGreaterThan(0);
  });

  it('identical records return 0', () => {
    const a = log('2026-03-01', '07:00', '2026-01-01T00:00:00.000Z');
    const b = log('2026-03-01', '07:00', '2026-01-01T00:00:00.000Z');
    expect(compareLogsChronological(a, b)).toBe(0);
  });

  it('sorts a mixed array correctly', () => {
    const logs = [
      log('2026-03-02', null,    '2026-01-01T01:00:00.000Z'), // [3] date later
      log('2026-03-01', null,    '2026-01-01T02:00:00.000Z'), // [2] same date, null time, createdAt later
      log('2026-03-01', '09:00', '2026-01-01T00:00:00.000Z'), // [1] same date, later time
      log('2026-03-01', '06:00', '2026-01-01T00:00:00.000Z'), // [0] earliest
      log('2026-03-01', null,    '2026-01-01T01:00:00.000Z'), // [2] same date, null time, createdAt earlier
    ];

    const sorted = [...logs].sort(compareLogsChronological);

    expect(sorted[0]).toMatchObject({ date: '2026-03-01', time: '06:00' });
    expect(sorted[1]).toMatchObject({ date: '2026-03-01', time: '09:00' });
    // null times come after timed entries on same date
    expect(sorted[2]).toMatchObject({ date: '2026-03-01', time: null, createdAt: '2026-01-01T01:00:00.000Z' });
    expect(sorted[3]).toMatchObject({ date: '2026-03-01', time: null, createdAt: '2026-01-01T02:00:00.000Z' });
    expect(sorted[4]).toMatchObject({ date: '2026-03-02' });
  });
});
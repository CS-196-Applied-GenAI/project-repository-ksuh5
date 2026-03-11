import { describe, it, expect } from 'vitest';
import {
  startOfWeek,
  addDays,
  getWeekDays,
  getMonthGrid,
  parseYMD,
  formatYMD,
  groupPlannedByDate,
} from './calendarHelpers.js';

// ── parseYMD / formatYMD ──────────────────────────────────

describe('parseYMD / formatYMD round-trip', () => {
  it('parses and re-formats without shifting', () => {
    expect(formatYMD(parseYMD('2026-03-03'))).toBe('2026-03-03');
    expect(formatYMD(parseYMD('2026-01-01'))).toBe('2026-01-01');
    expect(formatYMD(parseYMD('2026-12-31'))).toBe('2026-12-31');
  });
});

// ── startOfWeek ───────────────────────────────────────────

describe('startOfWeek', () => {
  it('returns itself when already Monday', () => {
    expect(startOfWeek('2026-03-02')).toBe('2026-03-02');
  });
  it('returns the preceding Monday for a Wednesday', () => {
    expect(startOfWeek('2026-03-04')).toBe('2026-03-02');
  });
  it('returns the preceding Monday for a Sunday', () => {
    expect(startOfWeek('2026-03-08')).toBe('2026-03-02');
  });
  it('handles a Monday at year boundary', () => {
    expect(startOfWeek('2026-01-05')).toBe('2026-01-05');
  });
});

// ── addDays ───────────────────────────────────────────────

describe('addDays', () => {
  it('adds positive days',         () => expect(addDays('2026-03-01', 5)).toBe('2026-03-06'));
  it('is a no-op for 0',           () => expect(addDays('2026-03-01', 0)).toBe('2026-03-01'));
  it('subtracts with negative n',  () => expect(addDays('2026-03-06', -5)).toBe('2026-03-01'));
  it('crosses month boundary',     () => expect(addDays('2026-01-30', 3)).toBe('2026-02-02'));
  it('crosses year boundary',      () => expect(addDays('2025-12-30', 3)).toBe('2026-01-02'));
});

// ── getWeekDays ───────────────────────────────────────────

describe('getWeekDays', () => {
  it('returns exactly 7 days',                   () => expect(getWeekDays('2026-03-03')).toHaveLength(7));
  it('first element is Monday (2026-03-02)',      () => expect(getWeekDays('2026-03-03')[0]).toBe('2026-03-02'));
  it('last element is Sunday (2026-03-08)',       () => expect(getWeekDays('2026-03-03')[6]).toBe('2026-03-08'));
  it('Mon input: first is same day',             () => expect(getWeekDays('2026-03-02')[0]).toBe('2026-03-02'));
  it('Sun input: first is the preceding Monday', () => expect(getWeekDays('2026-03-08')[0]).toBe('2026-03-02'));
  it('days are consecutive', () => {
    const days = getWeekDays('2026-03-03');
    for (let i = 1; i < 7; i++) expect(days[i]).toBe(addDays(days[i - 1], 1));
  });
  it('week grid includes 7 days starting Monday (canonical test per plan)', () => {
    const days = getWeekDays('2026-03-03');
    expect(days).toHaveLength(7);
    expect(parseYMD(days[0]).getDay()).toBe(1); // 1 = Monday
  });
});

// ── getMonthGrid ──────────────────────────────────────────

describe('getMonthGrid', () => {
  it('returns 5 or 6 weeks', () => {
    const grid = getMonthGrid('2026-03-01');
    expect(grid.length).toBeGreaterThanOrEqual(5);
    expect(grid.length).toBeLessThanOrEqual(6);
  });
  it('each week has 7 days', () => {
    getMonthGrid('2026-03-01').forEach((w) => expect(w).toHaveLength(7));
  });
  it('first cell is always Monday', () => {
    expect(parseYMD(getMonthGrid('2026-03-01')[0][0]).getDay()).toBe(1);
  });
  it('last cell is always Sunday', () => {
    const grid = getMonthGrid('2026-03-01');
    expect(parseYMD(grid[grid.length - 1][6]).getDay()).toBe(0);
  });
  it('contains all days of March 2026', () => {
    const all = getMonthGrid('2026-03-15').flat();
    for (let d = 1; d <= 31; d++) {
      expect(all).toContain(`2026-03-${String(d).padStart(2, '0')}`);
    }
  });
  it('February 2026 (non-leap) grid is correct', () => {
    const all = getMonthGrid('2026-02-15').flat();
    expect(all).toContain('2026-02-01');
    expect(all).toContain('2026-02-28');
    expect(all).not.toContain('2026-02-29');
  });
});

// ── groupPlannedByDate ────────────────────────────────────

describe('groupPlannedByDate', () => {
  const pw = (id, date, type = 'easy') => ({ id, date, type });

  it('returns an empty object for an empty array', () => {
    expect(groupPlannedByDate([])).toEqual({});
  });

  it('groups a single workout under its date', () => {
    const result = groupPlannedByDate([pw('a', '2026-03-10')]);
    expect(result).toHaveProperty('2026-03-10');
    expect(result['2026-03-10']).toHaveLength(1);
    expect(result['2026-03-10'][0].id).toBe('a');
  });

  it('groups multiple workouts on the same date together', () => {
    const workouts = [
      pw('a', '2026-03-10', 'easy'),
      pw('b', '2026-03-10', 'tempo'),
    ];
    const result = groupPlannedByDate(workouts);
    expect(result['2026-03-10']).toHaveLength(2);
    expect(result['2026-03-10'].map((w) => w.id)).toEqual(['a', 'b']);
  });

  it('keeps workouts on different dates in separate buckets', () => {
    const workouts = [
      pw('a', '2026-03-10'),
      pw('b', '2026-03-11'),
      pw('c', '2026-03-11'),
    ];
    const result = groupPlannedByDate(workouts);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result['2026-03-10']).toHaveLength(1);
    expect(result['2026-03-11']).toHaveLength(2);
  });

  it('omits dates with no workouts', () => {
    const result = groupPlannedByDate([pw('a', '2026-03-10')]);
    expect(result).not.toHaveProperty('2026-03-11');
  });

  it('preserves insertion order within a date bucket', () => {
    const workouts = [
      pw('first',  '2026-03-10'),
      pw('second', '2026-03-10'),
      pw('third',  '2026-03-10'),
    ];
    const ids = groupPlannedByDate(workouts)['2026-03-10'].map((w) => w.id);
    expect(ids).toEqual(['first', 'second', 'third']);
  });

  it('handles workouts spread across many dates', () => {
    const workouts = Array.from({ length: 7 }, (_, i) =>
      pw(`id-${i}`, `2026-03-0${i + 1}`)
    );
    const result = groupPlannedByDate(workouts);
    expect(Object.keys(result)).toHaveLength(7);
  });
});
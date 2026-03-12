import { describe, it, expect } from 'vitest';
import {
  startOfWeek,
  addDays,
  addMonths,
  getWeekDays,
  getMonthGrid,
  getMonthGridDays,
  parseYMD,
  formatYMD,
  groupPlannedByDate,
  startOfMonth,
  monthYearLabel,
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
  it('returns itself when already Monday',              () => expect(startOfWeek('2026-03-02')).toBe('2026-03-02'));
  it('returns the preceding Monday for a Wednesday',   () => expect(startOfWeek('2026-03-04')).toBe('2026-03-02'));
  it('returns the preceding Monday for a Sunday',      () => expect(startOfWeek('2026-03-08')).toBe('2026-03-02'));
  it('handles a Monday at year boundary',               () => expect(startOfWeek('2026-01-05')).toBe('2026-01-05'));
});

// ── addDays ───────────────────────────────────────────────

describe('addDays', () => {
  it('adds positive days',        () => expect(addDays('2026-03-01', 5)).toBe('2026-03-06'));
  it('is a no-op for 0',          () => expect(addDays('2026-03-01', 0)).toBe('2026-03-01'));
  it('subtracts with negative n', () => expect(addDays('2026-03-06', -5)).toBe('2026-03-01'));
  it('crosses month boundary',    () => expect(addDays('2026-01-30', 3)).toBe('2026-02-02'));
  it('crosses year boundary',     () => expect(addDays('2025-12-30', 3)).toBe('2026-01-02'));
});

// ── getWeekDays ───────────────────────────────────────────

describe('getWeekDays', () => {
  it('returns exactly 7 days',                           () => expect(getWeekDays('2026-03-03')).toHaveLength(7));
  it('first element is Monday (2026-03-02)',             () => expect(getWeekDays('2026-03-03')[0]).toBe('2026-03-02'));
  it('last element is Sunday (2026-03-08)',              () => expect(getWeekDays('2026-03-03')[6]).toBe('2026-03-08'));
  it('Mon input: first is same day',                    () => expect(getWeekDays('2026-03-02')[0]).toBe('2026-03-02'));
  it('Sun input: first is the preceding Monday',        () => expect(getWeekDays('2026-03-08')[0]).toBe('2026-03-02'));
  it('days are consecutive', () => {
    const days = getWeekDays('2026-03-03');
    for (let i = 1; i < 7; i++) expect(days[i]).toBe(addDays(days[i - 1], 1));
  });
  it('grid includes 7 days starting Monday (canonical)', () => {
    const days = getWeekDays('2026-03-03');
    expect(days).toHaveLength(7);
    expect(parseYMD(days[0]).getDay()).toBe(1);
  });
});

// ── getMonthGrid ──────────────────────────────────────────

describe('getMonthGrid', () => {
  it('returns 5 or 6 weeks',    () => { const g = getMonthGrid('2026-03-01'); expect(g.length).toBeGreaterThanOrEqual(5); expect(g.length).toBeLessThanOrEqual(6); });
  it('each week has 7 days',    () => getMonthGrid('2026-03-01').forEach((w) => expect(w).toHaveLength(7)));
  it('first cell is Monday',    () => expect(parseYMD(getMonthGrid('2026-03-01')[0][0]).getDay()).toBe(1));
  it('last cell is Sunday',     () => { const g = getMonthGrid('2026-03-01'); expect(parseYMD(g[g.length - 1][6]).getDay()).toBe(0); });
  it('contains all days of March 2026', () => {
    const all = getMonthGrid('2026-03-15').flat();
    for (let d = 1; d <= 31; d++) expect(all).toContain(`2026-03-${String(d).padStart(2, '0')}`);
  });
  it('Feb 2026 (non-leap): no Feb 29', () => {
    const all = getMonthGrid('2026-02-15').flat();
    expect(all).toContain('2026-02-01');
    expect(all).toContain('2026-02-28');
    expect(all).not.toContain('2026-02-29');
  });
});

// ── getMonthGridDays ──────────────────────────────────────

describe('getMonthGridDays', () => {
  it('length is a multiple of 7', () => {
    // Test several months to be thorough
    ['2026-01-01', '2026-02-15', '2026-03-01', '2026-07-04', '2026-12-31'].forEach((ymd) => {
      expect(getMonthGridDays(ymd).length % 7).toBe(0);
    });
  });

  it('returns either 35 or 42 days (5 or 6 weeks)', () => {
    const len = getMonthGridDays('2026-03-01').length;
    expect([35, 42]).toContain(len);
  });

  it('includes the 1st day of the month', () => {
    expect(getMonthGridDays('2026-03-15')).toContain('2026-03-01');
  });

  it('includes the last day of the month', () => {
    expect(getMonthGridDays('2026-03-15')).toContain('2026-03-31');
  });

  it('starts on a Monday (day index 0 has getDay() === 1)', () => {
    const days = getMonthGridDays('2026-03-01');
    expect(parseYMD(days[0]).getDay()).toBe(1); // 1 = Monday
  });

  it('ends on a Sunday (last day has getDay() === 0)', () => {
    const days = getMonthGridDays('2026-03-01');
    expect(parseYMD(days[days.length - 1]).getDay()).toBe(0); // 0 = Sunday
  });

  it('all days are consecutive — no gaps or duplicates', () => {
    const days = getMonthGridDays('2026-03-01');
    for (let i = 1; i < days.length; i++) {
      expect(days[i]).toBe(addDays(days[i - 1], 1));
    }
  });

  it('February 2026 (non-leap, starts Sunday) → 35 days', () => {
    // Feb 1 2026 is a Sunday; grid starts Mon Jan 26
    const days = getMonthGridDays('2026-02-01');
    expect(days.length).toBe(35);
    expect(days[0]).toBe('2026-01-26'); // Mon before Feb 1
  });

  it('same result regardless of which day of month is passed', () => {
    const a = getMonthGridDays('2026-03-01');
    const b = getMonthGridDays('2026-03-15');
    const c = getMonthGridDays('2026-03-31');
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it('getMonthGridDays flat equals getMonthGrid flat', () => {
    const flat  = getMonthGridDays('2026-03-01');
    const grid  = getMonthGrid('2026-03-01').flat();
    expect(flat).toEqual(grid);
  });
});

// ── groupPlannedByDate ────────────────────────────────────

describe('groupPlannedByDate', () => {
  const pw = (id, date, type = 'easy') => ({ id, date, type });

  it('returns an empty object for an empty array',                  () => expect(groupPlannedByDate([])).toEqual({}));
  it('groups a single workout under its date',                     () => expect(groupPlannedByDate([pw('a', '2026-03-10')])['2026-03-10']).toHaveLength(1));
  it('groups multiple workouts on the same date together',         () => expect(groupPlannedByDate([pw('a', '2026-03-10'), pw('b', '2026-03-10')])['2026-03-10']).toHaveLength(2));
  it('keeps workouts on different dates in separate buckets',      () => expect(Object.keys(groupPlannedByDate([pw('a', '2026-03-10'), pw('b', '2026-03-11')]))).toHaveLength(2));
  it('omits dates with no workouts',                               () => expect(groupPlannedByDate([pw('a', '2026-03-10')])).not.toHaveProperty('2026-03-11'));
  it('preserves insertion order within a date bucket', () => {
    const ids = groupPlannedByDate([pw('first', '2026-03-10'), pw('second', '2026-03-10'), pw('third', '2026-03-10')])['2026-03-10'].map((w) => w.id);
    expect(ids).toEqual(['first', 'second', 'third']);
  });
});

// ── startOfMonth ──────────────────────────────────────────

describe('startOfMonth', () => {
  it('returns the 1st of the same month', () => {
    expect(startOfMonth('2026-03-15')).toBe('2026-03-01');
    expect(startOfMonth('2026-03-01')).toBe('2026-03-01');
    expect(startOfMonth('2026-03-31')).toBe('2026-03-01');
  });
});

// ── addMonths ─────────────────────────────────────────────

describe('addMonths', () => {
  it('advances by 1 month',      () => expect(addMonths('2026-03-15', 1)).toBe('2026-04-01'));
  it('retreats by 1 month',      () => expect(addMonths('2026-03-15', -1)).toBe('2026-02-01'));
  it('wraps year boundary (+)',  () => expect(addMonths('2026-12-01', 1)).toBe('2027-01-01'));
  it('wraps year boundary (-)',  () => expect(addMonths('2026-01-01', -1)).toBe('2025-12-01'));
});

// ── monthYearLabel ────────────────────────────────────────

describe('monthYearLabel', () => {
  it('returns a non-empty string containing the year', () => {
    const label = monthYearLabel('2026-03-15');
    expect(typeof label).toBe('string');
    expect(label).toContain('2026');
    expect(label.length).toBeGreaterThan(4);
  });
});
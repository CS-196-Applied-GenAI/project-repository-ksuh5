import { describe, it, expect } from 'vitest';
import {
  startOfWeek,
  addDays,
  getWeekDays,
  getMonthGrid,
  parseYMD,
  formatYMD,
} from './calendarHelpers.js';

describe('parseYMD / formatYMD round-trip', () => {
  it('parses and re-formats without shifting', () => {
    expect(formatYMD(parseYMD('2026-03-03'))).toBe('2026-03-03');
    expect(formatYMD(parseYMD('2026-01-01'))).toBe('2026-01-01');
    expect(formatYMD(parseYMD('2026-12-31'))).toBe('2026-12-31');
  });
});

describe('startOfWeek', () => {
  it('returns itself when already Monday', () => {
    // 2026-03-02 is a Monday
    expect(startOfWeek('2026-03-02')).toBe('2026-03-02');
  });

  it('returns the preceding Monday for a Wednesday', () => {
    // 2026-03-04 is a Wednesday → Monday = 2026-03-02
    expect(startOfWeek('2026-03-04')).toBe('2026-03-02');
  });

  it('returns the preceding Monday for a Sunday', () => {
    // 2026-03-08 is a Sunday → Monday = 2026-03-02
    expect(startOfWeek('2026-03-08')).toBe('2026-03-02');
  });

  it('handles a Monday at year boundary', () => {
    // 2026-01-05 is a Monday
    expect(startOfWeek('2026-01-05')).toBe('2026-01-05');
  });
});

describe('addDays', () => {
  it('adds positive days', () => {
    expect(addDays('2026-03-01', 5)).toBe('2026-03-06');
  });

  it('adds 0 days (no-op)', () => {
    expect(addDays('2026-03-01', 0)).toBe('2026-03-01');
  });

  it('subtracts days with negative n', () => {
    expect(addDays('2026-03-06', -5)).toBe('2026-03-01');
  });

  it('crosses month boundary', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
  });

  it('crosses year boundary', () => {
    expect(addDays('2025-12-30', 3)).toBe('2026-01-02');
  });
});

describe('getWeekDays', () => {
  it('returns exactly 7 days', () => {
    expect(getWeekDays('2026-03-03')).toHaveLength(7);
  });

  it('first element is always a Monday', () => {
    const days = getWeekDays('2026-03-03'); // Tuesday
    // 2026-03-02 is Monday
    expect(days[0]).toBe('2026-03-02');
  });

  it('last element is always a Sunday', () => {
    const days = getWeekDays('2026-03-03');
    expect(days[6]).toBe('2026-03-08');
  });

  it('returns Mon–Sun when called with a Monday', () => {
    const days = getWeekDays('2026-03-02');
    expect(days[0]).toBe('2026-03-02');
    expect(days[6]).toBe('2026-03-08');
  });

  it('returns Mon–Sun when called with a Sunday', () => {
    const days = getWeekDays('2026-03-08');
    expect(days[0]).toBe('2026-03-02');
    expect(days[6]).toBe('2026-03-08');
  });

  it('days are consecutive', () => {
    const days = getWeekDays('2026-03-03');
    for (let i = 1; i < 7; i++) {
      expect(days[i]).toBe(addDays(days[i - 1], 1));
    }
  });
});

describe('getMonthGrid', () => {
  it('returns 5 or 6 weeks', () => {
    const grid = getMonthGrid('2026-03-01'); // March 2026
    expect(grid.length).toBeGreaterThanOrEqual(5);
    expect(grid.length).toBeLessThanOrEqual(6);
  });

  it('each week has exactly 7 days', () => {
    const grid = getMonthGrid('2026-03-01');
    grid.forEach((week) => expect(week).toHaveLength(7));
  });

  it('first cell is always a Monday', () => {
    const grid = getMonthGrid('2026-03-01');
    const firstDay = parseYMD(grid[0][0]);
    expect(firstDay.getDay()).toBe(1); // 1 = Monday
  });

  it('last cell is always a Sunday', () => {
    const grid = getMonthGrid('2026-03-01');
    const lastWeek = grid[grid.length - 1];
    const lastDay = parseYMD(lastWeek[6]);
    expect(lastDay.getDay()).toBe(0); // 0 = Sunday
  });

  it('grid includes all days of the target month', () => {
    const grid = getMonthGrid('2026-03-15');
    const allDays = grid.flat();
    // March has 31 days
    for (let d = 1; d <= 31; d++) {
      const ymd = `2026-03-${String(d).padStart(2, '0')}`;
      expect(allDays).toContain(ymd);
    }
  });

  it('February 2026 (non-leap) grid is correct', () => {
    const grid = getMonthGrid('2026-02-15');
    const allDays = grid.flat();
    expect(allDays).toContain('2026-02-01');
    expect(allDays).toContain('2026-02-28');
    expect(allDays).not.toContain('2026-02-29');
  });
});
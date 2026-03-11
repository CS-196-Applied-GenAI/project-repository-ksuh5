import { describe, it, expect } from 'vitest';
import {
  RACE_STATUS,
  getActiveRace,
  getActiveRaceId,
  getSelectableRaces,
  displayRaceStatus,
  formatRaceDateRange,
  makeRace,
} from './raceHelpers.js';

// ── fixtures ──────────────────────────────────────────────

const active    = { id: 'r-active',    name: 'Spring 5K',   status: 'active'    };
const archived  = { id: 'r-archived',  name: 'Winter Race', status: 'archived'  };
const completed = { id: 'r-completed', name: 'Old Race',    status: 'completed' };

// ── getActiveRace ─────────────────────────────────────────

describe('getActiveRace', () => {
  it('returns the active race when exactly one exists', () => {
    expect(getActiveRace([archived, active, completed])).toEqual(active);
  });

  it('returns null when no races are active', () => {
    expect(getActiveRace([archived, completed])).toBeNull();
  });

  it('returns null for an empty array', () => {
    expect(getActiveRace([])).toBeNull();
  });

  it('returns the first active if multiple active (data-error case)', () => {
    const active2 = { id: 'r-active-2', status: 'active' };
    expect(getActiveRace([active, active2])?.id).toBe('r-active');
  });
});

// ── getActiveRaceId ───────────────────────────────────────

describe('getActiveRaceId', () => {
  it('returns the id when an active race exists', () => {
    expect(getActiveRaceId([archived, active])).toBe('r-active');
  });

  it('returns null when none are active', () => {
    expect(getActiveRaceId([archived, completed])).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(getActiveRaceId([])).toBeNull();
  });
});

// ── getSelectableRaces ────────────────────────────────────

describe('getSelectableRaces', () => {
  it('returns only active races', () => {
    const result = getSelectableRaces([active, archived, completed]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r-active');
  });

  it('returns empty array when none are active', () => {
    expect(getSelectableRaces([archived, completed])).toHaveLength(0);
  });

  it('returns multiple active races if they exist', () => {
    const active2 = { id: 'r2', status: 'active' };
    expect(getSelectableRaces([active, active2])).toHaveLength(2);
  });
});

// ── displayRaceStatus ─────────────────────────────────────

describe('displayRaceStatus', () => {
  it('returns "Active" for active', () => {
    expect(displayRaceStatus(RACE_STATUS.ACTIVE)).toBe('Active');
  });

  it('returns "Archived" for archived', () => {
    expect(displayRaceStatus(RACE_STATUS.ARCHIVED)).toBe('Archived');
  });

  it('returns "Completed" for completed', () => {
    expect(displayRaceStatus(RACE_STATUS.COMPLETED)).toBe('Completed');
  });

  it('returns the raw value for unknown status', () => {
    expect(displayRaceStatus('pending')).toBe('pending');
  });

  it('returns "Unknown" for null/undefined', () => {
    expect(displayRaceStatus(null)).toBe('Unknown');
    expect(displayRaceStatus(undefined)).toBe('Unknown');
  });
});

// ── formatRaceDateRange ───────────────────────────────────

describe('formatRaceDateRange', () => {
  it('returns a non-empty string for a valid race', () => {
    const race = { startDate: '2026-03-10', endDate: '2026-05-01' };
    const result = formatRaceDateRange(race);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('2026');
  });

  it('returns empty string for null', () => {
    expect(formatRaceDateRange(null)).toBe('');
  });

  it('returns empty string when dates are missing', () => {
    expect(formatRaceDateRange({ startDate: '', endDate: '' })).toBe('');
  });
});

// ── makeRace ──────────────────────────────────────────────

describe('makeRace', () => {
  const FIELDS = { name: 'Spring 5K', startDate: '2026-03-10', endDate: '2026-05-01' };
  const FIXED  = { id: 'test-id-123', now: '2026-03-03T10:00:00.000Z' };

  it('returns an object with the given name, startDate, endDate', () => {
    const race = makeRace(FIELDS, FIXED);
    expect(race.name).toBe('Spring 5K');
    expect(race.startDate).toBe('2026-03-10');
    expect(race.endDate).toBe('2026-05-01');
  });

  it('status is always "active"', () => {
    expect(makeRace(FIELDS, FIXED).status).toBe('active');
  });

  it('has a non-empty id when no override given', () => {
    const race = makeRace(FIELDS);
    expect(typeof race.id).toBe('string');
    expect(race.id.length).toBeGreaterThan(0);
  });

  it('uses injected id when provided', () => {
    expect(makeRace(FIELDS, FIXED).id).toBe('test-id-123');
  });

  it('createdAt equals the injected now string', () => {
    expect(makeRace(FIELDS, FIXED).createdAt).toBe('2026-03-03T10:00:00.000Z');
  });

  it('updatedAt equals createdAt on creation', () => {
    const race = makeRace(FIELDS, FIXED);
    expect(race.updatedAt).toBe(race.createdAt);
  });

  it('createdAt is a valid ISO string when no override given', () => {
    const race = makeRace(FIELDS);
    expect(() => new Date(race.createdAt).toISOString()).not.toThrow();
  });

  it('trims whitespace from name', () => {
    const race = makeRace({ ...FIELDS, name: '  Spring 5K  ' }, FIXED);
    expect(race.name).toBe('Spring 5K');
  });

  it('two calls without id override produce different ids', () => {
    const a = makeRace(FIELDS);
    const b = makeRace(FIELDS);
    expect(a.id).not.toBe(b.id);
  });
});
import { describe, it, expect } from 'vitest';
import {
  RACE_STATUS,
  CONFLICT_DECISION,
  getActiveRace,
  getActiveRaceId,
  getSelectableRaces,
  displayRaceStatus,
  formatRaceDateRange,
  makeRace,
  applyNewRaceDecision,
} from './raceHelpers.js';

// ── fixtures ──────────────────────────────────────────────

const active    = { id: 'r-active',    name: 'Spring 5K',   status: 'active',    updatedAt: '2026-01-01T00:00:00.000Z' };
const archived  = { id: 'r-archived',  name: 'Winter Race', status: 'archived',  updatedAt: '2026-01-01T00:00:00.000Z' };
const completed = { id: 'r-completed', name: 'Old Race',    status: 'completed', updatedAt: '2026-01-01T00:00:00.000Z' };

const FIXED_NOW = '2026-03-03T10:00:00.000Z';

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
  it('returns "Active" for active',       () => expect(displayRaceStatus(RACE_STATUS.ACTIVE)).toBe('Active'));
  it('returns "Archived" for archived',   () => expect(displayRaceStatus(RACE_STATUS.ARCHIVED)).toBe('Archived'));
  it('returns "Completed" for completed', () => expect(displayRaceStatus(RACE_STATUS.COMPLETED)).toBe('Completed'));
  it('returns raw value for unknown',     () => expect(displayRaceStatus('pending')).toBe('pending'));
  it('returns "Unknown" for null',        () => expect(displayRaceStatus(null)).toBe('Unknown'));
});

// ── formatRaceDateRange ───────────────────────────────────

describe('formatRaceDateRange', () => {
  it('returns a non-empty string containing the year', () => {
    const result = formatRaceDateRange({ startDate: '2026-03-10', endDate: '2026-05-01' });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('2026');
  });
  it('returns empty string for null',              () => expect(formatRaceDateRange(null)).toBe(''));
  it('returns empty string when dates are missing',() => expect(formatRaceDateRange({ startDate: '', endDate: '' })).toBe(''));
});

// ── makeRace ──────────────────────────────────────────────

describe('makeRace', () => {
  const FIELDS = { name: 'Spring 5K', startDate: '2026-03-10', endDate: '2026-05-01' };
  const FIXED  = { id: 'test-id-123', now: FIXED_NOW };

  it('has the correct name, startDate, endDate', () => {
    const r = makeRace(FIELDS, FIXED);
    expect(r.name).toBe('Spring 5K');
    expect(r.startDate).toBe('2026-03-10');
    expect(r.endDate).toBe('2026-05-01');
  });
  it('status is always "active"',                () => expect(makeRace(FIELDS, FIXED).status).toBe('active'));
  it('uses injected id',                          () => expect(makeRace(FIELDS, FIXED).id).toBe('test-id-123'));
  it('uses injected now for createdAt',           () => expect(makeRace(FIELDS, FIXED).createdAt).toBe(FIXED_NOW));
  it('updatedAt equals createdAt on creation',    () => { const r = makeRace(FIELDS, FIXED); expect(r.updatedAt).toBe(r.createdAt); });
  it('generates a unique id when none provided',  () => expect(makeRace(FIELDS).id.length).toBeGreaterThan(0));
  it('createdAt is valid ISO when none provided', () => expect(() => new Date(makeRace(FIELDS).createdAt).toISOString()).not.toThrow());
  it('trims whitespace from name',                () => expect(makeRace({ ...FIELDS, name: '  Spring 5K  ' }, FIXED).name).toBe('Spring 5K'));
  it('two calls produce different ids',           () => expect(makeRace(FIELDS).id).not.toBe(makeRace(FIELDS).id));
});

// ── applyNewRaceDecision ──────────────────────────────────

describe('applyNewRaceDecision', () => {
  const existingActiveRace = {
    id: 'r-old',
    name: 'Old Race',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  // ── cancel ──────────────────────────────────────────────

  describe('cancel', () => {
    it('returns { cancelled: true }', () => {
      const result = applyNewRaceDecision({
        existingActiveRace,
        decision: CONFLICT_DECISION.CANCEL,
        now: FIXED_NOW,
      });
      expect(result).toEqual({ cancelled: true });
    });

    it('does not include updatedExisting when cancelled', () => {
      const result = applyNewRaceDecision({
        existingActiveRace,
        decision: 'cancel',
        now: FIXED_NOW,
      });
      expect(result).not.toHaveProperty('updatedExisting');
    });
  });

  // ── archive ──────────────────────────────────────────────

  describe('archive', () => {
    it('returns cancelled: false', () => {
      const result = applyNewRaceDecision({
        existingActiveRace,
        decision: CONFLICT_DECISION.ARCHIVE,
        now: FIXED_NOW,
      });
      expect(result.cancelled).toBe(false);
    });

    it('sets previous race status to "archived"', () => {
      const result = applyNewRaceDecision({
        existingActiveRace,
        decision: CONFLICT_DECISION.ARCHIVE,
        now: FIXED_NOW,
      });
      expect(result.cancelled).toBe(false);
      if (!result.cancelled) {
        expect(result.updatedExisting.status).toBe('archived');
      }
    });

    it('preserves all other fields of the existing race', () => {
      const result = applyNewRaceDecision({
        existingActiveRace,
        decision: CONFLICT_DECISION.ARCHIVE,
        now: FIXED_NOW,
      });
      expect(result.cancelled).toBe(false);
      if (!result.cancelled) {
        expect(result.updatedExisting.id).toBe('r-old');
        expect(result.updatedExisting.name).toBe('Old Race');
        expect(result.updatedExisting.createdAt).toBe('2026-01-01T00:00:00.000Z');
      }
    });

    it('sets updatedAt to the injected now timestamp', () => {
      const result = applyNewRaceDecision({
        existingActiveRace,
        decision: CONFLICT_DECISION.ARCHIVE,
        now: FIXED_NOW,
      });
      expect(result.cancelled).toBe(false);
      if (!result.cancelled) {
        expect(result.updatedExisting.updatedAt).toBe(FIXED_NOW);
      }
    });
  });

  // ── complete ─────────────────────────────────────────────

  describe('complete', () => {
    it('returns cancelled: false', () => {
      const result = applyNewRaceDecision({
        existingActiveRace,
        decision: CONFLICT_DECISION.COMPLETE,
        now: FIXED_NOW,
      });
      expect(result.cancelled).toBe(false);
    });

    it('sets previous race status to "completed"', () => {
      const result = applyNewRaceDecision({
        existingActiveRace,
        decision: CONFLICT_DECISION.COMPLETE,
        now: FIXED_NOW,
      });
      expect(result.cancelled).toBe(false);
      if (!result.cancelled) {
        expect(result.updatedExisting.status).toBe('completed');
      }
    });

    it('preserves all other fields of the existing race', () => {
      const result = applyNewRaceDecision({
        existingActiveRace,
        decision: CONFLICT_DECISION.COMPLETE,
        now: FIXED_NOW,
      });
      expect(result.cancelled).toBe(false);
      if (!result.cancelled) {
        expect(result.updatedExisting.id).toBe('r-old');
        expect(result.updatedExisting.name).toBe('Old Race');
      }
    });

    it('sets updatedAt to the injected now timestamp', () => {
      const result = applyNewRaceDecision({
        existingActiveRace,
        decision: CONFLICT_DECISION.COMPLETE,
        now: FIXED_NOW,
      });
      expect(result.cancelled).toBe(false);
      if (!result.cancelled) {
        expect(result.updatedExisting.updatedAt).toBe(FIXED_NOW);
      }
    });
  });

  // ── invariants ───────────────────────────────────────────

  it('archive and complete produce different statuses', () => {
    const archive = applyNewRaceDecision({ existingActiveRace, decision: 'archive', now: FIXED_NOW });
    const complete = applyNewRaceDecision({ existingActiveRace, decision: 'complete', now: FIXED_NOW });
    expect(archive.cancelled).toBe(false);
    expect(complete.cancelled).toBe(false);
    if (!archive.cancelled && !complete.cancelled) {
      expect(archive.updatedExisting.status).not.toBe(complete.updatedExisting.status);
    }
  });

  it('does not mutate the original existingActiveRace object', () => {
    const original = { ...existingActiveRace };
    applyNewRaceDecision({ existingActiveRace, decision: 'archive', now: FIXED_NOW });
    expect(existingActiveRace).toEqual(original);
  });
});
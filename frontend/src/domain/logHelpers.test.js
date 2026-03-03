import { describe, it, expect } from 'vitest';
import { normalizeLogFormInput, makeWorkoutLog } from './logHelpers.js';

// ── normalizeLogFormInput ─────────────────────────────────

describe('normalizeLogFormInput', () => {
  const VALID_BASE = {
    date: '2026-03-10',
    time: '07:30',
    type: 'easy',
    distance: '3.1',
    durationMinutes: '30',
    notes: 'felt good',
  };

  // ── required fields ──────────────────────────────────

  it('returns correct values for a fully populated form', () => {
    const result = normalizeLogFormInput(VALID_BASE);
    expect(result.date).toBe('2026-03-10');
    expect(result.time).toBe('07:30');
    expect(result.type).toBe('easy');
    expect(result.distance).toBe(3.1);
    expect(result.durationMinutes).toBe(30);
    expect(result.notes).toBe('felt good');
  });

  it('throws when date is empty string', () => {
    expect(() => normalizeLogFormInput({ ...VALID_BASE, date: '' })).toThrow('date is required');
  });

  it('throws when date is missing', () => {
    const { date, ...rest } = VALID_BASE;
    expect(() => normalizeLogFormInput(rest)).toThrow('date is required');
  });

  it('throws when type is empty string', () => {
    expect(() => normalizeLogFormInput({ ...VALID_BASE, type: '' })).toThrow('type is required');
  });

  it('throws when type is missing', () => {
    const { type, ...rest } = VALID_BASE;
    expect(() => normalizeLogFormInput(rest)).toThrow('type is required');
  });

  // ── time normalization ───────────────────────────────

  it('converts empty time string to null', () => {
    expect(normalizeLogFormInput({ ...VALID_BASE, time: '' }).time).toBeNull();
  });

  it('converts whitespace-only time to null', () => {
    expect(normalizeLogFormInput({ ...VALID_BASE, time: '   ' }).time).toBeNull();
  });

  it('preserves a valid time string', () => {
    expect(normalizeLogFormInput({ ...VALID_BASE, time: '06:30' }).time).toBe('06:30');
  });

  it('handles missing time field as null', () => {
    const { time, ...rest } = VALID_BASE;
    expect(normalizeLogFormInput(rest).time).toBeNull();
  });

  // ── distance normalization ───────────────────────────

  it('parses distance "3.1" to 3.1', () => {
    expect(normalizeLogFormInput({ ...VALID_BASE, distance: '3.1' }).distance).toBe(3.1);
  });

  it('converts empty distance to null', () => {
    expect(normalizeLogFormInput({ ...VALID_BASE, distance: '' }).distance).toBeNull();
  });

  it('converts non-numeric distance to null', () => {
    expect(normalizeLogFormInput({ ...VALID_BASE, distance: 'abc' }).distance).toBeNull();
  });

  it('converts negative distance to null', () => {
    expect(normalizeLogFormInput({ ...VALID_BASE, distance: '-1' }).distance).toBeNull();
  });

  it('handles missing distance as null', () => {
    const { distance, ...rest } = VALID_BASE;
    expect(normalizeLogFormInput(rest).distance).toBeNull();
  });

  it('parses distance "0" as 0', () => {
    expect(normalizeLogFormInput({ ...VALID_BASE, distance: '0' }).distance).toBe(0);
  });

  // ── durationMinutes normalization ────────────────────

  it('parses durationMinutes "30" to 30', () => {
    expect(normalizeLogFormInput({ ...VALID_BASE, durationMinutes: '30' }).durationMinutes).toBe(30);
  });

  it('converts empty durationMinutes to null', () => {
    expect(normalizeLogFormInput({ ...VALID_BASE, durationMinutes: '' }).durationMinutes).toBeNull();
  });

  it('converts non-numeric durationMinutes to null', () => {
    expect(normalizeLogFormInput({ ...VALID_BASE, durationMinutes: 'abc' }).durationMinutes).toBeNull();
  });

  it('handles missing durationMinutes as null', () => {
    const { durationMinutes, ...rest } = VALID_BASE;
    expect(normalizeLogFormInput(rest).durationMinutes).toBeNull();
  });

  // ── notes normalization ──────────────────────────────

  it('trims whitespace from notes', () => {
    expect(normalizeLogFormInput({ ...VALID_BASE, notes: '  note  ' }).notes).toBe('note');
  });

  it('handles empty notes as empty string', () => {
    expect(normalizeLogFormInput({ ...VALID_BASE, notes: '' }).notes).toBe('');
  });

  it('handles missing notes as empty string', () => {
    const { notes, ...rest } = VALID_BASE;
    expect(normalizeLogFormInput(rest).notes).toBe('');
  });

  // ── minimal valid form ───────────────────────────────

  it('accepts a minimal form with only date and type', () => {
    const result = normalizeLogFormInput({ date: '2026-03-10', type: 'rest' });
    expect(result.date).toBe('2026-03-10');
    expect(result.type).toBe('rest');
    expect(result.time).toBeNull();
    expect(result.distance).toBeNull();
    expect(result.durationMinutes).toBeNull();
    expect(result.notes).toBe('');
  });
});

// ── makeWorkoutLog ────────────────────────────────────────

describe('makeWorkoutLog', () => {
  const FIELDS = {
    date: '2026-03-10', time: '07:30', type: 'easy',
    distance: 3.1, durationMinutes: 30,
    notes: 'great run', plannedWorkoutId: 'pw-001',
  };
  const FIXED = { id: 'log-test-001', now: '2026-03-10T08:00:00.000Z' };

  it('sets all fields correctly', () => {
    const log = makeWorkoutLog(FIELDS, FIXED);
    expect(log.id).toBe('log-test-001');
    expect(log.date).toBe('2026-03-10');
    expect(log.time).toBe('07:30');
    expect(log.type).toBe('easy');
    expect(log.distance).toBe(3.1);
    expect(log.durationMinutes).toBe(30);
    expect(log.notes).toBe('great run');
    expect(log.plannedWorkoutId).toBe('pw-001');
    expect(log.createdAt).toBe(FIXED.now);
    expect(log.updatedAt).toBe(FIXED.now);
  });

  it('defaults plannedWorkoutId to null when not provided', () => {
    const { plannedWorkoutId, ...rest } = FIELDS;
    expect(makeWorkoutLog(rest, FIXED).plannedWorkoutId).toBeNull();
  });

  it('defaults time to null when not provided', () => {
    const { time, ...rest } = FIELDS;
    expect(makeWorkoutLog(rest, FIXED).time).toBeNull();
  });

  it('defaults distance to null when not provided', () => {
    const { distance, ...rest } = FIELDS;
    expect(makeWorkoutLog(rest, FIXED).distance).toBeNull();
  });

  it('defaults durationMinutes to null when not provided', () => {
    const { durationMinutes, ...rest } = FIELDS;
    expect(makeWorkoutLog(rest, FIXED).durationMinutes).toBeNull();
  });

  it('defaults notes to empty string when not provided', () => {
    const { notes, ...rest } = FIELDS;
    expect(makeWorkoutLog(rest, FIXED).notes).toBe('');
  });

  it('generates a unique id when none provided', () => {
    const a = makeWorkoutLog(FIELDS);
    const b = makeWorkoutLog(FIELDS);
    expect(a.id).not.toBe(b.id);
  });

  it('createdAt equals updatedAt on creation', () => {
    const log = makeWorkoutLog(FIELDS, FIXED);
    expect(log.createdAt).toBe(log.updatedAt);
  });
});
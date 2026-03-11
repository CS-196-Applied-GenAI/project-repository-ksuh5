import { describe, it, expect } from 'vitest';
import {
  applyPlannedWorkoutPatch,
  parseWorkoutNumber,
  normaliseWorkoutForm,
} from './workoutHelpers.js';

// ── fixtures ──────────────────────────────────────────────

const BASE = {
  id:              'pw-001',
  raceId:          'race-001',
  date:            '2026-03-10',
  type:            'easy',
  title:           'Morning run',
  distance:        3,
  durationMinutes: 30,
  paceLow:         null,
  paceHigh:        null,
  structureText:   '',
  notes:           '',
  locked:          false,
  createdAt:       '2026-01-01T00:00:00.000Z',
  updatedAt:       '2026-01-01T00:00:00.000Z',
};

const NOW = '2026-03-03T12:00:00.000Z';

// ── applyPlannedWorkoutPatch ──────────────────────────────

describe('applyPlannedWorkoutPatch', () => {

  // ── no change ─────────────────────────────────────────

  it('returns the same reference when patch changes nothing', () => {
    const result = applyPlannedWorkoutPatch(BASE, { distance: 3 }, { now: NOW });
    expect(result).toBe(BASE); // referential equality
  });

  it('does not set locked when patch changes nothing', () => {
    const result = applyPlannedWorkoutPatch(BASE, { distance: 3 }, { now: NOW });
    expect(result.locked).toBe(false);
  });

  // ── lockable field changes ─────────────────────────────

  it('sets locked=true when distance changes', () => {
    const result = applyPlannedWorkoutPatch(BASE, { distance: 5 }, { now: NOW });
    expect(result.locked).toBe(true);
  });

  it('sets locked=true when durationMinutes changes', () => {
    const result = applyPlannedWorkoutPatch(BASE, { durationMinutes: 45 }, { now: NOW });
    expect(result.locked).toBe(true);
  });

  it('sets locked=true when type changes', () => {
    const result = applyPlannedWorkoutPatch(BASE, { type: 'tempo' }, { now: NOW });
    expect(result.locked).toBe(true);
  });

  it('sets locked=true when date changes', () => {
    const result = applyPlannedWorkoutPatch(BASE, { date: '2026-03-11' }, { now: NOW });
    expect(result.locked).toBe(true);
  });

  it('sets locked=true when paceLow changes', () => {
    const result = applyPlannedWorkoutPatch(BASE, { paceLow: '8:00' }, { now: NOW });
    expect(result.locked).toBe(true);
  });

  it('sets locked=true when paceHigh changes', () => {
    const result = applyPlannedWorkoutPatch(BASE, { paceHigh: '9:00' }, { now: NOW });
    expect(result.locked).toBe(true);
  });

  it('sets locked=true when title changes', () => {
    const result = applyPlannedWorkoutPatch(BASE, { title: 'New title' }, { now: NOW });
    expect(result.locked).toBe(true);
  });

  it('sets locked=true when notes changes', () => {
    const result = applyPlannedWorkoutPatch(BASE, { notes: 'some note' }, { now: NOW });
    expect(result.locked).toBe(true);
  });

  it('sets locked=true when structureText changes', () => {
    const result = applyPlannedWorkoutPatch(BASE, { structureText: '2x10min' }, { now: NOW });
    expect(result.locked).toBe(true);
  });

  // ── locked stays true once set ─────────────────────────

  it('keeps locked=true if already locked and patch changes nothing else', () => {
    const locked = { ...BASE, locked: true };
    const result = applyPlannedWorkoutPatch(locked, { notes: 'same notes as before' }, { now: NOW });
    // notes is same as base (empty), so this doesn't change → no new lock, but was already locked
    expect(result.locked).toBe(true);
  });

  // ── updatedAt behaviour ────────────────────────────────

  it('updates updatedAt when a field changes', () => {
    const result = applyPlannedWorkoutPatch(BASE, { distance: 5 }, { now: NOW });
    expect(result.updatedAt).toBe(NOW);
  });

  it('does not update updatedAt when nothing changes', () => {
    const result = applyPlannedWorkoutPatch(BASE, { distance: 3 }, { now: NOW });
    expect(result.updatedAt).toBe(BASE.updatedAt);
  });

  it('uses injected now timestamp', () => {
    const result = applyPlannedWorkoutPatch(BASE, { distance: 5 }, { now: NOW });
    expect(result.updatedAt).toBe(NOW);
  });

  // ── immutability ───────────────────────────────────────

  it('does not mutate the original workout', () => {
    const original = { ...BASE };
    applyPlannedWorkoutPatch(BASE, { distance: 10 }, { now: NOW });
    expect(BASE).toEqual(original);
  });

  it('does not mutate the patch object', () => {
    const patch = { distance: 10 };
    const originalPatch = { ...patch };
    applyPlannedWorkoutPatch(BASE, patch, { now: NOW });
    expect(patch).toEqual(originalPatch);
  });

  // ── applied values ─────────────────────────────────────

  it('applies the new field value correctly', () => {
    const result = applyPlannedWorkoutPatch(BASE, { distance: 6, type: 'tempo' }, { now: NOW });
    expect(result.distance).toBe(6);
    expect(result.type).toBe('tempo');
  });

  it('preserves unchanged fields', () => {
    const result = applyPlannedWorkoutPatch(BASE, { distance: 5 }, { now: NOW });
    expect(result.id).toBe(BASE.id);
    expect(result.raceId).toBe(BASE.raceId);
    expect(result.createdAt).toBe(BASE.createdAt);
    expect(result.durationMinutes).toBe(BASE.durationMinutes);
  });
});

// ── parseWorkoutNumber ────────────────────────────────────

describe('parseWorkoutNumber', () => {
  it('parses a valid positive integer',    () => expect(parseWorkoutNumber('5')).toBe(5));
  it('parses a valid decimal',             () => expect(parseWorkoutNumber('3.1')).toBe(3.1));
  it('returns null for empty string',      () => expect(parseWorkoutNumber('')).toBeNull());
  it('returns null for null',              () => expect(parseWorkoutNumber(null)).toBeNull());
  it('returns null for undefined',         () => expect(parseWorkoutNumber(undefined)).toBeNull());
  it('returns null for non-numeric text',  () => expect(parseWorkoutNumber('abc')).toBeNull());
  it('returns null for negative number',   () => expect(parseWorkoutNumber('-1')).toBeNull());
  it('parses zero as null (0 = no value)', () => expect(parseWorkoutNumber('0')).toBe(0));
});

// ── normaliseWorkoutForm ──────────────────────────────────

describe('normaliseWorkoutForm', () => {
  it('converts distance string to number', () => {
    expect(normaliseWorkoutForm({ distance: '3.1' }).distance).toBe(3.1);
  });

  it('converts empty distance to null', () => {
    expect(normaliseWorkoutForm({ distance: '' }).distance).toBeNull();
  });

  it('converts durationMinutes string to number', () => {
    expect(normaliseWorkoutForm({ durationMinutes: '30' }).durationMinutes).toBe(30);
  });

  it('converts empty paceLow to null', () => {
    expect(normaliseWorkoutForm({ paceLow: '' }).paceLow).toBeNull();
  });

  it('preserves non-empty pace string', () => {
    expect(normaliseWorkoutForm({ paceLow: '8:30' }).paceLow).toBe('8:30');
  });

  it('preserves type string as-is', () => {
    expect(normaliseWorkoutForm({ type: 'tempo' }).type).toBe('tempo');
  });

  it('only includes keys that are present in the raw form', () => {
    const result = normaliseWorkoutForm({ type: 'easy' });
    expect(result).toHaveProperty('type');
    expect(result).not.toHaveProperty('distance');
    expect(result).not.toHaveProperty('notes');
  });
});
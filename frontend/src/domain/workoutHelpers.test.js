import { describe, it, expect } from 'vitest';
import {
  applyPlannedWorkoutPatch,
  movePlannedWorkout,
  shouldConfirmDrop,
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
    expect(applyPlannedWorkoutPatch(BASE, { distance: 3 }, { now: NOW })).toBe(BASE);
  });

  it('does not touch updatedAt when nothing changes', () => {
    expect(applyPlannedWorkoutPatch(BASE, { distance: 3 }, { now: NOW }).updatedAt)
      .toBe(BASE.updatedAt);
  });

  // ── locked is never auto-set ───────────────────────────

  it('does NOT set locked when distance changes', () => {
    expect(applyPlannedWorkoutPatch(BASE, { distance: 5 }, { now: NOW }).locked).toBe(false);
  });

  it('does NOT set locked when type changes', () => {
    expect(applyPlannedWorkoutPatch(BASE, { type: 'tempo' }, { now: NOW }).locked).toBe(false);
  });

  it('does NOT set locked when date changes', () => {
    expect(applyPlannedWorkoutPatch(BASE, { date: '2026-03-11' }, { now: NOW }).locked).toBe(false);
  });

  it('does NOT set locked when title changes', () => {
    expect(applyPlannedWorkoutPatch(BASE, { title: 'New title' }, { now: NOW }).locked).toBe(false);
  });

  it('does NOT set locked when notes changes', () => {
    expect(applyPlannedWorkoutPatch(BASE, { notes: 'a note' }, { now: NOW }).locked).toBe(false);
  });

  it('does NOT set locked when durationMinutes changes', () => {
    expect(applyPlannedWorkoutPatch(BASE, { durationMinutes: 45 }, { now: NOW }).locked).toBe(false);
  });

  it('does NOT set locked when paceLow changes', () => {
    expect(applyPlannedWorkoutPatch(BASE, { paceLow: '8:00' }, { now: NOW }).locked).toBe(false);
  });

  it('does NOT set locked when paceHigh changes', () => {
    expect(applyPlannedWorkoutPatch(BASE, { paceHigh: '9:00' }, { now: NOW }).locked).toBe(false);
  });

  it('does NOT set locked when structureText changes', () => {
    expect(applyPlannedWorkoutPatch(BASE, { structureText: '2x10min' }, { now: NOW }).locked).toBe(false);
  });

  // ── explicit locked patch is respected ────────────────

  it('sets locked=true when patch explicitly includes locked:true', () => {
    expect(applyPlannedWorkoutPatch(BASE, { locked: true }, { now: NOW }).locked).toBe(true);
  });

  it('sets locked=false when patch explicitly includes locked:false on a locked workout', () => {
    const locked = { ...BASE, locked: true };
    expect(applyPlannedWorkoutPatch(locked, { locked: false }, { now: NOW }).locked).toBe(false);
  });

  it('preserves locked=true when already locked and patch does not include locked', () => {
    const locked = { ...BASE, locked: true };
    expect(applyPlannedWorkoutPatch(locked, { distance: 5 }, { now: NOW }).locked).toBe(true);
  });

  // ── updatedAt ──────────────────────────────────────────

  it('updates updatedAt when a field changes', () => {
    expect(applyPlannedWorkoutPatch(BASE, { distance: 5 }, { now: NOW }).updatedAt).toBe(NOW);
  });

  it('uses injected now timestamp', () => {
    const result = applyPlannedWorkoutPatch(BASE, { distance: 5 }, { now: NOW });
    expect(result.updatedAt).toBe(NOW);
  });

  // ── immutability ───────────────────────────────────────

  it('does not mutate the original workout', () => {
    const orig = { ...BASE };
    applyPlannedWorkoutPatch(BASE, { distance: 10 }, { now: NOW });
    expect(BASE).toEqual(orig);
  });

  it('does not mutate the patch object', () => {
    const patch = { distance: 10 };
    const before = { ...patch };
    applyPlannedWorkoutPatch(BASE, patch, { now: NOW });
    expect(patch).toEqual(before);
  });

  // ── correct values ─────────────────────────────────────

  it('applies new field values', () => {
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

// ── movePlannedWorkout ────────────────────────────────────

describe('movePlannedWorkout', () => {
  it('returns the same reference when date is unchanged',   () => expect(movePlannedWorkout(BASE, '2026-03-10', { now: NOW })).toBe(BASE));
  it('returns a new object when date changes',              () => expect(movePlannedWorkout(BASE, '2026-03-15', { now: NOW })).not.toBe(BASE));
  it('updates the date field',                             () => expect(movePlannedWorkout(BASE, '2026-03-15', { now: NOW }).date).toBe('2026-03-15'));
  it('does NOT set locked=true',                           () => expect(movePlannedWorkout(BASE, '2026-03-15', { now: NOW }).locked).toBe(false));
  it('keeps locked=true if already locked', () => {
    const locked = { ...BASE, locked: true };
    expect(movePlannedWorkout(locked, '2026-03-15', { now: NOW }).locked).toBe(true);
  });
  it('updates updatedAt',                                  () => expect(movePlannedWorkout(BASE, '2026-03-15', { now: NOW }).updatedAt).toBe(NOW));
  it('preserves all other fields', () => {
    const result = movePlannedWorkout(BASE, '2026-03-15', { now: NOW });
    expect(result.id).toBe(BASE.id);
    expect(result.type).toBe(BASE.type);
    expect(result.distance).toBe(BASE.distance);
    expect(result.createdAt).toBe(BASE.createdAt);
  });
  it('does not mutate the original workout', () => {
    const orig = { ...BASE };
    movePlannedWorkout(BASE, '2026-03-20', { now: NOW });
    expect(BASE).toEqual(orig);
  });
});

// ── shouldConfirmDrop ─────────────────────────────────────

describe('shouldConfirmDrop', () => {
  it('returns false when target day has 0 workouts',   () => expect(shouldConfirmDrop(0)).toBe(false));
  it('returns true when target day has 1 workout',     () => expect(shouldConfirmDrop(1)).toBe(true));
  it('returns true when target day has 2 workouts',    () => expect(shouldConfirmDrop(2)).toBe(true));
  it('returns true when target day has many workouts', () => expect(shouldConfirmDrop(10)).toBe(true));
});

// ── parseWorkoutNumber ────────────────────────────────────

describe('parseWorkoutNumber', () => {
  it('parses a valid positive integer',   () => expect(parseWorkoutNumber('5')).toBe(5));
  it('parses a valid decimal',            () => expect(parseWorkoutNumber('3.1')).toBe(3.1));
  it('returns null for empty string',     () => expect(parseWorkoutNumber('')).toBeNull());
  it('returns null for null',             () => expect(parseWorkoutNumber(null)).toBeNull());
  it('returns null for non-numeric text', () => expect(parseWorkoutNumber('abc')).toBeNull());
  it('returns null for negative number',  () => expect(parseWorkoutNumber('-1')).toBeNull());
});

// ── normaliseWorkoutForm ──────────────────────────────────

describe('normaliseWorkoutForm', () => {
  it('converts distance string to number',    () => expect(normaliseWorkoutForm({ distance: '3.1' }).distance).toBe(3.1));
  it('converts empty distance to null',       () => expect(normaliseWorkoutForm({ distance: '' }).distance).toBeNull());
  it('converts durationMinutes to number',    () => expect(normaliseWorkoutForm({ durationMinutes: '30' }).durationMinutes).toBe(30));
  it('converts empty paceLow to null',        () => expect(normaliseWorkoutForm({ paceLow: '' }).paceLow).toBeNull());
  it('preserves non-empty pace string',       () => expect(normaliseWorkoutForm({ paceLow: '8:30' }).paceLow).toBe('8:30'));
  it('preserves type string as-is',           () => expect(normaliseWorkoutForm({ type: 'tempo' }).type).toBe('tempo'));
  it('only includes keys present in rawForm', () => {
    const result = normaliseWorkoutForm({ type: 'easy' });
    expect(result).toHaveProperty('type');
    expect(result).not.toHaveProperty('distance');
  });
});
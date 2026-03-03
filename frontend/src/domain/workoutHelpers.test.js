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
  id: 'pw-001', raceId: 'race-001',
  date: '2026-03-10', type: 'easy', title: 'Morning run',
  distance: 3, durationMinutes: 30,
  paceLow: null, paceHigh: null, structureText: '', notes: '',
  locked: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const NOW = '2026-03-03T12:00:00.000Z';

// ── applyPlannedWorkoutPatch ──────────────────────────────

describe('applyPlannedWorkoutPatch', () => {
  it('returns same reference when patch changes nothing',       () => expect(applyPlannedWorkoutPatch(BASE, { distance: 3 }, { now: NOW })).toBe(BASE));
  it('does not set locked when patch changes nothing',          () => expect(applyPlannedWorkoutPatch(BASE, { distance: 3 }, { now: NOW }).locked).toBe(false));
  it('sets locked=true when distance changes',                  () => expect(applyPlannedWorkoutPatch(BASE, { distance: 5 }, { now: NOW }).locked).toBe(true));
  it('sets locked=true when durationMinutes changes',           () => expect(applyPlannedWorkoutPatch(BASE, { durationMinutes: 45 }, { now: NOW }).locked).toBe(true));
  it('sets locked=true when type changes',                      () => expect(applyPlannedWorkoutPatch(BASE, { type: 'tempo' }, { now: NOW }).locked).toBe(true));
  it('sets locked=true when date changes',                      () => expect(applyPlannedWorkoutPatch(BASE, { date: '2026-03-11' }, { now: NOW }).locked).toBe(true));
  it('sets locked=true when paceLow changes',                   () => expect(applyPlannedWorkoutPatch(BASE, { paceLow: '8:00' }, { now: NOW }).locked).toBe(true));
  it('sets locked=true when paceHigh changes',                  () => expect(applyPlannedWorkoutPatch(BASE, { paceHigh: '9:00' }, { now: NOW }).locked).toBe(true));
  it('sets locked=true when title changes',                     () => expect(applyPlannedWorkoutPatch(BASE, { title: 'New' }, { now: NOW }).locked).toBe(true));
  it('sets locked=true when notes changes',                     () => expect(applyPlannedWorkoutPatch(BASE, { notes: 'note' }, { now: NOW }).locked).toBe(true));
  it('sets locked=true when structureText changes',             () => expect(applyPlannedWorkoutPatch(BASE, { structureText: '2x10' }, { now: NOW }).locked).toBe(true));
  it('keeps locked=true if already locked',                    () => expect(applyPlannedWorkoutPatch({ ...BASE, locked: true }, { distance: 3 }, { now: NOW }).locked).toBe(true));
  it('updates updatedAt when a field changes',                  () => expect(applyPlannedWorkoutPatch(BASE, { distance: 5 }, { now: NOW }).updatedAt).toBe(NOW));
  it('does not update updatedAt when nothing changes',          () => expect(applyPlannedWorkoutPatch(BASE, { distance: 3 }, { now: NOW }).updatedAt).toBe(BASE.updatedAt));
  it('does not mutate the original workout',                    () => { const o = { ...BASE }; applyPlannedWorkoutPatch(BASE, { distance: 10 }, { now: NOW }); expect(BASE).toEqual(o); });
  it('applies the new field values correctly',                  () => { const r = applyPlannedWorkoutPatch(BASE, { distance: 6, type: 'tempo' }, { now: NOW }); expect(r.distance).toBe(6); expect(r.type).toBe('tempo'); });
  it('preserves unchanged fields',                              () => { const r = applyPlannedWorkoutPatch(BASE, { distance: 5 }, { now: NOW }); expect(r.id).toBe(BASE.id); expect(r.raceId).toBe(BASE.raceId); });
});

// ── movePlannedWorkout ────────────────────────────────────

describe('movePlannedWorkout', () => {
  it('returns same reference when date is unchanged', () => {
    expect(movePlannedWorkout(BASE, '2026-03-10', { now: NOW })).toBe(BASE);
  });

  it('returns a new object with the updated date', () => {
    const result = movePlannedWorkout(BASE, '2026-03-15', { now: NOW });
    expect(result.date).toBe('2026-03-15');
  });

  it('sets locked=true when date changes', () => {
    const result = movePlannedWorkout(BASE, '2026-03-15', { now: NOW });
    expect(result.locked).toBe(true);
  });

  it('updates updatedAt when date changes', () => {
    const result = movePlannedWorkout(BASE, '2026-03-15', { now: NOW });
    expect(result.updatedAt).toBe(NOW);
  });

  it('preserves all other fields', () => {
    const result = movePlannedWorkout(BASE, '2026-03-15', { now: NOW });
    expect(result.id).toBe(BASE.id);
    expect(result.raceId).toBe(BASE.raceId);
    expect(result.type).toBe(BASE.type);
    expect(result.distance).toBe(BASE.distance);
    expect(result.createdAt).toBe(BASE.createdAt);
  });

  it('does not mutate the original workout', () => {
    const original = { ...BASE };
    movePlannedWorkout(BASE, '2026-03-20', { now: NOW });
    expect(BASE).toEqual(original);
  });

  it('stays locked if already locked before move', () => {
    const locked = { ...BASE, locked: true };
    expect(movePlannedWorkout(locked, '2026-03-15', { now: NOW }).locked).toBe(true);
  });
});

// ── shouldConfirmDrop ─────────────────────────────────────

describe('shouldConfirmDrop', () => {
  it('returns false when target day has 0 existing workouts', () => {
    expect(shouldConfirmDrop(0)).toBe(false);
  });

  it('returns true when target day has 1 existing workout', () => {
    expect(shouldConfirmDrop(1)).toBe(true);
  });

  it('returns true when target day has 2 existing workouts', () => {
    expect(shouldConfirmDrop(2)).toBe(true);
  });

  it('returns true for any positive count', () => {
    [1, 2, 5, 10, 100].forEach((n) => expect(shouldConfirmDrop(n)).toBe(true));
  });

  it('returns false for 0', () => {
    expect(shouldConfirmDrop(0)).toBe(false);
  });
});

// ── parseWorkoutNumber ────────────────────────────────────

describe('parseWorkoutNumber', () => {
  it('parses a valid positive integer',   () => expect(parseWorkoutNumber('5')).toBe(5));
  it('parses a valid decimal',            () => expect(parseWorkoutNumber('3.1')).toBe(3.1));
  it('returns null for empty string',     () => expect(parseWorkoutNumber('')).toBeNull());
  it('returns null for null',             () => expect(parseWorkoutNumber(null)).toBeNull());
  it('returns null for undefined',        () => expect(parseWorkoutNumber(undefined)).toBeNull());
  it('returns null for non-numeric text', () => expect(parseWorkoutNumber('abc')).toBeNull());
  it('returns null for negative number',  () => expect(parseWorkoutNumber('-1')).toBeNull());
  it('parses zero correctly',             () => expect(parseWorkoutNumber('0')).toBe(0));
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
    const r = normaliseWorkoutForm({ type: 'easy' });
    expect(r).toHaveProperty('type');
    expect(r).not.toHaveProperty('distance');
  });
});
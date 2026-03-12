import { describe, it, expect } from 'vitest';
import { formatCount, hasActiveRecord } from './formatters.js';

describe('formatCount', () => {
  it('uses singular when count is 1', () => {
    expect(formatCount(1, 'race')).toBe('1 race');
  });

  it('uses default plural (singular + s) when count is 0', () => {
    expect(formatCount(0, 'race')).toBe('0 races');
  });

  it('uses default plural when count > 1', () => {
    expect(formatCount(5, 'planned workout')).toBe('5 planned workouts');
  });

  it('uses explicit plural when provided', () => {
    expect(formatCount(3, 'entry', 'entries')).toBe('3 entries');
  });

  it('uses explicit plural even when count is 2', () => {
    expect(formatCount(2, 'log', 'logs')).toBe('2 logs');
  });
});

describe('hasActiveRecord', () => {
  it('returns true when at least one record is active', () => {
    const records = [{ status: 'archived' }, { status: 'active' }];
    expect(hasActiveRecord(records)).toBe(true);
  });

  it('returns false when no records are active', () => {
    const records = [{ status: 'archived' }, { status: 'completed' }];
    expect(hasActiveRecord(records)).toBe(false);
  });

  it('returns false for an empty array', () => {
    expect(hasActiveRecord([])).toBe(false);
  });
});
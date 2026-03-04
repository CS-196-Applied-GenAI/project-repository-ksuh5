import { describe, it, expect } from 'vitest';
import {
  WORKOUT_TYPES,
  ALL_WORKOUT_TYPES,
  isQualityType,
  displayWorkoutType,
} from './workoutTypes.js';

describe('isQualityType', () => {
  it('returns true for tempo', () => {
    expect(isQualityType(WORKOUT_TYPES.TEMPO)).toBe(true);
  });

  it('returns true for interval', () => {
    expect(isQualityType(WORKOUT_TYPES.INTERVAL)).toBe(true);
  });

  it('returns true for long_run', () => {
    expect(isQualityType(WORKOUT_TYPES.LONG_RUN)).toBe(true);
  });

  it('returns false for easy', () => {
    expect(isQualityType(WORKOUT_TYPES.EASY)).toBe(false);
  });

  it('returns false for cross_train (explicitly NOT quality)', () => {
    expect(isQualityType(WORKOUT_TYPES.CROSS_TRAIN)).toBe(false);
  });

  it('returns false for rest', () => {
    expect(isQualityType(WORKOUT_TYPES.REST)).toBe(false);
  });

  it('returns false for unknown/empty string', () => {
    expect(isQualityType('')).toBe(false);
    expect(isQualityType('unknown')).toBe(false);
  });
});

describe('displayWorkoutType', () => {
  it('returns "Easy run" for easy', () => {
    expect(displayWorkoutType('easy')).toBe('Easy run');
  });

  it('returns "Tempo run" for tempo', () => {
    expect(displayWorkoutType('tempo')).toBe('Tempo run');
  });

  it('returns "Intervals" for interval', () => {
    expect(displayWorkoutType('interval')).toBe('Intervals');
  });

  it('returns "Long run" for long_run', () => {
    expect(displayWorkoutType('long_run')).toBe('Long run');
  });

  it('returns "Cross-training" for cross_train', () => {
    expect(displayWorkoutType('cross_train')).toBe('Cross-training');
  });

  it('returns "Rest day" for rest', () => {
    expect(displayWorkoutType('rest')).toBe('Rest day');
  });

  it('handles spec.md alias "recover"', () => {
    expect(displayWorkoutType('recover')).toBe('Recovery run');
  });

  it('falls back to title-case for unknown type', () => {
    expect(displayWorkoutType('fartlek_run')).toBe('Fartlek Run');
  });

  it('returns "Unknown" for null/undefined', () => {
    expect(displayWorkoutType(null)).toBe('Unknown');
    expect(displayWorkoutType(undefined)).toBe('Unknown');
  });
});

describe('ALL_WORKOUT_TYPES', () => {
  it('contains exactly 6 canonical types', () => {
    expect(ALL_WORKOUT_TYPES).toHaveLength(6);
  });

  it('includes all expected keys', () => {
    expect(ALL_WORKOUT_TYPES).toContain('easy');
    expect(ALL_WORKOUT_TYPES).toContain('tempo');
    expect(ALL_WORKOUT_TYPES).toContain('interval');
    expect(ALL_WORKOUT_TYPES).toContain('long_run');
    expect(ALL_WORKOUT_TYPES).toContain('cross_train');
    expect(ALL_WORKOUT_TYPES).toContain('rest');
  });
});
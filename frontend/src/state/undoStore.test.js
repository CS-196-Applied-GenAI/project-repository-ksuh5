import { describe, test, expect, beforeEach } from 'vitest';
import { setSnapshot, getSnapshot, clearSnapshot } from './undoStore.js';

describe('undoStore', () => {
  beforeEach(() => {
    // Reset state between tests
    clearSnapshot();
  });

  test('getSnapshot() returns null initially', () => {
    expect(getSnapshot()).toBeNull();
  });

  test('setSnapshot then getSnapshot returns the correct value', () => {
    const workouts = [{ id: '1', type: 'easy' }, { id: '2', type: 'rest' }];
    setSnapshot(workouts);
    expect(getSnapshot()).toEqual(workouts);
  });

  test('clearSnapshot resets to null', () => {
    setSnapshot([{ id: '1', type: 'easy' }]);
    clearSnapshot();
    expect(getSnapshot()).toBeNull();
  });

  test('second setSnapshot overwrites the first', () => {
    const first  = [{ id: '1', type: 'easy' }];
    const second = [{ id: '2', type: 'long_run' }, { id: '3', type: 'rest' }];
    setSnapshot(first);
    setSnapshot(second);
    expect(getSnapshot()).toEqual(second);
  });
});
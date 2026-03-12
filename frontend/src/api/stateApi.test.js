import { describe, test, expect, vi, afterEach } from 'vitest';
import { saveState, loadState } from './stateApi.js';
import * as http from './http.js';

vi.mock('./http.js', () => ({
  apiFetch: vi.fn(),
}));

describe('saveState', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('calls POST /state/save with correct payload shape', async () => {
    http.apiFetch.mockResolvedValue({});

    const snapshot = {
      races: [{ id: 'r1', name: 'Marathon' }],
      plannedWorkouts: [{ id: 'pw1', type: 'easy' }],
      workoutLogs: [],
    };

    await saveState(snapshot);

    expect(http.apiFetch).toHaveBeenCalledWith(
      '/state/save',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ snapshot: { data: snapshot } }),
      })
    );
  });

  test('sends an empty snapshot correctly', async () => {
    http.apiFetch.mockResolvedValue({});

    await saveState({});

    const [, options] = http.apiFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body).toEqual({ snapshot: { data: {} } });
  });
});

describe('loadState', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('returns null when response snapshot is null', async () => {
    http.apiFetch.mockResolvedValue({ snapshot: null });

    const result = await loadState();

    expect(result).toBeNull();
  });

  test('returns null when response has no snapshot field', async () => {
    http.apiFetch.mockResolvedValue({});

    const result = await loadState();

    expect(result).toBeNull();
  });

  test('returns snapshot.data when snapshot is present', async () => {
    const data = {
      races: [{ id: 'r1' }],
      plannedWorkouts: [],
      workoutLogs: [],
    };
    http.apiFetch.mockResolvedValue({ snapshot: { data } });

    const result = await loadState();

    expect(result).toEqual(data);
  });

  test('calls GET /state/load with no body', async () => {
    http.apiFetch.mockResolvedValue({ snapshot: null });

    await loadState();

    expect(http.apiFetch).toHaveBeenCalledWith('/state/load');
  });
});
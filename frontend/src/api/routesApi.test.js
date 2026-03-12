import { describe, test, expect, vi, afterEach } from 'vitest';
import { snapRoute } from './routesApi.js';
import * as http from './http.js';

vi.mock('./http.js', () => ({
  apiFetch: vi.fn(),
}));

describe('snapRoute', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('throws if fewer than 2 waypoints are provided', async () => {
    await expect(snapRoute([])).rejects.toThrow(
      'snapRoute requires at least 2 waypoints.'
    );
    await expect(snapRoute([{ lat: 51.5, lng: -0.1 }])).rejects.toThrow(
      'snapRoute requires at least 2 waypoints.'
    );
  });

  test('throws if waypoints is not an array', async () => {
    await expect(snapRoute(null)).rejects.toThrow(
      'snapRoute requires at least 2 waypoints.'
    );
    await expect(snapRoute(undefined)).rejects.toThrow(
      'snapRoute requires at least 2 waypoints.'
    );
  });

  test('sends correct payload to /routes/snap', async () => {
    http.apiFetch.mockResolvedValue({
      distance_km: 5.2,
      geometry:    { type: 'LineString', coordinates: [] },
      start:       { lat: 51.5, lng: -0.1 },
      end:         { lat: 51.6, lng: -0.2 },
    });

    const waypoints = [
      { lat: 51.5, lng: -0.1 },
      { lat: 51.6, lng: -0.2 },
    ];

    await snapRoute(waypoints);

    expect(http.apiFetch).toHaveBeenCalledWith(
      '/routes/snap',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ waypoints }),
      })
    );
  });

  test('maps response to camelCase frontend shape', async () => {
    http.apiFetch.mockResolvedValue({
      distance_km: 5.2,
      geometry:    { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
      start:       { lat: 51.5, lng: -0.1 },
      end:         { lat: 51.6, lng: -0.2 },
    });

    const result = await snapRoute([
      { lat: 51.5, lng: -0.1 },
      { lat: 51.6, lng: -0.2 },
    ]);

    expect(result).toEqual({
      distanceKm: 5.2,
      geometry:   { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
      start:      { lat: 51.5, lng: -0.1 },
      end:        { lat: 51.6, lng: -0.2 },
    });
  });

  test('works with more than 2 waypoints', async () => {
    http.apiFetch.mockResolvedValue({
      distance_km: 12.5,
      geometry:    { type: 'LineString', coordinates: [] },
      start:       { lat: 51.5, lng: -0.1 },
      end:         { lat: 51.8, lng: -0.4 },
    });

    const waypoints = [
      { lat: 51.5, lng: -0.1 },
      { lat: 51.6, lng: -0.2 },
      { lat: 51.7, lng: -0.3 },
      { lat: 51.8, lng: -0.4 },
    ];

    const result = await snapRoute(waypoints);

    const body = JSON.parse(http.apiFetch.mock.calls[0][1].body);
    expect(body.waypoints).toHaveLength(4);
    expect(result.distanceKm).toBe(12.5);
  });
});
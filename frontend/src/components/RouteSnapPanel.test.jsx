import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RouteSnapPanel from './RouteSnapPanel.jsx';
import * as routesApi from '../api/routesApi.js';

vi.mock('../api/routesApi.js', () => ({
  snapRoute: vi.fn(),
}));

const VALID_WAYPOINTS_JSON =
  '[{"lat":51.5,"lng":-0.1},{"lat":51.6,"lng":-0.2}]';

const MOCK_RESULT = {
  distanceKm: 5.2,
  geometry:   { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
  start:      { lat: 51.5, lng: -0.1 },
  end:        { lat: 51.6, lng: -0.2 },
};

afterEach(() => {
  vi.resetAllMocks();
});

describe('RouteSnapPanel', () => {
  test('renders textarea and submit button', () => {
    render(<RouteSnapPanel />);
    expect(screen.getByRole('textbox')).toBeTruthy();
    expect(screen.getByRole('button', { name: /snap route/i })).toBeTruthy();
  });

  test('shows distance result on success', async () => {
    routesApi.snapRoute.mockResolvedValue(MOCK_RESULT);

    render(<RouteSnapPanel />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: VALID_WAYPOINTS_JSON },
    });
    fireEvent.click(screen.getByRole('button', { name: /snap route/i }));

    await waitFor(() => {
      expect(screen.getByText(/5\.20 km/)).toBeTruthy();
    });
  });

  test('shows GeoJSON geometry on success', async () => {
    routesApi.snapRoute.mockResolvedValue(MOCK_RESULT);

    render(<RouteSnapPanel />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: VALID_WAYPOINTS_JSON },
    });
    fireEvent.click(screen.getByRole('button', { name: /snap route/i }));

    await waitFor(() => {
      expect(screen.getByText(/LineString/)).toBeTruthy();
    });
  });

  test('shows OSRM-unavailable message on 503 error', async () => {
    const err = new Error('503 Service Unavailable');
    err.status = 503;
    routesApi.snapRoute.mockRejectedValue(err);

    render(<RouteSnapPanel />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: VALID_WAYPOINTS_JSON },
    });
    fireEvent.click(screen.getByRole('button', { name: /snap route/i }));

    await waitFor(() => {
      expect(screen.getByText(/OSRM unavailable/i)).toBeTruthy();
    });
  });

  test('shows generic error message on other errors', async () => {
    routesApi.snapRoute.mockRejectedValue(new Error('Network timeout'));

    render(<RouteSnapPanel />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: VALID_WAYPOINTS_JSON },
    });
    fireEvent.click(screen.getByRole('button', { name: /snap route/i }));

    await waitFor(() => {
      expect(screen.getByText(/Snap failed: Network timeout/)).toBeTruthy();
    });
  });

  test('shows JSON parse error when input is invalid JSON', async () => {
    render(<RouteSnapPanel />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'not valid json' },
    });
    fireEvent.click(screen.getByRole('button', { name: /snap route/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid JSON/i)).toBeTruthy();
    });
    expect(routesApi.snapRoute).not.toHaveBeenCalled();
  });

  test('calls onSnap callback with result on success', async () => {
    routesApi.snapRoute.mockResolvedValue(MOCK_RESULT);
    const onSnap = vi.fn();

    render(<RouteSnapPanel onSnap={onSnap} />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: VALID_WAYPOINTS_JSON },
    });
    fireEvent.click(screen.getByRole('button', { name: /snap route/i }));

    await waitFor(() => {
      expect(onSnap).toHaveBeenCalledWith(MOCK_RESULT);
    });
  });
});
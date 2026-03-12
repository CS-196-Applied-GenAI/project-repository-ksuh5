import { apiFetch } from './http.js';

/**
 * Calls POST /routes/snap.
 * Snaps a list of waypoints to the nearest roads using the backend
 * routing engine (OSRM/Valhalla).
 *
 * @param {Array<{ lat: number, lng: number }>} waypoints - at least 2 required
 * @returns {Promise<{ distanceKm: number, geometry: object, start: object, end: object }>}
 */
export async function snapRoute(waypoints) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    throw new Error('snapRoute requires at least 2 waypoints.');
  }

  const payload = {
    waypoints: waypoints.map(({ lat, lng }) => ({ lat, lng })),
  };

  const response = await apiFetch('/routes/snap', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    distanceKm: response.distance_km,
    geometry:   response.geometry,
    start:      response.start,
    end:        response.end,
  };
}
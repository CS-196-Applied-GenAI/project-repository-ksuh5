import { apiFetch } from './http.js';

/**
 * Persists the full app snapshot to the backend SQLite database.
 * @param {object} snapshot - plain JS object built by buildSnapshot()
 * @returns {Promise<void>}
 */
export async function saveState(snapshot) {
  await apiFetch('/state/save', {
    method: 'POST',
    body: JSON.stringify({ snapshot: { data: snapshot } }),
  });
}

/**
 * Loads the last saved snapshot from the backend SQLite database.
 * @returns {Promise<object|null>} snapshot.data, or null if none exists
 */
export async function loadState() {
  const response = await apiFetch('/state/load');
  return response?.snapshot?.data ?? null;
}
import { apiFetch } from './http';

/**
 * Calls GET /health on the backend.
 * @returns {Promise<{ status: string, version: string }>}
 */
export async function checkHealth() {
  return apiFetch('/health');
}
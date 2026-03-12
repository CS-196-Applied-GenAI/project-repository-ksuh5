import { BASE_URL } from './config';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;

  const headers = {
    ...(options.headers ?? {}),
  };

  if (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH') {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      message = body.detail ?? body.message ?? message;
    } catch {
      // ignore parse errors; use statusText as fallback
    }
    throw new ApiError(response.status, message);
  }

  return response.json();
}
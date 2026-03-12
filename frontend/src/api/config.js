// Base URL for the backend API.
// Set VITE_BACKEND_URL in your .env file to override for different environments.
export const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';
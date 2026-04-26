// Central API configuration
// NEXT_PUBLIC_API_URL is set via docker-compose environment variables
// In Docker: set to http://localhost:5000 (browser-side fetches go to host machine)
// In dev (no Docker): falls back to http://localhost:5000

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const API_BASE_URL = `${BACKEND_URL}/api`;

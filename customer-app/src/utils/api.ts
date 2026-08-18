/**
 * Sola Vacation Rentals — Customer API Utility Helper
 * Location: customer-app/src/utils/api.ts
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://sola-backend-api.essxm01.workers.dev/api/v1';

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

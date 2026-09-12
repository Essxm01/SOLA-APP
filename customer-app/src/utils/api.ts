/**
 * Sola Vacation Rentals — Customer API Utility Helper
 * Location: customer-app/src/utils/api.ts
 */

export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  // Local development / proxy fallback
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return '/api/v1';
  }
  // Cloudflare Pages previews, production, and non-local environments
  return 'https://sola-backend-api.essxm01.workers.dev/api/v1';
}

export function getApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (cleanPath.startsWith('/api/v1')) {
    const relative = cleanPath.replace('/api/v1', '');
    return `${baseUrl}${relative}`;
  }
  return `${baseUrl}${cleanPath}`;
}

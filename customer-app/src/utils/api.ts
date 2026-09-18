/**
 * Sola Vacation Rentals — Customer API Utility Helper
 * Location: customer-app/src/utils/api.ts
 */

export const CANONICAL_LIVE_WORKER_API_BASE = 'https://sola-backend-api.essxm01.workers.dev/api/v1';

export function resolveApiBaseUrl(envUrl?: string | null, hostname?: string | null): string {
  // Precedence 1: Explicit non-empty VITE_API_BASE_URL override
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // Precedence 2: Recognized Cloudflare Pages deployment host (*.pages.dev)
  if (hostname && (hostname === 'pages.dev' || hostname.endsWith('.pages.dev'))) {
    return CANONICAL_LIVE_WORKER_API_BASE;
  }

  // Precedence 3: Local and LAN development hosts (localhost, 127.0.0.1, 192.168.x.x, 10.x.x.x, .local, etc.)
  return '/api/v1';
}

export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : undefined;
  return resolveApiBaseUrl(envUrl, hostname);
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

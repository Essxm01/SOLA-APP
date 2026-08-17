/**
 * Sola Admin Portal — API Base URL Resolver
 * Location: src/utils/api.ts
 */

export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  // Default to live production API server URL when VITE_API_BASE_URL is not set
  return 'https://sola-backend-api.vercel.app/api/v1';
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

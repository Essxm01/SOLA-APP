/**
 * Sola Admin Portal — API Base URL Resolver
 * Location: src/utils/api.ts
 */

export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return '/api/v1';
}

export function getApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  if (cleanPath.startsWith('/api/v1')) {
    if (baseUrl === '/api/v1') return cleanPath;
    return `${baseUrl}${cleanPath.replace('/api/v1', '')}`;
  }
  
  return `${baseUrl}${cleanPath}`;
}

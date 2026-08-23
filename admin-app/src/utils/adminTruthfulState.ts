import { getApiUrl } from './api';

export interface CanonicalAdmin {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export type AdminBootstrapState = 'RESTORING' | 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'ERROR';

export type AdminSessionValidation =
  | { kind: 'valid'; admin: CanonicalAdmin }
  | { kind: 'invalid' }
  | { kind: 'error'; message: string };

export type CanonicalRequestResult<T> =
  | { kind: 'success'; data: T }
  | { kind: 'unauthorized' }
  | { kind: 'error'; message: string };

export type AdminFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function errorMessage(payload: any, fallback: string): string {
  return payload?.error?.message || fallback;
}

async function parseResponse(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function hasCanonicalAdminToken(token: string | null): token is string {
  return typeof token === 'string' && token.trim().length > 0;
}

export function shouldRenderAdminShell(state: AdminBootstrapState): boolean {
  return state === 'AUTHENTICATED';
}

export async function validateAdminSession(token: string | null, request: AdminFetch = fetch, resolveUrl: (path: string) => string = getApiUrl): Promise<AdminSessionValidation> {
  if (!hasCanonicalAdminToken(token)) return { kind: 'invalid' };

  let response: Response;
  try {
    response = await request(resolveUrl('/admin/auth/session'), {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return { kind: 'error', message: 'تعذر التحقق من جلسة الإدارة. تحقق من الاتصال ثم أعد المحاولة.' };
  }

  const payload = await parseResponse(response);
  if (response.status === 401 || response.status === 403) return { kind: 'invalid' };
  if (!response.ok || !payload?.success || !payload?.data?.admin) {
    return { kind: 'error', message: errorMessage(payload, 'تعذر التحقق من جلسة الإدارة. حاول مرة أخرى.') };
  }

  return { kind: 'valid', admin: payload.data.admin as CanonicalAdmin };
}

export async function fetchCanonicalAdminData<T>(path: string, token: string | null, request: AdminFetch = fetch, resolveUrl: (path: string) => string = getApiUrl): Promise<CanonicalRequestResult<T>> {
  if (!hasCanonicalAdminToken(token)) return { kind: 'unauthorized' };

  let response: Response;
  try {
    response = await request(resolveUrl(path), {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return { kind: 'error', message: 'تعذر تحميل البيانات التشغيلية. تحقق من الاتصال ثم أعد المحاولة.' };
  }

  const payload = await parseResponse(response);
  if (response.status === 401 || response.status === 403) return { kind: 'unauthorized' };
  if (!response.ok || !payload?.success) {
    return { kind: 'error', message: errorMessage(payload, 'تعذر تحميل البيانات التشغيلية. حاول مرة أخرى.') };
  }

  return { kind: 'success', data: payload.data as T };
}

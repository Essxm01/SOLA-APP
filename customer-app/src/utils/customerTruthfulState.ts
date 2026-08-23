import { getApiUrl } from './api';

export type CanonicalCollectionResult<T> =
  | { kind: 'success'; data: T[] }
  | { kind: 'unauthorized' }
  | { kind: 'error'; message: string };

export type CustomerFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function parseJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchCanonicalCollection<T>(
  path: string,
  init: RequestInit | undefined = undefined,
  request: CustomerFetch = fetch,
  resolveUrl: (path: string) => string = getApiUrl,
): Promise<CanonicalCollectionResult<T>> {
  let response: Response;
  try {
    response = await request(resolveUrl(path), init);
  } catch {
    return { kind: 'error', message: 'تعذر الاتصال بالخدمة. تحقق من اتصال الإنترنت وحاول مرة أخرى.' };
  }

  const payload = await parseJson(response);
  if (response.status === 401 || response.status === 403) return { kind: 'unauthorized' };
  if (!response.ok || !payload?.success || !Array.isArray(payload.data)) {
    return { kind: 'error', message: payload?.error?.message || 'تعذر تحميل البيانات حالياً. حاول مرة أخرى.' };
  }

  return { kind: 'success', data: payload.data as T[] };
}

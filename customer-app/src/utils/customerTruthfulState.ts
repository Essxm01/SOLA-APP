import { getApiUrl } from './api';

export type CanonicalCollectionResult<T> =
  | { kind: 'success'; data: T[] }
  | { kind: 'unauthorized' }
  | { kind: 'error'; message: string };

export type CanonicalDetailResult<T> =
  | { kind: 'success'; data: T }
  | { kind: 'unauthorized' }
  | { kind: 'error'; message: string };

export interface CustomerPropertyDetail {
  id: string;
  title: string;
  unitType: string;
  propertyType?: string | null;
  address: string;
  region?: string | null;
  resortName?: string | null;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  basePricePerNight: number;
  currency: 'EGP';
  images: string[];
  bedsCount?: number | null;
  areaSqM?: number | null;
  description?: string | null;
  amenities: string[];
  houseRules: Record<string, unknown>;
}

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

export async function fetchCanonicalPropertyDetail(
  propertyId: string,
  init: RequestInit | undefined = undefined,
  request: CustomerFetch = fetch,
  resolveUrl: (path: string) => string = getApiUrl,
): Promise<CanonicalDetailResult<CustomerPropertyDetail>> {
  if (!propertyId || typeof propertyId !== 'string' || propertyId.trim() === '') {
    return { kind: 'error', message: 'معرف الوحدة غير صالح' };
  }

  const encodedId = encodeURIComponent(propertyId.trim());
  let response: Response;
  try {
    response = await request(resolveUrl(`/customer/properties/${encodedId}`), init);
  } catch {
    return { kind: 'error', message: 'تعذر الاتصال بالخدمة. تحقق من اتصال الإنترنت وحاول مرة أخرى.' };
  }

  const payload = await parseJson(response);
  if (response.status === 401 || response.status === 403) return { kind: 'unauthorized' };
  if (!response.ok || !payload?.success || !payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
    return { kind: 'error', message: payload?.error?.message || 'تعذر تحميل بيانات الوحدة حالياً. حاول مرة أخرى.' };
  }

  const raw = payload.data;
  if (raw.id !== propertyId) {
    throw new Error(`CANONICAL_PROPERTY_ID_MISMATCH: Requested "${propertyId}" but server returned "${raw.id}"`);
  }

  const images: string[] = Array.isArray(raw.images)
    ? raw.images.map((img: any) => (typeof img === 'string' ? img : img?.fileUrl || '')).filter(Boolean)
    : [];

  const amenities: string[] = Array.isArray(raw.amenities)
    ? raw.amenities.map((a: any) => (typeof a === 'string' ? a : a?.name || a?.id || String(a))).filter(Boolean)
    : [];

  const detail: CustomerPropertyDetail = {
    id: raw.id,
    title: raw.title || '',
    unitType: raw.unitType || '',
    propertyType: raw.propertyType ?? null,
    address: raw.address || '',
    region: raw.region ?? null,
    resortName: raw.resortName ?? null,
    bedrooms: Number(raw.bedrooms) || 0,
    bathrooms: Number(raw.bathrooms) || 0,
    maxGuests: Number(raw.maxGuests) || 1,
    basePricePerNight: Number(raw.basePricePerNight) || 0,
    currency: 'EGP',
    images,
    bedsCount: raw.bedsCount !== undefined && raw.bedsCount !== null ? Number(raw.bedsCount) : null,
    areaSqM: raw.areaSqM !== undefined && raw.areaSqM !== null ? Number(raw.areaSqM) : null,
    description: typeof raw.description === 'string' ? raw.description : null,
    amenities,
    houseRules: raw.houseRules && typeof raw.houseRules === 'object' && !Array.isArray(raw.houseRules) ? raw.houseRules : {},
  };

  return { kind: 'success', data: detail };
}

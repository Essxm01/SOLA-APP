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

export function validateCustomerPropertyDetail(raw: any, expectedId?: string): CustomerPropertyDetail {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: raw detail must be a non-null object');
  }

  const id = raw.id;
  if (typeof id !== 'string' || id.trim() === '') {
    throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: id must be a non-empty string');
  }
  if (expectedId && id !== expectedId) {
    throw new Error(`CANONICAL_PROPERTY_ID_MISMATCH: Requested "${expectedId}" but server returned "${id}"`);
  }

  const title = raw.title;
  if (typeof title !== 'string' || title.trim() === '') {
    throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: title must be a non-empty string');
  }

  const unitType = raw.unitType;
  if (typeof unitType !== 'string' || unitType.trim() === '') {
    throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: unitType must be a non-empty string');
  }

  let propertyType: string | null = null;
  if (raw.propertyType !== undefined && raw.propertyType !== null) {
    if (typeof raw.propertyType !== 'string' || raw.propertyType.trim() === '') {
      throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: propertyType must be null, undefined, or a non-empty string');
    }
    propertyType = raw.propertyType.trim();
  }

  const address = raw.address;
  if (typeof address !== 'string') {
    throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: address must be a string');
  }

  let region: string | null = null;
  if (raw.region !== undefined && raw.region !== null) {
    if (typeof raw.region !== 'string') {
      throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: region must be null, undefined, or a string');
    }
    region = raw.region;
  }

  let resortName: string | null = null;
  if (raw.resortName !== undefined && raw.resortName !== null) {
    if (typeof raw.resortName !== 'string') {
      throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: resortName must be null, undefined, or a string');
    }
    resortName = raw.resortName;
  }

  if (raw.bedrooms === undefined || raw.bedrooms === null) {
    throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: bedrooms is required');
  }
  const bedrooms = Number(raw.bedrooms);
  if (!Number.isInteger(bedrooms) || bedrooms < 0) {
    throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: bedrooms must be a non-negative integer');
  }

  if (raw.bathrooms === undefined || raw.bathrooms === null) {
    throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: bathrooms is required');
  }
  const bathrooms = Number(raw.bathrooms);
  if (!Number.isInteger(bathrooms) || bathrooms < 0) {
    throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: bathrooms must be a non-negative integer');
  }

  if (raw.maxGuests === undefined || raw.maxGuests === null) {
    throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: maxGuests is required');
  }
  const maxGuests = Number(raw.maxGuests);
  if (!Number.isInteger(maxGuests) || maxGuests <= 0) {
    throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: maxGuests must be a positive integer');
  }

  const basePriceRaw = raw.basePricePerNight ?? raw.pricePerNight;
  if (basePriceRaw === undefined || basePriceRaw === null) {
    throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: basePricePerNight is required');
  }
  const basePricePerNight = Number(basePriceRaw);
  if (!Number.isFinite(basePricePerNight) || basePricePerNight <= 0) {
    throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: basePricePerNight must be a positive number');
  }

  if (raw.currency !== 'EGP') {
    throw new Error(`MALFORMED_CANONICAL_PROPERTY_DETAIL: currency is required and must be "EGP", received "${raw.currency}"`);
  }
  const currency: 'EGP' = 'EGP';

  if (!Array.isArray(raw.images)) {
    throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: images must be an array');
  }
  const images: string[] = raw.images.map((img: any, idx: number) => {
    const url = typeof img === 'string' ? img : img?.fileUrl;
    if (typeof url !== 'string' || url.trim() === '') {
      throw new Error(`MALFORMED_CANONICAL_PROPERTY_DETAIL: image at index ${idx} must be a non-empty string`);
    }
    return url.trim();
  });

  let bedsCount: number | null = null;
  if (raw.bedsCount !== undefined && raw.bedsCount !== null) {
    const num = Number(raw.bedsCount);
    if (!Number.isInteger(num) || num < 0) {
      throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: bedsCount must be a non-negative integer or null');
    }
    bedsCount = num;
  }

  let areaSqM: number | null = null;
  if (raw.areaSqM !== undefined && raw.areaSqM !== null) {
    const num = Number(raw.areaSqM);
    if (!Number.isFinite(num) || num < 0) {
      throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: areaSqM must be a non-negative number or null');
    }
    areaSqM = num;
  }

  let description: string | null = null;
  if (raw.description !== undefined && raw.description !== null) {
    if (typeof raw.description !== 'string') {
      throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: description must be null, undefined, or a string');
    }
    description = raw.description;
  }

  if (!Array.isArray(raw.amenities)) {
    throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: amenities must be an array');
  }
  const amenities: string[] = raw.amenities.map((a: any, idx: number) => {
    if (typeof a === 'string') {
      if (a.trim() === '') throw new Error(`MALFORMED_CANONICAL_PROPERTY_DETAIL: amenity at index ${idx} cannot be empty string`);
      return a.trim();
    }
    if (a && typeof a === 'object' && typeof a.id === 'string' && a.id.trim() !== '') {
      return a.id.trim();
    }
    if (a && typeof a === 'object' && typeof a.name === 'string' && a.name.trim() !== '') {
      return a.name.trim();
    }
    throw new Error(`MALFORMED_CANONICAL_PROPERTY_DETAIL: amenity at index ${idx} must be a non-empty string`);
  });

  if (raw.houseRules === undefined || raw.houseRules === null || typeof raw.houseRules !== 'object' || Array.isArray(raw.houseRules)) {
    throw new Error('MALFORMED_CANONICAL_PROPERTY_DETAIL: houseRules is required and must be a non-array object');
  }
  const houseRules: Record<string, unknown> = raw.houseRules;

  return {
    id,
    title: title.trim(),
    unitType: unitType.trim(),
    propertyType,
    address,
    region,
    resortName,
    bedrooms,
    bathrooms,
    maxGuests,
    basePricePerNight,
    currency,
    images,
    bedsCount,
    areaSqM,
    description,
    amenities,
    houseRules,
  };
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

  const detail = validateCustomerPropertyDetail(payload.data, propertyId);
  return { kind: 'success', data: detail };
}

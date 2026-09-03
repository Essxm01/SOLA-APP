import { getApiUrl } from './api';

export interface CustomerFavoriteItem {
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
  currency: string;
  images: string[];
}

export type CustomerFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type GetUrlFn = (path: string) => string;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateFavoriteItem(item: any): CustomerFavoriteItem {
  if (!item || typeof item !== 'object') throw new Error('ITEM_NOT_OBJECT');
  if (typeof item.id !== 'string' || !UUID_REGEX.test(item.id)) throw new Error('INVALID_ID');
  if (typeof item.title !== 'string' || item.title.trim() === '') throw new Error('INVALID_TITLE');
  if (typeof item.unitType !== 'string' || item.unitType.trim() === '') throw new Error('INVALID_UNIT_TYPE');
  if (typeof item.address !== 'string' || item.address.trim() === '') throw new Error('INVALID_ADDRESS');
  if (typeof item.bedrooms !== 'number' || !Number.isInteger(item.bedrooms) || item.bedrooms < 0) throw new Error('INVALID_BEDROOMS');
  if (typeof item.bathrooms !== 'number' || !Number.isInteger(item.bathrooms) || item.bathrooms < 0) throw new Error('INVALID_BATHROOMS');
  if (typeof item.maxGuests !== 'number' || !Number.isInteger(item.maxGuests) || item.maxGuests <= 0) throw new Error('INVALID_MAX_GUESTS');
  if (typeof item.basePricePerNight !== 'number' || !Number.isFinite(item.basePricePerNight) || item.basePricePerNight <= 0) throw new Error('INVALID_BASE_PRICE');
  if (item.currency !== 'EGP') throw new Error('INVALID_CURRENCY');
  if (!Array.isArray(item.images)) throw new Error('INVALID_IMAGES');
  for (const img of item.images) {
    if (typeof img !== 'string' || img.trim() === '') throw new Error('INVALID_IMAGE_ENTRY');
  }

  return {
    id: item.id,
    title: item.title.trim(),
    unitType: item.unitType.trim(),
    propertyType: typeof item.propertyType === 'string' ? item.propertyType.trim() : (item.propertyType === null ? null : undefined),
    address: item.address.trim(),
    region: typeof item.region === 'string' ? item.region.trim() : (item.region === null ? null : undefined),
    resortName: typeof item.resortName === 'string' ? item.resortName.trim() : (item.resortName === null ? null : undefined),
    bedrooms: item.bedrooms,
    bathrooms: item.bathrooms,
    maxGuests: item.maxGuests,
    basePricePerNight: item.basePricePerNight,
    currency: 'EGP',
    images: item.images.map((s: string) => s.trim()),
  };
}

export async function fetchCustomerFavorites(
  token: string,
  fetchFn: CustomerFetch = fetch,
  getUrl: GetUrlFn = getApiUrl
): Promise<CustomerFavoriteItem[]> {
  if (!token) throw new Error('CUSTOMER_TOKEN_REQUIRED');
  let res: Response;
  try {
    res = await fetchFn(getUrl('/customer/favorites'), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err: any) {
    throw new Error(`FETCH_CUSTOMER_FAVORITES_NETWORK_ERROR: ${err?.message || String(err)}`);
  }
  if (!res.ok) {
    throw new Error(`FETCH_CUSTOMER_FAVORITES_FAILED: HTTP ${res.status}`);
  }
  const json = await res.json().catch(() => null);
  if (!json || !json.success || !Array.isArray(json.data)) {
    throw new Error('FETCH_CUSTOMER_FAVORITES_MALFORMED');
  }
  try {
    return json.data.map(validateFavoriteItem);
  } catch {
    throw new Error('FETCH_CUSTOMER_FAVORITES_MALFORMED');
  }
}

export async function addCustomerFavorite(
  token: string,
  propertyId: string,
  fetchFn: CustomerFetch = fetch,
  getUrl: GetUrlFn = getApiUrl
): Promise<{ propertyId: string; isFavorite: boolean }> {
  if (!token) throw new Error('CUSTOMER_TOKEN_REQUIRED');
  if (!propertyId) throw new Error('PROPERTY_ID_REQUIRED');
  let res: Response;
  try {
    res = await fetchFn(getUrl(`/customer/favorites/${propertyId}`), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err: any) {
    throw new Error(`ADD_CUSTOMER_FAVORITE_NETWORK_ERROR: ${err?.message || String(err)}`);
  }
  if (!res.ok) {
    throw new Error(`ADD_CUSTOMER_FAVORITE_FAILED: HTTP ${res.status}`);
  }
  const json = await res.json().catch(() => null);
  if (!json || !json.success || !json.data || json.data.propertyId !== propertyId || json.data.isFavorite !== true) {
    throw new Error('ADD_CUSTOMER_FAVORITE_MALFORMED');
  }
  return json.data;
}

export async function removeCustomerFavorite(
  token: string,
  propertyId: string,
  fetchFn: CustomerFetch = fetch,
  getUrl: GetUrlFn = getApiUrl
): Promise<{ propertyId: string; isFavorite: boolean }> {
  if (!token) throw new Error('CUSTOMER_TOKEN_REQUIRED');
  if (!propertyId) throw new Error('PROPERTY_ID_REQUIRED');
  let res: Response;
  try {
    res = await fetchFn(getUrl(`/customer/favorites/${propertyId}`), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err: any) {
    throw new Error(`REMOVE_CUSTOMER_FAVORITE_NETWORK_ERROR: ${err?.message || String(err)}`);
  }
  if (!res.ok) {
    throw new Error(`REMOVE_CUSTOMER_FAVORITE_FAILED: HTTP ${res.status}`);
  }
  const json = await res.json().catch(() => null);
  if (!json || !json.success || !json.data || json.data.propertyId !== propertyId || json.data.isFavorite !== false) {
    throw new Error('REMOVE_CUSTOMER_FAVORITE_MALFORMED');
  }
  return json.data;
}

export function mergeCustomerProfile(canonicalData: any) {
  if (!canonicalData || typeof canonicalData !== 'object') {
    throw new Error('INVALID_CANONICAL_PROFILE');
  }
  if (typeof canonicalData.id !== 'string' || canonicalData.id.trim() === '') {
    throw new Error('INVALID_CANONICAL_PROFILE: missing id');
  }
  if (typeof canonicalData.phoneNumber !== 'string' || canonicalData.phoneNumber.trim() === '') {
    throw new Error('INVALID_CANONICAL_PROFILE: missing phoneNumber');
  }
  if (typeof canonicalData.status !== 'string' || canonicalData.status.trim() === '') {
    throw new Error('INVALID_CANONICAL_PROFILE: missing status');
  }
  if (typeof canonicalData.createdAt !== 'string' || canonicalData.createdAt.trim() === '') {
    throw new Error('INVALID_CANONICAL_PROFILE: missing createdAt');
  }
  if (typeof canonicalData.updatedAt !== 'string' || canonicalData.updatedAt.trim() === '') {
    throw new Error('INVALID_CANONICAL_PROFILE: missing updatedAt');
  }

  return {
    id: canonicalData.id.trim(),
    phoneNumber: canonicalData.phoneNumber.trim(),
    fullName: typeof canonicalData.fullName === 'string' && canonicalData.fullName.trim() !== '' ? canonicalData.fullName.trim() : null,
    email: typeof canonicalData.email === 'string' && canonicalData.email.trim() !== '' ? canonicalData.email.trim() : null,
    avatarUrl: typeof canonicalData.avatarUrl === 'string' && canonicalData.avatarUrl.trim() !== '' ? canonicalData.avatarUrl.trim() : null,
    phoneVerifiedAt: typeof canonicalData.phoneVerifiedAt === 'string' && canonicalData.phoneVerifiedAt.trim() !== '' ? canonicalData.phoneVerifiedAt.trim() : null,
    status: canonicalData.status.trim(),
    createdAt: canonicalData.createdAt.trim(),
    updatedAt: canonicalData.updatedAt.trim(),
  };
}

export async function fetchCustomerAccountSummary(
  token: string,
  fetchFn: CustomerFetch = fetch,
  getUrl: GetUrlFn = getApiUrl
) {
  if (!token) throw new Error('CUSTOMER_TOKEN_REQUIRED');
  let res: Response;
  try {
    res = await fetchFn(getUrl('/customer/account/summary'), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err: any) {
    throw new Error(`FETCH_ACCOUNT_SUMMARY_NETWORK_ERROR: ${err?.message || String(err)}`);
  }
  if (!res.ok) {
    throw new Error(`FETCH_ACCOUNT_SUMMARY_FAILED: HTTP ${res.status}`);
  }
  const json = await res.json().catch(() => null);
  if (!json || !json.success || !json.data || typeof json.data !== 'object') {
    throw new Error('FETCH_ACCOUNT_SUMMARY_MALFORMED');
  }
  const d = json.data;
  if (
    typeof d.confirmedBookingsCount !== 'number' || !Number.isInteger(d.confirmedBookingsCount) || d.confirmedBookingsCount < 0 ||
    typeof d.upcomingStaysCount !== 'number' || !Number.isInteger(d.upcomingStaysCount) || d.upcomingStaysCount < 0 ||
    typeof d.totalBookingsCount !== 'number' || !Number.isInteger(d.totalBookingsCount) || d.totalBookingsCount < 0 ||
    typeof d.totalDepositsPaidEgp !== 'number' || !Number.isFinite(d.totalDepositsPaidEgp) || d.totalDepositsPaidEgp < 0
  ) {
    throw new Error('FETCH_ACCOUNT_SUMMARY_MALFORMED: Invalid metrics values');
  }
  return {
    confirmedBookingsCount: d.confirmedBookingsCount,
    upcomingStaysCount: d.upcomingStaysCount,
    totalBookingsCount: d.totalBookingsCount,
    totalDepositsPaidEgp: d.totalDepositsPaidEgp,
  };
}


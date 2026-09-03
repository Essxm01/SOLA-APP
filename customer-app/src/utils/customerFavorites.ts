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
  return json.data;
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
  if (!json || !json.success || !json.data || json.data.isFavorite !== true) {
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
  if (!json || !json.success || !json.data || json.data.isFavorite !== false) {
    throw new Error('REMOVE_CUSTOMER_FAVORITE_MALFORMED');
  }
  return json.data;
}

export function mergeCustomerProfile(canonicalData: any) {
  if (!canonicalData || typeof canonicalData !== 'object') {
    throw new Error('INVALID_CANONICAL_PROFILE');
  }
  return {
    id: canonicalData.id,
    phoneNumber: canonicalData.phoneNumber,
    fullName: canonicalData.fullName ?? null,
    email: canonicalData.email ?? null,
    avatarUrl: canonicalData.avatarUrl ?? null,
    status: canonicalData.status || 'ACTIVE',
    createdAt: canonicalData.createdAt,
    updatedAt: canonicalData.updatedAt,
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
  if (!json || !json.success || !json.data) {
    throw new Error('FETCH_ACCOUNT_SUMMARY_MALFORMED');
  }
  return json.data;
}


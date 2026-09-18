export interface PublicPropertySearchInputFilters {
  destination?: string;
  destinations?: string[];
  unitType?: string;
  unitTypes?: string[];
  totalGuests?: number;
  maxPrice?: number;
}

export function buildPublicPropertySearchPath(filters?: PublicPropertySearchInputFilters): string {
  const basePath = '/customer/properties/search';
  if (!filters) {
    return basePath;
  }

  const params = new URLSearchParams();

  // Multi-destination support with fallback to single destination
  if (Array.isArray(filters.destinations) && filters.destinations.length > 0) {
    for (const d of filters.destinations) {
      if (d !== undefined && d !== null) {
        const trimmed = String(d).trim();
        if (trimmed !== '') {
          params.append('destination', trimmed);
        }
      }
    }
  } else if (filters.destination !== undefined && filters.destination !== null) {
    const trimmed = String(filters.destination).trim();
    if (trimmed !== '') {
      params.append('destination', trimmed);
    }
  }

  // Multi-unitType support with fallback to single unitType
  if (Array.isArray(filters.unitTypes) && filters.unitTypes.length > 0) {
    for (const t of filters.unitTypes) {
      if (t !== undefined && t !== null) {
        const trimmed = String(t).trim().toUpperCase();
        if (trimmed !== '' && trimmed !== 'ALL') {
          params.append('unitType', trimmed);
        }
      }
    }
  } else if (filters.unitType !== undefined && filters.unitType !== null) {
    const trimmed = String(filters.unitType).trim().toUpperCase();
    if (trimmed !== '' && trimmed !== 'ALL') {
      params.append('unitType', trimmed);
    }
  }

  if (filters.totalGuests !== undefined && filters.totalGuests !== null) {
    const guestsNum = Number(filters.totalGuests);
    if (!Number.isInteger(guestsNum) || guestsNum <= 0) {
      throw new Error(`INVALID_SEARCH_FILTER: totalGuests must be a positive integer, received "${filters.totalGuests}"`);
    }
    params.set('guests', String(guestsNum));
  }

  if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
    const priceNum = Number(filters.maxPrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      throw new Error(`INVALID_SEARCH_FILTER: maxPrice must be a positive number, received "${filters.maxPrice}"`);
    }
    params.set('maxPrice', String(priceNum));
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

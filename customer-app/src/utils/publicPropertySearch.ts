export interface PublicPropertySearchInputFilters {
  destination?: string;
  unitType?: string;
  totalGuests?: number;
  maxPrice?: number;
}

export function buildPublicPropertySearchPath(filters?: PublicPropertySearchInputFilters): string {
  const basePath = '/customer/properties/search';
  if (!filters) {
    return basePath;
  }

  const params = new URLSearchParams();

  if (filters.destination) {
    const trimmed = filters.destination.trim();
    if (trimmed !== '') {
      params.set('destination', trimmed);
    }
  }

  if (filters.unitType) {
    const trimmed = filters.unitType.trim().toUpperCase();
    if (trimmed !== '' && trimmed !== 'ALL') {
      params.set('unitType', trimmed);
    }
  }

  if (filters.totalGuests !== undefined) {
    const guestsNum = Number(filters.totalGuests);
    if (Number.isInteger(guestsNum) && guestsNum > 0) {
      params.set('guests', String(guestsNum));
    }
  }

  if (filters.maxPrice !== undefined) {
    const priceNum = Number(filters.maxPrice);
    if (Number.isFinite(priceNum) && priceNum > 0) {
      params.set('maxPrice', String(priceNum));
    }
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

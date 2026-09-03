export interface PublicPropertySearchFilters {
  destination?: string;
  unitType?: string;
  guests?: number;
  maxPrice?: number;
}

export interface PublicPropertySearchItem {
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
}

export interface PublicPropertyDetail extends PublicPropertySearchItem {
  bedsCount?: number | null;
  areaSqM?: number | null;
  description?: string | null;
  amenities: unknown[];
  houseRules: Record<string, unknown>;
}

export function parsePublicPropertySearchFilters(
  searchParams?: URLSearchParams | null
): PublicPropertySearchFilters {
  if (!searchParams) {
    return {};
  }

  const filters: PublicPropertySearchFilters = {};

  const destinationRaw = searchParams.get('destination');
  if (destinationRaw !== null) {
    const trimmed = destinationRaw.trim();
    if (trimmed !== '') {
      filters.destination = trimmed;
    }
  }

  const unitTypeRaw = searchParams.get('unitType');
  if (unitTypeRaw !== null) {
    const trimmed = unitTypeRaw.trim();
    if (trimmed !== '') {
      filters.unitType = trimmed.toUpperCase();
    }
  }

  const guestsRaw = searchParams.get('guests');
  if (guestsRaw !== null) {
    const trimmed = guestsRaw.trim();
    if (trimmed !== '') {
      const num = Number(trimmed);
      if (!Number.isInteger(num) || num <= 0) {
        throw new Error(`INVALID_PUBLIC_SEARCH_FILTER: guests must be a positive integer, received "${guestsRaw}"`);
      }
      filters.guests = num;
    }
  }

  const maxPriceRaw = searchParams.get('maxPrice');
  if (maxPriceRaw !== null) {
    const trimmed = maxPriceRaw.trim();
    if (trimmed !== '') {
      const num = Number(trimmed);
      if (!Number.isFinite(num) || num <= 0) {
        throw new Error(`INVALID_PUBLIC_SEARCH_FILTER: maxPrice must be a positive number, received "${maxPriceRaw}"`);
      }
      filters.maxPrice = num;
    }
  }

  return filters;
}

function validateImages(images: unknown): string[] {
  if (!Array.isArray(images)) {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: images must be an array');
  }
  for (const img of images) {
    if (typeof img !== 'string' || img.trim() === '') {
      throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: images must contain non-empty strings only');
    }
  }
  return images;
}

export function toPublicPropertySearchItem(raw: any, images: string[]): PublicPropertySearchItem {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: raw property row must be a non-null object');
  }

  const validatedImages = validateImages(images);

  const id = raw.id;
  if (typeof id !== 'string' || id.trim() === '') {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: id must be a non-empty string');
  }

  const title = raw.title;
  if (typeof title !== 'string' || title.trim() === '') {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: title must be a non-empty string');
  }

  const unitType = raw.unitType ?? raw.unit_type;
  if (typeof unitType !== 'string' || unitType.trim() === '') {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: unitType must be a non-empty string');
  }

  const propertyTypeRaw = raw.propertyType ?? raw.property_type;
  const propertyType = propertyTypeRaw !== undefined && propertyTypeRaw !== null ? String(propertyTypeRaw) : null;

  const address = raw.address;
  if (typeof address !== 'string' || address.trim() === '') {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: address must be a non-empty string');
  }

  const regionRaw = raw.region;
  const region = regionRaw !== undefined && regionRaw !== null ? String(regionRaw) : null;

  const resortNameRaw = raw.resortName ?? raw.resort_name;
  const resortName = resortNameRaw !== undefined && resortNameRaw !== null ? String(resortNameRaw) : null;

  const bedroomsNum = Number(raw.bedrooms);
  if (!Number.isInteger(bedroomsNum) || bedroomsNum < 0) {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: bedrooms must be a non-negative integer');
  }

  const bathroomsNum = Number(raw.bathrooms);
  if (!Number.isInteger(bathroomsNum) || bathroomsNum < 0) {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: bathrooms must be a non-negative integer');
  }

  const maxGuestsNum = Number(raw.maxGuests ?? raw.max_guests);
  if (!Number.isInteger(maxGuestsNum) || maxGuestsNum <= 0) {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: maxGuests must be a positive integer');
  }

  const basePriceNum = Number(raw.basePricePerNight ?? raw.base_price_per_night);
  if (!Number.isFinite(basePriceNum) || basePriceNum <= 0) {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: basePricePerNight must be a positive number');
  }

  return {
    id,
    title,
    unitType,
    propertyType,
    address,
    region,
    resortName,
    bedrooms: bedroomsNum,
    bathrooms: bathroomsNum,
    maxGuests: maxGuestsNum,
    basePricePerNight: basePriceNum,
    currency: 'EGP',
    images: validatedImages,
  };
}

export function toPublicPropertyDetail(raw: any, images: string[]): PublicPropertyDetail {
  const searchItem = toPublicPropertySearchItem(raw, images);

  const bedsCountRaw = raw.bedsCount ?? raw.beds_count;
  let bedsCount: number | null = null;
  if (bedsCountRaw !== undefined && bedsCountRaw !== null) {
    const num = Number(bedsCountRaw);
    if (!Number.isInteger(num) || num < 0) {
      throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: bedsCount must be a non-negative integer or null');
    }
    bedsCount = num;
  }

  const areaSqMRaw = raw.areaSqM ?? raw.area_sq_m;
  let areaSqM: number | null = null;
  if (areaSqMRaw !== undefined && areaSqMRaw !== null) {
    const num = Number(areaSqMRaw);
    if (!Number.isFinite(num) || num < 0) {
      throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: areaSqM must be a non-negative number or null');
    }
    areaSqM = num;
  }

  const descriptionRaw = raw.description;
  const description = descriptionRaw !== undefined && descriptionRaw !== null ? String(descriptionRaw) : null;

  const amenitiesRaw = raw.amenities;
  let amenities: unknown[] = [];
  if (amenitiesRaw !== undefined && amenitiesRaw !== null) {
    if (!Array.isArray(amenitiesRaw)) {
      throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: amenities must be an array');
    }
    amenities = amenitiesRaw;
  }

  const houseRulesRaw = raw.houseRules ?? raw.house_rules;
  let houseRules: Record<string, unknown> = {};
  if (houseRulesRaw !== undefined && houseRulesRaw !== null) {
    if (typeof houseRulesRaw !== 'object' || Array.isArray(houseRulesRaw)) {
      throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: houseRules must be an object');
    }
    houseRules = houseRulesRaw as Record<string, unknown>;
  }

  return {
    ...searchItem,
    bedsCount,
    areaSqM,
    description,
    amenities,
    houseRules,
  };
}

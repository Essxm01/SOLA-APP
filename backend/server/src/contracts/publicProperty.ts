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

export interface PublicPropertyBaseRow {
  id: string;
  title: string;
  unitType: string;
  propertyType: string | null;
  address: string;
  region: string | null;
  resortName: string | null;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  basePricePerNight: number;
}

export function validatePublicPropertyBaseRow(raw: any): PublicPropertyBaseRow {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: raw property row must be a non-null object');
  }

  const id = raw.id;
  if (typeof id !== 'string' || id.trim() === '') {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: id must be a non-empty string');
  }

  const title = raw.title;
  if (typeof title !== 'string' || title.trim() === '') {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: title must be a non-empty string');
  }

  const unitTypeRaw = raw.unitType ?? raw.unit_type;
  if (typeof unitTypeRaw !== 'string' || unitTypeRaw.trim() === '') {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: unitType must be a non-empty string');
  }
  const unitType = unitTypeRaw.trim();

  const propertyTypeRaw = raw.propertyType ?? raw.property_type;
  let propertyType: string | null = null;
  if (propertyTypeRaw !== undefined && propertyTypeRaw !== null) {
    if (typeof propertyTypeRaw !== 'string' || propertyTypeRaw.trim() === '') {
      throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: propertyType must be null, undefined, or a non-empty string');
    }
    propertyType = propertyTypeRaw.trim();
  }

  const address = raw.address;
  if (typeof address !== 'string' || address.trim() === '') {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: address must be a non-empty string');
  }

  const regionRaw = raw.region;
  let region: string | null = null;
  if (regionRaw !== undefined && regionRaw !== null) {
    if (typeof regionRaw !== 'string') {
      throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: region must be null, undefined, or a string');
    }
    region = regionRaw;
  }

  const resortNameRaw = raw.resortName ?? raw.resort_name;
  let resortName: string | null = null;
  if (resortNameRaw !== undefined && resortNameRaw !== null) {
    if (typeof resortNameRaw !== 'string') {
      throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: resortName must be null, undefined, or a string');
    }
    resortName = resortNameRaw;
  }

  if (raw.bedrooms === undefined || raw.bedrooms === null) {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: bedrooms must be a non-negative integer');
  }
  const bedroomsNum = Number(raw.bedrooms);
  if (!Number.isInteger(bedroomsNum) || bedroomsNum < 0) {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: bedrooms must be a non-negative integer');
  }

  if (raw.bathrooms === undefined || raw.bathrooms === null) {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: bathrooms must be a non-negative integer');
  }
  const bathroomsNum = Number(raw.bathrooms);
  if (!Number.isInteger(bathroomsNum) || bathroomsNum < 0) {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: bathrooms must be a non-negative integer');
  }

  const maxGuestsRaw = raw.maxGuests ?? raw.max_guests;
  if (maxGuestsRaw === undefined || maxGuestsRaw === null) {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: maxGuests must be a positive integer');
  }
  const maxGuestsNum = Number(maxGuestsRaw);
  if (!Number.isInteger(maxGuestsNum) || maxGuestsNum <= 0) {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: maxGuests must be a positive integer');
  }

  const basePriceRaw = raw.basePricePerNight ?? raw.base_price_per_night ?? raw.pricePerNight ?? raw.price_per_night;
  if (basePriceRaw === undefined || basePriceRaw === null) {
    throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: basePricePerNight must be a positive number');
  }
  const basePriceNum = Number(basePriceRaw);
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
  };
}

export function extractPublicImageUrls(images: unknown): string[] {
  if (!Array.isArray(images)) {
    throw new Error('MALFORMED_PUBLIC_MEDIA_DATA: images must be an array');
  }
  return images.map((img, idx) => {
    if (!img || typeof img !== 'object') {
      throw new Error(`MALFORMED_PUBLIC_MEDIA_DATA: image at index ${idx} must be an object`);
    }
    const url = img.fileUrl ?? img.file_url;
    if (typeof url !== 'string' || url.trim() === '') {
      throw new Error(`MALFORMED_PUBLIC_MEDIA_DATA: image at index ${idx} must contain a non-empty fileUrl string`);
    }
    return url;
  });
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
  const baseRow = validatePublicPropertyBaseRow(raw);
  const validatedImages = validateImages(images);

  return {
    ...baseRow,
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
  let description: string | null = null;
  if (descriptionRaw !== undefined && descriptionRaw !== null) {
    if (typeof descriptionRaw !== 'string') {
      throw new Error('MALFORMED_PUBLIC_PROPERTY_DATA: description must be null, undefined, or a string');
    }
    description = descriptionRaw;
  }

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

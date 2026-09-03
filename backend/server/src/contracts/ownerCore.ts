/**
 * P2.3 Owner Core Contracts & DTOs
 * Location: backend/server/src/contracts/ownerCore.ts
 */

export interface OwnerProfileDto {
  id: string;
  phoneNumber: string;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  status: string;
  verificationStatus: string;
  ownerOnboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toOwnerProfileDto(raw: unknown): OwnerProfileDto {
  const row = raw as Record<string, unknown>;
  if (!row || typeof row !== 'object') throw new Error('MALFORMED_OWNER_PROFILE');
  if (typeof row.id !== 'string' || row.id.trim() === '' || typeof row.phoneNumber !== 'string' || row.phoneNumber.trim() === '') {
    throw new Error('MALFORMED_OWNER_PROFILE: missing or invalid id/phoneNumber');
  }
  if (row.status !== undefined && (typeof row.status !== 'string' || row.status.trim() === '')) {
    throw new Error('MALFORMED_OWNER_PROFILE: invalid status');
  }
  if (row.verificationStatus !== undefined && (typeof row.verificationStatus !== 'string' || row.verificationStatus.trim() === '')) {
    throw new Error('MALFORMED_OWNER_PROFILE: invalid verificationStatus');
  }
  if (row.createdAt !== undefined && (typeof row.createdAt !== 'string' || row.createdAt.trim() === '')) {
    throw new Error('MALFORMED_OWNER_PROFILE: invalid createdAt');
  }
  if (row.updatedAt !== undefined && (typeof row.updatedAt !== 'string' || row.updatedAt.trim() === '')) {
    throw new Error('MALFORMED_OWNER_PROFILE: invalid updatedAt');
  }

  const nowIso = new Date().toISOString();
  return {
    id: row.id as string,
    phoneNumber: row.phoneNumber as string,
    fullName: typeof row.fullName === 'string' ? row.fullName : null,
    email: typeof row.email === 'string' ? row.email : null,
    avatarUrl: typeof row.avatarUrl === 'string' ? row.avatarUrl : null,
    status: (row.status as string) || 'ACTIVE',
    verificationStatus: (row.verificationStatus as string) || 'UNVERIFIED',
    ownerOnboardingCompletedAt: typeof row.ownerOnboardingCompletedAt === 'string' ? row.ownerOnboardingCompletedAt : null,
    createdAt: (row.createdAt as string) || (row.created_at as string) || nowIso,
    updatedAt: (row.updatedAt as string) || (row.updated_at as string) || nowIso,
  };
}

export interface OwnerPropertyDto {
  id: string;
  ownerId: string;
  title: string;
  unitType: string;
  propertyType: string;
  description: string | null;
  region: string | null;
  resortName: string | null;
  locationName: string;
  address: string;
  location: {
    governorate: string;
    city: string;
    district: string;
    address: string;
  };
  capacity: {
    baseGuests: number;
    maxGuests: number;
    bedrooms: number;
    beds: number;
    bathrooms: number;
  };
  images: string[];
  pricePerNight: number;
  basePricePerNight: number;
  currency: 'EGP';
  pricing: {
    basePricePerNight: number;
    currency: 'EGP';
  };
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  areaSqM: number | null;
  bedsCount: number | null;
  amenities: string[];
  houseRules: Record<string, unknown>;
  status: string;
  verificationStatus: string;
  createdAt: string;
  updatedAt: string;
}

export function toOwnerPropertyDto(raw: unknown): OwnerPropertyDto {
  const row = raw as Record<string, unknown>;
  if (!row || typeof row !== 'object') throw new Error('MALFORMED_OWNER_PROPERTY');
  if (typeof row.id !== 'string' || row.id.trim() === '' || typeof row.ownerId !== 'string' || row.ownerId.trim() === '') {
    throw new Error('MALFORMED_OWNER_PROPERTY: missing id or ownerId');
  }
  if (typeof row.title !== 'string' || row.title.trim() === '') {
    throw new Error('MALFORMED_OWNER_PROPERTY: missing title');
  }
  if (typeof row.unitType !== 'string' || typeof row.propertyType !== 'string') {
    throw new Error('MALFORMED_OWNER_PROPERTY: missing unitType or propertyType');
  }
  if (typeof row.status !== 'string' || typeof row.verificationStatus !== 'string') {
    throw new Error('MALFORMED_OWNER_PROPERTY: missing status or verificationStatus');
  }
  if (typeof row.address !== 'string') {
    throw new Error('MALFORMED_OWNER_PROPERTY: address must be a string');
  }
  const address = row.address.trim(); // empty string is valid product state

  const price = typeof row.pricePerNight === 'number' && Number.isFinite(row.pricePerNight)
    ? row.pricePerNight
    : (typeof row.basePricePerNight === 'number' && Number.isFinite(row.basePricePerNight) ? row.basePricePerNight : null);

  if (price === null || price <= 0) {
    throw new Error('MALFORMED_OWNER_PROPERTY: invalid pricePerNight');
  }
  if (typeof row.bedrooms !== 'number' || !Number.isFinite(row.bedrooms) || row.bedrooms < 0) {
    throw new Error('MALFORMED_OWNER_PROPERTY: invalid bedrooms');
  }
  if (typeof row.bathrooms !== 'number' || !Number.isFinite(row.bathrooms) || row.bathrooms < 0) {
    throw new Error('MALFORMED_OWNER_PROPERTY: invalid bathrooms');
  }
  if (typeof row.maxGuests !== 'number' || !Number.isFinite(row.maxGuests) || row.maxGuests <= 0) {
    throw new Error('MALFORMED_OWNER_PROPERTY: invalid maxGuests');
  }

  const nowIso = new Date().toISOString();
  const createdAt = (row.createdAt as string) || (row.created_at as string) || nowIso;
  const updatedAt = (row.updatedAt as string) || (row.updated_at as string) || nowIso;

  const basePricePerNight = typeof row.basePricePerNight === 'number' && Number.isFinite(row.basePricePerNight)
    ? row.basePricePerNight
    : price;

  const images = Array.isArray(row.images) ? (row.images.filter((img): img is string => typeof img === 'string')) : [];

  const location = row.location && typeof row.location === 'object'
    ? {
        governorate: typeof (row.location as any).governorate === 'string' ? (row.location as any).governorate : '',
        city: typeof (row.location as any).city === 'string' ? (row.location as any).city : (row.region as string) || '',
        district: typeof (row.location as any).district === 'string' ? (row.location as any).district : (row.resortName as string) || '',
        address: typeof (row.location as any).address === 'string' ? (row.location as any).address : address,
      }
    : {
        governorate: '',
        city: (row.region as string) || '',
        district: (row.resortName as string) || '',
        address,
      };

  const capacity = row.capacity && typeof row.capacity === 'object'
    ? {
        baseGuests: typeof (row.capacity as any).baseGuests === 'number' ? (row.capacity as any).baseGuests : row.maxGuests,
        maxGuests: typeof (row.capacity as any).maxGuests === 'number' ? (row.capacity as any).maxGuests : row.maxGuests,
        bedrooms: typeof (row.capacity as any).bedrooms === 'number' ? (row.capacity as any).bedrooms : row.bedrooms,
        beds: typeof (row.capacity as any).beds === 'number' ? (row.capacity as any).beds : ((row.bedsCount as number) || row.bedrooms),
        bathrooms: typeof (row.capacity as any).bathrooms === 'number' ? (row.capacity as any).bathrooms : row.bathrooms,
      }
    : {
        baseGuests: row.maxGuests,
        maxGuests: row.maxGuests,
        bedrooms: row.bedrooms,
        beds: (row.bedsCount as number) || row.bedrooms,
        bathrooms: row.bathrooms,
      };

  const locationName = typeof row.locationName === 'string'
    ? row.locationName
    : (row.resortName ? `${row.resortName}${row.region || address ? ` — ${row.region || address}` : ''}` : (address || (row.region as string) || ''));

  return {
    id: row.id as string,
    ownerId: row.ownerId as string,
    title: row.title as string,
    unitType: row.unitType as string,
    propertyType: row.propertyType as string,
    description: typeof row.description === 'string' ? row.description : null,
    region: typeof row.region === 'string' ? row.region : null,
    resortName: typeof row.resortName === 'string' ? row.resortName : null,
    locationName,
    address,
    location,
    capacity,
    images,
    pricePerNight: price,
    basePricePerNight,
    currency: 'EGP',
    pricing: {
      basePricePerNight,
      currency: 'EGP',
    },
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    maxGuests: row.maxGuests,
    areaSqM: typeof row.areaSqM === 'number' ? row.areaSqM : null,
    bedsCount: typeof row.bedsCount === 'number' ? row.bedsCount : null,
    amenities: Array.isArray(row.amenities) ? row.amenities.filter((a): a is string => typeof a === 'string') : [],
    houseRules: row.houseRules && typeof row.houseRules === 'object' ? (row.houseRules as Record<string, unknown>) : {},
    status: row.status as string,
    verificationStatus: row.verificationStatus as string,
    createdAt,
    updatedAt,
  };
}

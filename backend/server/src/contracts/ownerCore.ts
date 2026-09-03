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
  if (typeof row.status !== 'string' || row.status.trim() === '') {
    throw new Error('MALFORMED_OWNER_PROFILE: missing or invalid status');
  }
  if (typeof row.verificationStatus !== 'string' || row.verificationStatus.trim() === '') {
    throw new Error('MALFORMED_OWNER_PROFILE: missing or invalid verificationStatus');
  }
  const createdAt = typeof row.createdAt === 'string' && row.createdAt.trim() !== ''
    ? row.createdAt
    : (typeof row.created_at === 'string' && row.created_at.trim() !== '' ? row.created_at : null);
  if (!createdAt) {
    throw new Error('MALFORMED_OWNER_PROFILE: missing or invalid createdAt');
  }
  const updatedAt = typeof row.updatedAt === 'string' && row.updatedAt.trim() !== ''
    ? row.updatedAt
    : (typeof row.updated_at === 'string' && row.updated_at.trim() !== '' ? row.updated_at : null);
  if (!updatedAt) {
    throw new Error('MALFORMED_OWNER_PROFILE: missing or invalid updatedAt');
  }

  return {
    id: row.id as string,
    phoneNumber: row.phoneNumber as string,
    fullName: typeof row.fullName === 'string' ? row.fullName : (typeof row.full_name === 'string' ? row.full_name : null),
    email: typeof row.email === 'string' ? row.email : null,
    avatarUrl: typeof row.avatarUrl === 'string' ? row.avatarUrl : (typeof row.avatar_url === 'string' ? row.avatar_url : null),
    status: row.status as string,
    verificationStatus: row.verificationStatus as string,
    ownerOnboardingCompletedAt: typeof row.ownerOnboardingCompletedAt === 'string' ? row.ownerOnboardingCompletedAt : (typeof row.owner_onboarding_completed_at === 'string' ? row.owner_onboarding_completed_at : null),
    createdAt,
    updatedAt,
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

  const createdAt = typeof row.createdAt === 'string' && row.createdAt.trim() !== ''
    ? row.createdAt
    : (typeof row.created_at === 'string' && row.created_at.trim() !== '' ? row.created_at : null);
  const updatedAt = typeof row.updatedAt === 'string' && row.updatedAt.trim() !== ''
    ? row.updatedAt
    : (typeof row.updated_at === 'string' && row.updated_at.trim() !== '' ? row.updated_at : null);

  if (!createdAt || !updatedAt) {
    throw new Error('MALFORMED_OWNER_PROPERTY: missing createdAt or updatedAt');
  }

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

export interface OwnerBookingFinancialDto {
  bookingId: string;
  totalBookingValue: number;
  depositAmount: number;
  solaCommissionAmount: number;
  ownerNetDepositAmount: number;
  remainingBalance: number;
  commissionOnRemainingBalance: number;
  currency: 'EGP';
}

function parseStrictFinancialAmount(val: unknown, fieldName: string): number {
  if (val === null || val === undefined || typeof val === 'boolean') {
    throw new Error(`MALFORMED_OWNER_BOOKING_FINANCIALS: missing or invalid ${fieldName}`);
  }
  if (typeof val === 'string' && val.trim() === '') {
    throw new Error(`MALFORMED_OWNER_BOOKING_FINANCIALS: missing or invalid ${fieldName}`);
  }
  const n = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`MALFORMED_OWNER_BOOKING_FINANCIALS: invalid ${fieldName}`);
  }
  return n;
}

export function toOwnerBookingFinancialDto(raw: unknown): OwnerBookingFinancialDto {
  const row = raw as Record<string, unknown>;
  if (!row || typeof row !== 'object') throw new Error('MALFORMED_OWNER_BOOKING_FINANCIALS');
  const bookingId = row.bookingId ?? row.booking_id;
  if (typeof bookingId !== 'string' || bookingId.trim() === '') {
    throw new Error('MALFORMED_OWNER_BOOKING_FINANCIALS: missing bookingId');
  }

  const totalBookingValue = parseStrictFinancialAmount(row.totalBookingValue !== undefined ? row.totalBookingValue : row.total_booking_value, 'totalBookingValue');
  const depositAmount = parseStrictFinancialAmount(row.depositAmount !== undefined ? row.depositAmount : row.deposit_amount, 'depositAmount');
  const solaCommissionAmount = parseStrictFinancialAmount(row.solaCommissionAmount !== undefined ? row.solaCommissionAmount : row.sola_commission_amount, 'solaCommissionAmount');
  const ownerNetDepositAmount = parseStrictFinancialAmount(row.ownerNetDepositAmount !== undefined ? row.ownerNetDepositAmount : row.owner_net_deposit_amount, 'ownerNetDepositAmount');
  const remainingBalance = parseStrictFinancialAmount(row.remainingBalance !== undefined ? row.remainingBalance : row.remaining_balance, 'remainingBalance');

  const rawComm = row.commissionOnRemainingBalance !== undefined ? row.commissionOnRemainingBalance : row.commission_on_remaining_balance;
  if (rawComm === undefined) {
    throw new Error('MALFORMED_OWNER_BOOKING_FINANCIALS: missing commissionOnRemainingBalance');
  }
  const commissionOnRemainingBalance = parseStrictFinancialAmount(rawComm, 'commissionOnRemainingBalance');

  if (commissionOnRemainingBalance !== 0) {
    throw new Error('MALFORMED_OWNER_BOOKING_FINANCIALS: commissionOnRemainingBalance must be 0');
  }

  return {
    bookingId,
    totalBookingValue,
    depositAmount,
    solaCommissionAmount,
    ownerNetDepositAmount,
    remainingBalance,
    commissionOnRemainingBalance: 0,
    currency: 'EGP',
  };
}

export interface OwnerBookingPropertyDto {
  id: string;
  title: string;
  locationName: string;
  address: string;
  images: string[];
}

export interface OwnerBookingRenterDto {
  name: string | null;
  avatar: string | null;
}

export interface OwnerBookingListItemDto {
  id: string;
  bookingNumber: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  locationName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestsCount: number;
  totalPrice: number;
  deposit: number;
  totalStay: number;
  depositAmount: number;
  remainingAmount: number;
  currency: 'EGP';
  status: string;
  renter: OwnerBookingRenterDto;
  confirmedAt?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
  property?: OwnerBookingPropertyDto;
  financialSummary: OwnerBookingFinancialDto;
}

export function toOwnerBookingListItem(raw: unknown): OwnerBookingListItemDto {
  const row = raw as Record<string, unknown>;
  if (!row || typeof row !== 'object') throw new Error('MALFORMED_OWNER_BOOKING');
  if (typeof row.id !== 'string' || row.id.trim() === '') {
    throw new Error('MALFORMED_OWNER_BOOKING: missing id');
  }
  const bookingNumber = typeof row.bookingNumber === 'string' && row.bookingNumber.trim() !== ''
    ? row.bookingNumber.trim()
    : (typeof row.booking_number === 'string' && row.booking_number.trim() !== '' ? row.booking_number.trim() : null);
  if (!bookingNumber) {
    throw new Error('MALFORMED_OWNER_BOOKING: missing bookingNumber');
  }
  if (typeof row.propertyId !== 'string' || row.propertyId.trim() === '') {
    throw new Error('MALFORMED_OWNER_BOOKING: missing propertyId');
  }
  if (typeof row.status !== 'string' || row.status.trim() === '') {
    throw new Error('MALFORMED_OWNER_BOOKING: missing status');
  }
  if (typeof row.checkIn !== 'string' || typeof row.checkOut !== 'string') {
    throw new Error('MALFORMED_OWNER_BOOKING: missing checkIn or checkOut');
  }
  const nights = Number(row.nights);
  if (!Number.isInteger(nights) || nights <= 0) {
    throw new Error('MALFORMED_OWNER_BOOKING: invalid nights');
  }
  const guestsRaw = Number(row.guestsCount ?? row.totalGuests);
  if (!Number.isInteger(guestsRaw) || guestsRaw <= 0) {
    throw new Error('MALFORMED_OWNER_BOOKING: invalid guestsCount');
  }
  const createdAt = typeof row.createdAt === 'string' && row.createdAt.trim() !== ''
    ? row.createdAt
    : (typeof row.created_at === 'string' && row.created_at.trim() !== '' ? row.created_at : null);
  if (!createdAt) {
    throw new Error('MALFORMED_OWNER_BOOKING: missing createdAt');
  }

  // Financial fields must come from canonical persisted booking/financial truth
  if (!row.financialSummary || typeof row.financialSummary !== 'object') {
    throw new Error('MALFORMED_OWNER_BOOKING: missing financialSummary');
  }
  const financialSummary = toOwnerBookingFinancialDto(row.financialSummary);
  const totalPrice = financialSummary.totalBookingValue;
  const deposit = financialSummary.depositAmount;
  const remainingAmount = financialSummary.remainingBalance;

  if (totalPrice <= 0 || deposit <= 0 || remainingAmount !== (totalPrice - deposit)) {
    throw new Error('MALFORMED_OWNER_BOOKING: invalid financial amounts');
  }

  // Renter: do NOT expose customerId as renter.id, do NOT fabricate generic 'مستأجر', do NOT fabricate fake rating
  const renterRaw = (row.renter && typeof row.renter === 'object') ? (row.renter as Record<string, unknown>) : null;
  const guestName = typeof row.guestName === 'string' && row.guestName.trim() !== ''
    ? row.guestName.trim()
    : (renterRaw && typeof renterRaw.name === 'string' && renterRaw.name.trim() !== '' ? renterRaw.name.trim() : null);
  const avatar = renterRaw && typeof renterRaw.avatar === 'string' && renterRaw.avatar.trim() !== ''
    ? renterRaw.avatar.trim()
    : null;

  const renter: OwnerBookingRenterDto = {
    name: guestName,
    avatar,
  };

  // Explicit safe subset for property
  let propertySubset: OwnerBookingPropertyDto | undefined;
  if (row.property && typeof row.property === 'object') {
    const p = row.property as Record<string, unknown>;
    if (typeof p.id === 'string' && p.id.trim() !== '') {
      propertySubset = {
        id: p.id,
        title: typeof p.title === 'string' ? p.title : '',
        locationName: typeof p.locationName === 'string' ? p.locationName : (typeof p.resortName === 'string' ? p.resortName : ''),
        address: typeof p.address === 'string' ? p.address : '',
        images: Array.isArray(p.images) ? p.images.filter((img): img is string => typeof img === 'string') : [],
      };
    }
  }

  const result: OwnerBookingListItemDto = {
    id: row.id as string,
    bookingNumber,
    propertyId: row.propertyId as string,
    propertyTitle: typeof row.propertyTitle === 'string' ? row.propertyTitle : (propertySubset?.title || ''),
    propertyImage: typeof row.propertyImage === 'string' ? row.propertyImage : (propertySubset?.images?.[0] || ''),
    locationName: typeof row.locationName === 'string' ? row.locationName : (propertySubset?.locationName || ''),
    checkIn: row.checkIn as string,
    checkOut: row.checkOut as string,
    nights,
    guestsCount: guestsRaw,
    totalPrice,
    deposit,
    totalStay: totalPrice,
    depositAmount: deposit,
    remainingAmount,
    currency: 'EGP',
    status: row.status as string,
    renter,
    confirmedAt: typeof row.confirmedAt === 'string' ? row.confirmedAt : null,
    rejectedAt: typeof row.rejectedAt === 'string' ? row.rejectedAt : null,
    createdAt,
    financialSummary,
  };

  if (propertySubset) {
    result.property = propertySubset;
  }

  return result;
}

import { PublicPropertyDetail } from './publicProperty.js';

export interface CustomerProfileDto {
  id: string;
  phoneNumber: string;
  phoneVerifiedAt: string | null;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAccountSummaryDto {
  confirmedBookingsCount: number;
  upcomingStaysCount: number;
  totalBookingsCount: number;
  totalDepositsPaidEgp: number;
}

export interface CustomerBookingPropertyItem {
  id: string;
  title: string;
  unitType: string;
  propertyType: string | null;
  address: string;
  region: string | null;
  resortName: string | null;
  locationName: string | null;
  basePricePerNight: number;
  currency: 'EGP';
  images: string[];
}

export interface CustomerBookingDetailPropertyItem extends CustomerBookingPropertyItem {
  description: string | null;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  pricePerNight: number;
  amenities: string[];
  houseRules: Record<string, any>;
}

export interface CustomerBookingListItem {
  id: string;
  propertyId: string;
  bookingNumber: string;
  status: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestsCount: number;
  totalStay: number;
  depositAmount: number;
  remainingAmount: number;
  currency: 'EGP';
  createdAt: string;
  property: CustomerBookingPropertyItem;
}

export interface CustomerBookingDetailDto {
  id: string;
  propertyId: string;
  bookingNumber: string;
  status: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestsCount: number;
  totalStay: number;
  depositAmount: number;
  remainingAmount: number;
  currency: 'EGP';
  createdAt: string;
  guestName: string | null;
  guestEmail: string | null;
  specialRequests: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  property: CustomerBookingDetailPropertyItem;
}

export interface CustomerBookingCreateResponseDto {
  id: string;
  propertyId: string;
  bookingNumber: string;
  status: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestsCount: number;
  totalStay: number;
  depositAmount: number;
  remainingAmount: number;
  currency: 'EGP';
  createdAt: string;
}

export interface CustomerFavoriteRow {
  customerId: string;
  propertyId: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers and Guards
// ---------------------------------------------------------------------------

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(scope: string, field: string): never {
  throw new Error(`MALFORMED_${scope}: ${field}`);
}

function requiredString(value: unknown, scope: string, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') fail(scope, field);
  return value.trim();
}

function validStringOrEmpty(value: unknown, scope: string, field: string): string {
  if (typeof value !== 'string') fail(scope, field);
  return value.trim();
}

function optionalString(value: unknown, scope: string, field: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') fail(scope, field);
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function nonNegativeFinite(value: unknown, scope: string, field: string): number {
  if (typeof value === 'string' && value.trim() !== '') {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) fail(scope, field);
    return num;
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) fail(scope, field);
  return value;
}

function nonNegativeInteger(value: unknown, scope: string, field: string): number {
  const num = typeof value === 'string' ? Number(value) : value;
  if (typeof num !== 'number' || !Number.isInteger(num) || num < 0) fail(scope, field);
  return num;
}

function positiveInteger(value: unknown, scope: string, field: string): number {
  const num = typeof value === 'string' ? Number(value) : value;
  if (typeof num !== 'number' || !Number.isInteger(num) || num <= 0) fail(scope, field);
  return num;
}

function validateUuid(value: unknown, scope: string, field: string): string {
  if (typeof value !== 'string' || !UUID_REGEX.test(value)) fail(scope, field);
  return value;
}

function validateIsoDate(value: unknown, scope: string, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') fail(scope, field);
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) fail(scope, field);
  return value;
}

function optionalIsoDate(value: unknown, scope: string, field: string): string | null {
  if (value === undefined || value === null) return null;
  return validateIsoDate(value, scope, field);
}

// ---------------------------------------------------------------------------
// DTO Mappers
// ---------------------------------------------------------------------------

export function toCustomerProfileDto(raw: any): CustomerProfileDto {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    fail('CUSTOMER_PROFILE_DATA', 'raw must be an object');
  }

  const id = requiredString(raw.id, 'CUSTOMER_PROFILE_DATA', 'id');
  const phoneNumber = requiredString(raw.phoneNumber ?? raw.phone_number, 'CUSTOMER_PROFILE_DATA', 'phoneNumber');
  const phoneVerifiedAt = optionalIsoDate(raw.phoneVerifiedAt ?? raw.phone_verified_at, 'CUSTOMER_PROFILE_DATA', 'phoneVerifiedAt');
  const fullName = optionalString(raw.fullName ?? raw.full_name, 'CUSTOMER_PROFILE_DATA', 'fullName');
  const email = optionalString(raw.email, 'CUSTOMER_PROFILE_DATA', 'email');
  const avatarUrl = optionalString(raw.avatarUrl ?? raw.avatar_url, 'CUSTOMER_PROFILE_DATA', 'avatarUrl');
  const status = requiredString(raw.status, 'CUSTOMER_PROFILE_DATA', 'status');
  const createdAt = validateIsoDate(raw.createdAt ?? raw.created_at, 'CUSTOMER_PROFILE_DATA', 'createdAt');
  const updatedAt = validateIsoDate(raw.updatedAt ?? raw.updated_at, 'CUSTOMER_PROFILE_DATA', 'updatedAt');

  return {
    id,
    phoneNumber,
    phoneVerifiedAt,
    fullName,
    email,
    avatarUrl,
    status,
    createdAt,
    updatedAt,
  };
}

export function toCustomerAccountSummaryDto(raw: any): CustomerAccountSummaryDto {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    fail('CUSTOMER_ACCOUNT_SUMMARY', 'raw must be an object');
  }

  const confirmedBookingsCount = nonNegativeInteger(raw.confirmedBookingsCount, 'CUSTOMER_ACCOUNT_SUMMARY', 'confirmedBookingsCount');
  const upcomingStaysCount = nonNegativeInteger(raw.upcomingStaysCount, 'CUSTOMER_ACCOUNT_SUMMARY', 'upcomingStaysCount');
  const totalBookingsCount = nonNegativeInteger(raw.totalBookingsCount, 'CUSTOMER_ACCOUNT_SUMMARY', 'totalBookingsCount');
  const totalDepositsPaidEgp = nonNegativeFinite(raw.totalDepositsPaidEgp, 'CUSTOMER_ACCOUNT_SUMMARY', 'totalDepositsPaidEgp');

  return {
    confirmedBookingsCount,
    upcomingStaysCount,
    totalBookingsCount,
    totalDepositsPaidEgp,
  };
}

function mapCustomerBookingProperty(prop: any): CustomerBookingPropertyItem {
  if (!prop || typeof prop !== 'object' || Array.isArray(prop)) {
    fail('CUSTOMER_BOOKING_DATA', 'property must be an object');
  }

  const id = requiredString(prop.id, 'CUSTOMER_BOOKING_PROPERTY_DATA', 'id');
  const title = requiredString(prop.title, 'CUSTOMER_BOOKING_PROPERTY_DATA', 'title');
  const unitType = requiredString(prop.unitType ?? prop.unit_type, 'CUSTOMER_BOOKING_PROPERTY_DATA', 'unitType');
  const propertyType = optionalString(prop.propertyType ?? prop.property_type, 'CUSTOMER_BOOKING_PROPERTY_DATA', 'propertyType');
  const address = validStringOrEmpty(prop.address, 'CUSTOMER_BOOKING_PROPERTY_DATA', 'address');
  const region = optionalString(prop.region, 'CUSTOMER_BOOKING_PROPERTY_DATA', 'region');
  const resortName = optionalString(prop.resortName ?? prop.resort_name, 'CUSTOMER_BOOKING_PROPERTY_DATA', 'resortName');
  const locationName = optionalString(prop.locationName ?? prop.location_name ?? prop.resortName ?? prop.resort_name, 'CUSTOMER_BOOKING_PROPERTY_DATA', 'locationName');
  const basePricePerNight = nonNegativeFinite(prop.basePricePerNight ?? prop.base_price_per_night ?? prop.pricePerNight, 'CUSTOMER_BOOKING_PROPERTY_DATA', 'basePricePerNight');

  let images: string[] = [];
  if (prop.images !== undefined && prop.images !== null) {
    if (!Array.isArray(prop.images)) {
      fail('CUSTOMER_BOOKING_PROPERTY_DATA', 'images must be an array');
    }
    images = prop.images.map((img: any) => {
      if (typeof img === 'string') {
        if (img.trim() === '') fail('CUSTOMER_BOOKING_PROPERTY_DATA', 'images must not contain empty strings');
        return img.trim();
      }
      if (img && typeof img === 'object' && typeof (img.fileUrl ?? img.file_url) === 'string') {
        const url = (img.fileUrl ?? img.file_url).trim();
        if (url === '') fail('CUSTOMER_BOOKING_PROPERTY_DATA', 'images must not contain empty url');
        return url;
      }
      fail('CUSTOMER_BOOKING_PROPERTY_DATA', 'images must not contain malformed entries');
    });
  }

  return {
    id,
    title,
    unitType,
    propertyType,
    address,
    region,
    resortName,
    locationName,
    basePricePerNight,
    currency: 'EGP',
    images,
  };
}

function mapCustomerBookingDetailProperty(prop: any): CustomerBookingDetailPropertyItem {
  const base = mapCustomerBookingProperty(prop);
  const description = optionalString(prop.description, 'CUSTOMER_BOOKING_PROPERTY_DATA', 'description');
  const bedrooms = nonNegativeInteger(prop.bedrooms, 'CUSTOMER_BOOKING_PROPERTY_DATA', 'bedrooms');
  const bathrooms = nonNegativeInteger(prop.bathrooms, 'CUSTOMER_BOOKING_PROPERTY_DATA', 'bathrooms');
  const maxGuests = positiveInteger(prop.maxGuests ?? prop.max_guests, 'CUSTOMER_BOOKING_PROPERTY_DATA', 'maxGuests');
  const pricePerNight = nonNegativeFinite(prop.pricePerNight ?? prop.price_per_night ?? prop.basePricePerNight ?? prop.base_price_per_night ?? base.basePricePerNight, 'CUSTOMER_BOOKING_PROPERTY_DATA', 'pricePerNight');

  let amenities: string[] = [];
  if (prop.amenities !== undefined && prop.amenities !== null) {
    if (!Array.isArray(prop.amenities)) {
      fail('CUSTOMER_BOOKING_PROPERTY_DATA', 'amenities must be an array');
    }
    amenities = prop.amenities.map((a: any) => requiredString(a, 'CUSTOMER_BOOKING_PROPERTY_DATA', 'amenities entry'));
  }

  let houseRules: Record<string, any> = {};
  const rawRules = prop.houseRules ?? prop.house_rules;
  if (rawRules !== undefined && rawRules !== null) {
    if (typeof rawRules !== 'object' || Array.isArray(rawRules)) {
      fail('CUSTOMER_BOOKING_PROPERTY_DATA', 'houseRules must be an object');
    }
    houseRules = rawRules;
  }

  return {
    ...base,
    description,
    bedrooms,
    bathrooms,
    maxGuests,
    pricePerNight,
    amenities,
    houseRules,
  };
}

export function toCustomerBookingListItem(raw: any): CustomerBookingListItem {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    fail('CUSTOMER_BOOKING_DATA', 'raw must be an object');
  }

  const id = requiredString(raw.id, 'CUSTOMER_BOOKING_DATA', 'id');
  const propertyId = requiredString(raw.propertyId ?? raw.property_id, 'CUSTOMER_BOOKING_DATA', 'propertyId');
  const bookingNumber = requiredString(raw.bookingNumber ?? raw.booking_number, 'CUSTOMER_BOOKING_DATA', 'bookingNumber');
  const status = requiredString(raw.status, 'CUSTOMER_BOOKING_DATA', 'status');
  const checkIn = requiredString(raw.checkIn ?? raw.check_in, 'CUSTOMER_BOOKING_DATA', 'checkIn');
  const checkOut = requiredString(raw.checkOut ?? raw.check_out, 'CUSTOMER_BOOKING_DATA', 'checkOut');
  const nights = positiveInteger(raw.nights, 'CUSTOMER_BOOKING_DATA', 'nights');
  const guestsCount = positiveInteger(raw.guestsCount ?? raw.guests ?? raw.totalGuests ?? raw.total_guests, 'CUSTOMER_BOOKING_DATA', 'guestsCount');
  const createdAt = validateIsoDate(raw.createdAt ?? raw.created_at, 'CUSTOMER_BOOKING_DATA', 'createdAt');

  const fin = raw.financialSummary ?? raw;
  const totalStay = nonNegativeFinite(fin.totalBookingValue ?? fin.totalStay, 'CUSTOMER_BOOKING_DATA', 'totalStay');
  const depositAmount = nonNegativeFinite(fin.depositAmount, 'CUSTOMER_BOOKING_DATA', 'depositAmount');
  const remainingAmount = nonNegativeFinite(fin.remainingBalance ?? fin.remainingAmount, 'CUSTOMER_BOOKING_DATA', 'remainingAmount');

  const property = mapCustomerBookingProperty(raw.property);

  return {
    id,
    propertyId,
    bookingNumber,
    status,
    checkIn,
    checkOut,
    nights,
    guestsCount,
    totalStay,
    depositAmount,
    remainingAmount,
    currency: 'EGP',
    createdAt,
    property,
  };
}

export function toCustomerBookingDetailDto(raw: any): CustomerBookingDetailDto {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    fail('CUSTOMER_BOOKING_DATA', 'raw must be an object');
  }

  const id = requiredString(raw.id, 'CUSTOMER_BOOKING_DATA', 'id');
  const propertyId = requiredString(raw.propertyId ?? raw.property_id, 'CUSTOMER_BOOKING_DATA', 'propertyId');
  const bookingNumber = requiredString(raw.bookingNumber ?? raw.booking_number, 'CUSTOMER_BOOKING_DATA', 'bookingNumber');
  const status = requiredString(raw.status, 'CUSTOMER_BOOKING_DATA', 'status');
  const checkIn = requiredString(raw.checkIn ?? raw.check_in, 'CUSTOMER_BOOKING_DATA', 'checkIn');
  const checkOut = requiredString(raw.checkOut ?? raw.check_out, 'CUSTOMER_BOOKING_DATA', 'checkOut');
  const nights = positiveInteger(raw.nights, 'CUSTOMER_BOOKING_DATA', 'nights');
  const guestsCount = positiveInteger(raw.guestsCount ?? raw.guests ?? raw.totalGuests ?? raw.total_guests, 'CUSTOMER_BOOKING_DATA', 'guestsCount');
  const createdAt = validateIsoDate(raw.createdAt ?? raw.created_at, 'CUSTOMER_BOOKING_DATA', 'createdAt');

  const fin = raw.financialSummary ?? raw;
  const totalStay = nonNegativeFinite(fin.totalBookingValue ?? fin.totalStay, 'CUSTOMER_BOOKING_DATA', 'totalStay');
  const depositAmount = nonNegativeFinite(fin.depositAmount, 'CUSTOMER_BOOKING_DATA', 'depositAmount');
  const remainingAmount = nonNegativeFinite(fin.remainingBalance ?? fin.remainingAmount, 'CUSTOMER_BOOKING_DATA', 'remainingAmount');

  const guestName = optionalString(raw.guestName ?? raw.guest_name, 'CUSTOMER_BOOKING_DATA', 'guestName');
  const guestEmail = optionalString(raw.guestEmail ?? raw.guest_email, 'CUSTOMER_BOOKING_DATA', 'guestEmail');
  const specialRequests = optionalString(raw.specialRequests ?? raw.special_requests, 'CUSTOMER_BOOKING_DATA', 'specialRequests');
  const cancellationReason = optionalString(raw.cancellationReason ?? raw.cancellation_reason, 'CUSTOMER_BOOKING_DATA', 'cancellationReason');
  const cancelledAt = optionalIsoDate(raw.cancelledAt ?? raw.cancelled_at, 'CUSTOMER_BOOKING_DATA', 'cancelledAt');
  const confirmedAt = optionalIsoDate(raw.confirmedAt ?? raw.confirmed_at, 'CUSTOMER_BOOKING_DATA', 'confirmedAt');
  const completedAt = optionalIsoDate(raw.completedAt ?? raw.completed_at, 'CUSTOMER_BOOKING_DATA', 'completedAt');

  const property = mapCustomerBookingDetailProperty(raw.property);

  return {
    id,
    propertyId,
    bookingNumber,
    status,
    checkIn,
    checkOut,
    nights,
    guestsCount,
    totalStay,
    depositAmount,
    remainingAmount,
    currency: 'EGP',
    createdAt,
    guestName,
    guestEmail,
    specialRequests,
    cancellationReason,
    cancelledAt,
    confirmedAt,
    completedAt,
    property,
  };
}

export function toCustomerBookingCreateResponseDto(raw: any): CustomerBookingCreateResponseDto {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    fail('CUSTOMER_BOOKING_DATA', 'raw must be an object');
  }

  const id = requiredString(raw.id, 'CUSTOMER_BOOKING_DATA', 'id');
  const propertyId = requiredString(raw.propertyId ?? raw.property_id, 'CUSTOMER_BOOKING_DATA', 'propertyId');
  const bookingNumber = requiredString(raw.bookingNumber ?? raw.booking_number, 'CUSTOMER_BOOKING_DATA', 'bookingNumber');
  const status = requiredString(raw.status, 'CUSTOMER_BOOKING_DATA', 'status');
  const checkIn = requiredString(raw.checkIn ?? raw.check_in, 'CUSTOMER_BOOKING_DATA', 'checkIn');
  const checkOut = requiredString(raw.checkOut ?? raw.check_out, 'CUSTOMER_BOOKING_DATA', 'checkOut');
  const nights = positiveInteger(raw.nights, 'CUSTOMER_BOOKING_DATA', 'nights');
  const guestsCount = positiveInteger(raw.guestsCount ?? raw.guests ?? raw.totalGuests ?? raw.total_guests, 'CUSTOMER_BOOKING_DATA', 'guestsCount');
  const createdAt = validateIsoDate(raw.createdAt ?? raw.created_at, 'CUSTOMER_BOOKING_DATA', 'createdAt');

  const fin = raw.financialSummary ?? raw;
  const totalStay = nonNegativeFinite(fin.totalBookingValue ?? fin.totalStay, 'CUSTOMER_BOOKING_DATA', 'totalStay');
  const depositAmount = nonNegativeFinite(fin.depositAmount, 'CUSTOMER_BOOKING_DATA', 'depositAmount');
  const remainingAmount = nonNegativeFinite(fin.remainingBalance ?? fin.remainingAmount, 'CUSTOMER_BOOKING_DATA', 'remainingAmount');

  return {
    id,
    propertyId,
    bookingNumber,
    status,
    checkIn,
    checkOut,
    nights,
    guestsCount,
    totalStay,
    depositAmount,
    remainingAmount,
    currency: 'EGP',
    createdAt,
  };
}

export function validateCustomerFavoriteRow(raw: any): CustomerFavoriteRow {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    fail('CUSTOMER_FAVORITE', 'raw must be an object');
  }

  const customerId = validateUuid(raw.customerId ?? raw.customer_id, 'CUSTOMER_FAVORITE', 'customerId');
  const propertyId = validateUuid(raw.propertyId ?? raw.property_id, 'CUSTOMER_FAVORITE', 'propertyId');
  const createdAt = validateIsoDate(raw.createdAt ?? raw.created_at, 'CUSTOMER_FAVORITE', 'createdAt');

  return {
    customerId,
    propertyId,
    createdAt,
  };
}

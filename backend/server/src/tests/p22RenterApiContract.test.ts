import assert from 'node:assert/strict';
import {
  toCustomerProfileDto,
  toCustomerAccountSummaryDto,
  toCustomerBookingListItem,
  toCustomerBookingDetailDto,
  toCustomerBookingCreateResponseDto,
  validateCustomerFavoriteRow,
} from '../contracts/customerRenter.js';

// ---------------------------------------------------------------------------
// 1. Task 1: Authenticated Customer DTO boundary tests
// ---------------------------------------------------------------------------

// 1A. CustomerProfileDto tests
const rawUser = {
  id: '00000000-0000-4000-8000-000000000001',
  phoneNumber: '+201012345678',
  phone_number: '+201012345678',
  phoneVerifiedAt: '2026-09-01T00:00:00.000Z',
  fullName: 'أحمد محمود',
  email: 'ahmed@example.com',
  avatarUrl: null,
  status: 'ACTIVE',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
  // Poisoned internal fields
  passwordHash: 'secret-hash',
  nationalId: '12345678901234',
  role: 'ROLE_CUSTOMER',
  internalFlags: { test: true },
};

const profileDto = toCustomerProfileDto(rawUser);
assert.deepEqual(Object.keys(profileDto).sort(), [
  'avatarUrl', 'createdAt', 'email', 'fullName', 'id', 'phoneNumber', 'phoneVerifiedAt', 'status', 'updatedAt',
].sort());
assert.equal(profileDto.id, '00000000-0000-4000-8000-000000000001');
assert.equal(profileDto.phoneNumber, '+201012345678');
assert.equal(profileDto.fullName, 'أحمد محمود');
assert.equal('passwordHash' in profileDto, false);
assert.equal('nationalId' in profileDto, false);
assert.equal('internalFlags' in profileDto, false);

// Profile fail closed on malformed required fields
assert.throws(() => toCustomerProfileDto({ ...rawUser, id: '' }), /MALFORMED_CUSTOMER_PROFILE_DATA/);
assert.throws(() => toCustomerProfileDto({ ...rawUser, phoneNumber: '' }), /MALFORMED_CUSTOMER_PROFILE_DATA/);
assert.throws(() => toCustomerProfileDto({ ...rawUser, status: '' }), /MALFORMED_CUSTOMER_PROFILE_DATA/);

// Canonical null profile fields remain null
const nullProfileDto = toCustomerProfileDto({
  ...rawUser,
  fullName: null,
  email: null,
  phoneVerifiedAt: null,
});
assert.equal(nullProfileDto.fullName, null);
assert.equal(nullProfileDto.email, null);
assert.equal(nullProfileDto.phoneVerifiedAt, null);

// 1B. CustomerAccountSummaryDto tests
const validSummary = {
  confirmedBookingsCount: 2,
  upcomingStaysCount: 1,
  totalBookingsCount: 3,
  totalDepositsPaidEgp: 15000,
};
const summaryDto = toCustomerAccountSummaryDto(validSummary);
assert.deepEqual(summaryDto, validSummary);

// Summary zeros are legitimate when explicitly numeric
const zeroSummary = toCustomerAccountSummaryDto({
  confirmedBookingsCount: 0,
  upcomingStaysCount: 0,
  totalBookingsCount: 0,
  totalDepositsPaidEgp: 0,
});
assert.deepEqual(zeroSummary, {
  confirmedBookingsCount: 0,
  upcomingStaysCount: 0,
  totalBookingsCount: 0,
  totalDepositsPaidEgp: 0,
});

// Summary fail closed on non-finite, negative, or non-integer counts
assert.throws(() => toCustomerAccountSummaryDto({ ...validSummary, confirmedBookingsCount: -1 }), /MALFORMED_CUSTOMER_ACCOUNT_SUMMARY/);
assert.throws(() => toCustomerAccountSummaryDto({ ...validSummary, upcomingStaysCount: 1.5 }), /MALFORMED_CUSTOMER_ACCOUNT_SUMMARY/);
assert.throws(() => toCustomerAccountSummaryDto({ ...validSummary, totalDepositsPaidEgp: -500 }), /MALFORMED_CUSTOMER_ACCOUNT_SUMMARY/);
assert.throws(() => toCustomerAccountSummaryDto({ ...validSummary, totalDepositsPaidEgp: NaN }), /MALFORMED_CUSTOMER_ACCOUNT_SUMMARY/);

// 1C. CustomerBookingListItem tests
const poisonedBooking = {
  id: 'b0000000-0000-4000-8000-000000000001',
  customerId: 'c0000000-0000-4000-8000-000000000001',
  ownerId: 'owner-secret-id',
  propertyId: 'p0000000-0000-4000-8000-000000000001',
  bookingNumber: 'BKG-2026-001',
  status: 'CONFIRMED',
  checkIn: '2026-09-10',
  checkOut: '2026-09-12',
  nights: 2,
  guests: 3,
  guestName: 'ضيف اختبار',
  guestPhone: '+201099999999',
  guestEmail: 'guest@example.com',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  financialSummary: {
    totalBookingValue: 12000,
    depositAmount: 6000,
    remainingBalance: 6000,
    solaCommissionAmount: 1200,
    solaCommissionRate: 0.1,
    ownerNetDepositAmount: 4800,
    commissionOnRemainingBalance: 0,
    ownerPayoutStatus: 'NOT_DUE',
    payoutId: 'payout-secret',
    walletId: 'wallet-secret',
    ledgerId: 'ledger-secret',
  },
  property: {
    id: 'p0000000-0000-4000-8000-000000000001',
    title: 'شاليه مراسي فاخر',
    unitType: 'CHALET',
    propertyType: 'CHALET',
    address: 'مراسي',
    region: 'الساحل الشمالي',
    resortName: 'مراسي',
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    basePricePerNight: 6000,
    images: ['https://storage.sola.eg/p1.jpg'],
    ownerId: 'owner-secret-id',
    ownerPhone: '+201000000000',
  },
};

const listItem = toCustomerBookingListItem(poisonedBooking);
for (const forbidden of [
  'ownerId', 'customerId', 'guestPhone', 'financialSummary',
  'solaCommissionAmount', 'ownerNetDepositAmount', 'commissionOnRemainingBalance', 'ownerPayoutStatus',
  'payoutId', 'walletId', 'ledgerId',
]) {
  assert.equal(forbidden in (listItem as any), false, `${forbidden} must not leak in listItem`);
  assert.equal(forbidden in (listItem.property as any), false, `${forbidden} must not leak in listItem.property`);
}
assert.equal(listItem.totalStay, 12000);
assert.equal(listItem.depositAmount, 6000);
assert.equal(listItem.remainingAmount, 6000);
assert.equal(listItem.currency, 'EGP');
assert.equal(listItem.nights, 2);
assert.equal(listItem.guestsCount, 3);
assert.equal(listItem.bookingNumber, 'BKG-2026-001');

// Fail closed on malformed booking numbers or financial summary
assert.throws(
  () => toCustomerBookingListItem({ ...poisonedBooking, nights: null as any }),
  /MALFORMED_CUSTOMER_BOOKING_DATA/
);
assert.throws(
  () => toCustomerBookingListItem({ ...poisonedBooking, financialSummary: { ...poisonedBooking.financialSummary, depositAmount: 'bad' as any } }),
  /MALFORMED_CUSTOMER_BOOKING_DATA/
);

// F4: Fail closed on missing unitType (no CHALET default)
assert.throws(
  () => toCustomerBookingListItem({ ...poisonedBooking, property: { ...poisonedBooking.property, unitType: undefined as any } }),
  /CUSTOMER_BOOKING_PROPERTY_DATA/
);
assert.throws(
  () => toCustomerBookingListItem({ ...poisonedBooking, property: { ...poisonedBooking.property, unitType: '' } }),
  /CUSTOMER_BOOKING_PROPERTY_DATA/
);

// F4: Fail closed on missing createdAt (no generated timestamp)
assert.throws(
  () => toCustomerBookingListItem({ ...poisonedBooking, createdAt: undefined as any }),
  /CUSTOMER_BOOKING_DATA/
);

// F4: Fail closed on malformed image elements (no silent drop)
assert.throws(
  () => toCustomerBookingListItem({ ...poisonedBooking, property: { ...poisonedBooking.property, images: [''] } }),
  /CUSTOMER_BOOKING_PROPERTY_DATA/
);
assert.throws(
  () => toCustomerBookingListItem({ ...poisonedBooking, property: { ...poisonedBooking.property, images: ['   '] } }),
  /CUSTOMER_BOOKING_PROPERTY_DATA/
);
assert.throws(
  () => toCustomerBookingListItem({ ...poisonedBooking, property: { ...poisonedBooking.property, images: [123 as any] } }),
  /CUSTOMER_BOOKING_PROPERTY_DATA/
);

// F5: Booking list item uses guestsCount and includes locationName
assert.equal(listItem.guestsCount, 3, 'listItem must expose guestsCount');
assert.equal('guests' in listItem, false, 'listItem must not expose legacy guests');
assert.equal(listItem.property.locationName, 'مراسي', 'listItem.property must include locationName');

// 1D. CustomerBookingDetailDto tests
const detailItem = toCustomerBookingDetailDto(poisonedBooking);
for (const forbidden of [
  'ownerId', 'customerId', 'guestPhone', 'financialSummary',
  'solaCommissionAmount', 'ownerNetDepositAmount', 'commissionOnRemainingBalance', 'ownerPayoutStatus',
  'payoutId', 'walletId', 'ledgerId',
]) {
  assert.equal(forbidden in (detailItem as any), false, `${forbidden} must not leak in detailItem`);
  assert.equal(forbidden in (detailItem.property as any), false, `${forbidden} must not leak in detailItem.property`);
}
assert.equal(detailItem.totalStay, 12000);
assert.equal(detailItem.depositAmount, 6000);
assert.equal(detailItem.remainingAmount, 6000);
assert.equal(detailItem.currency, 'EGP');
assert.equal(detailItem.guestName, 'ضيف اختبار');
assert.equal(detailItem.guestEmail, 'guest@example.com');
assert.equal(detailItem.guestsCount, 3, 'detailItem must expose guestsCount');
assert.equal('guests' in detailItem, false, 'detailItem must not expose legacy guests');

// F5: Detail property explicitly contains safe detail fields needed by BookingDetailModal
assert.equal(detailItem.property.description, null);
assert.equal(detailItem.property.bedrooms, 2);
assert.equal(detailItem.property.bathrooms, 2);
assert.equal(detailItem.property.maxGuests, 4);
assert.equal(detailItem.property.pricePerNight, 6000);
assert.deepEqual(detailItem.property.amenities, []);
assert.deepEqual(detailItem.property.houseRules, {});

// C2-F4: Booking detail DTO rejects missing bedrooms, bathrooms, and maxGuests
assert.throws(
  () => toCustomerBookingDetailDto({ ...poisonedBooking, property: { ...poisonedBooking.property, bedrooms: undefined as any } }),
  /CUSTOMER_BOOKING_PROPERTY_DATA/
);
assert.throws(
  () => toCustomerBookingDetailDto({ ...poisonedBooking, property: { ...poisonedBooking.property, bathrooms: undefined as any } }),
  /CUSTOMER_BOOKING_PROPERTY_DATA/
);
assert.throws(
  () => toCustomerBookingDetailDto({ ...poisonedBooking, property: { ...poisonedBooking.property, maxGuests: undefined as any } }),
  /CUSTOMER_BOOKING_PROPERTY_DATA/
);
assert.throws(
  () => toCustomerBookingDetailDto({ ...poisonedBooking, property: { ...poisonedBooking.property, maxGuests: 0 } }),
  /CUSTOMER_BOOKING_PROPERTY_DATA/
);

// 1E. CustomerBookingCreateResponseDto tests
const createResponseDto = toCustomerBookingCreateResponseDto(poisonedBooking);
for (const forbidden of [
  'ownerId', 'customerId', 'guestPhone', 'financialSummary',
  'solaCommissionAmount', 'ownerNetDepositAmount', 'commissionOnRemainingBalance', 'ownerPayoutStatus',
  'payoutId', 'walletId', 'ledgerId',
]) {
  assert.equal(forbidden in (createResponseDto as any), false, `${forbidden} must not leak in createResponseDto`);
}
assert.equal(createResponseDto.totalStay, 12000);
assert.equal(createResponseDto.depositAmount, 6000);
assert.equal(createResponseDto.remainingAmount, 6000);
assert.equal(createResponseDto.currency, 'EGP');
assert.equal(createResponseDto.guestsCount, 3, 'createResponseDto must expose guestsCount');
assert.equal('guests' in createResponseDto, false, 'createResponseDto must not expose legacy guests');
assert.equal('financialSummary' in createResponseDto, false, 'createResponseDto must not expose nested financialSummary');

// 1F. validateCustomerFavoriteRow tests
const validFav = {
  customerId: 'c0000000-0000-4000-8000-000000000001',
  propertyId: 'e0000000-0000-4000-8000-000000000002',
  createdAt: '2026-09-03T12:00:00.000Z',
};
const favRow = validateCustomerFavoriteRow(validFav);
assert.deepEqual(favRow, validFav);

assert.throws(() => validateCustomerFavoriteRow({ ...validFav, customerId: 'not-uuid' }), /MALFORMED_CUSTOMER_FAVORITE/);
assert.throws(() => validateCustomerFavoriteRow({ ...validFav, propertyId: '' }), /MALFORMED_CUSTOMER_FAVORITE/);
assert.throws(() => validateCustomerFavoriteRow({ ...validFav, createdAt: 'invalid-date' }), /MALFORMED_CUSTOMER_FAVORITE/);

console.log('P2.2 Task 1 authenticated customer DTO unit tests passed.');

// ---------------------------------------------------------------------------
// 2. Task 2: Profile and Account Summary fail-closed tests
// ---------------------------------------------------------------------------
import { ExpressServerApp } from '../app.js';
import { signAccessToken } from '../services/jwtService.js';
import { userDb, bookingDb, propertyDb, imageDb, propertyAvailabilityDb } from '../services/dbRepository.js';

const app = new ExpressServerApp();
const testCustomerId = '00000000-0000-4000-8000-000000000001';
const customerToken = signAccessToken({ sub: testCustomerId, role: 'ROLE_CUSTOMER' });
const customerHeaders = { authorization: `Bearer ${customerToken}` };

// 2A. Profile DB error must be 500, not phone/memory fallback success
const origUserGetById = userDb.getById;
(userDb as any).getById = async () => { throw new Error('db down'); };
try {
  const res = await app.handleHttpRequest('GET', '/api/v1/customer/profile', customerHeaders);
  assert.equal(res.statusCode, 500, 'Profile GET DB error must return 500');
  assert.equal((res.body as any).success, false);
  assert.equal((res.body as any).error?.code, 'CUSTOMER_PROFILE_QUERY_FAILED');
} finally {
  (userDb as any).getById = origUserGetById;
}

// 2B. Profile user not found must be 404 CUSTOMER_IDENTITY_NOT_FOUND
(userDb as any).getById = async () => null;
try {
  const res = await app.handleHttpRequest('GET', '/api/v1/customer/profile', customerHeaders);
  assert.equal(res.statusCode, 404, 'Profile GET missing user must return 404');
  assert.equal((res.body as any).success, false);
  assert.equal((res.body as any).error?.code, 'CUSTOMER_IDENTITY_NOT_FOUND');
} finally {
  (userDb as any).getById = origUserGetById;
}

// 2C. Profile GET returns sanitized CustomerProfileDto keys only
(userDb as any).getById = async () => ({ ...rawUser });
try {
  const res = await app.handleHttpRequest('GET', '/api/v1/customer/profile', customerHeaders);
  assert.equal(res.statusCode, 200);
  assert.equal((res.body as any).success, true);
  assert.deepEqual(Object.keys((res.body as any).data).sort(), [
    'avatarUrl', 'createdAt', 'email', 'fullName', 'id', 'phoneNumber', 'phoneVerifiedAt', 'status', 'updatedAt',
  ].sort());
} finally {
  (userDb as any).getById = origUserGetById;
}

// 2D. Account summary booking read error must be 500, not a zero summary
const origGetByCustomerId = bookingDb.getByCustomerId;
(bookingDb as any).getByCustomerId = async () => { throw new Error('db down'); };
try {
  const res = await app.handleHttpRequest('GET', '/api/v1/customer/account/summary', customerHeaders);
  assert.equal(res.statusCode, 500, 'Account summary DB error must return 500');
  assert.equal((res.body as any).success, false);
  assert.equal((res.body as any).error?.code, 'CUSTOMER_ACCOUNT_SUMMARY_QUERY_FAILED');
} finally {
  (bookingDb as any).getByCustomerId = origGetByCustomerId;
}

// 2E. Account summary with genuine zero bookings returns zeros
(bookingDb as any).getByCustomerId = async () => [];
try {
  const res = await app.handleHttpRequest('GET', '/api/v1/customer/account/summary', customerHeaders);
  assert.equal(res.statusCode, 200);
  assert.deepEqual((res.body as any).data, {
    confirmedBookingsCount: 0,
    upcomingStaysCount: 0,
    totalBookingsCount: 0,
    totalDepositsPaidEgp: 0,
  });
} finally {
  (bookingDb as any).getByCustomerId = origGetByCustomerId;
}

console.log('P2.2 Task 2 profile and account fail-closed tests passed.');

// ---------------------------------------------------------------------------
// 3. Task 3: Customer booking create/list/detail privacy and IDOR tests
// ---------------------------------------------------------------------------
const forbiddenBookingKeys = [
  'ownerId', 'customerId', 'guestPhone', 'financialSummary',
  'solaCommissionAmount', 'ownerNetDepositAmount', 'commissionOnRemainingBalance', 'ownerPayoutStatus',
  'payoutId', 'walletId', 'ledgerId',
];

// 3A. Customer booking list GET /api/v1/customer/bookings
(bookingDb as any).getByCustomerId = async () => [{ ...poisonedBooking, customerId: testCustomerId }];
try {
  const res = await app.handleHttpRequest('GET', '/api/v1/customer/bookings', customerHeaders);
  assert.equal(res.statusCode, 200);
  assert.equal((res.body as any).success, true);
  const bookings = (res.body as any).data;
  assert.ok(Array.isArray(bookings));
  assert.equal(bookings.length, 1);
  const item = bookings[0];
  for (const forbidden of forbiddenBookingKeys) {
    assert.equal(forbidden in item, false, `List item must not contain ${forbidden}`);
    assert.equal(forbidden in (item.property || {}), false, `List item property must not contain ${forbidden}`);
  }
  assert.equal(item.totalStay, 12000);
  assert.equal(item.depositAmount, 6000);
  assert.equal(item.remainingAmount, 6000);
  assert.equal(item.currency, 'EGP');
} finally {
  (bookingDb as any).getByCustomerId = origGetByCustomerId;
}

// 3B. Customer booking detail GET /api/v1/customer/bookings/:id
const origBookingGetById = bookingDb.getById;
(bookingDb as any).getById = async (id: string) => {
  if (id === poisonedBooking.id) return { ...poisonedBooking, customerId: testCustomerId };
  return null;
};
try {
  const res = await app.handleHttpRequest('GET', `/api/v1/customer/bookings/${poisonedBooking.id}`, customerHeaders);
  assert.equal(res.statusCode, 200);
  assert.equal((res.body as any).success, true);
  const detail = (res.body as any).data;
  for (const forbidden of forbiddenBookingKeys) {
    assert.equal(forbidden in detail, false, `Detail must not contain ${forbidden}`);
  }
  assert.equal(detail.totalStay, 12000);
  assert.equal(detail.depositAmount, 6000);
  assert.equal(detail.remainingAmount, 6000);
  assert.equal(detail.currency, 'EGP');
} finally {
  (bookingDb as any).getById = origBookingGetById;
}

// 3C. IDOR: Customer A cannot read Customer B booking
(bookingDb as any).getById = async (id: string) => {
  if (id === poisonedBooking.id) return { ...poisonedBooking, customerId: 'other-customer-uuid' };
  return null;
};
try {
  const res = await app.handleHttpRequest('GET', `/api/v1/customer/bookings/${poisonedBooking.id}`, customerHeaders);
  assert.equal(res.statusCode, 403, 'Customer A reading Customer B booking must return 403');
  assert.equal((res.body as any).error?.code, 'FORBIDDEN_BOOKING_ACCESS');
} finally {
  (bookingDb as any).getById = origBookingGetById;
}

// 3D. C2-F3: Partial booking missing property or financial summary fails closed and DOES NOT trigger compensating reads
const origPropGetById = propertyDb.getById;
const origImageGetByProp = imageDb.getImagesByPropertyId;
let compensatingPropReads = 0;
let compensatingImageReads = 0;
(propertyDb as any).getById = async () => { compensatingPropReads += 1; return null; };
(imageDb as any).getImagesByPropertyId = async () => { compensatingImageReads += 1; return []; };
(bookingDb as any).getById = async (id: string) => {
  if (id === poisonedBooking.id) {
    return { ...poisonedBooking, customerId: testCustomerId, property: null };
  }
  return null;
};
try {
  const res = await app.handleHttpRequest('GET', `/api/v1/customer/bookings/${poisonedBooking.id}`, customerHeaders);
  assert.equal(res.statusCode, 500, 'Partial booking must fail closed with 500');
  assert.equal(compensatingPropReads, 0, 'Must NOT perform compensating propertyDb.getById');
  assert.equal(compensatingImageReads, 0, 'Must NOT perform compensating imageDb.getImagesByPropertyId');
} finally {
  (bookingDb as any).getById = origBookingGetById;
  (propertyDb as any).getById = origPropGetById;
  (imageDb as any).getImagesByPropertyId = origImageGetByProp;
}

// 3E. C2-F1: POST /customer/bookings response has no financialSummary and missing createdAt fails closed
const origBookingCreate = bookingDb.create;
const origPropAvailability = propertyAvailabilityDb.getByPropertyId;
const origBookingBlocks = bookingDb.getBlocksByPropertyId;
(userDb as any).getById = async (id: string) => (id === testCustomerId ? { id, fullName: 'عميل', phoneNumber: '+201012345678' } : null);
(propertyAvailabilityDb as any).getByPropertyId = async () => [];
(bookingDb as any).getBlocksByPropertyId = async () => [];
(propertyDb as any).getById = async () => ({
  id: 'e0000000-0000-4000-8000-000000000002',
  ownerId: '00000000-0000-4000-8000-000000000009',
  title: 'شاليه',
  unitType: 'CHALET',
  address: 'مراسي',
  basePricePerNight: 2000,
  pricePerNight: 2000,
  maxGuests: 4,
  status: 'PUBLISHED',
  verificationStatus: 'VERIFIED',
});

// Case 1: Success response must NOT contain financialSummary in any form
(bookingDb as any).create = async (payload: any) => ({
  id: payload.id,
  propertyId: payload.propertyId,
  bookingNumber: payload.bookingNumber,
  status: payload.status,
  checkIn: payload.checkIn,
  checkOut: payload.checkOut,
  nights: payload.nights,
  guestsCount: payload.totalGuests,
  createdAt: '2026-09-03T12:00:00.000Z',
  financialSummary: {
    totalBookingValue: 4000,
    depositAmount: 2000,
    remainingBalance: 2000,
  },
});
try {
  const res = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeaders, {
    propertyId: 'e0000000-0000-4000-8000-000000000002',
    checkIn: '2026-12-20',
    checkOut: '2026-12-22',
    guests: 2,
  });
  assert.equal(res.statusCode, 201);
  const data = (res.body as any).data;
  assert.equal('financialSummary' in data, false, 'financialSummary in data must be false');
  assert.equal(Object.getOwnPropertyDescriptor(data, 'financialSummary'), undefined, 'financialSummary descriptor must be undefined');
  assert.equal(JSON.stringify(data).includes('financialSummary'), false, 'serialized JSON must not contain financialSummary');
} finally {
  (bookingDb as any).create = origBookingCreate;
}

// Case 2: Persisted result missing createdAt must fail closed with 500, never receiving server time
(bookingDb as any).create = async (payload: any) => ({
  id: payload.id,
  propertyId: payload.propertyId,
  bookingNumber: payload.bookingNumber,
  status: payload.status,
  checkIn: payload.checkIn,
  checkOut: payload.checkOut,
  nights: payload.nights,
  guestsCount: payload.totalGuests,
  // createdAt omitted!
  financialSummary: {
    totalBookingValue: 4000,
    depositAmount: 2000,
    remainingBalance: 2000,
  },
});
try {
  const res = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeaders, {
    propertyId: 'e0000000-0000-4000-8000-000000000002',
    checkIn: '2026-12-20',
    checkOut: '2026-12-22',
    guests: 2,
  });
  assert.equal(res.statusCode, 500, 'Missing persisted createdAt must return 500 fail-closed');
} finally {
  (bookingDb as any).create = origBookingCreate;
  (propertyDb as any).getById = origPropGetById;
  (propertyAvailabilityDb as any).getByPropertyId = origPropAvailability;
  (bookingDb as any).getBlocksByPropertyId = origBookingBlocks;
}

console.log('P2.2 Task 3 customer booking privacy and IDOR tests passed.');

// ---------------------------------------------------------------------------
// 4. Task 4: Migration 028 and atomic Favorites RPC static contract tests
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.resolve(process.cwd(), 'database/migrations/028_customer_favorites.sql');
assert.ok(fs.existsSync(migrationPath), 'Migration file 028_customer_favorites.sql must exist');

const sql = fs.readFileSync(migrationPath, 'utf8');

// 4A. Table DDL assertions
assert.match(sql, /CREATE TABLE public\.customer_favorites/i);
assert.match(sql, /customer_id UUID NOT NULL REFERENCES public\.users\(id\) ON DELETE CASCADE/i);
assert.match(sql, /property_id UUID NOT NULL REFERENCES public\.properties\(id\) ON DELETE CASCADE/i);
assert.match(sql, /PRIMARY KEY\s*\(\s*customer_id\s*,\s*property_id\s*\)/i);
assert.match(sql, /CREATE INDEX customer_favorites_customer_created_idx\s+ON public\.customer_favorites\s*\(\s*customer_id\s*,\s*created_at DESC\s*\)/i);
assert.match(sql, /ALTER TABLE public\.customer_favorites ENABLE ROW LEVEL SECURITY/i);
assert.match(sql, /REVOKE ALL ON TABLE public\.customer_favorites FROM PUBLIC,\s*anon,\s*authenticated/i);
// F1: Table ACL has no service-role UPDATE grant
assert.doesNotMatch(sql, /GRANT\s+[^;]*UPDATE[^;]*\s+TO\s+service_role/i, 'Table ACL must NOT grant UPDATE to service_role');
assert.match(sql, /GRANT SELECT,\s*INSERT,\s*DELETE ON TABLE public\.customer_favorites TO service_role/i);

// 4B. RPC Security & Isolation assertions
assert.match(sql, /FUNCTION public\.konfrm_add_customer_favorite\s*\(\s*p_customer_id UUID,\s*p_property_id UUID\s*\)/i);
assert.match(sql, /SECURITY INVOKER/i, 'RPC MUST be SECURITY INVOKER');
assert.doesNotMatch(sql, /SECURITY DEFINER/i, 'SECURITY DEFINER is strictly forbidden');
assert.match(sql, /SET search_path = public,\s*pg_temp/i, 'search_path must be pinned to public, pg_temp');
assert.match(sql, /status\s*=\s*'PUBLISHED'/i, 'Must check status = PUBLISHED');
assert.match(sql, /verification_status\s*=\s*'VERIFIED'/i, 'Must check verification_status = VERIFIED');
assert.match(sql, /deleted_at IS NULL/i, 'Must check deleted_at IS NULL');
// F1: RPC duplicate strategy contains NO DO UPDATE, uses ON CONFLICT DO NOTHING
assert.doesNotMatch(sql, /DO\s+UPDATE/i, 'RPC duplicate strategy must NOT contain DO UPDATE');
assert.match(sql, /ON CONFLICT\s*\(\s*customer_id\s*,\s*property_id\s*\)\s*DO NOTHING/i, 'RPC must use ON CONFLICT DO NOTHING');
assert.match(sql, /REVOKE ALL ON FUNCTION public\.konfrm_add_customer_favorite/i, 'Must revoke execute from public/anon/authenticated');
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.konfrm_add_customer_favorite\(UUID,\s*UUID\)\s+TO service_role/i, 'Grant execute to service_role only');
assert.match(sql, /INSERT INTO public\.schema_migrations/i, 'Must record migration in schema_migrations');
assert.match(sql, /028_customer_favorites\.sql/i, 'Must record version 028_customer_favorites.sql');

console.log('P2.2 Task 4 migration 028 contract tests passed.');

// 4C. Migration 029 ACL Hardening static contract tests
const migration029Path = path.resolve(process.cwd(), 'database/migrations/029_customer_favorites_acl_hardening.sql');
assert.ok(fs.existsSync(migration029Path), 'Migration file 029_customer_favorites_acl_hardening.sql must exist');

const sql029 = fs.readFileSync(migration029Path, 'utf8');

// 1. Must execute REVOKE ALL ON TABLE public.customer_favorites FROM service_role
assert.match(
  sql029,
  /REVOKE\s+ALL\s+ON\s+TABLE\s+public\.customer_favorites\s+FROM\s+service_role/i,
  'Migration 029 must revoke all on customer_favorites from service_role'
);

// 2. The revoke appears before the replacement grant
const revokeIndex = sql029.search(/REVOKE\s+ALL\s+ON\s+TABLE\s+public\.customer_favorites\s+FROM\s+service_role/i);
const grantIndex = sql029.search(/GRANT\s+SELECT,\s*INSERT,\s*DELETE\s+ON\s+TABLE\s+public\.customer_favorites\s+TO\s+service_role/i);
assert.ok(revokeIndex !== -1, 'REVOKE ALL must be present');
assert.ok(grantIndex !== -1, 'GRANT SELECT, INSERT, DELETE must be present');
assert.ok(revokeIndex < grantIndex, 'REVOKE ALL must appear BEFORE the replacement GRANT');

// 3. The only replacement table grant to service_role in migration 029 is SELECT, INSERT, DELETE
assert.match(
  sql029,
  /GRANT\s+SELECT,\s*INSERT,\s*DELETE\s+ON\s+TABLE\s+public\.customer_favorites\s+TO\s+service_role/i,
  'Migration 029 replacement grant must be exactly SELECT, INSERT, DELETE'
);

// 4. Migration 029 does not grant UPDATE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN, or ALL to service_role
for (const forbiddenPriv of ['UPDATE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN', 'ALL']) {
  const regex = new RegExp(`GRANT\\s+[^;]*\\b${forbiddenPriv}\\b[^;]*TO\\s+service_role`, 'i');
  assert.doesNotMatch(
    sql029,
    regex,
    `Migration 029 must not grant ${forbiddenPriv} to service_role`
  );
}

// 5. Migration 029 records 029_customer_favorites_acl_hardening.sql in public.schema_migrations
assert.match(
  sql029,
  /INSERT\s+INTO\s+public\.schema_migrations\s*\(\s*version\s*\)\s*VALUES\s*\(\s*'029_customer_favorites_acl_hardening\.sql'\s*\)/i,
  'Migration 029 must record 029_customer_favorites_acl_hardening.sql in schema_migrations'
);

console.log('P2.2 Task 4 migration 029 ACL hardening contract tests passed.');

// ---------------------------------------------------------------------------
// 5. Task 5: favoriteDb and exact Worker/PostgREST adapter tests
// ---------------------------------------------------------------------------
import { favoriteDb } from '../services/dbRepository.js';
import { queryDb } from '../services/dbClient.js';

assert.ok(favoriteDb, 'favoriteDb must be exported from dbRepository');
assert.equal(typeof favoriteDb.getByCustomerId, 'function');
assert.equal(typeof favoriteDb.add, 'function');
assert.equal(typeof favoriteDb.remove, 'function');

// 5A. Test PostgREST routing for favoriteDb
const originalFetch = globalThis.fetch;
const originalDbUrl = process.env.DATABASE_URL;
delete process.env.DATABASE_URL;
process.env.SUPABASE_URL = 'https://test-supabase.sola.eg';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

let lastFetchCall: { url: string; method?: string; headers?: any; body?: any } | null = null;
let mockFetchResponse: { status: number; body: any } = { status: 200, body: [] };

globalThis.fetch = (async (input: any, init?: any) => {
  lastFetchCall = {
    url: String(input),
    method: init?.method || 'GET',
    headers: init?.headers,
    body: init?.body ? JSON.parse(init.body) : undefined,
  };
  return new Response(JSON.stringify(mockFetchResponse.body), {
    status: mockFetchResponse.status,
    headers: { 'Content-Type': 'application/json' },
  });
}) as typeof fetch;

try {
  // 5B. favoriteDb.getByCustomerId
  mockFetchResponse = {
    status: 200,
    body: [
      { customer_id: testCustomerId, property_id: 'e0000000-0000-4000-8000-000000000002', created_at: '2026-09-03T12:00:00.000Z' },
    ],
  };
  const list = await favoriteDb.getByCustomerId(testCustomerId);
  assert.equal(list.length, 1);
  assert.equal(list[0].customerId, testCustomerId);
  assert.equal(list[0].propertyId, 'e0000000-0000-4000-8000-000000000002');
  assert.ok(lastFetchCall?.url.includes(`/rest/v1/customer_favorites?customer_id=eq.${testCustomerId}`));
  assert.ok(lastFetchCall?.url.includes('order=created_at.desc'));

  // 5C. favoriteDb.add - success (1 row)
  mockFetchResponse = {
    status: 200,
    body: [
      { customerId: testCustomerId, propertyId: 'e0000000-0000-4000-8000-000000000002', createdAt: '2026-09-03T12:00:00.000Z' },
    ],
  };
  const added = await favoriteDb.add(testCustomerId, 'e0000000-0000-4000-8000-000000000002');
  assert.ok(added);
  assert.equal(added.customerId, testCustomerId);
  assert.equal(lastFetchCall?.url, 'https://test-supabase.sola.eg/rest/v1/rpc/konfrm_add_customer_favorite');
  assert.equal(lastFetchCall?.method, 'POST');
  assert.deepEqual(lastFetchCall?.body, {
    p_customer_id: testCustomerId,
    p_property_id: 'e0000000-0000-4000-8000-000000000002',
  });

  // 5D. favoriteDb.add - not eligible / unverified (0 rows) returns null
  mockFetchResponse = { status: 200, body: [] };
  const addMiss = await favoriteDb.add(testCustomerId, 'e0000000-0000-4000-8000-000000000002');
  assert.equal(addMiss, null);

  // 5E. favoriteDb.add - cardinality > 1 throws
  mockFetchResponse = { status: 200, body: [{}, {}] };
  await assert.rejects(
    () => favoriteDb.add(testCustomerId, 'e0000000-0000-4000-8000-000000000002'),
    /CARDINALITY_INVALID/
  );

  // F2: favoriteDb.add - missing/invalid createdAt throws
  mockFetchResponse = {
    status: 200,
    body: [{ customerId: testCustomerId, propertyId: 'e0000000-0000-4000-8000-000000000002', createdAt: 'invalid-date' }],
  };
  await assert.rejects(
    () => favoriteDb.add(testCustomerId, 'e0000000-0000-4000-8000-000000000002'),
    /REST_CUSTOMER_FAVORITE_ADD_ROW_MALFORMED/
  );

  // F2: favoriteDb.add - returned customer/property mismatch throws
  mockFetchResponse = {
    status: 200,
    body: [{ customerId: '00000000-0000-4000-8000-000000000099', propertyId: 'e0000000-0000-4000-8000-000000000002', createdAt: '2026-09-03T12:00:00.000Z' }],
  };
  await assert.rejects(
    () => favoriteDb.add(testCustomerId, 'e0000000-0000-4000-8000-000000000002'),
    /REST_CUSTOMER_FAVORITE_ADD_ROW_MALFORMED/
  );

  // F2: favoriteDb.getByCustomerId - malformed row fails whole read
  mockFetchResponse = {
    status: 200,
    body: [{ customer_id: 'bad-uuid', property_id: 'bad', created_at: 'bad' }],
  };
  await assert.rejects(
    () => favoriteDb.getByCustomerId(testCustomerId),
    /REST_CUSTOMER_FAVORITES_ROW_MALFORMED/
  );

  // 5F. favoriteDb.remove
  mockFetchResponse = {
    status: 200,
    body: [
      { customer_id: testCustomerId, property_id: 'e0000000-0000-4000-8000-000000000002', created_at: '2026-09-03T12:00:00.000Z' },
    ],
  };
  await favoriteDb.remove(testCustomerId, 'e0000000-0000-4000-8000-000000000002');
  assert.equal(lastFetchCall?.method, 'DELETE');
  assert.ok(lastFetchCall?.url.includes(`customer_id=eq.${testCustomerId}`));
  assert.ok(lastFetchCall?.url.includes('property_id=eq.e0000000-0000-4000-8000-000000000002'));
  assert.equal(lastFetchCall?.headers?.['Prefer'], 'return=representation');

  // 5G. favoriteDb.remove - 0 rows (idempotent remove) succeeds without error
  mockFetchResponse = { status: 200, body: [] };
  await favoriteDb.remove(testCustomerId, 'e0000000-0000-4000-8000-000000000002');

  // F2: favoriteDb.remove - >1 rows throws
  mockFetchResponse = {
    status: 200,
    body: [
      { customer_id: testCustomerId, property_id: 'e0000000-0000-4000-8000-000000000002', created_at: '2026-09-03T12:00:00.000Z' },
      { customer_id: testCustomerId, property_id: 'e0000000-0000-4000-8000-000000000002', created_at: '2026-09-03T12:00:00.000Z' },
    ],
  };
  await assert.rejects(
    () => favoriteDb.remove(testCustomerId, 'e0000000-0000-4000-8000-000000000002'),
    /REST_CUSTOMER_FAVORITES_REMOVE_CARDINALITY_INVALID/
  );

  // F2: favoriteDb.remove - malformed one row throws
  mockFetchResponse = {
    status: 200,
    body: [{ customer_id: 'bad-uuid', property_id: 'bad', created_at: 'bad' }],
  };
  await assert.rejects(
    () => favoriteDb.remove(testCustomerId, 'e0000000-0000-4000-8000-000000000002'),
    /REST_CUSTOMER_FAVORITES_REMOVE_ROW_MALFORMED/
  );

  // 5H. Strict collision safety - query shapes that merely mention RPC/table must not match
  lastFetchCall = null;
  await assert.rejects(
    () => queryDb('SELECT * FROM customer_favorites', []),
    /POOL_QUERY_ERROR/
  );
  assert.equal(lastFetchCall, null, 'arbitrary SELECT customer_favorites must not route to PostgREST');

  await assert.rejects(
    () => queryDb('/* comment */ SELECT * FROM konfrm_add_customer_favorite($1, $2)', [testCustomerId, 'p2']),
    /POOL_QUERY_ERROR/
  );
  assert.equal(lastFetchCall, null, 'comment-prefixed RPC must not route to PostgREST');

  await assert.rejects(
    () => queryDb('SELECT * FROM konfrm_add_customer_favorite($1)', [testCustomerId]),
    /POOL_QUERY_ERROR/
  );
  assert.equal(lastFetchCall, null, 'wrong placeholder count must not route to PostgREST');
} finally {
  globalThis.fetch = originalFetch;
  if (originalDbUrl) process.env.DATABASE_URL = originalDbUrl;
}

console.log('P2.2 Task 5 favoriteDb and Worker adapter tests passed.');

// ---------------------------------------------------------------------------
// 6. Task 6: Authenticated Favorites routes tests
// ---------------------------------------------------------------------------
const ownerToken = signAccessToken({ sub: 'owner-uuid-1', role: 'ROLE_OWNER' });
const ownerHeaders = { authorization: `Bearer ${ownerToken}` };

const testPropId = 'e0000000-0000-4000-8000-000000000002';
const nonPublicPropId = 'e0000000-0000-4000-8000-000000000003';

// 6A. Unauthorized / Forbidden role tests
const unauthGet = await app.handleHttpRequest('GET', '/api/v1/customer/favorites');
assert.equal(unauthGet.statusCode, 401, 'Anonymous request must return 401');

const ownerFavGet = await app.handleHttpRequest('GET', '/api/v1/customer/favorites', ownerHeaders);
assert.equal(ownerFavGet.statusCode, 403, 'Owner token must return 403');

const ownerFavPost = await app.handleHttpRequest('POST', `/api/v1/customer/favorites/${testPropId}`, ownerHeaders);
assert.equal(ownerFavPost.statusCode, 403, 'Owner POST must return 403');

const ownerFavDelete = await app.handleHttpRequest('DELETE', `/api/v1/customer/favorites/${testPropId}`, ownerHeaders);
assert.equal(ownerFavDelete.statusCode, 403, 'Owner DELETE must return 403');

// 6B. In-memory stubs for route testing
let mockCustomerFavorites: Array<{ customerId: string; propertyId: string; createdAt: string }> = [];
const origFavGetByCustomerId = favoriteDb.getByCustomerId;
const origFavAdd = favoriteDb.add;
const origFavRemove = favoriteDb.remove;
const origPropGetPublicById = propertyDb.getPublicById;
const origImageGetImages = imageDb.getImagesByPropertyId;

(favoriteDb as any).getByCustomerId = async (cid: string) => {
  return mockCustomerFavorites.filter((f) => f.customerId === cid);
};

(favoriteDb as any).add = async (cid: string, pid: string) => {
  if (pid === nonPublicPropId) return null; // simulates unverified / unpublished
  let existing = mockCustomerFavorites.find((f) => f.customerId === cid && f.propertyId === pid);
  if (!existing) {
    existing = { customerId: cid, propertyId: pid, createdAt: '2026-09-03T12:00:00.000Z' };
    mockCustomerFavorites.push(existing);
  }
  return existing;
};

(favoriteDb as any).remove = async (cid: string, pid: string) => {
  mockCustomerFavorites = mockCustomerFavorites.filter((f) => !(f.customerId === cid && f.propertyId === pid));
};

(propertyDb as any).getPublicById = async (pid: string) => {
  if (pid === testPropId) {
    return {
      id: testPropId,
      title: 'شاليه مراسي فاخر',
      unitType: 'CHALET',
      propertyType: 'CHALET',
      address: 'مراسي',
      region: 'الساحل الشمالي',
      resortName: 'مراسي',
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 4,
      basePricePerNight: 6000,
    };
  }
  return null; // nonPublicPropId or unknown is not public
};

(imageDb as any).getImagesByPropertyId = async (pid: string) => {
  if (pid === testPropId) {
    return [
      { id: 'img-1', propertyId: pid, fileUrl: 'https://storage.sola.eg/p1.jpg', isPrimary: true, status: 'ACTIVE' },
    ];
  }
  return [];
};

try {
  // 6C. Add eligible property -> 200 { propertyId, isFavorite: true }
  const addRes = await app.handleHttpRequest('POST', `/api/v1/customer/favorites/${testPropId}`, customerHeaders);
  assert.equal(addRes.statusCode, 200);
  assert.deepEqual((addRes.body as any).data, { propertyId: testPropId, isFavorite: true });

  // 6D. Duplicate add -> idempotent 200 { propertyId, isFavorite: true }
  const dupAddRes = await app.handleHttpRequest('POST', `/api/v1/customer/favorites/${testPropId}`, customerHeaders);
  assert.equal(dupAddRes.statusCode, 200);
  assert.deepEqual((dupAddRes.body as any).data, { propertyId: testPropId, isFavorite: true });

  // 6E. Add non-public property -> 404 PROPERTY_NOT_FOUND
  const missAddRes = await app.handleHttpRequest('POST', `/api/v1/customer/favorites/${nonPublicPropId}`, customerHeaders);
  assert.equal(missAddRes.statusCode, 404);
  assert.equal((missAddRes.body as any).error?.code, 'PROPERTY_NOT_FOUND');

  // 6F. GET favorites list includes hydrated public property
  const favListRes = await app.handleHttpRequest('GET', '/api/v1/customer/favorites', customerHeaders);
  assert.equal(favListRes.statusCode, 200);
  const favItems = (favListRes.body as any).data;
  assert.equal(favItems.length, 1);
  assert.equal(favItems[0].id, testPropId);
  assert.equal(favItems[0].title, 'شاليه مراسي فاخر');
  assert.deepEqual(favItems[0].images, ['https://storage.sola.eg/p1.jpg']);

  // 6G. Non-public saved property is hidden from visible list, but intent row remains
  mockCustomerFavorites.push({
    customerId: testCustomerId,
    propertyId: nonPublicPropId,
    createdAt: '2026-09-03T12:01:00.000Z',
  });
  const favListWithHidden = await app.handleHttpRequest('GET', '/api/v1/customer/favorites', customerHeaders);
  assert.equal(favListWithHidden.statusCode, 200);
  assert.equal((favListWithHidden.body as any).data.length, 1, 'non-public saved property must be hidden from list');
  assert.equal(mockCustomerFavorites.some((f) => f.propertyId === nonPublicPropId), true, 'favorite row must remain saved');

  // 6H. Customer A vs Customer B isolation
  const customerBToken = signAccessToken({ sub: '00000000-0000-4000-8000-000000000099', role: 'ROLE_CUSTOMER' });
  const favListB = await app.handleHttpRequest('GET', '/api/v1/customer/favorites', { authorization: `Bearer ${customerBToken}` });
  assert.equal(favListB.statusCode, 200);
  assert.equal((favListB.body as any).data.length, 0, 'Customer B cannot see Customer A favorites');

  // 6I. Delete favorite -> 200 { propertyId, isFavorite: false }
  const delRes = await app.handleHttpRequest('DELETE', `/api/v1/customer/favorites/${testPropId}`, customerHeaders);
  assert.equal(delRes.statusCode, 200);
  assert.deepEqual((delRes.body as any).data, { propertyId: testPropId, isFavorite: false });

  // 6J. Delete missing favorite -> idempotent 200 { propertyId, isFavorite: false }
  const delMissingRes = await app.handleHttpRequest('DELETE', `/api/v1/customer/favorites/${testPropId}`, customerHeaders);
  assert.equal(delMissingRes.statusCode, 200);
  assert.deepEqual((delMissingRes.body as any).data, { propertyId: testPropId, isFavorite: false });

  // 6L. F3: Invalid path UUID returns 400 without repository mutation
  const invalidUuidPost = await app.handleHttpRequest('POST', '/api/v1/customer/favorites/invalid-uuid', customerHeaders);
  assert.equal(invalidUuidPost.statusCode, 400);
  assert.equal((invalidUuidPost.body as any).error?.code, 'INVALID_PROPERTY_ID');

  const invalidUuidDel = await app.handleHttpRequest('DELETE', '/api/v1/customer/favorites/invalid-uuid', customerHeaders);
  assert.equal(invalidUuidDel.statusCode, 400);
  assert.equal((invalidUuidDel.body as any).error?.code, 'INVALID_PROPERTY_ID');

  // 6M. F3: POST returns 500 if favoriteDb.add returns malformed or mismatched row
  (favoriteDb as any).add = async () => ({
    customerId: testCustomerId,
    propertyId: '00000000-0000-4000-8000-000000000099', // mismatched property ID
    createdAt: '2026-09-03T12:00:00.000Z',
  });
  const mismatchAddRes = await app.handleHttpRequest('POST', `/api/v1/customer/favorites/${testPropId}`, customerHeaders);
  assert.equal(mismatchAddRes.statusCode, 500);
  assert.equal((mismatchAddRes.body as any).error?.code, 'CUSTOMER_FAVORITE_ADD_FAILED');

  // 6N. F7: Account Summary malformed deposit amount returns 500
  const origGetBookings = bookingDb.getByCustomerId;
  try {
    (bookingDb as any).getByCustomerId = async () => [
      {
        id: 'b-1',
        customerId: testCustomerId,
        propertyId: testPropId,
        status: 'CONFIRMED',
        checkIn: '2026-10-01',
        checkOut: '2026-10-05',
        depositAmount: 'not-a-valid-number',
        createdAt: '2026-09-01T00:00:00.000Z',
      },
    ];
    const malformedDepositSummaryRes = await app.handleHttpRequest('GET', '/api/v1/customer/account/summary', customerHeaders);
    assert.equal(malformedDepositSummaryRes.statusCode, 500);
    assert.equal((malformedDepositSummaryRes.body as any).error?.code, 'CUSTOMER_ACCOUNT_SUMMARY_QUERY_FAILED');
  } finally {
    (bookingDb as any).getByCustomerId = origGetBookings;
  }
} finally {
  (favoriteDb as any).getByCustomerId = origFavGetByCustomerId;
  (favoriteDb as any).add = origFavAdd;
  (favoriteDb as any).remove = origFavRemove;
  (propertyDb as any).getPublicById = origPropGetPublicById;
  (imageDb as any).getImagesByPropertyId = origImageGetImages;
}

console.log('P2.2 Task 6 authenticated favorites routes tests passed.');

// ---------------------------------------------------------------------------
// 7. Task 7: C3-F4 Real Hydration Regression & Source Contract Tests
// ---------------------------------------------------------------------------
const dbRepoPath = path.resolve(process.cwd(), 'server/src/services/dbRepository.ts');
const dbRepoSrc = fs.readFileSync(dbRepoPath, 'utf8');

// C3-F1 source contract assertions
assert.doesNotMatch(dbRepoSrc, /bedrooms:\s*Number\([^)]*\)\s*\|\|\s*0/i, 'Must not fabricate bedrooms || 0 in hydrateBooking');
assert.doesNotMatch(dbRepoSrc, /bathrooms:\s*Number\([^)]*\)\s*\|\|\s*0/i, 'Must not fabricate bathrooms || 0 in hydrateBooking');
assert.doesNotMatch(dbRepoSrc, /maxGuests:\s*Number\([^)]*\)\s*\|\|\s*0/i, 'Must not fabricate maxGuests || 0 in hydrateBooking');

// Behavioral hydration tests via hydrateBooking
import { hydrateBooking } from '../services/dbRepository.js';

// Setup stubs for propertyDb.getById and bookingDb.getFinancialSummary
const origPropGetByIdForHydrate = propertyDb.getById;
const origFinGetForHydrate = bookingDb.getFinancialSummary;
try {
  // Test A: missing bedrooms on property remains undefined / does not become 0
  (propertyDb as any).getById = async () => ({
    id: 'e0000000-0000-4000-8000-000000000002',
    title: 'شاليه',
    images: ['https://storage.sola.eg/p1.jpg'],
    address: 'مراسي',
    // bedrooms missing!
    bathrooms: 2,
    maxGuests: 4,
    pricePerNight: 2000,
  });
  (bookingDb as any).getFinancialSummary = async () => ({
    totalBookingValue: 4000,
    depositAmount: 2000,
    remainingBalance: 2000,
    solaCommissionAmount: 400,
    ownerNetDepositAmount: 1600,
  });

  const hydratedMissingBedrooms = await hydrateBooking({
    id: 'b0000000-0000-4000-8000-000000000001',
    bookingNumber: 'BK-123456',
    propertyId: 'e0000000-0000-4000-8000-000000000002',
    customerId: testCustomerId,
    guestName: 'عميل',
    checkIn: '2026-12-20',
    checkOut: '2026-12-22',
    nights: 2,
    guestsCount: 2,
    status: 'CONFIRMED',
    createdAt: '2026-09-03T12:00:00.000Z',
  });

  assert.notEqual(hydratedMissingBedrooms.property.bedrooms, 0, 'Missing bedrooms must NOT be fabricated as 0');
  assert.throws(
    () => toCustomerBookingDetailDto(hydratedMissingBedrooms),
    /CUSTOMER_BOOKING_PROPERTY_DATA/,
    'Hydrated booking with missing bedrooms must fail closed in toCustomerBookingDetailDto'
  );

  // Test B: nullish financial values must NOT become numeric 0
  (propertyDb as any).getById = async () => ({
    id: 'e0000000-0000-4000-8000-000000000002',
    title: 'شاليه',
    images: ['https://storage.sola.eg/p1.jpg'],
    address: 'مراسي',
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    pricePerNight: 2000,
  });
  (bookingDb as any).getFinancialSummary = async () => ({
    totalBookingValue: 4000,
    depositAmount: null, // null deposit
    remainingBalance: 2000,
    solaCommissionAmount: 400,
    ownerNetDepositAmount: 1600,
  });

  const hydratedNullDeposit = await hydrateBooking({
    id: 'b0000000-0000-4000-8000-000000000001',
    bookingNumber: 'BK-123456',
    propertyId: 'e0000000-0000-4000-8000-000000000002',
    customerId: testCustomerId,
    guestName: 'عميل',
    checkIn: '2026-12-20',
    checkOut: '2026-12-22',
    nights: 2,
    guestsCount: 2,
    status: 'CONFIRMED',
    createdAt: '2026-09-03T12:00:00.000Z',
  });

  assert.notEqual(hydratedNullDeposit.depositAmount, 0, 'Null depositAmount must NOT become numeric 0');
  assert.throws(
    () => toCustomerBookingDetailDto(hydratedNullDeposit),
    /CUSTOMER_BOOKING_DATA/,
    'Hydrated booking with null depositAmount must fail closed in toCustomerBookingDetailDto'
  );
} finally {
  (propertyDb as any).getById = origPropGetByIdForHydrate;
  (bookingDb as any).getFinancialSummary = origFinGetForHydrate;
}

console.log('P2.2 Task 7 real hydration regression and source contract tests passed.');

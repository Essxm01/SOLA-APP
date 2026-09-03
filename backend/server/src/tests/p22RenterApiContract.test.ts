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
assert.equal(listItem.guests, 3);
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

// 1D. CustomerBookingDetailDto tests
const detailItem = toCustomerBookingDetailDto(poisonedBooking);
for (const forbidden of [
  'ownerId', 'customerId', 'guestPhone', 'financialSummary',
  'solaCommissionAmount', 'ownerNetDepositAmount', 'commissionOnRemainingBalance', 'ownerPayoutStatus',
  'payoutId', 'walletId', 'ledgerId',
]) {
  assert.equal(forbidden in (detailItem as any), false, `${forbidden} must not leak in detailItem`);
}
assert.equal(detailItem.totalStay, 12000);
assert.equal(detailItem.depositAmount, 6000);
assert.equal(detailItem.remainingAmount, 6000);
assert.equal(detailItem.currency, 'EGP');
assert.equal(detailItem.guestName, 'ضيف اختبار');
assert.equal(detailItem.guestEmail, 'guest@example.com');

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
import { userDb, bookingDb } from '../services/dbRepository.js';

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



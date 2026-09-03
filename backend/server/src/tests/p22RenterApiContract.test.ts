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
  'ownerId', 'customerId', 'guestPhone',
  'solaCommissionAmount', 'ownerNetDepositAmount', 'commissionOnRemainingBalance', 'ownerPayoutStatus',
  'payoutId', 'walletId', 'ledgerId',
]) {
  assert.equal(forbidden in (createResponseDto as any), false, `${forbidden} must not leak in createResponseDto`);
  assert.equal(forbidden in (createResponseDto.financialSummary as any), false, `${forbidden} must not leak in createResponseDto.financialSummary`);
}
assert.equal(createResponseDto.totalStay, 12000);
assert.equal(createResponseDto.depositAmount, 6000);
assert.equal(createResponseDto.remainingAmount, 6000);
assert.equal(createResponseDto.currency, 'EGP');
assert.equal(createResponseDto.financialSummary.depositAmount, 6000);
assert.equal(createResponseDto.financialSummary.totalBookingValue, 12000);

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
assert.match(sql, /GRANT SELECT,\s*INSERT,\s*DELETE ON TABLE public\.customer_favorites TO service_role/i);

// 4B. RPC Security & Isolation assertions
assert.match(sql, /FUNCTION public\.konfrm_add_customer_favorite\s*\(\s*p_customer_id UUID,\s*p_property_id UUID\s*\)/i);
assert.match(sql, /SECURITY INVOKER/i, 'RPC MUST be SECURITY INVOKER');
assert.doesNotMatch(sql, /SECURITY DEFINER/i, 'SECURITY DEFINER is strictly forbidden');
assert.match(sql, /SET search_path = public,\s*pg_temp/i, 'search_path must be pinned to public, pg_temp');
assert.match(sql, /status\s*=\s*'PUBLISHED'/i, 'Must check status = PUBLISHED');
assert.match(sql, /verification_status\s*=\s*'VERIFIED'/i, 'Must check verification_status = VERIFIED');
assert.match(sql, /deleted_at IS NULL/i, 'Must check deleted_at IS NULL');
assert.match(sql, /ON CONFLICT\s*\(\s*customer_id\s*,\s*property_id\s*\)\s*DO UPDATE SET created_at\s*=/i, 'Must be idempotent on conflict');
assert.match(sql, /REVOKE ALL ON FUNCTION public\.konfrm_add_customer_favorite/i, 'Must revoke execute from public/anon/authenticated');
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.konfrm_add_customer_favorite\(UUID,\s*UUID\)\s+TO service_role/i, 'Grant execute to service_role only');
assert.match(sql, /INSERT INTO public\.schema_migrations/i, 'Must record migration in schema_migrations');
assert.match(sql, /028_customer_favorites\.sql/i, 'Must record version 028_customer_favorites.sql');

console.log('P2.2 Task 4 migration 028 contract tests passed.');

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






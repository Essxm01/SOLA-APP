import assert from 'node:assert/strict';
import { ExpressServerApp } from '../app.js';
import { signAccessToken } from '../services/jwtService.js';
import { ownerDb, propertyDb, bookingDb, walletDb, propertyAvailabilityDb } from '../services/dbRepository.js';

const app = new ExpressServerApp();

const ownerA = '00000000-0000-4000-8000-000000000001';
const ownerB = '00000000-0000-4000-8000-000000000002';
const customerId = 'c0000000-0000-4000-8000-000000000001';

const ownerTokenA = signAccessToken({ sub: ownerA, role: 'ROLE_OWNER' });
const ownerTokenB = signAccessToken({ sub: ownerB, role: 'ROLE_OWNER' });
const customerToken = signAccessToken({ sub: customerId, role: 'ROLE_CUSTOMER' });

const ownerHeaders = (token = ownerTokenA) => ({ authorization: `Bearer ${token}` });
const customerHeaders = { authorization: `Bearer ${customerToken}` };

// ---------------------------------------------------------------------------
// 1. Task 1: Owner Profile fail-closed and auth tests
// ---------------------------------------------------------------------------

// 1A. Role enforcement: Customer token rejected with 403 on /api/v1/owner/profile
{
  const res = await app.handleHttpRequest('GET', '/api/v1/owner/profile', customerHeaders);
  assert.equal(res.statusCode, 403, 'Customer token must be rejected with 403 on owner profile');
}

// 1B. Profile DB error must return 500 OWNER_PROFILE_QUERY_FAILED, NOT 404
{
  const origGetById = ownerDb.getById;
  (ownerDb as any).getById = async () => {
    throw new Error('database unavailable');
  };
  try {
    const failed = await app.handleHttpRequest('GET', '/api/v1/owner/profile', ownerHeaders());
    assert.equal(failed.statusCode, 500, 'DB outage must return 500, not 404');
    assert.equal((failed.body as any).error?.code, 'OWNER_PROFILE_QUERY_FAILED');
  } finally {
    (ownerDb as any).getById = origGetById;
  }
}

// 1C. Genuine missing owner row returns 404
{
  const origGetById = ownerDb.getById;
  (ownerDb as any).getById = async () => null;
  try {
    const missing = await app.handleHttpRequest('GET', '/api/v1/owner/profile', ownerHeaders());
    assert.equal(missing.statusCode, 404);
    assert.equal((missing.body as any).error?.code, 'OWNER_PROFILE_NOT_FOUND');
  } finally {
    (ownerDb as any).getById = origGetById;
  }
}

// 1D. toOwnerProfileDto unit assertions
import { toOwnerProfileDto } from '../contracts/ownerCore.js';

const rawOwnerRow = {
  id: ownerA,
  phoneNumber: '+201000000001',
  fullName: 'مالك عقار',
  email: 'owner@example.com',
  avatarUrl: 'https://storage.sola.eg/avatar.jpg',
  status: 'ACTIVE',
  verificationStatus: 'VERIFIED',
  ownerOnboardingCompletedAt: '2026-09-01T00:00:00.000Z',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
  // Poisoned internal fields
  passwordHash: 'secret-hash',
  nationalId: '12345678901234',
  kycDocFrontKey: 'private-doc-front.pdf',
  internalFlags: { isVip: true },
};

const profileDto = toOwnerProfileDto(rawOwnerRow);
assert.deepEqual(Object.keys(profileDto).sort(), [
  'avatarUrl', 'createdAt', 'email', 'fullName', 'id', 'ownerOnboardingCompletedAt',
  'phoneNumber', 'status', 'updatedAt', 'verificationStatus',
].sort());
assert.equal(profileDto.id, ownerA);
assert.equal(profileDto.fullName, 'مالك عقار');
assert.equal('passwordHash' in profileDto, false);
assert.equal('nationalId' in profileDto, false);
assert.equal('kycDocFrontKey' in profileDto, false);
assert.equal('internalFlags' in profileDto, false);

// Fail closed on malformed required fields
assert.throws(() => toOwnerProfileDto({ ...rawOwnerRow, id: '' }), /MALFORMED_OWNER_PROFILE/);
assert.throws(() => toOwnerProfileDto({ ...rawOwnerRow, phoneNumber: null }), /MALFORMED_OWNER_PROFILE/);
assert.throws(() => toOwnerProfileDto({ ...rawOwnerRow, status: '' }), /MALFORMED_OWNER_PROFILE/);
assert.throws(() => toOwnerProfileDto({ ...rawOwnerRow, createdAt: '' }), /MALFORMED_OWNER_PROFILE/);

// Nullable fields preserve null
const nullDto = toOwnerProfileDto({ ...rawOwnerRow, fullName: null, email: null, avatarUrl: null, ownerOnboardingCompletedAt: null });
assert.equal(nullDto.fullName, null);
assert.equal(nullDto.email, null);
assert.equal(nullDto.avatarUrl, null);
assert.equal(nullDto.ownerOnboardingCompletedAt, null);

// 1E. PUT /api/v1/owner/profile tests
{
  const origGetById = ownerDb.getById;
  const origUpdate = ownerDb.updateProfile;
  try {
    // DB error on existing check -> 500
    (ownerDb as any).getById = async () => { throw new Error('db down'); };
    const res500 = await app.handleHttpRequest('PUT', '/api/v1/owner/profile', ownerHeaders(), { fullName: 'جديد' });
    assert.equal(res500.statusCode, 500);

    // Missing owner -> 404
    (ownerDb as any).getById = async () => null;
    const res404 = await app.handleHttpRequest('PUT', '/api/v1/owner/profile', ownerHeaders(), { fullName: 'جديد' });
    assert.equal(res404.statusCode, 404);

    // Successful update returns sanitized DTO
    (ownerDb as any).getById = async () => ({ ...rawOwnerRow });
    (ownerDb as any).updateProfile = async () => ({ ...rawOwnerRow, fullName: 'مالك محدث' });
    const res200 = await app.handleHttpRequest('PUT', '/api/v1/owner/profile', ownerHeaders(), { fullName: 'مالك محدث' });
    assert.equal(res200.statusCode, 200);
    assert.equal((res200.body as any).data.fullName, 'مالك محدث');
    assert.equal('passwordHash' in (res200.body as any).data, false);
  } finally {
    (ownerDb as any).getById = origGetById;
    (ownerDb as any).updateProfile = origUpdate;
  }
}

console.log('P2.3 Task 1 owner profile contract tests passed.');

// ---------------------------------------------------------------------------
// 2. Task 2: Owner Property Contract and Public Compatibility
// ---------------------------------------------------------------------------
import { toOwnerPropertyDto } from '../contracts/ownerCore.js';

const propertyIdA = 'p0000000-0000-4000-8000-000000000001';
const rawPropertyRow = {
  id: propertyIdA,
  ownerId: ownerA,
  title: 'شاليه شاطئي فاخر',
  unitType: 'CHALET',
  propertyType: 'CHALET',
  address: '', // empty address is canonical product state
  bedrooms: 3,
  bathrooms: 2,
  maxGuests: 6,
  pricePerNight: 2500,
  basePricePerNight: 2500,
  description: 'وصف الشاليه',
  region: 'الساحل الشمالي',
  resortName: 'أمواج',
  areaSqM: 120,
  bedsCount: 4,
  amenities: ['WIFI', 'POOL'],
  houseRules: { noSmoking: true },
  status: 'PENDING_REVIEW',
  verificationStatus: 'UNVERIFIED',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
  images: ['https://storage.sola.eg/p1.jpg'],
};

// 2A. Unit: toOwnerPropertyDto preserves empty string address
{
  const dto = toOwnerPropertyDto(rawPropertyRow);
  assert.equal(dto.address, '', 'Empty string address must be preserved');
  assert.equal(dto.pricePerNight, 2500);
  assert.equal(dto.bedrooms, 3);
  assert.equal(dto.bathrooms, 2);
  assert.equal(dto.maxGuests, 6);
  assert.equal(dto.currency, 'EGP');
  assert.deepEqual(dto.images, ['https://storage.sola.eg/p1.jpg']);
}

// 2B. Unit: Malformed required fields fail closed
{
  assert.throws(() => toOwnerPropertyDto({ ...rawPropertyRow, id: '' }), /MALFORMED_OWNER_PROPERTY/);
  assert.throws(() => toOwnerPropertyDto({ ...rawPropertyRow, address: null as any }), /MALFORMED_OWNER_PROPERTY/);
  assert.throws(() => toOwnerPropertyDto({ ...rawPropertyRow, pricePerNight: 0 }), /MALFORMED_OWNER_PROPERTY/);
  assert.throws(() => toOwnerPropertyDto({ ...rawPropertyRow, bedrooms: -1 }), /MALFORMED_OWNER_PROPERTY/);
  assert.throws(() => toOwnerPropertyDto({ ...rawPropertyRow, maxGuests: 0 }), /MALFORMED_OWNER_PROPERTY/);
}

// 2C. Route: GET /api/v1/owner/properties DB failure returns 500
{
  const origGetByOwnerId = propertyDb.getByOwnerId;
  (propertyDb as any).getByOwnerId = async () => {
    throw new Error('db down');
  };
  try {
    const res = await app.handleHttpRequest('GET', '/api/v1/owner/properties', ownerHeaders());
    assert.equal(res.statusCode, 500);
    assert.equal((res.body as any).error?.code, 'OWNER_PROPERTIES_QUERY_FAILED');
  } finally {
    (propertyDb as any).getByOwnerId = origGetByOwnerId;
  }
}

// 2D. Route: GET /api/v1/owner/properties preserves empty address and returns sanitized DTOs
{
  const origGetByOwnerId = propertyDb.getByOwnerId;
  (propertyDb as any).getByOwnerId = async () => [{ ...rawPropertyRow }];
  try {
    const res = await app.handleHttpRequest('GET', '/api/v1/owner/properties', ownerHeaders());
    assert.equal(res.statusCode, 200);
    assert.equal((res.body as any).data.length, 1);
    assert.equal((res.body as any).data[0].address, '');
    assert.equal((res.body as any).data[0].id, propertyIdA);
  } finally {
    (propertyDb as any).getByOwnerId = origGetByOwnerId;
  }
}

// 2E. Route: PUT /api/v1/owner/properties/:id foreign owner returns 403
{
  const origGetById = propertyDb.getById;
  (propertyDb as any).getById = async () => ({ ...rawPropertyRow, ownerId: ownerB });
  try {
    const res = await app.handleHttpRequest('PUT', `/api/v1/owner/properties/${propertyIdA}`, ownerHeaders(ownerTokenA), { title: 'تعديل غريب' });
    assert.equal(res.statusCode, 403, 'Foreign owner property edit must be rejected with 403');
    assert.equal((res.body as any).error?.code, 'FORBIDDEN_PROPERTY_ACCESS');
  } finally {
    (propertyDb as any).getById = origGetById;
  }
}

console.log('P2.3 Task 2 owner property contract tests passed.');

// ---------------------------------------------------------------------------
// 3. Task 3: Calendar / Availability Regression Lock
// ---------------------------------------------------------------------------

// 3A. Foreign owner calendar read returns 403
{
  const origGetById = propertyDb.getById;
  (propertyDb as any).getById = async () => ({ ...rawPropertyRow, ownerId: ownerB });
  try {
    const res = await app.handleHttpRequest('GET', `/api/v1/owner/calendar/${propertyIdA}`, ownerHeaders(ownerTokenA));
    assert.equal(res.statusCode, 403, 'Foreign owner calendar read must return 403');
    assert.equal((res.body as any).error?.code, 'FORBIDDEN_PROPERTY_ACCESS');
  } finally {
    (propertyDb as any).getById = origGetById;
  }
}

// 3B. Foreign owner toggle-block returns 403
{
  const origGetById = propertyDb.getById;
  (propertyDb as any).getById = async () => ({ ...rawPropertyRow, ownerId: ownerB });
  try {
    const res = await app.handleHttpRequest('POST', '/api/v1/owner/calendar/toggle-block', ownerHeaders(ownerTokenA), {
      propertyId: propertyIdA,
      date: '2026-09-15',
      note: 'BLOCKED',
    });
    assert.equal(res.statusCode, 403, 'Foreign owner toggle-block must return 403');
    assert.equal((res.body as any).error?.code, 'FORBIDDEN_PROPERTY_ACCESS');
  } finally {
    (propertyDb as any).getById = origGetById;
  }
}

// 3C. Overlap with active booking in toggle-block returns 409 DATE_OVERLAP
{
  const origGetById = propertyDb.getById;
  const origSetBlocked = propertyAvailabilityDb.setBlockedForDate;
  (propertyDb as any).getById = async () => ({ ...rawPropertyRow, ownerId: ownerA });
  (propertyAvailabilityDb as any).setBlockedForDate = async () => {
    throw new Error('DATE_COVERED_BY_ACTIVE_BOOKING');
  };
  try {
    const res = await app.handleHttpRequest('POST', '/api/v1/owner/calendar/toggle-block', ownerHeaders(ownerTokenA), {
      propertyId: propertyIdA,
      date: '2026-09-15',
      note: 'BLOCKED',
    });
    assert.equal(res.statusCode, 409, 'Active booking overlap must return 409 DATE_OVERLAP');
    assert.equal((res.body as any).error?.code, 'DATE_OVERLAP');
  } finally {
    (propertyDb as any).getById = origGetById;
    (propertyAvailabilityDb as any).setBlockedForDate = origSetBlocked;
  }
}

// 3D. Calendar query failure in GET /api/v1/owner/calendar/:propertyId returns 500 AVAILABILITY_QUERY_FAILED
{
  const origGetById = propertyDb.getById;
  const origGetAvailability = propertyAvailabilityDb.getByPropertyId;
  (propertyDb as any).getById = async () => ({ ...rawPropertyRow, ownerId: ownerA });
  (propertyAvailabilityDb as any).getByPropertyId = async () => {
    throw new Error('availability db outage');
  };
  try {
    const res = await app.handleHttpRequest('GET', `/api/v1/owner/calendar/${propertyIdA}`, ownerHeaders(ownerTokenA));
    assert.equal(res.statusCode, 500, 'Calendar query outage must return 500 AVAILABILITY_QUERY_FAILED, never empty array');
    assert.equal((res.body as any).error?.code, 'AVAILABILITY_QUERY_FAILED');
  } finally {
    (propertyDb as any).getById = origGetById;
    (propertyAvailabilityDb as any).getByPropertyId = origGetAvailability;
  }
}

console.log('P2.3 Task 3 owner calendar availability contract tests passed.');

// ---------------------------------------------------------------------------
// 4. Task 4: Owner Booking DTOs + Canonical Financial Summary
// ---------------------------------------------------------------------------

// 4A. Financials must use canonical persisted summary, not hardcoded constants
{
  const testBookingId = 'b0000000-0000-4000-8000-000000000001';
  const origBookingGetById = bookingDb.getById;
  const origGetFinancialSummary = bookingDb.getFinancialSummary;

  (bookingDb as any).getById = async () => ({
    id: testBookingId,
    ownerId: ownerA,
    status: 'PENDING_OWNER_APPROVAL',
  });
  (bookingDb as any).getFinancialSummary = async () => ({
    bookingId: testBookingId,
    totalBookingValue: 9300,
    depositAmount: 2400,
    solaCommissionAmount: 480,
    ownerNetDepositAmount: 1920,
    remainingBalance: 6900,
    commissionOnRemainingBalance: 0,
    createdAt: '2026-09-04T00:00:00.000Z',
  });
  try {
    const res = await app.handleHttpRequest('GET', `/api/v1/owner/bookings/${testBookingId}/financials`, ownerHeaders(ownerTokenA));
    assert.equal(res.statusCode, 200);
    assert.equal((res.body as any).data.totalBookingValue, 9300, 'Must return canonical totalBookingValue 9300, not hardcoded 1500');
    assert.equal((res.body as any).data.depositAmount, 2400, 'Must return canonical depositAmount 2400, not hardcoded 500');
    assert.equal((res.body as any).data.ownerNetDepositAmount, 1920);
    assert.equal((res.body as any).data.remainingBalance, 6900);
    assert.equal((res.body as any).data.commissionOnRemainingBalance, 0);
    assert.equal((res.body as any).data.currency, 'EGP');
  } finally {
    (bookingDb as any).getById = origBookingGetById;
    (bookingDb as any).getFinancialSummary = origGetFinancialSummary;
  }
}

// 4B. Financials foreign owner returns 403
{
  const testBookingId = 'b0000000-0000-4000-8000-000000000001';
  const origBookingGetById = bookingDb.getById;
  (bookingDb as any).getById = async () => ({ id: testBookingId, ownerId: ownerB, status: 'PENDING_OWNER_APPROVAL' });
  try {
    const res = await app.handleHttpRequest('GET', `/api/v1/owner/bookings/${testBookingId}/financials`, ownerHeaders(ownerTokenA));
    assert.equal(res.statusCode, 403, 'Foreign owner must receive 403 BOOKING_NOT_OWNED');
    assert.equal((res.body as any).error?.code, 'BOOKING_NOT_OWNED');
  } finally {
    (bookingDb as any).getById = origBookingGetById;
  }
}

// 4C. Financials missing booking returns 404
{
  const testBookingId = 'b0000000-0000-4000-8000-000000000001';
  const origBookingGetById = bookingDb.getById;
  (bookingDb as any).getById = async () => null;
  try {
    const res = await app.handleHttpRequest('GET', `/api/v1/owner/bookings/${testBookingId}/financials`, ownerHeaders(ownerTokenA));
    assert.equal(res.statusCode, 404, 'Missing booking must receive 404 BOOKING_NOT_FOUND');
    assert.equal((res.body as any).error?.code, 'BOOKING_NOT_FOUND');
  } finally {
    (bookingDb as any).getById = origBookingGetById;
  }
}

// 4D. Financials query failure returns 500
{
  const testBookingId = 'b0000000-0000-4000-8000-000000000001';
  const origBookingGetById = bookingDb.getById;
  const origGetFinancialSummary = bookingDb.getFinancialSummary;
  (bookingDb as any).getById = async () => ({ id: testBookingId, ownerId: ownerA, status: 'PENDING_OWNER_APPROVAL' });
  (bookingDb as any).getFinancialSummary = async () => { throw new Error('summary db outage'); };
  try {
    const res = await app.handleHttpRequest('GET', `/api/v1/owner/bookings/${testBookingId}/financials`, ownerHeaders(ownerTokenA));
    assert.equal(res.statusCode, 500, 'Summary DB outage must receive 500');
    assert.equal((res.body as any).error?.code, 'BOOKING_FINANCIAL_SUMMARY_QUERY_FAILED');
  } finally {
    (bookingDb as any).getById = origBookingGetById;
    (bookingDb as any).getFinancialSummary = origGetFinancialSummary;
  }
}

// 4E. Unit assertions: toOwnerBookingFinancialDto and toOwnerBookingListItem
import { toOwnerBookingFinancialDto, toOwnerBookingListItem } from '../contracts/ownerCore.js';

// Financial DTO: reject commission on remaining balance > 0
assert.throws(
  () => toOwnerBookingFinancialDto({
    bookingId: 'b1',
    totalBookingValue: 1000,
    depositAmount: 500,
    solaCommissionAmount: 100,
    ownerNetDepositAmount: 400,
    remainingBalance: 500,
    commissionOnRemainingBalance: 50, // forbidden
  }),
  /commissionOnRemainingBalance must be 0/
);

// Booking item DTO: strips customer private accounts
const rawHydratedBooking = {
  id: 'b0000000-0000-4000-8000-000000000001',
  bookingNumber: 'BK-000001',
  propertyId: propertyIdA,
  ownerId: ownerA,
  customerId: customerId,
  guestName: 'أحمد مستأجر',
  checkIn: '2026-09-10',
  checkOut: '2026-09-14',
  nights: 4,
  guestsCount: 3,
  totalPrice: 10000,
  deposit: 2500,
  status: 'PENDING_OWNER_APPROVAL',
  createdAt: '2026-09-01T00:00:00.000Z',
  // Poisoned customer private fields
  customerPhoneNumber: '+201099999999',
  customerEmail: 'secret@renter.com',
  customerNationalId: '29901010101010',
  renter: { id: customerId, name: 'أحمد مستأجر', avatar: '', rating: 5, phone: '+201099999999' },
};
const itemDto = toOwnerBookingListItem(rawHydratedBooking);
assert.equal('customerPhoneNumber' in itemDto, false);
assert.equal('customerEmail' in itemDto, false);
assert.equal('customerNationalId' in itemDto, false);
assert.equal('phone' in (itemDto.renter as any), false);
assert.equal(itemDto.totalPrice, 10000);
assert.equal(itemDto.deposit, 2500);
assert.equal(itemDto.remainingAmount, 7500);

// 4F. Decision lifecycle: approve -> APPROVED_PENDING_PAYMENT, reject -> REJECTED
{
  const testBookingId = 'b0000000-0000-4000-8000-000000000001';
  const origBookingGetById = bookingDb.getById;
  const origUpdateStatus = bookingDb.updateStatusForOwner;
  const origGetBlocks = bookingDb.getBlocksByPropertyId;
  const origGetAvailability = propertyAvailabilityDb.getByPropertyId;

  (bookingDb as any).getById = async () => ({
    id: testBookingId,
    ownerId: ownerA,
    propertyId: propertyIdA,
    status: 'PENDING_OWNER_APPROVAL',
    checkIn: '2026-09-10',
    checkOut: '2026-09-14',
  });
  (bookingDb as any).getBlocksByPropertyId = async () => [];
  (propertyAvailabilityDb as any).getByPropertyId = async () => [];
  (bookingDb as any).updateStatusForOwner = async (id: string, owner: string, status: string) => ({
    id,
    ownerId: owner,
    status,
    bookingNumber: 'BK-000001',
  });

  try {
    const approveRes = await app.handleHttpRequest('POST', `/api/v1/owner/bookings/${testBookingId}/approve`, ownerHeaders(ownerTokenA));
    assert.equal(approveRes.statusCode, 200);
    assert.equal((approveRes.body as any).data.status, 'APPROVED_PENDING_PAYMENT', 'Owner approve must transition to APPROVED_PENDING_PAYMENT');

    const rejectRes = await app.handleHttpRequest('POST', `/api/v1/owner/bookings/${testBookingId}/reject`, ownerHeaders(ownerTokenA));
    assert.equal(rejectRes.statusCode, 200);
    assert.equal((rejectRes.body as any).data.status, 'REJECTED', 'Owner reject must transition to REJECTED');
  } finally {
    (bookingDb as any).getById = origBookingGetById;
    (bookingDb as any).updateStatusForOwner = origUpdateStatus;
    (bookingDb as any).getBlocksByPropertyId = origGetBlocks;
    (propertyAvailabilityDb as any).getByPropertyId = origGetAvailability;
  }
}

console.log('P2.3 Task 4 owner booking and financial contract tests passed.');

// ---------------------------------------------------------------------------
// 5. Task 5: Wallet Truth + Retire Fake Payout Success
// ---------------------------------------------------------------------------

// 5A. Wallet query error must remain 500
{
  const origWalletSummary = walletDb.getOwnerWalletSummary;
  (walletDb as any).getOwnerWalletSummary = async () => {
    throw new Error('database unavailable');
  };
  try {
    const wallet = await app.handleHttpRequest('GET', '/api/v1/owner/wallet', ownerHeaders(ownerTokenA));
    assert.equal(wallet.statusCode, 500);
    assert.equal((wallet.body as any).error?.code, 'WALLET_QUERY_FAILED');
  } finally {
    (walletDb as any).getOwnerWalletSummary = origWalletSummary;
  }
}

// 5B. Payout creation must NOT return synthetic 201 success
{
  const payout = await app.handleHttpRequest(
    'POST',
    '/api/v1/owner/payouts',
    { ...ownerHeaders(ownerTokenA), 'idempotency-key': 'p23-test-key' },
    { amount: 1000, payoutMethodId: 'test-method' },
  );
  assert.notEqual(payout.statusCode, 201, 'Fake payout must not return 201 synthetic success');
  assert.equal(payout.statusCode, 501);
  assert.equal((payout.body as any).error?.code, 'PAYOUT_NOT_AVAILABLE_IN_CURRENT_PROTOTYPE');
}

console.log('P2.3 Task 5 tests passed.');

// ---------------------------------------------------------------------------
// 6. Correction 01 Tests (RED)
// ---------------------------------------------------------------------------

// 6A. OwnerProfileDto fails closed when canonical fields are missing (no fabricated ACTIVE/UNVERIFIED/now)
{
  const baseProfile = {
    id: 'owner-test-1',
    phoneNumber: '+201000000001',
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  // Missing status
  assert.throws(
    () => toOwnerProfileDto({ ...baseProfile, status: undefined }),
    /missing or invalid status/,
    'Must fail closed when status is missing, not default to ACTIVE'
  );

  // Missing verificationStatus
  assert.throws(
    () => toOwnerProfileDto({ ...baseProfile, verificationStatus: undefined }),
    /missing or invalid verificationStatus/,
    'Must fail closed when verificationStatus is missing, not default to UNVERIFIED'
  );

  // Missing createdAt
  assert.throws(
    () => toOwnerProfileDto({ ...baseProfile, createdAt: undefined }),
    /missing or invalid createdAt/,
    'Must fail closed when createdAt is missing, not default to now'
  );

  // Missing updatedAt
  assert.throws(
    () => toOwnerProfileDto({ ...baseProfile, updatedAt: undefined }),
    /missing or invalid updatedAt/,
    'Must fail closed when updatedAt is missing, not default to now'
  );
}

// 6B. OwnerPropertyDto fails closed when timestamps are missing (no fabricated now)
{
  const baseProperty = {
    id: 'prop-test-1',
    ownerId: 'owner-test-1',
    title: 'شاليه تجريبي',
    unitType: 'CHALET',
    propertyType: 'CHALET',
    status: 'DRAFT',
    verificationStatus: 'UNVERIFIED',
    address: 'الساحل الشمالي',
    pricePerNight: 2000,
    bedrooms: 2,
    bathrooms: 1,
    maxGuests: 4,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  assert.throws(
    () => toOwnerPropertyDto({ ...baseProperty, createdAt: undefined }),
    /missing createdAt or updatedAt/,
    'Must fail closed when property createdAt is missing'
  );
}

// 6C. Financial mapping strictness: never coerce null/boolean/empty string to 0, require commissionOnRemainingBalance
{
  const validFinancials = {
    bookingId: 'bk-test-1',
    totalBookingValue: 10000,
    depositAmount: 2500,
    solaCommissionAmount: 500,
    ownerNetDepositAmount: 2000,
    remainingBalance: 7500,
    commissionOnRemainingBalance: 0,
  };

  // null totalBookingValue must throw, never coerce to 0
  assert.throws(
    () => toOwnerBookingFinancialDto({ ...validFinancials, totalBookingValue: null }),
    /missing or invalid totalBookingValue/,
    'null totalBookingValue must throw, never coerce to 0'
  );

  // boolean depositAmount must throw, never coerce to 0
  assert.throws(
    () => toOwnerBookingFinancialDto({ ...validFinancials, depositAmount: false }),
    /missing or invalid depositAmount/,
    'boolean depositAmount must throw, never coerce to 0'
  );

  // empty string remainingBalance must throw, never coerce to 0
  assert.throws(
    () => toOwnerBookingFinancialDto({ ...validFinancials, remainingBalance: '' }),
    /missing or invalid remainingBalance/,
    'empty string remainingBalance must throw, never coerce to 0'
  );

  // missing commissionOnRemainingBalance must throw, never silently default to 0
  const noCommission = { ...validFinancials };
  delete (noCommission as any).commissionOnRemainingBalance;
  assert.throws(
    () => toOwnerBookingFinancialDto(noCommission),
    /missing commissionOnRemainingBalance/,
    'missing commissionOnRemainingBalance must throw, never silently default to 0'
  );
}

// 6D. Owner booking list DTO must NOT fabricate bookingNumber, now timestamp, generic renter name, fake rating
{
  const validBookingItem = {
    id: 'b-test-1',
    bookingNumber: 'BK-123456',
    propertyId: 'p-test-1',
    checkIn: '2026-09-10',
    checkOut: '2026-09-14',
    nights: 4,
    guestsCount: 2,
    totalPrice: 8000,
    deposit: 2000,
    totalStay: 8000,
    depositAmount: 2000,
    remainingAmount: 6000,
    status: 'CONFIRMED',
    createdAt: '2026-09-01T00:00:00.000Z',
    financialSummary: {
      bookingId: 'b-test-1',
      totalBookingValue: 8000,
      depositAmount: 2000,
      solaCommissionAmount: 400,
      ownerNetDepositAmount: 1600,
      remainingBalance: 6000,
      commissionOnRemainingBalance: 0,
    },
  };

  // Missing bookingNumber must throw (no generated BK-xxx)
  assert.throws(
    () => toOwnerBookingListItem({ ...validBookingItem, bookingNumber: undefined }),
    /missing bookingNumber/,
    'Missing bookingNumber must fail closed, never generate fake BK-xxx'
  );

  // Missing createdAt must throw (no nowIso)
  assert.throws(
    () => toOwnerBookingListItem({ ...validBookingItem, createdAt: undefined }),
    /missing createdAt/,
    'Missing createdAt must fail closed, never default to now'
  );

  // Renter must NOT expose customerId as renter.id, nor fake rating, nor generic 'مستأجر'
  const itemWithoutGuestName = toOwnerBookingListItem({
    ...validBookingItem,
    customerId: 'cust-secret-uuid',
    guestName: undefined,
    renter: undefined,
  });
  assert.equal('id' in (itemWithoutGuestName.renter as any), false, 'Must not expose customerId as renter.id');
  assert.equal('rating' in (itemWithoutGuestName.renter as any), false, 'Must not fabricate fake rating');
  assert.equal(itemWithoutGuestName.renter.name, null, 'Missing guestName must be null, not generic مستأجر');

  // Broad raw property object must be restricted to explicit safe subset
  const itemWithRawProperty = toOwnerBookingListItem({
    ...validBookingItem,
    property: {
      id: 'p-test-1',
      title: 'شاليه بحري',
      locationName: 'مراسي',
      address: 'شارع البحر',
      images: ['https://example.com/img1.jpg'],
      internalAdminNotes: 'SECRET_ADMIN_DATA',
      ownerTaxId: 'SECRET_TAX_ID',
    },
  });
  assert.equal('internalAdminNotes' in (itemWithRawProperty.property as any), false, 'Safe subset must not leak raw internalAdminNotes');
  assert.equal('ownerTaxId' in (itemWithRawProperty.property as any), false, 'Safe subset must not leak raw ownerTaxId');
}

// 6E. Avatar preservation: PUT /api/v1/owner/profile edit without avatar must NOT clear canonical avatar
{
  const testOwnerWithAvatar = 'o0000000-0000-4000-8000-000000000099';
  const tokenOwnerWithAvatar = signAccessToken({ sub: testOwnerWithAvatar, role: 'ROLE_OWNER' });
  const origOwnerGetById = ownerDb.getById;
  const origOwnerUpdateProfile = ownerDb.updateProfile;

  const currentDbOwner = {
    id: testOwnerWithAvatar,
    phoneNumber: '+201099999999',
    fullName: 'مالك بحساب أصلي',
    email: 'avatar-owner@example.com',
    avatarUrl: 'https://storage.sola.eg/avatars/canonical-avatar.jpg',
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  (ownerDb as any).getById = async () => ({ ...currentDbOwner });
  (ownerDb as any).updateProfile = async (id: string, data: any) => {
    // If data.avatarUrl is undefined, avatar is NOT overwritten
    return {
      ...currentDbOwner,
      fullName: data.fullName ?? currentDbOwner.fullName,
      email: data.email !== undefined ? data.email : currentDbOwner.email,
      avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : currentDbOwner.avatarUrl,
      updatedAt: '2026-09-04T00:00:00.000Z',
    };
  };

  try {
    // Edit only fullName, without passing avatarUrl or avatar
    const editRes = await app.handleHttpRequest(
      'PUT',
      '/api/v1/owner/profile',
      ownerHeaders(tokenOwnerWithAvatar),
      { fullName: 'الاسم المحدث للمالك' }
    );
    assert.equal(editRes.statusCode, 200);
    assert.equal((editRes.body as any).data.fullName, 'الاسم المحدث للمالك');
    assert.equal((editRes.body as any).data.avatarUrl, 'https://storage.sola.eg/avatars/canonical-avatar.jpg', 'Canonical avatar must survive profile edit when not passed');
  } finally {
    (ownerDb as any).getById = origOwnerGetById;
    (ownerDb as any).updateProfile = origOwnerUpdateProfile;
  }
}

console.log('P2.3 Correction 01 tests passed.');

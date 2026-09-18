/**
 * SOLA Customer C4 Booking Review & Concurrency Safety Contract Tests
 * Requirements 17-34
 */

import { strict as assert } from 'node:assert';
import crypto from 'node:crypto';
import { ExpressServerApp } from '../app.js';
import { signAccessToken } from '../services/jwtService.js';
import { bookingDb, propertyDb, userDb, propertyAvailabilityDb, getUnifiedUnavailableBlocks } from '../services/dbRepository.js';
import { computeQuoteFingerprint, isValidUuid, isValidQuoteFingerprint } from '../utils/quoteFingerprint.js';

const propertyId = '11111111-1111-4111-8111-111111111111';
const ownerId = '22222222-2222-4222-8222-222222222222';
const customerIdA = '33333333-3333-4333-8333-333333333333';
const customerIdB = '44444444-4444-4444-8444-444444444444';

const customerHeadersA = { authorization: `Bearer ${signAccessToken({ sub: customerIdA, role: 'ROLE_CUSTOMER' })}` };
const customerHeadersB = { authorization: `Bearer ${signAccessToken({ sub: customerIdB, role: 'ROLE_CUSTOMER' })}` };

let mockProperty: any = {
  id: propertyId,
  ownerId,
  title: 'شاليه فاخر برأس الحكمة',
  basePricePerNight: 5000,
  pricePerNight: 5000,
  maxGuests: 6,
  status: 'PUBLISHED',
  verificationStatus: 'VERIFIED',
  address: 'الساحل الشمالي',
  images: ['https://example.com/img1.jpg'],
};

let mockCustomerA: any = {
  id: customerIdA,
  phoneNumber: '+201012345678',
  fullName: 'أحمد محمود',
};

let mockCustomerB: any = {
  id: customerIdB,
  phoneNumber: '+201087654321',
  fullName: 'طارق علي',
};

let mockBookings: Map<string, any> = new Map();
let mockSummaries: Map<string, any> = new Map();
let mockBlocks: any[] = [];
let createCallCount = 0;
let forceDuplicateKeyError = false;

// Mock DB hooks
const origPropGet = propertyDb.getById;
const origUserGet = userDb.getById;
const origBookingCreate = bookingDb.create;
const origBookingGet = bookingDb.getById;
const origBookingSummary = bookingDb.getFinancialSummary;
const origBookingBlocks = bookingDb.getBlocksByPropertyId;
const origAvailabilityGet = propertyAvailabilityDb.getByPropertyId;

function setupMocks() {
  mockBookings.clear();
  mockSummaries.clear();
  mockBlocks = [];
  createCallCount = 0;
  forceDuplicateKeyError = false;
  mockProperty.basePricePerNight = 5000;
  mockProperty.pricePerNight = 5000;

  (propertyDb as any).getById = async (id: string) => (id === propertyId ? { ...mockProperty } : null);
  (userDb as any).getById = async (id: string) => {
    if (id === customerIdA) return { ...mockCustomerA };
    if (id === customerIdB) return { ...mockCustomerB };
    return null;
  };
  (bookingDb as any).getBlocksByPropertyId = async (id: string) => (id === propertyId ? [...mockBlocks] : []);
  (propertyAvailabilityDb as any).getByPropertyId = async () => [];
  (bookingDb as any).getById = async (id: string) => {
    const bk = mockBookings.get(id);
    if (!bk) return null;
    const summary = mockSummaries.get(id) || {
      bookingId: id,
      totalBookingValue: bk.totalBookingValue,
      depositAmount: bk.depositAmount,
      remainingBalance: bk.remainingBalance,
    };
    return {
      ...bk,
      property: { ...mockProperty },
      propertyTitle: mockProperty.title,
      financialSummary: { ...summary },
    };
  };
  (bookingDb as any).getFinancialSummary = async (id: string) => mockSummaries.get(id) || null;
  (bookingDb as any).create = async (payload: any) => {
    createCallCount++;
    if (forceDuplicateKeyError) {
      throw new Error('duplicate key value violates unique constraint "bookings_pkey"');
    }
    if (mockBookings.has(payload.id)) {
      throw new Error('duplicate key value violates unique constraint "bookings_pkey"');
    }
    const bk = {
      id: payload.id,
      bookingNumber: payload.bookingNumber,
      propertyId: payload.propertyId,
      ownerId: payload.ownerId,
      customerId: payload.customerId,
      guestName: payload.guestName,
      guestPhone: payload.guestPhone,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      nights: payload.nights,
      guestsCount: payload.totalGuests,
      status: payload.status,
      totalBookingValue: payload.totalBookingValue,
      depositAmount: payload.depositAmount,
      solaCommissionAmount: payload.solaCommissionAmount,
      ownerNetDepositAmount: payload.ownerNetDepositAmount,
      remainingBalance: payload.remainingBalance,
      createdAt: payload.createdAt,
    };
    const sum = {
      bookingId: payload.id,
      totalBookingValue: payload.totalBookingValue,
      depositAmount: payload.depositAmount,
      solaCommissionAmount: payload.solaCommissionAmount,
      ownerNetDepositAmount: payload.ownerNetDepositAmount,
      remainingBalance: payload.remainingBalance,
    };
    mockBookings.set(payload.id, bk);
    mockSummaries.set(payload.id, sum);
    return { ...bk, financialSummary: sum };
  };
}

function restoreMocks() {
  (propertyDb as any).getById = origPropGet;
  (userDb as any).getById = origUserGet;
  (bookingDb as any).create = origBookingCreate;
  (bookingDb as any).getById = origBookingGet;
  (bookingDb as any).getFinancialSummary = origBookingSummary;
  (bookingDb as any).getBlocksByPropertyId = origBookingBlocks;
  (propertyAvailabilityDb as any).getByPropertyId = origAvailabilityGet;
}

async function run() {
  console.log('Running Customer C4 Booking Review & Safety Contract Tests...');
  const savedDbUrl = process.env.DATABASE_URL;
  const savedSupaUrl = process.env.SUPABASE_URL;
  const savedSupaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const savedStorageProvider = process.env.OBJECT_STORAGE_PROVIDER;
  delete process.env.DATABASE_URL;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.OBJECT_STORAGE_PROVIDER = 'local';

  setupMocks();
  const app = new ExpressServerApp();

  try {
    // 17. calculate returns quoteFingerprint
    const calcRes = await app.handleHttpRequest('POST', '/api/v1/customer/bookings/calculate', {}, {
      propertyId,
      checkIn: '2026-10-10',
      checkOut: '2026-10-13',
      guests: 2,
    });
    assert.equal(calcRes.statusCode, 200, 'Req 17: calculate returns 200');
    const quoteData = (calcRes.body as any).data;
    assert.ok(quoteData.quoteFingerprint, 'Req 17: quoteFingerprint is returned in data');
    assert.ok(isValidQuoteFingerprint(quoteData.quoteFingerprint), 'Req 17: quoteFingerprint is 64-char hex');

    // 18. same canonical quote produces stable fingerprint
    const calcRes2 = await app.handleHttpRequest('POST', '/api/v1/customer/bookings/calculate', {}, {
      propertyId,
      checkIn: '2026-10-10',
      checkOut: '2026-10-13',
      guests: 2,
    });
    assert.equal(
      (calcRes2.body as any).data.quoteFingerprint,
      quoteData.quoteFingerprint,
      'Req 18: same canonical quote produces identical stable fingerprint'
    );

    // 19. financial change changes fingerprint
    const fpA = computeQuoteFingerprint({
      propertyId,
      checkIn: '2026-10-10',
      checkOut: '2026-10-13',
      guests: 2,
      nights: 3,
      totalBookingValueInCents: 1500000,
      depositAmountInCents: 500000,
      remainingBalanceInCents: 1000000,
    });
    const fpB = computeQuoteFingerprint({
      propertyId,
      checkIn: '2026-10-10',
      checkOut: '2026-10-13',
      guests: 2,
      nights: 3,
      totalBookingValueInCents: 1800000, // price changed
      depositAmountInCents: 600000,
      remainingBalanceInCents: 1200000,
    });
    assert.notEqual(fpA, fpB, 'Req 19: financial change alters quote fingerprint');

    // 20. booking POST missing/invalid safety metadata fails closed
    const missingFpRes = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeadersA, {
      propertyId,
      checkIn: '2026-10-10',
      checkOut: '2026-10-13',
      guests: 2,
      requestId: crypto.randomUUID(),
      // missing reviewedQuoteFingerprint
    });
    assert.equal(missingFpRes.statusCode, 400, 'Req 20: missing reviewedQuoteFingerprint returns 400');
    assert.equal((missingFpRes.body as any).error.code, 'INVALID_SAFETY_METADATA');

    const invalidUuidRes = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeadersA, {
      propertyId,
      checkIn: '2026-10-10',
      checkOut: '2026-10-13',
      guests: 2,
      requestId: 'not-a-valid-uuid',
      reviewedQuoteFingerprint: quoteData.quoteFingerprint,
    });
    assert.equal(invalidUuidRes.statusCode, 400, 'Req 20: invalid requestId returns 400');
    assert.equal((invalidUuidRes.body as any).error.code, 'INVALID_SAFETY_METADATA');

    // 21. matching fingerprint permits create
    const validRequestId = crypto.randomUUID();
    const createRes = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeadersA, {
      propertyId,
      checkIn: '2026-10-10',
      checkOut: '2026-10-13',
      guests: 2,
      requestId: validRequestId,
      reviewedQuoteFingerprint: quoteData.quoteFingerprint,
    });
    assert.equal(createRes.statusCode, 201, 'Req 21: valid request returns 201 Created');
    assert.equal(createCallCount, 1, 'Req 21: bookingDb.create called exactly once');
    const createdBooking = (createRes.body as any).data;
    assert.equal(createdBooking.id, validRequestId, 'Req 25: requestId is used as booking ID');
    assert.equal(createdBooking.status, 'PENDING_OWNER_APPROVAL', 'Req 32: initial status is PENDING_OWNER_APPROVAL');

    // 22 & 23 & 24. mismatching fingerprint returns QUOTE_CHANGED, calls create ZERO times, returns currentQuote
    const initialCreateCount = createCallCount;
    const mismatchRequestId = crypto.randomUUID();
    const staleFp = '0000000000000000000000000000000000000000000000000000000000000000';
    const mismatchRes = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeadersA, {
      propertyId,
      checkIn: '2026-10-10',
      checkOut: '2026-10-13',
      guests: 2,
      requestId: mismatchRequestId,
      reviewedQuoteFingerprint: staleFp,
    });
    assert.equal(mismatchRes.statusCode, 409, 'Req 22: fingerprint mismatch returns 409');
    assert.equal((mismatchRes.body as any).error.code, 'QUOTE_CHANGED');
    assert.equal(createCallCount, initialCreateCount, 'Req 23: bookingDb.create called ZERO times on mismatch');
    const quotePayload = (mismatchRes.body as any).data?.currentQuote;
    assert.ok(quotePayload, 'Req 24: refreshed authoritative quote returned');
    assert.equal(quotePayload.quoteFingerprint, quoteData.quoteFingerprint, 'Req 24: quoteFingerprint returned');

    // 26 & 27. same requestId + same Customer + same intent replays existing booking with ZERO second booking created
    const replayRes = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeadersA, {
      propertyId,
      checkIn: '2026-10-10',
      checkOut: '2026-10-13',
      guests: 2,
      requestId: validRequestId,
      reviewedQuoteFingerprint: quoteData.quoteFingerprint,
    });
    assert.equal(replayRes.statusCode, 200, 'Req 26: replay returns 200 OK');
    assert.equal((replayRes.body as any).data.idempotentReplay, true, 'Req 26: idempotentReplay is true');
    assert.equal((replayRes.body as any).data.id, validRequestId, 'Req 26: returns same booking ID');
    assert.equal(createCallCount, initialCreateCount, 'Req 27: replay calls bookingDb.create ZERO times');

    // 28. same requestId with mismatched intent -> IDEMPOTENCY_CONFLICT
    const intentConflictRes = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeadersA, {
      propertyId,
      checkIn: '2026-10-15', // different dates
      checkOut: '2026-10-18',
      guests: 2,
      requestId: validRequestId, // reusing existing requestId
      reviewedQuoteFingerprint: quoteData.quoteFingerprint,
    });
    assert.equal(intentConflictRes.statusCode, 409, 'Req 28: reused requestId with different intent returns 409');
    assert.equal((intentConflictRes.body as any).error.code, 'IDEMPOTENCY_CONFLICT');

    // 29. same requestId belonging to other Customer leaks NO data
    const otherCustRes = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeadersB, {
      propertyId,
      checkIn: '2026-10-10',
      checkOut: '2026-10-13',
      guests: 2,
      requestId: validRequestId, // belonging to Customer A
      reviewedQuoteFingerprint: quoteData.quoteFingerprint,
    });
    assert.equal(otherCustRes.statusCode, 409, 'Req 29: another customer using existing requestId gets 409');
    assert.equal((otherCustRes.body as any).error.code, 'IDEMPOTENCY_CONFLICT');
    assert.equal(otherCustRes.body.data, undefined, 'Req 29: leaks no data to second customer');

    // 30. duplicate/race conflict path resolves to safe replay if same intent
    forceDuplicateKeyError = true;
    const raceRes = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeadersA, {
      propertyId,
      checkIn: '2026-10-10',
      checkOut: '2026-10-13',
      guests: 2,
      requestId: validRequestId,
      reviewedQuoteFingerprint: quoteData.quoteFingerprint,
    });
    assert.equal(raceRes.statusCode, 200, 'Req 30: race duplicate PK resolves to safe replay');
    assert.equal((raceRes.body as any).data.idempotentReplay, true);
    forceDuplicateKeyError = false;

    // 30B. idempotency lookup DB failure fails closed with 500 IDEMPOTENCY_LOOKUP_FAILED and ZERO create calls
    let forceGetByIdError = true;
    const origGetById = (bookingDb as any).getById;
    (bookingDb as any).getById = async (id: string) => {
      if (forceGetByIdError) {
        throw new Error('connection timeout querying bookings');
      }
      return origGetById(id);
    };

    const preLookupCount = createCallCount;
    const lookupFailRes = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeadersA, {
      propertyId,
      checkIn: '2026-10-10',
      checkOut: '2026-10-13',
      guests: 2,
      requestId: crypto.randomUUID(),
      reviewedQuoteFingerprint: quoteData.quoteFingerprint,
    });
    assert.equal(lookupFailRes.statusCode, 500, 'Req 30B: lookup DB error returns 500');
    assert.equal((lookupFailRes.body as any).error.code, 'IDEMPOTENCY_LOOKUP_FAILED');
    assert.equal(createCallCount, preLookupCount, 'Req 30B: bookingDb.create called ZERO times on lookup DB failure');
    forceGetByIdError = false;

    // 31. availability conflict returns 409 DATE_OVERLAP without creating booking
    const preOverlapCount = createCallCount;
    mockBlocks = [{ checkIn: '2026-10-10', checkOut: '2026-10-13', status: 'CONFIRMED' }];
    const overlapRes = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeadersA, {
      propertyId,
      checkIn: '2026-10-10',
      checkOut: '2026-10-13',
      guests: 2,
      requestId: crypto.randomUUID(),
      reviewedQuoteFingerprint: quoteData.quoteFingerprint,
    });
    assert.equal(overlapRes.statusCode, 409, 'Req 31: overlapping dates return 409');
    assert.equal((overlapRes.body as any).error.code, 'DATE_OVERLAP');
    assert.equal(createCallCount, preOverlapCount, 'Req 31: bookingDb.create called ZERO times on DATE_OVERLAP');
    mockBlocks = [];

    // 33 & 34. atomic financial summary persistence and no client monetary values accepted
    const tamperedMoneyRequestId = crypto.randomUUID();
    const tamperedRes = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeadersA, {
      propertyId,
      checkIn: '2026-10-10',
      checkOut: '2026-10-13',
      guests: 2,
      requestId: tamperedMoneyRequestId,
      reviewedQuoteFingerprint: quoteData.quoteFingerprint,
      totalBookingValue: 10, // tampered client input
      depositAmount: 5,
    });
    assert.equal(tamperedRes.statusCode, 201, 'Req 34: created with server canonical prices');
    const tamperedData = (tamperedRes.body as any).data;
    assert.equal(tamperedData.totalStay, 15000, 'Req 34: server total 15,000 used, client 10 ignored');
    assert.equal(tamperedData.depositAmount, 5000, 'Req 34: server deposit 5,000 used, client 5 ignored');

    console.log('All Customer C4 Backend Contract Tests PASSED (19/19 assertions).');
  } finally {
    restoreMocks();
    if (savedDbUrl !== undefined) process.env.DATABASE_URL = savedDbUrl;
    if (savedSupaUrl !== undefined) process.env.SUPABASE_URL = savedSupaUrl;
    if (savedSupaKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = savedSupaKey;
    if (savedStorageProvider !== undefined) {
      process.env.OBJECT_STORAGE_PROVIDER = savedStorageProvider;
    } else {
      delete process.env.OBJECT_STORAGE_PROVIDER;
    }
  }
}

run().catch((err) => {
  console.error('Customer C4 Backend Contract Tests FAILED:', err);
  process.exit(1);
});

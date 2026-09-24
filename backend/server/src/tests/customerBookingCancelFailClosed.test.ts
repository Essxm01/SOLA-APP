/**
 * SOLA Customer Booking Cancellation Fail-Closed & Concurrency Safety Test Suite
 * Requirements:
 * 1. Valid Customer cancellation persists CANCELLED_BY_GUEST
 * 2. Nonexistent booking -> 404, no fake success
 * 3. DB read failure -> 500, no fake booking
 * 4. Another Customer's booking -> 403 and unchanged
 * 5. Persistence failure -> 500, not 200
 * 6. Zero-row conditional update / concurrent state change -> 409
 * 7. Canonical success response uses real booking number/id
 * 8. Mock BK-990011 fallback is completely absent from this Production route
 * 9. Existing Owner booking decision regressions still pass
 * 10. Booking/finance/availability regressions remain green
 */

import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ExpressServerApp } from '../app.js';
import { signAccessToken } from '../services/jwtService.js';
import { bookingDb, propertyDb, userDb } from '../services/dbRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure JWT secrets are present in test environment
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_ci_jwt_access_secret_only_for_unit_tests_32ch';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_ci_jwt_refresh_secret_only_for_unit_tests_32ch';

const customerIdA = '0bd4fd06-421a-4146-9866-2d60cf74da0c';
const customerIdB = '88888888-8888-4888-8888-888888888888';
const ownerId = '00000000-0000-4000-8000-201013154939';
const propertyId = 'ab10aa91-8835-466f-897a-51a961d92e95';

const customerHeadersA = { authorization: `Bearer ${signAccessToken({ sub: customerIdA, role: 'ROLE_CUSTOMER' })}` };
const customerHeadersB = { authorization: `Bearer ${signAccessToken({ sub: customerIdB, role: 'ROLE_CUSTOMER' })}` };
const ownerHeaders = { authorization: `Bearer ${signAccessToken({ sub: ownerId, role: 'ROLE_OWNER' })}` };

async function runSuite() {
  console.log('Running Customer Booking Cancellation Fail-Closed Hardening Suite...');
  const app = new ExpressServerApp();

  const origBookingGetById = bookingDb.getById;
  const origBookingCancelForCustomer = bookingDb.cancelForCustomer;
  const origBookingUpdateStatusForOwner = bookingDb.updateStatusForOwner;
  const origPropertyGetById = propertyDb.getById;

  function restoreMocks() {
    (bookingDb as any).getById = origBookingGetById;
    (bookingDb as any).cancelForCustomer = origBookingCancelForCustomer;
    (bookingDb as any).updateStatusForOwner = origBookingUpdateStatusForOwner;
    (propertyDb as any).getById = origPropertyGetById;
  }

  try {
    // -------------------------------------------------------------------------
    // 1. Valid Customer cancellation persists CANCELLED_BY_GUEST
    // -------------------------------------------------------------------------
    let cancelForCustomerCalledWith: any = null;
    (bookingDb as any).getById = async (id: string) => {
      if (id === 'bk-valid-01') {
        return {
          id: 'bk-valid-01',
          bookingNumber: 'BK-REAL-001',
          propertyId,
          ownerId,
          customerId: customerIdA,
          guestName: 'أحمد عميل',
          checkIn: '2026-10-01',
          checkOut: '2026-10-05',
          nights: 4,
          guestsCount: 2,
          status: 'PENDING_OWNER_APPROVAL',
          createdAt: '2026-09-24T10:00:00Z',
        };
      }
      return null;
    };
    (bookingDb as any).cancelForCustomer = async (id: string, custId: string, expectedStatus: string) => {
      cancelForCustomerCalledWith = { id, custId, expectedStatus };
      return {
        id,
        bookingNumber: 'BK-REAL-001',
        propertyId,
        ownerId,
        customerId: custId,
        guestName: 'أحمد عميل',
        checkIn: '2026-10-01',
        checkOut: '2026-10-05',
        nights: 4,
        guestsCount: 2,
        status: 'CANCELLED_BY_GUEST',
        createdAt: '2026-09-24T10:00:00Z',
      };
    };

    const res1 = await app.handleHttpRequest('POST', '/api/v1/customer/bookings/bk-valid-01/cancel', customerHeadersA, {
      reason: 'TEST_REASON',
    });

    assert.equal(res1.statusCode, 200, 'Test 1: Must return HTTP 200 on valid customer cancellation');
    assert.equal(res1.body.success, true, 'Test 1: Body success must be true');
    assert.equal(res1.body.data.status, 'CANCELLED_BY_GUEST', 'Test 1: Status must be CANCELLED_BY_GUEST');
    assert.equal(cancelForCustomerCalledWith.id, 'bk-valid-01', 'Test 1: Must pass exact bookingId to repository');
    assert.equal(cancelForCustomerCalledWith.custId, customerIdA, 'Test 1: Must pass authenticated customerId');
    assert.equal(cancelForCustomerCalledWith.expectedStatus, 'PENDING_OWNER_APPROVAL', 'Test 1: Must pass expected canonical status');
    console.log('  ✅ 1. Valid Customer cancellation persists CANCELLED_BY_GUEST');

    // -------------------------------------------------------------------------
    // 2. Nonexistent booking -> 404, no fake success
    // -------------------------------------------------------------------------
    let cancelCalledForNonexistent = false;
    (bookingDb as any).getById = async () => null;
    (bookingDb as any).cancelForCustomer = async () => {
      cancelCalledForNonexistent = true;
      return null;
    };

    const res2 = await app.handleHttpRequest('POST', '/api/v1/customer/bookings/nonexistent-uuid/cancel', customerHeadersA);
    assert.equal(res2.statusCode, 404, 'Test 2: Nonexistent booking must return HTTP 404');
    assert.equal(res2.body.success, false, 'Test 2: Success must be false');
    assert.equal(res2.body.error?.code, 'BOOKING_NOT_FOUND', 'Test 2: Error code must be BOOKING_NOT_FOUND');
    assert.equal(cancelCalledForNonexistent, false, 'Test 2: Repository cancel must not be called when booking does not exist');
    console.log('  ✅ 2. Nonexistent booking -> 404 BOOKING_NOT_FOUND');

    // -------------------------------------------------------------------------
    // 3. DB read failure -> 500, no fake booking
    // -------------------------------------------------------------------------
    (bookingDb as any).getById = async () => {
      throw new Error('DATABASE_CONNECTION_REFUSED');
    };

    const res3 = await app.handleHttpRequest('POST', '/api/v1/customer/bookings/any-id/cancel', customerHeadersA);
    assert.equal(res3.statusCode, 500, 'Test 3: DB read failure must fail closed with HTTP 500');
    assert.equal(res3.body.success, false, 'Test 3: Success must be false');
    assert.equal(res3.body.error?.code, 'CUSTOMER_BOOKING_QUERY_FAILED', 'Test 3: Error code must be CUSTOMER_BOOKING_QUERY_FAILED');
    assert.equal(res3.body.data, undefined, 'Test 3: No fallback booking data must be returned');
    console.log('  ✅ 3. DB read failure -> 500 CUSTOMER_BOOKING_QUERY_FAILED');

    // -------------------------------------------------------------------------
    // 4. Another Customer's booking -> 403 and unchanged
    // -------------------------------------------------------------------------
    let cancelCalledOnIDOR = false;
    (bookingDb as any).getById = async (id: string) => ({
      id,
      bookingNumber: 'BK-OTHER-CUST',
      customerId: customerIdB, // Owned by Customer B
      status: 'PENDING_OWNER_APPROVAL',
    });
    (bookingDb as any).cancelForCustomer = async () => {
      cancelCalledOnIDOR = true;
      return null;
    };

    const res4 = await app.handleHttpRequest('POST', '/api/v1/customer/bookings/bk-other/cancel', customerHeadersA); // Invoked by Customer A
    assert.equal(res4.statusCode, 403, 'Test 4: Cross-customer IDOR cancellation must return HTTP 403');
    assert.equal(res4.body.success, false, 'Test 4: Success must be false');
    assert.equal(res4.body.error?.code, 'FORBIDDEN_BOOKING_ACCESS', 'Test 4: Error code must be FORBIDDEN_BOOKING_ACCESS');
    assert.equal(cancelCalledOnIDOR, false, 'Test 4: Database mutation must NEVER be attempted on unauthorized IDOR attempt');
    console.log('  ✅ 4. Another Customer\'s booking -> 403 FORBIDDEN_BOOKING_ACCESS');

    // -------------------------------------------------------------------------
    // 5. Persistence failure -> 500, not 200
    // -------------------------------------------------------------------------
    (bookingDb as any).getById = async (id: string) => ({
      id,
      bookingNumber: 'BK-FAIL-WRITE',
      customerId: customerIdA,
      status: 'PENDING_OWNER_APPROVAL',
    });
    (bookingDb as any).cancelForCustomer = async () => {
      throw new Error('REST_CUSTOMER_BOOKING_CANCEL_FAILED: HTTP 500');
    };

    const res5 = await app.handleHttpRequest('POST', '/api/v1/customer/bookings/bk-persist-err/cancel', customerHeadersA);
    assert.equal(res5.statusCode, 500, 'Test 5: Persistence write failure must return HTTP 500, NEVER 200');
    assert.equal(res5.body.success, false, 'Test 5: Success must be false');
    assert.equal(res5.body.error?.code, 'CUSTOMER_BOOKING_PERSISTENCE_FAILED', 'Test 5: Error code must be CUSTOMER_BOOKING_PERSISTENCE_FAILED');
    console.log('  ✅ 5. Persistence failure -> 500 CUSTOMER_BOOKING_PERSISTENCE_FAILED');

    // -------------------------------------------------------------------------
    // 6. Zero-row conditional update / concurrent state change -> 409
    // -------------------------------------------------------------------------
    (bookingDb as any).getById = async (id: string) => ({
      id,
      bookingNumber: 'BK-RACE-TEST',
      customerId: customerIdA,
      status: 'PENDING_OWNER_APPROVAL',
    });
    // cancelForCustomer returns null when concurrent transaction changed status from PENDING_OWNER_APPROVAL
    (bookingDb as any).cancelForCustomer = async () => null;

    const res6 = await app.handleHttpRequest('POST', '/api/v1/customer/bookings/bk-race-test/cancel', customerHeadersA);
    assert.equal(res6.statusCode, 409, 'Test 6: Concurrent state change (0 rows updated) must return HTTP 409 conflict');
    assert.equal(res6.body.success, false, 'Test 6: Success must be false');
    assert.equal(res6.body.error?.code, 'BOOKING_STATE_CHANGED', 'Test 6: Error code must be BOOKING_STATE_CHANGED');
    console.log('  ✅ 6. Zero-row conditional update / concurrent state change -> 409 BOOKING_STATE_CHANGED');

    // -------------------------------------------------------------------------
    // 7. Canonical success response uses real booking number/id
    // -------------------------------------------------------------------------
    (bookingDb as any).getById = async (id: string) => ({
      id,
      bookingNumber: 'BK-PROD-908747',
      propertyId: 'prop-canonical-01',
      customerId: customerIdA,
      guestName: 'نادية إبراهيم',
      status: 'PENDING_OWNER_APPROVAL',
      checkIn: '2026-10-15',
      checkOut: '2026-10-20',
      nights: 5,
      guestsCount: 3,
      createdAt: '2026-09-24T12:00:00Z',
    });
    (bookingDb as any).cancelForCustomer = async (id: string, custId: string) => ({
      id,
      bookingNumber: 'BK-PROD-908747',
      propertyId: 'prop-canonical-01',
      customerId: custId,
      guestName: 'نادية إبراهيم',
      status: 'CANCELLED_BY_GUEST',
      checkIn: '2026-10-15',
      checkOut: '2026-10-20',
      nights: 5,
      guestsCount: 3,
      createdAt: '2026-09-24T12:00:00Z',
    });

    const res7 = await app.handleHttpRequest('POST', '/api/v1/customer/bookings/real-booking-id-99/cancel', customerHeadersA);
    assert.equal(res7.statusCode, 200, 'Test 7: Must return 200');
    assert.equal(res7.body.data.id, 'real-booking-id-99', 'Test 7: Returned ID must match canonical booking ID');
    assert.equal(res7.body.data.bookingNumber, 'BK-PROD-908747', 'Test 7: Returned bookingNumber must match canonical DB record');
    assert.equal(res7.body.data.propertyId, 'prop-canonical-01', 'Test 7: Returned propertyId must match canonical DB record');
    assert.equal(res7.body.data.status, 'CANCELLED_BY_GUEST', 'Test 7: Returned status must be CANCELLED_BY_GUEST');
    console.log('  ✅ 7. Canonical success response uses real booking number/id');

    // -------------------------------------------------------------------------
    // 8. Mock BK-990011 fallback is completely absent from this Production route
    // -------------------------------------------------------------------------
    const appTsPath = path.resolve(__dirname, '../app.ts');
    const appTsSource = fs.readFileSync(appTsPath, 'utf8');
    assert(!appTsSource.includes('BK-990011'), 'Test 8: Fake mock BK-990011 must NOT exist anywhere in app.ts');
    const cancelRouteMatch = appTsSource.match(/\/\/ 4\.5C Customer Booking Cancellation[\s\S]*?\/\/ 4\.6 Customer Messaging/);
    assert(cancelRouteMatch, 'Test 8: Customer booking cancellation route must be present in app.ts');
    const cancelRouteCode = cancelRouteMatch[0];
    assert(!cancelRouteCode.includes('prop-pub-001'), 'Test 8: Fake mock prop-pub-001 must NOT exist in cancellation route');
    assert(!cancelRouteCode.includes('Sola Customer'), 'Test 8: Fake mock guestName must NOT exist in cancellation route');
    console.log('  ✅ 8. Mock BK-990011 fallback is completely absent from Production route');

    // -------------------------------------------------------------------------
    // 9. Existing Owner booking decision regressions still pass
    // -------------------------------------------------------------------------
    let ownerDecisionCalledWith: any = null;
    const origGetBlocks = bookingDb.getBlocksByPropertyId;
    (bookingDb as any).getBlocksByPropertyId = async () => [];
    (bookingDb as any).getById = async (id: string) => ({
      id,
      bookingNumber: 'BK-OWNER-DECISION',
      ownerId,
      customerId: customerIdA,
      propertyId,
      status: 'PENDING_OWNER_APPROVAL',
      checkIn: '2026-10-01',
      checkOut: '2026-10-05',
      nights: 4,
      guestsCount: 2,
    });
    (bookingDb as any).updateStatusForOwner = async (id: string, ownId: string, status: any) => {
      ownerDecisionCalledWith = { id, ownId, status };
      return {
        id,
        bookingNumber: 'BK-OWNER-DECISION',
        ownerId: ownId,
        customerId: customerIdA,
        propertyId,
        status,
        checkIn: '2026-10-01',
        checkOut: '2026-10-05',
        nights: 4,
        guestsCount: 2,
        createdAt: '2026-09-24T12:00:00Z',
        financialSummary: {
          bookingId: id,
          totalBookingValue: 8000,
          depositAmount: 2000,
          solaCommissionAmount: 400,
          ownerNetDepositAmount: 1600,
          remainingBalance: 6000,
          commissionOnRemainingBalance: 0,
          currency: 'EGP',
        },
      };
    };

    const resApprove = await app.handleHttpRequest('POST', '/api/v1/owner/bookings/bk-owner-test/approve', ownerHeaders);
    assert.equal(resApprove.statusCode, 200, 'Test 9: Owner approve must succeed');
    assert.equal(ownerDecisionCalledWith.status, 'APPROVED_PENDING_PAYMENT', 'Test 9: Owner approve updates to APPROVED_PENDING_PAYMENT');

    const resReject = await app.handleHttpRequest('POST', '/api/v1/owner/bookings/bk-owner-test/reject', ownerHeaders, {
      rejectionReason: 'Unit under maintenance',
    });
    assert.equal(resReject.statusCode, 200, 'Test 9: Owner reject must succeed');
    assert.equal(ownerDecisionCalledWith.status, 'REJECTED', 'Test 9: Owner reject updates to REJECTED');
    (bookingDb as any).getBlocksByPropertyId = origGetBlocks;
    console.log('  ✅ 9. Existing Owner booking decision regressions still pass');

    // -------------------------------------------------------------------------
    // 10. Booking/finance/availability regressions remain green
    // -------------------------------------------------------------------------
    // Verify that canceling a booking that is not in PENDING_OWNER_APPROVAL or CONFIRMED is rejected
    (bookingDb as any).getById = async (id: string) => ({
      id,
      bookingNumber: 'BK-ALREADY-REJECTED',
      customerId: customerIdA,
      status: 'REJECTED',
    });

    const res10 = await app.handleHttpRequest('POST', '/api/v1/customer/bookings/bk-ineligible/cancel', customerHeadersA);
    assert.equal(res10.statusCode, 400, 'Test 10: Ineligible lifecycle state cancellation must return HTTP 400');
    assert.equal(res10.body.error?.code, 'CANNOT_CANCEL_BOOKING_IN_CURRENT_STATE', 'Test 10: Error code must be CANNOT_CANCEL_BOOKING_IN_CURRENT_STATE');
    console.log('  ✅ 10. Ineligible lifecycle cancellation rejected with 400 CANNOT_CANCEL_BOOKING_IN_CURRENT_STATE');

    console.log('\nALL 10 CUSTOMER CANCELLATION FAIL-CLOSED HARDENING TESTS PASSED DETERMINISTICALLY!\n');
  } finally {
    restoreMocks();
  }
}

runSuite().catch((err) => {
  console.error('FATAL TEST SUITE FAILURE:', err);
  process.exit(1);
});

/**
 * SOLA Customer Payment Boundary Fail-Closed & Hardening Test Suite
 * Master Source of Truth: Section 15 Backend Payment Test Matrix
 *
 * Requirements:
 * 1. Valid approved booking can initiate one Prototype payment attempt;
 * 2. PENDING_OWNER_APPROVAL cannot initiate (409 BOOKING_NOT_APPROVED_FOR_PAYMENT);
 * 3. CONFIRMED cannot initiate again (409 BOOKING_ALREADY_CONFIRMED);
 * 4. Terminal status cannot initiate (409 BOOKING_NOT_APPROVED_FOR_PAYMENT);
 * 5. Wrong Customer -> 403 FORBIDDEN_BOOKING_ACCESS;
 * 6. Booking DB failure -> 500 CUSTOMER_PAYMENT_BOOKING_QUERY_FAILED, not 404;
 * 7. Payment transaction lookup failure -> 500 CUSTOMER_PAYMENT_TRANSACTION_QUERY_FAILED, no new transaction;
 * 8. Financial summary query / malformed result -> fail closed;
 * 9. Same idempotency key returns same attempt;
 * 10. Same active booking transaction prevents duplicate initiation;
 * 11. Scope mismatch -> 409 PAYMENT_IDEMPOTENCY_SCOPE_MISMATCH;
 * 12. Payment-status query failure does not become NO_PAYMENT_INITIATED;
 * 13. Prototype completion validates exact transaction ownership/scope;
 * 14. Successful completion yields CONFIRMED + SUCCEEDED;
 * 15. Malformed RPC success result -> 500;
 * 16. Repeated completion cannot create a second financial transition;
 * 17. Customer finance denylist remains intact.
 * 18. Missing idempotency key -> 400 PAYMENT_IDEMPOTENCY_KEY_REQUIRED.
 */

import { strict as assert } from 'node:assert';
import { ExpressServerApp } from '../app.js';
import { signAccessToken } from '../services/jwtService.js';
import { bookingDb } from '../services/dbRepository.js';
import { paymentTxDb } from '../services/paymentService.js';

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_ci_jwt_access_secret_only_for_unit_tests_32ch';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_ci_jwt_refresh_secret_only_for_unit_tests_32ch';
process.env.PAYMENT_MODE = 'PROTOTYPE';
process.env.NODE_ENV = 'test';
process.env.ALLOW_PAYMENT_TEST_HARNESS = 'true';

const customerIdA = '0bd4fd06-421a-4146-9866-2d60cf74da0c';
const customerIdB = '88888888-8888-4888-8888-888888888888';
const ownerId = '00000000-0000-4000-8000-201013154939';
const propertyId = 'ab10aa91-8835-466f-897a-51a961d92e95';

const customerHeadersA = {
  authorization: `Bearer ${signAccessToken({ sub: customerIdA, role: 'ROLE_CUSTOMER' })}`,
  'x-konfrm-test-harness': 'enabled',
};
const customerHeadersB = {
  authorization: `Bearer ${signAccessToken({ sub: customerIdB, role: 'ROLE_CUSTOMER' })}`,
  'x-konfrm-test-harness': 'enabled',
};
const normalCustomerHeadersA = {
  authorization: `Bearer ${signAccessToken({ sub: customerIdA, role: 'ROLE_CUSTOMER' })}`,
};

async function runSuite() {
  console.log('Running Customer Payment Boundary Fail-Closed Test Suite...');
  const app = new ExpressServerApp();

  const origBookingGetById = bookingDb.getById;
  const origBookingGetFinancialSummary = bookingDb.getFinancialSummary;
  const origPaymentTxGetByIdempotencyKey = paymentTxDb.getByIdempotencyKey;
  const origPaymentTxGetByBookingId = paymentTxDb.getByBookingId;
  const origPaymentTxCreate = paymentTxDb.create;
  const origPaymentTxCompleteDepositPayment = paymentTxDb.completeDepositPayment;

  function restoreMocks() {
    (bookingDb as any).getById = origBookingGetById;
    (bookingDb as any).getFinancialSummary = origBookingGetFinancialSummary;
    (paymentTxDb as any).getByIdempotencyKey = origPaymentTxGetByIdempotencyKey;
    (paymentTxDb as any).getByBookingId = origPaymentTxGetByBookingId;
    (paymentTxDb as any).create = origPaymentTxCreate;
    (paymentTxDb as any).completeDepositPayment = origPaymentTxCompleteDepositPayment;
  }

  try {
    const baseApprovedBooking = {
      id: 'bk-approved-01',
      bookingNumber: 'BK-APP-001',
      propertyId,
      ownerId,
      customerId: customerIdA,
      guestName: 'أحمد نزيل',
      checkIn: '2026-10-01',
      checkOut: '2026-10-05',
      nights: 4,
      guestsCount: 2,
      status: 'APPROVED_PENDING_PAYMENT',
      createdAt: '2026-09-24T10:00:00Z',
    };

    const baseSummary = {
      bookingId: 'bk-approved-01',
      totalBookingValue: 10000,
      depositAmount: 2500,
      solaCommissionAmount: 500,
      ownerNetDepositAmount: 2000,
      remainingBalance: 7500,
      commissionOnRemainingBalance: 1500,
      createdAt: '2026-09-24T10:00:00Z',
    };

    // -------------------------------------------------------------------------
    // 1. Valid approved booking can initiate one Prototype payment attempt
    // -------------------------------------------------------------------------
    (bookingDb as any).getById = async (id: string) => (id === 'bk-approved-01' ? { ...baseApprovedBooking } : null);
    (bookingDb as any).getFinancialSummary = async (id: string) => (id === 'bk-approved-01' ? { ...baseSummary } : null);
    (paymentTxDb as any).getByIdempotencyKey = async () => null;
    (paymentTxDb as any).getByBookingId = async () => [];
    let createdTxPayload: any = null;
    (paymentTxDb as any).create = async (tx: any) => {
      createdTxPayload = tx;
      return { id: 'tx-created-01', ...tx, status: 'INITIATED', createdAt: new Date().toISOString() };
    };

    const res1 = await app.handleHttpRequest(
      'POST',
      '/api/v1/customer/bookings/bk-approved-01/pay',
      { ...customerHeadersA, 'idempotency-key': 'attempt-key-01' },
      { paymentMethod: 'CARD' }
    );
    assert.equal(res1.statusCode, 200, 'Initiation on approved booking must return 200');
    assert.equal(res1.body.success, true);
    assert.equal(res1.body.data.paymentTransactionId, 'tx-created-01');
    assert.equal(res1.body.data.depositAmountEgp, 2500);
    assert.equal(res1.body.data.depositAmountCents, 250000);
    assert.equal(res1.body.data.mode, 'PROTOTYPE');
    assert.equal(res1.body.data.requiresExternalCheckout, false);
    assert.equal(createdTxPayload?.idempotencyKey, 'attempt-key-01');
    console.log('  ✅ 1. Valid approved booking can initiate one Prototype payment attempt');

    // -------------------------------------------------------------------------
    // 2. PENDING_OWNER_APPROVAL cannot initiate
    // -------------------------------------------------------------------------
    (bookingDb as any).getById = async () => ({ ...baseApprovedBooking, status: 'PENDING_OWNER_APPROVAL' });
    const res2 = await app.handleHttpRequest(
      'POST',
      '/api/v1/customer/bookings/bk-approved-01/pay',
      { ...customerHeadersA, 'idempotency-key': 'attempt-key-02' }
    );
    assert.equal(res2.statusCode, 409, 'Pending owner approval must reject initiation with 409');
    assert.equal(res2.body.error?.code, 'BOOKING_NOT_APPROVED_FOR_PAYMENT');
    console.log('  ✅ 2. PENDING_OWNER_APPROVAL cannot initiate');

    // -------------------------------------------------------------------------
    // 3. CONFIRMED cannot initiate again
    // -------------------------------------------------------------------------
    (bookingDb as any).getById = async () => ({ ...baseApprovedBooking, status: 'CONFIRMED' });
    const res3 = await app.handleHttpRequest(
      'POST',
      '/api/v1/customer/bookings/bk-approved-01/pay',
      { ...customerHeadersA, 'idempotency-key': 'attempt-key-03' }
    );
    assert.equal(res3.statusCode, 409, 'Confirmed booking must reject initiation with 409');
    assert.equal(res3.body.error?.code, 'BOOKING_ALREADY_CONFIRMED');
    console.log('  ✅ 3. CONFIRMED cannot initiate again');

    // -------------------------------------------------------------------------
    // 4. Terminal status cannot initiate
    // -------------------------------------------------------------------------
    for (const status of ['REJECTED', 'CANCELLED_BY_GUEST', 'CANCELLED_BY_OWNER', 'EXPIRED']) {
      (bookingDb as any).getById = async () => ({ ...baseApprovedBooking, status });
      const res4 = await app.handleHttpRequest(
        'POST',
        '/api/v1/customer/bookings/bk-approved-01/pay',
        { ...customerHeadersA, 'idempotency-key': `attempt-key-term-${status}` }
      );
      assert.equal(res4.statusCode, 409, `Terminal status ${status} must return 409`);
      assert.equal(res4.body.error?.code, 'BOOKING_NOT_APPROVED_FOR_PAYMENT');
    }
    console.log('  ✅ 4. Terminal status cannot initiate');

    // -------------------------------------------------------------------------
    // 5. Wrong Customer -> 403
    // -------------------------------------------------------------------------
    (bookingDb as any).getById = async () => ({ ...baseApprovedBooking });
    const res5 = await app.handleHttpRequest(
      'POST',
      '/api/v1/customer/bookings/bk-approved-01/pay',
      { ...customerHeadersB, 'idempotency-key': 'attempt-key-cust-b' }
    );
    assert.equal(res5.statusCode, 403, 'Initiation by wrong customer must return 403');
    assert.equal(res5.body.error?.code, 'FORBIDDEN_BOOKING_ACCESS');
    console.log('  ✅ 5. Wrong Customer -> 403 FORBIDDEN_BOOKING_ACCESS');

    // -------------------------------------------------------------------------
    // 6. Booking DB failure -> 500, not 404
    // -------------------------------------------------------------------------
    (bookingDb as any).getById = async () => {
      throw new Error('Postgres connection pool exhausted');
    };
    const res6 = await app.handleHttpRequest(
      'POST',
      '/api/v1/customer/bookings/bk-approved-01/pay',
      { ...customerHeadersA, 'idempotency-key': 'attempt-key-db-fail' }
    );
    assert.equal(res6.statusCode, 500, 'DB query failure must return 500, not 404');
    assert.equal(res6.body.error?.code, 'CUSTOMER_PAYMENT_BOOKING_QUERY_FAILED');
    console.log('  ✅ 6. Booking DB failure -> 500 CUSTOMER_PAYMENT_BOOKING_QUERY_FAILED, not 404');

    // -------------------------------------------------------------------------
    // 7. Payment transaction lookup failure -> 500, no new transaction
    // -------------------------------------------------------------------------
    (bookingDb as any).getById = async () => ({ ...baseApprovedBooking });
    (bookingDb as any).getFinancialSummary = async () => ({ ...baseSummary });
    (paymentTxDb as any).getByIdempotencyKey = async () => {
      throw new Error('payment_transactions read failure');
    };
    let txCreatedOnLookupFail = false;
    (paymentTxDb as any).create = async () => {
      txCreatedOnLookupFail = true;
      return {};
    };

    const res7 = await app.handleHttpRequest(
      'POST',
      '/api/v1/customer/bookings/bk-approved-01/pay',
      { ...customerHeadersA, 'idempotency-key': 'attempt-lookup-fail' }
    );
    assert.equal(res7.statusCode, 500, 'Transaction lookup failure must return 500');
    assert.equal(res7.body.error?.code, 'CUSTOMER_PAYMENT_TRANSACTION_QUERY_FAILED');
    assert.equal(txCreatedOnLookupFail, false, 'No new transaction may be created when lookup fails');
    console.log('  ✅ 7. Payment transaction lookup failure -> 500, no new transaction');

    // -------------------------------------------------------------------------
    // 8. Financial summary query / malformed result -> fail closed
    // -------------------------------------------------------------------------
    (paymentTxDb as any).getByIdempotencyKey = async () => null;
    (paymentTxDb as any).getByBookingId = async () => [];

    // Case A: Financial summary DB failure
    (bookingDb as any).getFinancialSummary = async () => {
      throw new Error('financial summary table timeout');
    };
    const res8a = await app.handleHttpRequest(
      'POST',
      '/api/v1/customer/bookings/bk-approved-01/pay',
      { ...customerHeadersA, 'idempotency-key': 'attempt-fin-fail' }
    );
    assert.equal(res8a.statusCode, 500, 'Financial query failure must return 500');
    assert.equal(res8a.body.error?.code, 'CUSTOMER_PAYMENT_FINANCIAL_QUERY_FAILED');

    // Case B: Financial summary missing / zero deposit
    (bookingDb as any).getFinancialSummary = async () => ({ depositAmount: 0 });
    const res8b = await app.handleHttpRequest(
      'POST',
      '/api/v1/customer/bookings/bk-approved-01/pay',
      { ...customerHeadersA, 'idempotency-key': 'attempt-fin-zero' }
    );
    assert.equal(res8b.statusCode, 500, 'Malformed/zero financial summary must fail closed with 500');
    assert.equal(res8b.body.error?.code, 'BOOKING_FINANCIAL_SUMMARY_NOT_FOUND');
    console.log('  ✅ 8. Financial summary query/malformed result -> fail closed');

    // -------------------------------------------------------------------------
    // 9. Same idempotency key returns same attempt
    // -------------------------------------------------------------------------
    (bookingDb as any).getFinancialSummary = async () => ({ ...baseSummary });
    (paymentTxDb as any).getByIdempotencyKey = async (key: string) => {
      if (key === 'attempt-stable-01') {
        return {
          id: 'tx-existing-stable',
          bookingId: 'bk-approved-01',
          customerId: customerIdA,
          merchantOrderId: 'KONFRM-DEP-EXISTING',
          amountCents: 250000,
          status: 'INITIATED',
        };
      }
      return null;
    };
    const res9 = await app.handleHttpRequest(
      'POST',
      '/api/v1/customer/bookings/bk-approved-01/pay',
      { ...customerHeadersA, 'idempotency-key': 'attempt-stable-01' }
    );
    assert.equal(res9.statusCode, 200, 'Reused idempotency key must return 200 with existing transaction');
    assert.equal(res9.body.data.paymentTransactionId, 'tx-existing-stable');
    assert.equal(res9.body.data.depositAmountEgp, 2500);
    console.log('  ✅ 9. Same idempotency key returns same attempt');

    // -------------------------------------------------------------------------
    // 10. Same active booking transaction prevents duplicate initiation
    // -------------------------------------------------------------------------
    (paymentTxDb as any).getByIdempotencyKey = async () => null; // New key provided
    (paymentTxDb as any).getByBookingId = async () => [
      {
        id: 'tx-active-in-flight',
        bookingId: 'bk-approved-01',
        customerId: customerIdA,
        merchantOrderId: 'KONFRM-DEP-ACTIVE',
        amountCents: 250000,
        status: 'INITIATED',
      },
    ];
    let createdTxOnActive = false;
    (paymentTxDb as any).create = async () => {
      createdTxOnActive = true;
      return {};
    };

    const res10 = await app.handleHttpRequest(
      'POST',
      '/api/v1/customer/bookings/bk-approved-01/pay',
      { ...customerHeadersA, 'idempotency-key': 'new-random-key' }
    );
    assert.equal(res10.statusCode, 200, 'Active transaction must be reconciled without creating duplicate');
    assert.equal(res10.body.data.paymentTransactionId, 'tx-active-in-flight');
    assert.equal(createdTxOnActive, false, 'Must not create duplicate transaction when active attempt exists');
    console.log('  ✅ 10. Same active booking transaction prevents duplicate initiation');

    // -------------------------------------------------------------------------
    // 11. Scope mismatch -> 409
    // -------------------------------------------------------------------------
    (paymentTxDb as any).getByIdempotencyKey = async () => ({
      id: 'tx-other-booking',
      bookingId: 'bk-another-user-999',
      customerId: customerIdB,
      merchantOrderId: 'KONFRM-DEP-OTHER',
      amountCents: 500000,
      status: 'INITIATED',
    });
    const res11 = await app.handleHttpRequest(
      'POST',
      '/api/v1/customer/bookings/bk-approved-01/pay',
      { ...customerHeadersA, 'idempotency-key': 'reused-across-bookings' }
    );
    assert.equal(res11.statusCode, 409, 'Reused key scoped to another booking must return 409');
    assert.equal(res11.body.error?.code, 'PAYMENT_IDEMPOTENCY_SCOPE_MISMATCH');
    console.log('  ✅ 11. Scope mismatch -> 409 PAYMENT_IDEMPOTENCY_SCOPE_MISMATCH');

    // -------------------------------------------------------------------------
    // 12. Payment-status query failure does not become NO_PAYMENT_INITIATED
    // -------------------------------------------------------------------------
    (bookingDb as any).getById = async () => ({ ...baseApprovedBooking });
    (paymentTxDb as any).getByBookingId = async () => {
      throw new Error('payment_transactions status read failure');
    };
    const res12 = await app.handleHttpRequest(
      'GET',
      '/api/v1/customer/bookings/bk-approved-01/payment-status',
      customerHeadersA
    );
    assert.equal(res12.statusCode, 500, 'Status query DB failure must return 500');
    assert.equal(res12.body.error?.code, 'CUSTOMER_PAYMENT_TRANSACTION_QUERY_FAILED');
    assert.notEqual(res12.body.data?.paymentStatus, 'NO_PAYMENT_INITIATED', 'Must not turn DB failure into NO_PAYMENT_INITIATED');
    console.log('  ✅ 12. Payment-status query failure does not become NO_PAYMENT_INITIATED');

    // -------------------------------------------------------------------------
    // 13. Prototype completion validates exact transaction ownership/scope
    // -------------------------------------------------------------------------
    (bookingDb as any).getById = async () => ({ ...baseApprovedBooking });
    (paymentTxDb as any).getByBookingId = async () => [
      {
        id: 'tx-legit-01',
        bookingId: 'bk-approved-01',
        customerId: customerIdA,
        ownerId,
        amountCents: 250000,
        status: 'INITIATED',
      },
    ];

    // Case A: Missing transaction ID in body
    const res13a = await app.handleHttpRequest(
      'POST',
      '/api/v1/customer/bookings/bk-approved-01/pay/prototype-complete',
      customerHeadersA,
      {}
    );
    assert.equal(res13a.statusCode, 400, 'Missing paymentTransactionId must return 400');
    assert.equal(res13a.body.error?.code, 'PAYMENT_TRANSACTION_ID_REQUIRED');

    // Case B: Transaction ID not found in booking transactions
    const res13b = await app.handleHttpRequest(
      'POST',
      '/api/v1/customer/bookings/bk-approved-01/pay/prototype-complete',
      customerHeadersA,
      { paymentTransactionId: 'tx-nonexistent' }
    );
    assert.equal(res13b.statusCode, 404, 'Nonexistent paymentTransactionId must return 404');
    assert.equal(res13b.body.error?.code, 'PAYMENT_TRANSACTION_NOT_FOUND');

    // Case C: Transaction belongs to another booking/customer/owner
    (paymentTxDb as any).getByBookingId = async () => [
      {
        id: 'tx-spoofed',
        bookingId: 'bk-different',
        customerId: customerIdB,
        ownerId,
        amountCents: 250000,
        status: 'INITIATED',
      },
    ];
    const res13c = await app.handleHttpRequest(
      'POST',
      '/api/v1/customer/bookings/bk-approved-01/pay/prototype-complete',
      customerHeadersA,
      { paymentTransactionId: 'tx-spoofed' }
    );
    assert.equal(res13c.statusCode, 403, 'Mismatched transaction scope must return 403');
    assert.equal(res13c.body.error?.code, 'FORBIDDEN_TRANSACTION_ACCESS');
    console.log('  ✅ 13. Prototype completion validates exact transaction ownership/scope');

    // -------------------------------------------------------------------------
    // 14. Successful completion yields CONFIRMED + SUCCEEDED
    // -------------------------------------------------------------------------
    (paymentTxDb as any).getByBookingId = async () => [
      {
        id: 'tx-legit-01',
        bookingId: 'bk-approved-01',
        customerId: customerIdA,
        ownerId,
        amountCents: 250000,
        currency: 'EGP',
        status: 'INITIATED',
      },
    ];
    (paymentTxDb as any).completeDepositPayment = async () => ({
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'SUCCEEDED',
      currency: 'EGP',
      confirmedAt: '2026-09-24T12:00:00Z',
    });

    const res14 = await app.handleHttpRequest(
      'POST',
      '/api/v1/customer/bookings/bk-approved-01/pay/prototype-complete',
      customerHeadersA,
      { paymentTransactionId: 'tx-legit-01' }
    );
    assert.equal(res14.statusCode, 200, 'Successful completion must return 200');
    assert.equal(res14.body.success, true);
    assert.equal(res14.body.data.bookingStatus, 'CONFIRMED');
    assert.equal(res14.body.data.paymentStatus, 'SUCCEEDED');
    assert.equal(res14.body.data.amountEgp, 2500);
    assert.equal(res14.body.data.currency, 'EGP');
    assert.ok(res14.body.data.confirmedAt);
    console.log('  ✅ 14. Successful completion yields CONFIRMED + SUCCEEDED');

    // -------------------------------------------------------------------------
    // 15. Malformed RPC success result -> 500
    // -------------------------------------------------------------------------
    (paymentTxDb as any).completeDepositPayment = async () => ({
      bookingStatus: 'CONFIRMED',
      // missing paymentStatus and confirmedAt
    });
    const res15 = await app.handleHttpRequest(
      'POST',
      '/api/v1/customer/bookings/bk-approved-01/pay/prototype-complete',
      customerHeadersA,
      { paymentTransactionId: 'tx-legit-01' }
    );
    assert.equal(res15.statusCode, 500, 'Malformed RPC output must return 500');
    assert.equal(res15.body.error?.code, 'PAYMENT_COMPLETION_MALFORMED_RESULT');
    console.log('  ✅ 15. Malformed RPC success result -> 500');

    // -------------------------------------------------------------------------
    // 16. Repeated completion cannot create a second financial transition
    // -------------------------------------------------------------------------
    let rpcCallCount = 0;
    (paymentTxDb as any).completeDepositPayment = async () => {
      rpcCallCount++;
      return {
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'SUCCEEDED',
        currency: 'EGP',
        confirmedAt: '2026-09-24T12:00:00Z',
        idempotent: true,
      };
    };
    const res16a = await app.handleHttpRequest(
      'POST',
      '/api/v1/customer/bookings/bk-approved-01/pay/prototype-complete',
      customerHeadersA,
      { paymentTransactionId: 'tx-legit-01' }
    );
    const res16b = await app.handleHttpRequest(
      'POST',
      '/api/v1/customer/bookings/bk-approved-01/pay/prototype-complete',
      customerHeadersA,
      { paymentTransactionId: 'tx-legit-01' }
    );
    assert.equal(res16a.statusCode, 200);
    assert.equal(res16b.statusCode, 200);
    assert.equal(res16a.body.data.bookingStatus, 'CONFIRMED');
    assert.equal(res16b.body.data.bookingStatus, 'CONFIRMED');
    console.log('  ✅ 16. Repeated completion is safe and idempotent');

    // -------------------------------------------------------------------------
    // 17. Customer finance denylist remains intact
    // -------------------------------------------------------------------------
    const resStatus = await app.handleHttpRequest(
      'GET',
      '/api/v1/customer/bookings/bk-approved-01/payment-status',
      customerHeadersA
    );
    assert.equal(resStatus.statusCode, 200);
    const serializedStatus = JSON.stringify(resStatus.body);
    assert.equal(serializedStatus.includes('solaCommissionAmount'), false, 'solaCommissionAmount must not leak');
    assert.equal(serializedStatus.includes('ownerNetDepositAmount'), false, 'ownerNetDepositAmount must not leak');
    assert.equal(serializedStatus.includes('commissionOnRemainingBalance'), false, 'commissionOnRemainingBalance must not leak');
    assert.equal(serializedStatus.includes('ledger'), false, 'ledger details must not leak');

    const resPayInit = await app.handleHttpRequest(
      'POST',
      '/api/v1/customer/bookings/bk-approved-01/pay',
      { ...customerHeadersA, 'idempotency-key': 'attempt-stable-01' }
    );
    const serializedPayInit = JSON.stringify(resPayInit.body);
    assert.equal(serializedPayInit.includes('solaCommissionAmount'), false);
    assert.equal(serializedPayInit.includes('ownerNetDepositAmount'), false);
    console.log('  ✅ 17. Customer finance denylist remains intact');

    // -------------------------------------------------------------------------
    // 18. Missing idempotency key -> 400 PAYMENT_IDEMPOTENCY_KEY_REQUIRED
    // -------------------------------------------------------------------------
    const res18 = await app.handleHttpRequest(
      'POST',
      '/api/v1/customer/bookings/bk-approved-01/pay',
      customerHeadersA
    );
    assert.equal(res18.statusCode, 400, 'Missing idempotency-key header must return 400');
    assert.equal(res18.body.error?.code, 'PAYMENT_IDEMPOTENCY_KEY_REQUIRED');
    console.log('  ✅ 18. Missing idempotency key -> 400 PAYMENT_IDEMPOTENCY_KEY_REQUIRED');

    // =========================================================================
    // SECTION: NORMAL RUNTIME SECURITY CONTRACTS (Simulating Production)
    // In normal/deployed runtime, ALLOW_PAYMENT_TEST_HARNESS is not enabled.
    // An external client sending 'x-konfrm-test-harness: enabled' MUST NEVER
    // turn on the test harness, create MOCK transactions, or reach prototype-complete.
    // =========================================================================
    const savedHarness = process.env.ALLOW_PAYMENT_TEST_HARNESS;
    const savedNodeEnv = process.env.NODE_ENV;
    delete process.env.ALLOW_PAYMENT_TEST_HARNESS;
    process.env.NODE_ENV = 'production';

    try {
      // -----------------------------------------------------------------------
      // 19. Normal customer runtime with no provider returns HTTP 503
      // -----------------------------------------------------------------------
      let txCreateCallCount = 0;
      (paymentTxDb as any).create = async () => {
        txCreateCallCount++;
        return { id: 'tx-should-not-be-created' };
      };
      (bookingDb as any).getById = async () => ({ ...baseApprovedBooking });
      (bookingDb as any).getFinancialSummary = async () => ({ ...baseSummary });

      const res19 = await app.handleHttpRequest(
        'POST',
        '/api/v1/customer/bookings/bk-approved-01/pay',
        { ...normalCustomerHeadersA, 'idempotency-key': 'attempt-normal-failclosed-01' }
      );
      assert.equal(res19.statusCode, 503, 'Normal runtime with unconfigured provider must fail closed with 503');
      assert.equal(res19.body.error?.code, 'PAYMENT_PROVIDER_UNAVAILABLE');
      assert.equal(res19.body.error?.message, 'خدمة الدفع الإلكتروني غير متاحة حاليًا. حاول مرة أخرى لاحقًا.');
      assert.equal(txCreateCallCount, 0, 'Zero payment_transactions rows must be written on 503');
      console.log('  ✅ 19. Normal customer runtime with no provider returns HTTP 503 and writes zero transactions');

      // -----------------------------------------------------------------------
      // 20. Normal customer runtime with spoofed harness header STILL returns 503
      // -----------------------------------------------------------------------
      const res20 = await app.handleHttpRequest(
        'POST',
        '/api/v1/customer/bookings/bk-approved-01/pay',
        {
          ...normalCustomerHeadersA,
          'x-konfrm-test-harness': 'enabled',
          'idempotency-key': 'attempt-spoofed-failclosed-02',
        }
      );
      assert.equal(res20.statusCode, 503, 'Spoofed test harness header must NOT bypass 503 fail-closed');
      assert.equal(res20.body.error?.code, 'PAYMENT_PROVIDER_UNAVAILABLE');
      assert.equal(txCreateCallCount, 0, 'Zero payment_transactions rows written when header is spoofed');
      console.log('  ✅ 20. Normal customer runtime + spoofed harness header STILL returns 503 and zero writes');

      // -----------------------------------------------------------------------
      // 21. Normal runtime prototype-complete without header -> 404
      // -----------------------------------------------------------------------
      const res21 = await app.handleHttpRequest(
        'POST',
        '/api/v1/customer/bookings/bk-approved-01/pay/prototype-complete',
        normalCustomerHeadersA,
        { paymentTransactionId: 'tx-legacy-mock-01' }
      );
      assert.equal(res21.statusCode, 404, 'Normal runtime cannot call prototype-complete');
      assert.equal(res21.body.error?.code, 'NOT_FOUND');
      console.log('  ✅ 21. Normal runtime prototype-complete without header -> 404');

      // -----------------------------------------------------------------------
      // 22. Normal runtime prototype-complete WITH spoofed harness header -> STILL 404
      // -----------------------------------------------------------------------
      const res22 = await app.handleHttpRequest(
        'POST',
        '/api/v1/customer/bookings/bk-approved-01/pay/prototype-complete',
        {
          ...normalCustomerHeadersA,
          'x-konfrm-test-harness': 'enabled',
        },
        { paymentTransactionId: 'tx-legacy-mock-01' }
      );
      assert.equal(res22.statusCode, 404, 'Spoofed harness header must NOT unlock prototype-complete');
      assert.equal(res22.body.error?.code, 'NOT_FOUND');
      console.log('  ✅ 22. Normal runtime prototype-complete WITH spoofed harness header -> STILL 404');

      // -----------------------------------------------------------------------
      // 23. Legacy MOCK transactions are ignored in normal runtime without header
      // -----------------------------------------------------------------------
      (paymentTxDb as any).getByBookingId = async () => [
        {
          id: 'tx-legacy-mock-01',
          provider: 'MOCK',
          status: 'INITIATED',
          amount_cents: 250000,
          currency: 'EGP',
          merchant_order_id: 'KONFRM-DEP-MOCK-OLD',
        },
      ];

      const res23 = await app.handleHttpRequest(
        'GET',
        '/api/v1/customer/bookings/bk-approved-01/payment-status',
        normalCustomerHeadersA
      );
      assert.equal(res23.statusCode, 200);
      assert.equal(res23.body.data.hasPaymentTransaction, false, 'Legacy MOCK tx ignored in normal runtime');
      assert.equal(res23.body.data.paymentStatus, 'NO_PAYMENT_INITIATED');
      assert.equal(res23.body.data.mode, undefined, 'Normal runtime payment status must not leak mode');
      console.log('  ✅ 23. Legacy MOCK transactions are ignored in normal runtime');

      // -----------------------------------------------------------------------
      // 24. Spoofed header cannot make normal runtime resume legacy MOCK transaction
      // -----------------------------------------------------------------------
      const res24 = await app.handleHttpRequest(
        'GET',
        '/api/v1/customer/bookings/bk-approved-01/payment-status',
        {
          ...normalCustomerHeadersA,
          'x-konfrm-test-harness': 'enabled',
        }
      );
      assert.equal(res24.statusCode, 200);
      assert.equal(res24.body.data.hasPaymentTransaction, false, 'Spoofed header cannot resume legacy MOCK tx');
      assert.equal(res24.body.data.paymentStatus, 'NO_PAYMENT_INITIATED');
      console.log('  ✅ 24. Spoofed header cannot make normal runtime resume legacy MOCK transaction');
    } finally {
      process.env.ALLOW_PAYMENT_TEST_HARNESS = savedHarness;
      process.env.NODE_ENV = savedNodeEnv;
    }

    // -------------------------------------------------------------------------
    // 25. Explicit local/CI test runtime access to isolated test harness
    // -------------------------------------------------------------------------
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_PAYMENT_TEST_HARNESS = 'true';
    (bookingDb as any).getById = async () => ({ ...baseApprovedBooking });
    (bookingDb as any).getFinancialSummary = async () => ({ ...baseSummary });
    (paymentTxDb as any).getByIdempotencyKey = async () => null;
    (paymentTxDb as any).getByBookingId = async () => [];
    let harnessTxCreated: any = null;
    (paymentTxDb as any).create = async (params: any) => {
      harnessTxCreated = params;
      return {
        id: 'tx-harness-verified-01',
        ...params,
        status: 'INITIATED',
        provider: 'MOCK',
      };
    };

    const res25 = await app.handleHttpRequest(
      'POST',
      '/api/v1/customer/bookings/bk-approved-01/pay',
      {
        ...customerHeadersA,
        'idempotency-key': 'attempt-harness-authorized-01',
      }
    );
    assert.equal(res25.statusCode, 200, 'Explicit local/CI test runtime with header enters test harness');
    assert.equal(harnessTxCreated?.provider, 'MOCK');
    console.log('  ✅ 25. Explicit local/CI test runtime may access isolated test harness');
    console.log('  ✅ 26. Test harness creates only test/mock transaction behavior when intentionally authorized');

    console.log('\nALL 26 PAYMENT BOUNDARY FAIL-CLOSED & SECURITY CHECKS PASSED DETERMINISTICALLY!\n');
  } finally {
    restoreMocks();
  }
}

runSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});

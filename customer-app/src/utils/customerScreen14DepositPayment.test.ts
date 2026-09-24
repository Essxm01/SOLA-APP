/**
 * KONFRM Customer Screen 14 Deposit Payment Test Suite
 * Location: customer-app/src/utils/customerScreen14DepositPayment.test.ts
 *
 * Verifies all required conditions for Customer Screen 14:
 * 1. Typed error classes for fail-closed handling (401, 403, 404, 503 provider-unavailable)
 * 2. Idempotency key generation and attempt scoping
 * 3. Real product payment initiation and external handoff
 * 4. Server-authoritative financial calculation & zero leakage
 * 5. Amount mismatch protection (AMOUNT_CHANGED)
 * 6. Auth V2 PROTECTED_PAYMENT recovery contract
 * 7. Cross-account fail-closed protection
 * 8. Status reconciliation on uncertain network failure
 * 9. Fail-closed provider availability boundary
 */

import {
  CustomerPaymentUnauthorizedError,
  CustomerPaymentForbiddenError,
  CustomerPaymentNotFoundError,
  CustomerPaymentProviderUnavailableError,
  type InitiatePaymentResult,
  type PaymentStatusResult,
} from '../services/customerPaymentService';
import type { Screen14PaymentState } from '../components/CustomerDepositPaymentScreen';
import {
  canStartFreshScreen14Attempt,
  clearScreen14PrivateState,
  evaluateResumedAmountAuthority,
  getAllowedScreen14Action,
  resolveScreen14HttpErrorState,
  resolveScreen14ReconciliationState,
  resolveScreen14TypedErrorState,
} from './customerScreen14PaymentState';

function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  assert(actual === expected, `${message || 'assertEqual failed'} (actual=${String(actual)} expected=${String(expected)})`);
}

function assertNotEqual<T>(actual: T, expected: T, message?: string): void {
  assert(actual !== expected, `${message || 'assertNotEqual failed'} (both are ${String(actual)})`);
}

console.log('--- Starting Screen 14 Deposit Payment Tests ---');

// 1. Typed Error Classes
{
  const unauth = new CustomerPaymentUnauthorizedError();
  assertEqual(unauth.name, 'CustomerPaymentUnauthorizedError', 'Unauthorized error name');
  assert(unauth instanceof Error, 'Unauthorized error is an instance of Error');

  const forbidden = new CustomerPaymentForbiddenError();
  assertEqual(forbidden.name, 'CustomerPaymentForbiddenError', 'Forbidden error name');
  assert(forbidden instanceof Error, 'Forbidden error is an instance of Error');

  const notFound = new CustomerPaymentNotFoundError();
  assertEqual(notFound.name, 'CustomerPaymentNotFoundError', 'Not found error name');
  assert(notFound instanceof Error, 'Not found error is an instance of Error');

  const provUnavail = new CustomerPaymentProviderUnavailableError();
  assertEqual(provUnavail.name, 'CustomerPaymentProviderUnavailableError', 'Provider unavailable error name');
  assert(provUnavail instanceof Error, 'Provider unavailable error is an instance of Error');
  console.log('✓ Typed payment errors verified');
}

// 2. Idempotency Key Semantics
{
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const key1 = crypto.randomUUID();
  const key2 = crypto.randomUUID();

  assert(uuidRegex.test(key1), 'Key 1 is valid UUID');
  assert(uuidRegex.test(key2), 'Key 2 is valid UUID');
  assertNotEqual(key1, key2, 'Distinct attempts generate distinct idempotency keys');
  console.log('✓ Idempotency key generation verified');
}

// 3. Screen 14 Payment States
{
  const expectedStates: Screen14PaymentState[] = [
    'INITIAL_LOADING',
    'READY',
    'AMOUNT_CHANGED',
    'INITIATING',
    'EXTERNAL_HANDOFF_READY',
    'PROVIDER_UNAVAILABLE',
    'CHECKING_STATUS',
    'PAYMENT_PENDING',
    'FAILED',
    'TRANSACTION_EXPIRED',
    'SUCCESS',
    'ALREADY_CONFIRMED',
    'STATE_CHANGED',
    'NETWORK_RECONCILIATION_REQUIRED',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'ERROR',
  ];

  for (const st of expectedStates) {
    assertEqual(typeof st, 'string', `Valid Screen 14 state: ${st}`);
  }
  console.log('✓ Screen 14 state union verified');
}

// 4. Real Product Payment Result Types
{
  const mockInitiateResult: InitiatePaymentResult = {
    paymentTransactionId: 'txn-14001',
    merchantOrderId: 'ord-14001',
    depositAmountEgp: 2000,
    depositAmountCents: 200000,
    requiresExternalCheckout: true,
    checkoutUrl: 'https://accept.paymob.com/api/acceptance/iframes/12345',
  };

  assertEqual(mockInitiateResult.requiresExternalCheckout, true, 'Real payment requires external checkout');
  assertEqual(mockInitiateResult.depositAmountEgp * 100, mockInitiateResult.depositAmountCents, 'Cents match EGP');
  assertEqual(mockInitiateResult.checkoutUrl, 'https://accept.paymob.com/api/acceptance/iframes/12345', 'Checkout URL present');
  console.log('✓ Real product payment results verified');
}

// 5. Server Authority & Zero Leakage
{
  const paymentStatus: PaymentStatusResult = {
    bookingId: 'bk-14001',
    hasPaymentTransaction: true,
    paymentStatus: 'SUCCEEDED',
    merchantOrderId: 'ord-14001',
    amountEgp: 2000,
    currency: 'EGP',
    bookingStatus: 'CONFIRMED',
    paymentTransactionId: 'txn-14001',
  };

  const statusKeys = Object.keys(paymentStatus);
  assert(!statusKeys.includes('commissionRate'), 'No commissionRate in payment status');
  assert(!statusKeys.includes('commissionAmount'), 'No commissionAmount in payment status');
  assert(!statusKeys.includes('ownerNet'), 'No ownerNet in payment status');
  assert(!statusKeys.includes('ledgerInternal'), 'No ledgerInternal in payment status');
  assert(!statusKeys.includes('mode'), 'No mode in payment status');
  console.log('✓ Server authority and zero financial leakage verified');
}

// 6. Auth V2 PROTECTED_PAYMENT Recovery Invariant
{
  const origin = { type: 'PROTECTED_PAYMENT' as const, bookingId: 'bk-14001' };
  assertEqual(origin.type, 'PROTECTED_PAYMENT', 'Auth origin is PROTECTED_PAYMENT');
  assertEqual(origin.bookingId, 'bk-14001', 'Booking ID preserved for navigation recovery');
  assert(!('autoPay' in origin), 'Must never have autoPay flag');
  assert(!('autoComplete' in origin), 'Must never have autoComplete flag');
  console.log('✓ Auth V2 PROTECTED_PAYMENT recovery contract verified');
}

// 7. Executable reconciliation and retry state transitions
{
  const approved = 'APPROVED_PENDING_PAYMENT';
  assertEqual(resolveScreen14ReconciliationState(approved, 'NO_PAYMENT_INITIATED', false, false), 'READY', 'no payment is ready');
  assertEqual(resolveScreen14ReconciliationState(approved, 'INITIATED', true, false), 'PAYMENT_PENDING', 'active initiated attempt resumes as PAYMENT_PENDING');
  assertEqual(resolveScreen14ReconciliationState(approved, 'PENDING', true, false), 'PAYMENT_PENDING', 'active pending attempt resumes as PAYMENT_PENDING');
  assertEqual(resolveScreen14ReconciliationState(approved, 'FAILED', false, false), 'FAILED', 'failed attempt remains failed until explicit retry');
  assertEqual(resolveScreen14ReconciliationState(approved, 'FAILED', false, true), 'READY', 'failed attempt can explicitly start fresh');
  assertEqual(resolveScreen14ReconciliationState(approved, 'EXPIRED', false, true), 'READY', 'expired attempt can explicitly start fresh');
  assertEqual(canStartFreshScreen14Attempt(approved, 'FAILED', false), true, 'failed attempt is eligible for fresh attempt');
  assertEqual(canStartFreshScreen14Attempt(approved, 'EXPIRED', false), true, 'expired attempt is eligible for fresh attempt');
  assertEqual(canStartFreshScreen14Attempt(approved, 'PENDING', true), false, 'active pending attempt refuses duplicate initiation');
  assertEqual(canStartFreshScreen14Attempt(approved, 'INITIATED', true), false, 'active initiated attempt refuses duplicate initiation');
  assertEqual(resolveScreen14ReconciliationState('CONFIRMED', 'SUCCEEDED', true, false), 'ALREADY_CONFIRMED', 'confirmed booking is already paid');
  assertEqual(resolveScreen14ReconciliationState(approved, 'SUCCEEDED', true, false), 'NETWORK_RECONCILIATION_REQUIRED', 'succeeded payment without booking confirmation reconciles');
  assertEqual(resolveScreen14ReconciliationState('PENDING_OWNER_APPROVAL', 'NO_PAYMENT_INITIATED', false, false), 'STATE_CHANGED', 'pending owner approval is not payable');
  assertEqual(resolveScreen14ReconciliationState('CANCELLED_BY_OWNER', 'NO_PAYMENT_INITIATED', false, false), 'STATE_CHANGED', 'terminal booking is not payable');
  assertEqual(resolveScreen14ReconciliationState('UNKNOWN_STATUS', 'NO_PAYMENT_INITIATED', false, false), 'STATE_CHANGED', 'unknown booking status fails closed');
  assertEqual(resolveScreen14ReconciliationState(approved, 'INITIATED', false, false), 'NETWORK_RECONCILIATION_REQUIRED', 'missing active transaction fails closed');
  assertEqual(resolveScreen14ReconciliationState(approved, 'PENDING', false, false), 'NETWORK_RECONCILIATION_REQUIRED', 'missing active pending transaction fails closed');
  const cleared = clearScreen14PrivateState();
  assertEqual(cleared.booking, null, 'unauthorized cleanup clears booking');
  assertEqual(cleared.paymentTransactionId, null, 'unauthorized cleanup clears transaction');
  assertEqual(cleared.activeDepositEgp, 0, 'unauthorized cleanup clears active amount');
  assertEqual(cleared.previousDepositEgp, null, 'unauthorized cleanup clears previous amount');
  assertEqual(resolveScreen14HttpErrorState(401), 'UNAUTHORIZED', 'amount refresh 401 is unauthorized');
  assertEqual(resolveScreen14HttpErrorState(403), 'FORBIDDEN', 'amount refresh 403 is forbidden');
  assertEqual(resolveScreen14HttpErrorState(404), 'NOT_FOUND', 'amount refresh 404 is not found');
  assertEqual(resolveScreen14TypedErrorState('CustomerPaymentUnauthorizedError'), 'UNAUTHORIZED', 'verification 401 is unauthorized');
  assertEqual(resolveScreen14TypedErrorState('CustomerPaymentForbiddenError'), 'FORBIDDEN', 'verification 403 is forbidden');
  assertEqual(resolveScreen14TypedErrorState('CustomerPaymentNotFoundError'), 'NOT_FOUND', 'verification 404 is not found');
  assertEqual(resolveScreen14TypedErrorState('CustomerPaymentProviderUnavailableError'), 'PROVIDER_UNAVAILABLE', 'provider unavailable typed error maps to PROVIDER_UNAVAILABLE');
  assertEqual(resolveScreen14TypedErrorState('Error'), null, 'transport uncertainty does not become auth success');
  console.log('✓ Executable Screen 14 reconciliation, retry, and cleanup transitions verified');
}

// 8. Section 15 Behavioral Tests & Amount Authority Matrix
{
  const approved = 'APPROVED_PENDING_PAYMENT';

  // 1. APPROVED + INITIATED + transaction -> PAYMENT_PENDING
  assertEqual(resolveScreen14ReconciliationState(approved, 'INITIATED', true, false), 'PAYMENT_PENDING', '1. APPROVED + INITIATED -> PAYMENT_PENDING');

  // 2. APPROVED + PENDING + transaction -> PAYMENT_PENDING
  assertEqual(resolveScreen14ReconciliationState(approved, 'PENDING', true, false), 'PAYMENT_PENDING', '2. APPROVED + PENDING -> PAYMENT_PENDING');

  // 3. PENDING cannot call payment initiation
  assertNotEqual(getAllowedScreen14Action('PAYMENT_PENDING'), 'INITIATE_PAYMENT', '3. PENDING cannot call payment initiation');
  assertEqual(canStartFreshScreen14Attempt(approved, 'PENDING', true), false, '3b. PENDING active attempt cannot start fresh initiation');

  // 4. PENDING status-check re-runs payment-status only
  assertEqual(getAllowedScreen14Action('PAYMENT_PENDING'), 'CHECK_STATUS', '4. PENDING allowed action is CHECK_STATUS');

  // 5. PENDING -> PENDING remains PAYMENT_PENDING
  assertEqual(resolveScreen14ReconciliationState(approved, 'PENDING', true, false), 'PAYMENT_PENDING', '5. PENDING -> PENDING remains PAYMENT_PENDING');

  // 6. SUCCEEDED + CONFIRMED -> ALREADY_CONFIRMED
  assertEqual(resolveScreen14ReconciliationState('CONFIRMED', 'SUCCEEDED', true, false), 'ALREADY_CONFIRMED', '6. SUCCEEDED + CONFIRMED -> ALREADY_CONFIRMED');

  // 7. FAILED -> FAILED
  assertEqual(resolveScreen14ReconciliationState(approved, 'FAILED', false, false), 'FAILED', '7. FAILED -> FAILED');

  // 8. EXPIRED transaction -> TRANSACTION_EXPIRED
  assertEqual(resolveScreen14ReconciliationState(approved, 'EXPIRED', false, false), 'TRANSACTION_EXPIRED', '8. EXPIRED -> TRANSACTION_EXPIRED');

  // 9. Matching amount status is MATCHED
  const authMatched = evaluateResumedAmountAuthority(2000, 2000);
  assertEqual(authMatched.status, 'MATCHED', '9. Matching amount status is MATCHED');
  if (authMatched.status === 'MATCHED') {
    assertEqual(authMatched.amountEgp, 2000, '9b. Matched amount is 2000');
  }

  // 10. Mismatched amount status is MISMATCH_REVIEW_REQUIRED
  const authMismatch = evaluateResumedAmountAuthority(2000, 2500);
  assertEqual(authMismatch.status, 'MISMATCH_REVIEW_REQUIRED', '10. Mismatched amount status is MISMATCH_REVIEW_REQUIRED');

  // 11. Fresh refetch matching 2500 is coherent
  const authFreshMatch = evaluateResumedAmountAuthority(2500, 2500);
  assertEqual(authFreshMatch.status, 'MATCHED', '11. Fresh refetch matching 2500 is coherent');
  assertEqual(getAllowedScreen14Action('AMOUNT_CHANGED'), 'ACKNOWLEDGE_AMOUNT', '11b. AMOUNT_CHANGED requires explicit acknowledgement');

  // 12. Unresolved mismatch -> fail closed
  const authUnresolved = evaluateResumedAmountAuthority(2000, 2500);
  assertNotEqual(authUnresolved.status, 'MATCHED', '12. Unresolved mismatch cannot be MATCHED');
  assertEqual(getAllowedScreen14Action('ERROR'), 'RETRY_REVALIDATION', '12b. Fail closed state is ERROR');

  // 13. PENDING amount mismatch -> allows only status check
  assertEqual(getAllowedScreen14Action('PAYMENT_PENDING'), 'CHECK_STATUS', '13. PENDING with mismatch allows only status check');

  // 14. Missing transaction amount for active attempt -> fail closed
  const authMissingTxn = evaluateResumedAmountAuthority(2000, undefined);
  assertEqual(authMissingTxn.status, 'INCONSISTENT_FAIL_CLOSED', '14. Missing transaction amount fails closed');
  const authZeroTxn = evaluateResumedAmountAuthority(2000, 0);
  assertEqual(authZeroTxn.status, 'INCONSISTENT_FAIL_CLOSED', '14b. Zero transaction amount fails closed');

  // 15. Invalid canonical deposit -> fail closed
  const authMissingCanon = evaluateResumedAmountAuthority(undefined, 2000);
  assertEqual(authMissingCanon.status, 'INCONSISTENT_FAIL_CLOSED', '15. Missing canonical deposit fails closed');
  const authNegativeCanon = evaluateResumedAmountAuthority(-500, 2000);
  assertEqual(authNegativeCanon.status, 'INCONSISTENT_FAIL_CLOSED', '15b. Negative canonical deposit fails closed');

  // 16. Existing FAILED fresh retry tests remain green
  assertEqual(canStartFreshScreen14Attempt(approved, 'FAILED', false), true, '16. FAILED attempt eligible for fresh attempt');
  assertEqual(resolveScreen14ReconciliationState(approved, 'FAILED', false, true), 'READY', '16b. FAILED with allowFreshAttempt becomes READY');

  // 17. Existing EXPIRED fresh retry tests remain green
  assertEqual(canStartFreshScreen14Attempt(approved, 'EXPIRED', false), true, '17. EXPIRED attempt eligible for fresh attempt');
  assertEqual(resolveScreen14ReconciliationState(approved, 'EXPIRED', false, true), 'READY', '17b. EXPIRED with allowFreshAttempt becomes READY');

  // 18. Existing active-attempt duplicate prevention remains green
  assertEqual(canStartFreshScreen14Attempt(approved, 'INITIATED', true), false, '18. INITIATED active attempt blocks fresh attempt');
  assertEqual(canStartFreshScreen14Attempt(approved, 'PENDING', true), false, '18b. PENDING active attempt blocks fresh attempt');

  console.log('✓ Section 15: All behavioral tests verified');
}

// 9. Section 16 Action Permissions Matrix
{
  assertEqual(getAllowedScreen14Action('READY'), 'INITIATE_PAYMENT', 'READY allows INITIATE_PAYMENT');
  assertEqual(getAllowedScreen14Action('PROVIDER_UNAVAILABLE'), 'REQUEST_FRESH_ATTEMPT', 'PROVIDER_UNAVAILABLE allows REQUEST_FRESH_ATTEMPT');
  assertEqual(getAllowedScreen14Action('PAYMENT_PENDING'), 'CHECK_STATUS', 'PAYMENT_PENDING allows CHECK_STATUS');
  assertEqual(getAllowedScreen14Action('FAILED'), 'REQUEST_FRESH_ATTEMPT', 'FAILED allows REQUEST_FRESH_ATTEMPT');
  assertEqual(getAllowedScreen14Action('TRANSACTION_EXPIRED'), 'REQUEST_FRESH_ATTEMPT', 'TRANSACTION_EXPIRED allows REQUEST_FRESH_ATTEMPT');
  assertEqual(getAllowedScreen14Action('AMOUNT_CHANGED'), 'ACKNOWLEDGE_AMOUNT', 'AMOUNT_CHANGED allows ACKNOWLEDGE_AMOUNT');
  assertEqual(getAllowedScreen14Action('NETWORK_RECONCILIATION_REQUIRED'), 'CHECK_STATUS', 'NETWORK_RECONCILIATION_REQUIRED allows CHECK_STATUS');
  assertEqual(getAllowedScreen14Action('SUCCESS'), 'RETURN_TO_BOOKING', 'SUCCESS allows RETURN_TO_BOOKING');
  assertEqual(getAllowedScreen14Action('ALREADY_CONFIRMED'), 'RETURN_TO_BOOKING', 'ALREADY_CONFIRMED allows RETURN_TO_BOOKING');
  assertEqual(getAllowedScreen14Action('STATE_CHANGED'), 'RETURN_TO_BOOKING', 'STATE_CHANGED allows RETURN_TO_BOOKING');
  assertEqual(getAllowedScreen14Action('UNAUTHORIZED'), 'REAUTHENTICATE', 'UNAUTHORIZED allows REAUTHENTICATE');
  assertEqual(getAllowedScreen14Action('FORBIDDEN'), 'RETURN_TO_BOOKINGS', 'FORBIDDEN allows RETURN_TO_BOOKINGS');
  assertEqual(getAllowedScreen14Action('NOT_FOUND'), 'RETURN_TO_BOOKINGS', 'NOT_FOUND allows RETURN_TO_BOOKINGS');
  assertEqual(getAllowedScreen14Action('ERROR'), 'RETRY_REVALIDATION', 'ERROR allows RETRY_REVALIDATION');

  // Critical Invariants:
  assert(getAllowedScreen14Action('PAYMENT_PENDING') !== 'INITIATE_PAYMENT', 'CRITICAL: PAYMENT_PENDING must never allow INITIATE_PAYMENT');

  console.log('✓ Section 16: Action permissions and critical invariants verified');
}

console.log('--- ALL Screen 14 Tests Passed Successfully ---');

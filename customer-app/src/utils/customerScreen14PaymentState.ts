import type { CustomerBookingDetailDto } from '../types/customerBookingDetail';
import type { PaymentStatusResult } from '../services/customerPaymentService';
import type { Screen14PaymentState } from '../components/CustomerDepositPaymentScreen';

export type Screen14PrivateState = {
  booking: CustomerBookingDetailDto | null;
  paymentTransactionId: string | null;
  activeDepositEgp: number;
  previousDepositEgp: number | null;
  errorMessage: string | null;
};

/** Clear all account-bound payment data while retaining bookingId in the caller's navigation context. */
export function clearScreen14PrivateState(): Screen14PrivateState {
  return {
    booking: null,
    paymentTransactionId: null,
    activeDepositEgp: 0,
    previousDepositEgp: null,
    errorMessage: null,
  };
}

export function resolveScreen14HttpErrorState(status: number): Screen14PaymentState | null {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  return null;
}

export function resolveScreen14TypedErrorState(errorName: string | undefined): Screen14PaymentState | null {
  if (errorName === 'CustomerPaymentUnauthorizedError') return 'UNAUTHORIZED';
  if (errorName === 'CustomerPaymentForbiddenError') return 'FORBIDDEN';
  if (errorName === 'CustomerPaymentNotFoundError') return 'NOT_FOUND';
  return null;
}
/**
 * Server status is authoritative. A failed/expired transaction is not an
 * active attempt and can become READY only after the user explicitly requests
 * a new attempt and the booking has been revalidated.
 *
 * Distinction:
 * - INITIATED + hasPaymentTransaction -> PROTOTYPE_READY_TO_COMPLETE
 * - PENDING + hasPaymentTransaction -> PAYMENT_PENDING (never completable)
 */
export function resolveScreen14ReconciliationState(
  bookingStatus: string,
  paymentStatus: PaymentStatusResult['paymentStatus'],
  hasPaymentTransaction: boolean,
  allowFreshAttempt: boolean,
): Screen14PaymentState {
  if (bookingStatus === 'CONFIRMED') return 'ALREADY_CONFIRMED';
  if (bookingStatus !== 'APPROVED_PENDING_PAYMENT') return 'STATE_CHANGED';
  if (paymentStatus === 'SUCCEEDED') return 'NETWORK_RECONCILIATION_REQUIRED';
  if (paymentStatus === 'INITIATED') {
    return hasPaymentTransaction ? 'PROTOTYPE_READY_TO_COMPLETE' : 'NETWORK_RECONCILIATION_REQUIRED';
  }
  if (paymentStatus === 'PENDING') {
    return hasPaymentTransaction ? 'PAYMENT_PENDING' : 'NETWORK_RECONCILIATION_REQUIRED';
  }
  if ((paymentStatus === 'FAILED' || paymentStatus === 'EXPIRED') && allowFreshAttempt) return 'READY';
  if (paymentStatus === 'FAILED') return 'FAILED';
  if (paymentStatus === 'EXPIRED') return 'TRANSACTION_EXPIRED';
  if (paymentStatus === 'NO_PAYMENT_INITIATED') return 'READY';
  return 'NETWORK_RECONCILIATION_REQUIRED';
}

export function canStartFreshScreen14Attempt(
  bookingStatus: string,
  paymentStatus: PaymentStatusResult['paymentStatus'],
  hasPaymentTransaction: boolean,
): boolean {
  return bookingStatus === 'APPROVED_PENDING_PAYMENT'
    && !hasPaymentTransaction
    && (paymentStatus === 'FAILED' || paymentStatus === 'EXPIRED' || paymentStatus === 'NO_PAYMENT_INITIATED');
}

export type ResumedAmountAuthorityResult =
  | { status: 'MATCHED'; amountEgp: number }
  | { status: 'MISMATCH_REVIEW_REQUIRED'; canonicalDeposit: number; transactionAmount: number }
  | { status: 'INCONSISTENT_FAIL_CLOSED'; reason: string };

/**
 * Pure amount authority evaluator for resumed active transactions.
 * Strict numeric validation without fallback masking.
 */
export function evaluateResumedAmountAuthority(
  canonicalDeposit: unknown,
  transactionAmount: unknown,
): ResumedAmountAuthorityResult {
  const isValidCanonical =
    typeof canonicalDeposit === 'number' && Number.isFinite(canonicalDeposit) && canonicalDeposit > 0;
  const isValidTransaction =
    typeof transactionAmount === 'number' && Number.isFinite(transactionAmount) && transactionAmount > 0;

  if (!isValidCanonical || !isValidTransaction) {
    return {
      status: 'INCONSISTENT_FAIL_CLOSED',
      reason: !isValidCanonical ? 'INVALID_CANONICAL_DEPOSIT' : 'INVALID_TRANSACTION_AMOUNT',
    };
  }

  if (canonicalDeposit === transactionAmount) {
    return { status: 'MATCHED', amountEgp: canonicalDeposit };
  }

  return {
    status: 'MISMATCH_REVIEW_REQUIRED',
    canonicalDeposit,
    transactionAmount,
  };
}

export type Screen14AllowedAction =
  | 'INITIATE_PAYMENT'
  | 'COMPLETE_PROTOTYPE'
  | 'CHECK_STATUS'
  | 'REQUEST_FRESH_ATTEMPT'
  | 'ACKNOWLEDGE_AMOUNT'
  | 'RETURN_TO_BOOKING'
  | 'RETURN_TO_BOOKINGS'
  | 'REAUTHENTICATE'
  | 'RETRY_REVALIDATION'
  | 'NONE';

/**
 * Pure action resolver mapping each Screen 14 state to its permitted action.
 * Critical Invariant: PAYMENT_PENDING must NEVER resolve to COMPLETE_PROTOTYPE or INITIATE_PAYMENT.
 */
export function getAllowedScreen14Action(state: Screen14PaymentState): Screen14AllowedAction {
  switch (state) {
    case 'READY':
      return 'INITIATE_PAYMENT';
    case 'PROTOTYPE_READY_TO_COMPLETE':
      return 'COMPLETE_PROTOTYPE';
    case 'PAYMENT_PENDING':
      return 'CHECK_STATUS';
    case 'FAILED':
    case 'TRANSACTION_EXPIRED':
      return 'REQUEST_FRESH_ATTEMPT';
    case 'AMOUNT_CHANGED':
      return 'ACKNOWLEDGE_AMOUNT';
    case 'SUCCESS':
    case 'ALREADY_CONFIRMED':
    case 'STATE_CHANGED':
      return 'RETURN_TO_BOOKING';
    case 'UNAUTHORIZED':
      return 'REAUTHENTICATE';
    case 'FORBIDDEN':
    case 'NOT_FOUND':
      return 'RETURN_TO_BOOKINGS';
    case 'NETWORK_RECONCILIATION_REQUIRED':
      return 'CHECK_STATUS';
    case 'ERROR':
      return 'RETRY_REVALIDATION';
    case 'INITIAL_LOADING':
    case 'INITIATING':
    case 'CHECKING_STATUS':
    case 'EXTERNAL_HANDOFF_READY':
    default:
      return 'NONE';
  }
}

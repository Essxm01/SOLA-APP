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
/**
 * Server status is authoritative. A failed/expired transaction is not an
 * active attempt and can become READY only after the user explicitly requests
 * a new attempt and the booking has been revalidated.
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
  if ((paymentStatus === 'INITIATED' || paymentStatus === 'PENDING') && hasPaymentTransaction) {
    return 'PROTOTYPE_READY_TO_COMPLETE';
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

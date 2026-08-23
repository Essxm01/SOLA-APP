/**
 * Sola Vacation Rentals — Customer Payment API Client Service
 * Location: customer-app/src/services/customerPaymentService.ts
 * Master Source of Truth: TASK 2A.3 REVISION & PHASE_7_MASTER_SPECIFICATION.md
 * 
 * Strict Architecture Rules:
 * - NO webhook triggering or HMAC signature handling.
 * - NO client-side financial calculations (all amounts calculated by backend).
 * - Server Authority: Success confirmed only via GET /payment-status or server response.
 */

export interface InitiatePaymentResult {
  paymentTransactionId: string;
  merchantOrderId: string;
  depositAmountEgp: number;
  depositAmountCents: number;
  checkoutUrl?: string;
  expiresAt?: string;
  mode: 'PROTOTYPE' | 'LIVE';
  requiresExternalCheckout: boolean;
}

export interface PaymentStatusResult {
  bookingId: string;
  hasPaymentTransaction: boolean;
  paymentStatus: 'INITIATED' | 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED' | 'NO_PAYMENT_INITIATED';
  merchantOrderId?: string;
  providerTransactionId?: string;
  amountEgp: number;
  currency: string;
  bookingStatus: string;
}

export interface PrototypeCompletionResult {
  bookingId: string;
  bookingStatus: 'CONFIRMED';
  paymentTransactionId: string;
  paymentStatus: 'SUCCEEDED';
  amountEgp: number;
  currency: string;
  confirmedAt?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class CustomerPaymentService {
  /**
   * Initiates payment for an approved booking (Status must be APPROVED_PENDING_PAYMENT)
   */
  static async initiatePayment(
    bookingId: string,
    idempotencyKey: string,
    authToken: string
  ): Promise<InitiatePaymentResult> {
    const res = await fetch(`${API_BASE_URL}/customer/bookings/${bookingId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ paymentMethod: 'CARD' }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.code || json.error?.message || 'PAYMENT_INITIATION_FAILED');
    }

    return json.data;
  }

  static async completePrototypePayment(
    bookingId: string,
    paymentTransactionId: string,
    authToken: string
  ): Promise<PrototypeCompletionResult> {
    const res = await fetch(`${API_BASE_URL}/customer/bookings/${bookingId}/pay/prototype-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ paymentTransactionId }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error?.code || json.error?.message || 'PAYMENT_COMPLETION_FAILED');
    return json.data;
  }

  /**
   * Fetches server-authoritative payment and booking status
   */
  static async getPaymentStatus(
    bookingId: string,
    authToken: string
  ): Promise<PaymentStatusResult> {
    const res = await fetch(`${API_BASE_URL}/customer/bookings/${bookingId}/payment-status`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.code || json.error?.message || 'FETCH_PAYMENT_STATUS_FAILED');
    }

    return json.data;
  }
}

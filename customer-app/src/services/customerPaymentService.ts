/**
 * Sola Vacation Rentals — Customer Payment API Client Service
 * Location: customer-app/src/services/customerPaymentService.ts
 * Master Source of Truth: TASK 2A.3 REVISION & PHASE_7_MASTER_SPECIFICATION.md
 *
 * Strict Architecture Rules:
 * - NO webhook triggering or HMAC signature handling.
 * - NO client-side financial calculations (all amounts calculated by backend).
 * - Server Authority: Success confirmed only via GET /payment-status or server response.
 * - Fail-Closed: Typed error handling for 401, 403, and 404.
 */

import { getApiUrl } from '../utils/api';

export class CustomerPaymentUnauthorizedError extends Error {
  constructor(message = 'UNAUTHORIZED_PAYMENT_ACCESS') {
    super(message);
    this.name = 'CustomerPaymentUnauthorizedError';
  }
}

export class CustomerPaymentForbiddenError extends Error {
  constructor(message = 'FORBIDDEN_PAYMENT_ACCESS') {
    super(message);
    this.name = 'CustomerPaymentForbiddenError';
  }
}

export class CustomerPaymentNotFoundError extends Error {
  constructor(message = 'BOOKING_NOT_FOUND') {
    super(message);
    this.name = 'CustomerPaymentNotFoundError';
  }
}

export class CustomerPaymentProviderUnavailableError extends Error {
  constructor(message = 'خدمة الدفع الإلكتروني غير متاحة حاليًا. حاول مرة أخرى لاحقًا.') {
    super(message);
    this.name = 'CustomerPaymentProviderUnavailableError';
  }
}

export interface InitiatePaymentResult {
  paymentTransactionId: string;
  merchantOrderId: string;
  depositAmountEgp: number;
  depositAmountCents: number;
  checkoutUrl?: string;
  expiresAt?: string;
  requiresExternalCheckout?: boolean;
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
  paymentTransactionId?: string;
}

export class CustomerPaymentService {
  /**
   * Initiates payment for an approved booking (Status must be APPROVED_PENDING_PAYMENT)
   */
  static async initiatePayment(
    bookingId: string,
    idempotencyKey: string,
    authToken: string
  ): Promise<InitiatePaymentResult> {
    const res = await fetch(getApiUrl(`/customer/bookings/${bookingId}/pay`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ paymentMethod: 'CARD' }),
    });

    if (res.status === 401) throw new CustomerPaymentUnauthorizedError();
    if (res.status === 403) throw new CustomerPaymentForbiddenError();
    if (res.status === 404) throw new CustomerPaymentNotFoundError();

    const json = await res.json().catch(() => ({}));

    if (res.status === 503 || json.error?.code === 'PAYMENT_PROVIDER_UNAVAILABLE') {
      throw new CustomerPaymentProviderUnavailableError(json.error?.message);
    }

    if (!res.ok || !json.success) {
      const err = new Error(json.error?.code || json.error?.message || 'PAYMENT_INITIATION_FAILED');
      (err as any).code = json.error?.code;
      (err as any).response = json;
      throw err;
    }

    return json.data;
  }

  /**
   * Fetches server-authoritative payment and booking status
   */
  static async getPaymentStatus(
    bookingId: string,
    authToken: string
  ): Promise<PaymentStatusResult> {
    const res = await fetch(getApiUrl(`/customer/bookings/${bookingId}/payment-status`), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (res.status === 401) throw new CustomerPaymentUnauthorizedError();
    if (res.status === 403) throw new CustomerPaymentForbiddenError();
    if (res.status === 404) throw new CustomerPaymentNotFoundError();

    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      const err = new Error(json.error?.code || json.error?.message || 'FETCH_PAYMENT_STATUS_FAILED');
      (err as any).code = json.error?.code;
      throw err;
    }

    return json.data;
  }
}

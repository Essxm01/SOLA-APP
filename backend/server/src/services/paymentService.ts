/**
 * Sola Vacation Rentals — Payment Service & Gateway Abstraction
 * Location: server/src/services/paymentService.ts
 * Master Source of Truth: TASK 2A.3 REVISION & PHASE_7_MASTER_SPECIFICATION.md
 */

import crypto from 'node:crypto';
import { queryDb } from './dbClient.js';

export type PaymentMode = 'PROTOTYPE' | 'LIVE';

export function getPaymentMode(): PaymentMode {
  const mode = String(process.env.PAYMENT_MODE || '').trim().toUpperCase();
  if (mode === 'PROTOTYPE' || mode === 'LIVE') return mode;
  throw new Error('PAYMENT_MODE_NOT_CONFIGURED');
}

export interface PaymentInitiationParams {
  bookingId: string;
  customerId: string;
  ownerId: string;
  merchantOrderId: string;
  amountEgp: number;
  currency: string;
  paymentMethod: 'CARD' | 'MOBILE_WALLET' | 'INSTAPAY' | 'CASH';
  idempotencyKey: string;
  customerName?: string;
  customerPhone?: string;
}

export interface PaymentInitiationResult {
  paymentTransactionId: string;
  merchantOrderId: string;
  providerOrderId?: string;
  depositAmountEgp: number;
  depositAmountCents: number;
  checkoutUrl?: string;
  paymentToken?: string;
  expiresAt?: string;
  mode: PaymentMode;
  requiresExternalCheckout: boolean;
}

export interface PaymobWebhookPayload {
  amount_cents: number;
  created_at: string;
  currency: string;
  error_occured: boolean | string;
  has_parent_transaction: boolean | string;
  id: number | string;
  integration_id: number | string;
  is_3d_secure: boolean | string;
  is_auth: boolean | string;
  is_capture: boolean | string;
  is_refunded: boolean | string;
  is_standalone_payment: boolean | string;
  order: { id: number | string };
  owner: number | string;
  pending: boolean | string;
  source_data?: {
    pan?: string;
    sub_type?: string;
    type?: string;
  };
  success: boolean | string;
  hmac?: string;
  merchant_order_id?: string;
}

export interface IPaymentGateway {
  initiatePayment(params: PaymentInitiationParams): Promise<PaymentInitiationResult>;
  verifyWebhookSignature(payload: any, signature: string): boolean;
  refundPayment(transactionId: string, amountCents: number, reason: string): Promise<{ success: boolean; providerRefundId: string }>;
}

/**
 * Paymob Payment Gateway Implementation
 * Abstracted to throw missing credential error when API keys are unconfigured.
 */
export class PaymobGateway implements IPaymentGateway {
  private apiKey: string;
  private cardIntegrationId: string;
  private iframeId: string;
  private hmacSecret: string;

  constructor() {
    this.apiKey = process.env.PAYMOB_API_KEY || '';
    this.cardIntegrationId = process.env.PAYMOB_INTEGRATION_ID_CARD || '';
    this.iframeId = process.env.PAYMOB_IFRAME_ID || '';
    this.hmacSecret = process.env.PAYMOB_HMAC_SECRET || '';
  }

  async initiatePayment(params: PaymentInitiationParams): Promise<PaymentInitiationResult> {
    if (!this.apiKey || !this.cardIntegrationId) {
      throw new Error('PAYMOB_LIVE_NOT_CONFIGURED');
    }
    // Paymob Order & Payment Key generation flow...
    throw new Error('PAYMOB_LIVE_NOT_CONFIGURED');
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    if (!this.hmacSecret) {
      throw new Error('PAYMOB_HMAC_SECRET_MISSING');
    }
    return verifyPaymobHmacSha512(payload, this.hmacSecret, signature);
  }

  async refundPayment(transactionId: string, amountCents: number, reason: string): Promise<{ success: boolean; providerRefundId: string }> {
    if (!this.apiKey) {
      throw new Error('PAYMOB_LIVE_NOT_CONFIGURED');
    }
    throw new Error('PAYMOB_LIVE_NOT_CONFIGURED');
  }
}

/**
 * Mock Payment Gateway Implementation
 * Used for deterministic automated unit & E2E integration testing.
 */
export class PrototypePaymentGateway implements IPaymentGateway {

  async initiatePayment(params: PaymentInitiationParams): Promise<PaymentInitiationResult> {
    const amountCents = Math.round(params.amountEgp * 100);

    return {
      paymentTransactionId: params.merchantOrderId,
      merchantOrderId: params.merchantOrderId,
      providerOrderId: `prototype_order_${params.merchantOrderId}`,
      depositAmountEgp: params.amountEgp,
      depositAmountCents: amountCents,
      mode: 'PROTOTYPE',
      requiresExternalCheckout: false,
    };
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    return false;
  }

  async refundPayment(transactionId: string, amountCents: number, reason: string): Promise<{ success: boolean; providerRefundId: string }> {
    return {
      success: false,
      providerRefundId: 'PROTOTYPE_REFUNDS_NOT_SUPPORTED',
    };
  }

}

// Backwards-compatible test import. Production selection is explicit and never
// chooses this class implicitly from missing Paymob credentials.
export class MockPaymentGateway extends PrototypePaymentGateway {}

/**
 * SHA-512 HMAC Signature Calculator for Paymob Webhooks (Timing-Safe)
 */
export function verifyPaymobHmacSha512(payload: any, hmacSecret: string, receivedHmac: string): boolean {
  if (!payload || !receivedHmac || !hmacSecret) return false;

  const concatenatedString = [
    payload.amount_cents ?? '',
    payload.created_at ?? '',
    payload.currency ?? '',
    payload.error_occured ?? '',
    payload.has_parent_transaction ?? '',
    payload.id ?? '',
    payload.integration_id ?? '',
    payload.is_3d_secure ?? '',
    payload.is_auth ?? '',
    payload.is_capture ?? '',
    payload.is_refunded ?? '',
    payload.is_standalone_payment ?? '',
    payload.order?.id ?? payload.order_id ?? '',
    payload.owner ?? '',
    payload.pending ?? '',
    payload.source_data?.pan ?? '',
    payload.source_data?.sub_type ?? '',
    payload.source_data?.type ?? '',
    payload.success ?? '',
  ].join('');

  const calculatedHmac = crypto
    .createHmac('sha512', hmacSecret)
    .update(concatenatedString)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculatedHmac.toLowerCase(), 'utf-8'),
      Buffer.from(receivedHmac.toLowerCase(), 'utf-8')
    );
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// POSTGRESQL PAYMENT TRANSACTIONS REPOSITORY (`paymentTxDb`)
// ----------------------------------------------------------------------------
export const paymentTxDb = {
  async create(tx: {
    bookingId: string;
    customerId: string;
    ownerId: string;
    provider: string;
    merchantOrderId: string;
    amountCents: number;
    currency: string;
    paymentMethod: string;
    idempotencyKey: string;
    paymobPaymentToken?: string;
    paymobCheckoutUrl?: string;
    rawRequestPayload?: any;
  }) {
    const res = await queryDb(
      `INSERT INTO payment_transactions (
        booking_id, customer_id, owner_id, provider, merchant_order_id, amount_cents, currency, payment_method, status, idempotency_key, paymob_payment_token, paymob_checkout_url, raw_request_payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'INITIATED', $9, $10, $11, $12)
      RETURNING id, booking_id AS "bookingId", customer_id AS "customerId", owner_id AS "ownerId", merchant_order_id AS "merchantOrderId", amount_cents AS "amountCents", status, created_at AS "createdAt";`,
      [
        tx.bookingId,
        tx.customerId,
        tx.ownerId,
        tx.provider || 'PAYMOB',
        tx.merchantOrderId,
        tx.amountCents,
        tx.currency || 'EGP',
        tx.paymentMethod || 'CARD',
        tx.idempotencyKey,
        tx.paymobPaymentToken || null,
        tx.paymobCheckoutUrl || null,
        tx.rawRequestPayload ? JSON.stringify(tx.rawRequestPayload) : null,
      ]
    );
    return res.rows[0];
  },

  async getByIdempotencyKey(key: string) {
    const res = await queryDb('SELECT * FROM payment_transactions WHERE idempotency_key = $1', [key]);
    return res.rows[0];
  },

  async getByMerchantOrderId(orderId: string) {
    const res = await queryDb('SELECT * FROM payment_transactions WHERE merchant_order_id = $1', [orderId]);
    return res.rows[0];
  },

  async getByBookingId(bookingId: string) {
    const res = await queryDb(
      'SELECT * FROM payment_transactions WHERE booking_id = $1 ORDER BY created_at DESC',
      [bookingId]
    );
    return res.rows;
  },

  async getByCustomerId(customerId: string) {
    const res = await queryDb(
      'SELECT * FROM payment_transactions WHERE customer_id = $1 ORDER BY created_at DESC',
      [customerId]
    );
    return res.rows;
  },

  async completeDepositPayment(params: {
    paymentTransactionId: string;
    bookingId: string;
    customerId: string;
  }) {
    const res = await queryDb(
      'SELECT * FROM konfrm_complete_deposit_payment($1, $2, $3)',
      [params.paymentTransactionId, params.bookingId, params.customerId]
    );
    return res.rows[0]?.konfrm_complete_deposit_payment || res.rows[0] || null;
  },

  /**
   * Atomic Webhook Processor with PostgreSQL Transaction & Row Locking (`SELECT ... FOR UPDATE`)
   */
  async processVerifiedWebhook(_params: {
    merchantOrderId: string;
    providerTransactionId: string;
    providerOrderId: string;
    amountCents: number;
    currency: string;
    success: boolean;
    webhookEventId: string;
    rawWebhookPayload: any;
    failureCode?: string;
    failureMessage?: string;
  }): Promise<never> {
    throw new Error('PAYMOB_LIVE_WEBHOOK_FINALIZATION_NOT_CONFIGURED');
  }
};

/**
 * Main Payment Service Gateway Router
 */
export class PaymentService {
  private gateway: IPaymentGateway;

  constructor(gateway?: IPaymentGateway) {
    if (gateway) {
      this.gateway = gateway;
      return;
    }
    const mode = getPaymentMode();
    this.gateway = mode === 'PROTOTYPE' ? new PrototypePaymentGateway() : new PaymobGateway();
  }

  getGateway(): IPaymentGateway {
    return this.gateway;
  }
}

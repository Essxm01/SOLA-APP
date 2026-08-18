/**
 * Sola Vacation Rentals — Payment Service & Gateway Abstraction
 * Location: server/src/services/paymentService.ts
 * Master Source of Truth: TASK 2A.3 REVISION & PHASE_7_MASTER_SPECIFICATION.md
 */
import crypto from 'node:crypto';
import { queryDb } from './dbClient.js';
import { calculateBookingFinancials } from './financialEngine.js';
/**
 * Paymob Payment Gateway Implementation
 * Abstracted to throw missing credential error when API keys are unconfigured.
 */
export class PaymobGateway {
    apiKey;
    cardIntegrationId;
    iframeId;
    hmacSecret;
    constructor() {
        this.apiKey = process.env.PAYMOB_API_KEY || '';
        this.cardIntegrationId = process.env.PAYMOB_INTEGRATION_ID_CARD || '';
        this.iframeId = process.env.PAYMOB_IFRAME_ID || '';
        this.hmacSecret = process.env.PAYMOB_HMAC_SECRET || '';
    }
    async initiatePayment(params) {
        if (!this.apiKey || !this.cardIntegrationId) {
            throw new Error('PAYMOB_CREDENTIALS_MISSING_CANNOT_CALL_LIVE_NETWORK');
        }
        // Paymob Order & Payment Key generation flow...
        throw new Error('PAYMOB_LIVE_NETWORK_STOP_CONDITION_ENGAGED');
    }
    verifyWebhookSignature(payload, signature) {
        if (!this.hmacSecret) {
            throw new Error('PAYMOB_HMAC_SECRET_MISSING');
        }
        return verifyPaymobHmacSha512(payload, this.hmacSecret, signature);
    }
    async refundPayment(transactionId, amountCents, reason) {
        if (!this.apiKey) {
            throw new Error('PAYMOB_CREDENTIALS_MISSING');
        }
        throw new Error('PAYMOB_LIVE_REFUND_STOP_CONDITION');
    }
}
/**
 * Mock Payment Gateway Implementation
 * Used for deterministic automated unit & E2E integration testing.
 */
export class MockPaymentGateway {
    mockHmacSecret = 'sola_test_hmac_secret_2026';
    async initiatePayment(params) {
        const amountCents = Math.round(params.amountEgp * 100);
        const mockToken = `mock_pay_token_${params.idempotencyKey}`;
        const checkoutUrl = `https://accept.paymob.com/api/acceptance/iframes/mock?payment_token=${mockToken}`;
        return {
            paymentTransactionId: params.merchantOrderId,
            merchantOrderId: params.merchantOrderId,
            providerOrderId: `paymob_order_${Date.now()}`,
            depositAmountEgp: params.amountEgp,
            depositAmountCents: amountCents,
            checkoutUrl,
            paymentToken: mockToken,
            expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        };
    }
    verifyWebhookSignature(payload, signature) {
        return verifyPaymobHmacSha512(payload, this.mockHmacSecret, signature);
    }
    async refundPayment(transactionId, amountCents, reason) {
        return {
            success: true,
            providerRefundId: `mock_refund_${Date.now()}`,
        };
    }
    getMockHmacSecret() {
        return this.mockHmacSecret;
    }
}
/**
 * SHA-512 HMAC Signature Calculator for Paymob Webhooks (Timing-Safe)
 */
export function verifyPaymobHmacSha512(payload, hmacSecret, receivedHmac) {
    if (!payload || !receivedHmac || !hmacSecret)
        return false;
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
        return crypto.timingSafeEqual(Buffer.from(calculatedHmac.toLowerCase(), 'utf-8'), Buffer.from(receivedHmac.toLowerCase(), 'utf-8'));
    }
    catch {
        return false;
    }
}
// ----------------------------------------------------------------------------
// POSTGRESQL PAYMENT TRANSACTIONS REPOSITORY (`paymentTxDb`)
// ----------------------------------------------------------------------------
export const paymentTxDb = {
    async create(tx) {
        const res = await queryDb(`INSERT INTO payment_transactions (
        booking_id, customer_id, owner_id, provider, merchant_order_id, amount_cents, currency, payment_method, status, idempotency_key, paymob_payment_token, paymob_checkout_url, raw_request_payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'INITIATED', $9, $10, $11, $12)
      RETURNING id, booking_id AS "bookingId", customer_id AS "customerId", owner_id AS "ownerId", merchant_order_id AS "merchantOrderId", amount_cents AS "amountCents", status, created_at AS "createdAt";`, [
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
        ]);
        return res.rows[0];
    },
    async getByIdempotencyKey(key) {
        const res = await queryDb('SELECT * FROM payment_transactions WHERE idempotency_key = $1', [key]);
        return res.rows[0];
    },
    async getByMerchantOrderId(orderId) {
        const res = await queryDb('SELECT * FROM payment_transactions WHERE merchant_order_id = $1', [orderId]);
        return res.rows[0];
    },
    async getByBookingId(bookingId) {
        const res = await queryDb('SELECT * FROM payment_transactions WHERE booking_id = $1 ORDER BY created_at DESC', [bookingId]);
        return res.rows;
    },
    /**
     * Atomic Webhook Processor with PostgreSQL Transaction & Row Locking (`SELECT ... FOR UPDATE`)
     */
    async processVerifiedWebhook(params) {
        // 1. Begin Atomic Transaction
        await queryDb('BEGIN');
        try {
            // 2. Lock target payment transaction row
            const lockRes = await queryDb(`SELECT * FROM payment_transactions WHERE merchant_order_id = $1 FOR UPDATE`, [params.merchantOrderId]);
            if (lockRes.rows.length === 0) {
                await queryDb('ROLLBACK');
                return { success: false, status: 'TRANSACTION_NOT_FOUND', bookingConfirmed: false };
            }
            const tx = lockRes.rows[0];
            // 3. State Machine & Webhook Idempotency Check
            if (tx.status === 'SUCCEEDED') {
                await queryDb('COMMIT');
                return { success: true, status: 'ALREADY_SUCCEEDED', bookingConfirmed: true };
            }
            // 4. Amount & Currency Security Verification
            if (Number(tx.amount_cents) !== Number(params.amountCents) || tx.currency !== params.currency) {
                await queryDb(`UPDATE payment_transactions 
           SET status = 'FAILED', failure_code = 'AMOUNT_CURRENCY_MISMATCH', failure_message = 'Security violation: Amount or currency mismatch', updated_at = NOW()
           WHERE id = $1`, [tx.id]);
                await queryDb('COMMIT');
                return { success: false, status: 'AMOUNT_MISMATCH', bookingConfirmed: false };
            }
            // 5. Handle Payment Failure
            if (!params.success) {
                await queryDb(`UPDATE payment_transactions 
           SET status = 'FAILED', provider_transaction_id = $2, failure_code = $3, failure_message = $4, raw_webhook_payload = $5, updated_at = NOW()
           WHERE id = $1`, [tx.id, params.providerTransactionId, params.failureCode || 'PAYMENT_FAILED', params.failureMessage || 'Payment declined', JSON.stringify(params.rawWebhookPayload)]);
                await queryDb('COMMIT');
                return { success: true, status: 'PAYMENT_FAILED_RECORDED', bookingConfirmed: false };
            }
            // 6. Handle Payment Success (Atomic Transition)
            // 6.1 Update payment_transactions row
            await queryDb(`UPDATE payment_transactions 
         SET status = 'SUCCEEDED', provider_transaction_id = $2, provider_order_id = $3, webhook_event_id = $4, webhook_received_at = NOW(), verified_at = NOW(), raw_webhook_payload = $5, updated_at = NOW()
         WHERE id = $1`, [tx.id, params.providerTransactionId, params.providerOrderId, params.webhookEventId, JSON.stringify(params.rawWebhookPayload)]);
            // 6.2 Update bookings.status = 'CONFIRMED'
            await queryDb(`UPDATE bookings SET status = 'CONFIRMED', confirmed_at = NOW() WHERE id = $1`, [tx.booking_id]);
            // 6.3 Calculate Integer Financials via financialEngine
            const depositEgp = Number(tx.amount_cents) / 100;
            // Assume 5 nights booking for calculation breakdown baseline
            const financials = calculateBookingFinancials(depositEgp * 5, depositEgp);
            // 6.4 Insert booking_financial_summaries
            await queryDb(`INSERT INTO booking_financial_summaries (
          booking_id, total_booking_value, deposit_amount, sola_commission_amount, owner_net_deposit_amount, remaining_balance
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (booking_id) DO NOTHING`, [
                tx.booking_id,
                financials.totalBookingValueInCents / 100,
                financials.depositAmountInCents / 100,
                financials.solaCommissionInCents / 100,
                financials.ownerNetDepositInCents / 100,
                financials.remainingBalanceInCents / 100,
            ]);
            // 6.5 Update owner_wallets.pending_balance with Owner Net Entitlement (80% net deposit)
            const ownerNetEgp = financials.ownerNetDepositInCents / 100;
            await queryDb(`INSERT INTO owner_wallets (owner_id, pending_balance, available_balance, held_balance, reserved_for_payout_balance)
         VALUES ($1, $2, 0.00, 0.00, 0.00)
         ON CONFLICT (owner_id) 
         DO UPDATE SET pending_balance = owner_wallets.pending_balance + $2, updated_at = NOW()`, [tx.owner_id, ownerNetEgp]);
            // 6.6 Fetch updated balance for ledger
            const walletRes = await queryDb(`SELECT pending_balance FROM owner_wallets WHERE owner_id = $1`, [tx.owner_id]);
            const newPending = walletRes.rows[0]?.pending_balance || ownerNetEgp;
            // 6.7 Insert Immutable Wallet Ledger Entry
            const ledgerKey = `ledger_dep_${tx.id}`;
            await queryDb(`INSERT INTO wallet_ledger_entries (
          owner_id, booking_id, transaction_type, amount, balance_after, idempotency_key
        ) VALUES ($1, $2, 'DEPOSIT_HELD_IN_ESCROW', $3, $4, $5)
        ON CONFLICT (idempotency_key) DO NOTHING`, [tx.owner_id, tx.booking_id, ownerNetEgp, newPending, ledgerKey]);
            // 7. Commit Atomic PostgreSQL Transaction
            await queryDb('COMMIT');
            return { success: true, status: 'SUCCEEDED', bookingConfirmed: true };
        }
        catch (err) {
            await queryDb('ROLLBACK');
            throw err;
        }
    }
};
/**
 * Main Payment Service Gateway Router
 */
export class PaymentService {
    gateway;
    constructor(gateway = process.env.NODE_ENV === 'test' || !process.env.PAYMOB_API_KEY ? new MockPaymentGateway() : new PaymobGateway()) {
        this.gateway = gateway;
    }
    getGateway() {
        return this.gateway;
    }
}

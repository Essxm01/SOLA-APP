import assert from 'node:assert/strict';
import { queryDb } from '../services/dbClient.js';
import { PaymentService, PrototypePaymentGateway, getPaymentMode } from '../services/paymentService.js';

type EnvSnapshot = Record<'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY' | 'PAYMENT_MODE', string | undefined>;

function snapshot(): EnvSnapshot {
  return {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    PAYMENT_MODE: process.env.PAYMENT_MODE,
  };
}

function restore(values: EnvSnapshot) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

async function run() {
  const env = snapshot();
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
  process.env.PAYMENT_MODE = 'PROTOTYPE';
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(input), init });
    if (String(input).includes('rpc/konfrm_complete_deposit_payment')) {
      return {
        ok: true,
        json: async () => ({
          paymentTransactionId: 'tx-1',
          paymentStatus: 'SUCCEEDED',
          bookingId: 'booking-1',
          bookingStatus: 'CONFIRMED',
          confirmedAt: '2026-09-03T00:00:00Z',
          amountCents: 200000,
          currency: 'EGP',
          idempotent: false,
        }),
        text: async () => '',
      } as Response;
    }
    return {
      ok: true,
      json: async () => [{ id: 'tx-1', booking_id: 'booking-1', customer_id: 'customer-1', owner_id: 'owner-1', amount_cents: 200000, currency: 'EGP', status: 'INITIATED' }],
      text: async () => '',
    } as Response;
  }) as typeof fetch;

  try {
    await queryDb(
      'INSERT INTO payment_transactions (booking_id, customer_id, owner_id, provider, merchant_order_id, amount_cents, currency, payment_method, status, idempotency_key, paymob_payment_token, paymob_checkout_url, raw_request_payload) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, \'INITIATED\', $9, $10, $11, $12)',
      ['booking-1', 'customer-1', 'owner-1', 'MOCK', 'KONFRM-DEP-1', 200000, 'EGP', 'CARD', 'prototype_deposit_booking-1', null, null, '{"mode":"PROTOTYPE"}'],
    );
    assert.match(requests.at(-1)!.url, /payment_transactions$/);
    const insertBody = JSON.parse(String(requests.at(-1)!.init?.body));
    assert.equal(insertBody.provider, 'MOCK');
    assert.equal(insertBody.amount_cents, 200000);

    await queryDb('SELECT * FROM payment_transactions WHERE idempotency_key = $1', ['prototype_deposit_booking-1']);
    assert.match(requests.at(-1)!.url, /payment_transactions\?idempotency_key=eq\.prototype_deposit_booking-1/);

    await queryDb('SELECT * FROM payment_transactions WHERE booking_id = $1 ORDER BY created_at DESC', ['booking-1']);
    assert.match(requests.at(-1)!.url, /payment_transactions\?booking_id=eq\.booking-1/);

    await queryDb('SELECT * FROM konfrm_complete_deposit_payment($1, $2, $3)', ['tx-1', 'booking-1', 'customer-1']);
    assert.match(requests.at(-1)!.url, /rpc\/konfrm_complete_deposit_payment$/);
    assert.equal(JSON.parse(String(requests.at(-1)!.init?.body)).p_booking_id, 'booking-1');

    const gateway = new PrototypePaymentGateway();
    const initiated = await gateway.initiatePayment({ bookingId: 'booking-1', customerId: 'customer-1', ownerId: 'owner-1', merchantOrderId: 'KONFRM-DEP-1', amountEgp: 2000, currency: 'EGP', paymentMethod: 'CARD', idempotencyKey: 'attempt-1' });
    assert.equal(initiated.mode, 'PROTOTYPE');
    assert.equal(initiated.requiresExternalCheckout, false);
    assert.equal(initiated.checkoutUrl, undefined);
    assert.ok(new PaymentService().getGateway() instanceof PrototypePaymentGateway);
    assert.equal(getPaymentMode(), 'PROTOTYPE');

    console.log('PAYMENT-01 focused compatibility and prototype gateway checks passed.');
  } finally {
    globalThis.fetch = originalFetch;
    restore(env);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

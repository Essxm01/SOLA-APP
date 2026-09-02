import assert from 'node:assert/strict';
import { CustomerDomainController } from '../controllers/domainControllers.js';
import { hasDateRangeOverlap, isBookingStatusBlocking } from '../constants/bookingRules.js';
import { queryDb } from '../services/dbClient.js';

type EnvSnapshot = Record<'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY', string | undefined>;

function snapshotEnv(): EnvSnapshot {
  return { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY };
}

function restoreEnv(snapshot: EnvSnapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

async function captureRestRequest(sql: string, params: any[]): Promise<{ url: string; method: string; body: any }> {
  const originalFetch = globalThis.fetch;
  const env = snapshotEnv();
  const calls: Array<{ url: string; method: string; body: any }> = [];
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), method: init?.method || 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return { ok: true, json: async () => [], text: async () => '' } as Response;
  }) as typeof fetch;
  try {
    await queryDb(sql, params);
    assert.equal(calls.length, 1, 'one precise PostgREST request must serve each booking SQL operation');
    return calls[0];
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv(env);
  }
}

async function run() {
  // Canonical bookability gate: PUBLISHED + VERIFIED (matches customer routes).
  const publishedProperty: any = { status: 'PUBLISHED', verificationStatus: 'VERIFIED', maxGuests: 4, basePricePerNight: 5000 };
  assert.throws(() => CustomerDomainController.validateCustomerBookingRequest({ ...publishedProperty, verificationStatus: 'UNVERIFIED' }, '2026-11-10', '2026-11-12', 4), /CANNOT_BOOK_UNPUBLISHED_PROPERTY/);
  assert.equal(CustomerDomainController.validateCustomerBookingRequest(publishedProperty, '2026-11-10', '2026-11-12', 4).nights, 2);
  assert.throws(() => CustomerDomainController.validateCustomerBookingRequest(publishedProperty, '2026-11-10', '2026-11-11', 1), /MIN_STAY_NOT_MET/);
  assert.throws(() => CustomerDomainController.validateCustomerBookingRequest(publishedProperty, '2026-11-01', '2026-12-02', 1), /MAX_STAY_EXCEEDED/);
  assert.throws(() => CustomerDomainController.validateCustomerBookingRequest(publishedProperty, '2026-11-10', '2026-11-12', 5), /INVALID_GUEST_COUNT/);

  assert.equal(isBookingStatusBlocking('PENDING_OWNER_APPROVAL'), false);
  assert.equal(hasDateRangeOverlap('2026-11-10', '2026-11-12', [{ checkIn: '2026-11-10', checkOut: '2026-11-12', status: 'PENDING_OWNER_APPROVAL' }]), false);
  assert.equal(hasDateRangeOverlap('2026-11-10', '2026-11-12', [{ checkIn: '2026-11-10', checkOut: '2026-11-12', status: 'APPROVED_PENDING_PAYMENT' }]), true);
  assert.equal(hasDateRangeOverlap('2026-11-10', '2026-11-12', [{ checkIn: '2026-11-10', checkOut: '2026-11-12', status: 'CONFIRMED' }]), true);
  assert.equal(hasDateRangeOverlap('2026-11-10', '2026-11-12', [{ checkIn: '2026-11-10', checkOut: '2026-11-12', status: 'REJECTED' }]), false);

  const insert = await captureRestRequest(
    'INSERT INTO bookings (id, booking_number, property_id, owner_id, customer_id, guest_name, guest_phone, check_in, check_out, nights, total_guests, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
    ['booking-1', 'BK-1', 'property-1', 'owner-1', 'customer-1', 'Customer', '+201000000000', '2026-11-10', '2026-11-12', 2, 2, 'PENDING_OWNER_APPROVAL'],
  );
  assert.match(insert.url, /\/rest\/v1\/bookings$/);
  assert.equal(insert.method, 'POST');
  assert.equal(insert.body.customer_id, 'customer-1');
  assert.equal(insert.body.status, 'PENDING_OWNER_APPROVAL');

  const summary = await captureRestRequest(
    'INSERT INTO booking_financial_summaries (booking_id, total_booking_value, deposit_amount, sola_commission_amount, owner_net_deposit_amount, remaining_balance, commission_on_remaining_balance) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    ['booking-1', 10000, 5000, 1000, 4000, 5000, 0],
  );
  assert.match(summary.url, /\/rest\/v1\/booking_financial_summaries$/);
  assert.equal(summary.method, 'POST');

  const ownerList = await captureRestRequest('SELECT id FROM bookings WHERE owner_id = $1 ORDER BY created_at DESC', ['owner-1']);
  assert.match(ownerList.url, /bookings\?owner_id=eq\.owner-1/);
  const customerList = await captureRestRequest('SELECT id FROM bookings WHERE customer_id = $1 ORDER BY created_at DESC', ['customer-1']);
  assert.match(customerList.url, /bookings\?customer_id=eq\.customer-1/);
  const blocks = await captureRestRequest("SELECT check_in AS \"checkIn\", check_out AS \"checkOut\", status FROM bookings WHERE property_id = $1 AND status IN ('APPROVED_PENDING_PAYMENT', 'CONFIRMED')", ['property-1']);
  assert.match(blocks.url, /bookings\?property_id=eq\.property-1/);

  const decision = await captureRestRequest("UPDATE bookings SET status = $3 WHERE id = $1 AND owner_id = $2 AND status = 'PENDING_OWNER_APPROVAL'", ['booking-1', 'owner-1', 'APPROVED_PENDING_PAYMENT']);
  assert.match(decision.url, /id=eq\.booking-1.*owner_id=eq\.owner-1.*status=eq\.PENDING_OWNER_APPROVAL/);
  assert.equal(decision.method, 'PATCH');
  assert.equal(decision.body.status, 'APPROVED_PENDING_PAYMENT');

  console.log('BOOKING-01 canonical rules and Cloudflare REST compatibility checks passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

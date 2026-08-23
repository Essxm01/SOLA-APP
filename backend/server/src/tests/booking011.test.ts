import assert from 'node:assert/strict';
import { isBookingChatEligible } from '../services/dbRepository.js';
import { queryDb } from '../services/dbClient.js';

type EnvSnapshot = Record<'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY', string | undefined>;

function snapshotEnv(): EnvSnapshot {
  return { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY };
}

function restoreEnv(snapshot: EnvSnapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
}

async function captureRestRequest(sql: string, params: any[]) {
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
    assert.equal(calls.length, 1, 'each messaging repository operation must issue exactly one strict PostgREST operation');
    return calls[0];
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv(env);
  }
}

async function run() {
  assert.equal(isBookingChatEligible('PENDING_OWNER_APPROVAL'), false);
  assert.equal(isBookingChatEligible('REJECTED'), false);
  assert.equal(isBookingChatEligible('APPROVED_PENDING_PAYMENT'), true);
  assert.equal(isBookingChatEligible('CONFIRMED'), true);

  const lookup = await captureRestRequest(
    'SELECT id, booking_id AS "bookingId" FROM booking_conversations WHERE booking_id = $1', ['booking-1'],
  );
  assert.match(lookup.url, /booking_conversations\?booking_id=eq\.booking-1/);

  const upsert = await captureRestRequest(
    'INSERT INTO booking_conversations (booking_id, property_id, customer_id, owner_id) VALUES ($1, $2, $3, $4) ON CONFLICT (booking_id) DO UPDATE SET updated_at = NOW() RETURNING id',
    ['booking-1', 'property-1', 'customer-1', 'owner-1'],
  );
  assert.match(upsert.url, /booking_conversations\?on_conflict=booking_id/);
  assert.equal(upsert.method, 'POST');
  assert.deepEqual({ booking_id: upsert.body.booking_id, property_id: upsert.body.property_id, customer_id: upsert.body.customer_id, owner_id: upsert.body.owner_id }, { booking_id: 'booking-1', property_id: 'property-1', customer_id: 'customer-1', owner_id: 'owner-1' });

  const customerRead = await captureRestRequest(
    'SELECT id FROM booking_conversations WHERE id = $1 AND customer_id = $2', ['conversation-1', 'customer-1'],
  );
  assert.match(customerRead.url, /id=eq\.conversation-1.*customer_id=eq\.customer-1/);
  const ownerRead = await captureRestRequest(
    'SELECT id FROM booking_conversations WHERE id = $1 AND owner_id = $2', ['conversation-1', 'owner-1'],
  );
  assert.match(ownerRead.url, /id=eq\.conversation-1.*owner_id=eq\.owner-1/);

  const ownerInbox = await captureRestRequest(
    'SELECT id FROM booking_conversations WHERE owner_id = $1 ORDER BY updated_at DESC', ['owner-1'],
  );
  assert.match(ownerInbox.url, /booking_conversations\?owner_id=eq\.owner-1.*order=updated_at.desc/);

  const messages = await captureRestRequest(
    'SELECT id FROM booking_messages WHERE conversation_id = $1 ORDER BY created_at ASC', ['conversation-1'],
  );
  assert.match(messages.url, /booking_messages\?conversation_id=eq\.conversation-1.*order=created_at.asc/);

  const send = await captureRestRequest(
    'INSERT INTO booking_messages (conversation_id, sender_id, sender_role, text) VALUES ($1, $2, $3, $4) RETURNING id',
    ['conversation-1', 'customer-1', 'CUSTOMER', 'رسالة اختبار'],
  );
  assert.match(send.url, /\/rest\/v1\/booking_messages$/);
  assert.equal(send.method, 'POST');
  assert.equal(send.body.sender_id, 'customer-1');
  assert.equal(send.body.sender_role, 'CUSTOMER');
  assert.equal(send.body.text, 'رسالة اختبار');
  assert.equal(JSON.stringify(send.body).includes('phone'), false, 'messaging persistence must never carry a phone number');

  console.log('BOOKING-01.1 chat eligibility and Cloudflare REST compatibility checks passed.');
}

run().catch((error) => { console.error(error); process.exit(1); });

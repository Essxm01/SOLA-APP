import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { ExpressServerApp } from '../app';
import { signAccessToken } from '../services/jwtService';
import { bookingDb, propertyAvailabilityDb, propertyDb, userDb } from '../services/dbRepository';
import { queryDb } from '../services/dbClient';
import { CustomerDomainController } from '../controllers/domainControllers.js';
import { calculateBookingFinancials } from '../services/financialEngine.js';

const propertyId = 'd4444444-4444-4444-8444-444444444444';
const ownerId = 'a1111111-1111-4111-8111-111111111111';
const customerId = 'c5555555-5555-4555-8555-555555555555';
const customerHeaders = { authorization: `Bearer ${signAccessToken({ sub: customerId, role: 'ROLE_CUSTOMER' })}` };
const publishedProperty: any = { id: propertyId, ownerId, status: 'PUBLISHED', verificationStatus: 'VERIFIED', basePricePerNight: 2000, maxGuests: 4, title: 'وحدة' };

// ---------------------------------------------------------------------------
// 1. Transaction model — mirrors the migration 026 RPC boundary: the booking
// INSERT and the summary INSERT commit or roll back as one unit.
// ---------------------------------------------------------------------------
class AtomicBookingModel {
  bookings: any[] = [];
  summaries: any[] = [];
  failSummaryWrite = false;
  conflictBookingWrite = false;

  create(input: any) {
    if (input.status !== 'PENDING_OWNER_APPROVAL') throw new Error('BOOKING_REQUEST_STATUS_INVALID');
    if (this.conflictBookingWrite) throw new Error('DATE_MANUALLY_BLOCKED');
    const booking = {
      id: input.id, bookingNumber: input.bookingNumber, propertyId: input.propertyId,
      ownerId: input.ownerId, customerId: input.customerId, guestName: input.guestName,
      checkIn: input.checkIn, checkOut: input.checkOut, nights: input.nights,
      guestsCount: input.totalGuests, status: input.status,
    };
    if (this.failSummaryWrite) throw new Error('summary CHECK constraint violated');
    const summary = {
      bookingId: booking.id,
      totalBookingValue: input.totalBookingValue,
      depositAmount: input.depositAmount,
      solaCommissionAmount: input.solaCommissionAmount,
      ownerNetDepositAmount: input.ownerNetDepositAmount,
      remainingBalance: input.remainingBalance,
      commissionOnRemainingBalance: input.commissionOnRemainingBalance,
    };
    this.bookings.push(booking);
    this.summaries.push(summary);
    return { ...booking, financialSummary: { ...summary } };
  }
}

const validInput = (id: string) => ({
  id, bookingNumber: `BK-${id.slice(0, 6)}`, propertyId, ownerId, customerId,
  guestName: 'عميل', guestPhone: '+201012345678', checkIn: '2026-12-20', checkOut: '2026-12-22',
  nights: 2, totalGuests: 2, status: 'PENDING_OWNER_APPROVAL',
  totalBookingValue: 4000, depositAmount: 2000, solaCommissionAmount: 400,
  ownerNetDepositAmount: 1600, remainingBalance: 2000, commissionOnRemainingBalance: 0,
});

// Atomic success: one request produces one booking and one matching summary.
{
  const model = new AtomicBookingModel();
  const result = model.create(validInput('b-1'));
  assert.equal(model.bookings.length, 1);
  assert.equal(model.summaries.length, 1);
  assert.equal(model.summaries[0].bookingId, model.bookings[0].id);
  assert.equal(result.financialSummary.depositAmount, 2000);

  // Atomic failure of the summary side: no booking may survive.
  const failed = new AtomicBookingModel();
  failed.failSummaryWrite = true;
  assert.throws(() => failed.create(validInput('b-2')), /summary CHECK constraint/);
  assert.equal(failed.bookings.length, 0, 'summary failure must leave no orphan booking');
  assert.equal(failed.summaries.length, 0);

  // Booking-side conflict (manual block / exclusion constraint): neither record.
  const conflicted = new AtomicBookingModel();
  conflicted.conflictBookingWrite = true;
  assert.throws(() => conflicted.create(validInput('b-3')), /DATE_MANUALLY_BLOCKED/);
  assert.equal(conflicted.bookings.length, 0);
  assert.equal(conflicted.summaries.length, 0, 'summary is never written without its booking');

  // Canonical status guard: the RPC only creates pending requests.
  const wrongStatus = new AtomicBookingModel();
  assert.throws(() => wrongStatus.create({ ...validInput('b-4'), status: 'CONFIRMED' }), /BOOKING_REQUEST_STATUS_INVALID/);
  assert.equal(wrongStatus.bookings.length, 0);
}

// ---------------------------------------------------------------------------
// 2. Worker/PostgREST contract: one narrow transaction-capable RPC call,
// fail-closed on every unexpected response, never sequential writes.
// ---------------------------------------------------------------------------
type Mode = 'success' | 'httpError' | 'malformed' | 'conflict' | 'zeroRows' | 'networkError' | 'missingSummaryField' | 'missingBookingField';
let mode: Mode = 'success';

// Mirrors the real PostgREST RPC row: quoted RETURNS TABLE names arrive as
// camelCase keys, summary values as finite numbers.
const fullRpcRow = {
  id: 'b-9', bookingNumber: 'BK-9', propertyId, ownerId, customerId, guestName: 'عميل',
  checkIn: '2026-12-20', checkOut: '2026-12-22', nights: 2, guestsCount: 2,
  status: 'PENDING_OWNER_APPROVAL', createdAt: '2026-09-02T00:00:00Z',
  summaryTotalBookingValue: 4000, summaryDepositAmount: 2000, summarySolaCommissionAmount: 400,
  summaryOwnerNetDepositAmount: 1600, summaryRemainingBalance: 2000, summaryCommissionOnRemainingBalance: 0,
};

async function withStubFetch(fn: () => Promise<void>) {
  const calls: Array<{ url: string; method: string; body: any }> = [];
  const originalFetch = globalThis.fetch;
  const env = { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY };
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    let parsedBody: any;
    try { parsedBody = init?.body ? JSON.parse(String(init.body)) : undefined; } catch { parsedBody = String(init?.body); }
    calls.push({ url: String(input), method: init?.method || 'GET', body: parsedBody });
    if (mode === 'networkError') throw new Error('simulated network outage');
    if (mode === 'httpError') return { ok: false, status: 503, json: async () => ({ message: 'db down' }), text: async () => '{"message":"db down"}' } as unknown as Response;
    if (mode === 'conflict') return { ok: false, status: 400, json: async () => ({ code: 'P0001' }), text: async () => '{"code":"P0001","message":"DATE_MANUALLY_BLOCKED"}' } as unknown as Response;
    if (mode === 'malformed') return { ok: true, status: 200, json: async () => ({ id: 'x' }), text: async () => '{"id":"x"}' } as unknown as Response;
    if (mode === 'zeroRows') return { ok: true, status: 200, json: async () => [], text: async () => '[]' } as unknown as Response;
    if (mode === 'missingSummaryField') {
      const { summaryRemainingBalance, ...partial } = fullRpcRow as any;
      return { ok: true, status: 201, json: async () => [partial], text: async () => JSON.stringify([partial]) } as unknown as Response;
    }
    if (mode === 'missingBookingField') {
      const { checkIn, ...partial } = fullRpcRow as any;
      return { ok: true, status: 201, json: async () => [partial], text: async () => JSON.stringify([partial]) } as unknown as Response;
    }
    return {
      ok: true, status: 201,
      json: async () => [fullRpcRow],
      text: async () => '',
    } as unknown as Response;
  }) as typeof fetch;
  try {
    await fn();
    return calls;
  } finally {
    globalThis.fetch = originalFetch;
    if (env.SUPABASE_URL === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = env.SUPABASE_URL;
    if (env.SUPABASE_SERVICE_ROLE_KEY === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  }
}

// Atomic success through the real adapter: exactly ONE transaction-capable call.
{
  const calls = await withStubFetch(() => bookingDb.create(validInput('b-10')));
  assert.equal(calls.length, 1, 'atomic creation must be one narrow RPC call');
  assert.equal(calls[0].url, 'https://example.supabase.co/rest/v1/rpc/konfrm_create_booking_request');
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].body.p_id, 'b-10');
  assert.equal(calls[0].body.p_status, 'PENDING_OWNER_APPROVAL');
  assert.equal(calls[0].body.p_total_booking_value, 4000);
  assert.equal(calls[0].body.p_deposit_amount, 2000);
  assert.equal(calls[0].body.p_sola_commission_amount, 400);
  assert.equal(calls[0].body.p_owner_net_deposit_amount, 1600);
  assert.equal(calls[0].body.p_remaining_balance, 2000);
  assert.equal(calls[0].body.p_commission_on_remaining_balance, 0, 'commission on remaining balance is canonical zero');
}

// Fail-closed: every unexpected outcome throws; no sequential fallback exists.
{
  mode = 'conflict';
  let calls = await withStubFetch(async () => {
    await assert.rejects(() => bookingDb.create(validInput('b-11')), /DATE_MANUALLY_BLOCKED/, 'trigger conflict evidence must survive the adapter');
  });
  assert.equal(calls.length, 1);

  mode = 'httpError';
  calls = await withStubFetch(async () => {
    await assert.rejects(() => bookingDb.create(validInput('b-12')), /REST_BOOKING_REQUEST_CREATE_RPC_FAILED/);
  });
  assert.equal(calls.length, 1);

  mode = 'networkError';
  calls = await withStubFetch(async () => {
    await assert.rejects(() => bookingDb.create(validInput('b-13')), /network outage|REST_QUERY_ERROR/);
  });
  assert.equal(calls.length, 1);

  mode = 'malformed';
  calls = await withStubFetch(async () => {
    await assert.rejects(() => bookingDb.create(validInput('b-14')), /REST_BOOKING_REQUEST_CREATE_MALFORMED_RESPONSE/);
  });
  assert.equal(calls.length, 1);

  mode = 'zeroRows';
  calls = await withStubFetch(async () => {
    await assert.rejects(() => bookingDb.create(validInput('b-15')), /REST_BOOKING_REQUEST_CREATE_RPC_ROW_COUNT/);
  });
  assert.equal(calls.length, 1, 'a response without the created row is a failure, never fake success');
  mode = 'success';

  // Correction 3: a partial one-row success must fail closed — never a false
  // 201 with missing values.
  mode = 'missingSummaryField';
  calls = await withStubFetch(async () => {
    await assert.rejects(() => bookingDb.create(validInput('b-16')), /REST_BOOKING_REQUEST_CREATE_MALFORMED_RESPONSE/);
  });
  assert.equal(calls.length, 1);
  mode = 'missingBookingField';
  calls = await withStubFetch(async () => {
    await assert.rejects(() => bookingDb.create(validInput('b-17')), /REST_BOOKING_REQUEST_CREATE_MALFORMED_RESPONSE/);
  });
  assert.equal(calls.length, 1);
  mode = 'success';

  // Correction 2: the RPC adapter branch is exact and collision-safe. SQL that
  // merely mentions the function (comment, wrapper, wrong arity) must NOT
  // enter the adapter branch.
  const foreignSqlCases: Array<{ sql: string; expectReject: boolean }> = [
    // Comment mention only — may be served by another legitimate matcher,
    // but never by the create-booking RPC adapter.
    { sql: 'SELECT id FROM bookings WHERE id = $1 /* konfrm_create_booking_request */', expectReject: false },
    // Wrapper query with a different shape.
    { sql: 'SELECT * FROM (SELECT konfrm_create_booking_request($1)) x', expectReject: true },
    // Canonical function name but wrong argument count.
    { sql: `SELECT * FROM konfrm_create_booking_request(${Array.from({ length: 17 }, (_, i) => `$${i + 1}`).join(', ')})`, expectReject: true },
    // Right count, wrong placeholder order.
    { sql: `SELECT * FROM konfrm_create_booking_request(${Array.from({ length: 18 }, (_, i) => `$${18 - i}`).join(', ')})`, expectReject: true },
    // Mention inside a string literal.
    { sql: "SELECT 'konfrm_create_booking_request' AS note", expectReject: true },
  ];
  for (const { sql: foreignSql, expectReject } of foreignSqlCases) {
    const calls = await withStubFetch(async () => {
      if (expectReject) {
        // No adapter matcher may serve this SQL: it falls through to the pool
        // path and must reject (no local PostgreSQL in the test environment).
        await assert.rejects(() => queryDb(foreignSql, ['x']), /POOL_QUERY_ERROR|REST_QUERY_ERROR|ECONNREFUSED|connect/i);
      } else {
        await queryDb(foreignSql, ['x']).catch(() => undefined);
      }
    });
    assert.equal(calls.filter((c) => c.url.includes('/rpc/konfrm_create_booking_request')).length, 0, `collision-safe matcher must ignore: ${foreignSql.slice(0, 60)}`);
  }
}

// ---------------------------------------------------------------------------
// 3. Route behavior: canonical financial integrity + compensation removed.
// ---------------------------------------------------------------------------
const originals: Record<string, any> = {
  propertyById: propertyDb.getById,
  userById: userDb.getById,
  create: bookingDb.create,
  summary: (bookingDb as any).createFinancialSummary,
  deleteNew: bookingDb.deleteNewBooking,
  blocks: bookingDb.getBlocksByPropertyId,
  availability: propertyAvailabilityDb.getByPropertyId,
};
try {
  (propertyDb as any).getById = async (id: string) => id === propertyId ? { ...publishedProperty } : null;
  (userDb as any).getById = async (id: string) => id === customerId ? { id, fullName: 'عميل', phoneNumber: '+201012345678' } : null;
  (bookingDb as any).getBlocksByPropertyId = async () => [];
  (propertyAvailabilityDb as any).getByPropertyId = async () => [];
  let createdPayload: any = null;
  let compensationDeletes = 0;
  let createError: any = null;
  (bookingDb as any).create = async (payload: any) => {
    if (createError) throw createError;
    createdPayload = payload;
    const expected = calculateBookingFinancials(
      CustomerDomainController.validateCustomerBookingRequest({ ...publishedProperty, basePricePerNight: 2000 }, payload.checkIn, payload.checkOut, payload.totalGuests).totalBookingValue,
      CustomerDomainController.validateCustomerBookingRequest({ ...publishedProperty, basePricePerNight: 2000 }, payload.checkIn, payload.checkOut, payload.totalGuests).firstNightPrice,
    );
    return {
      id: payload.id, bookingNumber: payload.bookingNumber, propertyId: payload.propertyId,
      ownerId: payload.ownerId, customerId: payload.customerId, guestName: payload.guestName,
      checkIn: payload.checkIn, checkOut: payload.checkOut, nights: payload.nights,
      guestsCount: payload.totalGuests, status: payload.status,
      financialSummary: {
        totalBookingValue: expected.totalBookingValueInCents / 100,
        depositAmount: expected.depositAmountInCents / 100,
        solaCommissionAmount: expected.solaCommissionInCents / 100,
        ownerNetDepositAmount: expected.ownerNetDepositInCents / 100,
        remainingBalance: expected.remainingBalanceInCents / 100,
        commissionOnRemainingBalance: payload.commissionOnRemainingBalance,
      },
    };
  };
  (bookingDb as any).deleteNewBooking = async () => { compensationDeletes += 1; return { deleted: true }; };

  const app = new ExpressServerApp();

  // Atomic success with canonical financial persistence integrity.
  const created = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeaders, { propertyId, checkIn: '2026-12-20', checkOut: '2026-12-22', guests: 2 });
  assert.equal(created.statusCode, 201);
  const summary = (created.body as any).data.financialSummary;
  assert.equal(summary.depositAmount, createdPayload.depositAmount, 'stored deposit equals the canonical server calculation passed to the transaction');
  assert.equal(summary.totalBookingValue, createdPayload.totalBookingValue);
  assert.equal(summary.remainingBalance, createdPayload.remainingBalance);
  assert.equal(Math.abs(createdPayload.solaCommissionAmount - createdPayload.depositAmount * 0.2) < 1e-9, true, 'commission stays 20% of deposit');
  assert.equal(Math.abs(createdPayload.ownerNetDepositAmount - createdPayload.depositAmount * 0.8) < 1e-9, true, 'owner net stays 80% of deposit');
  assert.equal(createdPayload.commissionOnRemainingBalance, 0, 'no commission on remaining balance');
  assert.equal(summary.depositPaymentStatus, 'NOT_DUE');

  // Atomic failure of the transaction: truthful failure and NO compensating delete.
  createError = new Error('REST_BOOKING_REQUEST_CREATE_RPC_FAILED: HTTP 503 — {"message":"db down"}');
  const atomicFailure = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeaders, { propertyId, checkIn: '2026-12-27', checkOut: '2026-12-29', guests: 2 });
  assert.equal(atomicFailure.statusCode, 500);
  assert.equal((atomicFailure.body as any).error.code, 'BOOKING_PERSISTENCE_FAILED');

  // Migration 025 compatibility: manual-block conflict remains a 409 availability conflict.
  createError = new Error('REST_BOOKING_REQUEST_CREATE_RPC_FAILED: HTTP 400 — {"code":"P0001","message":"DATE_MANUALLY_BLOCKED"}');
  const manualBlockConflict = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeaders, { propertyId, checkIn: '2026-12-27', checkOut: '2026-12-29', guests: 2 });
  assert.equal(manualBlockConflict.statusCode, 409);
  assert.equal((manualBlockConflict.body as any).error.code, 'DATE_OVERLAP');
  createError = null;

  assert.equal(compensationDeletes, 0, 'compensating deletion is gone: the transaction boundary replaced it');
} finally {
  (propertyDb as any).getById = originals.propertyById;
  (userDb as any).getById = originals.userById;
  (bookingDb as any).create = originals.create;
  (bookingDb as any).createFinancialSummary = originals.summary;
  (bookingDb as any).deleteNewBooking = originals.deleteNew;
  (bookingDb as any).getBlocksByPropertyId = originals.blocks;
  (propertyAvailabilityDb as any).getByPropertyId = originals.availability;
}

// ---------------------------------------------------------------------------
// 4. Migration contract: the RPC is the only write path, secured and isolated.
// ---------------------------------------------------------------------------
const migration = fs.readFileSync(path.resolve('database/migrations/026_atomic_booking_request_creation.sql'), 'utf8');
for (const required of [
  'BEGIN;', 'COMMIT;', 'konfrm_create_booking_request', 'schema_migrations',
  'INSERT INTO public.bookings (', 'INSERT INTO public.booking_financial_summaries (',
  'RETURNING * INTO v_booking', 'v_booking.id',
  "p_status <> 'PENDING_OWNER_APPROVAL'", 'BOOKING_REQUEST_STATUS_INVALID',
]) {
  assert.ok(migration.includes(required), `migration 026 must contain ${required}`);
}
assert.ok(!migration.includes('SECURITY DEFINER'), 'no SECURITY DEFINER may be introduced');
assert.ok(migration.includes('SECURITY INVOKER'), 'the RPC runs as invoker');
assert.ok(migration.includes('SET search_path = public, pg_temp'), 'explicit safe search_path required');
assert.equal((migration.match(/REVOKE ALL ON FUNCTION public\.konfrm_create_booking_request/g) || []).length, 1);
assert.ok(/FROM PUBLIC, anon, authenticated;/.test(migration), 'no PUBLIC/anon/authenticated EXECUTE');
assert.ok(/GRANT EXECUTE ON FUNCTION public\.konfrm_create_booking_request\([\s\S]*?\) TO service_role;/.test(migration), 'service_role backend execution preserved');
assert.ok(!/DISABLE TRIGGER|DROP TRIGGER|DROP CONSTRAINT|ALTER TABLE/i.test(migration), 'triggers/constraints (incl. migration 025) must remain untouched');
// The summary INSERT must be inside the same function body, keyed to the
// booking inserted moments before (same transaction, FK-anchored).
const bodyStart = migration.indexOf('AS $$');
const bodyEnd = migration.indexOf('$$;', bodyStart);
const fnBody = migration.slice(bodyStart, bodyEnd);
assert.ok(fnBody.indexOf('INSERT INTO public.bookings') > -1 && fnBody.indexOf('INSERT INTO public.booking_financial_summaries') > fnBody.indexOf('INSERT INTO public.bookings'), 'summary INSERT follows the booking INSERT in the same transaction body');
assert.ok(fnBody.replace(/\r\n/g, '\n').includes('VALUES (\n    v_booking.id,'), 'summary is FK-anchored to the just-inserted booking');
// Codex blocker 1 regression guard: guest_name is varchar(100) while the
// RETURNS TABLE declares "guestName" text — the RETURN QUERY reference must
// carry an explicit ::text cast.
assert.ok(/v_booking\.guest_name::text/.test(fnBody), 'guestName result column must cast v_booking.guest_name::text');
assert.ok(!/v_booking\.guest_name\b(?!::text)/.test(fnBody), 'no uncast v_booking.guest_name reference may remain in the function body');
// PL/pgSQL ambiguity guard (same class of defect migration 024 fixed): no
// unqualified id/status/nights column references outside name positions.
const bodyLines = fnBody.split('\n');
const insertRanges: Array<[number, number]> = [];
let insertListStart = -1;
bodyLines.forEach((rawLine, idx) => {
  const line = rawLine.split('--')[0].trim();
  if (line.startsWith('INSERT INTO')) { insertListStart = idx; return; }
  if (insertListStart > -1 && /^\)/.test(line)) {
    insertRanges.push([insertListStart, idx]);
    insertListStart = -1;
  }
});
const ambiguousRefs: string[] = [];
bodyLines.forEach((rawLine, idx) => {
  const line = rawLine.split('--')[0].trim();
  if (!line || !/(?<![.\w])(id|status|nights)\b/.test(line)) return;
  // INSERT column lists are name positions and stay unqualified.
  if (insertRanges.some(([s, e]) => idx > s && idx < e)) return;
  ambiguousRefs.push(`line ${idx + 1}: ${line}`);
});
assert.deepEqual(ambiguousRefs, [], 'function body must not reference id/status/nights columns unqualified');

console.log('P1.5 atomic booking + financial persistence suite passed');

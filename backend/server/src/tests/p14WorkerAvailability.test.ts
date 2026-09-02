import { strict as assert } from 'node:assert';
import { bookingDb, propertyAvailabilityDb } from '../services/dbRepository';

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

type Mode = 'success' | 'httpError' | 'malformed' | 'networkError' | 'singleObject';
let mode: Mode = 'success';

function stubFetch(calls: Array<{ url: string; method: string; prefer?: string; body?: any }>) {
  const originalFetch = globalThis.fetch;
  const env = snapshotEnv();
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const preferHeader = new Headers(init?.headers).get('prefer') || undefined;
    let parsedBody: any;
    try { parsedBody = init?.body ? JSON.parse(String(init.body)) : undefined; } catch { parsedBody = String(init?.body); }
    calls.push({ url: String(input), method: init?.method || 'GET', prefer: preferHeader, body: parsedBody });
    if (mode === 'networkError') throw new Error('simulated network outage');
    if (mode === 'httpError') return { ok: false, status: 503, json: async () => ({ message: 'database unavailable' }), text: async () => JSON.stringify({ message: 'database unavailable' }) } as unknown as Response;
    if (mode === 'malformed') return { ok: true, status: 200, json: async () => { throw new Error('invalid json'); }, text: async () => 'not-json' } as unknown as Response;
    if (mode === 'singleObject') return { ok: true, status: 200, json: async () => ({ id: 'row-1' }), text: async () => '{"id":"row-1"}' } as unknown as Response;
    return { ok: true, status: 200, json: async () => [] } as Response;
  }) as typeof fetch;
  return async () => { globalThis.fetch = originalFetch; restoreEnv(env); };
}

async function run() {
  // --- 1. Booking availability read keeps its exact narrow REST shape ---
  const bookingCalls: any[] = [];
  let restore = stubFetch(bookingCalls);
  try {
    await bookingDb.getBlocksByPropertyId('prop-1');
  } finally { restore(); }
  assert.equal(bookingCalls.length, 1);
  assert.match(bookingCalls[0].url, /^https:\/\/example\.supabase\.co\/rest\/v1\/bookings\?property_id=eq\.prop-1&select=check_in,check_out,status$/);

  // Fail closed: REST error status must never become empty availability.
  mode = 'httpError';
  restore = stubFetch([]);
  try {
    await assert.rejects(() => bookingDb.getBlocksByPropertyId('prop-1'), /REST_BOOKING_AVAILABILITY_QUERY_FAILED/);
  } finally { restore(); }

  // Fail closed: malformed/unparseable payload must throw, not become [].
  mode = 'malformed';
  restore = stubFetch([]);
  try {
    await assert.rejects(() => bookingDb.getBlocksByPropertyId('prop-1'), /MALFORMED|REST_QUERY_ERROR|invalid json/i);
  } finally { restore(); }

  // Fail closed: network outage must throw.
  mode = 'networkError';
  restore = stubFetch([]);
  try {
    await assert.rejects(() => bookingDb.getBlocksByPropertyId('prop-1'), /REST_QUERY_ERROR|network outage/);
  } finally { restore(); }
  mode = 'success';

  // --- 2. property_availability read: exact narrow matcher + camelCase mapping ---
  const readCalls: any[] = [];
  restore = stubFetch(readCalls);
  (globalThis.fetch as any) = (async (input: string | URL | Request, init?: RequestInit) => {
    readCalls.push({ url: String(input), method: init?.method || 'GET' });
    return {
      ok: true, status: 200,
      json: async () => [{
        id: 'av-1', property_id: 'prop-1', date: '2026-12-05', is_booked: true,
        custom_price_per_night: '3500.00', note: 'BLOCKED',
      }],
    } as Response;
  });
  try {
    const rows = await propertyAvailabilityDb.getByPropertyId('prop-1');
    assert.equal(readCalls.length, 1);
    assert.match(readCalls[0].url, /\/rest\/v1\/property_availability\?property_id=eq\.prop-1&select=id,property_id,date,is_booked,custom_price_per_night,note&order=date\.asc$/);
    assert.equal(rows[0].propertyId, 'prop-1');
    assert.equal(rows[0].date, '2026-12-05');
    assert.equal(rows[0].isBooked, true);
    assert.equal(rows[0].customPricePerNight, '3500.00');
    assert.equal(rows[0].note, 'BLOCKED');
  } finally { restore(); }

  mode = 'httpError';
  restore = stubFetch([]);
  try {
    await assert.rejects(() => propertyAvailabilityDb.getByPropertyId('prop-1'), /REST_AVAILABILITY_QUERY_FAILED/);
  } finally { restore(); }
  mode = 'networkError';
  restore = stubFetch([]);
  try {
    await assert.rejects(() => propertyAvailabilityDb.getByPropertyId('prop-1'), /REST_QUERY_ERROR|network outage/);
  } finally { restore(); }
  mode = 'success';

  // --- 3. property_availability upsert: merge-duplicates, price column untouched ---
  const writeCalls: any[] = [];
  restore = stubFetch(writeCalls);
  (globalThis.fetch as any) = (async (input: string | URL | Request, init?: RequestInit) => {
    writeCalls.push({
      url: String(input),
      method: init?.method,
      prefer: new Headers(init?.headers).get('prefer'),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return {
      ok: true, status: 201,
      json: async () => [{
        id: 'av-1', property_id: 'prop-1', date: '2026-12-05', is_booked: true,
        custom_price_per_night: '3500.00', note: 'BLOCKED',
      }],
    } as Response;
  });
  try {
    const record = await propertyAvailabilityDb.setBlockedForDate('prop-1', '2026-12-05', true, 'BLOCKED');
    assert.equal(writeCalls.length, 1);
    assert.equal(writeCalls[0].method, 'POST');
    assert.match(writeCalls[0].url, /\/rest\/v1\/property_availability\?on_conflict=property_id,date$/);
    assert.equal(writeCalls[0].prefer, 'resolution=merge-duplicates,return=representation');
    assert.equal(writeCalls[0].body.property_id, 'prop-1');
    assert.equal(writeCalls[0].body.date, '2026-12-05');
    assert.equal(writeCalls[0].body.is_booked, true);
    assert.equal(writeCalls[0].body.note, 'BLOCKED');
    assert.equal('custom_price_per_night' in writeCalls[0].body, false, 'toggle writes never touch the price override column');
    assert.equal(record.customPricePerNight, '3500.00', 'returned record keeps the persisted price override');
  } finally { restore(); }

  mode = 'httpError';
  restore = stubFetch([]);
  try {
    await assert.rejects(() => propertyAvailabilityDb.setBlockedForDate('prop-1', '2026-12-05', true, 'BLOCKED'), /REST_AVAILABILITY_UPSERT_FAILED/);
  } finally { restore(); }
  mode = 'malformed';
  restore = stubFetch([]);
  try {
    await assert.rejects(() => propertyAvailabilityDb.setBlockedForDate('prop-1', '2026-12-05', true, 'BLOCKED'), /MALFORMED|REST_QUERY_ERROR|invalid json/i);
  } finally { restore(); }
  mode = 'success';

  // --- 4. Fail-closed strictness for 200 availability payloads (Collection
  // availability decisions must never be derived from unexpected shapes) ---
  mode = 'singleObject';
  restore = stubFetch([]);
  try {
    // Booking availability SELECT: HTTP 200 non-array payload cannot become [].
    await assert.rejects(() => bookingDb.getBlocksByPropertyId('prop-1'), /REST_BOOKING_AVAILABILITY_MALFORMED_RESPONSE/);
    // property_availability SELECT: same strictness.
    await assert.rejects(() => propertyAvailabilityDb.getByPropertyId('prop-1'), /REST_AVAILABILITY_MALFORMED_RESPONSE/);
    // property_availability upsert return payload: same strictness.
    await assert.rejects(() => propertyAvailabilityDb.setBlockedForDate('prop-1', '2026-12-05', true, 'BLOCKED'), /REST_AVAILABILITY_UPSERT_MALFORMED_RESPONSE/);
  } finally { restore(); }

  // Rows missing decision-grade fields must throw, not be silently dropped.
  mode = 'success';
  restore = stubFetch([]);
  (globalThis.fetch as any) = (async () => ({
    ok: true, status: 200,
    json: async () => [{ id: 'av-1', property_id: 'prop-1', date: '2026-12-05' }], // is_booked missing
  }));
  try {
    await assert.rejects(() => propertyAvailabilityDb.getByPropertyId('prop-1'), /missing required id\/date\/is_booked/);
  } finally { restore(); }

  restore = stubFetch([]);
  (globalThis.fetch as any) = (async () => ({
    ok: true, status: 200,
    json: async () => [{ check_in: '2026-12-05' }], // check_out/status missing
  }));
  try {
    await assert.rejects(() => bookingDb.getBlocksByPropertyId('prop-1'), /missing required check_in\/check_out\/status/);
  } finally { restore(); }

  // Legitimate empty arrays remain valid zero-row results.
  mode = 'success';
  restore = stubFetch([]);
  (globalThis.fetch as any) = (async () => ({ ok: true, status: 200, json: async () => [] }));
  try {
    const emptyRows = await propertyAvailabilityDb.getByPropertyId('prop-1');
    assert.equal(emptyRows.length, 0, 'empty array is a valid zero-row availability result');
    const emptyBookings = await bookingDb.getBlocksByPropertyId('prop-1');
    assert.equal(emptyBookings.length, 0);
  } finally { restore(); }

  // --- 5. Correction 2 proof: the REAL Worker/PostgREST trigger-error path.
  // A non-2xx upsert whose bounded body carries the trigger code must surface
  // as HTTP 409 DATE_OVERLAP through repository + route, not a generic 500.
  const { ExpressServerApp } = await import('../app');
  const { propertyDb } = await import('../services/dbRepository');
  const { signAccessToken } = await import('../services/jwtService');
  const app = new ExpressServerApp();
  const ownerHeaders = { authorization: `Bearer ${signAccessToken({ sub: 'a1111111-1111-4111-8111-111111111111', role: 'ROLE_OWNER' })}` };
  const originalGetById = (propertyDb as any).getById;
  (propertyDb as any).getById = async (id: string) => id === 'prop-1' ? { id, ownerId: 'a1111111-1111-4111-8111-111111111111', status: 'DRAFT', verificationStatus: 'UNVERIFIED' } : null;
  restore = stubFetch([]);
  (globalThis.fetch as any) = (async () => ({
    ok: false, status: 400,
    text: async () => JSON.stringify({ code: 'P0001', message: 'DATE_COVERED_BY_ACTIVE_BOOKING', details: null, hint: null }),
  }));
  try {
    const conflict = await app.handleHttpRequest('POST', '/api/v1/owner/calendar/toggle-block', ownerHeaders, { propertyId: 'prop-1', date: '2026-12-05', note: 'BLOCKED' });
    assert.equal(conflict.statusCode, 409, 'Worker trigger conflict must surface as canonical 409 DATE_OVERLAP');
    assert.equal((conflict.body as any).error.code, 'DATE_OVERLAP');
  } finally {
    restore();
    (propertyDb as any).getById = originalGetById;
  }

  console.log('P1.4 Worker availability adapter fail-closed contract suite passed');
}

await run();

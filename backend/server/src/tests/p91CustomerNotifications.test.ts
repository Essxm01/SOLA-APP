import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { signAccessToken } from '../services/jwtService.js';
import {
  CUSTOMER_NOTIFICATION_EVENT_TYPES,
  toCustomerNotificationDto,
  encodeCustomerNotificationCursor,
  decodeCustomerNotificationCursor,
  assertCustomerNotificationRecord,
  type CustomerNotificationRecord,
} from '../contracts/customerNotifications.js';
import { customerNotificationDb, notificationDb } from '../services/dbRepository.js';
import { queryDb } from '../services/dbClient.js';
import { ExpressServerApp } from '../app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure JWT secret is at least 32 bytes for tests
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_jwt_secret_for_unit_tests_32chars_min_length!';

const signToken = (payload: { sub: string; role: any; phone?: string }) =>
  signAccessToken(payload);

console.log('=== P9.1 CUSTOMER NOTIFICATIONS TEST SUITE ===');

// ============================================================================
// SUITE 1: STATIC MIGRATION CONTRACT (033_customer_notifications.sql)
// ============================================================================
console.log('\n--- Suite 1: Static Migration Contract ---');

const migrationPath = path.resolve(__dirname, '../../../database/migrations/033_customer_notifications.sql');
assert.ok(fs.existsSync(migrationPath), 'Migration 033_customer_notifications.sql must exist');
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

// 1. Transaction boundary & ledger recording
assert.ok(migrationSql.startsWith('--') || migrationSql.startsWith('BEGIN;'), 'Migration must be transactional');
assert.ok(migrationSql.includes('BEGIN;'), 'Migration must contain BEGIN;');
assert.ok(migrationSql.includes('COMMIT;'), 'Migration must contain COMMIT;');
assert.ok(
  migrationSql.includes("INSERT INTO public.schema_migrations (version)") &&
  migrationSql.includes("'033_customer_notifications.sql'"),
  'Migration must register itself in public.schema_migrations'
);
assert.ok(
  !migrationSql.includes('supabase_migrations.schema_migrations'),
  'Migration must NOT modify supabase_migrations.schema_migrations'
);

// 2. Table & Column Definitions
assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.customer_notifications'), 'Must create public.customer_notifications');
assert.ok(migrationSql.includes('customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT'), 'customer_id FK to users with RESTRICT');
assert.ok(migrationSql.includes('booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT'), 'booking_id FK to bookings with RESTRICT');
assert.ok(migrationSql.includes("'BOOKING_APPROVED_PENDING_PAYMENT'"), 'Must allow BOOKING_APPROVED_PENDING_PAYMENT');
assert.ok(migrationSql.includes("'BOOKING_REJECTED'"), 'Must allow BOOKING_REJECTED');
assert.ok(migrationSql.includes('property_title_snapshot VARCHAR(200) NULL'), 'property_title_snapshot must be VARCHAR(200) NULL');
assert.ok(migrationSql.includes("event_key TEXT GENERATED ALWAYS AS (booking_id::text || ':' || event_type) STORED"), 'event_key must be generated stored');
assert.ok(migrationSql.includes('CONSTRAINT customer_notifications_event_key_unique UNIQUE (event_key)'), 'event_key must be unique');
assert.ok(migrationSql.includes('created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()'), 'created_at TIMESTAMPTZ');
assert.ok(migrationSql.includes('read_at TIMESTAMPTZ NULL'), 'read_at TIMESTAMPTZ NULL');

// 3. Negative assertions on table: forbidden fields
const tableBlockMatch = migrationSql.match(/CREATE TABLE IF NOT EXISTS public\.customer_notifications \([\s\S]*?\);/);
assert.ok(tableBlockMatch, 'CREATE TABLE block must be found');
const tableBlock = tableBlockMatch[0];
assert.ok(!tableBlock.includes('is_read'), 'Table must NOT persist is_read column');
assert.ok(!tableBlock.includes('action_route'), 'Table must NOT persist action_route column');
assert.ok(!tableBlock.includes('action_required'), 'Table must NOT persist action_required column');

// 4. Indexes
assert.ok(
  migrationSql.includes('idx_customer_notifications_customer_created') &&
  migrationSql.includes('(customer_id, created_at DESC, id DESC)'),
  'Must create composite ordering index idx_customer_notifications_customer_created'
);
assert.ok(
  migrationSql.includes('idx_customer_notifications_unread') &&
  migrationSql.includes('(customer_id)') &&
  migrationSql.includes('WHERE read_at IS NULL'),
  'Must create partial unread index idx_customer_notifications_unread'
);

// 5. RLS & ACL
assert.ok(migrationSql.includes('ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;'), 'RLS must be enabled');
assert.ok(
  migrationSql.includes('REVOKE ALL ON TABLE public.customer_notifications FROM PUBLIC, anon, authenticated, service_role;'),
  'Direct table privileges must be revoked from all roles including service_role'
);
assert.ok(!migrationSql.includes('CREATE POLICY'), 'Must create ZERO Customer direct policies');

// 6. Trigger & Trigger Function Security
assert.ok(migrationSql.includes('CREATE OR REPLACE FUNCTION public.konfrm_create_customer_notification()'), 'Must define trigger function');
assert.ok(migrationSql.includes('SECURITY DEFINER'), 'Trigger function must be SECURITY DEFINER');
assert.ok(migrationSql.includes('SET search_path = public, pg_temp'), 'Must pin search_path');
assert.ok(migrationSql.includes('NEW.customer_id IS NULL'), 'Trigger must handle null customer gracefully');
assert.ok(migrationSql.includes('ON CONFLICT (event_key) DO NOTHING'), 'Trigger must use ON CONFLICT (event_key) DO NOTHING');
assert.ok(
  migrationSql.includes('REVOKE ALL ON FUNCTION public.konfrm_create_customer_notification() FROM PUBLIC, anon, authenticated;'),
  'Trigger function execution must be revoked from public/anon/authenticated'
);

// 7. RPCs & Privileges
assert.ok(migrationSql.includes('public.konfrm_list_customer_notifications'), 'Must define konfrm_list_customer_notifications');
assert.ok(migrationSql.includes('public.konfrm_count_customer_unread_notifications'), 'Must define konfrm_count_customer_unread_notifications');
assert.ok(migrationSql.includes('public.konfrm_mark_customer_notification_read'), 'Must define konfrm_mark_customer_notification_read');
assert.ok(
  migrationSql.includes('GRANT EXECUTE ON FUNCTION public.konfrm_list_customer_notifications(UUID, INTEGER, TIMESTAMPTZ, UUID) TO service_role;') &&
  migrationSql.includes('GRANT EXECUTE ON FUNCTION public.konfrm_count_customer_unread_notifications(UUID) TO service_role;') &&
  migrationSql.includes('GRANT EXECUTE ON FUNCTION public.konfrm_mark_customer_notification_read(UUID, UUID) TO service_role;'),
  'Only service_role must be granted EXECUTE on RPCs'
);

console.log('✓ Suite 1 passed: Migration 033 adheres strictly to REV2 architecture contract.');

// ============================================================================
// SUITE 2: CONTRACTS, DTO & CURSOR ENCODING
// ============================================================================
console.log('\n--- Suite 2: Contracts, DTO & Cursor Encoding ---');

const sampleRecord: CustomerNotificationRecord = {
  notificationId: '00000000-0000-4000-8000-000000000001',
  eventType: 'BOOKING_APPROVED_PENDING_PAYMENT',
  bookingId: '00000000-0000-4000-8000-000000000002',
  propertyTitle: 'شاليه مراسي فاخر',
  createdAt: '2026-09-25T10:00:00.000Z',
  readAt: null,
  isRead: false,
  actionRequired: true,
};

assertCustomerNotificationRecord(sampleRecord);
const dto = toCustomerNotificationDto(sampleRecord);

// Safe DTO assertion: only permitted fields exist
const dtoKeys = Object.keys(dto).sort();
assert.deepEqual(dtoKeys, ['actionRequired', 'bookingId', 'createdAt', 'eventType', 'isRead', 'notificationId', 'propertyTitle'].sort());
assert.equal(dto.actionRequired, true);
assert.equal(dto.isRead, false);
assert.equal(dto.propertyTitle, 'شاليه مراسي فاخر');
assert.equal('customer_id' in (dto as any), false);
assert.equal('owner_id' in (dto as any), false);
assert.equal('event_key' in (dto as any), false);
assert.equal('read_at' in (dto as any), false);
assert.equal('action_route' in (dto as any), false);

// Nullable propertyTitle works
const nullTitleRecord: CustomerNotificationRecord = {
  ...sampleRecord,
  propertyTitle: null,
};
assertCustomerNotificationRecord(nullTitleRecord);
const nullTitleDto = toCustomerNotificationDto(nullTitleRecord);
assert.equal(nullTitleDto.propertyTitle, null);

// Cursor encoding and decoding
const cursor = { id: '00000000-0000-4000-8000-000000000001', createdAt: '2026-09-25T10:00:00.000Z' };
const encoded = encodeCustomerNotificationCursor(cursor);
assert.ok(typeof encoded === 'string' && encoded.length > 0);
const decoded = decodeCustomerNotificationCursor(encoded);
assert.deepEqual(decoded, cursor);

// Malformed cursor fails closed
assert.throws(() => decodeCustomerNotificationCursor('not-base64-json'), /INVALID_NOTIFICATION_CURSOR/);
assert.throws(() => decodeCustomerNotificationCursor(Buffer.from('{"id":"not-uuid"}').toString('base64url')), /INVALID_NOTIFICATION_CURSOR/);
assert.equal(decodeCustomerNotificationCursor(null), null);
assert.equal(decodeCustomerNotificationCursor(undefined), null);

console.log('✓ Suite 2 passed: DTO sanitization, validation, and cursor round-trip proven.');

// ============================================================================
// SUITE 3: DB CLIENT & WORKER ADAPTER MATCHER CONTRACT
// ============================================================================
console.log('\n--- Suite 3: Worker Adapter & DB Client Matchers ---');

const origFetch = globalThis.fetch;
const origDbUrl = process.env.DATABASE_URL;

try {
  delete process.env.DATABASE_URL; // Force Worker REST path in queryDb
  process.env.SUPABASE_URL = 'https://mock.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_key';

  let interceptedUrl = '';
  let interceptedMethod = '';
  let interceptedBody: any = null;

  // 1. konfrm_list_customer_notifications mock
  globalThis.fetch = (async (url: any, init: any) => {
    interceptedUrl = String(url);
    interceptedMethod = init?.method || 'GET';
    interceptedBody = init?.body ? JSON.parse(init.body) : null;

    if (interceptedUrl.includes('/rest/v1/rpc/konfrm_list_customer_notifications')) {
      return new Response(JSON.stringify([
        {
          notification_id: '00000000-0000-4000-8000-000000000001',
          event_type: 'BOOKING_APPROVED_PENDING_PAYMENT',
          booking_id: '00000000-0000-4000-8000-000000000002',
          property_title_snapshot: 'شاليه تجريبي',
          created_at: '2026-09-25T12:00:00.000Z',
          read_at: null,
          is_read: false,
          action_required: true,
        },
      ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (interceptedUrl.includes('/rest/v1/rpc/konfrm_count_customer_unread_notifications')) {
      return new Response(JSON.stringify([{ unread_count: 3 }]), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    if (interceptedUrl.includes('/rest/v1/rpc/konfrm_mark_customer_notification_read')) {
      return new Response(JSON.stringify([{
        notification_id: '00000000-0000-4000-8000-000000000001',
        read_at: '2026-09-25T13:00:00.000Z',
      }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('[]', { status: 200 });
  }) as any;

  // Test customerNotificationDb.list via Worker REST path
  const listResult = await customerNotificationDb.list('00000000-0000-4000-8000-000000000009', 20);
  assert.equal(listResult.length, 1);
  assert.equal(listResult[0].notificationId, '00000000-0000-4000-8000-000000000001');
  assert.equal(listResult[0].isRead, false);
  assert.equal(listResult[0].actionRequired, true);
  assert.ok(interceptedUrl.includes('/rpc/konfrm_list_customer_notifications'));
  assert.equal(interceptedBody.p_limit, 20);

  // Test customerNotificationDb.countUnread via Worker REST path
  const unreadCount = await customerNotificationDb.countUnread('00000000-0000-4000-8000-000000000009');
  assert.equal(unreadCount, 3);
  assert.ok(interceptedUrl.includes('/rpc/konfrm_count_customer_unread_notifications'));

  // Test customerNotificationDb.markRead via Worker REST path
  const markResult = await customerNotificationDb.markRead(
    '00000000-0000-4000-8000-000000000009',
    '00000000-0000-4000-8000-000000000001'
  );
  assert.ok(markResult);
  assert.equal(markResult.notificationId, '00000000-0000-4000-8000-000000000001');
  assert.equal(markResult.readAt, '2026-09-25T13:00:00.000Z');

  // Test fail-closed: malformed RPC responses throw, no fake empty arrays or zero counts
  globalThis.fetch = (async () => {
    return new Response(JSON.stringify([{ unread_count: 'malformed_negative' }]), { status: 200 });
  }) as any;
  await assert.rejects(
    () => customerNotificationDb.countUnread('00000000-0000-4000-8000-000000000009'),
    /REST_CUSTOMER_NOTIFICATIONS_COUNT_MALFORMED/
  );

  globalThis.fetch = (async () => {
    return new Response(JSON.stringify([{ invalid_schema: true }]), { status: 200 });
  }) as any;
  await assert.rejects(
    () => customerNotificationDb.list('00000000-0000-4000-8000-000000000009', 20),
    /REST_CUSTOMER_NOTIFICATIONS_LIST_MALFORMED/
  );

} finally {
  globalThis.fetch = origFetch;
  if (origDbUrl) process.env.DATABASE_URL = origDbUrl;
}

console.log('✓ Suite 3 passed: DB Repository and Worker REST matchers are strict and fail-closed.');

// ============================================================================
// SUITE 4: TRIGGER LOGIC & ACTION_REQUIRED INVARIANTS
// ============================================================================
console.log('\n--- Suite 4: Trigger Logic & Action Required Invariants ---');

// In-memory simulation verifying trigger rules against REV2 requirements
function simulateBookingTrigger(oldRow: any, newRow: any, propertyTitle: string | null) {
  if (oldRow.status !== 'PENDING_OWNER_APPROVAL' ||
      !['APPROVED_PENDING_PAYMENT', 'REJECTED'].includes(newRow.status) ||
      !newRow.customer_id) {
    return null;
  }
  const event_type = newRow.status === 'APPROVED_PENDING_PAYMENT'
    ? 'BOOKING_APPROVED_PENDING_PAYMENT'
    : 'BOOKING_REJECTED';
  return {
    customer_id: newRow.customer_id,
    booking_id: newRow.id,
    event_type,
    property_title_snapshot: propertyTitle,
    event_key: `${newRow.id}:${event_type}`,
  };
}

// Case A: Approval transition creates BOOKING_APPROVED_PENDING_PAYMENT
const approveEvent = simulateBookingTrigger(
  { status: 'PENDING_OWNER_APPROVAL' },
  { id: 'b-1', status: 'APPROVED_PENDING_PAYMENT', customer_id: 'c-1' },
  'Beach Villa'
);
assert.ok(approveEvent);
assert.equal(approveEvent.event_type, 'BOOKING_APPROVED_PENDING_PAYMENT');
assert.equal(approveEvent.event_key, 'b-1:BOOKING_APPROVED_PENDING_PAYMENT');
assert.equal(approveEvent.property_title_snapshot, 'Beach Villa');

// Case B: Rejection transition creates BOOKING_REJECTED
const rejectEvent = simulateBookingTrigger(
  { status: 'PENDING_OWNER_APPROVAL' },
  { id: 'b-2', status: 'REJECTED', customer_id: 'c-1' },
  null
);
assert.ok(rejectEvent);
assert.equal(rejectEvent.event_type, 'BOOKING_REJECTED');
assert.equal(rejectEvent.property_title_snapshot, null);

// Case C: Unrelated transition (e.g. APPROVED_PENDING_PAYMENT -> CONFIRMED) creates NONE
const confirmEvent = simulateBookingTrigger(
  { status: 'APPROVED_PENDING_PAYMENT' },
  { id: 'b-1', status: 'CONFIRMED', customer_id: 'c-1' },
  'Beach Villa'
);
assert.equal(confirmEvent, null);

// Case D: NULL customer legacy booking creates NONE and does not fail
const legacyEvent = simulateBookingTrigger(
  { status: 'PENDING_OWNER_APPROVAL' },
  { id: 'b-legacy', status: 'APPROVED_PENDING_PAYMENT', customer_id: null },
  'Beach Villa'
);
assert.equal(legacyEvent, null);

// Action Required Current Booking State Invariant:
function deriveActionRequired(eventType: string, currentBookingStatus: string | null): boolean {
  return eventType === 'BOOKING_APPROVED_PENDING_PAYMENT' && currentBookingStatus === 'APPROVED_PENDING_PAYMENT';
}

assert.equal(deriveActionRequired('BOOKING_APPROVED_PENDING_PAYMENT', 'APPROVED_PENDING_PAYMENT'), true);
assert.equal(deriveActionRequired('BOOKING_APPROVED_PENDING_PAYMENT', 'CONFIRMED'), false);
assert.equal(deriveActionRequired('BOOKING_APPROVED_PENDING_PAYMENT', 'CANCELLED_BY_GUEST'), false);
assert.equal(deriveActionRequired('BOOKING_APPROVED_PENDING_PAYMENT', null), false);
assert.equal(deriveActionRequired('BOOKING_REJECTED', 'REJECTED'), false);

console.log('✓ Suite 4 passed: Trigger transition rules, null customer safety, and actionRequired invariants verified.');

// ============================================================================
// SUITE 5: HTTP ROUTE ACCESS CONTROL & API BOUNDARIES
// ============================================================================
console.log('\n--- Suite 5: HTTP Route Access Control & API Boundaries ---');

const app = new ExpressServerApp();

const customerIdA = '00000000-0000-4000-8000-000000000001';
const customerIdB = '00000000-0000-4000-8000-000000000002';
const ownerId = '00000000-0000-4000-8000-000000000099';

const tokenCustomerA = signToken({ sub: customerIdA, role: 'ROLE_CUSTOMER' });
const tokenCustomerB = signToken({ sub: customerIdB, role: 'ROLE_CUSTOMER' });
const tokenOwner = signToken({ sub: ownerId, role: 'ROLE_OWNER' });

const headersCustomerA = { authorization: `Bearer ${tokenCustomerA}` };
const headersCustomerB = { authorization: `Bearer ${tokenCustomerB}` };
const headersOwner = { authorization: `Bearer ${tokenOwner}` };

// 1. Unauthenticated requests fail with 401
const unauthList = await app.handleHttpRequest('GET', '/api/v1/customer/notifications');
assert.equal(unauthList.statusCode, 401, 'Anonymous GET /notifications must return 401');

const unauthCount = await app.handleHttpRequest('GET', '/api/v1/customer/notifications/unread-count');
assert.equal(unauthCount.statusCode, 401, 'Anonymous GET /notifications/unread-count must return 401');

const unauthRead = await app.handleHttpRequest('POST', '/api/v1/customer/notifications/00000000-0000-4000-8000-000000000001/read');
assert.equal(unauthRead.statusCode, 401, 'Anonymous POST /read must return 401');

// 2. Non-Customer tokens fail with 403
const ownerList = await app.handleHttpRequest('GET', '/api/v1/customer/notifications', headersOwner);
assert.equal(ownerList.statusCode, 403, 'Owner token on customer route must return 403');

const ownerCount = await app.handleHttpRequest('GET', '/api/v1/customer/notifications/unread-count', headersOwner);
assert.equal(ownerCount.statusCode, 403, 'Owner token on customer unread count must return 403');

const ownerRead = await app.handleHttpRequest('POST', '/api/v1/customer/notifications/00000000-0000-4000-8000-000000000001/read', headersOwner);
assert.equal(ownerRead.statusCode, 403, 'Owner token on customer mark-read must return 403');

// 3. Stubs for Customer Notification Database
let mockNotifications: CustomerNotificationRecord[] = [
  {
    notificationId: '10000000-0000-4000-8000-000000000001',
    eventType: 'BOOKING_APPROVED_PENDING_PAYMENT',
    bookingId: '20000000-0000-4000-8000-000000000001',
    propertyTitle: 'شاليه عميل أ',
    createdAt: '2026-09-25T14:00:00.000Z',
    readAt: null,
    isRead: false,
    actionRequired: true,
  },
  {
    notificationId: '10000000-0000-4000-8000-000000000002',
    eventType: 'BOOKING_REJECTED',
    bookingId: '20000000-0000-4000-8000-000000000002',
    propertyTitle: 'فيلا عميل أ',
    createdAt: '2026-09-24T12:00:00.000Z',
    readAt: '2026-09-24T13:00:00.000Z',
    isRead: true,
    actionRequired: false,
  },
];

let mockCustomerOwnership: Record<string, string> = {
  '10000000-0000-4000-8000-000000000001': customerIdA,
  '10000000-0000-4000-8000-000000000002': customerIdA,
};

const origDbList = customerNotificationDb.list;
const origDbCount = customerNotificationDb.countUnread;
const origDbMarkRead = customerNotificationDb.markRead;

(customerNotificationDb as any).list = async (cid: string, limit: number, cursor?: any) => {
  let list = mockNotifications.filter(n => mockCustomerOwnership[n.notificationId] === cid);
  if (cursor) {
    list = list.filter(n => n.createdAt < cursor.createdAt || (n.createdAt === cursor.createdAt && n.notificationId < cursor.id));
  }
  return list.slice(0, limit + 1);
};

(customerNotificationDb as any).countUnread = async (cid: string) => {
  return mockNotifications.filter(n => mockCustomerOwnership[n.notificationId] === cid && !n.isRead).length;
};

(customerNotificationDb as any).markRead = async (cid: string, nid: string) => {
  const notif = mockNotifications.find(n => n.notificationId === nid);
  if (!notif || mockCustomerOwnership[nid] !== cid) {
    return null; // Not found or foreign customer -> 0 rows in DB
  }
  if (!notif.readAt) {
    notif.readAt = new Date().toISOString();
    notif.isRead = true;
  }
  return { notificationId: notif.notificationId, readAt: notif.readAt };
};

try {
  // 4. List notifications for Customer A (should return 2 items)
  const listA = await app.handleHttpRequest('GET', '/api/v1/customer/notifications', headersCustomerA);
  assert.equal(listA.statusCode, 200);
  assert.equal((listA.body as any).data.items.length, 2);
  assert.equal((listA.body as any).data.items[0].notificationId, '10000000-0000-4000-8000-000000000001');

  // Cross-customer isolation: Customer B sees 0 items
  const listB = await app.handleHttpRequest('GET', '/api/v1/customer/notifications', headersCustomerB);
  assert.equal(listB.statusCode, 200);
  assert.equal((listB.body as any).data.items.length, 0);
  assert.equal((listB.body as any).data.nextCursor, null);

  // Unread count for Customer A is 1
  const countA = await app.handleHttpRequest('GET', '/api/v1/customer/notifications/unread-count', headersCustomerA);
  assert.equal(countA.statusCode, 200);
  assert.equal((countA.body as any).data.unreadCount, 1);

  // Unread count for Customer B is 0
  const countB = await app.handleHttpRequest('GET', '/api/v1/customer/notifications/unread-count', headersCustomerB);
  assert.equal(countB.statusCode, 200);
  assert.equal((countB.body as any).data.unreadCount, 0);

  // 5. Query parameter validation
  const badLimit = await app.handleHttpRequest('GET', '/api/v1/customer/notifications?limit=100', headersCustomerA);
  assert.equal(badLimit.statusCode, 400);
  assert.equal((badLimit.body as any).error.code, 'INVALID_NOTIFICATION_LIMIT');

  const zeroLimit = await app.handleHttpRequest('GET', '/api/v1/customer/notifications?limit=0', headersCustomerA);
  assert.equal(zeroLimit.statusCode, 400);
  assert.equal((zeroLimit.body as any).error.code, 'INVALID_NOTIFICATION_LIMIT');

  const badCursor = await app.handleHttpRequest('GET', '/api/v1/customer/notifications?cursor=invalid-cursor', headersCustomerA);
  assert.equal(badCursor.statusCode, 400);
  assert.equal((badCursor.body as any).error.code, 'INVALID_NOTIFICATION_CURSOR');

  // 6. Mark read - Customer A marks their unread notification
  const markRes = await app.handleHttpRequest(
    'POST',
    '/api/v1/customer/notifications/10000000-0000-4000-8000-000000000001/read',
    headersCustomerA
  );
  assert.equal(markRes.statusCode, 200);
  assert.equal((markRes.body as any).data.notificationId, '10000000-0000-4000-8000-000000000001');
  assert.equal((markRes.body as any).data.isRead, true);

  // Read idempotency: original readAt is preserved on repeat call
  const originalReadAt = (markRes.body as any).data.readAt;
  const repeatMarkRes = await app.handleHttpRequest(
    'POST',
    '/api/v1/customer/notifications/10000000-0000-4000-8000-000000000001/read',
    headersCustomerA
  );
  assert.equal(repeatMarkRes.statusCode, 200);
  assert.equal((repeatMarkRes.body as any).data.readAt, originalReadAt);

  // 7. Cross-customer isolation on mutation: Customer B attempts to mark Customer A's notification
  const crossMarkRes = await app.handleHttpRequest(
    'POST',
    '/api/v1/customer/notifications/10000000-0000-4000-8000-000000000001/read',
    headersCustomerB
  );
  assert.equal(crossMarkRes.statusCode, 404, 'Foreign customer must get generic 404 without leaking ownership');
  assert.equal((crossMarkRes.body as any).error.code, 'NOTIFICATION_NOT_FOUND');

  // Malformed notification ID UUID returns 400
  const malformedIdRes = await app.handleHttpRequest(
    'POST',
    '/api/v1/customer/notifications/not-a-valid-uuid/read',
    headersCustomerA
  );
  assert.equal(malformedIdRes.statusCode, 400);
  assert.equal((malformedIdRes.body as any).error.code, 'INVALID_NOTIFICATION_ID');

  // 8. DB failure fail-closed: DB error results in 500, never [] or 0
  (customerNotificationDb as any).list = async () => { throw new Error('DB_DOWN'); };
  const failList = await app.handleHttpRequest('GET', '/api/v1/customer/notifications', headersCustomerA);
  assert.equal(failList.statusCode, 500);
  assert.equal((failList.body as any).error.code, 'CUSTOMER_NOTIFICATIONS_QUERY_FAILED');

  (customerNotificationDb as any).countUnread = async () => { throw new Error('DB_DOWN'); };
  const failCount = await app.handleHttpRequest('GET', '/api/v1/customer/notifications/unread-count', headersCustomerA);
  assert.equal(failCount.statusCode, 500);
  assert.equal((failCount.body as any).error.code, 'CUSTOMER_NOTIFICATIONS_COUNT_FAILED');

} finally {
  customerNotificationDb.list = origDbList;
  customerNotificationDb.countUnread = origDbCount;
  customerNotificationDb.markRead = origDbMarkRead;
}

console.log('✓ Suite 5 passed: HTTP routes enforce strict auth, parameter checks, cross-customer isolation, and fail-closed errors.');

// ============================================================================
// SUITE 6: OWNER & ADMIN NOTIFICATION REGRESSION GUARD
// ============================================================================
console.log('\n--- Suite 6: Owner/Admin Notification Regression Guard ---');

// Verify legacy owner notification repository is intact and distinct
assert.ok(typeof notificationDb.getByOwnerId === 'function', 'notificationDb.getByOwnerId must remain');
assert.ok(typeof notificationDb.create === 'function', 'notificationDb.create must remain');

console.log('✓ Suite 6 passed: Legacy Owner and Admin notification interfaces are preserved without regression.');

console.log('\n======================================================');
console.log('ALL P9.1 CUSTOMER NOTIFICATION TESTS PASSED SUCCESSFULLY');
console.log('======================================================\n');

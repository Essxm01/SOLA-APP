import { strict as assert } from 'node:assert';
import { imageDb, propertyDb } from '../services/dbRepository';

const ownerId = 'a1111111-1111-4111-8111-111111111111';
const propertyId = 'd4444444-4444-4444-8444-444444444444';
const intentId = 'e5555555-5555-4555-8555-555555555555';
const objectKey = `properties/${propertyId}/image.png`;
const originalFetch = globalThis.fetch;
const originalUrl = process.env.SUPABASE_URL;
const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const propertyRow = (status: string, verificationStatus: string) => ({
  id: propertyId, owner_id: ownerId, title: 'وحدة اختبار', status,
  verification_status: verificationStatus, updated_at: '2026-08-31T00:00:00.000Z',
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function lifecycleCase(status: string, verificationStatus?: string) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init || {} });
    return json([propertyRow(status, verificationStatus)]);
  }) as typeof fetch;
  const result = await propertyDb.updateStatusForOwner(propertyId, ownerId, status, verificationStatus);
  assert.equal(result?.status, status);
  const call = calls[0];
  assert.ok(call.url.includes('/rest/v1/properties?'));
  assert.ok(call.url.includes(`id=eq.${propertyId}`));
  assert.ok(call.url.includes(`owner_id=eq.${ownerId}`));
  assert.ok(call.url.includes('deleted_at=is.null'));
  assert.equal(call.init.method, 'PATCH');
  const body = JSON.parse(String(call.init.body));
  assert.equal(body.status, status);
  assert.equal(body.verification_status, verificationStatus);
  assert.ok(body.updated_at);
}

try {
  process.env.SUPABASE_URL = 'https://supabase.adapter.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';

  await lifecycleCase('PENDING_REVIEW', 'PENDING_VERIFICATION');
  await lifecycleCase('ARCHIVED');
  await lifecycleCase('DRAFT', 'UNVERIFIED');

  globalThis.fetch = (async () => json([])) as typeof fetch;
  await assert.rejects(
    propertyDb.updateStatusForOwner(propertyId, ownerId, 'PENDING_REVIEW', 'PENDING_VERIFICATION'),
    /REST_PROPERTY_OWNER_LIFECYCLE_UPDATE_ZERO_ROWS/,
    'zero-row lifecycle PATCH must not be success',
  );

  globalThis.fetch = (async () => json([
    propertyRow('PENDING_REVIEW', 'PENDING_VERIFICATION'),
    propertyRow('PENDING_REVIEW', 'PENDING_VERIFICATION'),
  ])) as typeof fetch;
  await assert.rejects(
    propertyDb.updateStatusForOwner(propertyId, ownerId, 'PENDING_REVIEW', 'PENDING_VERIFICATION'),
    /REST_PROPERTY_OWNER_LIFECYCLE_UPDATE_MULTIPLE_ROWS/,
    'multiple-row lifecycle PATCH must not be success',
  );

  globalThis.fetch = (async () => json({ error: 'failure' }, 500)) as typeof fetch;
  await assert.rejects(
    propertyDb.updateStatusForOwner(propertyId, ownerId, 'PENDING_REVIEW', 'PENDING_VERIFICATION'),
    /REST_PROPERTY_OWNER_LIFECYCLE_UPDATE_FAILED/,
    'REST lifecycle failure must propagate',
  );

  const publicCalls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    publicCalls.push(String(input));
    return json([]);
  }) as typeof fetch;
  await propertyDb.getAllForPublic();
  assert.ok(publicCalls[0].includes('status=eq.PUBLISHED'));
  assert.ok(publicCalls[0].includes('verification_status=eq.VERIFIED'));

  const statsCalls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    statsCalls.push(String(input));
    return new Response(null, { status: 200, headers: { 'content-range': '0-0/0' } });
  }) as typeof fetch;
  await propertyDb.getAdminStats();
  const statsQueries = statsCalls.map(url => new URL(url).searchParams);
  assert.ok(statsQueries.some(query => query.get('status') === 'eq.DRAFT' && query.get('verification_status') === 'eq.REJECTED'));
  assert.ok(!statsQueries.some(query => query.get('status') === 'eq.REJECTED'));

  const rpcCalls: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    rpcCalls.push({ url: String(input), init: init || {} });
    return json([{ id: 'image-1', propertyId, ownerId, objectKey, status: 'ACTIVE' }]);
  }) as typeof fetch;
  const image = await imageDb.commitPropertyMediaAtomic({
    uploadIntentId: intentId, ownerId, propertyId, objectKey,
    fileUrl: `https://media.test/${objectKey}`, fileName: 'image.png', mimeType: 'image/png', fileSize: 4,
  });
  assert.equal(image?.id, 'image-1');
  assert.ok(rpcCalls[0].url.endsWith('/rest/v1/rpc/konfrm_commit_property_media'));
  const rpcPayload = JSON.parse(String(rpcCalls[0].init.body));
  assert.equal(rpcPayload.p_upload_intent_id, intentId);
  assert.equal(rpcPayload.p_owner_id, ownerId);
  assert.equal(rpcPayload.p_property_id, propertyId);
  assert.equal(rpcPayload.p_object_key, objectKey);

  globalThis.fetch = (async () => json({ message: 'rpc unavailable' }, 500)) as typeof fetch;
  await assert.rejects(
    imageDb.commitPropertyMediaAtomic({
      uploadIntentId: intentId, ownerId, propertyId, objectKey,
      fileUrl: `https://media.test/${objectKey}`, fileName: 'image.png', mimeType: 'image/png', fileSize: 4,
    }),
    /REST_PROPERTY_MEDIA_COMMIT_RPC_FAILED/,
    'PostgREST RPC failure must propagate',
  );

  let zeroReadCount = 0;
  globalThis.fetch = (async () => {
    zeroReadCount += 1;
    return zeroReadCount === 1 ? json([{ ...propertyRow('DRAFT', 'UNVERIFIED'), base_price_per_night: 1000, amenities: [], house_rules: {} }]) : json([]);
  }) as typeof fetch;
  const genuinelyEmptyMedia = await propertyDb.getById(propertyId);
  assert.deepEqual(genuinelyEmptyMedia?.images, [], 'a successful empty media query remains an honest zero-image property');

  // A property row plus a failed image read is a persistence error, not a
  // truthful empty-image representation.
  let readCount = 0;
  globalThis.fetch = (async () => {
    readCount += 1;
    return readCount === 1 ? json([{ ...propertyRow('DRAFT', 'UNVERIFIED'), base_price_per_night: 1000, amenities: [], house_rules: {} }]) : json({ error: 'image failed' }, 500);
  }) as typeof fetch;
  await assert.rejects(propertyDb.getById(propertyId), /REST_PROPERTY_IMAGES_SELECT_FAILED/);

  console.log('P1.3 Worker adapter contract suite passed');
} finally {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
}

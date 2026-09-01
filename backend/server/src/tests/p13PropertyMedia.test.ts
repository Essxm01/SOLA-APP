import { strict as assert } from 'node:assert';
import http from 'node:http';
import { ExpressServerApp } from '../app';
import { signAccessToken } from '../services/jwtService';
import { imageDb, propertyDb, uploadIntentDb } from '../services/dbRepository';

const ownerA = 'a1111111-1111-4111-8111-111111111111';
const ownerB = 'b2222222-2222-4222-8222-222222222222';
const propertyId = 'd4444444-4444-4444-8444-444444444444';
const headers = (id: string) => ({ authorization: `Bearer ${signAccessToken({ sub: id, role: 'ROLE_OWNER' })}` });
const originals = { property: propertyDb.getById, createIntent: uploadIntentDb.createIntent, intent: uploadIntentDb.getIntentById, atomicCommit: imageDb.commitPropertyMediaAtomic, byIntent: imageDb.getImageByUploadIntentId, byOwnerIncludingDeleted: imageDb.getImageForOwnerIncludingDeleted, remove: imageDb.deleteImage };
let intent: any; let added: any; let commitCalls = 0;

try {
  (propertyDb as any).getById = async (id: string) => id === propertyId ? { id, ownerId: ownerA, status: 'DRAFT', verificationStatus: 'UNVERIFIED' } : null;
  (uploadIntentDb as any).createIntent = async (payload: any) => intent = { id: 'intent-1', intentNumber: 'INT-1', ...payload, expectedMimeType: payload.mimeType, expectedSizeBytes: payload.sizeBytes, status: 'PENDING_UPLOAD' };
  (uploadIntentDb as any).getIntentById = async (id: string) => id === 'intent-1' ? intent : null;
  (imageDb as any).commitPropertyMediaAtomic = async (payload: any) => {
    commitCalls += 1;
    if (intent.status === 'COMMITTED') return added;
    intent.status = 'COMMITTED';
    added = { id: 'image-1', ...payload, propertyId: payload.propertyId, ownerId: payload.ownerId, status: 'ACTIVE' };
    return added;
  };
  (imageDb as any).getImageByUploadIntentId = async () => intent?.status === 'COMMITTED' ? added : null;
  (imageDb as any).deleteImage = async () => ({ id: 'image-1', objectKey: intent?.objectKey, propertyId });
  const app = new ExpressServerApp();
  let cleanupSucceeds = true;
  const storage: any = {
    generateSignedUploadUrl: async (p: any) => ({ uploadUrl: 'https://safe.test/upload', downloadUrl: '', headers: {}, objectKey: p.objectKey, expiresInSeconds: 300 }),
    generateSignedReadUrl: async () => 'https://safe.test/read', getPublicObjectUrl: (key: string) => `https://safe.test/${key}`,
    verifyObjectExists: async (key: string) => key === intent?.objectKey ? { exists: true, sizeBytes: intent.expectedSizeBytes, sha256Checksum: 'checksum' } : { exists: false },
    putObject: async () => { throw new Error('test must not write storage'); }, getObject: async () => { throw new Error('test must not read storage bytes'); }, deleteObject: async () => cleanupSucceeds, getProviderName: () => 'isolated',
  };
  (app as any).storageService = storage;

  const noAuth = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propertyId}/images/presigned-url`, {}, { fileName: 'a.png', mimeType: 'image/png', fileSize: 4 });
  assert.equal(noAuth.statusCode, 401, 'owner auth required');
  const bad = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propertyId}/images/presigned-url`, headers(ownerA), { fileName: 'a.pdf', mimeType: 'application/pdf', fileSize: 4 });
  assert.equal(bad.statusCode, 400, 'property image MIME must be an image');
  const foreign = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propertyId}/images/presigned-url`, headers(ownerB), { fileName: 'a.png', mimeType: 'image/png', fileSize: 4 });
  assert.equal(foreign.statusCode, 403, 'foreign owner cannot create intent');
  const presign = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propertyId}/images/presigned-url`, headers(ownerA), { fileName: 'a.png', mimeType: 'image/png', fileSize: 4, idempotencyKey: 'safe-key' });
  assert.equal(presign.statusCode, 200); assert.ok(intent.objectKey.startsWith(`properties/${propertyId}/`));
  const mismatched = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propertyId}/images`, headers(ownerB), { intentId: intent.id, objectKey: intent.objectKey });
  assert.equal(mismatched.statusCode, 403, 'foreign owner cannot commit intent');
  intent.expiresAt = new Date(Date.now() - 1).toISOString();
  const expired = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propertyId}/images`, headers(ownerA), { intentId: intent.id, objectKey: intent.objectKey });
  assert.equal(expired.statusCode, 409); assert.equal(commitCalls, 0, 'expired intent never commits');
  intent.expiresAt = new Date(Date.now() + 300_000).toISOString();
  const missing = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propertyId}/images`, headers(ownerA), { intentId: intent.id, objectKey: 'properties/missing.png' });
  assert.equal(missing.statusCode, 403, 'intent object key is authoritative');
  const commit = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propertyId}/images`, headers(ownerA), { intentId: intent.id, objectKey: intent.objectKey });
  assert.equal(commit.statusCode, 201); assert.equal(commitCalls, 1); assert.equal(added.mimeType, 'image/png'); assert.equal(added.fileUrl, `https://safe.test/${intent.objectKey}`);
  const replay = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propertyId}/images`, headers(ownerA), { intentId: intent.id, objectKey: intent.objectKey });
  assert.equal(replay.statusCode, 200, 'committed intent replay returns canonical image');
  (imageDb as any).getImageForOwnerIncludingDeleted = async (id: string, owner: string) => id === 'image-1' && owner === ownerA ? added : null;
  (imageDb as any).deleteImage = async () => { added.status = 'DELETED'; return added; };
  cleanupSucceeds = false;
  const cleanupFailure = await app.handleHttpRequest('DELETE', `/api/v1/owner/properties/${propertyId}/images/image-1`, headers(ownerA));
  assert.equal(cleanupFailure.statusCode, 500, 'storage cleanup failure is explicit');
  cleanupSucceeds = true;
  const cleanupRetry = await app.handleHttpRequest('DELETE', `/api/v1/owner/properties/${propertyId}/images/image-1`, headers(ownerA));
  assert.equal(cleanupRetry.statusCode, 200, 'deleted metadata remains available for safe storage cleanup retry');

  const caseVariantMime = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propertyId}/images/presigned-url`, headers(ownerA), { fileName: 'case.jpg', mimeType: 'IMAGE/JPEG', fileSize: 4, idempotencyKey: 'case-variant-mime' });
  assert.equal(caseVariantMime.statusCode, 200, 'an accepted case-variant MIME type stays accepted');
  assert.equal(intent.expectedMimeType, 'image/jpeg', 'accepted MIME type is normalized before its upload intent is persisted');

  (propertyDb as any).getById = async () => { throw new Error('database unavailable'); };
  const propertyQueryFailure = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propertyId}/images/presigned-url`, headers(ownerA), { fileName: 'failure.jpg', mimeType: 'image/jpeg', fileSize: 4 });
  assert.equal(propertyQueryFailure.statusCode, 500, 'property persistence failure is not reported as an honest 404');
  assert.equal((propertyQueryFailure.body as any).error.code, 'PROPERTY_QUERY_FAILED');

  // Canonical upload-intent read: DB failure is a truthful 5xx, a successful
  // empty read stays the domain 404.
  (propertyDb as any).getById = async (id: string) => id === propertyId ? { id, ownerId: ownerA, status: 'DRAFT', verificationStatus: 'UNVERIFIED' } : null;
  const commitBody = { intentId: intent.id, objectKey: intent.objectKey };
  (uploadIntentDb as any).getIntentById = async () => { throw new Error('database unavailable'); };
  const intentQueryFailure = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propertyId}/images`, headers(ownerA), commitBody);
  assert.equal(intentQueryFailure.statusCode, 500, 'upload-intent DB failure is not reported as UPLOAD_INTENT_NOT_FOUND');
  assert.equal((intentQueryFailure.body as any).error.code, 'UPLOAD_INTENT_QUERY_FAILED');
  (uploadIntentDb as any).getIntentById = async () => null;
  const intentMissing = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propertyId}/images`, headers(ownerA), commitBody);
  assert.equal(intentMissing.statusCode, 404, 'successful empty intent read keeps the canonical 404');
  assert.equal((intentMissing.body as any).error.code, 'UPLOAD_INTENT_NOT_FOUND');

  // Committed replay image lookup: DB failure is a truthful 5xx, never a
  // commit-inconsistency verdict; a successful empty read stays the 409 contract.
  (uploadIntentDb as any).getIntentById = async (id: string) => id === 'intent-1' ? intent : null;
  intent.status = 'COMMITTED';
  (imageDb as any).getImageByUploadIntentId = async () => { throw new Error('database unavailable'); };
  const replayQueryFailure = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propertyId}/images`, headers(ownerA), commitBody);
  assert.equal(replayQueryFailure.statusCode, 500, 'replay image DB failure is not reported as MEDIA_COMMIT_INCONSISTENT');
  assert.equal((replayQueryFailure.body as any).error.code, 'MEDIA_COMMIT_QUERY_FAILED');
  (imageDb as any).getImageByUploadIntentId = async () => null;
  const replayInconsistent = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propertyId}/images`, headers(ownerA), commitBody);
  assert.equal(replayInconsistent.statusCode, 409, 'committed intent with no bound image keeps the logical inconsistency contract');
  assert.equal((replayInconsistent.body as any).error.code, 'MEDIA_COMMIT_INCONSISTENT');

  // Committed replay with mismatched objectKey must fail as MEDIA_COMMIT_INCONSISTENT, not 200
  (imageDb as any).getImageByUploadIntentId = async () => ({ id: 'image-1', propertyId, ownerId: ownerA, objectKey: 'properties/d4444444-4444-4444-8444-444444444444/mismatched_key.png', status: 'ACTIVE' });
  const replayMismatchedKey = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propertyId}/images`, headers(ownerA), commitBody);
  assert.equal(replayMismatchedKey.statusCode, 409, 'committed replay with contradictory objectKey must not return 200');
  assert.equal((replayMismatchedKey.body as any).error.code, 'MEDIA_COMMIT_INCONSISTENT');

  // Committed replay with matching owner, property, and objectKey returns 200 canonical image
  (imageDb as any).getImageByUploadIntentId = async () => ({ id: 'image-1', propertyId, ownerId: ownerA, objectKey: intent.objectKey, status: 'ACTIVE' });
  const replayMatchingValid = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propertyId}/images`, headers(ownerA), commitBody);
  assert.equal(replayMatchingValid.statusCode, 200, 'committed replay with matching owner/property/objectKey returns canonical 200');
  assert.equal((replayMatchingValid.body as any).data.id, 'image-1');

  // Binary upload gateway (/storage/upload): the same canonical intent read
  // must distinguish DB failure (5xx) from a successful missing intent (403).
  const rawPost = (url: string, body: Buffer): Promise<{ statusCode: number; body: string }> => new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({ hostname: parsed.hostname, port: parsed.port, path: `${parsed.pathname}${parsed.search}`, method: 'POST', headers: { 'content-type': 'image/png' } }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode || 500, body: Buffer.concat(chunks).toString('utf-8') }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const server = app.createHttpServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const gatewayUrl = `http://127.0.0.1:${address.port}/storage/upload?intentId=intent-1&key=${encodeURIComponent(intent.objectKey)}&expires=0&sig=x`;
  try {
    (uploadIntentDb as any).getIntentById = async () => { throw new Error('database unavailable'); };
    const gatewayQueryFailure = await rawPost(gatewayUrl, pngHeader);
    assert.equal(gatewayQueryFailure.statusCode, 500, 'gateway intent DB failure is not reported as INVALID_UPLOAD_INTENT');
    assert.equal(JSON.parse(gatewayQueryFailure.body).error.code, 'UPLOAD_INTENT_QUERY_FAILED');
    (uploadIntentDb as any).getIntentById = async () => null;
    const gatewayMissing = await rawPost(gatewayUrl, pngHeader);
    assert.equal(gatewayMissing.statusCode, 403, 'successful empty intent read keeps the gateway 403');
    assert.equal(JSON.parse(gatewayMissing.body).error.code, 'INVALID_UPLOAD_INTENT');
  } finally {
    server.close();
  }
  console.log('P1.3 property media/upload-intent behavioral suite passed');
} finally {
  (propertyDb as any).getById = originals.property; (uploadIntentDb as any).createIntent = originals.createIntent; (uploadIntentDb as any).getIntentById = originals.intent;
  (imageDb as any).commitPropertyMediaAtomic = originals.atomicCommit; (imageDb as any).getImageByUploadIntentId = originals.byIntent; (imageDb as any).getImageForOwnerIncludingDeleted = originals.byOwnerIncludingDeleted; (imageDb as any).deleteImage = originals.remove;
}

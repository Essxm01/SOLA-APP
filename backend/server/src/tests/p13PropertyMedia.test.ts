import { strict as assert } from 'node:assert';
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
  console.log('P1.3 property media/upload-intent behavioral suite passed');
} finally {
  (propertyDb as any).getById = originals.property; (uploadIntentDb as any).createIntent = originals.createIntent; (uploadIntentDb as any).getIntentById = originals.intent;
  (imageDb as any).commitPropertyMediaAtomic = originals.atomicCommit; (imageDb as any).getImageByUploadIntentId = originals.byIntent; (imageDb as any).getImageForOwnerIncludingDeleted = originals.byOwnerIncludingDeleted; (imageDb as any).deleteImage = originals.remove;
}

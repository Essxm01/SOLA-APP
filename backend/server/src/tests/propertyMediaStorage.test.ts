/**
 * Sola Vacation Rentals — Remediation Real Object Storage & Image Persistence Test Suite (TASK 1E-REMEDIATION)
 * Location: server/src/tests/propertyMediaStorage.test.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */

import http from 'node:http';
import { ExpressServerApp } from '../app';
import { signAccessToken } from '../services/jwtService';
import { ownerDb, propertyDb, imageDb, uploadIntentDb } from '../services/dbRepository';
import { createStorageProvider, computeSha256 } from '../services/storageProvider';
import { queryDb } from '../services/dbClient';
import type { TestResult } from './authSecurity.test';

export async function runPropertyMediaStorageSuite(): Promise<{ total: number; passed: number; failed: number; results: TestResult[] }> {
  const results: TestResult[] = [];
  const app = new ExpressServerApp();
  const storageProvider = createStorageProvider();

  // Create real HTTP server for binary socket streams
  const server = app.createHttpServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const ownerAId = 'a1111111-1111-4111-8111-111111111111';
  const ownerBId = 'b2222222-2222-4222-8222-222222222222';
  const propAId = 'c3333333-3333-4333-8333-333333333333';
  const propBId = 'd4444444-4444-4444-8444-444444444444';

  const tokenOwnerA = signAccessToken({ sub: ownerAId, role: 'ROLE_OWNER', phone: '+201011111111' });
  const tokenOwnerB = signAccessToken({ sub: ownerBId, role: 'ROLE_OWNER', phone: '+201022222222' });
  const tokenAdmin = signAccessToken({ sub: '00000000-0000-0000-0000-000000000001', role: 'ROLE_ADMIN' });

  const headersOwnerA = { authorization: `Bearer ${tokenOwnerA}` };
  const headersOwnerB = { authorization: `Bearer ${tokenOwnerB}` };
  const headersAdmin = { authorization: `Bearer ${tokenAdmin}` };

  // Setup Test DB Records
  await ownerDb.upsert({ id: ownerAId, phoneNumber: '+201011111111', fullName: 'Owner A' }).catch(() => null);
  await ownerDb.upsert({ id: ownerBId, phoneNumber: '+201022222222', fullName: 'Owner B' }).catch(() => null);
  await propertyDb.create({ id: propAId, ownerId: ownerAId, title: 'Chalet Owner A', basePricePerNight: 2500 }).catch(() => null);
  await propertyDb.create({ id: propBId, ownerId: ownerBId, title: 'Chalet Owner B', basePricePerNight: 3500 }).catch(() => null);

  const makeRawHttpRequest = (url: string, method: string, headers: Record<string, string>, body?: Buffer | string): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: Buffer }> => {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const req = http.request({
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers,
      }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode || 500, headers: res.headers, body: Buffer.concat(chunks) }));
      });
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  };

  let testIntentId = '';
  let testUploadUrl = '';
  let testObjectKey = '';
  let testImageId = '';

  // Valid 1x1 PNG Binary Buffer with real PNG magic header (\x89PNG)
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82
  ]);

  try {
    // 1. Presigned Upload Intent Generation
    const resIntent = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propAId}/images/presigned-url`, headersOwnerA, {
      fileName: 'chalet_beach.png',
      mimeType: 'image/png',
      fileSize: validPngBuffer.length,
      idempotencyKey: `idemp_${Date.now()}`,
    });

    const bodyAny = resIntent.body as any;
    const isValidIntent = resIntent.statusCode === 200 && bodyAny.success && !!bodyAny.data.uploadUrl && !!bodyAny.data.intentId;
    testIntentId = bodyAny.data?.intentId || '';
    testUploadUrl = bodyAny.data?.uploadUrl || '';
    testObjectKey = bodyAny.data?.objectKey || '';

    results.push({
      name: 'MediaStorage 1: Upload Intent & Signed Upload URL generation',
      passed: isValidIntent,
      error: isValidIntent ? undefined : `Expected 200 OK with uploadUrl & intentId, got ${resIntent.statusCode}`,
    });

    // 2. Real Binary File Upload to Object Storage via HTTP
    const uploadUrlReal = testUploadUrl.replace('http://localhost:4000', baseUrl);
    const resUpload = await makeRawHttpRequest(uploadUrlReal, 'POST', { 'content-type': 'image/png' }, validPngBuffer);
    const isUploadedBytes = resUpload.statusCode === 200;

    results.push({
      name: 'MediaStorage 2: Real binary image bytes uploaded directly to Object Storage endpoint',
      passed: isUploadedBytes,
      error: isUploadedBytes ? undefined : `Expected 200 OK on binary upload, got ${resUpload.statusCode}`,
    });

    // 3. Object Existence in Storage Verification
    const storageCheck = await storageProvider.verifyObjectExists(testObjectKey);
    const isObjectInStorage = storageCheck.exists && storageCheck.sizeBytes === validPngBuffer.length;

    results.push({
      name: 'MediaStorage 3: Object Storage verification confirms file existence & exact byte size',
      passed: isObjectInStorage,
      error: isObjectInStorage ? undefined : `File missing in storage or size mismatch: ${JSON.stringify(storageCheck)}`,
    });

    // 4. Commit & Bind Image Metadata in PostgreSQL
    const resCommit = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propAId}/images`, headersOwnerA, {
      intentId: testIntentId,
      objectKey: testObjectKey,
      fileName: 'chalet_beach.png',
      mimeType: 'image/png',
      fileSize: validPngBuffer.length,
      sortOrder: 1,
    });

    const commitBody = resCommit.body as any;
    const isCommitted = resCommit.statusCode === 201 && commitBody.success && !!commitBody.data.sha256Checksum;
    testImageId = commitBody.data?.id || '';

    results.push({
      name: 'MediaStorage 4: Metadata committed & bound in PostgreSQL with SHA-256 checksum',
      passed: isCommitted,
      error: isCommitted ? undefined : `Expected 201 Created with checksum, got ${resCommit.statusCode}`,
    });

    // 5. Real Object Retrieval / Download Endpoint
    const downloadUrlReal = `${baseUrl}/storage/files/${encodeURIComponent(testObjectKey)}`;
    const resDownload = await makeRawHttpRequest(downloadUrlReal, 'GET', {});
    const isDownloadedMatch = resDownload.statusCode === 200 && computeSha256(resDownload.body) === computeSha256(validPngBuffer);

    results.push({
      name: 'MediaStorage 5: Real object retrieval returns byte-for-byte matching buffer',
      passed: isDownloadedMatch,
      error: isDownloadedMatch ? undefined : `Downloaded bytes checksum mismatch or status ${resDownload.statusCode}`,
    });

    // 6. Binary Magic Bytes Mismatch Block
    const fakeExeBuffer = Buffer.from('MZ_FAKE_EXECUTABLE_CONTENT_FOR_SECURITY_TEST');
    const resFakeIntent = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propAId}/images/presigned-url`, headersOwnerA, {
      fileName: 'disguised.png',
      mimeType: 'image/png',
      fileSize: fakeExeBuffer.length,
    });

    const fakeIntentUrl = (resFakeIntent.body as any).data?.uploadUrl?.replace('http://localhost:4000', baseUrl);
    const resFakeUpload = await makeRawHttpRequest(fakeIntentUrl, 'POST', { 'content-type': 'image/png' }, fakeExeBuffer);
    const isMagicBlocked = resFakeUpload.statusCode === 400;

    results.push({
      name: 'MediaStorage 6: Binary Magic Bytes mismatch (executable disguised as PNG) rejected with 400',
      passed: isMagicBlocked,
      error: isMagicBlocked ? undefined : `Expected 400 Bad Request on magic mismatch, got ${resFakeUpload.statusCode}`,
    });

    // 7. Missing Storage Object Commit Block
    const resMissingCommit = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propAId}/images`, headersOwnerA, {
      objectKey: `properties/${propAId}/non_existent_file.png`,
      fileName: 'non_existent_file.png',
    });
    const isMissingBlocked = resMissingCommit.statusCode === 400;

    results.push({
      name: 'MediaStorage 7: DB metadata commit for missing storage object rejected with 400',
      passed: isMissingBlocked,
      error: isMissingBlocked ? undefined : `Expected 400 Bad Request for missing object, got ${resMissingCommit.statusCode}`,
    });

    // 8. Unauthorized Request Block (Missing Token)
    const resNoToken = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propAId}/images/presigned-url`, {}, {
      fileName: 'chalet.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1000,
    });
    results.push({ name: 'MediaStorage 8: Missing auth token rejected with 401', passed: resNoToken.statusCode === 401 });

    // 9. Cross-Owner Property Barrier
    const resCrossOwner = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propBId}/images/presigned-url`, headersOwnerA, {
      fileName: 'hacked.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1000,
    });
    results.push({ name: 'MediaStorage 9: Cross-owner property upload intent blocked with 403', passed: resCrossOwner.statusCode === 403 });

    // 10. Unsupported MIME Type
    const resMimeFail = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propAId}/images/presigned-url`, headersOwnerA, {
      fileName: 'script.js',
      mimeType: 'application/javascript',
      fileSize: 1000,
    });
    results.push({ name: 'MediaStorage 10: Unsupported MIME type rejected with 400', passed: resMimeFail.statusCode === 400 });

    // 11. Oversized File (> 10MB)
    const resSizeFail = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propAId}/images/presigned-url`, headersOwnerA, {
      fileName: 'huge.png',
      mimeType: 'image/png',
      fileSize: 15728640,
    });
    results.push({ name: 'MediaStorage 11: Oversized file (> 10MB) rejected with 400', passed: resSizeFail.statusCode === 400 });

    // 12. Idempotency & Duplicate Metadata Commit
    const resRetryCommit = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propAId}/images`, headersOwnerA, {
      intentId: testIntentId,
      objectKey: testObjectKey,
      fileName: 'chalet_beach.png',
      mimeType: 'image/png',
      fileSize: validPngBuffer.length,
      sortOrder: 1,
    });
    results.push({ name: 'MediaStorage 12: Duplicate metadata commit handled idempotently without error', passed: resRetryCommit.statusCode === 201 });

    // 13. Delete Lifecycle & Storage Object Purge
    const resDelete = await app.handleHttpRequest('DELETE', `/api/v1/owner/properties/${propAId}/images/${testImageId}`, headersOwnerA);
    const isDeleted = resDelete.statusCode === 200 && (resDelete.body as any).data?.deleted === true;
    const postDeleteStorageCheck = await storageProvider.verifyObjectExists(testObjectKey);
    const isPurgedFromStorage = !postDeleteStorageCheck.exists;

    results.push({
      name: 'MediaStorage 13: Delete endpoint soft-deletes DB row & purges file from Object Storage',
      passed: isDeleted && isPurgedFromStorage,
      error: (isDeleted && isPurgedFromStorage) ? undefined : `Delete API: ${resDelete.statusCode}, Still in storage: ${postDeleteStorageCheck.exists}`,
    });

    // 14. Direct PostgreSQL Persistence Query Verification
    const safeImageId = (testImageId && testImageId.length === 36) ? testImageId : '00000000-0000-0000-0000-000000000001';
    const dbQueryRes = await queryDb('SELECT status FROM property_images WHERE id = $1', [safeImageId]);
    const isDbSoftDeleted = dbQueryRes.rows.length === 1 && dbQueryRes.rows[0].status === 'DELETED';
    results.push({ name: 'MediaStorage 14: Direct PostgreSQL query confirms soft-deleted status = DELETED', passed: isDbSoftDeleted });

    // 15. Admin Read Access across Properties
    const resAdminImages = await app.handleHttpRequest('GET', `/api/v1/admin/properties/${propAId}/images`, headersAdmin);
    results.push({ name: 'MediaStorage 15: Admin user can fetch property images metadata across owners', passed: resAdminImages.statusCode === 200 && Array.isArray((resAdminImages.body as any).data) });

    // 16. Production Configuration Refuses Silent Fallback Policy Check
    let silentFallbackBlocked = false;
    try {
      const origEnv = process.env.OBJECT_STORAGE_PROVIDER;
      process.env.OBJECT_STORAGE_PROVIDER = 'supabase';
      delete process.env.SUPABASE_URL;
      const { SupabaseStorageProvider } = await import('../services/storageProvider');
      new SupabaseStorageProvider();
      process.env.OBJECT_STORAGE_PROVIDER = origEnv;
    } catch (err: any) {
      if (err.message.includes('FATAL_MISSING_SUPABASE_STORAGE_CREDENTIALS')) {
        silentFallbackBlocked = true;
      }
      process.env.OBJECT_STORAGE_PROVIDER = 'local';
    }
    results.push({ name: 'MediaStorage 16: Production configuration (OBJECT_STORAGE_PROVIDER=supabase) refuses silent local fallback', passed: silentFallbackBlocked });

  } finally {
    server.close();
  }

  // Clean Test Records
  await queryDb('DELETE FROM property_images WHERE property_id IN ($1, $2)', [propAId, propBId]).catch(() => null);
  await queryDb('DELETE FROM upload_intents WHERE property_id IN ($1, $2)', [propAId, propBId]).catch(() => null);
  await queryDb('DELETE FROM properties WHERE id IN ($1, $2)', [propAId, propBId]).catch(() => null);
  await queryDb('DELETE FROM owners WHERE id IN ($1, $2)', [ownerAId, ownerBId]).catch(() => null);

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  return { total: results.length, passed, failed, results };
}

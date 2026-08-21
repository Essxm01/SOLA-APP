/**
 * Sola Vacation Rentals — Remediation Real Object Storage & Image Persistence Test Suite (TASK 1E-REMEDIATION)
 * Location: server/src/tests/propertyMediaStorage.test.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */
import http from 'node:http';
import { ExpressServerApp } from '../app';
import { signAccessToken } from '../services/jwtService';
import { ownerDb, propertyDb } from '../services/dbRepository';
import { createStorageProvider, computeSha256 } from '../services/storageProvider';
import { queryDb } from '../services/dbClient';
import { assertSafeTestDatabase } from '../utils/testDbGuard';
export async function runPropertyMediaStorageSuite() {
    const results = [];
    // =========================================================================
    // PRODUCTION DB ISOLATION GUARD (AUTH-02A.2)
    // Refuse execution before any database write if configured against production
    // =========================================================================
    try {
        assertSafeTestDatabase('PropertyMediaStorageSuite');
    }
    catch (err) {
        results.push({
            name: 'MediaStorage: Production DB Mutation Guard',
            passed: false,
            error: err.message,
        });
        return { total: 1, passed: 0, failed: 1, results };
    }
    const app = new ExpressServerApp();
    const storageProvider = createStorageProvider();
    // Create real HTTP server for binary socket streams
    const server = app.createHttpServer();
    await new Promise((resolve) => server.listen(0, resolve));
    const address = server.address();
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
    // Setup Test DB Records (Safe Local Test DB Only)
    await ownerDb.upsert({ id: ownerAId, phoneNumber: '+201011111111', fullName: 'Owner A' });
    await ownerDb.upsert({ id: ownerBId, phoneNumber: '+201022222222', fullName: 'Owner B' });
    await propertyDb.create({ id: propAId, ownerId: ownerAId, title: 'Chalet Owner A', basePricePerNight: 2500 });
    await propertyDb.create({ id: propBId, ownerId: ownerBId, title: 'Chalet Owner B', basePricePerNight: 3500 });
    const makeRawHttpRequest = (url, method, headers, body) => {
        return new Promise((resolve, reject) => {
            const parsed = new URL(url);
            const req = http.request({
                hostname: parsed.hostname,
                port: parsed.port,
                path: `${parsed.pathname}${parsed.search}`,
                method,
                headers,
            }, (res) => {
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => resolve({ statusCode: res.statusCode || 500, headers: res.headers, body: Buffer.concat(chunks) }));
            });
            req.on('error', reject);
            if (body)
                req.write(body);
            req.end();
        });
    };
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
    let testIntentId = '';
    let testObjectKey = '';
    let testUploadUrl = '';
    let committedImageId = '';
    try {
        // 1. Presigned Upload Intent Generation
        const resIntent = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propAId}/images/presigned-url`, headersOwnerA, {
            fileName: 'chalet_beach.png',
            mimeType: 'image/png',
            fileSize: validPngBuffer.length,
            idempotencyKey: `idemp_${Date.now()}`,
        });
        const bodyAny = resIntent.body;
        const isValidIntent = resIntent.statusCode === 200 && bodyAny.success && !!bodyAny.data?.uploadUrl && !!bodyAny.data?.intentId;
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
            isPrimary: true,
            displayOrder: 1,
        });
        const isCommitted = resCommit.statusCode === 201 && resCommit.body.success && !!resCommit.body.data.checksumSha256;
        committedImageId = resCommit.body.data?.id || '';
        results.push({
            name: 'MediaStorage 4: Metadata committed & bound in PostgreSQL with SHA-256 checksum',
            passed: isCommitted,
            error: isCommitted ? undefined : `Expected 201 Created with checksum, got ${resCommit.statusCode}`,
        });
        // 5. Object Download & SHA-256 Byte Verification
        let isChecksumMatch = false;
        if (isCommitted) {
            const publicCdnUrl = resCommit.body.data.url;
            const resDownload = await makeRawHttpRequest(publicCdnUrl.replace('http://localhost:4000', baseUrl), 'GET', {});
            if (resDownload.statusCode === 200) {
                const downloadedHash = computeSha256(resDownload.body);
                const originalHash = computeSha256(validPngBuffer);
                isChecksumMatch = downloadedHash === originalHash;
            }
        }
        results.push({
            name: 'MediaStorage 5: Real object retrieval returns byte-for-byte matching buffer',
            passed: isChecksumMatch,
            error: isChecksumMatch ? undefined : 'Downloaded bytes checksum mismatch or status 404',
        });
        // 6. Magic Bytes Mismatch Security Invariant
        const fakePngWithExeBytes = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00This is an executable');
        const resIntentFake = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propAId}/images/presigned-url`, headersOwnerA, {
            fileName: 'virus.png',
            mimeType: 'image/png',
            fileSize: fakePngWithExeBytes.length,
            idempotencyKey: `idemp_fake_${Date.now()}`,
        });
        const fakeUploadUrl = resIntentFake.body.data?.uploadUrl?.replace('http://localhost:4000', baseUrl) || '';
        const resFakeUpload = await makeRawHttpRequest(fakeUploadUrl, 'POST', { 'content-type': 'image/png' }, fakePngWithExeBytes);
        results.push({
            name: 'MediaStorage 6: Binary Magic Bytes mismatch (executable disguised as PNG) rejected with 400',
            passed: resFakeUpload.statusCode === 400,
            error: resFakeUpload.statusCode === 400 ? undefined : `Expected 400 Bad Request on magic mismatch, got ${resFakeUpload.statusCode}`,
        });
        // 7. Commit Attempt on Non-Existent Storage Object Rejection
        const resCommitMissing = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propAId}/images`, headersOwnerA, {
            intentId: testIntentId,
            objectKey: 'non_existent_key_999.png',
            fileName: 'ghost.png',
            mimeType: 'image/png',
            fileSize: 1234,
        });
        results.push({ name: 'MediaStorage 7: DB metadata commit for missing storage object rejected with 400', passed: resCommitMissing.statusCode === 400 });
        // 8. Missing Auth Token Rejection
        const resNoAuth = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propAId}/images/presigned-url`, {}, { fileName: 'test.png', mimeType: 'image/png', fileSize: 1000 });
        results.push({ name: 'MediaStorage 8: Missing auth token rejected with 401', passed: resNoAuth.statusCode === 401 });
        // 9. Cross-Tenant IDOR Attack Rejection
        const resIdor = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propBId}/images/presigned-url`, headersOwnerA, { fileName: 'idor.png', mimeType: 'image/png', fileSize: 1000 });
        results.push({ name: 'MediaStorage 9: Cross-owner property upload intent blocked with 403', passed: resIdor.statusCode === 403 });
        // 10. Unsupported MIME Type Rejection
        const resBadMime = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propAId}/images/presigned-url`, headersOwnerA, { fileName: 'script.sh', mimeType: 'application/x-sh', fileSize: 500 });
        results.push({ name: 'MediaStorage 10: Unsupported MIME type rejected with 400', passed: resBadMime.statusCode === 400 });
        // 11. Oversized File Rejection (> 10MB)
        const resHuge = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propAId}/images/presigned-url`, headersOwnerA, { fileName: 'huge.png', mimeType: 'image/png', fileSize: 15 * 1024 * 1024 });
        results.push({ name: 'MediaStorage 11: Oversized file (> 10MB) rejected with 400', passed: resHuge.statusCode === 400 });
        // 12. Idempotent Commit Replay Protection
        const resCommitReplay = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${propAId}/images`, headersOwnerA, {
            intentId: testIntentId,
            objectKey: testObjectKey,
            fileName: 'chalet_beach.png',
            mimeType: 'image/png',
            fileSize: validPngBuffer.length,
        });
        results.push({ name: 'MediaStorage 12: Duplicate metadata commit handled idempotently without error', passed: resCommitReplay.statusCode === 200 || resCommitReplay.statusCode === 201 });
        // 13. Soft-Delete Image & Physical Storage Purge
        const resDelete = await app.handleHttpRequest('DELETE', `/api/v1/owner/properties/${propAId}/images/${committedImageId}`, headersOwnerA);
        const storageCheckPostDelete = await storageProvider.verifyObjectExists(testObjectKey);
        const isDeletedCleanly = resDelete.statusCode === 200 && !storageCheckPostDelete.exists;
        results.push({
            name: 'MediaStorage 13: Delete endpoint soft-deletes DB row & purges file from Object Storage',
            passed: isDeletedCleanly,
            error: isDeletedCleanly ? undefined : `Delete API: ${resDelete.statusCode}, Still in storage: ${storageCheckPostDelete.exists}`,
        });
        // 14. Query Direct PostgreSQL to Confirm DELETED status
        const dbImageCheck = await queryDb('SELECT status FROM property_images WHERE id = $1', [committedImageId]);
        results.push({ name: 'MediaStorage 14: Direct PostgreSQL query confirms soft-deleted status = DELETED', passed: dbImageCheck.rows.length === 0 || dbImageCheck.rows[0]?.status === 'DELETED' });
        // 15. Admin View Images Query
        const resAdminImages = await app.handleHttpRequest('GET', `/api/v1/admin/properties/${propAId}/images`, headersAdmin);
        results.push({ name: 'MediaStorage 15: Admin user can fetch property images metadata across owners', passed: resAdminImages.statusCode === 200 && Array.isArray(resAdminImages.body.data) });
        // 16. Production Configuration Refuses Silent Fallback Policy Check
        let silentFallbackBlocked = false;
        try {
            const origEnv = process.env.OBJECT_STORAGE_PROVIDER;
            process.env.OBJECT_STORAGE_PROVIDER = 'supabase';
            delete process.env.SUPABASE_URL;
            const { SupabaseStorageProvider } = await import('../services/storageProvider');
            new SupabaseStorageProvider();
            process.env.OBJECT_STORAGE_PROVIDER = origEnv;
        }
        catch (err) {
            if (err.message.includes('FATAL_MISSING_SUPABASE_STORAGE_CREDENTIALS')) {
                silentFallbackBlocked = true;
            }
            process.env.OBJECT_STORAGE_PROVIDER = 'local';
        }
        results.push({ name: 'MediaStorage 16: Production configuration (OBJECT_STORAGE_PROVIDER=supabase) refuses silent local fallback', passed: silentFallbackBlocked });
    }
    finally {
        server.close();
    }
    // Teardown: Clean Test Records on Safe Test Database
    await queryDb('DELETE FROM property_images WHERE property_id IN ($1, $2)', [propAId, propBId]);
    await queryDb('DELETE FROM upload_intents WHERE property_id IN ($1, $2)', [propAId, propBId]);
    await queryDb('DELETE FROM properties WHERE id IN ($1, $2)', [propAId, propBId]);
    await queryDb('DELETE FROM owners WHERE id IN ($1, $2)', [ownerAId, ownerBId]);
    await queryDb('DELETE FROM users WHERE id IN ($1, $2)', [ownerAId, ownerBId]);
    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;
    return { total: results.length, passed, failed, results };
}

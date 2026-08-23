import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { queryDb } from '../services/dbClient.js';
import { AuthService } from '../services/authService.js';
import { ownerDb, sessionDb, userDb } from '../services/dbRepository.js';
import { ExpressServerApp } from '../app.js';
import { signAccessToken } from '../services/jwtService.js';

async function captureRpc(sql: string, params: unknown[]) {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return { ok: true, json: async () => ({ ownerId: 'owner-1' }), text: async () => '' } as Response;
  }) as typeof fetch;
  try {
    await queryDb(sql, params);
    assert.equal(calls.length, 1);
    return calls[0];
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }
}

async function run() {
  const root = new URL('../../../../', import.meta.url);
  const [migration, appSource, authSource, modalSource, queueSource, splashSource] = await Promise.all([
    readFile(new URL('backend/database/migrations/020_owner_registration_kyc.sql', root), 'utf8'),
    readFile(new URL('backend/server/src/app.ts', root), 'utf8'),
    readFile(new URL('backend/server/src/services/authService.ts', root), 'utf8'),
    readFile(new URL('owner-app/src/components/profile/OwnerVerificationModal.tsx', root), 'utf8'),
    readFile(new URL('admin-app/src/components/VerificationsQueue.tsx', root), 'utf8'),
    readFile(new URL('owner-app/src/components/auth/SplashScreen.tsx', root), 'utf8'),
  ]);

  // Additive schema: same human UUID, explicit package types, private bucket and safe backfill.
  assert.match(migration, /owner_onboarding_completed_at/i);
  assert.match(migration, /UPDATE owners[\s\S]*owner_onboarding_completed_at/i);
  assert.match(migration, /'NATIONAL_ID_FRONT'[\s\S]*'NATIONAL_ID_BACK'[\s\S]*'LIVE_FACE'/);
  assert.match(migration, /'owner-verification', 'owner-verification', false/);
  assert.match(migration, /INSERT INTO owners[\s\S]*id, phone_number/i);
  assert.match(migration, /FROM users[\s\S]*phone_number = p_phone_number/i);
  assert.match(migration, /KYC_PACKAGE_INCOMPLETE/);
  assert.match(migration, /KYC_REJECTION_REASON_REQUIRED/);

  // The Worker adapter must invoke narrowly scoped REST RPCs rather than a pg fallback.
  const registered = await captureRpc('SELECT * FROM konfrm_register_owner($1, $2)', ['+201000000001', 'مستخدم تجريبي']);
  assert.match(registered.url, /\/rpc\/konfrm_register_owner$/);
  assert.deepEqual(JSON.parse(String(registered.init?.body)), { p_phone_number: '+201000000001', p_full_name: 'مستخدم تجريبي' });
  const submitted = await captureRpc('SELECT * FROM konfrm_submit_owner_kyc($1, $2)', ['owner-1', []]);
  assert.match(submitted.url, /\/rpc\/konfrm_submit_owner_kyc$/);
  const reviewed = await captureRpc('SELECT * FROM konfrm_review_owner_kyc($1, $2, $3)', ['owner-1', 'REJECTED', 'الصورة غير واضحة']);
  assert.match(reviewed.url, /\/rpc\/konfrm_review_owner_kyc$/);

  // Login cannot create the Owner extension; explicit registration alone may do so.
  const prototypeLoginBody = authSource.slice(authSource.indexOf('async prototypeLogin'), authSource.indexOf('async registerOwner'));
  assert.doesNotMatch(prototypeLoginBody, /registerExplicit/);
  assert.match(authSource, /async registerOwner/);
  assert.match(authSource, /ROLE_OWNER/);
  assert.match(appSource, /\/api\/v1\/auth\/register-owner/);
  assert.match(appSource, /\/owner\/kyc\/presigned-upload/);
  assert.match(appSource, /\/owner\/kyc\/submit/);
  assert.match(appSource, /LEGACY_KYC_ENDPOINT_RETIRED/);
  assert.match(appSource, /generateSignedReadUrl/);
  assert.match(appSource, /KYC_REJECTION_REASON_REQUIRED/);

  // Touched UIs must never restore the legacy fake identity/document path.
  assert.match(modalSource, /OwnerKycOnboarding/);
  assert.doesNotMatch(modalSource, /29901011234567|storage\.sola\.eg|readAsDataURL/);
  assert.doesNotMatch(queueSource, /admin_token_valid|100%|\+201000000000/);
  assert.match(splashSource, /setTimeout\(onComplete, 2000\)/);

  // Executable registration behavior with narrow repository stubs: a new
  // human receives one shared user/owner UUID and one OWNER session.
  const originalRegister = ownerDb.registerExplicit;
  const originalOwner = ownerDb.getById;
  const originalUser = userDb.getById;
  const originalSession = sessionDb.create;
  const sharedId = '00000000-0000-4000-8000-201000000123';
  let sessionPayload: any = null;
  (ownerDb as any).registerExplicit = async () => ({ ownerId: sharedId, createdOwner: true });
  (userDb as any).getById = async () => ({ id: sharedId, phoneNumber: '+201000000123', fullName: 'مالك جديد', status: 'ACTIVE' });
  (ownerDb as any).getById = async () => ({ id: sharedId, phoneNumber: '+201000000123', fullName: 'مالك جديد', verificationStatus: 'UNVERIFIED' });
  (sessionDb as any).create = async (payload: any) => { sessionPayload = payload; return payload; };
  try {
    const result = await new AuthService().registerOwner('+201000000123', 'مالك جديد');
    assert.equal(result.user.id, result.owner.id);
    assert.equal(result.owner.id, sharedId);
    assert.equal(result.isOwner, true);
    assert.equal(sessionPayload.surface, 'OWNER');
    assert.equal(sessionPayload.ownerId, sessionPayload.userId);
    (ownerDb as any).registerExplicit = async () => ({ ownerId: sharedId, createdOwner: false });
    sessionPayload = null;
    await assert.rejects(() => new AuthService().registerOwner('+201000000123', 'مالك جديد'), /OWNER_ALREADY_EXISTS/);
    assert.equal(sessionPayload, null, 'existing Owner registration must not create a session');
  } finally {
    (ownerDb as any).registerExplicit = originalRegister;
    (ownerDb as any).getById = originalOwner;
    (userDb as any).getById = originalUser;
    (sessionDb as any).create = originalSession;
  }

  // Executable Owner/Admin route tests use only in-memory stubs; no Supabase
  // KYC object or production identity is involved.
  const ownerA = '00000000-0000-4000-8000-201000000201';
  const ownerB = '00000000-0000-4000-8000-201000000202';
  const adminId = '00000000-0000-0000-0000-000000000001';
  const app = new ExpressServerApp();
  const ownerToken = signAccessToken({ sub: ownerA, role: 'ROLE_OWNER', phone: '+201000000201' });
  const adminToken = signAccessToken({ sub: adminId, role: 'ROLE_ADMIN', phone: 'admin@sola.com' });
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
  const originalDocs = ownerDb.getDocuments;
  const originalSubmit = ownerDb.submitKycPackage;
  const originalReview = ownerDb.reviewKycPackage;
  const originalOwnerGet = ownerDb.getById;
  let submitCalls: any[] = [];
  let reviewCalls: any[] = [];
  let signedReads = 0;
  const storage = {
    generateSignedUploadUrl: async ({ objectKey }: any) => ({ uploadUrl: 'https://private-upload.test', objectKey, headers: {}, expiresInSeconds: 300 }),
    getObject: async (key: string) => ({ buffer: key.includes('invalid') ? Buffer.from('invalid') : jpeg, mimeType: 'image/jpeg', sizeBytes: key.includes('oversized') ? 11 * 1024 * 1024 : jpeg.length }),
    generateSignedReadUrl: async () => { signedReads += 1; return 'https://private-read.test/signed'; },
  };
  (app as any).verificationStorageService = storage;
  (ownerDb as any).getById = async (id: string) => id === ownerA || id === ownerB ? ({ id, phoneNumber: '+201000000201', verificationStatus: 'UNVERIFIED' }) : null;
  (ownerDb as any).submitKycPackage = async (...args: any[]) => { submitCalls.push(args); return { verificationStatus: 'PENDING_VERIFICATION' }; };
  (ownerDb as any).reviewKycPackage = async (...args: any[]) => { reviewCalls.push(args); return { verificationStatus: args[1] === 'APPROVED' ? 'VERIFIED' : 'REJECTED' }; };
  (ownerDb as any).getDocuments = async (id: string) => id === ownerA ? [{ id: 'doc-a', storageKey: `owner-verification/${ownerA}/NATIONAL_ID_FRONT/a.jpg` }] : [];
  try {
    const unauth = await app.handleHttpRequest('POST', '/api/v1/owner/kyc/presigned-upload', {}, { documentType: 'NATIONAL_ID_FRONT' });
    assert.equal(unauth.statusCode, 401);
    const invalidMetadata = await app.handleHttpRequest('POST', '/api/v1/owner/kyc/presigned-upload', { authorization: `Bearer ${ownerToken}` }, { documentType: 'NATIONAL_ID_FRONT', fileName: 'bad.pdf', mimeType: 'application/pdf', fileSize: 1 });
    assert.equal(invalidMetadata.statusCode, 400);
    const signed = await app.handleHttpRequest('POST', '/api/v1/owner/kyc/presigned-upload', { authorization: `Bearer ${ownerToken}` }, { documentType: 'NATIONAL_ID_FRONT', fileName: 'id.jpg', mimeType: 'image/jpeg', fileSize: 100 });
    assert.equal(signed.statusCode, 200);
    assert.match((signed.body as any).data.storageKey, new RegExp(`^owner-verification/${ownerA}/NATIONAL_ID_FRONT/`));
    const incomplete = await app.handleHttpRequest('POST', '/api/v1/owner/kyc/submit', { authorization: `Bearer ${ownerToken}` }, { documents: [{ documentType: 'NATIONAL_ID_FRONT', storageKey: `owner-verification/${ownerA}/NATIONAL_ID_FRONT/a.jpg` }] });
    assert.equal(incomplete.statusCode, 400); assert.equal(submitCalls.length, 0);
    const crossOwner = await app.handleHttpRequest('POST', '/api/v1/owner/kyc/submit', { authorization: `Bearer ${ownerToken}` }, { documents: ['NATIONAL_ID_FRONT','NATIONAL_ID_BACK','LIVE_FACE'].map(documentType => ({ documentType, storageKey: `owner-verification/${ownerB}/${documentType}/a.jpg` })) });
    assert.equal(crossOwner.statusCode, 400);
    const validDocs = ['NATIONAL_ID_FRONT','NATIONAL_ID_BACK','LIVE_FACE'].map(documentType => ({ documentType, storageKey: `owner-verification/${ownerA}/${documentType}/a.jpg` }));
    const valid = await app.handleHttpRequest('POST', '/api/v1/owner/kyc/submit', { authorization: `Bearer ${ownerToken}` }, { documents: validDocs });
    assert.equal(valid.statusCode, 200); assert.equal(submitCalls.length, 1); assert.equal(submitCalls[0][1].length, 3);
    const invalidMagic = await app.handleHttpRequest('POST', '/api/v1/owner/kyc/submit', { authorization: `Bearer ${ownerToken}` }, { documents: validDocs.map((d: any) => ({ ...d, storageKey: d.storageKey.replace('/a.jpg', '/invalid.jpg') })) });
    assert.equal(invalidMagic.statusCode, 400); assert.equal(submitCalls.length, 1);
    const noAdmin = await app.handleHttpRequest('GET', `/api/v1/admin/verifications/${ownerA}/documents/doc-a/access`, {});
    assert.equal(noAdmin.statusCode, 401);
    const adminDoc = await app.handleHttpRequest('GET', `/api/v1/admin/verifications/${ownerA}/documents/doc-a/access`, { authorization: `Bearer ${adminToken}` });
    assert.equal(adminDoc.statusCode, 200); assert.equal(signedReads, 1);
    const foreignDoc = await app.handleHttpRequest('GET', `/api/v1/admin/verifications/${ownerB}/documents/doc-a/access`, { authorization: `Bearer ${adminToken}` });
    assert.equal(foreignDoc.statusCode, 404); assert.equal(signedReads, 1);
    const noReason = await app.handleHttpRequest('POST', '/api/v1/admin/verifications/review', { authorization: `Bearer ${adminToken}` }, { ownerId: ownerA, decision: 'REJECTED' });
    assert.equal(noReason.statusCode, 400); assert.equal(reviewCalls.length, 0);
    const approve = await app.handleHttpRequest('POST', '/api/v1/admin/verifications/review', { authorization: `Bearer ${adminToken}` }, { ownerId: ownerA, decision: 'APPROVED' });
    assert.equal(approve.statusCode, 200); assert.deepEqual(reviewCalls[0], [ownerA, 'APPROVED', undefined]);
    const reject = await app.handleHttpRequest('POST', '/api/v1/admin/verifications/review', { authorization: `Bearer ${adminToken}` }, { ownerId: ownerA, decision: 'REJECTED', rejectionReason: 'الصورة غير واضحة' });
    assert.equal(reject.statusCode, 200); assert.deepEqual(reviewCalls[1], [ownerA, 'REJECTED', 'الصورة غير واضحة']);
  } finally {
    (ownerDb as any).getDocuments = originalDocs; (ownerDb as any).submitKycPackage = originalSubmit; (ownerDb as any).reviewKycPackage = originalReview; (ownerDb as any).getById = originalOwnerGet;
  }
  console.log('OWNER-REGISTRATION-KYC-01 focused contracts passed.');
}

run().catch((error) => { console.error(error); process.exit(1); });

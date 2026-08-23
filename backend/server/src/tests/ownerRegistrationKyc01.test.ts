import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { queryDb } from '../services/dbClient.js';

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
  console.log('OWNER-REGISTRATION-KYC-01 focused contracts passed.');
}

run().catch((error) => { console.error(error); process.exit(1); });

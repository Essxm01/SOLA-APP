import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ExpressServerApp } from '../app.js';
import { signAccessToken } from '../services/jwtService.js';
import { ownerDb } from '../services/dbRepository.js';
import { queryDb } from '../services/dbClient.js';
import { getCanonicalOwnerPhone, getOwnerDraftStorageKey, isValidOwnerLogin } from '../../../../owner-app/src/utils/ownerIdentity.js';

type EnvSnapshot = Record<'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY', string | undefined>;

function snapshotEnv(): EnvSnapshot {
  return { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY };
}

function restoreEnv(snapshot: EnvSnapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
}

async function captureRestUrl(sql: string, params: string[]) {
  const originalFetch = globalThis.fetch;
  const env = snapshotEnv();
  const calls: Array<{ url: string; method: string }> = [];
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), method: init?.method || 'GET' });
    return { ok: true, json: async () => [], text: async () => '' } as Response;
  }) as typeof fetch;
  try {
    await queryDb(sql, params);
    assert.equal(calls.length, 1);
    return calls[0];
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv(env);
  }
}

async function run() {
  const ownerA = '00000000-0000-4000-8000-201013154939';
  const ownerB = '00000000-0000-4000-8000-201000000001';

  // The frontend acceptance gate requires a role-bearing token and an actual owner.
  assert.equal(isValidOwnerLogin({ tokens: { accessToken: 'owner-token' }, isOwner: true, owner: { id: ownerA, phoneNumber: '+201013154939' } }), true);
  assert.equal(isValidOwnerLogin({ tokens: { accessToken: 'customer-token' }, isOwner: false, owner: null, ownerOnboardingRequired: true }), false);
  assert.equal(getCanonicalOwnerPhone({ id: ownerA, phoneNumber: '+201013154939', phone: '+201000000001' }), '+201013154939');
  assert.equal(getOwnerDraftStorageKey(ownerA), `sola_owner_property_draft:${ownerA}`);
  assert.notEqual(getOwnerDraftStorageKey(ownerA), getOwnerDraftStorageKey(ownerB));

  // Existing owner-scoped compatibility routes must keep their verified owner predicate.
  const properties = await captureRestUrl('SELECT id FROM properties WHERE owner_id = $1 AND deleted_at IS NULL', [ownerA]);
  assert.match(properties.url, new RegExp(`properties\\?owner_id=eq\\.${ownerA}`));
  const bookings = await captureRestUrl('SELECT id FROM bookings WHERE owner_id = $1 ORDER BY created_at DESC', [ownerA]);
  assert.match(bookings.url, new RegExp(`bookings\\?owner_id=eq\\.${ownerA}`));
  const conversations = await captureRestUrl('SELECT id FROM booking_conversations WHERE owner_id = $1 ORDER BY updated_at DESC', [ownerA]);
  assert.match(conversations.url, new RegExp(`booking_conversations\\?owner_id=eq\\.${ownerA}`));

  // A missing owner profile is an honest capability failure; it must not upsert or fabricate one.
  const originalGetById = ownerDb.getById;
  const originalUpsert = ownerDb.upsert;
  let upsertCalled = false;
  (ownerDb as any).getById = async () => null;
  (ownerDb as any).upsert = async () => { upsertCalled = true; throw new Error('must not be called'); };
  try {
    const app = new ExpressServerApp();
    const token = signAccessToken({ sub: ownerA, role: 'ROLE_OWNER', phone: '+201013154939' });
    const response = await app.handleHttpRequest('GET', '/api/v1/owner/profile', { authorization: `Bearer ${token}` });
    assert.equal(response.statusCode, 404);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error?.code, 'OWNER_PROFILE_NOT_FOUND');
    assert.equal(upsertCalled, false);
  } finally {
    (ownerDb as any).getById = originalGetById;
    (ownerDb as any).upsert = originalUpsert;
  }

  // Structural regressions: no provider before the auth gate, and no global draft key.
  const [appSource, contextSource, profileSource] = await Promise.all([
    readFile(new URL('../../../../owner-app/src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../../../owner-app/src/context/AppContext.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../../../owner-app/src/components/profile/ProfileView.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(appSource, /if \(isLoadingAuth\)/);
  assert.match(appSource, /<AppProvider key=\{owner\.id\} ownerId=\{owner\.id\}>/);
  assert.match(contextSource, /getOwnerDraftStorageKey\(ownerId\)/);
  assert.doesNotMatch(contextSource, /getItem\('sola_owner_property_draft'\)/);
  assert.match(profileSource, /phoneNumber \|\| owner\?\.phone \|\| 'غير متاح'/);

  console.log('OWNER-IDENTITY-01 focused account-boundary regressions passed.');
}

run().catch((error) => { console.error(error); process.exit(1); });

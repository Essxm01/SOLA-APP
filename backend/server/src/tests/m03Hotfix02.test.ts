import assert from 'node:assert/strict';
import { queryDb } from '../services/dbClient.js';

type EnvSnapshot = Record<'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY', string | undefined>;

function rememberEnv(): EnvSnapshot {
  return {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

function restoreEnv(snapshot: EnvSnapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

async function captureRestUrl(sql: string, params: string[]) {
  const originalFetch = globalThis.fetch;
  const snapshot = rememberEnv();
  const urls: string[] = [];

  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  globalThis.fetch = (async (input: string | URL | Request) => {
    urls.push(String(input));
    return {
      ok: true,
      json: async () => [],
      text: async () => '',
    } as Response;
  }) as typeof fetch;

  try {
    await queryDb(sql, params);
    assert.equal(urls.length, 1, 'exactly one PostgREST request should be issued');
    return urls[0];
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv(snapshot);
  }
}

async function run() {
  const ownerId = '00000000-0000-4000-8000-201013154939';
  const propertyId = '6c44dd83-4b59-412a-964d-8868aa525465';

  const ownerUrl = await captureRestUrl(
    'SELECT id, owner_id FROM properties WHERE owner_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
    [ownerId],
  );
  assert.match(ownerUrl, new RegExp(`properties\\?owner_id=eq\\.${ownerId}`));
  assert.doesNotMatch(ownerUrl, new RegExp(`properties\\?id=eq\\.${ownerId}`));

  const propertyUrl = await captureRestUrl(
    'SELECT id, owner_id FROM properties p WHERE p.id = $1 AND deleted_at IS NULL',
    [propertyId],
  );
  assert.match(propertyUrl, new RegExp(`properties\\?id=eq\\.${propertyId}`));
  assert.doesNotMatch(propertyUrl, /owner_id=eq/);

  console.log('M03 HOTFIX-02 dbClient routing regression checks passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { queryDb } from '../services/dbClient.js';

async function run() {
  const [expand, finalize] = await Promise.all([
    readFile(new URL('../../../database/migrations/022_identity_session_persistence_integrity.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../../database/migrations/023_finalize_identity_session_persistence.sql', import.meta.url), 'utf8'),
  ]);
  assert.match(expand, /SET user_id = owner_id,[\s\S]*surface = 'OWNER',[\s\S]*role = 'ROLE_OWNER'/, 'legacy owner sessions must not default to Customer');
  assert.match(expand, /ALTER COLUMN owner_id DROP NOT NULL/);
  assert.match(expand, /konfrm_compat_user_session_write/, 'Stage 1 must canonicalize old-Worker transition writes');
  assert.doesNotMatch(expand, /ALTER COLUMN user_id SET NOT NULL/, 'Stage 1 must keep old Worker writes viable');
  assert.match(finalize, /ALTER COLUMN user_id SET NOT NULL/);
  assert.match(finalize, /uq_user_sessions_refresh_token_hash/);
  assert.match(finalize, /DROP TRIGGER IF EXISTS trg_konfrm_compat_user_session_write/);
  assert.doesNotMatch(`${expand}\n${finalize}`, /otp_challenges/i, 'P1.2 must not add OTP persistence');

  // Four-state rollout model: old writes preserve their packed identity and
  // Stage 1 deterministically canonicalizes it before final Stage 3 checks.
  const ownerId = '00000000-0000-4000-8000-201000000301';
  const customerId = '00000000-0000-4000-8000-201000000302';
  const oldOwnerWrite = { owner_id: ownerId, device_info: JSON.stringify({ userId: ownerId, surface: 'OWNER', role: 'ROLE_OWNER' }) };
  const oldCustomerWrite = { owner_id: customerId, device_info: JSON.stringify({ userId: customerId, surface: 'OWNER', role: 'ROLE_CUSTOMER' }) };
  const canonicalize = (row: any) => {
    const packed = JSON.parse(row.device_info);
    return { user_id: packed.userId, owner_id: packed.role === 'ROLE_OWNER' ? row.owner_id : null, surface: packed.surface, role: packed.role };
  };
  assert.deepEqual(canonicalize(oldOwnerWrite), { user_id: ownerId, owner_id: ownerId, surface: 'OWNER', role: 'ROLE_OWNER' });
  assert.deepEqual(canonicalize(oldCustomerWrite), { user_id: customerId, owner_id: null, surface: 'OWNER', role: 'ROLE_CUSTOMER' });

  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const calls: Array<{ url: string; method: string; body: any }> = [];
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input); const method = init?.method || 'GET'; const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ url, method, body });
    if (method === 'POST') return { ok: true, status: 201, json: async () => [{ ...body, created_at: '2026-01-01T00:00:00Z' }], text: async () => '' } as Response;
    if (method === 'GET') return { ok: true, status: 200, json: async () => [], text: async () => '' } as Response;
    return { ok: true, status: 200, json: async () => [{ id: 's' }], text: async () => '' } as Response;
  }) as typeof fetch;
  try {
    await queryDb('INSERT INTO user_sessions (id, user_id, owner_id, surface, role, refresh_token_hash, device_info, ip_address, is_revoked, expires_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9, NOW(), NOW())', ['s', 'user-a', null, 'CUSTOMER', 'ROLE_CUSTOMER', 'sha256:x', null, null, '2026-12-01T00:00:00Z']);
    assert.deepEqual(calls[0].body.owner_id, null);
    assert.equal(calls[0].body.user_id, 'user-a');
    assert.equal(calls[0].body.surface, 'CUSTOMER');
    assert.equal(calls[0].body.role, 'ROLE_CUSTOMER');
    assert.equal(calls[0].body.device_info, '');
    await queryDb('UPDATE user_sessions SET is_revoked = TRUE WHERE refresh_token_hash = $1', ['sha256:x']);
    assert.match(calls[1].url, /user_sessions\?refresh_token_hash=eq\.sha256%3Ax/);
    assert.equal(calls[1].method, 'PATCH');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }
  console.log('P1.2 Worker adapter and migration contract tests passed');
}

run().catch((error) => { console.error(error); process.exit(1); });

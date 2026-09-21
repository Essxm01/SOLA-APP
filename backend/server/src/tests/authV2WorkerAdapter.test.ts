import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { ExpressServerApp } from '../app.js';
import { PostgresAuthChallengeRepository, PostgresAuthRateLimitRepository, PostgresUserIdentifierRepository } from '../services/authV2Repository.js';
import { AUTH_V2_QA_PROJECT_REF } from '../services/authV2Runtime.js';
import worker from '../worker.js';

const QA_ENV: Record<string, string> = {
  AUTH_V2_ENABLED: 'true', AUTH_ENVIRONMENT: 'founder_qa', AUTH_DELIVERY_MODE: 'DEVELOPMENT_FIXED_OTP', AUTH_DEVELOPMENT_OTP: '123456',
  AUTH_OTP_HMAC_SECRET: 'worker-adapter-test-hmac-secret-32-chars', JWT_ACCESS_SECRET: 'worker-adapter-access-secret-32-chars', JWT_REFRESH_SECRET: 'worker-adapter-refresh-secret-32-chars',
  SUPABASE_PROJECT_REF: AUTH_V2_QA_PROJECT_REF, SUPABASE_URL: `https://${AUTH_V2_QA_PROJECT_REF}.supabase.co`, SUPABASE_SERVICE_ROLE_KEY: 'worker-adapter-service-role-key-32-chars',
};
const UUID = () => randomUUID();
const json = (value: unknown, status = 200): Response => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
const assertExactRpcBody = (body: Record<string, unknown>, expected: string[]): void => {
  assert.deepStrictEqual(Object.keys(body).sort(), [...expected].sort());
};

export async function runAuthV2WorkerAdapterSuite(): Promise<void> {
  const oldEnv: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(QA_ENV)) { oldEnv[key] = process.env[key]; process.env[key] = value; }
  const oldDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  const oldFetch = globalThis.fetch;
  const users = new Map<string, any>();
  const identifiers = new Map<string, any>();
  const challenges = new Map<string, any>();
  const sessions: any[] = [];
  const existingUserId = UUID();
  const existingPhone = '+201011111111';
  users.set(existingUserId, { id: existingUserId, phone_number: existingPhone, phone_verified_at: new Date().toISOString(), full_name: 'Existing QA User', status: 'ACTIVE' });
  users.set(existingPhone, users.get(existingUserId));
  identifiers.set(`PHONE:${existingPhone}`, { id: UUID(), user_id: existingUserId, identifier_type: 'PHONE', normalized_value: existingPhone, verified_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });

  const rowsFor = (table: string, url: URL): any[] => {
    const eq = (name: string) => decodeURIComponent((url.searchParams.get(name) || '').replace(/^eq\./, ''));
    if (table === 'users') {
      const id = eq('id'); const phone = eq('phone_number');
      return [...users.values()].filter((u) => u && (!id || u.id === id) && (!phone || u.phone_number === phone)).filter((u, i, a) => a.findIndex((x) => x.id === u.id) === i);
    }
    if (table === 'user_identifiers') {
      const type = eq('identifier_type'); const value = eq('normalized_value'); const userId = eq('user_id');
      return [...identifiers.values()].filter((r) => (!type || r.identifier_type === type) && (!value || r.normalized_value === value) && (!userId || r.user_id === userId));
    }
    if (table === 'auth_challenges') { const id = eq('id'); return [...challenges.values()].filter((r) => !id || r.id === id); }
    if (table === 'user_sessions') { const hash = eq('refresh_token_hash'); return sessions.filter((r) => !hash || r.refresh_token_hash === hash); }
    return [];
  };
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = (init?.method || 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const name = url.pathname.split('/').pop();
      if (name === 'konfrm_check_rate_limit_v2') { assertExactRpcBody(body, ['p_bucket_key', 'p_window_seconds', 'p_max_attempts']); return json([{ allowed: true, remaining_attempts: 9, retry_after_seconds: 0 }]); }
      if (name === 'konfrm_acquire_resend_lease_v2') { assertExactRpcBody(body, ['p_challenge_id', 'p_lease_ttl_seconds']); return json([{ success: true, lease_token: 'qa-lease', generation: 1, normalized_value: challenges.get(body.p_challenge_id)?.normalized_value, method: 'PHONE', surface: 'CUSTOMER', intent: 'LOGIN' }]); }
      if (name === 'konfrm_commit_resend_v2') { assertExactRpcBody(body, ['p_challenge_id', 'p_lease_token', 'p_new_digest', 'p_new_generation', 'p_cooldown_seconds']); return json([{ success: true, generation: 2, otp_expires_at: new Date(Date.now() + 600000).toISOString(), resend_available_at: new Date(Date.now() + 60000).toISOString(), challenge_expires_at: new Date(Date.now() + 1800000).toISOString() }]); }
      if (name === 'konfrm_release_resend_lease_v2') { assertExactRpcBody(body, ['p_challenge_id', 'p_lease_token']); return json([{ success: true }]); }
      if (name === 'konfrm_verify_auth_challenge_v2') {
        assertExactRpcBody(body, ['p_challenge_id', 'p_otp_digest', 'p_max_failed_attempts']);
        const c = challenges.get(body.p_challenge_id); if (!c) return json([{ success: false, error_code: 'CHALLENGE_NOT_FOUND', challenge_id: body.p_challenge_id, failed_attempts: 0, is_locked: false }]);
        c.status = 'VERIFIED'; c.verified_at = new Date().toISOString();
        const id = identifiers.get(`PHONE:${c.normalized_value}`);
        return json([{ success: true, error_code: null, challenge_id: c.id, user_id: id?.user_id || null, identifier_type: c.method, normalized_value: c.normalized_value, intent: c.intent, surface: c.surface, failed_attempts: 0, is_locked: false }]);
      }
      if (name === 'konfrm_consume_auth_challenge_v2') {
        assertExactRpcBody(body, ['p_challenge_id']);
        const c = challenges.get(body.p_challenge_id); if (!c || c.status !== 'VERIFIED') return json([{ success: false, error_code: 'CONTINUATION_ALREADY_CONSUMED' }]);
        c.status = 'CONSUMED'; c.consumed_at = new Date().toISOString(); return json([{ success: true, error_code: null }]);
      }
      return json({ error: 'unknown rpc' }, 404);
    }
    const match = url.pathname.match(/^\/rest\/v1\/([^/]+)$/); const table = match?.[1];
    if (!table) return json({ error: 'unknown path' }, 404);
    if (table === 'auth_challenges' && method === 'POST') {
      const now = new Date().toISOString(); const row = { ...body, created_at: now, updated_at: now, issued_at: now, verified_at: null, consumed_at: null, cancelled_at: null };
      challenges.set(row.id, row); return json([row]);
    }
    if (table === 'auth_challenges' && method === 'GET') return json(rowsFor(table, url));
    if (table === 'auth_challenges' && method === 'PATCH') { const row = rowsFor(table, url)[0]; if (!row) return json([]); Object.assign(row, body); return json([row]); }
    if (table === 'users' && method === 'GET') return json(rowsFor(table, url));
    if (table === 'users' && method === 'POST') { const row = { ...body, created_at: body.created_at || new Date().toISOString(), updated_at: new Date().toISOString(), phone_verified_at: body.phone_verified_at || null }; users.set(row.id, row); users.set(row.phone_number, row); return json([row]); }
    if (table === 'users' && method === 'PATCH') { const row = rowsFor(table, url)[0]; if (!row) return json([]); Object.assign(row, body); return json([row]); }
    if (table === 'user_identifiers' && method === 'GET') return json(rowsFor(table, url));
    if (table === 'user_identifiers' && method === 'POST') { const row = { ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; identifiers.set(`${row.identifier_type}:${row.normalized_value}`, row); return json([row]); }
    if (table === 'user_identifiers' && method === 'PATCH') { const row = rowsFor(table, url)[0]; if (!row) return json([]); Object.assign(row, body); return json([row]); }
    if (table === 'user_sessions' && method === 'POST') { const row = { ...body, created_at: new Date().toISOString() }; sessions.push(row); return json([row]); }
    if (table === 'user_sessions' && method === 'GET') return json(rowsFor(table, url));
    return json([]);
  }) as typeof fetch;

  try {
    const identifierRepo = new PostgresUserIdentifierRepository();
    const challengeRepo = new PostgresAuthChallengeRepository();
    const rateRepo = new PostgresAuthRateLimitRepository();
    assert.strictEqual((await identifierRepo.getByIdentifier('PHONE', existingPhone))?.userId, existingUserId);
    const challenge = await challengeRepo.create({ surface: 'CUSTOMER', intent: 'LOGIN', method: 'PHONE', normalizedValue: existingPhone, otpDigest: 'digest', otpExpiresAt: new Date(Date.now() + 600000).toISOString(), challengeExpiresAt: new Date(Date.now() + 1800000).toISOString(), resendAvailableAt: new Date().toISOString() });
    assert.strictEqual(challenge.id.length, 36);
    assert.strictEqual((await challengeRepo.getById(challenge.id))?.id, challenge.id);
    assert.strictEqual((await rateRepo.checkAndIncrement('qa-worker', 60, 10)).allowed, true);
    assert.strictEqual((await challengeRepo.acquireResendLease(challenge.id)).success, true);
    assert.strictEqual((await challengeRepo.commitResend(challenge.id, 'qa-lease', 'digest2', 2)).success, true);
    assert.strictEqual((await challengeRepo.releaseResendLease(challenge.id, 'qa-lease')).success, true);
    assert.strictEqual((await challengeRepo.atomicVerify(challenge.id, 'digest', 5)).success, true);
    assert.strictEqual((await challengeRepo.markConsumed(challenge.id)).id, challenge.id);
    assert.strictEqual((await challengeRepo.cancel(challenge.id))?.status, 'CANCELLED');
    const adapterFetch = globalThis.fetch;
    globalThis.fetch = (async () => json({ malformed: true })) as typeof fetch;
    await assert.rejects(() => rateRepo.checkAndIncrement('malformed', 60, 1), /expected a JSON array/);
    globalThis.fetch = (async () => json({ error: 'upstream', detail: 'failure' }, 503)) as typeof fetch;
    await assert.rejects(() => rateRepo.checkAndIncrement('failed', 60, 1), /HTTP 503/);
    globalThis.fetch = adapterFetch;

    const app = new ExpressServerApp();
    const issue = await app.handleHttpRequest('POST', '/api/v2/auth/challenges', { 'cf-connecting-ip': '198.51.100.20' }, { surface: 'CUSTOMER', intent: 'LOGIN', method: 'PHONE', identifier: existingPhone });
    assert.strictEqual(issue.statusCode, 200);
    const verify = await app.handleHttpRequest('POST', `/api/v2/auth/challenges/${issue.body.data.challengeId}/verify`, { 'cf-connecting-ip': '198.51.100.20' }, { otp: '123456' });
    assert.strictEqual(verify.statusCode, 200);
    assert.strictEqual(verify.body.data.isExistingUser, true);
    const newPhone = '+201011111119';
    const newIssue = await app.handleHttpRequest('POST', '/api/v2/auth/challenges', {}, { surface: 'CUSTOMER', intent: 'CREATE_ACCOUNT', method: 'PHONE', identifier: newPhone });
    const newVerify = await app.handleHttpRequest('POST', `/api/v2/auth/challenges/${newIssue.body.data.challengeId}/verify`, {}, { otp: '123456' });
    assert.strictEqual(newVerify.statusCode, 200);
    const completed = await app.handleHttpRequest('POST', '/api/v2/auth/registration/complete', {}, { continuationToken: newVerify.body.data.continuationToken, fullName: 'QA Worker User' });
    assert.strictEqual(completed.statusCode, 201);
    assert.ok(completed.body.data.tokens.accessToken);
    const workerCtx = { waitUntil() {}, passThroughOnException() {} };
    const blockedWorkerRoute = await worker.fetch(new Request('https://qa.invalid/api/v1/properties'), { AUTH_V2_QA_WORKER_ONLY: 'true' }, workerCtx);
    assert.strictEqual(blockedWorkerRoute.status, 404);
    const workerHealth = await worker.fetch(new Request('https://qa.invalid/api/v1/health'), { AUTH_V2_QA_WORKER_ONLY: 'true' }, workerCtx);
    assert.strictEqual(workerHealth.status, 200);
    console.log('AUTH_V2_WORKER_ADAPTER: PASS');
  } finally {
    globalThis.fetch = oldFetch;
    for (const [key, value] of Object.entries(oldEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (oldDatabaseUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = oldDatabaseUrl;
  }
}

if (process.argv[1]?.endsWith('authV2WorkerAdapter.test.ts')) runAuthV2WorkerAdapterSuite().catch((error) => { console.error(error); process.exit(1); });

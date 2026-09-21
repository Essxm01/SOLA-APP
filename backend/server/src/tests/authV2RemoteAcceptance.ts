/** Founder-QA-only remote acceptance. All mutations target the dedicated QA
 * project and synthetic identities; production-looking targets are rejected. */
import { randomUUID } from 'node:crypto';

const workerUrl = String(process.env.AUTH_V2_QA_WORKER_URL || '').replace(/\/$/, '');
const supabaseUrl = String(process.env.AUTH_V2_QA_SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = String(process.env.AUTH_V2_QA_SUPABASE_SERVICE_ROLE_KEY || '');
const otp = String(process.env.AUTH_V2_QA_DEVELOPMENT_OTP || '');
const expectedWorkerUrl = 'https://sola-backend-auth-v2-qa.essxm01.workers.dev';
const expectedSupabaseUrl = 'https://vlowzglqruozxstiqzgn.supabase.co';
const expectedQaProjectRef = 'vlowzglqruozxstiqzgn';
if (workerUrl !== expectedWorkerUrl || supabaseUrl !== expectedSupabaseUrl || !supabaseUrl.includes(expectedQaProjectRef)) throw new Error('FOUNDER_QA_TARGET_REQUIRED');
if (!serviceKey || !/^\d{6}$/.test(otp)) throw new Error('FOUNDER_MANUAL_SECRET_SETUP_REQUIRED');

type Result = { status: number; body: any };
const challengeIds: string[] = [];
let sequence = 0;
const phone = (_prefix = ''): string => `+2010${String(Date.now() + sequence++).slice(-8)}`;
const request = async (path: string, init?: RequestInit): Promise<Result> => {
  const res = await fetch(`${workerUrl}${path}`, init);
  return { status: res.status, body: await res.json().catch(() => null) };
};
const rest = async (path: string, method = 'GET', body?: unknown): Promise<any[]> => {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'content-type': 'application/json', Prefer: 'return=representation' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`QA_DB_READ_OR_WRITE_FAILED:${res.status}`);
  const value = await res.json().catch(() => []);
  if (!Array.isArray(value)) throw new Error('QA_DB_RESPONSE_MALFORMED');
  return value;
};
const issue = async (identifier: string, intent: 'LOGIN' | 'CREATE_ACCOUNT' = 'LOGIN', method: 'PHONE' | 'EMAIL' = 'PHONE'): Promise<Result> => {
  const result = await request('/api/v2/auth/challenges', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ surface: 'CUSTOMER', intent, method, identifier }) });
  if (result.status === 200 && result.body?.data?.challengeId) challengeIds.push(result.body.data.challengeId);
  return result;
};
const verify = (id: string, code = otp) => request(`/api/v2/auth/challenges/${id}/verify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ otp: code }) });
const complete = (token: string, name: string) => request('/api/v2/auth/registration/complete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ continuationToken: token, fullName: name }) });
const assert: (condition: unknown, code: string) => asserts condition = (condition, code) => {
  if (!condition) throw new Error(code);
};

async function cleanupFixedQaState(): Promise<void> {
  if (supabaseUrl !== expectedSupabaseUrl || supabaseUrl.includes('zrbmbjgcsowfqklmxbyn')) {
    throw new Error('FOUNDER_QA_CLEANUP_TARGET_REQUIRED');
  }
  const phone = '+201000000001';
  const email = 'existing-email@konfrm.test';
  await rest(`auth_challenges?normalized_value=eq.${encodeURIComponent(phone)}`, 'DELETE');
  await rest(`auth_challenges?normalized_value=eq.${encodeURIComponent(email)}`, 'DELETE');
  await rest(`auth_rate_limits?bucket_key=eq.${encodeURIComponent(`rate:send:id:PHONE:${phone}`)}`, 'DELETE');
  await rest(`auth_rate_limits?bucket_key=eq.${encodeURIComponent(`rate:send:id:EMAIL:${email}`)}`, 'DELETE');
}

async function ensureExistingFixtures(): Promise<void> {
  const existingPhone = '+201000000001';
  const existingEmail = 'existing-email@konfrm.test';
  const users = await rest(`users?phone_number=eq.${encodeURIComponent(existingPhone)}&select=id,phone_number,full_name`);
  let userId = users[0]?.id;
  if (!userId) {
    userId = randomUUID();
    await rest('users', 'POST', { id: userId, phone_number: existingPhone, full_name: 'Founder QA Existing User', status: 'ACTIVE', phone_verified_at: new Date().toISOString() });
  }
  const phoneIds = await rest(`user_identifiers?identifier_type=eq.PHONE&normalized_value=eq.${encodeURIComponent(existingPhone)}&select=id`);
  if (phoneIds.length === 0) await rest('user_identifiers', 'POST', { id: randomUUID(), user_id: userId, identifier_type: 'PHONE', normalized_value: existingPhone, verified_at: new Date().toISOString() });
  const emailIds = await rest(`user_identifiers?identifier_type=eq.EMAIL&normalized_value=eq.${encodeURIComponent(existingEmail)}&select=id`);
  if (emailIds.length === 0) await rest('user_identifiers', 'POST', { id: randomUUID(), user_id: userId, identifier_type: 'EMAIL', normalized_value: existingEmail, verified_at: new Date().toISOString() });
}

async function run(): Promise<void> {
  await cleanupFixedQaState();
  await ensureExistingFixtures();
  const health = await request('/api/v1/health');
  assert(health.status === 200 && health.body?.data?.status === 'healthy', 'QA_HEALTH_FAILED');
  const blocked = await request('/api/v1/properties');
  assert(blocked.status === 404 && blocked.body?.error?.code === 'QA_ROUTE_NOT_ALLOWED', 'QA_ROUTE_GUARD_FAILED');
  const malformed = await request('/api/v2/auth/challenges', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert(malformed.status === 400, 'QA_MALFORMED_REQUEST_EXPECTED_400');

  const existingPhone = '+201000000001';
  const phoneLogin = await issue(existingPhone);
  assert(phoneLogin.status === 200, 'REMOTE_EXISTING_PHONE_ISSUE_FAILED');
  const phoneVerified = await verify(phoneLogin.body.data.challengeId);
  assert(phoneVerified.status === 200 && phoneVerified.body.data.isExistingUser === true && phoneVerified.body.data.tokens?.refreshToken, 'REMOTE_EXISTING_PHONE_VERIFY_FAILED');
  const existingUserId = (await rest(`users?phone_number=eq.${encodeURIComponent(existingPhone)}&select=id`))[0]?.id;
  assert((await rest(`users?phone_number=eq.${encodeURIComponent(existingPhone)}&select=id`)).length === 1, 'REMOTE_EXISTING_PHONE_DUPLICATE');
  assert((await rest(`user_identifiers?user_id=eq.${encodeURIComponent(existingUserId)}&identifier_type=eq.PHONE&select=id`)).length === 1, 'REMOTE_EXISTING_PHONE_IDENTIFIER_FAILED');

  const existingEmail = await issue('existing-email@konfrm.test', 'LOGIN', 'EMAIL');
  assert(existingEmail.status === 200, 'REMOTE_EXISTING_EMAIL_ISSUE_FAILED');
  const emailVerified = await verify(existingEmail.body.data.challengeId);
  assert(emailVerified.status === 200 && emailVerified.body.data.isExistingUser === true && emailVerified.body.data.tokens?.refreshToken, 'REMOTE_EXISTING_EMAIL_VERIFY_FAILED');

  const unknownEmail = `unknown-${Date.now()}@konfrm.test`;
  const emailIssue = await issue(unknownEmail, 'CREATE_ACCOUNT', 'EMAIL');
  const emailOnly = await verify(emailIssue.body.data.challengeId);
  assert(emailOnly.status === 200 && emailOnly.body.data.accountCreation === 'DEFERRED_EMAIL_ONLY' && !emailOnly.body.data.continuationToken, 'REMOTE_UNKNOWN_EMAIL_NOT_DEFERRED');
  assert((await rest(`users?email=eq.${encodeURIComponent(unknownEmail)}&select=id`)).length === 0, 'REMOTE_UNKNOWN_EMAIL_CREATED_USER');

  const lockIssue = await issue(phone('lock'));
  for (let attempt = 0; attempt < 5; attempt++) assert((await verify(lockIssue.body.data.challengeId, '000000')).status === 400, 'REMOTE_WRONG_OTP_NOT_REJECTED');
  assert((await verify(lockIssue.body.data.challengeId, otp)).status === 400, 'REMOTE_LOCKOUT_BYPASSED');

  const cancelIssue = await issue(phone('cancel'));
  assert((await request(`/api/v2/auth/challenges/${cancelIssue.body.data.challengeId}`, { method: 'DELETE' })).status === 200, 'REMOTE_CANCEL_FAILED');
  assert((await verify(cancelIssue.body.data.challengeId)).status === 400, 'REMOTE_CANCEL_VERIFY_ALLOWED');

  const replayIssue = await issue(existingPhone);
  assert((await verify(replayIssue.body.data.challengeId)).status === 200, 'REMOTE_VERIFY_REPLAY_SETUP_FAILED');
  assert((await verify(replayIssue.body.data.challengeId)).status === 400, 'REMOTE_VERIFY_REPLAY_ALLOWED');

  const continuationIssue = await issue(phone('continuation'), 'CREATE_ACCOUNT');
  const continuationVerified = await verify(continuationIssue.body.data.challengeId);
  const continuationResult = await complete(continuationVerified.body.data.continuationToken, 'QA Continuation User');
  assert(continuationResult.status === 201, 'REMOTE_CONTINUATION_COMPLETION_FAILED');
  assert((await complete(continuationVerified.body.data.continuationToken, 'QA Continuation User')).status === 409, 'REMOTE_CONTINUATION_REPLAY_ALLOWED');

  const verifyConcurrentIssue = await issue(existingPhone);
  const verifyConcurrent = await Promise.all(Array.from({ length: 5 }, () => verify(verifyConcurrentIssue.body.data.challengeId)));
  assert(verifyConcurrent.filter((r) => r.status === 200).length === 1, 'REMOTE_VERIFY_CONCURRENCY_WINNER_COUNT');
  assert(verifyConcurrent.every((r) => r.status === 200 || r.status === 400), 'REMOTE_VERIFY_CONCURRENCY_UNSAFE_RESULT');

  const continuationConcurrentIssue = await issue(phone('concurrency'), 'CREATE_ACCOUNT');
  const continuationConcurrentVerified = await verify(continuationConcurrentIssue.body.data.challengeId);
  const continuationConcurrent = await Promise.all(Array.from({ length: 5 }, () => complete(continuationConcurrentVerified.body.data.continuationToken, 'QA Concurrent User')));
  assert(continuationConcurrent.filter((r) => r.status === 201).length === 1, 'REMOTE_CONTINUATION_CONCURRENCY_WINNER_COUNT');

  const resendIssue = await issue(phone('resend'));
  assert((await request(`/api/v2/auth/challenges/${resendIssue.body.data.challengeId}/resend`, { method: 'POST' })).status === 429, 'REMOTE_RESEND_COOLDOWN_NOT_ENFORCED');
  const beforeResend = (await rest(`auth_challenges?id=eq.${resendIssue.body.data.challengeId}&select=id,generation,otp_digest,challenge_expires_at,provider_metadata`))[0];
  await rest(`auth_challenges?id=eq.${resendIssue.body.data.challengeId}`, 'PATCH', { resend_available_at: new Date(Date.now() - 1000).toISOString() });
  const resend = await request(`/api/v2/auth/challenges/${resendIssue.body.data.challengeId}/resend`, { method: 'POST' });
  assert(resend.status === 200, 'REMOTE_RESEND_FAILED');
  const afterResend = (await rest(`auth_challenges?id=eq.${resendIssue.body.data.challengeId}&select=id,generation,otp_digest,challenge_expires_at,provider_metadata`))[0];
  assert(afterResend.generation > beforeResend.generation && afterResend.otp_digest !== beforeResend.otp_digest && afterResend.challenge_expires_at === beforeResend.challenge_expires_at, 'REMOTE_RESEND_DIGEST_OR_EXPIRY_INVARIANT');
  await rest(`auth_challenges?id=eq.${resendIssue.body.data.challengeId}`, 'PATCH', { resend_available_at: new Date(Date.now() - 1000).toISOString(), resend_lease_token: null });
  const resendConcurrent = await Promise.all(Array.from({ length: 5 }, () => request(`/api/v2/auth/challenges/${resendIssue.body.data.challengeId}/resend`, { method: 'POST' })));
  assert(resendConcurrent.filter((r) => r.status === 200).length === 1, 'REMOTE_RESEND_CONCURRENCY_WINNER_COUNT');

  const ratePhone = phone('rate');
  const rateResults = await Promise.all(Array.from({ length: 6 }, () => issue(ratePhone)));
  assert(rateResults.filter((r) => r.status === 200).length <= 5 && rateResults.some((r) => r.status === 429), 'REMOTE_IDENTIFIER_RATE_LIMIT_FAILED');

  const refreshed = await request('/api/v1/auth/refresh', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: phoneVerified.body.data.tokens.refreshToken }) });
  assert(refreshed.status === 200 && refreshed.body?.data?.accessToken, 'REMOTE_REFRESH_FAILED');
  assert((await request('/api/v1/auth/revoke', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: phoneVerified.body.data.tokens.refreshToken }) })).status === 200, 'REMOTE_REVOKE_FAILED');
  assert((await request('/api/v1/auth/refresh', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: phoneVerified.body.data.tokens.refreshToken }) })).status === 401, 'REMOTE_REVOKED_REFRESH_ACCEPTED');

  for (const surface of ['OWNER', 'ADMIN']) {
    const blockedSurface = await request('/api/v2/auth/challenges', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ surface, intent: 'LOGIN', method: 'PHONE', identifier: phone(`surface-${surface}`) }) });
    assert(blockedSurface.status === 400, `REMOTE_${surface}_SURFACE_ACCEPTED`);
  }

  const challengeRows = await rest(`auth_challenges?id=in.(${challengeIds.join(',')})&select=id,otp_digest,provider_metadata`);
  assert(challengeRows.every((row) => typeof row.otp_digest === 'string' && row.otp_digest !== otp && !JSON.stringify(row.provider_metadata || {}).includes(otp)), 'REMOTE_OTP_STORAGE_PLAINTEXT');
  const apiText = JSON.stringify({ phoneVerified, emailVerified, emailOnly, continuationResult, resend });
  assert(!apiText.includes(otp), 'REMOTE_API_OTP_LEAK');
  console.log(JSON.stringify({ health: 'PASS', routeGuard: 'PASS', existingPhone: 'PASS', existingEmail: 'PASS', unknownEmailDeferred: 'PASS', wrongOtpLock: 'PASS', cancel: 'PASS', verifyReplay: 'PASS', continuationReplay: 'PASS', verifyConcurrency: 'PASS', continuationConcurrency: 'PASS', resend: 'PASS', resendConcurrency: 'PASS', rateLimit: 'PASS', refreshRevoke: 'PASS', otpStorageSecurity: 'PASS', unsupportedSurface: 'PASS' }));
}

run().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); });

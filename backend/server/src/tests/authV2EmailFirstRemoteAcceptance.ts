/**
 * Founder-QA-only acceptance for Customer email-first / multi-identifier Auth V2.
 * All external mutations are hard-bound to the dedicated QA Worker and QA Supabase.
 */
import { randomUUID } from 'node:crypto';

const workerUrl = String(process.env.AUTH_V2_QA_WORKER_URL || '').replace(/\/$/, '');
const supabaseUrl = String(process.env.AUTH_V2_QA_SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = String(process.env.AUTH_V2_QA_SUPABASE_SERVICE_ROLE_KEY || '');
const otp = String(process.env.AUTH_V2_QA_DEVELOPMENT_OTP || '');
const expectedWorkerUrl = 'https://sola-backend-auth-v2-qa.essxm01.workers.dev';
const expectedSupabaseUrl = 'https://vlowzglqruozxstiqzgn.supabase.co';
const productionRef = 'zrbmbjgcsowfqklmxbyn';

if (workerUrl !== expectedWorkerUrl || supabaseUrl !== expectedSupabaseUrl || supabaseUrl.includes(productionRef)) {
  throw new Error('FOUNDER_QA_TARGET_REQUIRED');
}
if (!serviceKey || !/^\d{6}$/.test(otp)) throw new Error('FOUNDER_QA_SECRETS_REQUIRED');

type Result = { status: number; body: any };
const challengeIds: string[] = [];
const syntheticEmails = new Set<string>();
const syntheticPhones = new Set<string>();

const assert: (condition: unknown, code: string) => asserts condition = (condition, code) => {
  if (!condition) throw new Error(code);
};

const request = async (path: string, init?: RequestInit): Promise<Result> => {
  const response = await fetch(`${workerUrl}${path}`, init);
  return { status: response.status, body: await response.json().catch(() => null) };
};

const rest = async (path: string, method = 'GET', body?: unknown): Promise<any[]> => {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`QA_DB_REQUEST_FAILED:${response.status}:${path}`);
  const value = await response.json().catch(() => []);
  if (!Array.isArray(value)) throw new Error(`QA_DB_RESPONSE_MALFORMED:${path}`);
  return value;
};

const issue = async (identifier: string, intent: 'LOGIN' | 'CREATE_ACCOUNT', method: 'PHONE' | 'EMAIL'): Promise<Result> => {
  const result = await request('/api/v2/auth/challenges', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ surface: 'CUSTOMER', intent, method, identifier }),
  });
  if (result.status === 200 && result.body?.data?.challengeId) challengeIds.push(result.body.data.challengeId);
  return result;
};

const verify = (challengeId: string): Promise<Result> => request(`/api/v2/auth/challenges/${challengeId}/verify`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ otp }),
});

const complete = (continuationToken: string, fullName: string): Promise<Result> => request('/api/v2/auth/registration/complete', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ continuationToken, fullName }),
});

async function canonicalReads(accessToken: string, expectedEmail: string): Promise<void> {
  const auth = { Authorization: `Bearer ${accessToken}` };
  const profile = await request('/api/v1/customer/profile', { headers: auth });
  assert(profile.status === 200 && profile.body?.success === true, 'EMAIL_FIRST_PROFILE_READ_FAILED');
  assert(profile.body.data?.phoneNumber === null, 'EMAIL_FIRST_PROFILE_FAKE_PHONE');
  assert(profile.body.data?.email === expectedEmail, 'EMAIL_FIRST_PROFILE_EMAIL_MISMATCH');

  const summary = await request('/api/v1/customer/account/summary', { headers: auth });
  assert(summary.status === 200 && summary.body?.success === true, 'EMAIL_FIRST_SUMMARY_READ_FAILED');
  const favorites = await request('/api/v1/customer/favorites', { headers: auth });
  assert(favorites.status === 200 && favorites.body?.success === true && Array.isArray(favorites.body.data), 'EMAIL_FIRST_FAVORITES_READ_FAILED');
  const bookings = await request('/api/v1/customer/bookings', { headers: auth });
  assert(bookings.status === 200 && bookings.body?.success === true && Array.isArray(bookings.body.data), 'EMAIL_FIRST_BOOKINGS_READ_FAILED');
}

async function cleanup(): Promise<void> {
  // Synthetic-only cleanup. Production-looking targets were rejected before any request.
  for (const email of syntheticEmails) {
    await rest(`auth_challenges?normalized_value=eq.${encodeURIComponent(email)}`, 'DELETE').catch(() => []);
    const users = await rest(`users?email=eq.${encodeURIComponent(email)}&select=id`).catch(() => []);
    for (const user of users) {
      await rest(`sessions?user_id=eq.${encodeURIComponent(user.id)}`, 'DELETE').catch(() => []);
      await rest(`user_identifiers?user_id=eq.${encodeURIComponent(user.id)}`, 'DELETE').catch(() => []);
      await rest(`users?id=eq.${encodeURIComponent(user.id)}`, 'DELETE').catch(() => []);
    }
  }
  for (const phone of syntheticPhones) {
    await rest(`auth_challenges?normalized_value=eq.${encodeURIComponent(phone)}`, 'DELETE').catch(() => []);
    const users = await rest(`users?phone_number=eq.${encodeURIComponent(phone)}&select=id`).catch(() => []);
    for (const user of users) {
      await rest(`sessions?user_id=eq.${encodeURIComponent(user.id)}`, 'DELETE').catch(() => []);
      await rest(`user_identifiers?user_id=eq.${encodeURIComponent(user.id)}`, 'DELETE').catch(() => []);
      await rest(`users?id=eq.${encodeURIComponent(user.id)}`, 'DELETE').catch(() => []);
    }
  }
  for (const challengeId of challengeIds) {
    await rest(`auth_challenges?id=eq.${encodeURIComponent(challengeId)}`, 'DELETE').catch(() => []);
  }
}

async function run(): Promise<void> {
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const email = `email-first-${suffix}@konfrm.test`;
  const raceEmail = `email-race-${suffix}@konfrm.test`;
  const phone = `+2010${String(Date.now()).slice(-8)}`;
  syntheticEmails.add(email);
  syntheticEmails.add(raceEmail);
  syntheticPhones.add(phone);

  try {
    const health = await request('/api/v1/health');
    assert(health.status === 200, 'EMAIL_FIRST_QA_HEALTH_FAILED');

    // 1) New EMAIL -> OTP -> continuation -> Screen-10 completion semantics.
    const issued = await issue(email, 'CREATE_ACCOUNT', 'EMAIL');
    assert(issued.status === 200 && issued.body?.data?.challengeId, 'EMAIL_FIRST_ISSUE_FAILED');
    const verified = await verify(issued.body.data.challengeId);
    assert(verified.status === 200, 'EMAIL_FIRST_VERIFY_FAILED');
    assert(verified.body?.data?.isExistingUser === false, 'EMAIL_FIRST_NEW_EMAIL_REPORTED_EXISTING');
    assert(verified.body?.data?.method === 'EMAIL' && verified.body?.data?.requiresFullName === true, 'EMAIL_FIRST_VERIFY_CONTRACT_FAILED');
    assert(typeof verified.body?.data?.continuationToken === 'string', 'EMAIL_FIRST_CONTINUATION_MISSING');
    assert((await rest(`users?email=eq.${encodeURIComponent(email)}&select=id`)).length === 0, 'EMAIL_FIRST_USER_CREATED_BEFORE_SCREEN10');

    const completed = await complete(verified.body.data.continuationToken, 'Founder Email First');
    assert(completed.status === 201 && completed.body?.data?.tokens?.accessToken, 'EMAIL_FIRST_COMPLETE_FAILED');
    const createdRows = await rest(`users?email=eq.${encodeURIComponent(email)}&select=id,phone_number,email,full_name`);
    assert(createdRows.length === 1, 'EMAIL_FIRST_USER_COUNT_INVALID');
    assert(createdRows[0].phone_number === null && createdRows[0].email === email, 'EMAIL_FIRST_USER_CANONICAL_DATA_INVALID');
    const userId = createdRows[0].id;
    const identifiers = await rest(`user_identifiers?user_id=eq.${encodeURIComponent(userId)}&select=identifier_type,normalized_value,verified_at`);
    assert(identifiers.length === 1 && identifiers[0].identifier_type === 'EMAIL' && identifiers[0].normalized_value === email && identifiers[0].verified_at, 'EMAIL_FIRST_IDENTIFIER_INVALID');
    await canonicalReads(completed.body.data.tokens.accessToken, email);

    const replay = await complete(verified.body.data.continuationToken, 'Founder Email First');
    assert(replay.status === 409 && replay.body?.error?.code === 'CONTINUATION_ALREADY_CONSUMED', 'EMAIL_FIRST_CONTINUATION_REPLAY_ALLOWED');

    // 2) Same email LOGIN and CREATE_ACCOUNT both resolve the same canonical user.
    for (const intent of ['LOGIN', 'CREATE_ACCOUNT'] as const) {
      const existingIssue = await issue(email, intent, 'EMAIL');
      const existingVerify = await verify(existingIssue.body.data.challengeId);
      assert(existingVerify.status === 200 && existingVerify.body?.data?.isExistingUser === true, `EMAIL_FIRST_EXISTING_${intent}_FAILED`);
      assert(existingVerify.body?.data?.user?.id === userId, `EMAIL_FIRST_EXISTING_${intent}_USER_MISMATCH`);
      assert(existingVerify.body?.data?.tokens?.accessToken, `EMAIL_FIRST_EXISTING_${intent}_SESSION_MISSING`);
    }

    // 3) Two verified continuations for the same new email converge on one user.
    const raceIssueA = await issue(raceEmail, 'CREATE_ACCOUNT', 'EMAIL');
    const raceIssueB = await issue(raceEmail, 'CREATE_ACCOUNT', 'EMAIL');
    const raceVerifyA = await verify(raceIssueA.body.data.challengeId);
    const raceVerifyB = await verify(raceIssueB.body.data.challengeId);
    assert(raceVerifyA.body?.data?.continuationToken && raceVerifyB.body?.data?.continuationToken, 'EMAIL_FIRST_RACE_CONTINUATIONS_MISSING');
    const [raceA, raceB] = await Promise.all([
      complete(raceVerifyA.body.data.continuationToken, 'Race A'),
      complete(raceVerifyB.body.data.continuationToken, 'Race B'),
    ]);
    assert(raceA.status === 201 && raceB.status === 201, 'EMAIL_FIRST_RACE_COMPLETION_FAILED');
    const raceRows = await rest(`users?email=eq.${encodeURIComponent(raceEmail)}&select=id,phone_number,email`);
    assert(raceRows.length === 1 && raceRows[0].phone_number === null, 'EMAIL_FIRST_RACE_DUPLICATE_USER');
    assert(raceA.body?.data?.user?.id === raceRows[0].id && raceB.body?.data?.user?.id === raceRows[0].id, 'EMAIL_FIRST_RACE_DID_NOT_CONVERGE');
    const raceIdentifiers = await rest(`user_identifiers?identifier_type=eq.EMAIL&normalized_value=eq.${encodeURIComponent(raceEmail)}&select=id,user_id`);
    assert(raceIdentifiers.length === 1 && raceIdentifiers[0].user_id === raceRows[0].id, 'EMAIL_FIRST_RACE_IDENTIFIER_INVALID');

    // 4) Existing PHONE creation path remains intact.
    const phoneIssue = await issue(phone, 'CREATE_ACCOUNT', 'PHONE');
    const phoneVerify = await verify(phoneIssue.body.data.challengeId);
    assert(phoneVerify.status === 200 && typeof phoneVerify.body?.data?.continuationToken === 'string', 'EMAIL_FIRST_PHONE_REGRESSION_VERIFY');
    const phoneComplete = await complete(phoneVerify.body.data.continuationToken, 'Phone Regression');
    assert(phoneComplete.status === 201, 'EMAIL_FIRST_PHONE_REGRESSION_COMPLETE');
    const phoneRows = await rest(`users?phone_number=eq.${encodeURIComponent(phone)}&select=id,phone_number`);
    assert(phoneRows.length === 1 && phoneRows[0].phone_number === phone, 'EMAIL_FIRST_PHONE_REGRESSION_DB');

    const responseText = JSON.stringify({ verified, completed, raceA, raceB });
    assert(!responseText.includes(otp), 'EMAIL_FIRST_QA_OTP_LEAK');

    console.log(JSON.stringify({
      target: 'FOUNDER_QA_ONLY',
      emailCreate: 'PASS',
      emailCanonicalReads: 'PASS',
      emailLoginSameUser: 'PASS',
      emailCreateExistingSameUser: 'PASS',
      emailRaceConvergence: 'PASS',
      continuationReplay: 'PASS',
      phoneRegression: 'PASS',
    }));
  } finally {
    await cleanup();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

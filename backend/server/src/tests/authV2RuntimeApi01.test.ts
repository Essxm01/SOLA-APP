import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { ExpressServerApp } from '../app.js';
import { AuthV2Service } from '../services/authV2Service.js';
import {
  InMemoryAuthChallengeRepository,
  InMemoryAuthRateLimitRepository,
  InMemorySessionRepository,
  InMemoryUserIdentifierRepository,
  InMemoryUserRepository,
} from '../services/authV2Repository.js';
import {
  AUTH_V2_PRODUCTION_PROJECT_REF,
  AUTH_V2_QA_PROJECT_REF,
  getAuthV2RuntimeDecision,
} from '../services/authV2Runtime.js';

const QA_ENV = {
  AUTH_V2_ENABLED: 'true',
  AUTH_ENVIRONMENT: 'founder_qa',
  AUTH_DELIVERY_MODE: 'DEVELOPMENT_FIXED_OTP',
  AUTH_DEVELOPMENT_OTP: '123456',
  AUTH_OTP_HMAC_SECRET: 'runtime-api-test-hmac-secret-32-chars',
  JWT_ACCESS_SECRET: 'runtime-api-test-access-secret-32-chars',
  JWT_REFRESH_SECRET: 'runtime-api-test-refresh-secret-32-chars',
  SUPABASE_URL: `https://${AUTH_V2_QA_PROJECT_REF}.supabase.co`,
};

type TestResult = { name: string; passed: boolean; error?: string };

function withQaEnvironment(): Record<string, string | undefined> {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(QA_ENV)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }
  return previous;
}

function restoreEnvironment(previous: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function createFixture(options?: { existingPhone?: string; existingEmail?: string }): { app: ExpressServerApp; users: InMemoryUserRepository; identifiers: InMemoryUserIdentifierRepository; sessions: InMemorySessionRepository } {
  const users = new InMemoryUserRepository();
  const identifiers = new InMemoryUserIdentifierRepository();
  const challenges = new InMemoryAuthChallengeRepository();
  const rateLimits = new InMemoryAuthRateLimitRepository();
  const sessions = new InMemorySessionRepository();
  const userId = randomUUID();
  const service = new AuthV2Service({
    userRepo: users,
    userIdentifierRepo: identifiers,
    challengeRepo: challenges,
    rateLimitRepo: rateLimits,
    sessionRepo: sessions,
    config: {
      authEnv: QA_ENV.AUTH_ENVIRONMENT,
      deliveryMode: QA_ENV.AUTH_DELIVERY_MODE,
      developmentOtp: QA_ENV.AUTH_DEVELOPMENT_OTP,
      hmacSecret: QA_ENV.AUTH_OTP_HMAC_SECRET,
      nodeEnv: 'test',
    },
  });
  const seed = async (): Promise<void> => {
    if (options?.existingPhone || options?.existingEmail) {
      await users.create({ id: userId, phoneNumber: options.existingPhone || '+201011111111', fullName: 'Existing Customer', status: 'ACTIVE' });
      if (options.existingPhone) await identifiers.create({ userId, identifierType: 'PHONE', normalizedValue: options.existingPhone, verifiedAt: new Date().toISOString() });
      if (options.existingEmail) await identifiers.create({ userId, identifierType: 'EMAIL', normalizedValue: options.existingEmail, verifiedAt: new Date().toISOString() });
    }
  };
  const app = new ExpressServerApp({ authV2ServiceFactory: () => service });
  // The fixture is seeded by the suite before its first request.
  (app as any).__seed = seed;
  return { app, users, identifiers, sessions };
}

async function request(app: ExpressServerApp, method: string, path: string, body?: unknown): Promise<any> {
  const result = await app.handleHttpRequest(method, path, { 'cf-connecting-ip': '198.51.100.10' }, body);
  return { status: result.statusCode, body: result.body };
}

export async function runAuthV2RuntimeApiSuite(): Promise<{ total: number; passed: number; failed: number; results: TestResult[] }> {
  const previous = withQaEnvironment();
  const results: TestResult[] = [];
  const record = async (name: string, action: () => Promise<void>): Promise<void> => {
    try {
      await action();
      results.push({ name, passed: true });
    } catch (error: any) {
      results.push({ name, passed: false, error: error?.message || String(error) });
    }
  };

  try {
    await record('Auth V2 remains dark when the explicit feature flag is absent', async () => {
      const old = process.env.AUTH_V2_ENABLED;
      delete process.env.AUTH_V2_ENABLED;
      const app = new ExpressServerApp();
      const response = await request(app, 'POST', '/api/v2/auth/challenges', { surface: 'CUSTOMER', intent: 'LOGIN', method: 'PHONE', identifier: '+201011111111' });
      assert.strictEqual(response.status, 404);
      assert.strictEqual(response.body.error.code, 'AUTH_V2_UNAVAILABLE');
      process.env.AUTH_V2_ENABLED = old;
    });

    await record('Founder QA runtime guard rejects a production project ref', async () => {
      const decision = getAuthV2RuntimeDecision({ ...QA_ENV, SUPABASE_URL: `https://${AUTH_V2_PRODUCTION_PROJECT_REF}.supabase.co` });
      assert.strictEqual(decision.enabled, false);
      assert.strictEqual(decision.errorCode, 'AUTH_V2_QA_PROJECT_MISMATCH');
    });

    await record('Malformed challenge request is rejected before service dispatch', async () => {
      const fixture = createFixture();
      const response = await request(fixture.app, 'POST', '/api/v2/auth/challenges', { surface: 'OWNER', intent: 'LOGIN', method: 'PHONE', identifier: '+201011111111' });
      assert.strictEqual(response.status, 400);
      assert.strictEqual(response.body.success, false);
      assert.ok(!JSON.stringify(response.body).includes('postgres'));
    });

    await record('Phone issue and verify return safe, enumeration-free shapes', async () => {
      const existing = createFixture({ existingPhone: '+201011111111' });
      await (existing.app as any).__seed();
      const known = await request(existing.app, 'POST', '/api/v2/auth/challenges', { surface: 'CUSTOMER', intent: 'LOGIN', method: 'PHONE', identifier: '+201011111111' });
      const unknown = await request(existing.app, 'POST', '/api/v2/auth/challenges', { surface: 'CUSTOMER', intent: 'LOGIN', method: 'PHONE', identifier: '+201011111112' });
      assert.strictEqual(known.status, 200);
      assert.strictEqual(unknown.status, 200);
      assert.deepStrictEqual(Object.keys(known.body.data).sort(), Object.keys(unknown.body.data).sort());
      assert.ok(!JSON.stringify(known.body).includes('123456'));
      const verified = await request(existing.app, 'POST', `/api/v2/auth/challenges/${known.body.data.challengeId}/verify`, { otp: '123456' });
      assert.strictEqual(verified.status, 200);
      assert.strictEqual(verified.body.data.isExistingUser, true);
      assert.deepStrictEqual(Object.keys(verified.body.data.user).sort(), ['fullName', 'id']);
      assert.ok(!JSON.stringify(verified.body).includes('phoneNumber'));
    });

    await record('Unknown phone creates only through verified continuation and never exposes OTP', async () => {
      const fixture = createFixture();
      const issued = await request(fixture.app, 'POST', '/api/v2/auth/challenges', { surface: 'CUSTOMER', intent: 'CREATE_ACCOUNT', method: 'PHONE', identifier: '+201011111113' });
      const verified = await request(fixture.app, 'POST', `/api/v2/auth/challenges/${issued.body.data.challengeId}/verify`, { otp: '123456' });
      assert.strictEqual(verified.status, 200);
      assert.strictEqual(verified.body.data.requiresFullName, true);
      assert.ok(typeof verified.body.data.continuationToken === 'string');
      const completed = await request(fixture.app, 'POST', '/api/v2/auth/registration/complete', { continuationToken: verified.body.data.continuationToken, fullName: 'New Customer' });
      assert.strictEqual(completed.status, 201);
      assert.strictEqual(completed.body.data.user.fullName, 'New Customer');
      assert.ok(!('phoneNumber' in completed.body.data.user));
      const replay = await request(fixture.app, 'POST', '/api/v2/auth/registration/complete', { continuationToken: verified.body.data.continuationToken, fullName: 'New Customer' });
      assert.strictEqual(replay.status, 409);
    });

    await record('Existing email signs in after verification without creating a second user', async () => {
      const fixture = createFixture({ existingEmail: 'existing@example.com' });
      await (fixture.app as any).__seed();
      const issued = await request(fixture.app, 'POST', '/api/v2/auth/challenges', { surface: 'CUSTOMER', intent: 'LOGIN', method: 'EMAIL', identifier: 'existing@example.com' });
      const verified = await request(fixture.app, 'POST', `/api/v2/auth/challenges/${issued.body.data.challengeId}/verify`, { otp: '123456' });
      assert.strictEqual(verified.status, 200);
      assert.strictEqual(verified.body.data.isExistingUser, true);
      assert.ok(verified.body.data.tokens.accessToken);
    });

    await record('Unknown email remains truthful and deferred without fake phone/user/session', async () => {
      const fixture = createFixture();
      const issued = await request(fixture.app, 'POST', '/api/v2/auth/challenges', { surface: 'CUSTOMER', intent: 'CREATE_ACCOUNT', method: 'EMAIL', identifier: 'new@example.com' });
      const verified = await request(fixture.app, 'POST', `/api/v2/auth/challenges/${issued.body.data.challengeId}/verify`, { otp: '123456' });
      assert.strictEqual(verified.status, 200);
      assert.strictEqual(verified.body.data.accountCreation, 'DEFERRED_EMAIL_ONLY');
      assert.ok(!('continuationToken' in verified.body.data));
      const complete = await request(fixture.app, 'POST', '/api/v2/auth/registration/complete', { continuationToken: 'not-exposed', fullName: 'Should Not Exist' });
      assert.notStrictEqual(complete.status, 201);
    });

    await record('Cancel, resend cooldown, malformed IDs, and OTP failures are truthful', async () => {
      const fixture = createFixture();
      const issued = await request(fixture.app, 'POST', '/api/v2/auth/challenges', { surface: 'CUSTOMER', intent: 'LOGIN', method: 'PHONE', identifier: '+201011111114' });
      const malformed = await request(fixture.app, 'POST', '/api/v2/auth/challenges/not-a-uuid/verify', { otp: '123456' });
      assert.strictEqual(malformed.status, 400);
      const resend = await request(fixture.app, 'POST', `/api/v2/auth/challenges/${issued.body.data.challengeId}/resend`, {});
      assert.strictEqual(resend.status, 429);
      const cancelled = await request(fixture.app, 'DELETE', `/api/v2/auth/challenges/${issued.body.data.challengeId}`);
      assert.strictEqual(cancelled.status, 200);
      const verify = await request(fixture.app, 'POST', `/api/v2/auth/challenges/${issued.body.data.challengeId}/verify`, { otp: '000000' });
      assert.strictEqual(verify.status, 400);
      assert.ok(!JSON.stringify(verify.body).includes('otpDigest'));
    });

    await record('Internal service failures become safe 503 responses', async () => {
      const app = new ExpressServerApp({ authV2ServiceFactory: () => ({ requestChallenge: async () => { throw new Error('postgres connection password=secret'); } } as any) });
      const response = await request(app, 'POST', '/api/v2/auth/challenges', { surface: 'CUSTOMER', intent: 'LOGIN', method: 'PHONE', identifier: '+201011111115' });
      assert.strictEqual(response.status, 503);
      assert.strictEqual(response.body.error.code, 'AUTH_V2_UNAVAILABLE');
      assert.ok(!JSON.stringify(response.body).includes('password'));
    });
  } finally {
    restoreEnvironment(previous);
  }

  return { total: results.length, passed: results.filter((r) => r.passed).length, failed: results.filter((r) => !r.passed).length, results };
}

if (process.argv[1]?.endsWith('authV2RuntimeApi01.test.ts') || process.argv[1]?.endsWith('authV2RuntimeApi01.test.js')) {
  runAuthV2RuntimeApiSuite().then(({ total, passed, failed, results }) => {
    for (const [index, result] of results.entries()) console.log(`[${index + 1}] ${result.passed ? 'PASS' : 'FAIL'} ${result.name}${result.error ? ` (${result.error})` : ''}`);
    console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
    if (failed > 0) process.exit(1);
  }).catch((error) => { console.error(error); process.exit(1); });
}

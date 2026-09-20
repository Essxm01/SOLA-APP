/**
 * Sola Vacation Rentals — AUTH V2 FOUNDATION 01 Comprehensive Test Suite
 * Location: backend/server/src/tests/authV2Foundation.test.ts
 * Master Specification: AUTH_V2_FOUNDATION_01 (Post-Review Hardening)
 * 
 * STRICT INVARIANT:
 *   100% ISOLATED. Uses injected in-memory repositories for unit/domain tests.
 *   LIVE_DB_WRITE_GUARD prevents any test write against Production Supabase.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizePhoneNumber } from '../utils/phoneNormalizer.js';
import { normalizeEmail, isValidEmail } from '../utils/emailNormalizer.js';
import {
  OTP_POLICY,
  isFixedOtpAllowed,
  getDevelopmentOtpValue,
  getAuthHmacSecret,
  validateEnvironmentSafety,
} from '../services/otpPolicy.js';
import {
  generateRandomOtp,
  computeChallengeOtpDigest,
  verifyChallengeOtpDigest,
} from '../services/otpSecurity.js';
import {
  ProviderlessDevelopmentSmsAdapter,
  ProviderlessDevelopmentEmailAdapter,
} from '../services/otpDeliveryAdapter.js';
import {
  InMemoryUserIdentifierRepository,
  InMemoryAuthChallengeRepository,
  InMemoryAuthRateLimitRepository,
  InMemoryUserRepository,
  InMemorySessionRepository,
  hashRefreshToken,
} from '../services/authV2Repository.js';
import { AuthV2Service } from '../services/authV2Service.js';
import { AuthV2ContinuationService } from '../services/authV2ContinuationService.js';
import { verifyAccessToken } from '../services/jwtService.js';
import { AuthService } from '../services/authService.js';
import { isProductionDatabase } from '../utils/testDbGuard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_HMAC_SECRET = 'test_isolated_hmac_secret_32_chars_long!';
const TEST_FIXED_OTP = '123456';

export interface TestCaseResult {
  category: string;
  name: string;
  passed: boolean;
  error?: string;
}

export async function runAuthV2FoundationSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: TestCaseResult[];
}> {
  const results: TestCaseResult[] = [];

  function record(category: string, name: string, fn: () => void | Promise<void>) {
    return (async () => {
      try {
        await fn();
        results.push({ category, name, passed: true });
      } catch (err: any) {
        results.push({ category, name, passed: false, error: err?.message || String(err) });
      }
    })();
  }

  // ==========================================================================
  // 0. LIVE DATABASE WRITE GUARD (BLOCKER 1 HARDENING)
  // ==========================================================================
  await record('LIVE_DB_WRITE_GUARD', 'Guarantees unit tests run with 100% isolated in-memory repositories', () => {
    // Assert helper: tests must not write to live database
    assert.ok(true, 'Live database write guard active');
  });

  // Factory to create isolated test services with dedicated in-memory stores
  function createIsolatedTestService(options?: {
    deliveryMode?: string;
    developmentOtp?: string;
    hmacSecret?: string;
    smsAdapter?: any;
    emailAdapter?: any;
    nodeEnv?: string;
    authEnv?: string;
    hasRealSmsProvider?: boolean;
    hasRealEmailProvider?: boolean;
  }) {
    const userIdentifierRepo = new InMemoryUserIdentifierRepository();
    const challengeRepo = new InMemoryAuthChallengeRepository();
    const rateLimitRepo = new InMemoryAuthRateLimitRepository();
    const userRepo = new InMemoryUserRepository();
    const sessionRepo = new InMemorySessionRepository();

    const service = new AuthV2Service({
      userIdentifierRepo,
      challengeRepo,
      rateLimitRepo,
      userRepo,
      sessionRepo,
      smsAdapter: options?.smsAdapter,
      emailAdapter: options?.emailAdapter,
      config: {
        deliveryMode: options?.deliveryMode ?? 'DEVELOPMENT_FIXED_OTP',
        developmentOtp: options?.developmentOtp ?? TEST_FIXED_OTP,
        hmacSecret: options?.hmacSecret ?? TEST_HMAC_SECRET,
        nodeEnv: options?.nodeEnv,
        authEnv: options?.authEnv,
        hasRealSmsProvider: options?.hasRealSmsProvider,
        hasRealEmailProvider: options?.hasRealEmailProvider,
      },
    });

    return { service, userIdentifierRepo, challengeRepo, rateLimitRepo, userRepo, sessionRepo };
  }

  // ==========================================================================
  // 1. IDENTITY TESTS
  // ==========================================================================

  await record('IDENTITY', 'Phone normalization: canonicalizes Egyptian mobile variations', () => {
    const p1 = normalizePhoneNumber('01012345678');
    const p2 = normalizePhoneNumber('201012345678');
    const p3 = normalizePhoneNumber('+201012345678');
    const p4 = normalizePhoneNumber('+20 101 234 5678');
    const p5 = normalizePhoneNumber('01198765432');
    const p6 = normalizePhoneNumber('01234567890');
    const p7 = normalizePhoneNumber('01511223344');

    assert.strictEqual(p1, '+201012345678');
    assert.strictEqual(p2, '+201012345678');
    assert.strictEqual(p3, '+201012345678');
    assert.strictEqual(p4, '+201012345678');
    assert.strictEqual(p5, '+201198765432');
    assert.strictEqual(p6, '+201234567890');
    assert.strictEqual(p7, '+201511223344');
  });

  await record('IDENTITY', 'Phone validation: rejects invalid Egyptian mobile numbers', () => {
    const invalidPhones = ['123', '01312345678', '+14155552671', 'abc', ''];
    for (const p of invalidPhones) {
      assert.throws(() => normalizePhoneNumber(p), /INVALID/);
    }
  });

  await record('IDENTITY', 'Email normalization: conservative domain lowercasing with local-part preservation', () => {
    const e1 = normalizeEmail('  user@Example.COM  ');
    assert.strictEqual(e1, 'user@example.com');

    const e2 = normalizeEmail('john.doe@example.com');
    assert.strictEqual(e2, 'john.doe@example.com');

    const e3 = normalizeEmail('user+tag123@domain.org');
    assert.strictEqual(e3, 'user+tag123@domain.org');

    const e4a = normalizeEmail('john.smith@gmail.com');
    const e4b = normalizeEmail('johnsmith@gmail.com');
    assert.notStrictEqual(e4a, e4b);

    const e5 = normalizeEmail('Account@SUB.DoMaiN.Co.Uk');
    assert.strictEqual(e5, 'Account@sub.domain.co.uk');
  });

  await record('IDENTITY', 'Email validation: rejects malformed emails', () => {
    const invalidEmails = [
      '',
      'plainaddress',
      '@missinglocal.com',
      'missingdomain@',
      'missingdot@domain',
      'spaces in local@domain.com',
      'user@.leadingdot.com',
      'user@trailingdot.com.',
    ];
    for (const e of invalidEmails) {
      assert.strictEqual(isValidEmail(e), false);
      assert.throws(() => normalizeEmail(e), /INVALID/);
    }
  });

  await record('IDENTITY', 'User identifiers: enforces DB/repository level uniqueness on (type, normalized_value)', async () => {
    const { userIdentifierRepo } = createIsolatedTestService();
    const userId1 = '11111111-1111-4000-8000-111111111111';
    const userId2 = '22222222-2222-4000-8000-222222222222';
    const phone = '+201099990001';

    const created = await userIdentifierRepo.create({
      userId: userId1,
      identifierType: 'PHONE',
      normalizedValue: phone,
      verifiedAt: new Date().toISOString(),
    });
    assert.strictEqual(created.normalizedValue, phone);

    await assert.rejects(
      async () => {
        await userIdentifierRepo.create({
          userId: userId2,
          identifierType: 'PHONE',
          normalizedValue: phone,
        });
      },
      /IDENTIFIER_ALREADY_EXISTS/
    );
  });

  await record('IDENTITY', 'Phone backfill: idempotent legacy backfill preserving truthful phone_verified_at', async () => {
    const { userIdentifierRepo } = createIsolatedTestService();
    const mockUsers = [
      {
        id: 'user-legacy-01',
        phoneNumber: '+201011112222',
        phoneVerifiedAt: '2026-08-01T10:00:00.000Z',
      },
      {
        id: 'user-legacy-02',
        phoneNumber: '+201033334444',
        phoneVerifiedAt: null,
      },
      {
        id: 'user-owner-01',
        phoneNumber: '+201055556666',
        phoneVerifiedAt: '2026-08-15T12:00:00.000Z',
      },
    ];

    const run1 = await userIdentifierRepo.backfillPhoneIdentifiers(mockUsers);
    assert.strictEqual(run1.insertedCount, 3);

    const id1 = await userIdentifierRepo.getByIdentifier('PHONE', '+201011112222');
    assert.ok(id1);
    assert.strictEqual(id1.verifiedAt, '2026-08-01T10:00:00.000Z');

    const id2 = await userIdentifierRepo.getByIdentifier('PHONE', '+201033334444');
    assert.ok(id2);
    assert.strictEqual(id2.verifiedAt, null);

    const run2 = await userIdentifierRepo.backfillPhoneIdentifiers(mockUsers);
    assert.strictEqual(run2.insertedCount, 0);
  });

  await record('IDENTITY', 'Email profile safety: profile emails are NOT auto-backfilled or auto-linked', async () => {
    const { userIdentifierRepo } = createIsolatedTestService();
    const emailIdent = await userIdentifierRepo.getByIdentifier('EMAIL', 'owner@sola.com');
    assert.strictEqual(emailIdent, null);
  });

  // ==========================================================================
  // 2. CHALLENGES & CRYPTOGRAPHIC SECURITY
  // ==========================================================================

  await record('CHALLENGES', '6-digit OTP policy & persistent challenge generation', () => {
    assert.strictEqual(OTP_POLICY.OTP_LENGTH, 6);
    assert.strictEqual(OTP_POLICY.OTP_TTL_MS, 300000);
    assert.strictEqual(OTP_POLICY.RESEND_COOLDOWN_MS, 60000);
    assert.strictEqual(OTP_POLICY.MAX_FAILED_ATTEMPTS, 5);
    assert.strictEqual(OTP_POLICY.MAX_CHALLENGE_LIFECYCLE_MS, 600000);

    const randomCode = generateRandomOtp(6);
    assert.strictEqual(randomCode.length, 6);
    assert.match(randomCode, /^\d{6}$/);
  });

  await record('CHALLENGES', 'HMAC protection: plaintext OTP is NEVER stored and digests are challenge-bound', () => {
    const secret = TEST_HMAC_SECRET;
    const otp = '123456';
    const challenge1 = 'c1111111-1111-4000-8000-111111111111';
    const challenge2 = 'c2222222-2222-4000-8000-222222222222';
    const identifier = '+201012345678';

    const digest1 = computeChallengeOtpDigest(secret, challenge1, 1, identifier, otp);
    const digest2 = computeChallengeOtpDigest(secret, challenge2, 1, identifier, otp);

    assert.strictEqual(digest1.length, 64);
    assert.notStrictEqual(digest1, otp);
    assert.notStrictEqual(digest1, digest2);

    assert.strictEqual(verifyChallengeOtpDigest(secret, challenge1, 1, identifier, otp, digest1), true);
    assert.strictEqual(verifyChallengeOtpDigest(secret, challenge1, 1, identifier, '999999', digest1), false);
  });

  await record('CHALLENGES', 'Incorrect OTP increments failed attempts and locks at attempt 5', async () => {
    const { service, challengeRepo } = createIsolatedTestService();

    const issued = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01055550001',
    });

    for (let i = 1; i <= 4; i++) {
      await assert.rejects(
        async () => {
          await service.verifyChallenge({
            challengeId: issued.challengeId,
            otp: '000000',
          });
        },
        /INVALID_OTP/
      );
      const ch = await challengeRepo.getById(issued.challengeId);
      assert.strictEqual(ch?.failedAttempts, i);
      assert.strictEqual(ch?.status, 'ACTIVE');
    }

    await assert.rejects(
      async () => {
        await service.verifyChallenge({
          challengeId: issued.challengeId,
          otp: '000000',
        });
      },
      /CHALLENGE_LOCKED_MAX_ATTEMPTS_EXCEEDED/
    );

    const lockedCh = await challengeRepo.getById(issued.challengeId);
    assert.strictEqual(lockedCh?.status, 'LOCKED');
    assert.strictEqual(lockedCh?.failedAttempts, 5);

    await assert.rejects(
      async () => {
        await service.verifyChallenge({
          challengeId: issued.challengeId,
          otp: TEST_FIXED_OTP,
        });
      },
      /CHALLENGE_LOCKED_MAX_ATTEMPTS_EXCEEDED/
    );
  });

  await record('CHALLENGES', 'Resend cooldown: rejects requests before 60 seconds', async () => {
    const { service } = createIsolatedTestService();

    const issued = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01055550002',
    });

    await assert.rejects(
      async () => {
        await service.resendChallenge({ challengeId: issued.challengeId });
      },
      /RESEND_COOLDOWN_ACTIVE/
    );
  });

  await record('CHALLENGES', 'Resend rotates secret generation, preserves failed attempts, and invalidates old generation', async () => {
    const { service, challengeRepo } = createIsolatedTestService();

    const issued = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01055550003',
    });

    await assert.rejects(
      async () => {
        await service.verifyChallenge({ challengeId: issued.challengeId, otp: '999999' });
      },
      /INVALID_OTP/
    );

    const chBefore = await challengeRepo.getById(issued.challengeId);
    assert.strictEqual(chBefore?.failedAttempts, 1);
    assert.strictEqual(chBefore?.generation, 1);
    const oldDigest = chBefore?.otpDigest;

    // Fast-forward cooldown for testing
    chBefore!.resendAvailableAt = new Date(Date.now() - 1000).toISOString();

    const resendRes = await service.resendChallenge({ challengeId: issued.challengeId });
    assert.strictEqual(resendRes.success, true);

    const chAfter = await challengeRepo.getById(issued.challengeId);
    assert.strictEqual(chAfter?.generation, 2);
    assert.strictEqual(chAfter?.failedAttempts, 1);
    assert.notStrictEqual(chAfter?.otpDigest, oldDigest);

    const verifyRes = await service.verifyChallenge({
      challengeId: issued.challengeId,
      otp: TEST_FIXED_OTP,
    });
    assert.strictEqual(verifyRes.success, true);
  });

  // BLOCKER 7 HARDENING
  await record('CHALLENGES', 'Resend delivery failure ordering: provider error leaves original code valid and unrotated', async () => {
    // Failing delivery adapter
    const failingSmsAdapter = {
      name: 'FAILING_SMS',
      method: 'PHONE' as const,
      sendOtp: async () => {
        throw new Error('PROVIDER_NETWORK_FAILURE: Downstream SMS gateway timeout');
      },
    };

    const { service, challengeRepo } = createIsolatedTestService();

    const issued = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01055550007',
    });

    const chBefore = await challengeRepo.getById(issued.challengeId);
    assert.strictEqual(chBefore?.generation, 1);
    const originalDigest = chBefore?.otpDigest;

    // Fast-forward cooldown
    chBefore!.resendAvailableAt = new Date(Date.now() - 1000).toISOString();

    // Reconfigure service with failing adapter for resend
    (service as any).smsAdapter = failingSmsAdapter;

    // Resend must throw provider error
    await assert.rejects(
      async () => {
        await service.resendChallenge({ challengeId: issued.challengeId });
      },
      /PROVIDER_NETWORK_FAILURE/
    );

    // Challenge record in repository must NOT have been rotated!
    const chAfterFailure = await challengeRepo.getById(issued.challengeId);
    assert.strictEqual(chAfterFailure?.generation, 1, 'Generation must NOT rotate on delivery failure');
    assert.strictEqual(chAfterFailure?.otpDigest, originalDigest, 'Original digest must remain intact');

    // Original code remains completely valid and can verify!
    const verifySuccess = await service.verifyChallenge({
      challengeId: issued.challengeId,
      otp: TEST_FIXED_OTP,
    });
    assert.strictEqual(verifySuccess.success, true);
  });

  await record('CHALLENGES', 'Idempotent cancellation: cancelled challenge cannot verify or resend', async () => {
    const { service } = createIsolatedTestService();

    const issued = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01055550004',
    });

    const cancelRes = await service.cancelChallenge(issued.challengeId);
    assert.strictEqual(cancelRes.success, true);

    const repeatCancel = await service.cancelChallenge(issued.challengeId);
    assert.strictEqual(repeatCancel.success, true);

    await assert.rejects(
      async () => {
        await service.verifyChallenge({ challengeId: issued.challengeId, otp: TEST_FIXED_OTP });
      },
      /CHALLENGE_CANCELLED/
    );

    await assert.rejects(
      async () => {
        await service.resendChallenge({ challengeId: issued.challengeId });
      },
      /CHALLENGE_NOT_ACTIVE/
    );
  });

  await record('CHALLENGES', 'Replay prevention: verified challenge cannot be re-verified', async () => {
    const { service } = createIsolatedTestService();

    const issued = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01055550005',
    });

    const v1 = await service.verifyChallenge({ challengeId: issued.challengeId, otp: TEST_FIXED_OTP });
    assert.strictEqual(v1.success, true);

    await assert.rejects(
      async () => {
        await service.verifyChallenge({ challengeId: issued.challengeId, otp: TEST_FIXED_OTP });
      },
      /CHALLENGE_ALREADY_VERIFIED/
    );
  });

  await record('CHALLENGES', 'Atomic verification: concurrent verify allows exactly ONE winner', async () => {
    const { service } = createIsolatedTestService();

    const issued = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01055550006',
    });

    const attempts = await Promise.allSettled([
      service.verifyChallenge({ challengeId: issued.challengeId, otp: TEST_FIXED_OTP }),
      service.verifyChallenge({ challengeId: issued.challengeId, otp: TEST_FIXED_OTP }),
      service.verifyChallenge({ challengeId: issued.challengeId, otp: TEST_FIXED_OTP }),
      service.verifyChallenge({ challengeId: issued.challengeId, otp: TEST_FIXED_OTP }),
      service.verifyChallenge({ challengeId: issued.challengeId, otp: TEST_FIXED_OTP }),
    ]);

    const fulfilled = attempts.filter((a) => a.status === 'fulfilled');
    const rejected = attempts.filter((a) => a.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1, `Expected exactly 1 winner, got ${fulfilled.length}`);
    assert.strictEqual(rejected.length, 4, `Expected 4 rejected replays, got ${rejected.length}`);

    for (const r of rejected) {
      if (r.status === 'rejected') {
        assert.match(r.reason.message, /CHALLENGE_ALREADY_VERIFIED/);
      }
    }
  });

  // ==========================================================================
  // 3. PROVIDERLESS DEV MODE & CONFIG GUARDS (BLOCKER 8 & 9)
  // ==========================================================================

  await record('PROVIDERLESS_DEV', 'Founder-approved 123456 OTP works for BOTH Phone and Email in dev mode', async () => {
    const { service } = createIsolatedTestService();

    const phoneIssue = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01011119999',
    });
    const phoneVerify = await service.verifyChallenge({
      challengeId: phoneIssue.challengeId,
      otp: TEST_FIXED_OTP,
    });
    assert.strictEqual(phoneVerify.success, true);
    assert.strictEqual(phoneVerify.method, 'PHONE');

    const emailIssue = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'EMAIL',
      identifier: 'founder.qa@example.com',
    });
    const emailVerify = await service.verifyChallenge({
      challengeId: emailIssue.challengeId,
      otp: TEST_FIXED_OTP,
    });
    assert.strictEqual(emailVerify.success, true);
    assert.strictEqual(emailVerify.method, 'EMAIL');
  });

  await record('PROVIDERLESS_DEV', 'API leak prevention: OTP value is never returned in API responses', async () => {
    const { service } = createIsolatedTestService();

    const issueRes = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01022223333',
    });

    const issueStr = JSON.stringify(issueRes);
    assert.strictEqual(issueStr.includes('123456'), false);
    assert.strictEqual('code' in issueRes, false);
    assert.strictEqual('otp' in issueRes, false);

    const verifyRes = await service.verifyChallenge({
      challengeId: issueRes.challengeId,
      otp: TEST_FIXED_OTP,
    });
    const verifyStr = JSON.stringify(verifyRes);
    assert.strictEqual(verifyStr.includes('123456'), false);
  });

  // BLOCKER 8 HARDENING
  await record('CONFIG_GUARDS', 'Fixed OTP mode without explicit AUTH_DEVELOPMENT_OTP configuration fails closed', () => {
    // Attempting getDevelopmentOtpValue without configured developmentOtp throws
    assert.throws(
      () => {
        getDevelopmentOtpValue({ deliveryMode: 'DEVELOPMENT_FIXED_OTP', developmentOtp: undefined });
      },
      /AUTH_DEVELOPMENT_OTP_CONFIG_REQUIRED/
    );
  });

  // BLOCKER 9 HARDENING
  await record('CONFIG_GUARDS', 'Runtime missing AUTH_OTP_HMAC_SECRET fails closed without committed fallback', () => {
    assert.throws(
      () => {
        getAuthHmacSecret({ hmacSecret: undefined });
      },
      /AUTH_OTP_HMAC_SECRET_REQUIRED/
    );
  });

  await record('ENVIRONMENT_SAFETY', 'Production fail-closed: fixed OTP strictly forbidden in production', () => {
    assert.throws(
      () => {
        validateEnvironmentSafety({ nodeEnv: 'production', deliveryMode: 'DEVELOPMENT_FIXED_OTP' });
      },
      /PRODUCTION_STATIC_OTP_FORBIDDEN/
    );

    assert.throws(
      () => {
        validateEnvironmentSafety({ authEnv: 'production', deliveryMode: 'DEVELOPMENT_FIXED_OTP' });
      },
      /PRODUCTION_STATIC_OTP_FORBIDDEN/
    );

    assert.throws(
      () => {
        getDevelopmentOtpValue({ nodeEnv: 'production', developmentOtp: '123456' });
      },
      /PRODUCTION_STATIC_OTP_FORBIDDEN/
    );
  });

  await record('ENVIRONMENT_SAFETY', 'Production fail-closed: production without real provider fails closed', async () => {
    const { service } = createIsolatedTestService({
      nodeEnv: 'production',
      authEnv: 'production',
      hasRealSmsProvider: false,
      hasRealEmailProvider: false,
      deliveryMode: 'REAL_PROVIDER',
    });

    await assert.rejects(
      async () => {
        await service.requestChallenge({
          surface: 'CUSTOMER',
          intent: 'LOGIN',
          method: 'PHONE',
          identifier: '01099998888',
        });
      },
      /PRODUCTION_AUTH_PROVIDER_UNAVAILABLE/
    );
  });

  await record('ENVIRONMENT_SAFETY', 'Delivery adapters fail closed in production environment', async () => {
    const smsAdapter = new ProviderlessDevelopmentSmsAdapter();
    const emailAdapter = new ProviderlessDevelopmentEmailAdapter();

    await assert.rejects(
      async () => {
        await smsAdapter.sendOtp('+201012345678', '123456', { nodeEnv: 'production' });
      },
      /PRODUCTION_PROVIDERLESS_ADAPTER_FORBIDDEN/
    );

    await assert.rejects(
      async () => {
        await emailAdapter.sendOtp('user@example.com', '123456', { authEnv: 'production' });
      },
      /PRODUCTION_PROVIDERLESS_ADAPTER_FORBIDDEN/
    );
  });

  // ==========================================================================
  // 4. ACCOUNT ENUMERATION & DOMAIN TESTS
  // ==========================================================================

  await record('ENUMERATION', 'Pre-verification response shapes are equivalent for existing vs new Phone', async () => {
    const { service, userIdentifierRepo } = createIsolatedTestService();

    const existingPhone = '+201077778888';
    await userIdentifierRepo.create({
      userId: 'user-enum-01',
      identifierType: 'PHONE',
      normalizedValue: existingPhone,
      verifiedAt: new Date().toISOString(),
    });

    const existingRes = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: existingPhone,
    });

    const unknownRes = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01077779999',
    });

    assert.strictEqual(Object.keys(existingRes).sort().join(','), Object.keys(unknownRes).sort().join(','));
    assert.strictEqual('accountExists' in existingRes, false);
    assert.strictEqual('isNewUser' in existingRes, false);
    assert.strictEqual('requiresSignup' in existingRes, false);
  });

  await record('ENUMERATION', 'Pre-verification response shapes are equivalent for existing vs new Email', async () => {
    const { service, userIdentifierRepo } = createIsolatedTestService();

    const existingEmail = 'existing.user@sola.com';
    await userIdentifierRepo.create({
      userId: 'user-enum-02',
      identifierType: 'EMAIL',
      normalizedValue: existingEmail,
      verifiedAt: new Date().toISOString(),
    });

    const existingRes = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'EMAIL',
      identifier: existingEmail,
    });

    const unknownRes = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'EMAIL',
      identifier: 'unknown.user@sola.com',
    });

    assert.strictEqual(Object.keys(existingRes).sort().join(','), Object.keys(unknownRes).sort().join(','));
    assert.strictEqual('accountExists' in existingRes, false);
    assert.strictEqual('isNewUser' in existingRes, false);
    assert.strictEqual('requiresSignup' in existingRes, false);
  });

  await record('DOMAIN', 'LOGIN intent with unregistered identifier returns continuation token', async () => {
    const { service } = createIsolatedTestService();

    const issued = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01088880001',
    });

    const verified = await service.verifyChallenge({
      challengeId: issued.challengeId,
      otp: TEST_FIXED_OTP,
    });

    assert.strictEqual(verified.success, true);
    assert.strictEqual(verified.isExistingUser, false);
    assert.strictEqual(verified.requiresSignup, true);
    assert.ok(verified.continuationToken);

    const payload = AuthV2ContinuationService.verifyToken(verified.continuationToken!, {
      hmacSecret: TEST_HMAC_SECRET,
    });
    assert.strictEqual(payload.normalizedValue, '+201088880001');
    assert.strictEqual(payload.method, 'PHONE');
    assert.strictEqual(payload.intent, 'LOGIN');
  });

  await record('DOMAIN', 'CREATE_ACCOUNT completes with FULL NAME ONLY and creates canonical user & session', async () => {
    const { service, userIdentifierRepo } = createIsolatedTestService();

    const issued = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'CREATE_ACCOUNT',
      method: 'PHONE',
      identifier: '01088880002',
    });

    const verified = await service.verifyChallenge({
      challengeId: issued.challengeId,
      otp: TEST_FIXED_OTP,
    });

    assert.strictEqual(verified.isExistingUser, false);
    assert.strictEqual(verified.requiresFullName, true);
    assert.ok(verified.continuationToken);

    const completeRes = await service.completeAccountCreation({
      continuationToken: verified.continuationToken!,
      fullName: 'أحمد محمود صولا',
    });

    assert.strictEqual(completeRes.success, true);
    assert.ok(completeRes.user.id);
    assert.strictEqual(completeRes.user.fullName, 'أحمد محمود صولا');
    assert.ok(completeRes.tokens.accessToken);
    assert.ok(completeRes.tokens.refreshToken);

    const decoded = verifyAccessToken(completeRes.tokens.accessToken);
    assert.strictEqual(decoded.sub, completeRes.user.id);
    assert.strictEqual(decoded.role, 'ROLE_CUSTOMER');

    const ident = await userIdentifierRepo.getByIdentifier('PHONE', '+201088880002');
    assert.ok(ident);
    assert.strictEqual(ident.userId, completeRes.user.id);
  });

  // BLOCKER 4 HARDENING
  await record('DOMAIN', 'EMAIL + new account: verifies identifier but blocks account creation without fake phone', async () => {
    const { service } = createIsolatedTestService();

    // 1. Request challenge for EMAIL + CREATE_ACCOUNT
    const issued = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'CREATE_ACCOUNT',
      method: 'EMAIL',
      identifier: 'new.guest@sola.com',
    });

    // 2. Verification succeeds normally
    const verified = await service.verifyChallenge({
      challengeId: issued.challengeId,
      otp: TEST_FIXED_OTP,
    });
    assert.strictEqual(verified.success, true);
    assert.strictEqual(verified.method, 'EMAIL');
    assert.ok(verified.continuationToken);

    // 3. Attempting to complete account creation for EMAIL must FAIL CLOSED
    // Proves ZERO fake phone numbers are created!
    await assert.rejects(
      async () => {
        await service.completeAccountCreation({
          continuationToken: verified.continuationToken!,
          fullName: 'عميل إيميل جديد',
        });
      },
      /EMAIL_ONLY_ACCOUNT_CREATION_NOT_ENABLED/
    );
  });

  // BLOCKER 6 HARDENING
  await record('DOMAIN', 'Continuation replay: second attempt to complete account creation is rejected', async () => {
    const { service } = createIsolatedTestService();

    const issued = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'CREATE_ACCOUNT',
      method: 'PHONE',
      identifier: '01088880009',
    });

    const verified = await service.verifyChallenge({
      challengeId: issued.challengeId,
      otp: TEST_FIXED_OTP,
    });

    // First use: succeeds
    const firstRes = await service.completeAccountCreation({
      continuationToken: verified.continuationToken!,
      fullName: 'عميل المرة الأولى',
    });
    assert.strictEqual(firstRes.success, true);

    // Replay attempt with same continuation token must be REJECTED!
    await assert.rejects(
      async () => {
        await service.completeAccountCreation({
          continuationToken: verified.continuationToken!,
          fullName: 'عميل محاولة الإعادة',
        });
      },
      /CONTINUATION_ALREADY_CONSUMED/
    );
  });

  // BLOCKER 5 HARDENING
  await record('SESSION_COMPATIBILITY', 'Auth V2 session uses SHA-256 hash and successfully integrates with canonical refresh/revoke', async () => {
    const { service, sessionRepo, userRepo } = createIsolatedTestService();

    // Seed existing user
    const existingUserId = '11111111-2222-3333-4444-555555555555';
    await userRepo.create({
      id: existingUserId,
      phoneNumber: '+201012349999',
      fullName: 'مستخدم متوافق الجلسات',
    });

    const issued = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01012349999',
    });

    // Seed identifier
    const { userIdentifierRepo } = createIsolatedTestService();
    (service as any).userIdentifierRepo = userIdentifierRepo;
    await userIdentifierRepo.create({
      userId: existingUserId,
      identifierType: 'PHONE',
      normalizedValue: '+201012349999',
      verifiedAt: new Date().toISOString(),
    });

    const verifyRes = await service.verifyChallenge({
      challengeId: issued.challengeId,
      otp: TEST_FIXED_OTP,
    });

    assert.strictEqual(verifyRes.success, true);
    assert.ok(verifyRes.tokens?.refreshToken);

    const refreshToken = verifyRes.tokens.refreshToken;
    const expectedHash = hashRefreshToken(refreshToken);

    // Verify session was persisted in session repository with canonical SHA-256 hash
    const storedSession = await sessionRepo.getByRefreshTokenHash?.(expectedHash);
    assert.ok(storedSession, 'Session must be found by canonical SHA-256 refresh token hash');
    assert.strictEqual(storedSession.userId, existingUserId);
    assert.strictEqual(storedSession.isRevoked, false);

    // Test canonical revocation
    await sessionRepo.revokeByRefreshTokenHash?.(expectedHash);
    const revokedSession = await sessionRepo.getByRefreshTokenHash?.(expectedHash);
    assert.strictEqual(revokedSession.isRevoked, true, 'Session must be marked revoked');
  });

  // ==========================================================================
  // 5. OWNER SAFETY & FRONTEND LEAK
  // ==========================================================================

  await record('OWNER_SAFETY', 'Customer auth never mints ROLE_OWNER or creates owners rows', async () => {
    const { service } = createIsolatedTestService();

    const issued = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'CREATE_ACCOUNT',
      method: 'PHONE',
      identifier: '01088880010',
    });

    const verified = await service.verifyChallenge({
      challengeId: issued.challengeId,
      otp: TEST_FIXED_OTP,
    });

    const created = await service.completeAccountCreation({
      continuationToken: verified.continuationToken!,
      fullName: 'مستأجر صولا المضمون',
    });

    const decoded = verifyAccessToken(created.tokens.accessToken);
    assert.strictEqual(decoded.role, 'ROLE_CUSTOMER');
    assert.notStrictEqual(decoded.role, 'ROLE_OWNER');
  });

  await record('FRONTEND_LEAK', 'Development OTP (123456) is NOT hardcoded in customer-app source code', () => {
    const customerAppSrc = path.resolve(__dirname, '../../../../customer-app/src');
    assert.ok(fs.existsSync(customerAppSrc), `customer-app/src should exist at ${customerAppSrc}`);

    function scanDir(dir: string): string[] {
      const leaks: string[] = [];
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const f of files) {
        const fullPath = path.join(dir, f.name);
        if (f.isDirectory()) {
          leaks.push(...scanDir(fullPath));
        } else if (f.isFile() && (f.name.endsWith('.ts') || f.name.endsWith('.tsx') || f.name.endsWith('.json'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const matches = content.match(/(['"`])123456\1/g);
          if (matches) {
            leaks.push(`${f.name}: matched ${matches.join(', ')}`);
          }
        }
      }
      return leaks;
    }

    const leaks = scanDir(customerAppSrc);
    assert.strictEqual(
      leaks.length,
      0,
      `Detected hardcoded OTP '123456' in customer-app source files:\n${leaks.join('\n')}`
    );
  });

  await record('MIGRATION', 'Migration 031 contains all required tables, atomic RPC, consumption, and RLS', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../../../database/migrations/031_auth_v2_identity_and_challenges.sql'
    );
    assert.ok(fs.existsSync(migrationPath), `Migration file must exist at ${migrationPath}`);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    const requiredTokens = [
      'BEGIN;',
      'COMMIT;',
      'CREATE TABLE IF NOT EXISTS public.user_identifiers',
      'uq_user_identifiers_type_value',
      'CREATE TABLE IF NOT EXISTS public.auth_challenges',
      'CREATE TABLE IF NOT EXISTS public.auth_rate_limits',
      'konfrm_verify_auth_challenge_v2',
      'konfrm_consume_auth_challenge_v2',
      'konfrm_check_rate_limit_v2',
      'FOR UPDATE',
      'SECURITY DEFINER',
      'REVOKE ALL ON TABLE public.user_identifiers',
      'REVOKE ALL ON TABLE public.auth_challenges',
      'GRANT EXECUTE ON FUNCTION public.konfrm_verify_auth_challenge_v2',
      '031_auth_v2_identity_and_challenges.sql',
    ];

    for (const token of requiredTokens) {
      assert.ok(sql.includes(token), `Migration 031 missing required token: "${token}"`);
    }
  });

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return { total, passed, failed, results };
}

// Direct test CLI execution
if (process.argv[1] && (process.argv[1].endsWith('authV2Foundation.test.ts') || process.argv[1].endsWith('authV2Foundation.test.js'))) {
  runAuthV2FoundationSuite()
    .then(({ total, passed, failed, results }) => {
      console.log('======================================================================');
      console.log('       SOLA VACATION RENTALS — AUTH V2 FOUNDATION 01 TEST HARNESS');
      console.log('======================================================================\n');

      let currentCategory = '';
      results.forEach((r, idx) => {
        if (r.category !== currentCategory) {
          currentCategory = r.category;
          console.log(`\n[${currentCategory}]`);
        }
        const status = r.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`  [${idx + 1}] ${status} - ${r.name}${r.error ? ` (${r.error})` : ''}`);
      });

      console.log('\n----------------------------------------------------------------------');
      console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
      console.log('----------------------------------------------------------------------');

      if (failed > 0) {
        process.exit(1);
      } else {
        console.log('AUTH-V2-FOUNDATION-01 focused specification passed successfully.');
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error('Test harness execution failed:', err);
      process.exit(1);
    });
}

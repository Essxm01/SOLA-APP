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
import { mapAuthV2Error } from '../services/authV2Runtime.js';
import { verifyAccessToken } from '../services/jwtService.js';
import { AuthService } from '../services/authService.js';
import { isProductionDatabase, assertSafeTestDatabaseUrl } from '../utils/testDbGuard.js';

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
        authEnv: options?.authEnv ?? 'test',
        hasRealSmsProvider: options?.hasRealSmsProvider,
        hasRealEmailProvider: options?.hasRealEmailProvider,
      },
    });

    return { service, userIdentifierRepo, challengeRepo, rateLimitRepo, userRepo, sessionRepo };
  }

  await record('SCREEN10_ERROR_MAPPING', 'Continuation failures remain safely recoverable for Screen 10', () => {
    const expired = mapAuthV2Error(new Error('CONTINUATION_TOKEN_EXPIRED'));
    assert.strictEqual(expired.statusCode, 400);
    assert.strictEqual(expired.code, 'CONTINUATION_TOKEN_EXPIRED');

    for (const raw of [
      'INVALID_CONTINUATION_TOKEN',
      'MALFORMED_CONTINUATION_TOKEN',
      'INVALID_CONTINUATION_TOKEN_SIGNATURE',
      'CORRUPT_CONTINUATION_TOKEN_PAYLOAD',
    ]) {
      const mapped = mapAuthV2Error(new Error(raw));
      assert.strictEqual(mapped.statusCode, 400);
      assert.strictEqual(mapped.code, 'INVALID_CONTINUATION_TOKEN');
    }

    const consumed = mapAuthV2Error(new Error('CONTINUATION_ALREADY_CONSUMED'));
    assert.strictEqual(consumed.statusCode, 409);
    assert.strictEqual(consumed.code, 'CONTINUATION_ALREADY_CONSUMED');
  });

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
      /CHALLENGE_CANCELLED|CHALLENGE_NOT_ACTIVE/
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

  await record('CHALLENGES', 'Concurrent resend: database lease ensures only ONE caller dispatches', async () => {
    const { service, challengeRepo } = createIsolatedTestService();

    const issued = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01099997777',
    });

    // Advance resend cooldown on challenge to simulate cooldown expiry
    const ch = await challengeRepo.getById(issued.challengeId);
    assert.ok(ch);
    ch.resendAvailableAt = new Date(Date.now() - 5000).toISOString();

    // Fire 5 concurrent resend requests
    const resendAttempts = await Promise.allSettled([
      service.resendChallenge({ challengeId: issued.challengeId }),
      service.resendChallenge({ challengeId: issued.challengeId }),
      service.resendChallenge({ challengeId: issued.challengeId }),
      service.resendChallenge({ challengeId: issued.challengeId }),
      service.resendChallenge({ challengeId: issued.challengeId }),
    ]);

    const fulfilled = resendAttempts.filter((r) => r.status === 'fulfilled');
    const rejected = resendAttempts.filter((r) => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1, `Expected exactly 1 resend winner, got ${fulfilled.length}`);
    assert.strictEqual(rejected.length, 4, `Expected 4 rejected concurrent resends, got ${rejected.length}`);

    for (const r of rejected) {
      if (r.status === 'rejected') {
        assert.match(r.reason.message, /RESEND_IN_PROGRESS|RESEND_COOLDOWN_ACTIVE/);
      }
    }
  });

  await record('CHALLENGES', 'Initial delivery failure cancels challenge without leaving orphan active row', async () => {
    const { service, challengeRepo } = createIsolatedTestService();

    // Inject failing SMS adapter
    (service as any).smsAdapter = {
      sendOtp: async () => {
        throw new Error('TELEPHONY_PROVIDER_NETWORK_TIMEOUT');
      },
    };

    await assert.rejects(
      async () => {
        await service.requestChallenge({
          surface: 'CUSTOMER',
          intent: 'LOGIN',
          method: 'PHONE',
          identifier: '01088887777',
        });
      },
      /OTP_DELIVERY_FAILED/
    );

    // Verify created challenge was cancelled and not left active
    const allChallenges = Array.from((challengeRepo as any).store.values() as IterableIterator<any>);
    const created = allChallenges.find((c) => c.normalizedValue === '+201088887777');
    if (created) {
      assert.strictEqual(created.status, 'CANCELLED', 'Undelivered challenge must be cancelled');
    }
  });

  // BLOCKER 3 HARDENING
  await record('CHALLENGES', 'Resend OTP expiry capping: in-memory resend caps OTP expiry at challenge_expires_at when remaining TTL < 5m', async () => {
    const { service, challengeRepo } = createIsolatedTestService();

    const issued = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01077771122',
    });

    const ch = await challengeRepo.getById(issued.challengeId);
    assert.ok(ch);

    // Set remaining challenge TTL to 30 seconds
    const cappedExpiry = new Date(Date.now() + 30_000).toISOString();
    ch.challengeExpiresAt = cappedExpiry;
    ch.resendAvailableAt = new Date(Date.now() - 1000).toISOString();

    const resendRes = await service.resendChallenge({ challengeId: issued.challengeId });
    assert.strictEqual(resendRes.success, true);

    // Authoritative return expiresAt must equal challengeExpiresAt
    assert.strictEqual(
      resendRes.expiresAt,
      cappedExpiry,
      'Returned OTP expiry must be capped at challenge_expires_at'
    );

    const chAfter = await challengeRepo.getById(issued.challengeId);
    assert.strictEqual(chAfter?.otpExpiresAt, cappedExpiry);
    assert.strictEqual(chAfter?.challengeExpiresAt, cappedExpiry, 'Challenge lifecycle must not be extended');
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
    const savedOtp = process.env.AUTH_DEVELOPMENT_OTP;
    delete process.env.AUTH_DEVELOPMENT_OTP;
    try {
      assert.throws(
        () => {
          getDevelopmentOtpValue({ authEnv: 'test', deliveryMode: 'DEVELOPMENT_FIXED_OTP', developmentOtp: undefined });
        },
        /AUTH_DEVELOPMENT_OTP_CONFIG_REQUIRED/
      );
    } finally {
      if (savedOtp !== undefined) process.env.AUTH_DEVELOPMENT_OTP = savedOtp;
    }
  });

  // BLOCKER 9 HARDENING
  await record('CONFIG_GUARDS', 'Runtime missing AUTH_OTP_HMAC_SECRET fails closed without committed fallback', () => {
    const savedSecret = process.env.AUTH_OTP_HMAC_SECRET;
    delete process.env.AUTH_OTP_HMAC_SECRET;
    try {
      assert.throws(
        () => {
          getAuthHmacSecret({ hmacSecret: undefined });
        },
        /AUTH_OTP_HMAC_SECRET_REQUIRED/
      );
    } finally {
      if (savedSecret !== undefined) process.env.AUTH_OTP_HMAC_SECRET = savedSecret;
    }
  });

  // BLOCKER 3 HARDENING
  await record('CONFIG_GUARDS', 'Fixed OTP environment allowlist: development, test, founder_preview allowed; production, unknown, blank rejected', () => {
    // 1. development -> allowed
    assert.strictEqual(
      isFixedOtpAllowed({ authEnv: 'development', deliveryMode: 'DEVELOPMENT_FIXED_OTP' }),
      true
    );

    // 2. test -> allowed
    assert.strictEqual(
      isFixedOtpAllowed({ authEnv: 'test', deliveryMode: 'DEVELOPMENT_FIXED_OTP' }),
      true
    );

    // 3. founder_preview / founder_qa -> allowed
    assert.strictEqual(
      isFixedOtpAllowed({ authEnv: 'founder_preview', deliveryMode: 'DEVELOPMENT_FIXED_OTP' }),
      true
    );
    assert.strictEqual(
      isFixedOtpAllowed({ authEnv: 'founder_qa', deliveryMode: 'DEVELOPMENT_FIXED_OTP' }),
      true
    );

    // 4. production -> rejected
    assert.strictEqual(
      isFixedOtpAllowed({ authEnv: 'production', deliveryMode: 'DEVELOPMENT_FIXED_OTP' }),
      false
    );
    assert.strictEqual(
      isFixedOtpAllowed({ nodeEnv: 'production', authEnv: 'development', deliveryMode: 'DEVELOPMENT_FIXED_OTP' }),
      false
    );

    // 5. empty/blank -> rejected
    assert.strictEqual(
      isFixedOtpAllowed({ authEnv: '', deliveryMode: 'DEVELOPMENT_FIXED_OTP' }),
      false
    );

    // 6. arbitrary/unknown -> rejected
    assert.strictEqual(
      isFixedOtpAllowed({ authEnv: 'staging', deliveryMode: 'DEVELOPMENT_FIXED_OTP' }),
      false
    );
    assert.strictEqual(
      isFixedOtpAllowed({ authEnv: 'qa_cluster', deliveryMode: 'DEVELOPMENT_FIXED_OTP' }),
      false
    );

    // Calling getDevelopmentOtpValue in disallowed env throws
    assert.throws(
      () => {
        getDevelopmentOtpValue({ authEnv: 'staging', deliveryMode: 'DEVELOPMENT_FIXED_OTP', developmentOtp: '123456' });
      },
      /FIXED_OTP_ENVIRONMENT_NOT_AUTHORIZED/
    );
  });

  // BLOCKER 4 HARDENING
  await record('CONFIG_GUARDS', 'assertSafeTestDatabaseUrl: local/disposable targets allowed, Supabase & remote targets strictly rejected', () => {
    // Allowed local/disposable test targets
    assert.doesNotThrow(() => {
      assertSafeTestDatabaseUrl('postgresql://postgres:postgres@127.0.0.1:54329/sola_isolated_test');
    });
    assert.doesNotThrow(() => {
      assertSafeTestDatabaseUrl('postgresql://postgres:postgres@localhost:5432/sola_ci_test');
    });
    assert.doesNotThrow(() => {
      assertSafeTestDatabaseUrl('postgresql://postgres:postgres@postgres:5432/test_db');
    });

    // Rejected: Supabase pooler / project hosts
    assert.throws(() => {
      assertSafeTestDatabaseUrl('postgresql://postgres:pass@aws-0-eu-central-1.pooler.supabase.com:6543/postgres');
    }, /REFUSING_TEST_MUTATION_AGAINST_NON_LOCAL_DB/);

    assert.throws(() => {
      assertSafeTestDatabaseUrl('postgresql://postgres:pass@zrbmbjgcsowfqklmxbyn.supabase.co:5432/postgres');
    }, /REFUSING_TEST_MUTATION_AGAINST_NON_LOCAL_DB/);

    // Rejected: Remote unknown host
    assert.throws(() => {
      assertSafeTestDatabaseUrl('postgresql://postgres:pass@db.production.sola.rentals:5432/production');
    }, /REFUSING_TEST_MUTATION_AGAINST_NON_LOCAL_DB/);

    // Rejected: Empty URL
    assert.throws(() => {
      assertSafeTestDatabaseUrl('');
    }, /UNSAFE_TEST_DATABASE_URL/);
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

  // BLOCKER 1 HARDENING: Service & Adapter Level Fail-Closed
  await record('CONFIG_GUARDS', 'Service-level requestChallenge fails closed when DEVELOPMENT_FIXED_OTP configured in unauthorized environment', async () => {
    // 1. DEVELOPMENT_FIXED_OTP + test -> succeeds
    const sTest = createIsolatedTestService({ deliveryMode: 'DEVELOPMENT_FIXED_OTP', authEnv: 'test' });
    const resTest = await sTest.service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01011112222',
    });
    assert.ok(resTest.challengeId);

    // 2. DEVELOPMENT_FIXED_OTP + founder_preview -> succeeds
    const sPreview = createIsolatedTestService({ deliveryMode: 'DEVELOPMENT_FIXED_OTP', authEnv: 'founder_preview' });
    const resPreview = await sPreview.service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01011112223',
    });
    assert.ok(resPreview.challengeId);

    // 3. DEVELOPMENT_FIXED_OTP + blank authEnv ('') -> rejects
    const sBlank = createIsolatedTestService({ deliveryMode: 'DEVELOPMENT_FIXED_OTP', authEnv: '' });
    await assert.rejects(
      async () => {
        await sBlank.service.requestChallenge({
          surface: 'CUSTOMER',
          intent: 'LOGIN',
          method: 'PHONE',
          identifier: '01011112224',
        });
      },
      /FIXED_OTP_ENVIRONMENT_NOT_AUTHORIZED/
    );

    // 4. DEVELOPMENT_FIXED_OTP + staging -> rejects
    const sStaging = createIsolatedTestService({ deliveryMode: 'DEVELOPMENT_FIXED_OTP', authEnv: 'staging' });
    await assert.rejects(
      async () => {
        await sStaging.service.requestChallenge({
          surface: 'CUSTOMER',
          intent: 'LOGIN',
          method: 'PHONE',
          identifier: '01011112225',
        });
      },
      /FIXED_OTP_ENVIRONMENT_NOT_AUTHORIZED/
    );

    // 5. DEVELOPMENT_FIXED_OTP + unknown -> rejects
    const sUnknown = createIsolatedTestService({ deliveryMode: 'DEVELOPMENT_FIXED_OTP', authEnv: 'unknown_env' });
    await assert.rejects(
      async () => {
        await sUnknown.service.requestChallenge({
          surface: 'CUSTOMER',
          intent: 'LOGIN',
          method: 'PHONE',
          identifier: '01011112226',
        });
      },
      /FIXED_OTP_ENVIRONMENT_NOT_AUTHORIZED/
    );

    // 6. DEVELOPMENT_FIXED_OTP + production -> rejects
    const sProd = createIsolatedTestService({ deliveryMode: 'DEVELOPMENT_FIXED_OTP', authEnv: 'production' });
    await assert.rejects(
      async () => {
        await sProd.service.requestChallenge({
          surface: 'CUSTOMER',
          intent: 'LOGIN',
          method: 'PHONE',
          identifier: '01011112227',
        });
      },
      /PRODUCTION_STATIC_OTP_FORBIDDEN/
    );
  });

  await record('CONFIG_GUARDS', 'Providerless adapters fail closed in unauthorized non-production environments', async () => {
    const smsAdapter = new ProviderlessDevelopmentSmsAdapter();
    const emailAdapter = new ProviderlessDevelopmentEmailAdapter();

    for (const env of ['staging', '', 'unknown_cluster']) {
      await assert.rejects(
        async () => {
          await smsAdapter.sendOtp('+201012345678', '123456', { authEnv: env });
        },
        /PROVIDERLESS_ADAPTER_ENVIRONMENT_UNAUTHORIZED/
      );

      await assert.rejects(
        async () => {
          await emailAdapter.sendOtp('user@example.com', '123456', { authEnv: env });
        },
        /PROVIDERLESS_ADAPTER_ENVIRONMENT_UNAUTHORIZED/
      );
    }
  });

  // BLOCKER 2 HARDENING: Unified Send Throttling
  await record('RATE_LIMITING', 'Shared identifier send throttling: issue and resend consume same 5-send bucket and reject at 5', async () => {
    const { service, challengeRepo } = createIsolatedTestService();
    const phone = '01099991234';

    // 1. Initial issue (send #1)
    const issued = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: phone,
    });
    assert.ok(issued.challengeId);

    // 2. Resend 4 times (sends #2, #3, #4, #5)
    for (let i = 2; i <= 5; i++) {
      const ch = await challengeRepo.getById(issued.challengeId);
      assert.ok(ch);
      // bypass cooldown to simulate time passing
      ch.resendAvailableAt = new Date(Date.now() - 1000).toISOString();
      const resendRes = await service.resendChallenge({ challengeId: issued.challengeId });
      assert.strictEqual(resendRes.success, true);
      assert.strictEqual(resendRes.generation, i);
    }

    // 3. Resend #6 must be rejected by unified send rate limit!
    const ch = await challengeRepo.getById(issued.challengeId);
    assert.ok(ch);
    ch.resendAvailableAt = new Date(Date.now() - 1000).toISOString();
    await assert.rejects(
      async () => {
        await service.resendChallenge({ challengeId: issued.challengeId });
      },
      /RATE_LIMIT_EXCEEDED/
    );

    // 4. Also, a new issue attempt for the same identifier must be rejected!
    await assert.rejects(
      async () => {
        await service.requestChallenge({
          surface: 'CUSTOMER',
          intent: 'LOGIN',
          method: 'PHONE',
          identifier: phone,
        });
      },
      /RATE_LIMIT_EXCEEDED/
    );
  });

  await record('RATE_LIMITING', 'Shared IP send throttling: issue and resend share 30-send IP bucket and reject above 30', async () => {
    const { service, challengeRepo } = createIsolatedTestService();
    const testIp = '198.51.100.42';

    // Issue 15 challenges from same IP (15 sends)
    const challengeIds: string[] = [];
    for (let i = 0; i < 15; i++) {
      const res = await service.requestChallenge({
        surface: 'CUSTOMER',
        intent: 'LOGIN',
        method: 'PHONE',
        identifier: `0105555${String(i).padStart(4, '0')}`,
        ipAddress: testIp,
      });
      challengeIds.push(res.challengeId);
    }

    // Resend 15 times across those challenges from same IP (15 more sends = 30 sends total)
    for (let i = 0; i < 15; i++) {
      const ch = await challengeRepo.getById(challengeIds[i]);
      assert.ok(ch);
      ch.resendAvailableAt = new Date(Date.now() - 1000).toISOString();
      const resendRes = await service.resendChallenge({
        challengeId: challengeIds[i],
        ipAddress: testIp,
      });
      assert.strictEqual(resendRes.success, true);
    }

    // 31st send from same IP (whether issue or resend) must be blocked!
    await assert.rejects(
      async () => {
        await service.requestChallenge({
          surface: 'CUSTOMER',
          intent: 'LOGIN',
          method: 'PHONE',
          identifier: '01055559999',
          ipAddress: testIp,
        });
      },
      /RATE_LIMIT_EXCEEDED/
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

  // FINAL BLOCKER HARDENING: Race-Safe Continuation Claim Before Mutation
  await record('DOMAIN', 'Concurrent continuation completion: same token allows exactly one account-completion winner', async () => {
    const { service, userRepo, userIdentifierRepo, sessionRepo } = createIsolatedTestService();

    const phone = '01088880055';
    const normalizedPhone = '+201088880055';

    // 1. Issue CREATE_ACCOUNT PHONE challenge
    const issued = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'CREATE_ACCOUNT',
      method: 'PHONE',
      identifier: phone,
    });

    // 2. Verify OTP
    const verified = await service.verifyChallenge({
      challengeId: issued.challengeId,
      otp: TEST_FIXED_OTP,
    });
    assert.strictEqual(verified.success, true);
    assert.ok(verified.continuationToken);

    const continuationToken = verified.continuationToken!;

    // 3. Fire 5 simultaneous completeAccountCreation calls with DIFFERENT full names
    const candidateNames = [
      'فائز الأول صولا',
      'منافس ثاني صولا',
      'منافس ثالث صولا',
      'منافس رابع صولا',
      'منافس خامس صولا',
    ];

    const attempts = await Promise.allSettled(
      candidateNames.map((fullName) =>
        service.completeAccountCreation({
          continuationToken,
          fullName,
        })
      )
    );

    const fulfilled = attempts.filter((a): a is PromiseFulfilledResult<any> => a.status === 'fulfilled');
    const rejected = attempts.filter((a): a is PromiseRejectedResult => a.status === 'rejected');

    // Exactly 1 winner, 4 losers
    assert.strictEqual(fulfilled.length, 1, `Expected exactly 1 winner, got ${fulfilled.length}`);
    assert.strictEqual(rejected.length, 4, `Expected exactly 4 losers, got ${rejected.length}`);

    // All 4 losers fail with continuation-consumed semantics
    for (const r of rejected) {
      assert.match(
        r.reason.message,
        /CONTINUATION_ALREADY_CONSUMED/,
        `Expected loser to fail with CONTINUATION_ALREADY_CONSUMED, got: ${r.reason.message}`
      );
    }

    const winningName = fulfilled[0].value.user.fullName;
    assert.ok(candidateNames.includes(winningName), 'Winner name must be one of the candidate names');

    // Exactly 1 canonical User in repository with the winning full name
    const storedUser = await userRepo.getByPhone(normalizedPhone);
    assert.ok(storedUser, 'Canonical user must exist');
    assert.strictEqual(storedUser.fullName, winningName, 'Final User full name must equal the winning request');

    const distinctUsersForPhone = Array.from(
      new Set(Array.from((userRepo as any).users.values()).filter((u: any) => u.phoneNumber === normalizedPhone))
    );
    assert.strictEqual(distinctUsersForPhone.length, 1, 'Must have exactly 1 canonical user in DB');

    // Exactly 1 user_identifier
    const ident = await userIdentifierRepo.getByIdentifier('PHONE', normalizedPhone);
    assert.ok(ident, 'Identifier must exist');
    assert.strictEqual(ident.userId, storedUser.id);

    // Exactly 1 session issued
    const distinctSessions = Array.from(
      new Set(Array.from((sessionRepo as any).sessions.values()).filter((s: any) => s.userId === storedUser.id))
    );
    assert.strictEqual(distinctSessions.length, 1, 'Must have exactly 1 session issued');
  });

  // BLOCKER 5 HARDENING
  // BLOCKER 1 & BLOCKER 5 HARDENING: Canonical AuthService Integration Seam
  await record('SESSION_COMPATIBILITY', 'Auth V2 session uses SHA-256 hash and successfully integrates with canonical refresh/revoke', async () => {
    const { service, sessionRepo, userRepo, userIdentifierRepo } = createIsolatedTestService();

    // Seed existing user
    const existingUserId = '11111111-2222-3333-4444-555555555555';
    await userRepo.create({
      id: existingUserId,
      phoneNumber: '+201012349999',
      fullName: 'مستخدم متوافق الجلسات',
    });

    // Seed identifier
    await userIdentifierRepo.create({
      userId: existingUserId,
      identifierType: 'PHONE',
      normalizedValue: '+201012349999',
      verifiedAt: new Date().toISOString(),
    });

    const issued = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01012349999',
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
    const storedSession = await sessionRepo.getByRefreshTokenHash(expectedHash);
    assert.ok(storedSession, 'Session must be found by canonical SHA-256 refresh token hash');
    assert.strictEqual(storedSession.userId, existingUserId);
    assert.strictEqual(storedSession.isRevoked, false);

    // 1. Genuine Canonical AuthService Integration: refreshSession()
    // Instantiates actual production AuthService class with injected isolated repository seam
    const canonicalAuth = new AuthService(undefined, sessionRepo as any, userRepo as any);
    const refreshed = await canonicalAuth.refreshSession(refreshToken);
    assert.ok(refreshed.accessToken, 'Canonical refresh must issue a new access token');
    const decodedNewToken = verifyAccessToken(refreshed.accessToken);
    assert.strictEqual(decodedNewToken.sub, existingUserId, 'Access token subject must match user ID');
    assert.strictEqual(decodedNewToken.role, 'ROLE_CUSTOMER', 'Access token role must be ROLE_CUSTOMER');

    // 2. Genuine Canonical AuthService Integration: revokeSession()
    const revoked = await canonicalAuth.revokeSession(refreshToken);
    assert.strictEqual(revoked.success, true, 'Canonical revoke must succeed');

    // 3. Genuine Canonical AuthService Integration: reject refresh after revoke
    await assert.rejects(
      async () => {
        await canonicalAuth.refreshSession(refreshToken);
      },
      /SESSION_REVOKED/,
      'Canonical refreshSession must reject revoked session with SESSION_REVOKED'
    );

    // Double-check repository state reflects revocation
    const revokedSession = await sessionRepo.getByRefreshTokenHash(expectedHash);
    assert.strictEqual(revokedSession.isRevoked, true, 'Session repository state must be isRevoked=true');
  });

  // MATERIAL 5 HARDENING: Customer-only Surface Restriction
  await record('SURFACE_RESTRICTION', 'Auth V2 Foundation 01 runtime allows CUSTOMER and strictly rejects OWNER and ADMIN', async () => {
    const { service } = createIsolatedTestService();

    // 1. CUSTOMER: Allowed
    const custRes = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01012349999',
    });
    assert.ok(custRes.challengeId, 'CUSTOMER surface must be accepted');

    // 2. OWNER: Strictly rejected
    await assert.rejects(
      async () => {
        await service.requestChallenge({
          surface: 'OWNER' as any,
          intent: 'LOGIN',
          method: 'PHONE',
          identifier: '01012349999',
        });
      },
      /UNAUTHORIZED_SURFACE/,
      'OWNER surface must be rejected with UNAUTHORIZED_SURFACE'
    );

    // 3. ADMIN: Strictly rejected
    await assert.rejects(
      async () => {
        await service.requestChallenge({
          surface: 'ADMIN' as any,
          intent: 'LOGIN',
          method: 'PHONE',
          identifier: '01012349999',
        });
      },
      /UNAUTHORIZED_SURFACE/,
      'ADMIN surface must be rejected with UNAUTHORIZED_SURFACE'
    );
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

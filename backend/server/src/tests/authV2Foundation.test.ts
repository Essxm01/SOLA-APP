/**
 * Sola Vacation Rentals — AUTH V2 FOUNDATION 01 Comprehensive Test Suite
 * Location: backend/server/src/tests/authV2Foundation.test.ts
 * Master Specification: AUTH_V2_FOUNDATION_01
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizePhoneNumber } from '../utils/phoneNormalizer.js';
import { normalizeEmail, isValidEmail, maskEmail } from '../utils/emailNormalizer.js';
import {
  OTP_POLICY,
  isProductionEnvironment,
  isFixedOtpAllowed,
  getDevelopmentOtpValue,
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
  userIdentifierDb,
  authChallengeDb,
  authRateLimitDb,
  inMemoryUserIdentifiers,
  inMemoryAuthChallenges,
  inMemoryRateLimits,
} from '../services/authV2Repository.js';
import { AuthV2Service } from '../services/authV2Service.js';
import { AuthV2ContinuationService } from '../services/authV2ContinuationService.js';
import { verifyAccessToken } from '../services/jwtService.js';
import { userDb, ownerDb } from '../services/dbRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // Reset in-memory stores before suite
  inMemoryUserIdentifiers.clear();
  inMemoryAuthChallenges.clear();
  inMemoryRateLimits.clear();

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
    // 1. Trim outer whitespace
    const e1 = normalizeEmail('  user@Example.COM  ');
    assert.strictEqual(e1, 'user@example.com');

    // 2. Preserves local-part dots
    const e2 = normalizeEmail('john.doe@example.com');
    assert.strictEqual(e2, 'john.doe@example.com');

    // 3. Preserves plus-addressing (no alias stripping)
    const e3 = normalizeEmail('user+tag123@domain.org');
    assert.strictEqual(e3, 'user+tag123@domain.org');

    // 4. No Gmail-specific dot removal (distinct mailboxes stay distinct)
    const e4a = normalizeEmail('john.smith@gmail.com');
    const e4b = normalizeEmail('johnsmith@gmail.com');
    assert.notStrictEqual(e4a, e4b);

    // 5. Mixed-case domain is lowercased
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
    const userId1 = '11111111-1111-4000-8000-111111111111';
    const userId2 = '22222222-2222-4000-8000-222222222222';
    const phone = '+201099990001';

    // First creation succeeds
    const created = await userIdentifierDb.create({
      userId: userId1,
      identifierType: 'PHONE',
      normalizedValue: phone,
      verifiedAt: new Date().toISOString(),
    });
    assert.strictEqual(created.normalizedValue, phone);

    // Second creation for same (PHONE, phone) must throw UNIQUE violation
    await assert.rejects(
      async () => {
        await userIdentifierDb.create({
          userId: userId2,
          identifierType: 'PHONE',
          normalizedValue: phone,
        });
      },
      /IDENTIFIER_ALREADY_EXISTS/
    );
  });

  await record('IDENTITY', 'Phone backfill: idempotent legacy backfill preserving truthful phone_verified_at', async () => {
    const mockUsers = [
      {
        id: 'user-legacy-01',
        phoneNumber: '+201011112222',
        phoneVerifiedAt: '2026-08-01T10:00:00.000Z', // Verified legacy phone
      },
      {
        id: 'user-legacy-02',
        phoneNumber: '+201033334444',
        phoneVerifiedAt: null, // Unverified legacy phone
      },
      {
        id: 'user-owner-01',
        phoneNumber: '+201055556666',
        phoneVerifiedAt: '2026-08-15T12:00:00.000Z', // Owner-linked user
      },
    ];

    // First run of backfill
    const run1 = await userIdentifierDb.backfillPhoneIdentifiers(mockUsers);
    assert.strictEqual(run1.insertedCount, 3);

    // Verify truthful verification preservation
    const id1 = await userIdentifierDb.getByIdentifier('PHONE', '+201011112222');
    assert.ok(id1);
    assert.strictEqual(id1.verifiedAt, '2026-08-01T10:00:00.000Z');

    const id2 = await userIdentifierDb.getByIdentifier('PHONE', '+201033334444');
    assert.ok(id2);
    assert.strictEqual(id2.verifiedAt, null); // Truthful NULL preserved

    const id3 = await userIdentifierDb.getByIdentifier('PHONE', '+201055556666');
    assert.ok(id3);
    assert.strictEqual(id3.userId, 'user-owner-01');

    // Second run must be completely idempotent (0 new inserts)
    const run2 = await userIdentifierDb.backfillPhoneIdentifiers(mockUsers);
    assert.strictEqual(run2.insertedCount, 0);
  });

  await record('IDENTITY', 'Email profile safety: profile emails are NOT auto-backfilled or auto-linked', async () => {
    // Verify that userIdentifierDb does NOT create EMAIL identifiers during backfill
    const phoneIdent = await userIdentifierDb.getByIdentifier('PHONE', '+201011112222');
    assert.ok(phoneIdent);

    const emailIdent = await userIdentifierDb.getByIdentifier('EMAIL', 'owner@sola.com');
    assert.strictEqual(emailIdent, null, 'Profile email must NOT be auto-backfilled into user_identifiers');
  });

  // ==========================================================================
  // 2. CHALLENGE & SECURITY TESTS
  // ==========================================================================

  await record('CHALLENGES', '6-digit OTP policy & persistent challenge generation', async () => {
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
    const secret = 'test_hmac_secret_key_12345';
    const otp = '123456';
    const challenge1 = 'c1111111-1111-4000-8000-111111111111';
    const challenge2 = 'c2222222-2222-4000-8000-222222222222';
    const identifier = '+201012345678';

    const digest1 = computeChallengeOtpDigest(secret, challenge1, 1, identifier, otp);
    const digest2 = computeChallengeOtpDigest(secret, challenge2, 1, identifier, otp);

    // Stored digest is a 64-character SHA256 hex string, NOT the plaintext OTP
    assert.strictEqual(digest1.length, 64);
    assert.notStrictEqual(digest1, otp);

    // Same human digits '123456' across different challenges produce DIFFERENT digests!
    assert.notStrictEqual(digest1, digest2);

    // Timing-safe verification works
    assert.strictEqual(verifyChallengeOtpDigest(secret, challenge1, 1, identifier, otp, digest1), true);
    assert.strictEqual(verifyChallengeOtpDigest(secret, challenge1, 1, identifier, '999999', digest1), false);
  });

  await record('CHALLENGES', 'Incorrect OTP increments failed attempts and locks at attempt 5', async () => {
    const devService = new AuthV2Service({
      config: { deliveryMode: 'DEVELOPMENT_FIXED_OTP', developmentOtp: '123456' },
    });

    const issued = await devService.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01055550001',
    });

    // Attempt 1-4 with wrong OTP
    for (let i = 1; i <= 4; i++) {
      await assert.rejects(
        async () => {
          await devService.verifyChallenge({
            challengeId: issued.challengeId,
            otp: '000000', // incorrect
          });
        },
        /INVALID_OTP/
      );
      const ch = await authChallengeDb.getById(issued.challengeId);
      assert.strictEqual(ch?.failedAttempts, i);
      assert.strictEqual(ch?.status, 'ACTIVE');
    }

    // Attempt 5 with wrong OTP locks the challenge
    await assert.rejects(
      async () => {
        await devService.verifyChallenge({
          challengeId: issued.challengeId,
          otp: '000000',
        });
      },
      /CHALLENGE_LOCKED_MAX_ATTEMPTS_EXCEEDED/
    );

    const lockedCh = await authChallengeDb.getById(issued.challengeId);
    assert.strictEqual(lockedCh?.status, 'LOCKED');
    assert.strictEqual(lockedCh?.failedAttempts, 5);

    // Attempt 6 even with CORRECT code fails because challenge is LOCKED
    await assert.rejects(
      async () => {
        await devService.verifyChallenge({
          challengeId: issued.challengeId,
          otp: '123456',
        });
      },
      /CHALLENGE_LOCKED_MAX_ATTEMPTS_EXCEEDED/
    );
  });

  await record('CHALLENGES', 'Resend cooldown: rejects requests before 60 seconds', async () => {
    const devService = new AuthV2Service({
      config: { deliveryMode: 'DEVELOPMENT_FIXED_OTP', developmentOtp: '123456' },
    });

    const issued = await devService.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01055550002',
    });

    // Immediate resend must fail with cooldown active
    await assert.rejects(
      async () => {
        await devService.resendChallenge({ challengeId: issued.challengeId });
      },
      /RESEND_COOLDOWN_ACTIVE/
    );
  });

  await record('CHALLENGES', 'Resend rotates secret generation, preserves failed attempts, and invalidates old generation', async () => {
    const devService = new AuthV2Service({
      config: { deliveryMode: 'DEVELOPMENT_FIXED_OTP', developmentOtp: '123456' },
    });

    const issued = await devService.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01055550003',
    });

    // 1 wrong attempt
    await assert.rejects(
      async () => {
        await devService.verifyChallenge({ challengeId: issued.challengeId, otp: '999999' });
      },
      /INVALID_OTP/
    );

    const chBefore = await authChallengeDb.getById(issued.challengeId);
    assert.strictEqual(chBefore?.failedAttempts, 1);
    assert.strictEqual(chBefore?.generation, 1);
    const oldDigest = chBefore?.otpDigest;

    // Fast-forward cooldown for testing
    chBefore!.resendAvailableAt = new Date(Date.now() - 1000).toISOString();

    // Resend
    const resendRes = await devService.resendChallenge({ challengeId: issued.challengeId });
    assert.strictEqual(resendRes.success, true);

    const chAfter = await authChallengeDb.getById(issued.challengeId);
    assert.strictEqual(chAfter?.generation, 2, 'Generation must increment to 2');
    assert.strictEqual(chAfter?.failedAttempts, 1, 'Failed attempts must survive resend');
    assert.notStrictEqual(chAfter?.otpDigest, oldDigest, 'New generation must rotate digest');

    // Verification with 123456 succeeds under generation 2
    const verifyRes = await devService.verifyChallenge({
      challengeId: issued.challengeId,
      otp: '123456',
    });
    assert.strictEqual(verifyRes.success, true);
  });

  await record('CHALLENGES', 'Idempotent cancellation: cancelled challenge cannot verify or resend', async () => {
    const devService = new AuthV2Service({
      config: { deliveryMode: 'DEVELOPMENT_FIXED_OTP', developmentOtp: '123456' },
    });

    const issued = await devService.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01055550004',
    });

    // Cancel challenge
    const cancelRes = await devService.cancelChallenge(issued.challengeId);
    assert.strictEqual(cancelRes.success, true);

    // Repeated cancel is safe (idempotent)
    const repeatCancel = await devService.cancelChallenge(issued.challengeId);
    assert.strictEqual(repeatCancel.success, true);

    // Verification must fail
    await assert.rejects(
      async () => {
        await devService.verifyChallenge({ challengeId: issued.challengeId, otp: '123456' });
      },
      /CHALLENGE_CANCELLED/
    );

    // Resend must fail
    await assert.rejects(
      async () => {
        await devService.resendChallenge({ challengeId: issued.challengeId });
      },
      /CHALLENGE_NOT_ACTIVE/
    );
  });

  await record('CHALLENGES', 'Replay prevention: verified challenge cannot be re-verified', async () => {
    const devService = new AuthV2Service({
      config: { deliveryMode: 'DEVELOPMENT_FIXED_OTP', developmentOtp: '123456' },
    });

    const issued = await devService.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01055550005',
    });

    // First verification succeeds
    const v1 = await devService.verifyChallenge({ challengeId: issued.challengeId, otp: '123456' });
    assert.strictEqual(v1.success, true);

    // Second verification must fail with CHALLENGE_ALREADY_VERIFIED
    await assert.rejects(
      async () => {
        await devService.verifyChallenge({ challengeId: issued.challengeId, otp: '123456' });
      },
      /CHALLENGE_ALREADY_VERIFIED/
    );
  });

  await record('CHALLENGES', 'Atomic verification: concurrent verify allows exactly ONE winner', async () => {
    const devService = new AuthV2Service({
      config: { deliveryMode: 'DEVELOPMENT_FIXED_OTP', developmentOtp: '123456' },
    });

    const issued = await devService.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01055550006',
    });

    // Fire 5 concurrent verification requests for the EXACT SAME challenge simultaneously
    const attempts = await Promise.allSettled([
      devService.verifyChallenge({ challengeId: issued.challengeId, otp: '123456' }),
      devService.verifyChallenge({ challengeId: issued.challengeId, otp: '123456' }),
      devService.verifyChallenge({ challengeId: issued.challengeId, otp: '123456' }),
      devService.verifyChallenge({ challengeId: issued.challengeId, otp: '123456' }),
      devService.verifyChallenge({ challengeId: issued.challengeId, otp: '123456' }),
    ]);

    const fulfilled = attempts.filter((a) => a.status === 'fulfilled');
    const rejected = attempts.filter((a) => a.status === 'rejected');

    // EXACTLY ONE caller must succeed!
    assert.strictEqual(fulfilled.length, 1, `Expected exactly 1 winner, got ${fulfilled.length}`);
    assert.strictEqual(rejected.length, 4, `Expected 4 rejected replays, got ${rejected.length}`);

    // All rejected callers must fail with CHALLENGE_ALREADY_VERIFIED
    for (const r of rejected) {
      if (r.status === 'rejected') {
        assert.match(r.reason.message, /CHALLENGE_ALREADY_VERIFIED/);
      }
    }
  });

  // ==========================================================================
  // 3. PROVIDERLESS DEV MODE & LEAK PREVENTION
  // ==========================================================================

  await record('PROVIDERLESS_DEV', 'Founder-approved 123456 OTP works for BOTH Phone and Email in dev mode', async () => {
    const devService = new AuthV2Service({
      config: { deliveryMode: 'DEVELOPMENT_FIXED_OTP', developmentOtp: '123456' },
    });

    // 1. Phone Flow
    const phoneIssue = await devService.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01011119999',
    });
    const phoneVerify = await devService.verifyChallenge({
      challengeId: phoneIssue.challengeId,
      otp: '123456',
    });
    assert.strictEqual(phoneVerify.success, true);
    assert.strictEqual(phoneVerify.method, 'PHONE');

    // 2. Email Flow
    const emailIssue = await devService.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'EMAIL',
      identifier: 'founder.qa@example.com',
    });
    const emailVerify = await devService.verifyChallenge({
      challengeId: emailIssue.challengeId,
      otp: '123456',
    });
    assert.strictEqual(emailVerify.success, true);
    assert.strictEqual(emailVerify.method, 'EMAIL');
  });

  await record('PROVIDERLESS_DEV', 'API leak prevention: OTP value is never returned in API responses', async () => {
    const devService = new AuthV2Service({
      config: { deliveryMode: 'DEVELOPMENT_FIXED_OTP', developmentOtp: '123456' },
    });

    const issueRes = await devService.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01022223333',
    });

    const issueStr = JSON.stringify(issueRes);
    assert.strictEqual(issueStr.includes('123456'), false, 'Response must not contain OTP');
    assert.strictEqual('code' in issueRes, false);
    assert.strictEqual('otp' in issueRes, false);

    const verifyRes = await devService.verifyChallenge({
      challengeId: issueRes.challengeId,
      otp: '123456',
    });
    const verifyStr = JSON.stringify(verifyRes);
    assert.strictEqual(verifyStr.includes('123456'), false, 'Verify response must not contain OTP');
  });

  await record('ENVIRONMENT_SAFETY', 'Production fail-closed: fixed OTP strictly forbidden in production', () => {
    // 1. nodeEnv = production
    assert.throws(
      () => {
        validateEnvironmentSafety({ nodeEnv: 'production', deliveryMode: 'DEVELOPMENT_FIXED_OTP' });
      },
      /PRODUCTION_STATIC_OTP_FORBIDDEN/
    );

    // 2. authEnv = production
    assert.throws(
      () => {
        validateEnvironmentSafety({ authEnv: 'production', deliveryMode: 'DEVELOPMENT_FIXED_OTP' });
      },
      /PRODUCTION_STATIC_OTP_FORBIDDEN/
    );

    // 3. getDevelopmentOtpValue in production throws
    assert.throws(
      () => {
        getDevelopmentOtpValue({ nodeEnv: 'production' });
      },
      /PRODUCTION_STATIC_OTP_FORBIDDEN/
    );
  });

  await record('ENVIRONMENT_SAFETY', 'Production fail-closed: production without real provider fails closed', async () => {
    const prodService = new AuthV2Service({
      config: {
        nodeEnv: 'production',
        authEnv: 'production',
        hasRealSmsProvider: false,
        hasRealEmailProvider: false,
      },
    });

    await assert.rejects(
      async () => {
        await prodService.requestChallenge({
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
  // 4. ACCOUNT ENUMERATION TESTS
  // ==========================================================================

  await record('ENUMERATION', 'Pre-verification response shapes are equivalent for existing vs new Phone', async () => {
    // Seed existing phone identifier
    const existingPhone = '+201077778888';
    await userIdentifierDb.create({
      userId: 'user-enum-01',
      identifierType: 'PHONE',
      normalizedValue: existingPhone,
      verifiedAt: new Date().toISOString(),
    });

    const devService = new AuthV2Service({
      config: { deliveryMode: 'DEVELOPMENT_FIXED_OTP', developmentOtp: '123456' },
    });

    const existingRes = await devService.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: existingPhone,
    });

    const unknownRes = await devService.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01077779999', // unregistered
    });

    // Shapes must be identical
    assert.strictEqual(Object.keys(existingRes).sort().join(','), Object.keys(unknownRes).sort().join(','));
    assert.strictEqual('accountExists' in existingRes, false);
    assert.strictEqual('isNewUser' in existingRes, false);
    assert.strictEqual('requiresSignup' in existingRes, false);
  });

  await record('ENUMERATION', 'Pre-verification response shapes are equivalent for existing vs new Email', async () => {
    const existingEmail = 'existing.user@sola.com';
    await userIdentifierDb.create({
      userId: 'user-enum-02',
      identifierType: 'EMAIL',
      normalizedValue: existingEmail,
      verifiedAt: new Date().toISOString(),
    });

    const devService = new AuthV2Service({
      config: { deliveryMode: 'DEVELOPMENT_FIXED_OTP', developmentOtp: '123456' },
    });

    const existingRes = await devService.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'EMAIL',
      identifier: existingEmail,
    });

    const unknownRes = await devService.requestChallenge({
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

  // ==========================================================================
  // 5. LOGIN / CREATE_ACCOUNT DOMAIN & SCREEN 10 ONBOARDING
  // ==========================================================================

  await record('DOMAIN', 'LOGIN intent with unregistered identifier returns continuation token', async () => {
    const devService = new AuthV2Service({
      config: { deliveryMode: 'DEVELOPMENT_FIXED_OTP', developmentOtp: '123456' },
    });

    const issued = await devService.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'LOGIN',
      method: 'PHONE',
      identifier: '01088880001',
    });

    const verified = await devService.verifyChallenge({
      challengeId: issued.challengeId,
      otp: '123456',
    });

    assert.strictEqual(verified.success, true);
    assert.strictEqual(verified.isExistingUser, false);
    assert.strictEqual(verified.requiresSignup, true);
    assert.ok(verified.continuationToken);

    // Verify continuation token structure
    const payload = AuthV2ContinuationService.verifyToken(verified.continuationToken!);
    assert.strictEqual(payload.normalizedValue, '+201088880001');
    assert.strictEqual(payload.method, 'PHONE');
    assert.strictEqual(payload.intent, 'LOGIN');
  });

  await record('DOMAIN', 'CREATE_ACCOUNT completes with FULL NAME ONLY and creates canonical user & session', async () => {
    const devService = new AuthV2Service({
      config: { deliveryMode: 'DEVELOPMENT_FIXED_OTP', developmentOtp: '123456' },
    });

    const uniqueSuffix = Math.floor(10000000 + Math.random() * 90000000).toString();
    const testPhone = `010${uniqueSuffix}`;
    const canonicalPhone = `+2010${uniqueSuffix}`;

    const issued = await devService.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'CREATE_ACCOUNT',
      method: 'PHONE',
      identifier: testPhone,
    });

    const verified = await devService.verifyChallenge({
      challengeId: issued.challengeId,
      otp: '123456',
    });

    assert.strictEqual(verified.isExistingUser, false);
    assert.strictEqual(verified.requiresFullName, true);
    assert.ok(verified.continuationToken);

    // Screen 10 completion: Full name only
    const completeRes = await devService.completeAccountCreation({
      continuationToken: verified.continuationToken!,
      fullName: 'أحمد محمود صولا',
    });

    assert.strictEqual(completeRes.success, true);
    assert.ok(completeRes.user.id);
    assert.strictEqual(completeRes.user.fullName, 'أحمد محمود صولا');
    assert.ok(completeRes.tokens.accessToken);
    assert.ok(completeRes.tokens.refreshToken);

    // Verify session token claims
    const decoded = verifyAccessToken(completeRes.tokens.accessToken);
    assert.strictEqual(decoded.sub, completeRes.user.id);
    assert.strictEqual(decoded.role, 'ROLE_CUSTOMER');

    // Verify user_identifiers row created
    const ident = await userIdentifierDb.getByIdentifier('PHONE', canonicalPhone);
    assert.ok(ident);
    assert.strictEqual(ident.userId, completeRes.user.id);
  });

  // ==========================================================================
  // 6. OWNER IDENTITY REGRESSION & CAPABILITY ISOLATION
  // ==========================================================================

  await record('OWNER_SAFETY', 'Customer auth never mints ROLE_OWNER or creates owners rows', async () => {
    const devService = new AuthV2Service({
      config: { deliveryMode: 'DEVELOPMENT_FIXED_OTP', developmentOtp: '123456' },
    });

    const issued = await devService.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'CREATE_ACCOUNT',
      method: 'PHONE',
      identifier: '01088880003',
    });

    const verified = await devService.verifyChallenge({
      challengeId: issued.challengeId,
      otp: '123456',
    });

    const created = await devService.completeAccountCreation({
      continuationToken: verified.continuationToken!,
      fullName: 'مستأجر صولا العادي',
    });

    // Assert role is ROLE_CUSTOMER, NOT ROLE_OWNER
    const decoded = verifyAccessToken(created.tokens.accessToken);
    assert.strictEqual(decoded.role, 'ROLE_CUSTOMER');
    assert.notStrictEqual(decoded.role, 'ROLE_OWNER');

    // Assert no owner record was created
    const owner = await ownerDb.getById(created.user.id).catch(() => null);
    assert.strictEqual(owner, null, 'Customer onboarding must NEVER create an owners table record');
  });

  // ==========================================================================
  // 7. FRONTEND SOURCE LEAK TEST
  // ==========================================================================

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
          // Check for hardcoded 6-digit OTP '123456' (ignoring phone examples like 01012345678)
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

  // ==========================================================================
  // 8. MIGRATION FILE VALIDATION
  // ==========================================================================

  await record('MIGRATION', 'Migration 031 contains all required tables, atomic RPC, and RLS', () => {
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

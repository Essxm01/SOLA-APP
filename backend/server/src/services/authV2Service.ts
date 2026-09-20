/**
 * Sola Vacation Rentals — Auth V2 Domain Service Orchestrator
 * Location: backend/server/src/services/authV2Service.ts
 * 
 * Master Specification: AUTH_V2_FOUNDATION_01
 * 
 * Invariants:
 *   1. One canonical human user_id with additive verified identifiers (PHONE, EMAIL).
 *   2. Server-authoritative LOGIN / CREATE_ACCOUNT domain.
 *   3. Strict account enumeration protection (equivalent responses before verification).
 *   4. Single-winner atomic verification.
 *   5. Single-use continuation tokens (atomically consumed; replay rejected).
 *   6. Providerless Development Mode: Founder-approved fixed OTP from explicit config only.
 *   7. Production fails closed without configured provider or on fixed OTP attempt.
 *   8. Resend delivery failure ordering: does NOT invalidate prior secret if provider dispatch fails.
 *   9. Canonical session compatibility: SHA-256 refresh token hashing & awaited persistence.
 *  10. users.phone_number NOT NULL preserved; zero fake placeholder phones; owners.id = users.id preserved.
 */

import { randomUUID } from 'node:crypto';
import { normalizePhoneNumber, maskPhoneNumber } from '../utils/phoneNormalizer.js';
import { normalizeEmail, maskEmail } from '../utils/emailNormalizer.js';
import {
  OTP_POLICY,
  isProductionEnvironment,
  isFixedOtpAllowed,
  getDevelopmentOtpValue,
  getAuthHmacSecret,
  type AuthEnvironmentConfig,
} from './otpPolicy.js';
import {
  generateRandomOtp,
  computeChallengeOtpDigest,
} from './otpSecurity.js';
import {
  ProviderlessDevelopmentSmsAdapter,
  ProviderlessDevelopmentEmailAdapter,
  type IOtpDeliveryAdapter,
} from './otpDeliveryAdapter.js';
import {
  userIdentifierDb,
  authChallengeDb,
  authRateLimitDb,
  hashRefreshToken,
  type IUserIdentifierRepository,
  type IAuthChallengeRepository,
  type IAuthRateLimitRepository,
  type IUserRepository,
  type ISessionRepository,
  type AuthChallengeRecord,
} from './authV2Repository.js';
import { AuthV2ContinuationService } from './authV2ContinuationService.js';
import { signAccessToken, signRefreshToken } from './jwtService.js';
import { userDb, sessionDb } from './dbRepository.js';
import type { AuthSessionTokens } from '../types/server.js';

export interface RequestChallengeInput {
  surface: 'CUSTOMER' | 'OWNER' | 'ADMIN';
  intent: 'LOGIN' | 'CREATE_ACCOUNT';
  method: 'PHONE' | 'EMAIL';
  identifier: string;
  ipAddress?: string;
}

export interface RequestChallengeOutput {
  success: boolean;
  challengeId: string;
  method: 'PHONE' | 'EMAIL';
  maskedRecipient: string;
  resendAvailableAt: string;
  expiresAt: string;
}

export interface ResendChallengeInput {
  challengeId: string;
  ipAddress?: string;
}

export interface ResendChallengeOutput {
  success: boolean;
  challengeId: string;
  resendAvailableAt: string;
  expiresAt: string;
}

export interface VerifyChallengeInput {
  challengeId: string;
  otp: string;
  deviceInfo?: string;
  ipAddress?: string;
}

export interface VerifyChallengeOutput {
  success: boolean;
  challengeId: string;
  method: 'PHONE' | 'EMAIL';
  intent: 'LOGIN' | 'CREATE_ACCOUNT';
  isExistingUser: boolean;
  user?: any;
  tokens?: AuthSessionTokens;
  continuationToken?: string;
  requiresFullName?: boolean;
  requiresSignup?: boolean;
}

export class AuthV2Service {
  private userIdentifierRepo: IUserIdentifierRepository;
  private challengeRepo: IAuthChallengeRepository;
  private rateLimitRepo: IAuthRateLimitRepository;
  private userRepo: IUserRepository;
  private sessionRepo: ISessionRepository;
  private smsAdapter: IOtpDeliveryAdapter;
  private emailAdapter: IOtpDeliveryAdapter;
  private config?: AuthEnvironmentConfig;

  constructor(options?: {
    userIdentifierRepo?: IUserIdentifierRepository;
    challengeRepo?: IAuthChallengeRepository;
    rateLimitRepo?: IAuthRateLimitRepository;
    userRepo?: IUserRepository;
    sessionRepo?: ISessionRepository;
    smsAdapter?: IOtpDeliveryAdapter;
    emailAdapter?: IOtpDeliveryAdapter;
    config?: AuthEnvironmentConfig;
  }) {
    this.userIdentifierRepo = options?.userIdentifierRepo ?? userIdentifierDb;
    this.challengeRepo = options?.challengeRepo ?? authChallengeDb;
    this.rateLimitRepo = options?.rateLimitRepo ?? authRateLimitDb;
    this.userRepo = options?.userRepo ?? userDb;
    this.sessionRepo = options?.sessionRepo ?? sessionDb;
    this.smsAdapter = options?.smsAdapter ?? new ProviderlessDevelopmentSmsAdapter();
    this.emailAdapter = options?.emailAdapter ?? new ProviderlessDevelopmentEmailAdapter();
    this.config = options?.config;
  }

  private normalize(method: 'PHONE' | 'EMAIL', raw: string): { normalized: string; masked: string } {
    if (method === 'PHONE') {
      const normalized = normalizePhoneNumber(raw);
      return { normalized, masked: maskPhoneNumber(normalized) };
    } else if (method === 'EMAIL') {
      const normalized = normalizeEmail(raw);
      return { normalized, masked: maskEmail(normalized) };
    }
    throw new Error('UNSUPPORTED_AUTH_METHOD');
  }

  private resolveOtpForChallenge(): string {
    const isProd = isProductionEnvironment(this.config);

    if (isFixedOtpAllowed(this.config)) {
      if (isProd) {
        throw new Error('PRODUCTION_STATIC_OTP_FORBIDDEN');
      }
      return getDevelopmentOtpValue(this.config);
    }

    if (isProd) {
      const hasRealProvider =
        (this.config?.hasRealSmsProvider ?? false) ||
        (this.config?.hasRealEmailProvider ?? false);
      if (!hasRealProvider) {
        throw new Error('PRODUCTION_AUTH_PROVIDER_UNAVAILABLE: Real SMS/Email providers deferred by Founder');
      }
    }

    return generateRandomOtp(OTP_POLICY.OTP_LENGTH);
  }

  /**
   * 1. Request Challenge (Issue)
   * Server-authoritative, persistent rate-limited, enumeration-free.
   */
  async requestChallenge(input: RequestChallengeInput): Promise<RequestChallengeOutput> {
    if (!input.surface || (input.surface !== 'CUSTOMER' && input.surface !== 'OWNER' && input.surface !== 'ADMIN')) {
      throw new Error('INVALID_AUTH_SURFACE');
    }
    if (!input.intent || (input.intent !== 'LOGIN' && input.intent !== 'CREATE_ACCOUNT')) {
      throw new Error('INVALID_AUTH_INTENT');
    }
    if (!input.method || (input.method !== 'PHONE' && input.method !== 'EMAIL')) {
      throw new Error('INVALID_AUTH_METHOD');
    }

    const { normalized, masked } = this.normalize(input.method, input.identifier);

    // Persistent Rate limiting: throttle per normalized identifier
    const idRateLimitKey = `rate:issue:id:${input.method}:${normalized}`;
    const idRateCheck = await this.rateLimitRepo.checkAndIncrement(
      idRateLimitKey,
      OTP_POLICY.RATE_LIMIT_WINDOW_SECONDS,
      OTP_POLICY.RATE_LIMIT_MAX_ISSUES_PER_WINDOW
    );

    if (!idRateCheck.allowed) {
      throw new Error(`RATE_LIMIT_EXCEEDED: Retry after ${idRateCheck.retryAfterSeconds} seconds`);
    }

    // Persistent Rate limiting: throttle per IP if provided
    if (input.ipAddress) {
      const ipRateLimitKey = `rate:issue:ip:${input.ipAddress}`;
      const ipRateCheck = await this.rateLimitRepo.checkAndIncrement(
        ipRateLimitKey,
        OTP_POLICY.RATE_LIMIT_WINDOW_SECONDS,
        OTP_POLICY.RATE_LIMIT_MAX_ISSUES_PER_WINDOW * 2 // Allow reasonable concurrency per IP
      );
      if (!ipRateCheck.allowed) {
        throw new Error(`RATE_LIMIT_EXCEEDED: Retry after ${ipRateCheck.retryAfterSeconds} seconds`);
      }
    }

    const challengeId = randomUUID();
    const generation = 1;
    const otp = this.resolveOtpForChallenge();

    const hmacSecret = getAuthHmacSecret(this.config);
    const otpDigest = computeChallengeOtpDigest(
      hmacSecret,
      challengeId,
      generation,
      normalized,
      otp
    );

    const now = Date.now();
    const otpExpiresAt = new Date(now + OTP_POLICY.OTP_TTL_MS).toISOString();
    const challengeExpiresAt = new Date(now + OTP_POLICY.MAX_CHALLENGE_LIFECYCLE_MS).toISOString();
    const resendAvailableAt = new Date(now + OTP_POLICY.RESEND_COOLDOWN_MS).toISOString();

    // Persist challenge record without plaintext OTP
    await this.challengeRepo.create({
      id: challengeId,
      surface: input.surface,
      intent: input.intent,
      method: input.method,
      normalizedValue: normalized,
      otpDigest,
      generation,
      otpExpiresAt,
      challengeExpiresAt,
      resendAvailableAt,
    });

    // Deliver OTP via method-specific adapter
    if (input.method === 'PHONE') {
      await this.smsAdapter.sendOtp(normalized, otp, this.config);
    } else {
      await this.emailAdapter.sendOtp(normalized, otp, this.config);
    }

    // Enumeration-free uniform response: does NOT reveal whether account exists
    return {
      success: true,
      challengeId,
      method: input.method,
      maskedRecipient: masked,
      resendAvailableAt,
      expiresAt: otpExpiresAt,
    };
  }

  /**
   * 2. Resend Challenge
   * Enforces 60-second cooldown, rotates secret generation, preserves failed attempts.
   * SAFE RESEND ORDERING: delivery dispatch is executed BEFORE invalidating old secret.
   */
  async resendChallenge(input: ResendChallengeInput): Promise<ResendChallengeOutput> {
    const challenge = await this.challengeRepo.getById(input.challengeId);
    if (!challenge) {
      throw new Error('CHALLENGE_NOT_FOUND');
    }

    if (challenge.status !== 'ACTIVE') {
      throw new Error(`CHALLENGE_NOT_ACTIVE: Current status is ${challenge.status}`);
    }

    const now = Date.now();
    const challengeExpiresMs = new Date(challenge.challengeExpiresAt).getTime();
    if (now > challengeExpiresMs) {
      throw new Error('CHALLENGE_EXPIRED');
    }

    const resendAvailableMs = new Date(challenge.resendAvailableAt).getTime();
    if (now < resendAvailableMs) {
      const waitSeconds = Math.ceil((resendAvailableMs - now) / 1000);
      throw new Error(`RESEND_COOLDOWN_ACTIVE: Please wait ${waitSeconds} seconds`);
    }

    // Rate limiting
    const rateLimitKey = `rate:resend:id:${challenge.id}`;
    const rateCheck = await this.rateLimitRepo.checkAndIncrement(
      rateLimitKey,
      OTP_POLICY.RATE_LIMIT_WINDOW_SECONDS,
      OTP_POLICY.RATE_LIMIT_MAX_ISSUES_PER_WINDOW
    );
    if (!rateCheck.allowed) {
      throw new Error(`RATE_LIMIT_EXCEEDED: Retry after ${rateCheck.retryAfterSeconds} seconds`);
    }

    // Prepare next secret generation
    const nextGeneration = challenge.generation + 1;
    const otp = this.resolveOtpForChallenge();

    const hmacSecret = getAuthHmacSecret(this.config);
    const newDigest = computeChallengeOtpDigest(
      hmacSecret,
      challenge.id,
      nextGeneration,
      challenge.normalizedValue,
      otp
    );

    const newOtpExpiresMs = Math.min(now + OTP_POLICY.OTP_TTL_MS, challengeExpiresMs);
    const newOtpExpiresAt = new Date(newOtpExpiresMs).toISOString();
    const newResendAvailableAt = new Date(now + OTP_POLICY.RESEND_COOLDOWN_MS).toISOString();

    // ORDERING GUARD: Deliver OTP via adapter FIRST
    // If delivery fails, the challenge row remains in previous generation with valid code intact!
    if (challenge.method === 'PHONE') {
      await this.smsAdapter.sendOtp(challenge.normalizedValue, otp, this.config);
    } else {
      await this.emailAdapter.sendOtp(challenge.normalizedValue, otp, this.config);
    }

    // Delivery succeeded! Now commit secret rotation to persistent repository
    await this.challengeRepo.updateResend(challenge.id, {
      generation: nextGeneration,
      otpDigest: newDigest,
      otpExpiresAt: newOtpExpiresAt,
      resendAvailableAt: newResendAvailableAt,
      issueCount: challenge.issueCount + 1,
    });

    return {
      success: true,
      challengeId: challenge.id,
      resendAvailableAt: newResendAvailableAt,
      expiresAt: newOtpExpiresAt,
    };
  }

  /**
   * 3. Cancel Challenge
   * Idempotent cancellation.
   */
  async cancelChallenge(challengeId: string): Promise<{ success: boolean; challengeId: string }> {
    await this.challengeRepo.cancel(challengeId);
    return { success: true, challengeId };
  }

  /**
   * 4. Verify Challenge
   * Atomic, single-winner verification with server-authoritative LOGIN / CREATE_ACCOUNT domain.
   */
  async verifyChallenge(input: VerifyChallengeInput): Promise<VerifyChallengeOutput> {
    const challenge = await this.challengeRepo.getById(input.challengeId);
    if (!challenge) {
      throw new Error('CHALLENGE_NOT_FOUND');
    }

    const hmacSecret = getAuthHmacSecret(this.config);
    const candidateDigest = computeChallengeOtpDigest(
      hmacSecret,
      challenge.id,
      challenge.generation,
      challenge.normalizedValue,
      input.otp
    );

    const verifyResult = await this.challengeRepo.atomicVerify(
      challenge.id,
      candidateDigest,
      OTP_POLICY.MAX_FAILED_ATTEMPTS
    );

    if (!verifyResult.success) {
      if (verifyResult.errorCode === 'CHALLENGE_ALREADY_VERIFIED') {
        throw new Error('CHALLENGE_ALREADY_VERIFIED');
      }
      if (verifyResult.errorCode === 'CHALLENGE_LOCKED' || verifyResult.errorCode === 'MAX_ATTEMPTS_EXCEEDED') {
        throw new Error('CHALLENGE_LOCKED_MAX_ATTEMPTS_EXCEEDED');
      }
      if (verifyResult.errorCode === 'CHALLENGE_CANCELLED') {
        throw new Error('CHALLENGE_CANCELLED');
      }
      if (verifyResult.errorCode === 'CHALLENGE_EXPIRED') {
        throw new Error('CHALLENGE_EXPIRED');
      }
      if (verifyResult.errorCode === 'OTP_EXPIRED') {
        throw new Error('OTP_EXPIRED');
      }
      throw new Error('INVALID_OTP');
    }

    // Ownership verified! Mark identifier verified if it was already in DB
    const existingIdentifier = await this.userIdentifierRepo.getByIdentifier(
      challenge.method,
      challenge.normalizedValue
    );

    if (existingIdentifier) {
      if (!existingIdentifier.verifiedAt) {
        await this.userIdentifierRepo.markVerified(challenge.method, challenge.normalizedValue);
      }

      // Resolve canonical user
      const user = await this.userRepo.getById(existingIdentifier.userId);
      if (user) {
        // Issue Customer session (awaiting persistence)
        const tokens = await this.issueCustomerSession(user.id, input.deviceInfo, input.ipAddress);
        return {
          success: true,
          challengeId: challenge.id,
          method: challenge.method,
          intent: challenge.intent,
          isExistingUser: true,
          user,
          tokens,
        };
      }
    }

    // Unregistered identifier path
    // Generate purpose-bound continuation token for Screen 10 (Full Name only)
    const continuationToken = AuthV2ContinuationService.createToken(
      {
        challengeId: challenge.id,
        surface: challenge.surface,
        intent: challenge.intent,
        method: challenge.method,
        normalizedValue: challenge.normalizedValue,
        verifiedAt: new Date().toISOString(),
      },
      this.config
    );

    if (challenge.intent === 'LOGIN') {
      return {
        success: true,
        challengeId: challenge.id,
        method: challenge.method,
        intent: challenge.intent,
        isExistingUser: false,
        continuationToken,
        requiresSignup: true,
      };
    }

    return {
      success: true,
      challengeId: challenge.id,
      method: challenge.method,
      intent: challenge.intent,
      isExistingUser: false,
      continuationToken,
      requiresFullName: true,
    };
  }

  /**
   * 5. Complete Account Creation (Screen 10 Backend Support)
   * Enforces:
   *   - Single-use continuation token (replay rejected via challenge consumption).
   *   - ZERO fake placeholder phones: EMAIL-only creation is deferred until nullable-phone boundary.
   *   - Requires FULL NAME ONLY for Phone onboarding.
   */
  async completeAccountCreation(input: {
    continuationToken: string;
    fullName: string;
    deviceInfo?: string;
    ipAddress?: string;
  }): Promise<{ success: boolean; user: any; tokens: AuthSessionTokens }> {
    if (!input.fullName || typeof input.fullName !== 'string' || input.fullName.trim().length < 2) {
      throw new Error('INVALID_FULL_NAME: Full name must be at least 2 characters');
    }

    const payload = AuthV2ContinuationService.verifyToken(input.continuationToken, this.config);

    // BLOCKER 4: EMAIL + new account boundary guard
    // Canonical user requires users.phone_number NOT NULL. Zero fake phones allowed.
    if (payload.method === 'EMAIL') {
      throw new Error('EMAIL_ONLY_ACCOUNT_CREATION_NOT_ENABLED: Canonical user creation for email-only accounts is deferred until nullable-phone boundary. No fake phone numbers permitted.');
    }

    // BLOCKER 6: Replay Prevention Guard
    const challenge = await this.challengeRepo.getById(payload.challengeId);
    if (!challenge) {
      throw new Error('CHALLENGE_NOT_FOUND');
    }
    if (challenge.status === 'CONSUMED') {
      throw new Error('CONTINUATION_ALREADY_CONSUMED: Replay rejected');
    }
    if (challenge.status !== 'VERIFIED') {
      throw new Error(`CHALLENGE_NOT_VERIFIED: Current challenge status is ${challenge.status}`);
    }

    // Check race condition: has this identifier been registered in the meantime?
    const existing = await this.userIdentifierRepo.getByIdentifier(payload.method, payload.normalizedValue);
    if (existing) {
      const existingUser = await this.userRepo.getById(existing.userId);
      if (existingUser) {
        await this.challengeRepo.markConsumed(payload.challengeId);
        const tokens = await this.issueCustomerSession(existingUser.id, input.deviceInfo, input.ipAddress);
        return { success: true, user: existingUser, tokens };
      }
    }

    // Create new canonical user with verified Egyptian phone
    const userId = randomUUID();
    const cleanName = input.fullName.trim();
    const phoneValue = payload.normalizedValue; // 100% verified real phone, never a fake placeholder

    const newUser = await this.userRepo.create({
      id: userId,
      phoneNumber: phoneValue,
      fullName: cleanName,
      status: 'ACTIVE',
    });

    const canonicalUserId = newUser?.id || userId;
    await this.userRepo.updatePhoneVerified(canonicalUserId);

    // Additive user_identifiers record
    await this.userIdentifierRepo.create({
      userId: canonicalUserId,
      identifierType: payload.method,
      normalizedValue: payload.normalizedValue,
      verifiedAt: payload.verifiedAt,
    });

    // Atomically transition challenge to CONSUMED
    await this.challengeRepo.markConsumed(payload.challengeId);

    // Issue Customer session
    const tokens = await this.issueCustomerSession(canonicalUserId, input.deviceInfo, input.ipAddress);

    return {
      success: true,
      user: newUser || { id: canonicalUserId, phoneNumber: phoneValue, fullName: cleanName },
      tokens,
    };
  }

  /**
   * Issues customer session with SHA-256 canonical refresh token hash and awaited persistence.
   */
  private async issueCustomerSession(userId: string, deviceInfo?: string, ipAddress?: string): Promise<AuthSessionTokens> {
    const accessToken = signAccessToken({
      sub: userId,
      role: 'ROLE_CUSTOMER',
    });

    const refreshToken = signRefreshToken({
      sub: userId,
      role: 'ROLE_CUSTOMER',
    });

    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAtIso = new Date(Date.now() + OTP_POLICY.SESSION_EXPIRY_MS).toISOString();

    // Await session persistence before returning tokens (BLOCKER 5)
    const sessionRecord = await this.sessionRepo.create({
      id: randomUUID(),
      userId,
      surface: 'CUSTOMER',
      role: 'ROLE_CUSTOMER',
      refreshTokenHash,
      deviceInfo,
      ipAddress,
      expiresAt: expiresAtIso,
    });

    if (!sessionRecord) {
      throw new Error('SESSION_PERSISTENCE_FAILED');
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 mins
    };
  }
}

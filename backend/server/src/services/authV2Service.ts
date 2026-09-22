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
  isProviderlessAllowed,
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
import { createCanonicalEmailCustomer, type EmailCustomerRegistrationInput, type EmailCustomerRegistrationResult } from './emailCustomerRegistration.js';

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
  generation?: number;
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
  private emailCustomerRegistration: (input: EmailCustomerRegistrationInput) => Promise<EmailCustomerRegistrationResult>;

  constructor(options?: {
    userIdentifierRepo?: IUserIdentifierRepository;
    challengeRepo?: IAuthChallengeRepository;
    rateLimitRepo?: IAuthRateLimitRepository;
    userRepo?: IUserRepository;
    sessionRepo?: ISessionRepository;
    smsAdapter?: IOtpDeliveryAdapter;
    emailAdapter?: IOtpDeliveryAdapter;
    emailCustomerRegistration?: (input: EmailCustomerRegistrationInput) => Promise<EmailCustomerRegistrationResult>;
    config?: AuthEnvironmentConfig;
  }) {
    this.userIdentifierRepo = options?.userIdentifierRepo ?? userIdentifierDb;
    this.challengeRepo = options?.challengeRepo ?? authChallengeDb;
    this.rateLimitRepo = options?.rateLimitRepo ?? authRateLimitDb;
    this.userRepo = options?.userRepo ?? userDb;
    this.sessionRepo = options?.sessionRepo ?? sessionDb;
    this.smsAdapter = options?.smsAdapter ?? new ProviderlessDevelopmentSmsAdapter();
    this.emailAdapter = options?.emailAdapter ?? new ProviderlessDevelopmentEmailAdapter();
    this.emailCustomerRegistration = options?.emailCustomerRegistration ?? createCanonicalEmailCustomer;
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
    const mode = (this.config?.deliveryMode ?? process.env.AUTH_DELIVERY_MODE ?? '').toUpperCase();

    // BLOCKER 1: Fixed OTP mode requires explicitly authorized environment.
    // If configured as DEVELOPMENT_FIXED_OTP, it MUST fail closed on unauthorized envs.
    if (mode === 'DEVELOPMENT_FIXED_OTP') {
      if (isProd) {
        throw new Error('PRODUCTION_STATIC_OTP_FORBIDDEN');
      }
      if (!isFixedOtpAllowed(this.config)) {
        throw new Error('FIXED_OTP_ENVIRONMENT_NOT_AUTHORIZED: Fixed OTP mode is only authorized in explicitly allowed environments (development, test, founder_preview)');
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
    } else {
      if (!isProviderlessAllowed(this.config)) {
        throw new Error('PROVIDERLESS_MODE_NOT_AUTHORIZED: Providerless delivery is only authorized in explicitly allowed environments (development, test, founder_preview)');
      }
    }

    return generateRandomOtp(OTP_POLICY.OTP_LENGTH);
  }

  /**
   * 1. Request Challenge (Issue)
   * Server-authoritative, persistent rate-limited, enumeration-free.
   */
  async requestChallenge(input: RequestChallengeInput): Promise<RequestChallengeOutput> {
    // MATERIAL 5: Restrict Auth V2 Foundation 01 to CUSTOMER surface only
    if (input.surface !== 'CUSTOMER') {
      throw new Error(`UNAUTHORIZED_SURFACE: Auth V2 Foundation 01 is restricted to CUSTOMER surface only. Surface "${input.surface}" is rejected.`);
    }
    if (!input.intent || (input.intent !== 'LOGIN' && input.intent !== 'CREATE_ACCOUNT')) {
      throw new Error('INVALID_AUTH_INTENT');
    }
    if (!input.method || (input.method !== 'PHONE' && input.method !== 'EMAIL')) {
      throw new Error('INVALID_AUTH_METHOD');
    }

    const { normalized, masked } = this.normalize(input.method, input.identifier);

    // BLOCKER 2: Persistent Send Throttling: unified bucket across issue and resend
    const idRateLimitKey = `rate:send:id:${input.method}:${normalized}`;
    const idRateCheck = await this.rateLimitRepo.checkAndIncrement(
      idRateLimitKey,
      OTP_POLICY.RATE_LIMIT_SEND_WINDOW_SECONDS,
      OTP_POLICY.RATE_LIMIT_MAX_SENDS_PER_IDENTIFIER
    );

    if (!idRateCheck.allowed) {
      throw new Error(`RATE_LIMIT_EXCEEDED: Retry after ${idRateCheck.retryAfterSeconds} seconds`);
    }

    // Persistent Send Throttling: throttle per IP if provided (shared bucket across issue and resend)
    if (input.ipAddress) {
      const ipRateLimitKey = `rate:send:ip:${input.ipAddress}`;
      const ipRateCheck = await this.rateLimitRepo.checkAndIncrement(
        ipRateLimitKey,
        OTP_POLICY.RATE_LIMIT_SEND_WINDOW_SECONDS,
        OTP_POLICY.RATE_LIMIT_MAX_SENDS_PER_IP
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

    // Deliver OTP via method-specific adapter (truthful failure cleanup)
    try {
      if (input.method === 'PHONE') {
        await this.smsAdapter.sendOtp(normalized, otp, this.config);
      } else {
        await this.emailAdapter.sendOtp(normalized, otp, this.config);
      }
    } catch (deliveryErr: any) {
      await this.challengeRepo.cancel(challengeId).catch(() => null);
      throw new Error(`OTP_DELIVERY_FAILED: Delivery adapter failed to dispatch verification code (${deliveryErr?.message || 'unknown error'})`);
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
   * Database-authoritative lease acquisition (Blocker 2):
   * Guarantees only ONE concurrent request can acquire dispatch rights.
   * Delivery adapter is invoked before committing secret rotation.
   * If delivery fails, lease is released and previous valid OTP is preserved.
   */
  async resendChallenge(input: ResendChallengeInput): Promise<ResendChallengeOutput> {
    // 1. Acquire Database-Authoritative Resend Lease
    const lease = await this.challengeRepo.acquireResendLease(input.challengeId, 30);
    if (!lease.success) {
      if (lease.errorCode === 'RESEND_COOLDOWN_ACTIVE') {
        throw new Error('RESEND_COOLDOWN_ACTIVE: Resend cooldown is still active');
      }
      if (lease.errorCode === 'RESEND_IN_PROGRESS') {
        throw new Error('RESEND_IN_PROGRESS: Resend already in progress for this challenge');
      }
      throw new Error(lease.errorCode || 'RESEND_FAILED');
    }

    const leaseToken = lease.leaseToken!;
    const currentGen = lease.generation || 1;
    const nextGeneration = currentGen + 1;
    const normalizedValue = lease.normalizedValue!;
    const method = lease.method!;

    // 2. BLOCKER 2: Persistent Send Throttling: shared identifier send bucket across issue and resend
    const idRateLimitKey = `rate:send:id:${method}:${normalizedValue}`;
    const idRateCheck = await this.rateLimitRepo.checkAndIncrement(
      idRateLimitKey,
      OTP_POLICY.RATE_LIMIT_SEND_WINDOW_SECONDS,
      OTP_POLICY.RATE_LIMIT_MAX_SENDS_PER_IDENTIFIER
    );
    if (!idRateCheck.allowed) {
      await this.challengeRepo.releaseResendLease(input.challengeId, leaseToken);
      throw new Error(`RATE_LIMIT_EXCEEDED: Retry after ${idRateCheck.retryAfterSeconds} seconds`);
    }

    // Persistent Send Throttling: shared IP send bucket across issue and resend
    if (input.ipAddress) {
      const ipRateLimitKey = `rate:send:ip:${input.ipAddress}`;
      const ipRateCheck = await this.rateLimitRepo.checkAndIncrement(
        ipRateLimitKey,
        OTP_POLICY.RATE_LIMIT_SEND_WINDOW_SECONDS,
        OTP_POLICY.RATE_LIMIT_MAX_SENDS_PER_IP
      );
      if (!ipRateCheck.allowed) {
        await this.challengeRepo.releaseResendLease(input.challengeId, leaseToken);
        throw new Error(`RATE_LIMIT_EXCEEDED: Retry after ${ipRateCheck.retryAfterSeconds} seconds`);
      }
    }

    // 3. Resolve OTP & compute candidate HMAC digest
    const otp = this.resolveOtpForChallenge();
    const hmacSecret = getAuthHmacSecret(this.config);
    const newDigest = computeChallengeOtpDigest(
      hmacSecret,
      input.challengeId,
      nextGeneration,
      normalizedValue,
      otp
    );

    // 4. Dispatch external delivery adapter
    try {
      if (method === 'PHONE') {
        await this.smsAdapter.sendOtp(normalizedValue, otp, this.config);
      } else {
        await this.emailAdapter.sendOtp(normalizedValue, otp, this.config);
      }
    } catch (deliveryErr: any) {
      // Delivery failed: release lease, leaving previous generation & valid code completely untouched!
      await this.challengeRepo.releaseResendLease(input.challengeId, leaseToken);
      throw new Error(`OTP_DELIVERY_FAILED: Resend delivery failed (${deliveryErr?.message || 'unknown error'})`);
    }

    // 5. Delivery succeeded: Commit new generation & digest, and release lease
    const commit = await this.challengeRepo.commitResend(
      input.challengeId,
      leaseToken,
      newDigest,
      nextGeneration,
      60
    );
    if (!commit.success) {
      throw new Error(commit.errorCode || 'RESEND_COMMIT_FAILED');
    }

    // BLOCKER 3: Return database-authoritative timestamps, capped by challenge_expires_at
    return {
      success: true,
      challengeId: input.challengeId,
      generation: commit.generation ?? nextGeneration,
      resendAvailableAt: commit.resendAvailableAt!,
      expiresAt: commit.otpExpiresAt!,
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
   *   - PHONE and EMAIL are equal verified Customer account-creation methods.
   *   - Email-only creation uses the migration-032 atomic user + identifier boundary.
   *   - Requires FULL NAME ONLY for Customer onboarding.
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

    // Atomically claim the verified challenge BEFORE any account/profile mutation.
    const challenge = await this.challengeRepo.markConsumed(payload.challengeId);
    if (challenge.normalizedValue !== payload.normalizedValue || challenge.method !== payload.method) {
      throw new Error('CHALLENGE_BINDING_MISMATCH: Continuation token does not match challenge identity');
    }

    // Registration may have completed between OTP verification and Screen 10.
    const existing = await this.userIdentifierRepo.getByIdentifier(payload.method, payload.normalizedValue);
    if (existing) {
      const existingUser = await this.userRepo.getById(existing.userId);
      if (existingUser) {
        const tokens = await this.issueCustomerSession(existingUser.id, input.deviceInfo, input.ipAddress);
        return { success: true, user: existingUser, tokens };
      }
    }

    const cleanName = input.fullName.trim().replace(/\s+/g, ' ');

    if (payload.method === 'EMAIL') {
      // The database RPC serializes the exact normalized email, re-checks the
      // canonical identifier owner, and creates users + user_identifiers in one
      // transaction. A concurrent winner is returned instead of duplicated.
      const registration = await this.emailCustomerRegistration({
        userId: randomUUID(),
        email: payload.normalizedValue,
        fullName: cleanName,
        verifiedAt: payload.verifiedAt,
      });
      const canonicalUserId = registration.user?.id;
      if (!canonicalUserId) throw new Error('EMAIL_CUSTOMER_REGISTRATION_USER_MALFORMED');
      const tokens = await this.issueCustomerSession(canonicalUserId, input.deviceInfo, input.ipAddress);
      return { success: true, user: registration.user, tokens };
    }

    // Existing PHONE path remains unchanged: no fake phone, verified phone is
    // persisted canonically and then represented as an additive identifier.
    const userId = randomUUID();
    const phoneValue = payload.normalizedValue;
    const newUser = await this.userRepo.create({
      id: userId,
      phoneNumber: phoneValue,
      fullName: cleanName,
      status: 'ACTIVE',
    });

    const canonicalUserId = newUser?.id || userId;
    await this.userRepo.updatePhoneVerified(canonicalUserId);
    await this.userIdentifierRepo.create({
      userId: canonicalUserId,
      identifierType: 'PHONE',
      normalizedValue: payload.normalizedValue,
      verifiedAt: payload.verifiedAt,
    });

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

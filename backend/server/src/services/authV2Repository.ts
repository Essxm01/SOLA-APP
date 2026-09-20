/**
 * Sola Vacation Rentals — Auth V2 Data Access Layer & Repositories
 * Location: backend/server/src/services/authV2Repository.ts
 * 
 * Rules:
 *   1. Canonical PostgreSQL repositories throw on failure — NO silent in-memory fallback.
 *   2. Dedicated InMemory implementations provided for isolated, deterministic unit testing.
 *   3. Shared canonical session hash helper for 100% compatibility with existing auth refresh/revoke.
 */

import { randomUUID, createHash } from 'node:crypto';
import { queryDb } from './dbClient.js';
import { OTP_POLICY } from './otpPolicy.js';

// ============================================================================
// 0. SHARED CANONICAL REFRESH TOKEN HASH
// ============================================================================
export function hashRefreshToken(token: string): string {
  return `sha256:${createHash('sha256').update(token).digest('hex')}`;
}

// ============================================================================
// 1. DATA TYPES & CONTRACTS
// ============================================================================
export interface UserIdentifierRecord {
  id: string;
  userId: string;
  identifierType: 'PHONE' | 'EMAIL';
  normalizedValue: string;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthChallengeRecord {
  id: string;
  surface: 'CUSTOMER' | 'OWNER' | 'ADMIN';
  intent: 'LOGIN' | 'CREATE_ACCOUNT';
  method: 'PHONE' | 'EMAIL';
  normalizedValue: string;
  otpDigest: string;
  generation: number;
  issuedAt: string;
  otpExpiresAt: string;
  challengeExpiresAt: string;
  resendAvailableAt: string;
  failedAttempts: number;
  issueCount: number;
  status: 'ACTIVE' | 'VERIFIED' | 'CONSUMED' | 'CANCELLED' | 'EXPIRED' | 'LOCKED';
  verifiedAt: string | null;
  consumedAt: string | null;
  cancelledAt: string | null;
  providerMetadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface VerifyChallengeResult {
  success: boolean;
  errorCode?: string;
  challengeId: string;
  userId?: string | null;
  identifierType?: 'PHONE' | 'EMAIL';
  normalizedValue?: string;
  intent?: 'LOGIN' | 'CREATE_ACCOUNT';
  surface?: 'CUSTOMER' | 'OWNER' | 'ADMIN';
  failedAttempts: number;
  isLocked: boolean;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
}

export interface IUserIdentifierRepository {
  getByIdentifier(type: 'PHONE' | 'EMAIL', normalizedValue: string): Promise<UserIdentifierRecord | null>;
  getByUserId(userId: string): Promise<UserIdentifierRecord[]>;
  create(data: { userId: string; identifierType: 'PHONE' | 'EMAIL'; normalizedValue: string; verifiedAt?: string | null }): Promise<UserIdentifierRecord>;
  markVerified(type: 'PHONE' | 'EMAIL', normalizedValue: string): Promise<UserIdentifierRecord | null>;
  backfillPhoneIdentifiers(sourceUsers?: any[]): Promise<{ totalProcessed: number; insertedCount: number }>;
}

export interface IAuthChallengeRepository {
  create(challenge: {
    id?: string;
    surface: 'CUSTOMER' | 'OWNER' | 'ADMIN';
    intent: 'LOGIN' | 'CREATE_ACCOUNT';
    method: 'PHONE' | 'EMAIL';
    normalizedValue: string;
    otpDigest: string;
    generation?: number;
    otpExpiresAt: string;
    challengeExpiresAt: string;
    resendAvailableAt: string;
    providerMetadata?: Record<string, any>;
  }): Promise<AuthChallengeRecord>;
  getById(challengeId: string): Promise<AuthChallengeRecord | null>;
  updateResend(
    challengeId: string,
    updates: {
      generation: number;
      otpDigest: string;
      otpExpiresAt: string;
      resendAvailableAt: string;
      issueCount: number;
    }
  ): Promise<AuthChallengeRecord>;
  cancel(challengeId: string): Promise<AuthChallengeRecord | null>;
  markConsumed(challengeId: string): Promise<AuthChallengeRecord>;
  atomicVerify(
    challengeId: string,
    candidateDigest: string,
    maxFailedAttempts?: number
  ): Promise<VerifyChallengeResult>;
  acquireResendLease(
    challengeId: string,
    ttlSeconds?: number
  ): Promise<{
    success: boolean;
    errorCode?: string;
    leaseToken?: string;
    generation?: number;
    normalizedValue?: string;
    method?: 'PHONE' | 'EMAIL';
    surface?: 'CUSTOMER' | 'OWNER' | 'ADMIN';
    intent?: 'LOGIN' | 'CREATE_ACCOUNT';
  }>;
  commitResend(
    challengeId: string,
    leaseToken: string,
    newDigest: string,
    newGeneration: number,
    cooldownSeconds?: number
  ): Promise<{
    success: boolean;
    errorCode?: string;
    generation?: number;
    otpExpiresAt?: string;
    resendAvailableAt?: string;
    challengeExpiresAt?: string;
  }>;
  releaseResendLease(
    challengeId: string,
    leaseToken: string
  ): Promise<{ success: boolean; errorCode?: string }>;
}

export interface IAuthRateLimitRepository {
  checkAndIncrement(
    bucketKey: string,
    windowSeconds?: number,
    maxAttempts?: number
  ): Promise<RateLimitCheckResult>;
}

export interface IUserRepository {
  getById(id: string): Promise<any>;
  getByPhone(phone: string): Promise<any>;
  create(user: { id?: string; phoneNumber: string; status?: string; fullName?: string | null; email?: string | null }): Promise<any>;
  updatePhoneVerified(userId: string): Promise<any>;
}

export interface ISessionRepository {
  create(session: {
    id: string;
    userId: string;
    surface: 'CUSTOMER' | 'OWNER';
    role: string;
    refreshTokenHash: string;
    deviceInfo?: string;
    ipAddress?: string;
    expiresAt: string;
  }): Promise<any>;
  getByRefreshTokenHash?(hash: string): Promise<any>;
  revokeByRefreshTokenHash?(hash: string): Promise<any>;
}

// ============================================================================
// 2. CANONICAL POSTGRESQL REPOSITORIES (FAIL-CLOSED: NO SILENT FALLBACK)
// ============================================================================

export class PostgresUserIdentifierRepository implements IUserIdentifierRepository {
  async getByIdentifier(type: 'PHONE' | 'EMAIL', normalizedValue: string): Promise<UserIdentifierRecord | null> {
    const res = await queryDb(
      `SELECT id, user_id AS "userId", identifier_type AS "identifierType",
              normalized_value AS "normalizedValue", verified_at AS "verifiedAt",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM public.user_identifiers
       WHERE identifier_type = $1 AND normalized_value = $2`,
      [type, normalizedValue]
    );
    return res.rows[0] || null;
  }

  async getByUserId(userId: string): Promise<UserIdentifierRecord[]> {
    const res = await queryDb(
      `SELECT id, user_id AS "userId", identifier_type AS "identifierType",
              normalized_value AS "normalizedValue", verified_at AS "verifiedAt",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM public.user_identifiers
       WHERE user_id = $1`,
      [userId]
    );
    return res.rows || [];
  }

  async create(data: { userId: string; identifierType: 'PHONE' | 'EMAIL'; normalizedValue: string; verifiedAt?: string | null }): Promise<UserIdentifierRecord> {
    const id = randomUUID();
    const res = await queryDb(
      `INSERT INTO public.user_identifiers (id, user_id, identifier_type, normalized_value, verified_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, user_id AS "userId", identifier_type AS "identifierType",
                 normalized_value AS "normalizedValue", verified_at AS "verifiedAt",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id, data.userId, data.identifierType, data.normalizedValue, data.verifiedAt || null]
    );
    return res.rows[0];
  }

  async markVerified(type: 'PHONE' | 'EMAIL', normalizedValue: string): Promise<UserIdentifierRecord | null> {
    const res = await queryDb(
      `UPDATE public.user_identifiers
       SET verified_at = NOW(), updated_at = NOW()
       WHERE identifier_type = $1 AND normalized_value = $2
       RETURNING id, user_id AS "userId", identifier_type AS "identifierType",
                 normalized_value AS "normalizedValue", verified_at AS "verifiedAt",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [type, normalizedValue]
    );
    return res.rows[0] || null;
  }

  async backfillPhoneIdentifiers(): Promise<{ totalProcessed: number; insertedCount: number }> {
    const countBeforeRes = await queryDb('SELECT count(*) as count FROM public.user_identifiers WHERE identifier_type = \'PHONE\'');
    const countBefore = parseInt(countBeforeRes.rows[0]?.count || '0', 10);

    await queryDb(`
      INSERT INTO public.user_identifiers (id, user_id, identifier_type, normalized_value, verified_at, created_at, updated_at)
      SELECT gen_random_uuid(), u.id, 'PHONE', u.phone_number, u.phone_verified_at, u.created_at, NOW()
      FROM public.users u
      WHERE u.phone_number IS NOT NULL AND u.deleted_at IS NULL
      ON CONFLICT (identifier_type, normalized_value) DO NOTHING;
    `);

    const countAfterRes = await queryDb('SELECT count(*) as count FROM public.user_identifiers WHERE identifier_type = \'PHONE\'');
    const countAfter = parseInt(countAfterRes.rows[0]?.count || '0', 10);
    const usersCountRes = await queryDb('SELECT count(*) as count FROM public.users WHERE phone_number IS NOT NULL AND deleted_at IS NULL');
    const totalUsers = parseInt(usersCountRes.rows[0]?.count || '0', 10);

    return { totalProcessed: totalUsers, insertedCount: countAfter - countBefore };
  }
}

export class PostgresAuthChallengeRepository implements IAuthChallengeRepository {
  async create(challenge: {
    id?: string;
    surface: 'CUSTOMER' | 'OWNER' | 'ADMIN';
    intent: 'LOGIN' | 'CREATE_ACCOUNT';
    method: 'PHONE' | 'EMAIL';
    normalizedValue: string;
    otpDigest: string;
    generation?: number;
    otpExpiresAt: string;
    challengeExpiresAt: string;
    resendAvailableAt: string;
    providerMetadata?: Record<string, any>;
  }): Promise<AuthChallengeRecord> {
    const id = challenge.id || randomUUID();
    const res = await queryDb(
      `INSERT INTO public.auth_challenges (
         id, surface, intent, method, normalized_value, otp_digest, generation,
         issued_at, otp_expires_at, challenge_expires_at, resend_available_at,
         failed_attempts, issue_count, status, provider_metadata, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, 0, 1, 'ACTIVE', $11, NOW(), NOW())
       RETURNING id, surface, intent, method, normalized_value AS "normalizedValue",
                 otp_digest AS "otpDigest", generation, issued_at AS "issuedAt",
                 otp_expires_at AS "otpExpiresAt", challenge_expires_at AS "challengeExpiresAt",
                 resend_available_at AS "resendAvailableAt", failed_attempts AS "failedAttempts",
                 issue_count AS "issueCount", status, verified_at AS "verifiedAt",
                 consumed_at AS "consumedAt", cancelled_at AS "cancelledAt",
                 provider_metadata AS "providerMetadata", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        id,
        challenge.surface,
        challenge.intent,
        challenge.method,
        challenge.normalizedValue,
        challenge.otpDigest,
        challenge.generation || 1,
        challenge.otpExpiresAt,
        challenge.challengeExpiresAt,
        challenge.resendAvailableAt,
        JSON.stringify(challenge.providerMetadata || {}),
      ]
    );
    return res.rows[0];
  }

  async getById(challengeId: string): Promise<AuthChallengeRecord | null> {
    const res = await queryDb(
      `SELECT id, surface, intent, method, normalized_value AS "normalizedValue",
              otp_digest AS "otpDigest", generation, issued_at AS "issuedAt",
              otp_expires_at AS "otpExpiresAt", challenge_expires_at AS "challengeExpiresAt",
              resend_available_at AS "resendAvailableAt", failed_attempts AS "failedAttempts",
              issue_count AS "issueCount", status, verified_at AS "verifiedAt",
              consumed_at AS "consumedAt", cancelled_at AS "cancelledAt",
              provider_metadata AS "providerMetadata", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM public.auth_challenges
       WHERE id = $1`,
      [challengeId]
    );
    return res.rows[0] || null;
  }

  async updateResend(
    challengeId: string,
    updates: {
      generation: number;
      otpDigest: string;
      otpExpiresAt: string;
      resendAvailableAt: string;
      issueCount: number;
    }
  ): Promise<AuthChallengeRecord> {
    const res = await queryDb(
      `UPDATE public.auth_challenges
       SET generation = $2, otp_digest = $3, otp_expires_at = $4,
           resend_available_at = $5, issue_count = $6, updated_at = NOW()
       WHERE id = $1
       RETURNING id, surface, intent, method, normalized_value AS "normalizedValue",
                 otp_digest AS "otpDigest", generation, issued_at AS "issuedAt",
                 otp_expires_at AS "otpExpiresAt", challenge_expires_at AS "challengeExpiresAt",
                 resend_available_at AS "resendAvailableAt", failed_attempts AS "failedAttempts",
                 issue_count AS "issueCount", status, verified_at AS "verifiedAt",
                 consumed_at AS "consumedAt", cancelled_at AS "cancelledAt",
                 provider_metadata AS "providerMetadata", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        challengeId,
        updates.generation,
        updates.otpDigest,
        updates.otpExpiresAt,
        updates.resendAvailableAt,
        updates.issueCount,
      ]
    );
    return res.rows[0];
  }

  async cancel(challengeId: string): Promise<AuthChallengeRecord | null> {
    const res = await queryDb(
      `UPDATE public.auth_challenges
       SET status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING id, surface, intent, method, normalized_value AS "normalizedValue",
                 otp_digest AS "otpDigest", generation, issued_at AS "issuedAt",
                 otp_expires_at AS "otpExpiresAt", challenge_expires_at AS "challengeExpiresAt",
                 resend_available_at AS "resendAvailableAt", failed_attempts AS "failedAttempts",
                 issue_count AS "issueCount", status, verified_at AS "verifiedAt",
                 consumed_at AS "consumedAt", cancelled_at AS "cancelledAt",
                 provider_metadata AS "providerMetadata", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [challengeId]
    );
    return res.rows[0] || null;
  }

  async markConsumed(challengeId: string): Promise<AuthChallengeRecord> {
    const res = await queryDb(
      `SELECT * FROM public.konfrm_consume_auth_challenge_v2($1)`,
      [challengeId]
    );
    const row = res.rows[0];
    if (!row?.success) {
      throw new Error(row?.error_code || 'CHALLENGE_CONSUMPTION_FAILED');
    }
    const updated = await this.getById(challengeId);
    return updated!;
  }

  async atomicVerify(
    challengeId: string,
    candidateDigest: string,
    maxFailedAttempts: number = OTP_POLICY.MAX_FAILED_ATTEMPTS
  ): Promise<VerifyChallengeResult> {
    const res = await queryDb(
      `SELECT success, error_code AS "errorCode", challenge_id AS "challengeId",
              user_id AS "userId", identifier_type AS "identifierType",
              normalized_value AS "normalizedValue", intent, surface,
              failed_attempts AS "failedAttempts", is_locked AS "isLocked"
       FROM public.konfrm_verify_auth_challenge_v2($1, $2, $3)`,
      [challengeId, candidateDigest, maxFailedAttempts]
    );
    return res.rows[0];
  }

  async acquireResendLease(
    challengeId: string,
    ttlSeconds: number = 30
  ): Promise<{
    success: boolean;
    errorCode?: string;
    leaseToken?: string;
    generation?: number;
    normalizedValue?: string;
    method?: 'PHONE' | 'EMAIL';
    surface?: 'CUSTOMER' | 'OWNER' | 'ADMIN';
    intent?: 'LOGIN' | 'CREATE_ACCOUNT';
  }> {
    const res = await queryDb(
      `SELECT success, error_code AS "errorCode", lease_token AS "leaseToken",
              generation, normalized_value AS "normalizedValue", method, surface, intent
       FROM public.konfrm_acquire_resend_lease_v2($1, $2)`,
      [challengeId, ttlSeconds]
    );
    return res.rows[0];
  }

  async commitResend(
    challengeId: string,
    leaseToken: string,
    newDigest: string,
    newGeneration: number,
    cooldownSeconds: number = 60
  ): Promise<{
    success: boolean;
    errorCode?: string;
    generation?: number;
    otpExpiresAt?: string;
    resendAvailableAt?: string;
    challengeExpiresAt?: string;
  }> {
    const res = await queryDb(
      `SELECT success, error_code AS "errorCode", generation,
              otp_expires_at AS "otpExpiresAt", resend_available_at AS "resendAvailableAt",
              challenge_expires_at AS "challengeExpiresAt"
       FROM public.konfrm_commit_resend_v2($1, $2, $3, $4, $5)`,
      [challengeId, leaseToken, newDigest, newGeneration, cooldownSeconds]
    );
    const row = res.rows[0];
    return {
      success: Boolean(row?.success),
      errorCode: row?.errorCode,
      generation: row?.generation,
      otpExpiresAt: row?.otpExpiresAt ? new Date(row.otpExpiresAt).toISOString() : undefined,
      resendAvailableAt: row?.resendAvailableAt ? new Date(row.resendAvailableAt).toISOString() : undefined,
      challengeExpiresAt: row?.challengeExpiresAt ? new Date(row.challengeExpiresAt).toISOString() : undefined,
    };
  }

  async releaseResendLease(
    challengeId: string,
    leaseToken: string
  ): Promise<{ success: boolean; errorCode?: string }> {
    const res = await queryDb(
      `SELECT success, error_code AS "errorCode"
       FROM public.konfrm_release_resend_lease_v2($1, $2)`,
      [challengeId, leaseToken]
    );
    return res.rows[0];
  }
}

export class PostgresAuthRateLimitRepository implements IAuthRateLimitRepository {
  async checkAndIncrement(
    bucketKey: string,
    windowSeconds: number = 900,
    maxAttempts: number = OTP_POLICY.RATE_LIMIT_MAX_ISSUES_PER_WINDOW
  ): Promise<RateLimitCheckResult> {
    const res = await queryDb(
      `SELECT allowed, remaining_attempts AS "remainingAttempts", retry_after_seconds AS "retryAfterSeconds"
       FROM public.konfrm_check_rate_limit_v2($1, $2, $3)`,
      [bucketKey, windowSeconds, maxAttempts]
    );
    const row = res.rows[0];
    return {
      allowed: row.allowed,
      remainingAttempts: row.remainingAttempts,
      retryAfterSeconds: row.retryAfterSeconds,
    };
  }
}

// ============================================================================
// 3. IN-MEMORY REPOSITORIES (EXCLUSIVELY FOR ISOLATED UNIT TESTS)
// ============================================================================

export class InMemoryUserIdentifierRepository implements IUserIdentifierRepository {
  private store = new Map<string, UserIdentifierRecord>(); // key: `${type}:${value}`

  async getByIdentifier(type: 'PHONE' | 'EMAIL', normalizedValue: string): Promise<UserIdentifierRecord | null> {
    return this.store.get(`${type}:${normalizedValue}`) || null;
  }

  async getByUserId(userId: string): Promise<UserIdentifierRecord[]> {
    return Array.from(this.store.values()).filter((r) => r.userId === userId);
  }

  async create(data: { userId: string; identifierType: 'PHONE' | 'EMAIL'; normalizedValue: string; verifiedAt?: string | null }): Promise<UserIdentifierRecord> {
    const key = `${data.identifierType}:${data.normalizedValue}`;
    if (this.store.has(key)) {
      throw new Error('IDENTIFIER_ALREADY_EXISTS');
    }
    const now = new Date().toISOString();
    const record: UserIdentifierRecord = {
      id: randomUUID(),
      userId: data.userId,
      identifierType: data.identifierType,
      normalizedValue: data.normalizedValue,
      verifiedAt: data.verifiedAt || null,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(key, record);
    return record;
  }

  async markVerified(type: 'PHONE' | 'EMAIL', normalizedValue: string): Promise<UserIdentifierRecord | null> {
    const key = `${type}:${normalizedValue}`;
    const record = this.store.get(key);
    if (!record) return null;
    const now = new Date().toISOString();
    record.verifiedAt = now;
    record.updatedAt = now;
    return record;
  }

  async backfillPhoneIdentifiers(sourceUsers: any[] = []): Promise<{ totalProcessed: number; insertedCount: number }> {
    let inserted = 0;
    for (const u of sourceUsers) {
      if (!u.phoneNumber) continue;
      const key = `PHONE:${u.phoneNumber}`;
      if (!this.store.has(key)) {
        const now = new Date().toISOString();
        this.store.set(key, {
          id: randomUUID(),
          userId: u.id,
          identifierType: 'PHONE',
          normalizedValue: u.phoneNumber,
          verifiedAt: u.phoneVerifiedAt || null,
          createdAt: now,
          updatedAt: now,
        });
        inserted++;
      }
    }
    return { totalProcessed: sourceUsers.length, insertedCount: inserted };
  }

  clear(): void {
    this.store.clear();
  }
}

export class InMemoryAuthChallengeRepository implements IAuthChallengeRepository {
  private store = new Map<string, AuthChallengeRecord>();
  private challengeLocks = new Map<string, Promise<any>>();

  private async withLock<T>(challengeId: string, fn: () => Promise<T>): Promise<T> {
    while (this.challengeLocks.has(challengeId)) {
      await this.challengeLocks.get(challengeId);
    }
    let resolveLock: () => void;
    const p = new Promise<void>((res) => {
      resolveLock = res;
    });
    this.challengeLocks.set(challengeId, p);
    try {
      return await fn();
    } finally {
      this.challengeLocks.delete(challengeId);
      resolveLock!();
    }
  }

  async create(challenge: any): Promise<AuthChallengeRecord> {
    const id = challenge.id || randomUUID();
    const now = new Date().toISOString();
    const record: AuthChallengeRecord = {
      id,
      surface: challenge.surface,
      intent: challenge.intent,
      method: challenge.method,
      normalizedValue: challenge.normalizedValue,
      otpDigest: challenge.otpDigest,
      generation: challenge.generation || 1,
      issuedAt: now,
      otpExpiresAt: challenge.otpExpiresAt,
      challengeExpiresAt: challenge.challengeExpiresAt,
      resendAvailableAt: challenge.resendAvailableAt,
      failedAttempts: 0,
      issueCount: 1,
      status: 'ACTIVE',
      verifiedAt: null,
      consumedAt: null,
      cancelledAt: null,
      providerMetadata: challenge.providerMetadata || {},
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(id, record);
    return record;
  }

  async getById(challengeId: string): Promise<AuthChallengeRecord | null> {
    return this.store.get(challengeId) || null;
  }

  async updateResend(challengeId: string, updates: any): Promise<AuthChallengeRecord> {
    const record = this.store.get(challengeId);
    if (!record) throw new Error('CHALLENGE_NOT_FOUND');
    const now = new Date().toISOString();
    record.generation = updates.generation;
    record.otpDigest = updates.otpDigest;
    record.otpExpiresAt = updates.otpExpiresAt;
    record.resendAvailableAt = updates.resendAvailableAt;
    record.issueCount = updates.issueCount;
    record.updatedAt = now;
    return record;
  }

  async cancel(challengeId: string): Promise<AuthChallengeRecord | null> {
    const record = this.store.get(challengeId);
    if (!record) return null;
    const now = new Date().toISOString();
    record.status = 'CANCELLED';
    record.cancelledAt = now;
    record.updatedAt = now;
    return record;
  }

  async markConsumed(challengeId: string): Promise<AuthChallengeRecord> {
    return await this.withLock(challengeId, async () => {
      const record = this.store.get(challengeId);
      if (!record) throw new Error('CHALLENGE_NOT_FOUND');
      if (record.status === 'CONSUMED') {
        throw new Error('CONTINUATION_ALREADY_CONSUMED');
      }
      if (record.status !== 'VERIFIED') {
        throw new Error('CHALLENGE_NOT_VERIFIED');
      }
      const now = new Date().toISOString();
      record.status = 'CONSUMED';
      record.consumedAt = now;
      record.updatedAt = now;
      return record;
    });
  }

  async atomicVerify(
    challengeId: string,
    candidateDigest: string,
    maxFailedAttempts: number = OTP_POLICY.MAX_FAILED_ATTEMPTS
  ): Promise<VerifyChallengeResult> {
    return await this.withLock(challengeId, async () => {
      const challenge = this.store.get(challengeId);
      if (!challenge) {
        return {
          success: false,
          errorCode: 'CHALLENGE_NOT_FOUND',
          challengeId,
          failedAttempts: 0,
          isLocked: false,
        };
      }

      if (challenge.status === 'VERIFIED' || challenge.status === 'CONSUMED') {
        return {
          success: false,
          errorCode: 'CHALLENGE_ALREADY_VERIFIED',
          challengeId,
          failedAttempts: challenge.failedAttempts,
          isLocked: false,
        };
      }

      if (challenge.status === 'CANCELLED') {
        return {
          success: false,
          errorCode: 'CHALLENGE_CANCELLED',
          challengeId,
          failedAttempts: challenge.failedAttempts,
          isLocked: false,
        };
      }

      if (challenge.status === 'LOCKED' || challenge.failedAttempts >= maxFailedAttempts) {
        return {
          success: false,
          errorCode: 'CHALLENGE_LOCKED',
          challengeId,
          failedAttempts: challenge.failedAttempts,
          isLocked: true,
        };
      }

      const now = Date.now();
      if (now > new Date(challenge.challengeExpiresAt).getTime()) {
        challenge.status = 'EXPIRED';
        return {
          success: false,
          errorCode: 'CHALLENGE_EXPIRED',
          challengeId,
          failedAttempts: challenge.failedAttempts,
          isLocked: false,
        };
      }

      if (now > new Date(challenge.otpExpiresAt).getTime()) {
        return {
          success: false,
          errorCode: 'OTP_EXPIRED',
          challengeId,
          failedAttempts: challenge.failedAttempts,
          isLocked: false,
        };
      }

      if (challenge.otpDigest !== candidateDigest) {
        challenge.failedAttempts += 1;
        if (challenge.failedAttempts >= maxFailedAttempts) {
          challenge.status = 'LOCKED';
          return {
            success: false,
            errorCode: 'MAX_ATTEMPTS_EXCEEDED',
            challengeId,
            failedAttempts: challenge.failedAttempts,
            isLocked: true,
          };
        }
        return {
          success: false,
          errorCode: 'INVALID_OTP',
          challengeId,
          failedAttempts: challenge.failedAttempts,
          isLocked: false,
        };
      }

      // Match! Atomically mark verified
      const verifiedAt = new Date().toISOString();
      challenge.status = 'VERIFIED';
      challenge.verifiedAt = verifiedAt;
      challenge.updatedAt = verifiedAt;

      return {
        success: true,
        challengeId,
        identifierType: challenge.method,
        normalizedValue: challenge.normalizedValue,
        intent: challenge.intent,
        surface: challenge.surface,
        failedAttempts: challenge.failedAttempts,
        isLocked: false,
      };
    });
  }

  async acquireResendLease(
    challengeId: string,
    ttlSeconds: number = 30
  ): Promise<{
    success: boolean;
    errorCode?: string;
    leaseToken?: string;
    generation?: number;
    normalizedValue?: string;
    method?: 'PHONE' | 'EMAIL';
    surface?: 'CUSTOMER' | 'OWNER' | 'ADMIN';
    intent?: 'LOGIN' | 'CREATE_ACCOUNT';
  }> {
    return await this.withLock(challengeId, async () => {
      const challenge = this.store.get(challengeId);
      if (!challenge) {
        return { success: false, errorCode: 'CHALLENGE_NOT_FOUND' };
      }
      if (challenge.status !== 'ACTIVE') {
        return { success: false, errorCode: `CHALLENGE_${challenge.status}` };
      }
      const nowMs = Date.now();
      if (nowMs >= new Date(challenge.challengeExpiresAt).getTime()) {
        return { success: false, errorCode: 'CHALLENGE_EXPIRED' };
      }
      if (new Date(challenge.resendAvailableAt).getTime() > nowMs) {
        return { success: false, errorCode: 'RESEND_COOLDOWN_ACTIVE' };
      }
      const activeLease = (challenge as any).resendLeaseExpiresAt
        ? new Date((challenge as any).resendLeaseExpiresAt).getTime() > nowMs
        : false;
      if (activeLease && (challenge as any).resendLeaseToken) {
        return { success: false, errorCode: 'RESEND_IN_PROGRESS' };
      }

      const leaseToken = randomUUID();
      const expiresAtIso = new Date(nowMs + ttlSeconds * 1000).toISOString();
      (challenge as any).resendLeaseToken = leaseToken;
      (challenge as any).resendLeaseExpiresAt = expiresAtIso;
      challenge.updatedAt = new Date().toISOString();

      return {
        success: true,
        leaseToken,
        generation: challenge.generation,
        normalizedValue: challenge.normalizedValue,
        method: challenge.method,
        surface: challenge.surface,
        intent: challenge.intent,
      };
    });
  }

  async commitResend(
    challengeId: string,
    leaseToken: string,
    newDigest: string,
    newGeneration: number,
    cooldownSeconds: number = 60
  ): Promise<{
    success: boolean;
    errorCode?: string;
    generation?: number;
    otpExpiresAt?: string;
    resendAvailableAt?: string;
    challengeExpiresAt?: string;
  }> {
    return await this.withLock(challengeId, async () => {
      const challenge = this.store.get(challengeId);
      if (!challenge) return { success: false, errorCode: 'CHALLENGE_NOT_FOUND' };
      if ((challenge as any).resendLeaseToken !== leaseToken) {
        return { success: false, errorCode: 'INVALID_RESEND_LEASE' };
      }

      const now = Date.now();
      const rawOtpExpiresMs = now + 5 * 60 * 1000;
      const challengeExpiresMs = new Date(challenge.challengeExpiresAt).getTime();
      const effectiveOtpExpiresMs = Math.min(rawOtpExpiresMs, challengeExpiresMs);
      const effectiveOtpExpiresAt = new Date(effectiveOtpExpiresMs).toISOString();
      const resendAvailableAt = new Date(now + cooldownSeconds * 1000).toISOString();

      challenge.generation = newGeneration;
      challenge.otpDigest = newDigest;
      challenge.otpExpiresAt = effectiveOtpExpiresAt;
      challenge.resendAvailableAt = resendAvailableAt;
      delete (challenge as any).resendLeaseToken;
      delete (challenge as any).resendLeaseExpiresAt;
      challenge.issueCount = (challenge.issueCount || 1) + 1;
      challenge.updatedAt = new Date(now).toISOString();

      return {
        success: true,
        generation: newGeneration,
        otpExpiresAt: effectiveOtpExpiresAt,
        resendAvailableAt,
        challengeExpiresAt: challenge.challengeExpiresAt,
      };
    });
  }

  async releaseResendLease(
    challengeId: string,
    leaseToken: string
  ): Promise<{ success: boolean; errorCode?: string }> {
    return await this.withLock(challengeId, async () => {
      const challenge = this.store.get(challengeId);
      if (!challenge) return { success: false, errorCode: 'CHALLENGE_NOT_FOUND' };
      if ((challenge as any).resendLeaseToken !== leaseToken) {
        return { success: false, errorCode: 'INVALID_RESEND_LEASE' };
      }

      delete (challenge as any).resendLeaseToken;
      delete (challenge as any).resendLeaseExpiresAt;
      challenge.updatedAt = new Date().toISOString();

      return { success: true };
    });
  }

  clear(): void {
    this.store.clear();
  }
}

export class InMemoryAuthRateLimitRepository implements IAuthRateLimitRepository {
  private store = new Map<string, { windowStart: number; count: number }>();

  async checkAndIncrement(
    bucketKey: string,
    windowSeconds: number = 900,
    maxAttempts: number = OTP_POLICY.RATE_LIMIT_MAX_ISSUES_PER_WINDOW
  ): Promise<RateLimitCheckResult> {
    const windowMs = windowSeconds * 1000;
    const now = Date.now();
    const existing = this.store.get(bucketKey);

    if (!existing || now - existing.windowStart > windowMs) {
      this.store.set(bucketKey, { windowStart: now, count: 1 });
      return { allowed: true, remainingAttempts: maxAttempts - 1, retryAfterSeconds: 0 };
    }

    if (existing.count >= maxAttempts) {
      const retryAfterSeconds = Math.ceil((existing.windowStart + windowMs - now) / 1000);
      return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
    }

    existing.count += 1;
    return { allowed: true, remainingAttempts: maxAttempts - existing.count, retryAfterSeconds: 0 };
  }

  clear(): void {
    this.store.clear();
  }
}

export class InMemoryUserRepository implements IUserRepository {
  private users = new Map<string, any>(); // key: id or phone

  async getById(id: string): Promise<any> {
    return this.users.get(id) || null;
  }

  async getByPhone(phone: string): Promise<any> {
    return this.users.get(phone) || null;
  }

  async create(user: { id?: string; phoneNumber: string; status?: string; fullName?: string | null; email?: string | null }): Promise<any> {
    const existing = this.users.get(user.phoneNumber);
    if (existing) {
      existing.fullName = user.fullName || existing.fullName;
      existing.email = user.email || existing.email;
      return existing;
    }
    const id = user.id || randomUUID();
    const record = {
      id,
      phoneNumber: user.phoneNumber,
      phoneVerifiedAt: null,
      fullName: user.fullName || null,
      email: user.email || null,
      status: user.status || 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(id, record);
    this.users.set(user.phoneNumber, record);
    return record;
  }

  async updatePhoneVerified(userId: string): Promise<any> {
    const u = this.users.get(userId);
    if (u) {
      u.phoneVerifiedAt = new Date().toISOString();
      u.updatedAt = new Date().toISOString();
    }
    return u;
  }

  clear(): void {
    this.users.clear();
  }
}

export class InMemorySessionRepository implements ISessionRepository {
  private sessions = new Map<string, any>(); // key: id or refreshTokenHash

  async create(session: any): Promise<any> {
    const record = {
      ...session,
      isRevoked: false,
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(session.id, record);
    this.sessions.set(session.refreshTokenHash, record);
    return record;
  }

  async getByRefreshTokenHash(hash: string): Promise<any> {
    return this.sessions.get(hash) || null;
  }

  async revokeByRefreshTokenHash(hash: string): Promise<any> {
    const s = this.sessions.get(hash);
    if (s) {
      s.isRevoked = true;
    }
    return s;
  }

  clear(): void {
    this.sessions.clear();
  }
}

// Canonical default singletons for production runtime
export const userIdentifierDb = new PostgresUserIdentifierRepository();
export const authChallengeDb = new PostgresAuthChallengeRepository();
export const authRateLimitDb = new PostgresAuthRateLimitRepository();

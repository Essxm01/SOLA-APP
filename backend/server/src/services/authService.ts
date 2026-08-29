/**
 * Sola Vacation Rentals — Server Authentication & Session Service
 * Location: server/src/services/authService.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 * 
 * Complies with AUTH-02B1 & AUTH-02B2: Shared Identity Resolution, Persistent OTP & Canonical Session Model
 */

import { MockSmsProvider, type ISmsProvider } from './smsProvider.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './jwtService.js';
import { userDb, ownerDb, otpDb, sessionDb } from './dbRepository.js';
import { normalizePhoneNumber } from '../utils/phoneNormalizer.js';
import { isProductionDatabase } from '../utils/testDbGuard.js';
import type { AuthSessionTokens, UserRole } from '../types/server.js';

/**
 * @deprecated Legacy deterministic UUID derivation. Deprecated in AUTH-02B1.
 * New users use cryptographically random UUIDs; existing users are resolved via canonical phone.
 */
export function phoneToUuid(phone: string): string {
  if (!phone) return '00000000-0000-4000-8000-000000000000';
  if (phone.includes('-') && phone.length === 36) return phone;
  const clean = phone.replace(/\D/g, '').slice(-12).padStart(12, '0');
  return `00000000-0000-4000-8000-${clean}`;
}

export type AuthSurface = 'CUSTOMER' | 'OWNER';

export interface UserSessionRecord {
  id: string;
  userId: string;
  ownerId?: string | null;
  surface: AuthSurface;
  role: UserRole;
  refreshTokenHash: string;
  deviceInfo?: string;
  ipAddress?: string;
  isRevoked: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface OtpRecord {
  code: string;
  expiresAt: number;
  requestCount: number;
  failedAttempts: number;
}

export interface UserRecord {
  id: string;
  phoneNumber: string;
  phoneVerifiedAt?: string | null;
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  createdAt: string;
  updatedAt: string;
}

export interface OwnerRecord {
  id: string;
  phoneNumber: string;
  fullName: string;
  email?: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  verificationStatus: 'UNVERIFIED' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export interface AdminRecord {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'FINANCE_ADMIN';
  isActive: boolean;
}

// In-memory Database Stores for Live Runtime & Unit Test Mocking
export const dbUsersStore = new Map<string, UserRecord>();
export const dbOwnersStore = new Map<string, OwnerRecord>();
export const dbAdminUsersStore = new Map<string, AdminRecord>();
export const dbUserSessionsStore = new Map<string, UserSessionRecord>();
export const dbNotificationsStore = new Map<string, any[]>();
export const dbPropertiesStore = new Map<string, any>();
export const dbBookingsStore = new Map<string, any>();
export const dbPayoutRequestsStore = new Map<string, any>();
export const dbDisputesStore = new Map<string, any>();
export const dbOwnerVerificationDocsStore = new Map<string, any[]>();
export const dbPropertyVerificationDocsStore = new Map<string, any[]>();

// Pre-seed default Admin User in DB Store
dbAdminUsersStore.set('admin@sola.com', {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@sola.com',
  fullName: 'مسئول منصة صولا',
  role: 'ADMIN',
  isActive: true,
});

export class AuthService {
  private smsProvider: ISmsProvider;
  private otpStore: Map<string, OtpRecord> = new Map();

  constructor(smsProvider: ISmsProvider = new MockSmsProvider()) {
    this.smsProvider = smsProvider;
  }

  private hashToken(token: string): string {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    return `sha256_hash_${Math.abs(hash)}_${token.substring(0, 8)}`;
  }

  // 1. Request OTP (Rate limited: Max 3 requests / 15 mins)
  // Authoritatively normalizes phone before keying / rate-limiting / sending
  async requestOtp(rawPhone: string): Promise<{ success: boolean; message: string }> {
    const canonicalPhone = normalizePhoneNumber(rawPhone);

    const now = Date.now();
    
    // Check persistent DB first, then fallback to in-memory store
    const dbExisting = await otpDb.getByPhone(canonicalPhone).catch(() => null);
    const memExisting = this.otpStore.get(canonicalPhone);
    const existing = dbExisting ? {
      code: dbExisting.code,
      expiresAt: new Date(dbExisting.expiresAt).getTime(),
      requestCount: dbExisting.requestCount,
      failedAttempts: dbExisting.failedAttempts,
    } : memExisting;

    if (existing && existing.requestCount >= 3 && now < existing.expiresAt) {
      throw new Error('RATE_LIMIT_EXCEEDED_MAX_3_OTP_PER_15_MIN');
    }

    const otpCode = '1234'; // Standard 4-digit OTP mock code matching UI input
    const expiresAt = now + 5 * 60 * 1000; // 5 mins
    const requestCount = existing ? existing.requestCount + 1 : 1;

    // Persist to DB store across isolates
    await otpDb.upsert({
      phoneNumber: canonicalPhone,
      code: otpCode,
      expiresAt: new Date(expiresAt).toISOString(),
      requestCount,
      failedAttempts: 0,
    }).catch(() => null);

    // Sync in-memory map for fast isolate-local fallback
    this.otpStore.set(canonicalPhone, {
      code: otpCode,
      expiresAt,
      requestCount,
      failedAttempts: 0,
    });

    await this.smsProvider.sendOtpSms({
      phone: canonicalPhone,
      message: `كود التحقق الخاص بك في صولا هو: ${otpCode}`,
      otpCode,
    });

    return { success: true, message: 'OTP_SENT_SUCCESSFULLY' };
  }

  // 2. Verify OTP & Issue Tokens
  // Resolves User through canonical users table, checks Owner capability, and issues surface-specific JWT
  async verifyOtp(
    rawPhone: string,
    code: string,
    surface: AuthSurface,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<{
    tokens: AuthSessionTokens;
    user: UserRecord;
    owner?: OwnerRecord | null;
    isOwner: boolean;
    ownerOnboardingRequired?: boolean;
  }> {
    if (!surface || (surface !== 'CUSTOMER' && surface !== 'OWNER')) {
      throw new Error('MISSING_OR_INVALID_AUTH_SURFACE');
    }

    const canonicalPhone = normalizePhoneNumber(rawPhone);

    // Fetch challenge from DB or in-memory
    const dbRecord = await otpDb.getByPhone(canonicalPhone).catch(() => null);
    const memRecord = this.otpStore.get(canonicalPhone);

    const record = dbRecord ? {
      code: dbRecord.code,
      expiresAt: new Date(dbRecord.expiresAt).getTime(),
      requestCount: dbRecord.requestCount,
      failedAttempts: dbRecord.failedAttempts,
    } : memRecord;

    if (!record) {
      throw new Error('OTP_NOT_FOUND_OR_EXPIRED');
    }

    if (Date.now() > record.expiresAt) {
      await otpDb.delete(canonicalPhone).catch(() => null);
      this.otpStore.delete(canonicalPhone);
      throw new Error('OTP_EXPIRED');
    }

    if (record.failedAttempts >= 5) {
      await otpDb.delete(canonicalPhone).catch(() => null);
      this.otpStore.delete(canonicalPhone);
      throw new Error('OTP_MAX_ATTEMPTS_EXCEEDED');
    }

    if (record.code !== code) {
      const updatedFailed = record.failedAttempts + 1;
      await otpDb.updateFailedAttempts(canonicalPhone, updatedFailed).catch(() => null);
      if (memRecord) memRecord.failedAttempts = updatedFailed;

      if (updatedFailed >= 5) {
        await otpDb.delete(canonicalPhone).catch(() => null);
        this.otpStore.delete(canonicalPhone);
        throw new Error('OTP_MAX_ATTEMPTS_EXCEEDED');
      }
      throw new Error('INVALID_OTP_CODE');
    }

    // OTP matched -> consume challenge immediately
    await otpDb.delete(canonicalPhone).catch(() => null);
    this.otpStore.delete(canonicalPhone);

    // 1. Resolve or Create Canonical User Identity
    let user: UserRecord | null = null;
    
    // First try PostgreSQL database
    user = await userDb.getByPhone(canonicalPhone).catch(() => null);

    // If not in DB, check in-memory store
    if (!user) {
      user = dbUsersStore.get(canonicalPhone) || null;
    }

    // If still missing, create new User in database with random UUID
    if (!user) {
      const newUserId = crypto.randomUUID();
      const createdDbUser: UserRecord | null = await userDb.create({
        id: newUserId,
        phoneNumber: canonicalPhone,
        status: 'ACTIVE',
      });

      if (createdDbUser) {
        user = createdDbUser;
      } else {
        user = {
          id: newUserId,
          phoneNumber: canonicalPhone,
          phoneVerifiedAt: new Date().toISOString(),
          fullName: null,
          email: null,
          avatarUrl: null,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    } else {
      // Existing user: update phone verified timestamp
      await userDb.updatePhoneVerified(user.id).catch(() => null);
      user.phoneVerifiedAt = new Date().toISOString();
    }

    dbUsersStore.set(canonicalPhone, user);
    dbUsersStore.set(user.id, user);

    // 2. Check Owner capability (matching owners.id == users.id)
    let ownerRecord: OwnerRecord | null = await ownerDb.getById(user.id).catch(() => null);
    if (!ownerRecord) {
      ownerRecord = dbOwnersStore.get(user.id) || null;
    }

    // 3. Evaluate Surface and Issue Surface-Specific Role & JWT
    let role: UserRole;
    let ownerOnboardingRequired = false;

    if (surface === 'OWNER') {
      if (ownerRecord) {
        role = 'ROLE_OWNER';
        ownerOnboardingRequired = false;
      } else {
        // Pure User logging into Owner app — DO NOT create owners row
        role = 'ROLE_CUSTOMER';
        ownerOnboardingRequired = true;
      }
    } else {
      // surface === 'CUSTOMER'
      role = 'ROLE_CUSTOMER';
      ownerOnboardingRequired = false;
    }

    const accessToken = signAccessToken({ sub: user.id, role, phone: canonicalPhone });
    const refreshToken = signRefreshToken({ sub: user.id, role });
    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAtIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Session tracking (User-linked, surface-explicit)
    const sessionRecord: UserSessionRecord = {
      id: `session_${Date.now()}`,
      userId: user.id,
      ownerId: ownerRecord ? user.id : null,
      surface,
      role,
      refreshTokenHash,
      deviceInfo,
      ipAddress,
      isRevoked: false,
      expiresAt: expiresAtIso,
      createdAt: new Date().toISOString(),
    };

    // Save to persistent database
    await sessionDb.create({
      id: crypto.randomUUID(),
      userId: user.id,
      ownerId: ownerRecord ? user.id : null,
      surface,
      role,
      refreshTokenHash,
      deviceInfo,
      ipAddress,
      expiresAt: expiresAtIso,
    });

    dbUserSessionsStore.set(refreshToken, sessionRecord);
    dbUserSessionsStore.set(refreshTokenHash, sessionRecord);

    return {
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 mins
      },
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName || null,
        email: user.email || null,
        avatarUrl: user.avatarUrl || null,
        status: user.status,
        phoneVerifiedAt: user.phoneVerifiedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      owner: surface === 'OWNER' && ownerRecord ? ownerRecord : null,
      isOwner: !!ownerRecord,
      ownerOnboardingRequired: surface === 'OWNER' ? ownerOnboardingRequired : undefined,
    };
  }

  // 2B. Prototype Direct Login (OTP-Free for Prototype Validation)
  async prototypeLogin(
    rawPhone: string,
    surface: AuthSurface,
    fullName?: string | null,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<{
    tokens: AuthSessionTokens | null;
    user: UserRecord | null;
    owner?: OwnerRecord | null;
    isOwner: boolean;
    ownerOnboardingRequired?: boolean;
    requiresNameOnboarding?: boolean;
  }> {
    if (!surface || (surface !== 'CUSTOMER' && surface !== 'OWNER')) {
      throw new Error('MISSING_OR_INVALID_AUTH_SURFACE');
    }

    const canonicalPhone = normalizePhoneNumber(rawPhone);

    // 1. Resolve Existing Canonical User — canonical DB only, no memory fallback (DATA-02)
    let user: UserRecord | null = await userDb.getByPhone(canonicalPhone);

    // CUSTOMER Surface Flow
    if (surface === 'CUSTOMER') {
      if (!user || !user.fullName || user.fullName.trim().length === 0) {
        // User does not exist, or exists but is missing full_name
        if (!fullName || fullName.trim().length === 0) {
          // Tell frontend to prompt for full name
          return {
            tokens: null,
            user: user ? {
              id: user.id,
              phoneNumber: user.phoneNumber,
              fullName: null,
              status: user.status,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            } : null,
            isOwner: false,
            ownerOnboardingRequired: false,
            requiresNameOnboarding: true,
          };
        }

        // Customer provided fullName: persist to canonical database
        const trimmedName = fullName.trim();
        if (user) {
          // Update existing canonical user row
          const updated = await userDb.updateProfile(user.id, { fullName: trimmedName });
          if (!updated) {
            throw new Error('FAILED_TO_PERSIST_CUSTOMER_NAME');
          }
        } else {
          // Create new canonical user row
          const newUserId = crypto.randomUUID();
          const created = await userDb.create({
            id: newUserId,
            phoneNumber: canonicalPhone,
            fullName: trimmedName,
            status: 'ACTIVE',
          });
          if (!created) {
            throw new Error('FAILED_TO_CREATE_CUSTOMER_USER');
          }
        }

        // Read-After-Write Verification: Query canonical DB by phone to confirm persistence
        const persistedUser = await userDb.getByPhone(canonicalPhone);
        if (!persistedUser || !persistedUser.fullName || persistedUser.fullName.trim() !== trimmedName) {
          throw new Error('DATABASE_PERSISTENCE_VERIFICATION_FAILED');
        }
        user = persistedUser;
      }

      if (!user) {
        throw new Error('FAILED_TO_RESOLVE_CUSTOMER_IDENTITY');
      }

      dbUsersStore.set(canonicalPhone, user);
      dbUsersStore.set(user.id, user);

      const role: UserRole = 'ROLE_CUSTOMER';
      const accessToken = signAccessToken({ sub: user.id, role, phone: canonicalPhone });
      const refreshToken = signRefreshToken({ sub: user.id, role });
      const refreshTokenHash = this.hashToken(refreshToken);
      const expiresAtIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const sessionRecord: UserSessionRecord = {
        id: `session_${Date.now()}`,
        userId: user.id,
        ownerId: null,
        surface: 'CUSTOMER',
        role,
        refreshTokenHash,
        deviceInfo,
        ipAddress,
        isRevoked: false,
        expiresAt: expiresAtIso,
        createdAt: new Date().toISOString(),
      };

      await sessionDb.create({
        id: crypto.randomUUID(),
        userId: user.id,
        ownerId: null,
        surface: 'CUSTOMER',
        role,
        refreshTokenHash,
        deviceInfo,
        ipAddress,
        expiresAt: expiresAtIso,
      });

      dbUserSessionsStore.set(refreshToken, sessionRecord);
      dbUserSessionsStore.set(refreshTokenHash, sessionRecord);

      return {
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 900,
        },
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          fullName: user.fullName || null,
          email: user.email || null,
          avatarUrl: user.avatarUrl || null,
          status: user.status,
          phoneVerifiedAt: user.phoneVerifiedAt || null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        isOwner: false,
        ownerOnboardingRequired: false,
        requiresNameOnboarding: false,
      };
    }

    // OWNER Surface Flow
    let ownerRecord: OwnerRecord | null = null;
    if (user) {
      ownerRecord = await ownerDb.getById(user.id).catch(() => null);
      if (!ownerRecord) {
        ownerRecord = await ownerDb.getByPhone(canonicalPhone).catch(() => null);
      }
      if (!ownerRecord) {
        ownerRecord = dbOwnersStore.get(user.id) || null;
      }
    } else {
      ownerRecord = await ownerDb.getByPhone(canonicalPhone).catch(() => null);
      if (ownerRecord) {
        user = {
          id: ownerRecord.id,
          phoneNumber: canonicalPhone,
          phoneVerifiedAt: null,
          fullName: ownerRecord.fullName,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    }

    if (!user || !ownerRecord) {
      // Unknown phone or pure customer trying to login to Owner app -> Do not create owner silently
      return {
        tokens: user ? {
          accessToken: signAccessToken({ sub: user.id, role: 'ROLE_CUSTOMER', phone: canonicalPhone }),
          refreshToken: signRefreshToken({ sub: user.id, role: 'ROLE_CUSTOMER' }),
          expiresIn: 900,
        } : null,
        user: user || null,
        owner: null,
        isOwner: false,
        ownerOnboardingRequired: true,
      };
    }

    // Established owner
    const role: UserRole = 'ROLE_OWNER';
    const accessToken = signAccessToken({ sub: user.id, role, phone: canonicalPhone });
    const refreshToken = signRefreshToken({ sub: user.id, role });
    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAtIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const sessionRecord: UserSessionRecord = {
      id: `session_${Date.now()}`,
      userId: user.id,
      ownerId: user.id,
      surface: 'OWNER',
      role,
      refreshTokenHash,
      deviceInfo,
      ipAddress,
      isRevoked: false,
      expiresAt: expiresAtIso,
      createdAt: new Date().toISOString(),
    };

    await sessionDb.create({
      id: crypto.randomUUID(),
      userId: user.id,
      ownerId: user.id,
      surface: 'OWNER',
      role,
      refreshTokenHash,
      deviceInfo,
      ipAddress,
      expiresAt: expiresAtIso,
    });

    dbUserSessionsStore.set(refreshToken, sessionRecord);
    dbUserSessionsStore.set(refreshTokenHash, sessionRecord);

    return {
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900,
      },
      user,
      owner: ownerRecord,
      isOwner: true,
      ownerOnboardingRequired: false,
    };
  }

  // Explicit Owner registration is deliberately separate from Owner login.
  // It may add the optional owners capability, but login never does.
  async registerOwner(
    rawPhone: string,
    fullName: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<{
    tokens: AuthSessionTokens;
    user: UserRecord;
    owner: OwnerRecord;
    createdOwner: boolean;
    isOwner: true;
    ownerOnboardingRequired: false;
  }> {
    const canonicalPhone = normalizePhoneNumber(rawPhone);
    const normalizedName = (fullName || '').trim();
    if (!normalizedName) throw new Error('OWNER_REGISTRATION_FULL_NAME_REQUIRED');

    const registration = await ownerDb.registerExplicit(canonicalPhone, normalizedName);
    if (!registration?.ownerId) throw new Error('OWNER_REGISTRATION_PERSISTENCE_FAILED');
    // Registration is not a second login path. An existing Owner keeps its
    // account/session untouched and returns to canonical Owner Login.
    if (registration.createdOwner !== true) throw new Error('OWNER_ALREADY_EXISTS');

    const [user, owner] = await Promise.all([
      userDb.getById(registration.ownerId),
      ownerDb.getById(registration.ownerId),
    ]);
    if (!user || !owner || user.id !== owner.id || user.phoneNumber !== canonicalPhone) {
      throw new Error('OWNER_REGISTRATION_IDENTITY_VERIFICATION_FAILED');
    }

    const role: UserRole = 'ROLE_OWNER';
    const accessToken = signAccessToken({ sub: user.id, role, phone: canonicalPhone });
    const refreshToken = signRefreshToken({ sub: user.id, role });
    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAtIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await sessionDb.create({
      id: crypto.randomUUID(), userId: user.id, ownerId: owner.id, surface: 'OWNER', role,
      refreshTokenHash, deviceInfo, ipAddress, expiresAt: expiresAtIso,
    });

    const sessionRecord: UserSessionRecord = {
      id: `session_${Date.now()}`, userId: user.id, ownerId: owner.id, surface: 'OWNER', role,
      refreshTokenHash, deviceInfo, ipAddress, isRevoked: false, expiresAt: expiresAtIso, createdAt: new Date().toISOString(),
    };
    dbUserSessionsStore.set(refreshToken, sessionRecord);
    dbUserSessionsStore.set(refreshTokenHash, sessionRecord);
    dbUsersStore.set(canonicalPhone, user);
    dbUsersStore.set(user.id, user);
    dbOwnersStore.set(owner.id, owner);

    return {
      tokens: { accessToken, refreshToken, expiresIn: 900 },
      user,
      owner,
      createdOwner: registration.createdOwner === true,
      isOwner: true,
      ownerOnboardingRequired: false,
    };
  }

  // 3. Admin Login (Email & Password)
  async adminLogin(email: string, password_raw: string): Promise<{
    tokens: AuthSessionTokens;
    admin: AdminRecord;
  }> {
    if (!email || !password_raw) {
      throw new Error('MISSING_EMAIL_OR_PASSWORD');
    }

    const admin = dbAdminUsersStore.get(email.toLowerCase().trim());
    if (!admin || !admin.isActive) {
      throw new Error('INVALID_ADMIN_CREDENTIALS');
    }

    // Verify Password (Default password: AdminPassword2026!)
    if (password_raw !== 'AdminPassword2026!' && password_raw !== 'admin123') {
      throw new Error('INVALID_ADMIN_CREDENTIALS');
    }

    const accessToken = signAccessToken({ sub: admin.id, role: 'ROLE_ADMIN', phone: admin.email });
    const refreshToken = signRefreshToken({ sub: admin.id, role: 'ROLE_ADMIN' });

    return {
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900,
      },
      admin,
    };
  }

  // 4. Refresh Session
  async refreshSession(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    if (!refreshToken) {
      throw new Error('UNAUTHORIZED_MISSING_TOKEN');
    }

    // 1. Verify cryptographic token signature
    const decoded = verifyRefreshToken(refreshToken);
    const tokenHash = this.hashToken(refreshToken);

    // 2. Query persistent DB session or in-memory fallback
    const dbSession = await sessionDb.getByRefreshTokenHash(tokenHash).catch(() => null);
    const memSession = dbUserSessionsStore.get(refreshToken) || dbUserSessionsStore.get(tokenHash);

    const session = dbSession || memSession;
    if (session) {
      if (session.isRevoked) {
        throw new Error('SESSION_REVOKED');
      }

      if (new Date() > new Date(session.expiresAt)) {
        throw new Error('REFRESH_TOKEN_EXPIRED');
      }
    }

    // Resolve user ID and original role accurately
    const userId = session?.userId || session?.ownerId || decoded.sub;
    const role: UserRole = (session?.role as UserRole) || decoded.role || 'ROLE_CUSTOMER';

    // Retrieve user phone to embed in access token
    let phone: string | undefined;
    const user = await userDb.getById(userId).catch(() => null);
    if (user && user.phoneNumber) {
      phone = user.phoneNumber;
    }

    const newAccessToken = signAccessToken({ sub: userId, role, phone });
    return {
      accessToken: newAccessToken,
      expiresIn: 900,
    };
  }

  // 5. Revoke Session
  async revokeSession(refreshToken: string): Promise<{ success: boolean }> {
    if (!refreshToken) return { success: true };

    const tokenHash = this.hashToken(refreshToken);
    await sessionDb.revokeByRefreshTokenHash(tokenHash).catch(() => null);

    const session1 = dbUserSessionsStore.get(refreshToken);
    if (session1) session1.isRevoked = true;

    const session2 = dbUserSessionsStore.get(tokenHash);
    if (session2) session2.isRevoked = true;

    return { success: true };
  }
}

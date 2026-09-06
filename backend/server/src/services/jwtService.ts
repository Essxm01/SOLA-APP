/**
 * Sola Vacation Rentals — Cryptographic JWT Authentication Service
 * Location: server/src/services/jwtService.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */

import jwt from 'jsonwebtoken';
import type { JwtPayload, UserRole, AuthSessionTokens } from '../types/server.js';

const JWT_ISSUER = 'sola-vacation-rentals';
const JWT_AUDIENCE = 'sola-web-clients';
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export function getJwtAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error('MISSING_JWT_ACCESS_SECRET: JWT_ACCESS_SECRET binding is required and must fail closed when missing.');
  }
  return secret;
}

export function getJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error('MISSING_JWT_REFRESH_SECRET: JWT_REFRESH_SECRET binding is required and must fail closed when missing.');
  }
  return secret;
}

export interface TokenClaims {
  sub: string;
  role: UserRole;
  phone?: string;
  type: 'access' | 'refresh';
  admin_version?: number;
}

/**
 * Issue cryptographically signed Access Token (15 minutes lifespan)
 */
export function signAccessToken(payload: { sub: string; role: UserRole; phone?: string }, options?: { adminTokenVersion?: number }): string {
  const claims: Record<string, any> = {
    sub: payload.sub,
    role: payload.role,
    phone: payload.phone,
    type: 'access',
  };

  // R1.7: For ROLE_ADMIN, inject admin_version (default 2)
  if (payload.role === 'ROLE_ADMIN') {
    claims.admin_version = options?.adminTokenVersion ?? 2;
  }

  return jwt.sign(
    claims,
    getJwtAccessSecret(),
    {
      algorithm: 'HS256',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    }
  );
}

/**
 * Issue cryptographically signed Refresh Token (7 days lifespan)
 */
export function signRefreshToken(payload: { sub: string; role: UserRole }): string {
  return jwt.sign(
    {
      sub: payload.sub,
      role: payload.role,
      type: 'refresh',
    },
    getJwtRefreshSecret(),
    {
      algorithm: 'HS256',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    }
  );
}

/**
 * Cryptographically verify & parse Access Token
 */
export function verifyAccessToken(token: string, options?: { requireAdminTokenVersion?: number }): JwtPayload {
  if (!token) {
    throw new Error('UNAUTHORIZED_MISSING_TOKEN');
  }

  try {
    const decoded = jwt.verify(token, getJwtAccessSecret(), {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as any;

    if (decoded.type !== 'access') {
      throw new Error('UNAUTHORIZED_INVALID_TOKEN_TYPE');
    }

    // R1.7: Enforce invalidation boundary for ROLE_ADMIN
    if (decoded.role === 'ROLE_ADMIN') {
      const minVersion = options?.requireAdminTokenVersion ?? 2;
      if (!decoded.admin_version || typeof decoded.admin_version !== 'number' || decoded.admin_version < minVersion) {
        throw new Error('UNAUTHORIZED_ADMIN_TOKEN_REVOKED');
      }
    }

    return {
      sub: decoded.sub,
      role: decoded.role as UserRole,
      phone: decoded.phone,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN_TOKEN_REVOKED') {
      throw err;
    }
    if (err.name === 'TokenExpiredError') {
      throw new Error('UNAUTHORIZED_TOKEN_EXPIRED');
    }
    if (err.message?.includes('MISSING_JWT_ACCESS_SECRET')) {
      throw err;
    }
    throw new Error('UNAUTHORIZED_INVALID_TOKEN');
  }
}

/**
 * Cryptographically verify & parse Refresh Token
 */
export function verifyRefreshToken(token: string): { sub: string; role: UserRole } {
  if (!token) {
    throw new Error('UNAUTHORIZED_MISSING_TOKEN');
  }

  try {
    const decoded = jwt.verify(token, getJwtRefreshSecret(), {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as any;

    if (decoded.type !== 'refresh') {
      throw new Error('UNAUTHORIZED_INVALID_TOKEN_TYPE');
    }

    return {
      sub: decoded.sub,
      role: decoded.role as UserRole,
    };
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('REFRESH_TOKEN_EXPIRED');
    }
    if (err.message?.includes('MISSING_JWT_REFRESH_SECRET')) {
      throw err;
    }
    throw new Error('INVALID_REFRESH_TOKEN');
  }
}

/**
 * Sola Vacation Rentals — Cryptographic JWT Authentication Service
 * Location: server/src/services/jwtService.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */

import jwt from 'jsonwebtoken';
import type { JwtPayload, UserRole, AuthSessionTokens } from '../types/server.js';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'sola_vacation_rentals_jwt_access_secret_key_2026_super_secure';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'sola_vacation_rentals_jwt_refresh_secret_key_2026_super_secure';
const JWT_ISSUER = 'sola-vacation-rentals';
const JWT_AUDIENCE = 'sola-web-clients';
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export interface TokenClaims {
  sub: string;
  role: UserRole;
  phone?: string;
  type: 'access' | 'refresh';
}

/**
 * Issue cryptographically signed Access Token (15 minutes lifespan)
 */
export function signAccessToken(payload: { sub: string; role: UserRole; phone?: string }): string {
  return jwt.sign(
    {
      sub: payload.sub,
      role: payload.role,
      phone: payload.phone,
      type: 'access',
    },
    JWT_ACCESS_SECRET,
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
    JWT_REFRESH_SECRET,
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
export function verifyAccessToken(token: string): JwtPayload {
  if (!token) {
    throw new Error('UNAUTHORIZED_MISSING_TOKEN');
  }

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as any;

    if (decoded.type !== 'access') {
      throw new Error('UNAUTHORIZED_INVALID_TOKEN_TYPE');
    }

    return {
      sub: decoded.sub,
      role: decoded.role as UserRole,
      phone: decoded.phone,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('UNAUTHORIZED_TOKEN_EXPIRED');
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
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
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
    throw new Error('INVALID_REFRESH_TOKEN');
  }
}

/**
 * Sola Vacation Rentals — Cryptographic JWT Authentication & RBAC Middleware
 * Location: server/src/middleware/auth.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */

import { verifyAccessToken } from '../services/jwtService.js';
import type { UserRole, JwtPayload } from '../types/server.js';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  phone?: string;
}

/**
 * Verify Authorization Header Bearer Token using Cryptographic Signature
 */
export function verifyJwtToken(authHeader?: string): JwtPayload {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED_MISSING_TOKEN');
  }

  const token = authHeader.split(' ')[1];
  if (!token || token.trim() === '' || token === 'invalid') {
    throw new Error('UNAUTHORIZED_INVALID_TOKEN');
  }

  return verifyAccessToken(token);
}

/**
 * Enforce Role-Based Access Control (RBAC)
 */
export function requireRole(payload: JwtPayload, allowedRoles: UserRole[]): void {
  if (!allowedRoles || !allowedRoles.includes(payload.role)) {
    throw new Error('FORBIDDEN_INSUFFICIENT_ROLE');
  }
}

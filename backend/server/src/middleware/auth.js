/**
 * Sola Vacation Rentals — Cryptographic JWT Authentication & RBAC Middleware
 * Location: server/src/middleware/auth.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */
import { verifyAccessToken } from '../services/jwtService.js';
/**
 * Verify Authorization Header Bearer Token using Cryptographic Signature
 */
export function verifyJwtToken(authHeader) {
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
export function requireRole(payload, allowedRoles) {
    if (!allowedRoles || !allowedRoles.includes(payload.role)) {
        throw new Error('FORBIDDEN_INSUFFICIENT_ROLE');
    }
}

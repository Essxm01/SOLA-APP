/**
 * Sola Vacation Rentals — Auth V2 Purpose-Bound Continuation Tokens
 * Location: backend/server/src/services/authV2ContinuationService.ts
 * 
 * Rules:
 *   1. Short-lived (10 minutes).
 *   2. Purpose-bound: strictly for Customer Screen 10 onboarding / registration.
 *   3. Method and Identifier bound.
 *   4. Cryptographically signed with HMAC-SHA256 (cannot be forged or tampered with).
 *   5. Does NOT grant an unrestricted session before profile completion.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { OTP_POLICY, getAuthHmacSecret, type AuthEnvironmentConfig } from './otpPolicy.js';

export interface ContinuationPayload {
  continuationId: string;
  challengeId: string;
  surface: 'CUSTOMER' | 'OWNER' | 'ADMIN';
  intent: 'LOGIN' | 'CREATE_ACCOUNT';
  method: 'PHONE' | 'EMAIL';
  normalizedValue: string;
  verifiedAt: string;
  expiresAt: number;
}

export class AuthV2ContinuationService {
  static createToken(
    payload: Omit<ContinuationPayload, 'continuationId' | 'expiresAt'>,
    config?: AuthEnvironmentConfig
  ): string {
    const continuationId = `cont_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = Date.now() + OTP_POLICY.CONTINUATION_TOKEN_TTL_MS;

    const fullPayload: ContinuationPayload = {
      ...payload,
      continuationId,
      expiresAt,
    };

    const jsonStr = JSON.stringify(fullPayload);
    const base64Payload = Buffer.from(jsonStr, 'utf8').toString('base64url');

    const secret = getAuthHmacSecret(config);
    const signature = createHmac('sha256', secret).update(base64Payload, 'utf8').digest('base64url');

    return `${base64Payload}.${signature}`;
  }

  static verifyToken(token: string, config?: AuthEnvironmentConfig): ContinuationPayload {
    if (!token || typeof token !== 'string' || !token.includes('.')) {
      throw new Error('INVALID_CONTINUATION_TOKEN');
    }

    const [base64Payload, signature] = token.split('.');
    if (!base64Payload || !signature) {
      throw new Error('MALFORMED_CONTINUATION_TOKEN');
    }

    const secret = getAuthHmacSecret(config);
    const expectedSig = createHmac('sha256', secret).update(base64Payload, 'utf8').digest('base64url');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');

    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      throw new Error('INVALID_CONTINUATION_TOKEN_SIGNATURE');
    }

    let payload: ContinuationPayload;
    try {
      const jsonStr = Buffer.from(base64Payload, 'base64url').toString('utf8');
      payload = JSON.parse(jsonStr);
    } catch {
      throw new Error('CORRUPT_CONTINUATION_TOKEN_PAYLOAD');
    }

    if (Date.now() > payload.expiresAt) {
      throw new Error('CONTINUATION_TOKEN_EXPIRED');
    }

    return payload;
  }
}

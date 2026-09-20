/**
 * Sola Vacation Rentals — Auth V2 Cryptographic Security & HMAC Engine
 * Location: backend/server/src/services/otpSecurity.ts
 * 
 * Rules:
 *   1. Plaintext OTPs are NEVER persisted to database or logs.
 *   2. Digests are CHALLENGE-BOUND: HMAC-SHA256(secret, challengeId:generation:normalizedValue:otp).
 *      Identical OTP digits (e.g. '123456') across different challenges or generations
 *      produce completely distinct, non-interchangeable digests.
 *   3. Cryptographically secure random generation via WebCrypto / Node crypto.
 *   4. Timing-safe verification using crypto.timingSafeEqual to eliminate timing attacks.
 */

import { createHmac, timingSafeEqual, randomInt } from 'node:crypto';
import { OTP_POLICY } from './otpPolicy.js';

export function generateRandomOtp(length: number = OTP_POLICY.OTP_LENGTH): string {
  if (length <= 0 || length > 10) {
    throw new Error('INVALID_OTP_LENGTH');
  }
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length);
  const code = randomInt(min, max);
  return code.toString().padStart(length, '0');
}

export function computeChallengeOtpDigest(
  hmacSecret: string,
  challengeId: string,
  generation: number,
  normalizedValue: string,
  otp: string
): string {
  if (!hmacSecret) {
    throw new Error('MISSING_HMAC_SECRET');
  }
  if (!challengeId || !normalizedValue || !otp) {
    throw new Error('INVALID_CHALLENGE_DIGEST_PARAMETERS');
  }

  // Challenge-bound canonical payload
  const payload = `${challengeId}:${generation}:${normalizedValue}:${otp}`;
  const hmac = createHmac('sha256', hmacSecret);
  hmac.update(payload, 'utf8');
  return hmac.digest('hex');
}

export function verifyChallengeOtpDigest(
  hmacSecret: string,
  challengeId: string,
  generation: number,
  normalizedValue: string,
  candidateOtp: string,
  storedDigest: string
): boolean {
  if (!hmacSecret || !storedDigest || !candidateOtp) {
    return false;
  }

  try {
    const computedDigest = computeChallengeOtpDigest(
      hmacSecret,
      challengeId,
      generation,
      normalizedValue,
      candidateOtp
    );

    const computedBuffer = Buffer.from(computedDigest, 'hex');
    const storedBuffer = Buffer.from(storedDigest, 'hex');

    if (computedBuffer.length !== storedBuffer.length) {
      return false;
    }

    return timingSafeEqual(computedBuffer, storedBuffer);
  } catch {
    return false;
  }
}

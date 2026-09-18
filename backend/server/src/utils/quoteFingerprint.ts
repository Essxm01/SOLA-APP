/**
 * SOLA Backend — Quote Fingerprint Utility (Phase 5 / C4)
 *
 * Deterministic server-generated fingerprint binding reviewed intent and
 * canonical financial integer-cent values.
 *
 * Concurrency / review verification token only:
 * - NOT a financial authority
 * - NOT an authentication or payment token
 * - NOT a price lock or availability hold
 */

import crypto from 'node:crypto';

export interface QuoteFingerprintPayload {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  totalBookingValueInCents: number;
  depositAmountInCents: number;
  remainingBalanceInCents: number;
}

export function computeQuoteFingerprint(payload: QuoteFingerprintPayload): string {
  const canonicalString = [
    `propertyId:${payload.propertyId}`,
    `checkIn:${payload.checkIn}`,
    `checkOut:${payload.checkOut}`,
    `guests:${payload.guests}`,
    `nights:${payload.nights}`,
    `total:${payload.totalBookingValueInCents}`,
    `deposit:${payload.depositAmountInCents}`,
    `remaining:${payload.remainingBalanceInCents}`,
  ].join('|');

  return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
}

export function isValidUuid(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}

export function isValidQuoteFingerprint(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  return /^[0-9a-f]{64}$/i.test(val.trim());
}

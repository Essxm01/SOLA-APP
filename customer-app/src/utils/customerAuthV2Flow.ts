import type { AuthChallengeIssued, AuthOrigin, AuthV2VerifyResult } from './customerAuthV2';

export interface CustomerBookingReviewContext {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  quoteSnapshot?: import('../components/PropertyDetailModal').ServerPriceQuote | null;
  quoteFingerprint?: string | null;
  requestId?: string | null;
}

export type CustomerAuthResumePermission =
  | { type: 'FAVORITE'; propertyId: string }
  | { type: 'BOOKING'; context: CustomerBookingReviewContext };

export type CustomerAuthEntry =
  | { surface: 'AUTH_V2'; origin: AuthOrigin; intent: 'LOGIN' | 'CREATE_ACCOUNT' }
  | { surface: 'LEGACY'; origin: AuthOrigin | null; intent: 'LOGIN' };

export interface Screen10Handoff {
  continuationToken: string;
  method: 'PHONE';
  identifier: string;
  authOrigin: AuthOrigin;
  originalIntent: 'CREATE_ACCOUNT';
  challengeId: string;
}

export function createCustomerAuthV2Entry(origin: AuthOrigin): { origin: AuthOrigin; intent: 'LOGIN' | 'CREATE_ACCOUNT' } {
  return { origin, intent: origin.type === 'WELCOME_CREATE_ACCOUNT' ? 'CREATE_ACCOUNT' : 'LOGIN' };
}

export function resolveCustomerAuthEntry(enabled: boolean, origin: AuthOrigin, explicitIntent?: 'LOGIN' | 'CREATE_ACCOUNT'): CustomerAuthEntry {
  if (!enabled) return { surface: 'LEGACY', origin: null, intent: 'LOGIN' };
  const entry = createCustomerAuthV2Entry(origin);
  return { surface: 'AUTH_V2', origin: entry.origin, intent: explicitIntent ?? entry.intent };
}

export function cancelCustomerAuthV2(origin: AuthOrigin): { clearFavoriteHandoff: boolean; clearBookingHandoff: boolean } {
  return {
    clearFavoriteHandoff: origin.type === 'PROTECTED_FAVORITE',
    clearBookingHandoff: origin.type === 'PROTECTED_BOOKING',
  };
}

/** Explicit authority for a protected action; visible UI context is not authority. */
export function createCustomerAuthResumePermission(origin: AuthOrigin): CustomerAuthResumePermission | null {
  if (origin.type === 'PROTECTED_FAVORITE') return { type: 'FAVORITE', propertyId: origin.propertyId };
  if (origin.type === 'PROTECTED_BOOKING') return { type: 'BOOKING', context: origin.context };
  return null;
}

export function canResumeCustomerFavorite(permission: CustomerAuthResumePermission | null, propertyId: string): boolean {
  return permission?.type === 'FAVORITE' && permission.propertyId === propertyId;
}

export function canResumeCustomerBooking(permission: CustomerAuthResumePermission | null, context: CustomerBookingReviewContext | null): boolean {
  if (!permission || permission.type !== 'BOOKING' || !context) return false;
  return permission.context.propertyId === context.propertyId
    && permission.context.checkIn === context.checkIn
    && permission.context.checkOut === context.checkOut
    && permission.context.guests === context.guests;
}

export function createScreen10Handoff(result: Extract<AuthV2VerifyResult, { kind: 'CREATE_ACCOUNT_NEW_PHONE' }>, challenge: AuthChallengeIssued): Screen10Handoff {
  return {
    continuationToken: result.continuationToken,
    method: result.method,
    identifier: challenge.identifier,
    authOrigin: result.authOrigin,
    originalIntent: result.intent,
    challengeId: result.challengeId,
  };
}

/**
 * Login can prove ownership of an unregistered phone, after which the user
 * explicitly chooses to continue into account creation.  Keep that
 * continuation in memory only; Screen 10 owns the eventual completion call.
 */
export function createScreen10HandoffFromMissingLogin(
  result: Extract<AuthV2VerifyResult, { kind: 'LOGIN_ACCOUNT_MISSING' }>,
  challenge: AuthChallengeIssued,
): Screen10Handoff | null {
  if (result.method !== 'PHONE') return null;
  return {
    continuationToken: result.continuationToken,
    method: 'PHONE',
    identifier: challenge.identifier,
    authOrigin: result.authOrigin,
    originalIntent: 'CREATE_ACCOUNT',
    challengeId: result.challengeId,
  };
}

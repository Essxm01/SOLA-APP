import { isCustomerAuthV2Enabled } from './customerAuthV2';
import { canResumeCustomerBooking, canResumeCustomerFavorite, cancelCustomerAuthV2, createCustomerAuthResumePermission, createCustomerAuthV2Entry, createScreen10Handoff, createScreen10HandoffFromMissingLogin, resolveCustomerAuthEntry } from './customerAuthV2Flow';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function equal(actual: unknown, expected: unknown, message: string): void { assert(actual === expected, `${message}: ${String(actual)} !== ${String(expected)}`); }

equal(isCustomerAuthV2Enabled(undefined), false, 'missing feature flag is off');
equal(isCustomerAuthV2Enabled('false'), false, 'false feature flag is off');
equal(isCustomerAuthV2Enabled('1'), false, 'unrelated truthy value is off');
equal(isCustomerAuthV2Enabled(' TRUE '), true, 'literal true enables the feature');

equal(createCustomerAuthV2Entry({ type: 'WELCOME_LOGIN' }).intent, 'LOGIN', 'welcome login maps to login');
equal(createCustomerAuthV2Entry({ type: 'WELCOME_CREATE_ACCOUNT' }).intent, 'CREATE_ACCOUNT', 'welcome create maps to create account');
equal(resolveCustomerAuthEntry(false, { type: 'ACCOUNT_TAB' }).surface, 'LEGACY', 'gate off keeps legacy auth path');
equal(resolveCustomerAuthEntry(true, { type: 'WELCOME_LOGIN' }).intent, 'LOGIN', 'gate on welcome login opens login');
equal(resolveCustomerAuthEntry(true, { type: 'WELCOME_CREATE_ACCOUNT' }).intent, 'CREATE_ACCOUNT', 'gate on welcome create opens create account');
for (const origin of [
  { type: 'EXPLORE_ACCOUNT' as const },
  { type: 'ACCOUNT_TAB' as const },
  { type: 'FAVORITES_TAB' as const },
]) equal(resolveCustomerAuthEntry(true, origin).surface, 'AUTH_V2', `${origin.type} uses Auth V2`);
const favorite = createCustomerAuthV2Entry({ type: 'PROTECTED_FAVORITE', propertyId: 'property-1' });
equal(favorite.origin.type, 'PROTECTED_FAVORITE', 'favorite origin is preserved');
equal((favorite.origin as { propertyId: string }).propertyId, 'property-1', 'favorite property context is preserved');
const booking = createCustomerAuthV2Entry({ type: 'PROTECTED_BOOKING', context: { propertyId: 'property-1', checkIn: '2026-10-01', checkOut: '2026-10-03', guests: 2 } });
equal(booking.origin.type, 'PROTECTED_BOOKING', 'booking origin is preserved');
assert(booking.origin.type === 'PROTECTED_BOOKING', 'booking origin narrows to booking context');
equal(cancelCustomerAuthV2(favorite.origin).clearFavoriteHandoff, true, 'favorite cancellation clears only favorite handoff');
equal(cancelCustomerAuthV2(favorite.origin).clearBookingHandoff, false, 'favorite cancellation keeps booking handoff untouched');
equal(cancelCustomerAuthV2(booking.origin).clearBookingHandoff, true, 'booking cancellation clears only booking handoff');
equal(cancelCustomerAuthV2(booking.origin).clearFavoriteHandoff, false, 'booking cancellation keeps favorite handoff untouched');
const favoritePermission = createCustomerAuthResumePermission(favorite.origin);
const bookingPermission = createCustomerAuthResumePermission(booking.origin);
equal(canResumeCustomerFavorite(favoritePermission, 'property-1'), true, 'favorite permission matches its property');
equal(canResumeCustomerFavorite(null, 'property-1'), false, 'cancelled favorite has no resume authority');
equal(canResumeCustomerBooking(bookingPermission, booking.origin.context), true, 'booking permission matches visible context');
equal(canResumeCustomerBooking(null, booking.origin.context), false, 'cancelled booking has no resume authority');
equal(canResumeCustomerBooking(bookingPermission, { ...booking.origin.context, guests: 3 }), false, 'different booking context cannot resume');

const challenge = {
  challengeId: 'challenge-10',
  intent: 'CREATE_ACCOUNT' as const,
  method: 'PHONE' as const,
  identifier: '+201012345678',
  maskedRecipient: '******678',
  resendAvailableAt: '2026-09-21T10:00:00.000Z',
  expiresAt: '2026-09-21T10:05:00.000Z',
  authOrigin: { type: 'WELCOME_CREATE_ACCOUNT' as const },
};
const createResult = {
  kind: 'CREATE_ACCOUNT_NEW_PHONE' as const,
  challengeId: challenge.challengeId,
  method: 'PHONE' as const,
  intent: 'CREATE_ACCOUNT' as const,
  authOrigin: challenge.authOrigin,
  continuationToken: 'continuation-create',
  requiresFullName: true as const,
};
equal(createScreen10Handoff(createResult, challenge).continuationToken, 'continuation-create', 'create-account continuation is retained in memory');
const missingResult = {
  kind: 'LOGIN_ACCOUNT_MISSING' as const,
  challengeId: 'challenge-login-missing',
  method: 'PHONE' as const,
  intent: 'LOGIN' as const,
  authOrigin: { type: 'ACCOUNT_TAB' as const },
  continuationToken: 'continuation-login-missing',
};
const missingHandoff = createScreen10HandoffFromMissingLogin(missingResult, { ...challenge, challengeId: 'challenge-login-missing', intent: 'LOGIN', authOrigin: missingResult.authOrigin });
assert(missingHandoff, 'phone missing-login creates a future handoff');
equal(missingHandoff.originalIntent, 'CREATE_ACCOUNT', 'explicit create choice changes future handoff intent');
equal(createScreen10HandoffFromMissingLogin({ ...missingResult, method: 'EMAIL' as const }, { ...challenge, method: 'EMAIL' as const, authOrigin: missingResult.authOrigin }), null, 'email missing-login cannot enter phone-only Screen 10');

console.log('customerAuthV2Flow tests passed');

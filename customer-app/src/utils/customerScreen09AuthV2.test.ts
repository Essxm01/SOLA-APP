import {
  CustomerAuthV2Error,
  cancelCustomerAuthChallenge,
  resendCustomerAuthChallenge,
  verifyCustomerAuthChallenge,
  type AuthChallengeIssued,
} from './customerAuthV2';
import {
  challengeIsLocallyExpired,
  canResendScreen09Otp,
  createScreen09RequestGuard,
  formatCountdown,
  getServerTimestampRemainingMs,
  isOtpComplete,
  isScreen09OtpExpired,
  normalizeOtp,
  areServerTimestampsValid,
  shouldCancelChallengeOnExit,
  stateAfterScreen09OtpInput,
  stateAfterScreen09Resend,
} from './customerScreen09AuthV2';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function equal(actual: unknown, expected: unknown, message: string): void {
  assert(actual === expected, `${message}: ${String(actual)} !== ${String(expected)}`);
}

const challenge: AuthChallengeIssued = {
  challengeId: 'challenge-09',
  intent: 'LOGIN',
  method: 'PHONE',
  identifier: '+201012345678',
  maskedRecipient: '******678',
  resendAvailableAt: '2026-09-21T10:01:00.000Z',
  expiresAt: '2026-09-21T10:05:00.000Z',
  authOrigin: { type: 'ACCOUNT_TAB' },
};

equal(normalizeOtp('٤٨۲۷۳۱abc789'), '482731', 'Arabic and Persian OTP digits normalize and cap at six');
equal(isOtpComplete('482731'), true, 'six ASCII digits are complete');
equal(isOtpComplete('12345'), false, 'short OTP is incomplete');
equal(getServerTimestampRemainingMs('2026-09-21T10:01:00.000Z', Date.parse('2026-09-21T10:00:30.000Z')), 30_000, 'resend timer uses server timestamp');
equal(formatCountdown(61_001), '01:02', 'countdown rounds remaining server time up');
equal(challengeIsLocallyExpired(challenge, Date.parse('2026-09-21T10:06:00.000Z')), true, 'expired OTP window is detected locally');
equal(isScreen09OtpExpired(challenge, Date.parse('2026-09-21T10:06:00.000Z')), true, 'expired OTP is recoverable separately from terminal challenge expiry');
equal(isScreen09OtpExpired(challenge, Date.parse('2026-09-21T10:04:59.000Z')), false, 'live OTP is not expired');
equal(isScreen09OtpExpired({ ...challenge, expiresAt: 'not-a-time' }, Date.now()), false, 'malformed expiry is not treated as recoverable OTP expiry');
equal(canResendScreen09Otp(false, 30_000), false, 'OTP resend remains disabled during cooldown');
equal(canResendScreen09Otp(false, 0), true, 'expired OTP can be resent after cooldown');
equal(canResendScreen09Otp(true, 0), false, 'terminal challenge cannot be resent');
equal(stateAfterScreen09OtpInput('OTP_EXPIRED'), 'OTP_EXPIRED', 'typing after OTP expiry cannot re-enable verification');
equal(stateAfterScreen09OtpInput('INCORRECT_CODE'), 'OTP_ENTRY', 'typing after an incorrect code returns to OTP entry');
equal(stateAfterScreen09Resend(), 'OTP_ENTRY', 'successful resend clears OTP expiry state');
equal(areServerTimestampsValid(challenge), true, 'valid server timestamps are accepted');
equal(areServerTimestampsValid({ resendAvailableAt: 'not-a-time', expiresAt: challenge.expiresAt }), false, 'invalid resend timestamp fails closed');
equal(areServerTimestampsValid({ resendAvailableAt: challenge.resendAvailableAt, expiresAt: 'not-a-time' }), false, 'invalid expiry timestamp fails closed');
equal(challengeIsLocallyExpired({ ...challenge, expiresAt: 'not-a-time' }, Date.now()), true, 'invalid expiry is treated as terminal');
equal(shouldCancelChallengeOnExit(false, false), true, 'active challenge is cancelled on unverified exit');
equal(shouldCancelChallengeOnExit(true, false), false, 'verified challenge is never cancelled on exit');
equal(shouldCancelChallengeOnExit(false, true), false, 'terminal challenge is not cancelled again');

const guard = createScreen09RequestGuard();
const verifyGeneration = guard.begin('VERIFY');
assert(verifyGeneration !== null, 'first verify request starts');
equal(guard.begin('RESEND'), null, 'resend cannot race an active verify');
assert(guard.isCurrent(verifyGeneration), 'active verify generation is current');
guard.cancel();
equal(guard.isCurrent(verifyGeneration), false, 'cancel invalidates late verify');
const resendGeneration = guard.begin('RESEND');
assert(resendGeneration !== null, 'resend can start after cancellation');

let request: { url: string; init: RequestInit } | undefined;
const successfulFetch: typeof fetch = async (url, init) => {
  request = { url: String(url), init: init ?? {} };
  return new Response(JSON.stringify({
    success: true,
    data: {
      success: true,
      challengeId: challenge.challengeId,
      method: 'PHONE',
      intent: 'LOGIN',
      isExistingUser: true,
      tokens: { accessToken: 'access', refreshToken: 'refresh', expiresIn: 900 },
    },
  }), { status: 200, headers: { 'content-type': 'application/json' } });
};

async function run(): Promise<void> {
  const verified = await verifyCustomerAuthChallenge(challenge, '482731', { baseUrl: 'https://qa.example/api/v2', fetchImpl: successfulFetch });
  equal(verified.kind, 'AUTHENTICATED_EXISTING_ACCOUNT', 'existing account outcome is authoritative');
  equal(request?.url, 'https://qa.example/api/v2/auth/challenges/challenge-09/verify', 'verify route is exact');
  equal(request?.init.method, 'POST', 'verify uses POST');
  equal(JSON.parse(String(request?.init.body)).otp, '482731', 'verify body contains only otp');

  const refreshedResendAvailableAt = '2026-09-21T10:08:00.000Z';
  const refreshedExpiresAt = '2026-09-21T10:12:00.000Z';
  const resendFetch: typeof fetch = async (url, init) => {
    request = { url: String(url), init: init ?? {} };
    return new Response(JSON.stringify({ success: true, data: { success: true, challengeId: challenge.challengeId, resendAvailableAt: refreshedResendAvailableAt, expiresAt: refreshedExpiresAt } }), { status: 200 });
  };
  const refreshed = await resendCustomerAuthChallenge(challenge, { baseUrl: 'https://qa.example/api/v2', fetchImpl: resendFetch });
  equal(request?.url, 'https://qa.example/api/v2/auth/challenges/challenge-09/resend', 'resend route is exact');
  equal(request?.init.method, 'POST', 'resend uses POST');
  equal(String(request?.init.body), '{}', 'resend has no meaningful client payload');
  equal(refreshed.challengeId, challenge.challengeId, 'resend preserves the active challenge');
  equal(refreshed.resendAvailableAt, refreshedResendAvailableAt, 'resend returns the new cooldown timestamp');
  equal(refreshed.expiresAt, refreshedExpiresAt, 'resend returns the new OTP expiry timestamp');

  const cancelFetch: typeof fetch = async (url, init) => {
    request = { url: String(url), init: init ?? {} };
    return new Response(JSON.stringify({ success: true, data: { success: true, challengeId: challenge.challengeId } }), { status: 200 });
  };
  await cancelCustomerAuthChallenge(challenge, { baseUrl: 'https://qa.example/api/v2', fetchImpl: cancelFetch });
  equal(request?.url, 'https://qa.example/api/v2/auth/challenges/challenge-09', 'cancel route is exact');
  equal(request?.init.method, 'DELETE', 'cancel uses DELETE');

  const invalidFetch: typeof fetch = async () => new Response(JSON.stringify({ success: false, error: { code: 'INVALID_OTP' } }), { status: 400 });
  try {
    await verifyCustomerAuthChallenge(challenge, '482731', { baseUrl: 'https://qa.example/api/v2', fetchImpl: invalidFetch });
    throw new Error('invalid OTP should reject');
  } catch (error) {
    assert(error instanceof CustomerAuthV2Error && error.kind === 'INVALID_OTP', 'server invalid OTP maps safely');
  }

  for (const [code, expected] of [
    ['OTP_EXPIRED', 'OTP_EXPIRED'],
    ['CHALLENGE_EXPIRED', 'CHALLENGE_EXPIRED'],
    ['CHALLENGE_LOCKED_MAX_ATTEMPTS_EXCEEDED', 'CHALLENGE_LOCKED_MAX_ATTEMPTS_EXCEEDED'],
  ] as const) {
    const expiredFetch: typeof fetch = async () => new Response(JSON.stringify({ success: false, error: { code } }), { status: 400 });
    try {
      await verifyCustomerAuthChallenge(challenge, '482731', { baseUrl: 'https://qa.example/api/v2', fetchImpl: expiredFetch });
      throw new Error(`${code} should reject`);
    } catch (error) {
      assert(error instanceof CustomerAuthV2Error && error.kind === expected, `${code} maps to its authoritative state`);
    }
  }

  const outcomeFetch = (data: Record<string, unknown>): typeof fetch => async () => new Response(JSON.stringify({ success: true, data: { success: true, ...data } }), { status: 200 });
  const create = await verifyCustomerAuthChallenge(
    { ...challenge, intent: 'CREATE_ACCOUNT' },
    '482731',
    { baseUrl: 'https://qa.example/api/v2', fetchImpl: outcomeFetch({ challengeId: challenge.challengeId, method: 'PHONE', intent: 'CREATE_ACCOUNT', isExistingUser: false, requiresFullName: true, continuationToken: 'create-token' }) },
  );
  equal(create.kind, 'CREATE_ACCOUNT_NEW_PHONE', 'new phone outcome requires the future full-name step');
  const missing = await verifyCustomerAuthChallenge(
    challenge,
    '482731',
    { baseUrl: 'https://qa.example/api/v2', fetchImpl: outcomeFetch({ challengeId: challenge.challengeId, method: 'PHONE', intent: 'LOGIN', isExistingUser: false, requiresSignup: true, continuationToken: 'login-token' }) },
  );
    equal(missing.kind, 'LOGIN_ACCOUNT_MISSING', 'missing login outcome remains on Screen 09');
  const deferred = await verifyCustomerAuthChallenge(
    { ...challenge, intent: 'CREATE_ACCOUNT', method: 'EMAIL' },
    '482731',
    { baseUrl: 'https://qa.example/api/v2', fetchImpl: outcomeFetch({ challengeId: challenge.challengeId, method: 'EMAIL', intent: 'CREATE_ACCOUNT', isExistingUser: false, accountCreation: 'DEFERRED_EMAIL_ONLY' }) },
  );
  equal(deferred.kind, 'EMAIL_ACCOUNT_CREATION_DEFERRED', 'email creation remains explicitly deferred');
  const malformed = outcomeFetch({ challengeId: challenge.challengeId, method: 'PHONE', intent: 'LOGIN', isExistingUser: false });
  try {
    await verifyCustomerAuthChallenge(challenge, '482731', { baseUrl: 'https://qa.example/api/v2', fetchImpl: malformed });
    throw new Error('malformed verify response should reject');
  } catch (error) {
    assert(error instanceof CustomerAuthV2Error && error.kind === 'INVALID_RESPONSE', 'malformed verify outcome fails closed');
  }

  console.log('customerScreen09AuthV2 tests passed');
}

void run();

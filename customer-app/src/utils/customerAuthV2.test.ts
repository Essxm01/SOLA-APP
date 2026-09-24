import {
  CustomerAuthV2Error,
  completeCustomerAccountRegistration,
  getAuthOriginMessage,
  getConfiguredAuthV2BaseUrl,
  isValidCustomerEmail,
  isValidEgyptianPhone,
  issueCustomerAuthChallenge,
  getAuthV2ApiUrl,
  formatMaskedCustomerPhone,
  normalizeArabicDigits,
  normalizeCustomerEmail,
  normalizeEgyptianPhone,
  toEgyptianE164,
  isCustomerAuthV2Enabled,
} from './customerAuthV2';

const qaBaseUrl = 'https://sola-backend-auth-v2-qa.essxm01.workers.dev/api/v2';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  assert(actual === expected, `${message} (actual=${String(actual)} expected=${String(expected)})`);
}

function assertDeepEqual(actual: unknown, expected: unknown, message: string): void {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message} (actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)})`);
}

async function assertRejects(operation: Promise<unknown>, predicate: (error: unknown) => boolean, message: string): Promise<void> {
  try {
    await operation;
  } catch (error) {
    assert(predicate(error), message);
    return;
  }
  throw new Error(message);
}

assertEqual(normalizeArabicDigits('٠١٠١٢٣٤٥٦٧٨'), '01012345678', 'Arabic-Indic digits normalize');
assertEqual(normalizeArabicDigits('۰۱۱۱۲۳۴۵۶۷۸'), '01112345678', 'Persian digits normalize');
assertEqual(normalizeEgyptianPhone(' ٠١٢-١٢٣٤٥٦٧٨ '), '01212345678', 'phone separators normalize');
for (const prefix of ['010', '011', '012', '015']) {
  assertEqual(isValidEgyptianPhone(`${prefix}12345678`), true, `prefix ${prefix} is valid`);
}
assertEqual(isValidEgyptianPhone('01312345678'), false, 'unsupported prefix is invalid');
assertEqual(isValidEgyptianPhone('0101234567'), false, 'short phone is invalid');
assertEqual(isValidEgyptianPhone('010123456789'), false, 'long phone is invalid');
assertEqual(isValidCustomerEmail(' name@example.com '), true, 'outer email whitespace is trimmed');
assertEqual(isValidCustomerEmail('Name+tag@example.com'), true, 'email local-part casing is preserved');
assertEqual(isValidCustomerEmail('Name+Tag@EXAMPLE.COM'), true, 'backend-compatible tagged email is valid');
assertEqual(normalizeCustomerEmail('Name+Tag@EXAMPLE.COM'), 'Name+Tag@example.com', 'backend-compatible email normalization');
assertEqual(isValidCustomerEmail('name@-example.com'), false, 'domain cannot start with hyphen');
assertEqual(isValidCustomerEmail('name@example-.com'), false, 'domain cannot end with hyphen');
assertEqual(isValidCustomerEmail('name@.example.com'), false, 'domain cannot start with dot');
assertEqual(isValidCustomerEmail('name@example.com.'), false, 'domain cannot end with dot');
assertEqual(isValidCustomerEmail('missing-at.example.com'), false, 'email without at-sign is invalid');
assertEqual(isValidCustomerEmail('name@'), false, 'email without domain is invalid');
assertEqual(toEgyptianE164('01012345678'), '+201012345678', 'phone request uses E.164');
assertEqual(formatMaskedCustomerPhone('+201001234567'), '010••••••67', 'phone recipient is masked in local Egyptian format');
assert(!formatMaskedCustomerPhone('+201001234567').includes('+20'), 'phone mask never shows the E.164 prefix');
assert(!formatMaskedCustomerPhone('+201001234567').includes('01001234567'), 'phone mask never exposes the full phone');
assertEqual(formatMaskedCustomerPhone('not-a-phone'), '••••••', 'malformed phone mask fails closed');
assertEqual(normalizeCustomerEmail(' Name+Tag@EXAMPLE.COM '), 'Name+Tag@example.com', 'email lowercases domain only');
assertEqual(normalizeCustomerEmail('Name.With+Tag@Example.COM'), 'Name.With+Tag@example.com', 'email local-part remains exact');
assertEqual(isCustomerAuthV2Enabled('true'), true, 'feature gate accepts only literal true');
assertEqual(isCustomerAuthV2Enabled('1'), false, 'feature gate rejects unrelated truthy values');

assertEqual(getConfiguredAuthV2BaseUrl(qaBaseUrl + '/'), qaBaseUrl, 'explicit API base URL is normalized');
assertEqual(getConfiguredAuthV2BaseUrl('   '), '/api/v2', 'missing base URL uses the local Auth V2 prefix');
assertEqual(getConfiguredAuthV2BaseUrl(null, 'konfrm.pages.dev'), 'https://sola-backend-api.essxm01.workers.dev/api/v2', 'Pages host uses production Worker API');
assertEqual(getConfiguredAuthV2BaseUrl(null, 'localhost'), '/api/v2', 'localhost uses local API prefix');
assertEqual(getConfiguredAuthV2BaseUrl(null, '192.168.1.20'), '/api/v2', 'LAN host uses local API prefix');
assertEqual(getAuthV2ApiUrl('/auth/challenges', qaBaseUrl), `${qaBaseUrl}/auth/challenges`, 'API resolver does not duplicate version prefix');
assertEqual(getAuthOriginMessage({ type: 'PROTECTED_FAVORITE', propertyId: 'p1' }), 'بعد التحقق، ستتمكن من متابعة حفظ الوحدة.', 'favorite origin copy');
assertEqual(getAuthOriginMessage({ type: 'PROTECTED_BOOKING', context: { propertyId: 'p1', checkIn: '2026-10-01', checkOut: '2026-10-03', guests: 2 } }), 'بعد التحقق، ستعود لمراجعة طلب الحجز.', 'booking origin copy');
assertEqual(getAuthOriginMessage({ type: 'PROTECTED_PAYMENT', bookingId: 'bk-123' }), 'بعد التحقق، ستعود إلى صفحة دفع العربون لهذا الحجز.', 'protected payment origin copy');
assertEqual(getAuthOriginMessage({ type: 'EXPLORE_ACCOUNT' }), null, 'explore origin has no protected-action copy');

let request: { url: string; init: RequestInit } | undefined;
const fetchImpl: typeof fetch = async (url, init) => {
  request = { url: String(url), init: init ?? {} };
  return new Response(JSON.stringify({
    success: true,
    data: {
      success: true,
      challengeId: 'challenge-1',
      method: 'PHONE',
      maskedRecipient: '******678',
      resendAvailableAt: '2026-09-21T10:00:00.000Z',
      expiresAt: '2026-09-21T10:05:00.000Z',
    },
  }), { status: 200, headers: { 'content-type': 'application/json' } });
};

async function run(): Promise<void> {
  const issued = await issueCustomerAuthChallenge(
    { intent: 'CREATE_ACCOUNT', method: 'PHONE', identifier: '+201012345678', authOrigin: { type: 'WELCOME_CREATE_ACCOUNT' } },
    { baseUrl: qaBaseUrl, fetchImpl },
  );
  assertDeepEqual(issued, {
    challengeId: 'challenge-1',
    method: 'PHONE',
    maskedRecipient: '******678',
    resendAvailableAt: '2026-09-21T10:00:00.000Z',
    expiresAt: '2026-09-21T10:05:00.000Z',
    intent: 'CREATE_ACCOUNT',
    identifier: '+201012345678',
    authOrigin: { type: 'WELCOME_CREATE_ACCOUNT' },
  }, 'successful issue returns only challenge metadata');
  assertEqual(request?.url, `${qaBaseUrl}/auth/challenges`, 'challenge endpoint');
  assertEqual(request?.init.method, 'POST', 'challenge uses POST');
  assertDeepEqual(JSON.parse(String(request?.init.body)), {
    surface: 'CUSTOMER',
    intent: 'CREATE_ACCOUNT',
    method: 'PHONE',
    identifier: '+201012345678',
  }, 'challenge body contract');

  const rateLimitedFetch: typeof fetch = async () => new Response('{}', { status: 429 });
  await assertRejects(
    issueCustomerAuthChallenge(
      { intent: 'LOGIN', method: 'EMAIL', identifier: 'name@example.com', authOrigin: { type: 'ACCOUNT_TAB' } },
      { baseUrl: qaBaseUrl, fetchImpl: rateLimitedFetch },
    ),
    (error: unknown) => error instanceof CustomerAuthV2Error && error.kind === 'RATE_LIMIT',
    '429 is a rate-limit error',
  );

  for (const [code, kind] of [
    ['OTP_DELIVERY_FAILED', 'OTP_DELIVERY_FAILED'],
    ['INVALID_EGYPTIAN_MOBILE_NUMBER', 'INVALID_MOBILE'],
    ['INVALID_EMAIL', 'INVALID_EMAIL'],
    ['AUTH_V2_UNAVAILABLE', 'UNAVAILABLE'],
  ] as const) {
    const errorFetch: typeof fetch = async () => new Response(JSON.stringify({ success: false, error: { code, message: 'internal detail' } }), { status: 400 });
    await assertRejects(
      issueCustomerAuthChallenge({ intent: 'LOGIN', method: 'PHONE', identifier: '+201012345678', authOrigin: { type: 'ACCOUNT_TAB' } }, { baseUrl: qaBaseUrl, fetchImpl: errorFetch }),
      (error: unknown) => error instanceof CustomerAuthV2Error && error.kind === kind,
      `${code} maps to a safe structured error`,
    );
  }

  const malformedFetch: typeof fetch = async () => new Response(JSON.stringify({ success: true, data: {} }), { status: 200 });
  await assertRejects(
    issueCustomerAuthChallenge(
      { intent: 'LOGIN', method: 'PHONE', identifier: '+201012345678', authOrigin: { type: 'ACCOUNT_TAB' } },
      { baseUrl: qaBaseUrl, fetchImpl: malformedFetch },
    ),
    (error: unknown) => error instanceof CustomerAuthV2Error && (error.kind === 'INVALID_RESPONSE' || error.kind === 'REQUEST_FAILED'),
    'malformed challenge response fails closed',
  );

  const unsuccessfulEnvelopeFetch: typeof fetch = async () => new Response(JSON.stringify({
    success: true,
    data: { success: false, challengeId: 'should-not-be-accepted', method: 'PHONE', maskedRecipient: '******678', resendAvailableAt: 'now', expiresAt: 'later' },
  }), { status: 200 });
  await assertRejects(
    issueCustomerAuthChallenge(
      { intent: 'LOGIN', method: 'PHONE', identifier: '+201012345678', authOrigin: { type: 'ACCOUNT_TAB' } },
      { baseUrl: qaBaseUrl, fetchImpl: unsuccessfulEnvelopeFetch },
    ),
    (error: unknown) => error instanceof CustomerAuthV2Error && error.kind === 'REQUEST_FAILED',
    'unsuccessful nested envelope fails closed',
  );

  const abortController = new AbortController();
  const abortableFetch: typeof fetch = async (_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
  });
  const abortedRequest = issueCustomerAuthChallenge(
    { intent: 'LOGIN', method: 'PHONE', identifier: '+201012345678', authOrigin: { type: 'ACCOUNT_TAB' } },
    { baseUrl: qaBaseUrl, fetchImpl: abortableFetch },
    abortController.signal,
  );
  abortController.abort();
  await assertRejects(
    abortedRequest,
    (error: unknown) => error instanceof DOMException && error.name === 'AbortError',
    'aborted issue request remains aborted for late-response protection',
  );


  let registrationRequest: { url: string; init: RequestInit } | undefined;
  const registrationFetch: typeof fetch = async (url, init) => {
    registrationRequest = { url: String(url), init: init ?? {} };
    return new Response(JSON.stringify({
      success: true,
      data: {
        user: { id: 'user-10', fullName: 'أحمد محمد' },
        tokens: { accessToken: 'access-10', refreshToken: 'refresh-10', expiresIn: 900 },
      },
    }), { status: 201, headers: { 'content-type': 'application/json' } });
  };
  const registration = await completeCustomerAccountRegistration(
    'continuation-10',
    '  أحمد   محمد  ',
    { baseUrl: qaBaseUrl, fetchImpl: registrationFetch },
  );
  assertEqual(registration.tokens.accessToken, 'access-10', 'Screen 10 returns a valid access token');
  assertEqual(registration.tokens.refreshToken, 'refresh-10', 'Screen 10 returns a valid refresh token');
  assertEqual(registrationRequest?.url, `${qaBaseUrl}/auth/registration/complete`, 'Screen 10 registration endpoint is exact');
  assertEqual(registrationRequest?.init.method, 'POST', 'Screen 10 registration uses POST');
  assertDeepEqual(JSON.parse(String(registrationRequest?.init.body)), {
    continuationToken: 'continuation-10',
    fullName: 'أحمد محمد',
  }, 'Screen 10 sends only the continuation token and normalized full name');

  const malformedRegistrationFetch: typeof fetch = async () => new Response(JSON.stringify({
    success: true,
    data: { user: { id: 'user-10' } },
  }), { status: 201 });
  await assertRejects(
    completeCustomerAccountRegistration('continuation-10', 'أحمد محمد', { baseUrl: qaBaseUrl, fetchImpl: malformedRegistrationFetch }),
    (error: unknown) => error instanceof CustomerAuthV2Error && error.kind === 'INVALID_RESPONSE',
    'Screen 10 malformed success response fails closed',
  );

  for (const tokens of [
    { accessToken: '', refreshToken: 'refresh-10', expiresIn: 900 },
    { accessToken: '   ', refreshToken: 'refresh-10', expiresIn: 900 },
    { accessToken: 'access-10', refreshToken: '', expiresIn: 900 },
    { accessToken: 'access-10', refreshToken: '   ', expiresIn: 900 },
    { accessToken: 'access-10', refreshToken: 'refresh-10', expiresIn: 0 },
    { accessToken: 'access-10', refreshToken: 'refresh-10', expiresIn: -1 },
  ]) {
    const invalidSessionFetch: typeof fetch = async () => new Response(JSON.stringify({
      success: true,
      data: { user: { id: 'user-10' }, tokens },
    }), { status: 201 });
    await assertRejects(
      completeCustomerAccountRegistration('continuation-10', 'أحمد محمد', { baseUrl: qaBaseUrl, fetchImpl: invalidSessionFetch }),
      (error: unknown) => error instanceof CustomerAuthV2Error && error.kind === 'INVALID_RESPONSE',
      `Screen 10 rejects malformed session tokens: ${JSON.stringify(tokens)}`,
    );
  }

  for (const [code, kind, status] of [
    ['CONTINUATION_TOKEN_EXPIRED', 'CONTINUATION_TOKEN_EXPIRED', 400],
    ['CONTINUATION_ALREADY_CONSUMED', 'CONTINUATION_ALREADY_CONSUMED', 409],
    ['INVALID_CONTINUATION_TOKEN', 'CONTINUATION_INVALID', 400],
  ] as const) {
    const continuationFailureFetch: typeof fetch = async () => new Response(JSON.stringify({
      success: false,
      error: { code, message: 'safe' },
    }), { status });
    await assertRejects(
      completeCustomerAccountRegistration('continuation-10', 'أحمد محمد', { baseUrl: qaBaseUrl, fetchImpl: continuationFailureFetch }),
      (error: unknown) => error instanceof CustomerAuthV2Error && error.kind === kind,
      `Screen 10 ${code} maps to recoverable structured error`,
    );
  }

  await assertRejects(
    completeCustomerAccountRegistration('continuation-10', ' ', { baseUrl: qaBaseUrl, fetchImpl: registrationFetch }),
    (error: unknown) => error instanceof CustomerAuthV2Error && error.kind === 'INVALID_FULL_NAME',
    'Screen 10 rejects blank full name before network mutation',
  );

  const registrationAbortController = new AbortController();
  const abortableRegistrationFetch: typeof fetch = async (_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
  });
  const abortedRegistration = completeCustomerAccountRegistration(
    'continuation-10',
    'أحمد محمد',
    { baseUrl: qaBaseUrl, fetchImpl: abortableRegistrationFetch },
    registrationAbortController.signal,
  );
  registrationAbortController.abort();
  await assertRejects(
    abortedRegistration,
    (error: unknown) => error instanceof DOMException && error.name === 'AbortError',
    'Screen 10 aborted registration remains aborted',
  );

  console.log('customerAuthV2 tests passed');
}

void run();

import {
  isValidEgyptianPhone,
  verifyCustomerAuthChallenge,
  type AuthChallengeIssued,
} from './customerAuthV2';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function section(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert(start >= 0 && end > start, `source section exists: ${startMarker}`);
  return source.slice(start, end);
}

async function run(): Promise<void> {
  // @ts-expect-error Node's test-only module is intentionally outside the browser app type surface.
  const { readFileSync } = await import('node:fs');
  const readSource = (url: URL): string => readFileSync(url, 'utf8').replace(/\r\n/g, '\n');
  const screen08 = readSource(new URL('../components/CustomerAuthScreen08.tsx', import.meta.url));
  const screen09 = readSource(new URL('../components/CustomerAuthScreen09.tsx', import.meta.url));
  const appBar = readSource(new URL('../components/CustomerAuthAppBar.tsx', import.meta.url));

  const screen08Effect = section(screen08, 'useEffect(() => {', '  const originMessage');
  const screen08MountedSetupIndex = screen08Effect.indexOf('mountedRef.current = true;');
  const screen08CleanupIndex = screen08Effect.indexOf('return () =>');
  assert(screen08MountedSetupIndex >= 0, 'Screen 08 effect setup restores mounted state');
  assert(screen08CleanupIndex >= 0, 'Screen 08 effect has a cleanup function');
  assert(screen08MountedSetupIndex < screen08CleanupIndex, 'Screen 08 restores mounted state during effect setup');
  assert(screen08Effect.includes('mountedRef.current = false;'), 'Screen 08 cleanup marks the component unmounted');
  assert(screen08Effect.includes('controllerRef.current?.abort();') && screen08Effect.includes('guardRef.current.cancel();'), 'Screen 08 cleanup aborts local work and invalidates its guard');

  const screen09Effect = section(screen09, 'useEffect(() => {\n    mountedRef.current = true;', '  const returnToScreen08');
  assert(screen09Effect.includes('mountedRef.current = false;'), 'Screen 09 cleanup marks the component unmounted');
  assert(screen09Effect.includes('controllersRef.current.forEach((controller) => controller.abort());') && screen09Effect.includes('guardRef.current.cancel();'), 'Screen 09 cleanup aborts local work and invalidates its guard');
  assert(!screen09Effect.includes('cancelCustomerAuthChallenge'), 'passive Screen 09 cleanup never cancels the server challenge');

  const explicitBack = section(screen09, 'const returnToScreen08', '  const verify');
  assert(explicitBack.includes('shouldCancelChallengeOnExit(') && explicitBack.includes('cancelCustomerAuthChallenge('), 'explicit unverified Back preserves server challenge cancellation policy');

  assert(screen08.includes('<CustomerAuthAppBar'), 'Screen 08 renders the shared Auth App Bar');
  assert(screen09.includes('<CustomerAuthAppBar'), 'Screen 09 renders the shared Auth App Bar');
  for (const contract of ['sticky', 'top-0', 'bg-white', 'border-b']) assert(new RegExp(`\\b${contract}\\b`).test(appBar), `Auth App Bar keeps ${contract}`);

  const otpRow = section(screen09, '<button type="button" dir="ltr"', '              </button>');
  assert(otpRow.includes('dir="ltr"') && otpRow.includes("direction: 'ltr'"), 'visual OTP cells explicitly use LTR direction');
  assert((screen09.match(/id="customer-auth-otp"/g) ?? []).length === 1, 'Screen 09 has exactly one semantic OTP input');
  assert(screen09.includes('Array.from({ length: 6 }'), 'Screen 09 keeps six visual OTP cells');

  // Founder acceptance: Customer phone login is Egypt-only with the explicitly approved
  // mobile prefixes 010 / 012 / 015. Invalid values must be rejected before network I/O.
  assert(isValidEgyptianPhone('01012345678'), '010 customer numbers are accepted');
  assert(isValidEgyptianPhone('01212345678'), '012 customer numbers are accepted');
  assert(isValidEgyptianPhone('01512345678'), '015 customer numbers are accepted');
  assert(!isValidEgyptianPhone('01112345678'), '011 customer numbers are rejected by the founder-approved contract');
  assert(!isValidEgyptianPhone('0507078581'), 'non-Egyptian/local Saudi-style input is rejected');

  // Screen 08 must make +20 obvious as a fixed, non-editable visual prefix and must not
  // silently disable submission merely because the current phone value is invalid.
  assert(screen08.includes('data-testid="customer-auth-country-code"'), 'Screen 08 renders a dedicated country-code segment');
  assert(screen08.includes('+20'), 'Screen 08 visibly fixes the Egypt country code to +20');
  assert(!screen08.includes('disabled={loading || !canSubmit}'), 'invalid Screen 08 input remains pressable so validation feedback can be shown');
  assert(!screen08.includes('disabled:cursor-wait disabled:opacity-70'), 'invalid Screen 08 input never presents a fake loading cursor');
  assert(screen08.includes("'أدخل رقم هاتف صحيحًا.'"), 'Screen 08 keeps the concise invalid-phone message');

  // A verified LOGIN email that does not map to a QA account is not a malformed OTP
  // response. Email account creation remains deferred; Screen 09 should receive the
  // normal LOGIN_ACCOUNT_MISSING outcome and offer the existing phone-create path.
  const emailChallenge: AuthChallengeIssued = {
    challengeId: 'email-login-missing',
    intent: 'LOGIN',
    method: 'EMAIL',
    identifier: 'missing@example.com',
    maskedRecipient: 'm*****g@example.com',
    resendAvailableAt: new Date(Date.now() - 1_000).toISOString(),
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
    authOrigin: { type: 'WELCOME_LOGIN' },
  };
  const missingEmailFetch = (async () => new Response(JSON.stringify({
    success: true,
    data: {
      success: true,
      challengeId: emailChallenge.challengeId,
      method: 'EMAIL',
      intent: 'LOGIN',
      isExistingUser: false,
      accountCreation: 'DEFERRED_EMAIL_ONLY',
    },
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch;
  const missingEmailResult = await verifyCustomerAuthChallenge(
    emailChallenge,
    '123456',
    { baseUrl: 'https://qa.example/api/v2', fetchImpl: missingEmailFetch },
  );
  assert(missingEmailResult.kind === 'LOGIN_ACCOUNT_MISSING', 'missing verified email returns LOGIN_ACCOUNT_MISSING rather than INVALID_RESPONSE');
  assert(missingEmailResult.method === 'EMAIL', 'missing verified email outcome preserves EMAIL method');

  console.log('customerAuthV2 remediation source-contract tests passed');
}

void run();

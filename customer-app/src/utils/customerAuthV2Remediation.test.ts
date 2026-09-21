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

  console.log('customerAuthV2 remediation source-contract tests passed');
}

void run();

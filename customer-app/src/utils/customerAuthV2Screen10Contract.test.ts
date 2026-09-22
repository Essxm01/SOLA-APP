function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run(): Promise<void> {
  // @ts-expect-error Node's test-only module is intentionally outside the browser app type surface.
  const { readFileSync } = await import('node:fs');
  const readSource = (url: URL): string => readFileSync(url, 'utf8').replace(/\r\n/g, '\n');
  const app = readSource(new URL('../App.tsx', import.meta.url));
  const screen10 = readSource(new URL('../components/CustomerAuthScreen10.tsx', import.meta.url));
  const appBar = readSource(new URL('../components/CustomerAuthAppBar.tsx', import.meta.url));
  const flow = readSource(new URL('./customerAuthV2Flow.ts', import.meta.url));

  assert(app.includes("import { CustomerAuthScreen10 } from './components/CustomerAuthScreen10';"), 'App imports Screen 10');
  assert(app.includes('authV2Flow && screen10Handoff && ('), 'Screen 10 is gated by the verified handoff');
  assert(app.includes('!screen10Handoff && authV2Challenge'), 'Screen 09 is not rendered over Screen 10');
  assert(app.includes('!screen10Handoff && !authV2Challenge'), 'Screen 08 is not rendered over Screen 10');
  assert(app.includes('onCompleted={handleAuthV2Screen10Completed}'), 'Screen 10 completion is wired to session finalization');
  assert(app.includes("origin.type === 'WELCOME_CREATE_ACCOUNT'"), 'Welcome create origin has an explicit success destination');
  assert(app.includes("setActiveTab('EXPLORE')"), 'Welcome create success returns to Explore');
  assert(app.includes('canResumeCustomerBooking(authResumePermission, bookingResumeContext)'), 'booking resume remains permission-scoped');
  assert(app.includes('canResumeCustomerFavorite(authResumePermission, pendingFavId)'), 'favorite resume remains permission-scoped');

  assert(screen10.includes('<CustomerAuthAppBar'), 'Screen 10 uses the shared Auth app bar');
  assert(screen10.includes('max-w-[430px]'), 'Screen 10 keeps the approved mobile width');
  assert(screen10.includes('أكمل إنشاء حسابك'), 'Screen 10 approved heading is present');
  assert(screen10.includes('أدخل اسمك الكامل للمتابعة.'), 'Screen 10 approved support copy is present');
  assert(screen10.includes('placeholder="أحمد محمد"'), 'Screen 10 approved placeholder is present');
  assert(screen10.includes('إكمال إنشاء الحساب'), 'Screen 10 approved CTA is present');
  assert(screen10.includes('جارٍ إنشاء الحساب…'), 'Screen 10 loading copy is present');
  assert(screen10.includes('إعادة التحقق من رقم الهاتف'), 'Screen 10 has safe continuation recovery');
  assert((screen10.match(/id="customer-auth-full-name"/g) ?? []).length === 1, 'Screen 10 has one semantic full-name input');
  assert(screen10.includes('controllerRef.current?.abort()'), 'Screen 10 aborts in-flight work on exit');
  assert(screen10.includes('guardRef.current.begin()'), 'Screen 10 has double-submit protection');
  assert(screen10.includes('createScreen10CompletionCoordinator'), 'Screen 10 retains successful registration across canonical-session retries');
  assert(screen10.includes('completionCoordinatorRef.current.attempt'), 'Screen 10 retries finalization without reusing the continuation token');
  assert(screen10.includes('onCompleted(result, controller.signal)'), 'Screen 10 cancellation reaches canonical-session reads');
  assert(screen10.includes('!registrationCompletedRef.current && !validName'), 'initial registration validates the full name');
  assert(screen10.includes('registrationCompletedRef.current || state ==='), 'post-registration retry locks the already-submitted name');
  assert(screen10.includes('تم إنشاء حسابك، لكن تعذر إكمال الدخول الآن. حاول المتابعة مرة أخرى.'), 'post-registration retry copy clearly states account creation succeeded');
  assert(!screen10.includes('تم إنشاء الحساب، لكن تعذر تحميل بياناته. حاول المتابعة مرة أخرى.'), 'old implementation-oriented recovery copy is removed');
  assert(screen10.includes('shouldSuppressScreen10Back(registrationCompletedRef.current, state)'), 'Screen 10 derives recovery-only Back suppression from the tested helper');
  assert(screen10.includes('suppressBack={recoveryMode}'), 'Screen 10 suppresses Back only in recovery mode');
  assert(!screen10.includes('mt-auto'), 'Screen 10 CTA is no longer pushed to the bottom of the viewport');
  assert(screen10.includes('className="mt-6"'), 'Screen 10 keeps the CTA connected to the task with 24px spacing');
  assert(screen10.includes('className="flex-1" aria-hidden="true"'), 'open whitespace follows the task instead of splitting field and CTA');
  assert(appBar.includes('suppressBack?: boolean'), 'shared Auth App Bar supports optional Back suppression');
  assert(appBar.includes('suppressBack = false'), 'shared Auth App Bar preserves Screens 08/09 behavior by default');
  assert(appBar.includes('<span className="h-11 w-11" aria-hidden="true" />'), 'suppressed Back preserves header geometry without a focusable control');

  assert(app.includes('orchestrateScreen10SessionFinalization'), 'App uses the tested Screen 10 finalization lifecycle');
  assert(app.includes('persistSession: (canonicalSession) => persistAuthV2Session'), 'App wires canonical persistence into the lifecycle');
  assert(app.includes('resumeOrigin: (completedOrigin) => resumeAuthV2Origin'), 'App wires permission-scoped resume after persistence');
  assert(app.includes('clearHandoff: clearCompletedAuthV2Flow'), 'App clears the handoff only at lifecycle completion');
  assert(app.includes('await finalizeAuthV2Session'), 'Screen 10 completion awaits canonical session finalization');
  assert(app.includes('loadCanonicalCustomerSession(tokens.accessToken, signal)'), 'App forwards Screen 10 cancellation to every canonical read');

  const sensitiveSources = app + '\n' + screen10 + '\n' + flow;
  assert(!/(localStorage|sessionStorage)\.setItem\([^\n;]*continuation/i.test(sensitiveSources), 'continuation token is never persisted in browser storage');
  assert(!/URLSearchParams\([^)]*continuation/i.test(sensitiveSources), 'continuation token is never placed in a URL');

  console.log('customerAuthV2 Screen 10 source-contract tests passed');
}

void run();

import {
  createScreen10SubmissionGuard,
  getScreen10FailureDisposition,
  getScreen10OriginMessage,
  isValidCustomerFullName,
  normalizeCustomerFullName,
} from './customerScreen10AuthV2';
import * as screen10Module from './customerScreen10AuthV2';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function equal(actual: unknown, expected: unknown, message: string): void {
  assert(actual === expected, `${message}: ${String(actual)} !== ${String(expected)}`);
}

equal(normalizeCustomerFullName('  أحمد   محمد  '), 'أحمد محمد', 'full name trims and collapses whitespace');
equal(isValidCustomerFullName('آب'), true, 'two-character names are accepted');
equal(isValidCustomerFullName(' '), false, 'blank names are rejected');

equal(
  getScreen10OriginMessage({ type: 'PROTECTED_BOOKING', context: { propertyId: 'p1', checkIn: '2026-10-01', checkOut: '2026-10-03', guests: 2 } }),
  'ستعود إلى مراجعة طلب الحجز بعد إكمال الحساب.',
  'booking copy preserves review context',
);
equal(
  getScreen10OriginMessage({ type: 'PROTECTED_FAVORITE', propertyId: 'p1' }),
  'ستعود إلى الوحدة بعد إكمال الحساب.',
  'favorite copy preserves property context',
);
equal(getScreen10OriginMessage({ type: 'WELCOME_CREATE_ACCOUNT' }), null, 'welcome create has no extra context copy');

equal(getScreen10FailureDisposition('CONTINUATION_TOKEN_EXPIRED'), 'REVERIFY', 'expired continuation requires re-verification');
equal(getScreen10FailureDisposition('CONTINUATION_ALREADY_CONSUMED'), 'REVERIFY', 'consumed continuation requires re-verification');
equal(getScreen10FailureDisposition('CONTINUATION_INVALID'), 'REVERIFY', 'invalid continuation requires re-verification');
equal(getScreen10FailureDisposition('REQUEST_FAILED'), 'RETRY', 'transient request failure stays retryable');

const guard = createScreen10SubmissionGuard();
const first = guard.begin();
assert(first !== null, 'first submission starts');
equal(guard.begin(), null, 'double submit is blocked');
assert(guard.isCurrent(first), 'first generation stays current');
guard.cancel();
equal(guard.isCurrent(first), false, 'cancel invalidates the prior generation');
assert(guard.begin() !== null, 'a later retry can begin');

async function assertRejects(operation: Promise<unknown>, message: string): Promise<void> {
  try {
    await operation;
  } catch {
    return;
  }
  throw new Error(message);
}

async function runAsyncTests(): Promise<void> {
  const createCompletionCoordinator = (screen10Module as Record<string, unknown>).createScreen10CompletionCoordinator;
  assert(typeof createCompletionCoordinator === 'function', 'Screen 10 exposes a completion coordinator');
  const coordinator = (createCompletionCoordinator as () => {
    attempt: <T>(register: () => Promise<T>, finalize: (result: T) => Promise<void>) => Promise<T>;
  })();

  let registrationCalls = 0;
  let finalizationCalls = 0;
  const register = async () => {
    registrationCalls += 1;
    return { tokens: { accessToken: 'access', refreshToken: 'refresh', expiresIn: 900 } };
  };
  const finalize = async () => {
    finalizationCalls += 1;
    if (finalizationCalls === 1) throw new Error('canonical reads unavailable');
  };

  await assertRejects(
    coordinator.attempt(register, finalize),
    'first canonical finalization failure remains retryable',
  );
  await coordinator.attempt(register, finalize);
  equal(registrationCalls, 1, 'retry does not reuse the consumed continuation token');
  equal(finalizationCalls, 2, 'retry repeats canonical finalization only');

  const orchestrateFinalization = (screen10Module as Record<string, unknown>).orchestrateScreen10SessionFinalization;
  assert(typeof orchestrateFinalization === 'function', 'Screen 10 exposes the complete finalization lifecycle');
  type OrchestrateFinalization = <TCanonical, TOrigin>(input: {
    origin: TOrigin;
    loadCanonicalSession: () => Promise<TCanonical>;
    persistSession: (canonical: TCanonical) => Promise<void> | void;
    resumeOrigin: (origin: TOrigin) => Promise<void> | void;
    clearHandoff: () => Promise<void> | void;
    signal?: AbortSignal;
  }) => Promise<TCanonical>;
  const orchestrate = orchestrateFinalization as OrchestrateFinalization;

  for (const origin of ['WELCOME_CREATE_ACCOUNT', 'PROTECTED_BOOKING', 'PROTECTED_FAVORITE'] as const) {
    const lifecycle: string[] = [];
    await orchestrate({
      origin,
      loadCanonicalSession: async () => {
        lifecycle.push('load');
        return { profile: { id: 'customer-1' }, account: {}, favorites: [], bookings: [] };
      },
      persistSession: () => { lifecycle.push('persist'); },
      resumeOrigin: (receivedOrigin) => { lifecycle.push(`resume:${receivedOrigin}`); },
      clearHandoff: () => { lifecycle.push('clear'); },
    });
    equal(
      lifecycle.join('>'),
      `load>persist>resume:${origin}>clear`,
      `${origin} resumes only after canonical persistence and before handoff clearing`,
    );
  }

  let storageWrites = 0;
  let resumeActions = 0;
  let handoffClears = 0;
  await assertRejects(
    orchestrate({
      origin: 'PROTECTED_BOOKING',
      loadCanonicalSession: async () => { throw new Error('canonical reads unavailable'); },
      persistSession: () => { storageWrites += 1; },
      resumeOrigin: () => { resumeActions += 1; },
      clearHandoff: () => { handoffClears += 1; },
    }),
    'canonical failure rejects the complete lifecycle',
  );
  equal(storageWrites, 0, 'canonical failure performs zero session persistence');
  equal(resumeActions, 0, 'canonical failure performs zero protected resume actions');
  equal(handoffClears, 0, 'canonical failure preserves the handoff for retry');

  const lifecycleCancellation = new AbortController();
  await assertRejects(
    orchestrate({
      origin: 'PROTECTED_FAVORITE',
      loadCanonicalSession: async () => {
        lifecycleCancellation.abort();
        return { profile: { id: 'cancelled' } };
      },
      persistSession: () => { storageWrites += 1; },
      resumeOrigin: () => { resumeActions += 1; },
      clearHandoff: () => { handoffClears += 1; },
      signal: lifecycleCancellation.signal,
    }),
    'Back cancellation rejects the complete lifecycle',
  );
  equal(storageWrites, 0, 'Back cancellation performs zero token writes');
  equal(resumeActions, 0, 'Back cancellation performs zero protected resume actions');
  equal(handoffClears, 0, 'Back cancellation performs zero handoff clearing');

  const finalizeCanonicalSession = (screen10Module as Record<string, unknown>).finalizeScreen10CanonicalSession;
  assert(typeof finalizeCanonicalSession === 'function', 'Screen 10 exposes canonical-session finalization ordering');
  type FinalizeCanonicalSession = <T>(
    load: () => Promise<T>,
    commit: (value: T) => Promise<void> | void,
    signal?: AbortSignal,
  ) => Promise<T>;
  const finalizeCanonical = finalizeCanonicalSession as FinalizeCanonicalSession;
  let commitCalls = 0;
  await assertRejects(
    finalizeCanonical(
      async () => { throw new Error('profile rejected the session'); },
      () => { commitCalls += 1; },
    ),
    'canonical session rejection fails closed',
  );
  equal(commitCalls, 0, 'session state is not committed when canonical validation fails');

  const cancellation = new AbortController();
  await assertRejects(
    finalizeCanonical(
      async () => {
        cancellation.abort();
        return { profile: { id: 'customer-cancelled' } };
      },
      () => { commitCalls += 1; },
      cancellation.signal,
    ),
    'cancellation after canonical reads still prevents session commit',
  );
  equal(commitCalls, 0, 'cancelled Screen 10 never commits or resumes after Back');

  const order: string[] = [];
  const canonical = await finalizeCanonical(
    async () => {
      order.push('canonical-reads');
      return { profile: { id: 'customer-1' }, favorites: [], bookings: [] };
    },
    async (value) => {
      assert((value.profile as { id: string }).id === 'customer-1', 'commit receives canonical server data');
      order.push('commit-session');
    },
  );
  assert(canonical.profile.id === 'customer-1', 'finalizer returns the canonical bundle');
  equal(order.join('>'), 'canonical-reads>commit-session', 'canonical reads finish before session commit');

  console.log('customerScreen10AuthV2 tests passed');
}

void runAsyncTests();

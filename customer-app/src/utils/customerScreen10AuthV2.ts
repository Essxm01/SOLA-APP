import type { AuthOrigin } from './customerAuthV2';

export type Screen10FailureDisposition = 'RETRY' | 'REVERIFY';

export function normalizeCustomerFullName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function isValidCustomerFullName(value: string): boolean {
  return normalizeCustomerFullName(value).length >= 2;
}

export function getScreen10OriginMessage(origin: AuthOrigin): string | null {
  if (origin.type === 'PROTECTED_BOOKING') return 'ستعود إلى مراجعة طلب الحجز بعد إكمال الحساب.';
  if (origin.type === 'PROTECTED_FAVORITE') return 'ستعود إلى الوحدة بعد إكمال الحساب.';
  return null;
}

export function getScreen10FailureDisposition(kind: string): Screen10FailureDisposition {
  return kind === 'CONTINUATION_TOKEN_EXPIRED'
    || kind === 'CONTINUATION_ALREADY_CONSUMED'
    || kind === 'CONTINUATION_INVALID'
    ? 'REVERIFY'
    : 'RETRY';
}

export function createScreen10SubmissionGuard(): {
  begin: () => number | null;
  cancel: () => void;
  isCurrent: (generation: number) => boolean;
} {
  let generation = 0;
  let active = false;
  return {
    begin: () => {
      if (active) return null;
      active = true;
      generation += 1;
      return generation;
    },
    cancel: () => {
      active = false;
      generation += 1;
    },
    isCurrent: (candidate) => active && candidate === generation,
  };
}

export function createScreen10CompletionCoordinator<T>(): {
  attempt: (register: () => Promise<T>, finalize: (result: T) => Promise<void>) => Promise<T>;
  reset: () => void;
} {
  let registeredResult: T | undefined;
  let completed = false;
  let inFlight: Promise<T> | null = null;

  return {
    attempt: (register, finalize) => {
      if (completed && registeredResult !== undefined) return Promise.resolve(registeredResult);
      if (inFlight) return inFlight;

      inFlight = (async () => {
        const result = registeredResult ?? await register();
        registeredResult = result;
        await finalize(result);
        completed = true;
        return result;
      })();

      return inFlight.finally(() => {
        inFlight = null;
      });
    },
    reset: () => {
      registeredResult = undefined;
      completed = false;
      inFlight = null;
    },
  };
}

export async function finalizeScreen10CanonicalSession<T>(
  loadCanonicalSession: () => Promise<T>,
  commitSession: (canonicalSession: T) => Promise<void> | void,
  signal?: AbortSignal,
): Promise<T> {
  signal?.throwIfAborted();
  const canonicalSession = await loadCanonicalSession();
  signal?.throwIfAborted();
  await commitSession(canonicalSession);
  return canonicalSession;
}

export async function orchestrateScreen10SessionFinalization<TCanonical, TOrigin>(input: {
  origin: TOrigin;
  loadCanonicalSession: () => Promise<TCanonical>;
  persistSession: (canonicalSession: TCanonical) => Promise<void> | void;
  resumeOrigin: (origin: TOrigin) => Promise<void> | void;
  clearHandoff: () => Promise<void> | void;
  signal?: AbortSignal;
}): Promise<TCanonical> {
  return finalizeScreen10CanonicalSession(
    input.loadCanonicalSession,
    async (canonicalSession) => {
      // Once persistence begins, finish this synchronous logical transaction so
      // cancellation cannot leave a valid session with a stale handoff.
      await input.persistSession(canonicalSession);
      await input.resumeOrigin(input.origin);
      await input.clearHandoff();
    },
    input.signal,
  );
}

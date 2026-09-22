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

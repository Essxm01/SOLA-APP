import type { AuthChallengeIssued } from './customerAuthV2';

export type Screen09State = 'OTP_ENTRY' | 'VERIFYING' | 'INCORRECT_CODE' | 'OTP_EXPIRED' | 'CHALLENGE_TERMINAL' | 'RESENDING' | 'RESEND_ERROR' | 'VERIFIED';

export function normalizeOtp(value: string): string {
  return value.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (character) => {
    const code = character.charCodeAt(0);
    return String(code >= 0x06F0 ? code - 0x06F0 : code - 0x0660);
  }).replace(/\D/g, '').slice(0, 6);
}

export function isOtpComplete(value: string): boolean {
  return /^\d{6}$/.test(value);
}

export function getServerTimestampRemainingMs(timestamp: string, nowMs = Date.now()): number | null {
  const target = Date.parse(timestamp);
  if (!Number.isFinite(target)) return null;
  return Math.max(0, target - nowMs);
}

export function areServerTimestampsValid(challenge: Pick<AuthChallengeIssued, 'resendAvailableAt' | 'expiresAt'>): boolean {
  return Number.isFinite(Date.parse(challenge.resendAvailableAt)) && Number.isFinite(Date.parse(challenge.expiresAt));
}

export function shouldCancelChallengeOnExit(verified: boolean, terminal: boolean): boolean {
  return !verified && !terminal;
}

export function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

export function createScreen09RequestGuard(): { begin: (kind: 'VERIFY' | 'RESEND' | 'CANCEL') => number | null; cancel: () => void; isCurrent: (generation: number) => boolean } {
  let generation = 0;
  let activeKind: string | null = null;
  return {
    begin: (kind) => {
      if (activeKind) return null;
      activeKind = kind;
      generation += 1;
      return generation;
    },
    cancel: () => { activeKind = null; generation += 1; },
    isCurrent: (candidate) => activeKind !== null && candidate === generation,
  };
}

export function challengeIsLocallyExpired(challenge: AuthChallengeIssued, nowMs = Date.now()): boolean {
  if (!areServerTimestampsValid(challenge)) return true;
  const remaining = getServerTimestampRemainingMs(challenge.expiresAt, nowMs);
  return remaining !== null && remaining <= 0;
}

/** The OTP window can expire while the underlying challenge remains recoverable. */
export function isScreen09OtpExpired(challenge: AuthChallengeIssued, nowMs = Date.now()): boolean {
  if (!areServerTimestampsValid(challenge)) return false;
  const remaining = getServerTimestampRemainingMs(challenge.expiresAt, nowMs);
  return remaining !== null && remaining <= 0;
}

export function canResendScreen09Otp(terminal: boolean, resendRemainingMs: number | null): boolean {
  return !terminal && (resendRemainingMs === null || resendRemainingMs <= 0);
}

export function stateAfterScreen09OtpInput(state: Screen09State): Screen09State {
  return state === 'OTP_EXPIRED' ? 'OTP_EXPIRED' : 'OTP_ENTRY';
}

export function stateAfterScreen09Resend(): Screen09State {
  return 'OTP_ENTRY';
}

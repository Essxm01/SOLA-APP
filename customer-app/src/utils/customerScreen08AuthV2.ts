import type { AuthIntent, AuthMethod, AuthOrigin } from './customerAuthV2';

export interface Screen08FormState {
  intent: AuthIntent;
  method: AuthMethod;
  phone: string;
  email: string;
}

export const createScreen08FormStateFromDraft = (draft: Screen08FormState | undefined, fallbackIntent: AuthIntent = 'LOGIN'): Screen08FormState => draft ? { ...draft } : createScreen08FormState(fallbackIntent);

export function restoreScreen08PhoneValue(identifier: string): string {
  return identifier.startsWith('+20') ? `0${identifier.slice(3)}` : identifier;
}

export interface AuthV2FlowState {
  origin: AuthOrigin;
  intent: AuthIntent;
}

export function createAuthV2Flow(origin: AuthOrigin, intent: AuthIntent = 'LOGIN'): AuthV2FlowState {
  return { origin, intent };
}

export function getDefaultIntentForOrigin(origin: AuthOrigin): AuthIntent {
  return origin.type === 'WELCOME_CREATE_ACCOUNT' ? 'CREATE_ACCOUNT' : 'LOGIN';
}

export function cancelAuthV2Handoff(origin: AuthOrigin): { clearFavorite: boolean; clearBooking: boolean } {
  return { clearFavorite: origin.type === 'PROTECTED_FAVORITE', clearBooking: origin.type === 'PROTECTED_BOOKING' };
}

export function createScreen08FormState(initialIntent: AuthIntent = 'LOGIN'): Screen08FormState {
  return { intent: initialIntent, method: 'PHONE', phone: '', email: '' };
}

export function updateScreen08Identifier(state: Screen08FormState, value: string): Screen08FormState {
  return state.method === 'PHONE' ? { ...state, phone: value } : { ...state, email: value };
}

export function switchScreen08Method(state: Screen08FormState, method: AuthMethod): Screen08FormState {
  return { ...state, method };
}

export function switchScreen08Intent(state: Screen08FormState, intent: AuthIntent): Screen08FormState {
  return { ...state, intent };
}

export function createScreen08IssueGuard(): { begin: () => number; cancel: () => void; isCurrent: (generation: number) => boolean } {
  let generation = 0;
  let active = false;
  return {
    begin: () => { active = true; generation += 1; return generation; },
    cancel: () => { active = false; generation += 1; },
    isCurrent: (candidate) => active && candidate === generation,
  };
}

export function createScreen08HandoffGuard(): { claim: () => boolean; issued: () => boolean } {
  let hasIssued = false;
  return {
    claim: () => {
      if (hasIssued) return false;
      hasIssued = true;
      return true;
    },
    issued: () => hasIssued,
  };
}

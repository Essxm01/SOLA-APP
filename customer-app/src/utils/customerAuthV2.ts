export type AuthIntent = 'LOGIN' | 'CREATE_ACCOUNT';
export type AuthMethod = 'PHONE' | 'EMAIL';

export type AuthOrigin =
  | { type: 'WELCOME_LOGIN' }
  | { type: 'WELCOME_CREATE_ACCOUNT' }
  | { type: 'EXPLORE_ACCOUNT' }
  | { type: 'ACCOUNT_TAB' }
  | { type: 'FAVORITES_TAB' }
  | { type: 'PROTECTED_FAVORITE'; propertyId: string }
  | { type: 'PROTECTED_BOOKING'; context: { propertyId: string; checkIn: string; checkOut: string; guests: number; quoteSnapshot?: import('../components/PropertyDetailModal').ServerPriceQuote | null; quoteFingerprint?: string | null; requestId?: string | null } };

export interface AuthChallengeIssued {
  challengeId: string;
  intent: AuthIntent;
  method: AuthMethod;
  identifier: string;
  maskedRecipient: string;
  resendAvailableAt: string;
  expiresAt: string;
  authOrigin: AuthOrigin;
}

export interface AuthV2SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthV2RegistrationResult {
  tokens: AuthV2SessionTokens;
  user?: unknown;
}

export type AuthV2VerifyResult =
  | { kind: 'AUTHENTICATED_EXISTING_ACCOUNT'; challengeId: string; method: AuthMethod; intent: AuthIntent; authOrigin: AuthOrigin; tokens: AuthV2SessionTokens; user?: unknown }
  | { kind: 'LOGIN_ACCOUNT_MISSING'; challengeId: string; method: 'PHONE'; intent: 'LOGIN'; authOrigin: AuthOrigin; continuationToken: string }
  | { kind: 'LOGIN_ACCOUNT_MISSING'; challengeId: string; method: 'EMAIL'; intent: 'LOGIN'; authOrigin: AuthOrigin }
  | { kind: 'CREATE_ACCOUNT_NEW_PHONE'; challengeId: string; method: 'PHONE'; intent: 'CREATE_ACCOUNT'; authOrigin: AuthOrigin; continuationToken: string; requiresFullName: true }
  | { kind: 'EMAIL_ACCOUNT_CREATION_DEFERRED'; challengeId: string; method: 'EMAIL'; intent: AuthIntent; authOrigin: AuthOrigin };

export interface IssueAuthChallengeInput {
  intent: AuthIntent;
  method: AuthMethod;
  identifier: string;
  authOrigin: AuthOrigin;
}

export interface CustomerAuthV2ClientConfig {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export class CustomerAuthV2Error extends Error {
  readonly kind: 'CONFIGURATION' | 'RATE_LIMIT' | 'OTP_DELIVERY_FAILED' | 'INVALID_MOBILE' | 'INVALID_EMAIL' | 'INVALID_FULL_NAME' | 'UNAVAILABLE' | 'INVALID_RESPONSE' | 'REQUEST_FAILED' | 'INVALID_OTP' | 'OTP_EXPIRED' | 'CHALLENGE_EXPIRED' | 'CHALLENGE_LOCKED_MAX_ATTEMPTS_EXCEEDED' | 'CHALLENGE_CANCELLED' | 'CHALLENGE_NOT_FOUND' | 'CHALLENGE_ALREADY_VERIFIED' | 'RESEND_COOLDOWN_ACTIVE' | 'RESEND_IN_PROGRESS' | 'RATE_LIMIT_EXCEEDED' | 'CONTINUATION_TOKEN_EXPIRED' | 'CONTINUATION_ALREADY_CONSUMED' | 'CONTINUATION_INVALID';

  constructor(kind: CustomerAuthV2Error['kind'], message = 'AUTH_V2_ISSUE_FAILED') {
    super(message);
    this.name = 'CustomerAuthV2Error';
    this.kind = kind;
  }
}

/** Arabic-Indic and Persian digits are normalized without changing other input. */
export function normalizeArabicDigits(value: string): string {
  return value.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (character) => {
    const code = character.charCodeAt(0);
    return String(code >= 0x06F0 ? code - 0x06F0 : code - 0x0660);
  });
}

export function normalizeEgyptianPhone(value: string): string {
  return normalizeArabicDigits(value).replace(/[\s()-]/g, '');
}

export function isValidEgyptianPhone(value: string): boolean {
  return /^01[0125]\d{8}$/.test(normalizeEgyptianPhone(value));
}

export function isValidCustomerEmail(value: string): boolean {
  const trimmed = value.trim();
  const at = trimmed.indexOf('@');
  const lastAt = trimmed.lastIndexOf('@');
  if (at <= 0 || at !== lastAt || at === trimmed.length - 1) return false;
  if (/[\s\u0000-\u001F\u007F]/.test(trimmed)) return false;
  const domain = trimmed.slice(at + 1);
  const labels = domain.split('.');
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.') || labels.some((label) => label.length === 0 || label.startsWith('-') || label.endsWith('-'))) return false;
  return true;
}

export function normalizeCustomerEmail(value: string): string {
  const trimmed = value.trim();
  const at = trimmed.lastIndexOf('@');
  return at < 1 ? trimmed : `${trimmed.slice(0, at)}@${trimmed.slice(at + 1).toLowerCase()}`;
}

export function toEgyptianE164(value: string): string {
  const local = normalizeEgyptianPhone(value);
  return `+20${local.slice(1)}`;
}

/** Render a PHONE challenge for people, without exposing the canonical E.164 value. */
export function formatMaskedCustomerPhone(identifier: string): string {
  const digits = normalizeArabicDigits(identifier).replace(/\D/g, '');
  const local = digits.startsWith('20') ? `0${digits.slice(2)}` : digits;
  if (!/^01\d{9}$/.test(local)) return '••••••';
  return `${local.slice(0, 3)}••••••${local.slice(-2)}`;
}

export function getAuthOriginMessage(origin?: AuthOrigin): string | null {
  if (origin?.type === 'PROTECTED_BOOKING') return 'بعد التحقق، ستعود لمراجعة طلب الحجز.';
  if (origin?.type === 'PROTECTED_FAVORITE') return 'بعد التحقق، ستتمكن من متابعة حفظ الوحدة.';
  return null;
}

export function isCustomerAuthV2Enabled(value?: string | null): boolean {
  return value?.trim().toLowerCase() === 'true';
}

export function getConfiguredAuthV2BaseUrl(explicitBaseUrl?: string | null, runtimeHostname?: string | null): string | null {
  const explicit = explicitBaseUrl?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const configured = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_AUTH_V2_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  const hostname = (runtimeHostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')).trim().toLowerCase();
  if (hostname === 'pages.dev' || hostname.endsWith('.pages.dev')) return 'https://sola-backend-api.essxm01.workers.dev/api/v2';
  return '/api/v2';
}

export function getAuthV2ApiUrl(path: string, explicitBaseUrl?: string | null): string {
  const base = getConfiguredAuthV2BaseUrl(explicitBaseUrl) ?? '/api/v2';
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function readResponseErrorCode(json: Record<string, unknown> | null): string | null {
  const topError = json && typeof json.error === 'object' && json.error ? json.error as Record<string, unknown> : null;
  const nestedData = json && typeof json.data === 'object' && json.data ? json.data as Record<string, unknown> : null;
  const nestedError = nestedData && typeof nestedData.error === 'object' && nestedData.error ? nestedData.error as Record<string, unknown> : null;
  const code = topError?.code ?? nestedError?.code ?? json?.code ?? nestedData?.code;
  return typeof code === 'string' ? code : null;
}

function throwMappedAuthV2Error(code: string | null, fallback: CustomerAuthV2Error['kind'] = 'REQUEST_FAILED'): never {
  const map: Record<string, CustomerAuthV2Error['kind']> = {
    OTP_DELIVERY_FAILED: 'OTP_DELIVERY_FAILED',
    INVALID_EGYPTIAN_MOBILE_NUMBER: 'INVALID_MOBILE',
    INVALID_EMAIL: 'INVALID_EMAIL',
    INVALID_FULL_NAME: 'INVALID_FULL_NAME',
    AUTH_V2_UNAVAILABLE: 'UNAVAILABLE',
    INVALID_OTP: 'INVALID_OTP',
    OTP_EXPIRED: 'OTP_EXPIRED',
    CHALLENGE_EXPIRED: 'CHALLENGE_EXPIRED',
    CHALLENGE_LOCKED_MAX_ATTEMPTS_EXCEEDED: 'CHALLENGE_LOCKED_MAX_ATTEMPTS_EXCEEDED',
    CHALLENGE_LOCKED: 'CHALLENGE_LOCKED_MAX_ATTEMPTS_EXCEEDED',
    MAX_ATTEMPTS_EXCEEDED: 'CHALLENGE_LOCKED_MAX_ATTEMPTS_EXCEEDED',
    CHALLENGE_CANCELLED: 'CHALLENGE_CANCELLED',
    CHALLENGE_NOT_FOUND: 'CHALLENGE_NOT_FOUND',
    CHALLENGE_ALREADY_VERIFIED: 'CHALLENGE_ALREADY_VERIFIED',
    RESEND_COOLDOWN_ACTIVE: 'RESEND_COOLDOWN_ACTIVE',
    RESEND_IN_PROGRESS: 'RESEND_IN_PROGRESS',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    CONTINUATION_TOKEN_EXPIRED: 'CONTINUATION_TOKEN_EXPIRED',
    CONTINUATION_ALREADY_CONSUMED: 'CONTINUATION_ALREADY_CONSUMED',
    INVALID_CONTINUATION_TOKEN: 'CONTINUATION_INVALID',
    MALFORMED_CONTINUATION_TOKEN: 'CONTINUATION_INVALID',
    INVALID_CONTINUATION_TOKEN_SIGNATURE: 'CONTINUATION_INVALID',
    CORRUPT_CONTINUATION_TOKEN_PAYLOAD: 'CONTINUATION_INVALID',
    CHALLENGE_NOT_VERIFIED: 'CONTINUATION_INVALID',
    CHALLENGE_BINDING_MISMATCH: 'CONTINUATION_INVALID',
  };
  throw new CustomerAuthV2Error(map[code ?? ''] ?? fallback);
}

function readIssuedChallenge(data: unknown): Omit<AuthChallengeIssued, 'intent' | 'identifier' | 'authOrigin'> {
  if (!data || typeof data !== 'object') throw new CustomerAuthV2Error('INVALID_RESPONSE');
  const value = data as Record<string, unknown>;
  if (typeof value.challengeId !== 'string' || typeof value.method !== 'string' || (value.method !== 'PHONE' && value.method !== 'EMAIL') || typeof value.maskedRecipient !== 'string' || typeof value.resendAvailableAt !== 'string' || typeof value.expiresAt !== 'string' || !Number.isFinite(Date.parse(value.resendAvailableAt)) || !Number.isFinite(Date.parse(value.expiresAt))) {
    throw new CustomerAuthV2Error('INVALID_RESPONSE');
  }
  return {
    challengeId: value.challengeId,
    method: value.method,
    maskedRecipient: value.maskedRecipient,
    resendAvailableAt: value.resendAvailableAt,
    expiresAt: value.expiresAt,
  };
}

export async function issueCustomerAuthChallenge(
  input: IssueAuthChallengeInput,
  config: CustomerAuthV2ClientConfig,
  signal?: AbortSignal,
): Promise<AuthChallengeIssued> {
  const baseUrl = config.baseUrl.trim().replace(/\/$/, '');
  if (!baseUrl) throw new CustomerAuthV2Error('CONFIGURATION');
  const fetchImpl = config.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(getAuthV2ApiUrl('/auth/challenges', baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ surface: 'CUSTOMER', intent: input.intent, method: input.method, identifier: input.identifier }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new CustomerAuthV2Error('REQUEST_FAILED');
  }

  const json = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (response.status === 429) throw new CustomerAuthV2Error('RATE_LIMIT');
  const errorCode = readResponseErrorCode(json);
  if (errorCode) throwMappedAuthV2Error(errorCode);
  if (!response.ok || json?.success !== true || !json.data || typeof json.data !== 'object') throw new CustomerAuthV2Error('REQUEST_FAILED');
  const envelope = json.data as Record<string, unknown>;
  if (envelope.success !== true) throw new CustomerAuthV2Error('REQUEST_FAILED');
  return { ...readIssuedChallenge(envelope.data ?? envelope), intent: input.intent, identifier: input.identifier, authOrigin: input.authOrigin };
}

function readSuccessData(json: Record<string, unknown> | null): Record<string, unknown> {
  if (!json || json.success !== true || !json.data || typeof json.data !== 'object') throw new CustomerAuthV2Error('INVALID_RESPONSE');
  const envelope = json.data as Record<string, unknown>;
  if (envelope.success !== true) throw new CustomerAuthV2Error('REQUEST_FAILED');
  return envelope;
}

function readAuthTokens(value: unknown): AuthV2SessionTokens | null {
  if (!value || typeof value !== 'object') return null;
  const tokens = value as Record<string, unknown>;
  if (typeof tokens.accessToken !== 'string' || typeof tokens.refreshToken !== 'string' || typeof tokens.expiresIn !== 'number') return null;
  const accessToken = tokens.accessToken.trim();
  const refreshToken = tokens.refreshToken.trim();
  if (!accessToken || !refreshToken || !Number.isFinite(tokens.expiresIn) || tokens.expiresIn <= 0) return null;
  return { accessToken, refreshToken, expiresIn: tokens.expiresIn };
}

export async function verifyCustomerAuthChallenge(
  challenge: AuthChallengeIssued,
  otp: string,
  config: CustomerAuthV2ClientConfig,
  signal?: AbortSignal,
): Promise<AuthV2VerifyResult> {
  if (!/^\d{6}$/.test(otp)) throw new CustomerAuthV2Error('INVALID_RESPONSE');
  let response: Response;
  try {
    response = await (config.fetchImpl ?? fetch)(getAuthV2ApiUrl(`/auth/challenges/${encodeURIComponent(challenge.challengeId)}/verify`, config.baseUrl), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ otp }), signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new CustomerAuthV2Error('REQUEST_FAILED');
  }
  const json = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (response.status === 429) throw new CustomerAuthV2Error('RATE_LIMIT_EXCEEDED');
  if (!response.ok) throwMappedAuthV2Error(readResponseErrorCode(json));
  const data = readSuccessData(json);
  const method = data.method === 'PHONE' || data.method === 'EMAIL' ? data.method : null;
  const intent = data.intent === 'LOGIN' || data.intent === 'CREATE_ACCOUNT' ? data.intent : null;
  if (!method || !intent || data.challengeId !== challenge.challengeId || typeof data.isExistingUser !== 'boolean') throw new CustomerAuthV2Error('INVALID_RESPONSE');
  const tokens = readAuthTokens(data.tokens);
  if (data.isExistingUser) {
    if (!tokens) throw new CustomerAuthV2Error('INVALID_RESPONSE');
    return { kind: 'AUTHENTICATED_EXISTING_ACCOUNT', challengeId: challenge.challengeId, method, intent, authOrigin: challenge.authOrigin, tokens, user: data.user };
  }
  if (method === 'EMAIL') {
    if (data.accountCreation !== 'DEFERRED_EMAIL_ONLY') throw new CustomerAuthV2Error('INVALID_RESPONSE');
    if (intent === 'LOGIN') {
      return { kind: 'LOGIN_ACCOUNT_MISSING', challengeId: challenge.challengeId, method, intent, authOrigin: challenge.authOrigin };
    }
    return { kind: 'EMAIL_ACCOUNT_CREATION_DEFERRED', challengeId: challenge.challengeId, method, intent, authOrigin: challenge.authOrigin };
  }
  if (typeof data.continuationToken !== 'string' || data.continuationToken.length === 0) throw new CustomerAuthV2Error('INVALID_RESPONSE');
  if (intent === 'LOGIN') return { kind: 'LOGIN_ACCOUNT_MISSING', challengeId: challenge.challengeId, method, intent, authOrigin: challenge.authOrigin, continuationToken: data.continuationToken };
  if (data.requiresFullName !== true) throw new CustomerAuthV2Error('INVALID_RESPONSE');
  return { kind: 'CREATE_ACCOUNT_NEW_PHONE', challengeId: challenge.challengeId, method, intent, authOrigin: challenge.authOrigin, continuationToken: data.continuationToken, requiresFullName: true };
}

export async function completeCustomerAccountRegistration(
  continuationToken: string,
  fullName: string,
  config: CustomerAuthV2ClientConfig,
  signal?: AbortSignal,
): Promise<AuthV2RegistrationResult> {
  const cleanName = fullName.trim().replace(/\s+/g, ' ');
  if (cleanName.length < 2) throw new CustomerAuthV2Error('INVALID_FULL_NAME');
  if (!continuationToken || typeof continuationToken !== 'string') throw new CustomerAuthV2Error('CONTINUATION_INVALID');

  let response: Response;
  try {
    response = await (config.fetchImpl ?? fetch)(getAuthV2ApiUrl('/auth/registration/complete', config.baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ continuationToken, fullName: cleanName }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new CustomerAuthV2Error('REQUEST_FAILED');
  }

  const json = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) throwMappedAuthV2Error(readResponseErrorCode(json));

  if (!json || json.success !== true || !json.data || typeof json.data !== 'object') {
    throw new CustomerAuthV2Error('INVALID_RESPONSE');
  }
  const data = json.data as Record<string, unknown>;
  const tokens = readAuthTokens(data.tokens);
  if (!tokens) throw new CustomerAuthV2Error('INVALID_RESPONSE');
  if (data.user !== undefined && (typeof data.user !== 'object' || data.user === null)) {
    throw new CustomerAuthV2Error('INVALID_RESPONSE');
  }

  return { tokens, user: data.user };
}

export async function resendCustomerAuthChallenge(
  challenge: AuthChallengeIssued,
  config: CustomerAuthV2ClientConfig,
  signal?: AbortSignal,
): Promise<Pick<AuthChallengeIssued, 'challengeId' | 'resendAvailableAt' | 'expiresAt'>> {
  let response: Response;
  try {
    response = await (config.fetchImpl ?? fetch)(getAuthV2ApiUrl(`/auth/challenges/${encodeURIComponent(challenge.challengeId)}/resend`, config.baseUrl), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new CustomerAuthV2Error('REQUEST_FAILED');
  }
  const json = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (response.status === 429) throw new CustomerAuthV2Error('RATE_LIMIT_EXCEEDED');
  if (!response.ok) throwMappedAuthV2Error(readResponseErrorCode(json));
  const data = readSuccessData(json);
  if (data.challengeId !== challenge.challengeId || typeof data.resendAvailableAt !== 'string' || typeof data.expiresAt !== 'string' || !Number.isFinite(Date.parse(data.resendAvailableAt)) || !Number.isFinite(Date.parse(data.expiresAt))) throw new CustomerAuthV2Error('INVALID_RESPONSE');
  return { challengeId: challenge.challengeId, resendAvailableAt: data.resendAvailableAt, expiresAt: data.expiresAt };
}

export async function cancelCustomerAuthChallenge(challenge: AuthChallengeIssued, config: CustomerAuthV2ClientConfig, signal?: AbortSignal): Promise<void> {
  let response: Response;
  try {
    response = await (config.fetchImpl ?? fetch)(getAuthV2ApiUrl(`/auth/challenges/${encodeURIComponent(challenge.challengeId)}`, config.baseUrl), { method: 'DELETE', signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    return;
  }
  if (!response.ok) return;
  const json = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (json && json.success === false) return;
}

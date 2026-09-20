/**
 * Isolated Conservative Email Normalizer
 * Location: backend/server/src/utils/emailNormalizer.ts
 * 
 * Rules:
 *   1. Trim outer whitespace.
 *   2. Safely normalize domain by lowercasing it.
 *   3. Preserve local-part semantics: preserve dots, preserve plus-addressing (+tag).
 *   4. No Gmail-specific behavior (do NOT strip dots, do NOT remove plus aliases).
 *   5. No alias stripping or transformations that could merge distinct mailboxes.
 *   6. Strictly validate RFC-compatible structure before returning.
 */

export function normalizeEmail(rawEmail: string): string {
  if (!rawEmail || typeof rawEmail !== 'string') {
    throw new Error('INVALID_EMAIL_ADDRESS');
  }

  const trimmed = rawEmail.trim();
  if (!trimmed) {
    throw new Error('INVALID_EMAIL_ADDRESS');
  }

  // Must contain exactly one '@' separator
  const atParts = trimmed.split('@');
  if (atParts.length !== 2) {
    throw new Error('INVALID_EMAIL_ADDRESS');
  }

  const [localPart, domainPart] = atParts;

  if (!localPart || !domainPart) {
    throw new Error('INVALID_EMAIL_ADDRESS');
  }

  // Domain validation: must contain at least one dot, no leading/trailing dot or hyphen
  const normalizedDomain = domainPart.toLowerCase().trim();
  if (
    !normalizedDomain.includes('.') ||
    normalizedDomain.startsWith('.') ||
    normalizedDomain.endsWith('.') ||
    normalizedDomain.startsWith('-') ||
    normalizedDomain.endsWith('-')
  ) {
    throw new Error('INVALID_EMAIL_DOMAIN');
  }

  // Local-part validation: basic check ensuring non-empty, no control characters
  if (/[\x00-\x1F\x7F\s]/.test(localPart)) {
    throw new Error('INVALID_EMAIL_LOCAL_PART');
  }

  // Preserve local-part casing and semantics (dots, pluses, etc.)
  // Lowercase the domain only
  return `${localPart}@${normalizedDomain}`;
}

export function isValidEmail(email: string): boolean {
  try {
    normalizeEmail(email);
    return true;
  } catch {
    return false;
  }
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return '****';
  }
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local.charAt(0)}***@${domain}`;
  }
  const first = local.charAt(0);
  const last = local.charAt(local.length - 1);
  return `${first}***${last}@${domain}`;
}

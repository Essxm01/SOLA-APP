/**
 * Canonical Phone Normalization Utility
 * Location: backend/server/src/utils/phoneNormalizer.ts
 */

export function normalizePhoneNumber(rawPhone: string): string {
  if (!rawPhone || typeof rawPhone !== 'string') {
    throw new Error('INVALID_PHONE_NUMBER');
  }

  // 1. Strip whitespace, dashes, dots, parentheses
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]+/g, '');

  // 2. Handle leading '+'
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // 3. Remove non-digits
  cleaned = cleaned.replace(/\D/g, '');

  // 4. Handle various prefixes:
  // If starts with '20' and is 12 digits long (e.g. 201012345678)
  if (cleaned.startsWith('20') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } 
  // If starts with '0' and is 11 digits long (e.g. 01012345678)
  else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }

  // Egyptian mobile prefixes: 10 (Vodafone), 11 (Etisalat), 12 (Orange), 15 (WE) + 8 digits = 10 digits
  if (!/^(10|11|12|15)\d{8}$/.test(cleaned)) {
    throw new Error('INVALID_EGYPTIAN_MOBILE_NUMBER');
  }

  return `+20${cleaned}`;
}

export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 6) return '****';
  return phone.slice(0, 5) + '******' + phone.slice(-2);
}

/**
 * Egyptian Phone Number Normalization & Validation Utility
 * Location: customer-app/src/utils/phoneValidation.ts
 *
 * Implements deterministic Arabic/Latin digit conversion and canonical
 * Egyptian mobile carrier validation (^01[0125]\d{8}$).
 */

const ARABIC_INDIC_MAP: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

const EASTERN_ARABIC_MAP: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

/**
 * Normalizes raw user input by converting Arabic-Indic / Persian digits to Latin,
 * removing benign separators (spaces, hyphens, dots, parentheses), stripping
 * accidental country code prefixes (+20/20), and capping at 11 digits.
 */
export function normalizeDigits(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  // 1. Convert Arabic-Indic and Eastern Arabic/Persian digits to standard Latin digits
  let converted = '';
  for (const char of raw) {
    if (ARABIC_INDIC_MAP[char] !== undefined) {
      converted += ARABIC_INDIC_MAP[char];
    } else if (EASTERN_ARABIC_MAP[char] !== undefined) {
      converted += EASTERN_ARABIC_MAP[char];
    } else {
      converted += char;
    }
  }

  // 2. Trim and remove whitespace, hyphens, dots, parentheses
  let cleaned = converted.trim().replace(/[\s\-\(\)\.]+/g, '');

  // 3. Handle leading '+'
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // 4. Strip non-digits
  cleaned = cleaned.replace(/\D/g, '');

  // 5. If user typed or pasted country prefix '20' followed by an Egyptian mobile number
  if (cleaned.startsWith('20') && cleaned.length >= 12) {
    cleaned = cleaned.substring(2);
  }

  // 6. Enforce local format: if starts with non-zero mobile prefix '10', '11', '12', '15',
  // and length is 10 digits, prefix '0' to keep it in local format
  if (/^(10|11|12|15)/.test(cleaned) && cleaned.length === 10) {
    cleaned = `0${cleaned}`;
  }

  // 7. Cap at maximum 11 digits for Egyptian local mobile numbers
  return cleaned.slice(0, 11);
}

export const EGYPTIAN_MOBILE_REGEX = /^01[0125]\d{8}$/;

export interface PhoneValidationResult {
  isValid: boolean;
  normalizedLocal: string;
  canonicalE164: string;
  errorMessage?: string;
}

export const PHONE_VALIDATION_MESSAGES = {
  helper: 'رقم مصري يبدأ بـ 010 أو 011 أو 012 أو 015',
  invalid: 'اكتب رقم موبايل مصري صحيح يبدأ بـ 010 أو 011 أو 012 أو 015.',
  serviceError: 'تعذر المتابعة دلوقتي. حاول مرة تانية.',
  primaryHeading: 'اكتب رقم موبايلك',
  supportingCopy: 'اكتب رقم موبايل مصري، والخطوة الجاية هنتأكد منه.',
  phoneLabel: 'رقم الموبايل',
  phonePlaceholder: '01X XXXX XXXX',
  primaryCta: 'متابعة',
  loadingCta: 'جاري المتابعة…',
  bookingReassurance: 'تفاصيل طلب الحجز محفوظة. بعد التحقق هنرجعك لمراجعة الطلب قبل الإرسال.',
  favoriteReassurance: 'بعد التحقق هنرجعك لنفس الوحدة.',
};

/**
 * Validates an Egyptian local mobile phone number.
 */
export function validateEgyptianMobilePhone(raw: string): PhoneValidationResult {
  const normalizedLocal = normalizeDigits(raw);
  const isValid = EGYPTIAN_MOBILE_REGEX.test(normalizedLocal);

  if (!isValid) {
    return {
      isValid: false,
      normalizedLocal,
      canonicalE164: '',
      errorMessage: PHONE_VALIDATION_MESSAGES.invalid,
    };
  }

  // Convert local 01XXXXXXXXX to canonical E.164 +201XXXXXXXXX
  const canonicalE164 = `+20${normalizedLocal.substring(1)}`;

  return {
    isValid: true,
    normalizedLocal,
    canonicalE164,
  };
}

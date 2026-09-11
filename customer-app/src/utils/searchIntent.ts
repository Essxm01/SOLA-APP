// Customer search intent contract (Phase 5 / C2 — Screens 04/05).
//
// IMPORTANT LIMITATION PRESERVED: the public search API does NOT guarantee
// server-side date availability filtering. check-in/check-out are USER SEARCH
// INTENT only — they are validated locally (2–30 night product rule) and are
// never sent to the public search endpoint. True stay availability remains a
// Property Details / booking-time responsibility.

export interface SearchIntent {
  destination: string;
  checkIn: string; // '' = not set (never defaults to a fixed past date)
  checkOut: string;
  totalGuests: number;
  unitType: string; // 'ALL' | canonical unit type
  maxPrice: number; // 0 = no ceiling (untouched ceiling values are never sent)
  maxPriceTouched: boolean;
}

export const EMPTY_SEARCH_INTENT: SearchIntent = {
  destination: '',
  checkIn: '',
  checkOut: '',
  totalGuests: 1,
  unitType: 'ALL',
  maxPrice: 0,
  maxPriceTouched: false,
};

export interface PublicSearchFilters {
  destination?: string;
  unitType?: string;
  totalGuests?: number;
  maxPrice?: number;
}

// Canonical property type label mapping (Customer-facing Arabic only — never expose backend enums).
export const CANONICAL_PROPERTY_TYPE_LABELS: Record<string, string> = {
  CHALET: 'شاليه',
  VILLA: 'فيلا',
  APARTMENT: 'شقة مصيفية',
  STUDIO: 'استوديو',
  HOTEL_ROOM: 'غرفة فندقية',
  OTHER: 'أخرى',
};

export function getPropertyTypeLabel(unitType?: string | null): string {
  if (!unitType) return '';
  const trimmed = unitType.trim();
  const upper = trimmed.toUpperCase();
  return CANONICAL_PROPERTY_TYPE_LABELS[upper] || trimmed;
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export function formatArabicDate(iso: string): string {
  if (!isRealCalendarDate(iso)) return iso;
  const [year, monthStr, dayStr] = iso.split('-');
  const monthIndex = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  const monthName = ARABIC_MONTHS[monthIndex] || monthStr;
  return `${day} ${monthName} ${year}`;
}

export function formatArabicDateShort(iso: string): string {
  if (!isRealCalendarDate(iso)) return iso;
  const [, monthStr, dayStr] = iso.split('-');
  const monthIndex = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  const monthName = ARABIC_MONTHS[monthIndex] || monthStr;
  return `${day} ${monthName}`;
}

export function formatArabicStayRange(checkIn: string, checkOut: string): string {
  if (!checkIn || !checkOut) return '';
  if (!isRealCalendarDate(checkIn) || !isRealCalendarDate(checkOut)) {
    return `${checkIn} ← ${checkOut}`;
  }
  const [y1] = checkIn.split('-');
  const [y2] = checkOut.split('-');
  if (y1 === y2) {
    return `${formatArabicDateShort(checkIn)} ← ${formatArabicDate(checkOut)}`;
  }
  return `${formatArabicDate(checkIn)} ← ${formatArabicDate(checkOut)}`;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRealCalendarDate(iso: string): boolean {
  if (!ISO_DATE_PATTERN.test(iso)) return false;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso;
}

export function nightsBetween(checkIn: string, checkOut: string): number | null {
  if (!isRealCalendarDate(checkIn) || !isRealCalendarDate(checkOut)) return null;
  const inMs = new Date(`${checkIn}T00:00:00Z`).getTime();
  const outMs = new Date(`${checkOut}T00:00:00Z`).getTime();
  return Math.round((outMs - inMs) / (24 * 60 * 60 * 1000));
}

export interface StayRangeResult {
  ok: boolean;
  nights: number | null;
  errorCode?:
    | 'SEARCH_DATES_INCOMPLETE'
    | 'SEARCH_DATES_MALFORMED'
    | 'SEARCH_DATE_PAST'
    | 'SEARCH_DATE_ORDER_INVALID'
    | 'SEARCH_STAY_TOO_SHORT'
    | 'SEARCH_STAY_TOO_LONG';
}

// Validates user search-intent dates. Absent dates are valid (open search).
// todayISO may be injected for deterministic tests; defaults to real today (UTC).
export function validateStayRange(
  checkIn: string,
  checkOut: string,
  todayISO?: string
): StayRangeResult {
  const today = todayISO ?? new Date().toISOString().slice(0, 10);

  if (checkIn === '' && checkOut === '') {
    return { ok: true, nights: null };
  }
  if (checkIn === '' || checkOut === '') {
    return { ok: false, nights: null, errorCode: 'SEARCH_DATES_INCOMPLETE' };
  }
  if (!isRealCalendarDate(checkIn) || !isRealCalendarDate(checkOut)) {
    return { ok: false, nights: null, errorCode: 'SEARCH_DATES_MALFORMED' };
  }
  if (checkIn < today) {
    return { ok: false, nights: null, errorCode: 'SEARCH_DATE_PAST' };
  }
  const nights = nightsBetween(checkIn, checkOut);
  if (nights === null || nights <= 0) {
    return { ok: false, nights: null, errorCode: 'SEARCH_DATE_ORDER_INVALID' };
  }
  if (nights < 2) {
    return { ok: false, nights, errorCode: 'SEARCH_STAY_TOO_SHORT' };
  }
  if (nights > 30) {
    return { ok: false, nights, errorCode: 'SEARCH_STAY_TOO_LONG' };
  }
  return { ok: true, nights };
}

// Maps search intent to ONLY the server-supported public filters.
// Dates intentionally never appear here — see the limitation note above.
export function toPublicSearchFilters(intent: SearchIntent): PublicSearchFilters {
  const filters: PublicSearchFilters = {};

  const destination = intent.destination.trim();
  if (destination !== '') {
    filters.destination = destination;
  }
  if (intent.unitType !== '' && intent.unitType !== 'ALL') {
    filters.unitType = intent.unitType;
  }
  if (Number.isInteger(intent.totalGuests) && intent.totalGuests > 1) {
    // Key matches buildPublicPropertySearchPath's input contract (totalGuests).
    filters.totalGuests = intent.totalGuests;
  }
  if (intent.maxPriceTouched && Number.isFinite(intent.maxPrice) && intent.maxPrice > 0) {
    filters.maxPrice = intent.maxPrice;
  }
  return filters;
}

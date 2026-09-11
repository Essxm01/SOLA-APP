// Same dependency-free assertion style as the other customer suites —
// the customer tsconfig has no Node type definitions.
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function assertEqual<T>(actual: T, expected: T, message: string): void {
  assert(actual === expected, `${message} (actual=${String(actual)} expected=${String(expected)})`);
}
import {
  validateStayRange,
  toPublicSearchFilters,
  nightsBetween,
  EMPTY_SEARCH_INTENT,
  CANONICAL_PROPERTY_TYPE_LABELS,
  getPropertyTypeLabel,
  formatArabicDate,
  formatArabicDateShort,
  formatArabicStayRange,
  type SearchIntent,
} from './searchIntent.js';

const D = (s: string) => s;

// 1. nightsBetween: whole-day math, no timezone drift.
{
  assertEqual(nightsBetween(D('2026-12-20'), D('2026-12-22')), 2, 'two nights');
  assertEqual(nightsBetween(D('2026-12-20'), D('2026-12-21')), 1, 'one night');
}

// 2. No dates at all is a VALID state (search intent without dates).
{
  const r = validateStayRange(D(''), D(''));
  assertEqual(r.ok, true, 'absent dates are valid intent');
  assertEqual(r.nights, null, 'no nights computed');
}

// 3. One-sided dates are invalid.
{
  assertEqual(validateStayRange(D('2026-12-20'), D('')).ok, false, 'missing checkOut rejected');
  assertEqual(validateStayRange(D(''), D('2026-12-22')).ok, false, 'missing checkIn rejected');
}

// 4. checkOut must be after checkIn.
assertEqual(validateStayRange(D('2026-12-22'), D('2026-12-20')).ok, false, 'backwards range rejected');
assertEqual(validateStayRange(D('2026-12-20'), D('2026-12-20')).ok, false, 'same-day range rejected');

// 5. Stay length 2–30 nights (existing product rule enforced at this stage).
{
  assertEqual(validateStayRange(D('2026-12-20'), D('2026-12-21')).ok, false, '1 night below minimum');
  assertEqual(validateStayRange(D('2026-12-20'), D('2026-12-22')).ok, true, '2 nights valid');
  const long = validateStayRange(D('2026-12-01'), D('2026-12-31'));
  assertEqual(long.ok, true, '30 nights valid');
  assertEqual(long.nights, 30, '30-night length computed');
  assertEqual(validateStayRange(D('2026-12-01'), D('2027-01-02')).ok, false, '31 nights rejected');
}

// 6. Past check-in rejected relative to an injected "today".
{
  const r = validateStayRange(D('2026-01-01'), D('2026-01-05'), D('2026-09-10'));
  assertEqual(r.ok, false, 'past check-in rejected');
  // checkOut in the past with future checkIn is impossible (backwards already), but past-only guard applies to checkIn
}

// 7. Malformed date strings rejected (no silent parsing).
{
  assertEqual(validateStayRange(D('not-a-date'), D('2026-12-22')).ok, false, 'malformed checkIn rejected');
  assertEqual(validateStayRange(D('2026-12-20'), D('')).ok, false, 'one-sided malformed rejected');
}

// 8. toPublicSearchFilters maps ONLY server-supported filters.
//    Dates are search INTENT and must never be sent to the public API.
{
  const intent: SearchIntent = {
    destination: 'مراسي',
    checkIn: '2026-12-20',
    checkOut: '2026-12-22',
    totalGuests: 4,
    unitType: 'CHALET',
    maxPrice: 12000,
    maxPriceTouched: true,
  };
  const f = toPublicSearchFilters(intent);
  assertEqual(f.destination, 'مراسي', 'destination mapped');
  assertEqual(f.unitType, 'CHALET', 'unitType mapped');
  assertEqual(f.totalGuests, 4, 'guests mapped under the path-builder key');
  assertEqual(f.maxPrice, 12000, 'maxPrice mapped');
  assertEqual('checkIn' in (f as any), false, 'checkIn must never reach the API');
  assertEqual('checkOut' in (f as any), false, 'checkOut must never reach the API');
}

// 9. Untouched maxPrice and default guests are NOT sent (no silent filtering).
{
  const intent: SearchIntent = {
    destination: '', checkIn: '', checkOut: '',
    totalGuests: 1, unitType: 'ALL', maxPrice: 0, maxPriceTouched: false,
  };
  const f = toPublicSearchFilters(intent);
  assertEqual(f.destination, undefined, 'empty destination omitted');
  assertEqual(f.totalGuests, undefined, 'guests=1 (no restriction) omitted');
  assertEqual(f.maxPrice, undefined, 'untouched maxPrice omitted');
  assertEqual(f.unitType, undefined, 'ALL omitted');
}

// 10. Guest minimum capacity filter is only sent when meaningful (>1).
{
  const f = toPublicSearchFilters({ ...EMPTY_SEARCH_INTENT, totalGuests: 5 });
  assertEqual(f.totalGuests, 5, 'guests above 1 sent as minimum capacity');
}

// 11. No invented global guest cap: counts above 12 must pass through to the
//     canonical public-search contract unchanged (backend owns filtering; a
//     zero-match result is the truthful EMPTY state).
{
  for (const guests of [13, 25, 60]) {
    const f = toPublicSearchFilters({ ...EMPTY_SEARCH_INTENT, totalGuests: guests });
    assertEqual(f.totalGuests, guests, `guests=${guests} must not be capped by the client`);
  }
}

// 12. Canonical property type mapping: all 6 backend enums mapped to customer Arabic.
//     Never expose raw backend enums to the customer.
{
  assertEqual(CANONICAL_PROPERTY_TYPE_LABELS.CHALET, 'شاليه', 'CHALET label');
  assertEqual(CANONICAL_PROPERTY_TYPE_LABELS.VILLA, 'فيلا', 'VILLA label');
  assertEqual(CANONICAL_PROPERTY_TYPE_LABELS.APARTMENT, 'شقة مصيفية', 'APARTMENT label');
  assertEqual(CANONICAL_PROPERTY_TYPE_LABELS.STUDIO, 'استوديو', 'STUDIO label');
  assertEqual(CANONICAL_PROPERTY_TYPE_LABELS.HOTEL_ROOM, 'غرفة فندقية', 'HOTEL_ROOM label');
  assertEqual(CANONICAL_PROPERTY_TYPE_LABELS.OTHER, 'أخرى', 'OTHER label');

  assertEqual(getPropertyTypeLabel('CHALET'), 'شاليه', 'getPropertyTypeLabel uppercase');
  assertEqual(getPropertyTypeLabel('chalet'), 'شاليه', 'getPropertyTypeLabel lowercase');
  assertEqual(getPropertyTypeLabel('VILLA'), 'فيلا', 'getPropertyTypeLabel VILLA');
  assertEqual(getPropertyTypeLabel('APARTMENT'), 'شقة مصيفية', 'getPropertyTypeLabel APARTMENT');
  assertEqual(getPropertyTypeLabel('STUDIO'), 'استوديو', 'getPropertyTypeLabel STUDIO');
  assertEqual(getPropertyTypeLabel('HOTEL_ROOM'), 'غرفة فندقية', 'getPropertyTypeLabel HOTEL_ROOM');
  assertEqual(getPropertyTypeLabel('OTHER'), 'أخرى', 'getPropertyTypeLabel OTHER');
  assertEqual(getPropertyTypeLabel('شاليه'), 'شاليه', 'getPropertyTypeLabel preserves existing Arabic');
  assertEqual(getPropertyTypeLabel(''), '', 'getPropertyTypeLabel handles empty');
}

// 13. Max price is unbounded: no arbitrary 40k cap. High values pass through faithfully.
{
  for (const price of [50000, 100000, 1000000]) {
    const f = toPublicSearchFilters({
      ...EMPTY_SEARCH_INTENT,
      maxPrice: price,
      maxPriceTouched: true,
    });
    assertEqual(f.maxPrice, price, `maxPrice=${price} must pass without arbitrary ceiling`);
  }
}

// 14. Arabic date UX helpers format correctly and cleanly.
{
  assertEqual(formatArabicDate('2026-12-20'), '20 ديسمبر 2026', 'formatArabicDate full date');
  assertEqual(formatArabicDateShort('2026-12-20'), '20 ديسمبر', 'formatArabicDateShort day month');
  assertEqual(formatArabicStayRange('2026-12-20', '2026-12-22'), '20 ديسمبر ← 22 ديسمبر 2026', 'formatArabicStayRange same year');
  assertEqual(formatArabicStayRange('2026-12-30', '2027-01-02'), '30 ديسمبر 2026 ← 2 يناير 2027', 'formatArabicStayRange cross year');
  assertEqual(formatArabicStayRange('', ''), '', 'formatArabicStayRange empty');
}

console.log('Customer search intent contract tests passed');

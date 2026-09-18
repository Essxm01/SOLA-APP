/**
 * SOLA Customer App — Customer C3 Property Decision Test Suite
 *
 * Deterministic regression tests covering:
 * 1. No unconditional "إقامة موثقة من كونفرم" in PropertyDetailModal
 * 2. No unconditional "إقامة موثقة" in BookingReviewSheet
 * 3. No customer-visible locally calculated total fallback (no estimatedTotal math)
 * 4. Quote error does not render estimate/0
 * 5. Sticky quote-ready CTA is strictly "مراجعة طلب الحجز"
 * 6. Availability failure remains fail-closed
 * 7. Date semantics remain local calendar day (no toISOString day drift)
 * 8. No invented "الساحل الشمالي" fallback after canonical detail success
 * 9. Guest min/max remains canonical
 * 10. BookingReview uses server quote finance
 */

import { resolvePropertyLocation, resolveEffectiveMaxGuests, clampGuests } from './customerTruthfulState.js';
import { isCheckInViable } from '../components/AvailabilityCalendar.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  console.log('Running C3 Property Decision regression suite...');

  // @ts-ignore
  const { readFileSync } = await import('node:fs');

  const detailModalSource: string = readFileSync(new URL('../components/PropertyDetailModal.tsx', import.meta.url), 'utf8');
  const reviewSheetSource: string = readFileSync(new URL('../components/BookingReviewSheet.tsx', import.meta.url), 'utf8');
  const calendarSource: string = readFileSync(new URL('../components/AvailabilityCalendar.tsx', import.meta.url), 'utf8');
  const guestSelectorSource: string = readFileSync(new URL('../components/GuestSelector.tsx', import.meta.url), 'utf8');

  // ── 1. No unconditional "إقامة موثقة من كونفرم" in PropertyDetailModal ───────
  assert(
    !detailModalSource.includes('إقامة موثقة من كونفرم'),
    'C3-REG-01: PropertyDetailModal must NOT contain unconditional "إقامة موثقة من كونفرم"'
  );
  assert(
    !detailModalSource.includes('إقامة موثقة'),
    'C3-REG-01b: PropertyDetailModal must NOT contain unconditional "إقامة موثقة"'
  );

  // ── 2. No unconditional "إقامة موثقة" in BookingReviewSheet ───────────────────
  assert(
    !reviewSheetSource.includes('إقامة موثقة'),
    'C3-REG-02: BookingReviewSheet must NOT contain unconditional "إقامة موثقة"'
  );

  // ── 3. No customer-visible locally calculated total fallback ─────────────────
  assert(
    !detailModalSource.includes('estimatedTotal'),
    'C3-REG-03: PropertyDetailModal must NOT use or define estimatedTotal fallback'
  );
  assert(
    !detailModalSource.includes('nightlyPrice * localNights'),
    'C3-REG-03b: PropertyDetailModal must NOT calculate total via nightlyPrice * localNights'
  );

  // ── 4. Quote error does not render estimate/0 ────────────────────────────────
  assert(
    detailModalSource.includes('تعذر حساب السعر حاليًا.'),
    'C3-REG-04: Quote error must render authoritative Arabic error message'
  );
  assert(
    detailModalSource.includes('إعادة حساب السعر'),
    'C3-REG-04b: Quote error must provide "إعادة حساب السعر" recovery button'
  );

  // ── 5. Sticky quote-ready CTA is strictly "مراجعة طلب الحجز" ────────────────
  assert(
    detailModalSource.includes('مراجعة طلب الحجز'),
    'C3-REG-05: Sticky quote-ready CTA must be "مراجعة طلب الحجز"'
  );
  assert(
    !detailModalSource.includes('متابعة طلب الحجز'),
    'C3-REG-05b: PropertyDetailModal must NOT use superseded "متابعة طلب الحجز"'
  );
  assert(
    !detailModalSource.includes('احجز الآن') && !detailModalSource.includes('ادفع الآن'),
    'C3-REG-05c: PropertyDetailModal must NOT use instant-book CTA terms'
  );

  // ── 6. Availability failure remains fail-closed ──────────────────────────────
  assert(
    detailModalSource.includes('تعذر تحميل التوفر.'),
    'C3-REG-06: Availability error must render explicit fail-closed message'
  );
  assert(
    detailModalSource.includes('إعادة تحميل التوفر'),
    'C3-REG-06b: Availability error must offer "إعادة تحميل التوفر" recovery CTA'
  );

  // ── 7. Date semantics remain local calendar day ──────────────────────────────
  assert(
    !calendarSource.includes('.toISOString()'),
    'C3-REG-07: AvailabilityCalendar must NOT use toISOString() which introduces day drift'
  );
  assert(
    calendarSource.includes('getFullYear()') && calendarSource.includes('getMonth()') && calendarSource.includes('getDate()'),
    'C3-REG-07b: AvailabilityCalendar must construct local date strings directly'
  );

  // ── 8. No invented "الساحل الشمالي" fallback after canonical detail success ──
  const locEmptyCanonical = resolvePropertyLocation(
    { address: '', resortName: null, region: null },
    { address: 'قديم', resortName: 'قديم', region: 'قديم' }
  );
  assert(
    locEmptyCanonical === 'الموقع غير محدد',
    'C3-REG-08: Empty canonical detail location must return "الموقع غير محدد" without inventing "الساحل الشمالي"'
  );

  // ── 9. Guest min/max remains canonical ──────────────────────────────────────
  const maxG = resolveEffectiveMaxGuests(6, 10, true);
  assert(maxG === 6, 'C3-REG-09: Canonical maxGuests must be authoritative when detail is loaded');
  assert(clampGuests(8, maxG) === 6, 'C3-REG-09b: clampGuests must clamp above maxGuests down to max');
  assert(clampGuests(0, maxG) === 1, 'C3-REG-09c: clampGuests must clamp below 1 up to 1');
  assert(
    !guestSelectorSource.includes('لا تستوعب أكثر من'),
    'C3-REG-09d: GuestSelector must NOT show amber warning merely because max capacity is reached'
  );

  // ── 10. BookingReview uses server quote finance ──────────────────────────────
  assert(
    reviewSheetSource.includes('firstNightPrice') &&
    reviewSheetSource.includes('totalBookingValue') &&
    reviewSheetSource.includes('depositAmount') &&
    reviewSheetSource.includes('remainingBalance'),
    'C3-REG-10: BookingReviewSheet must consume canonical server quote finance values'
  );

  // ── 11. Founder Bug Remediated: Check-In Viability rejects dead-end candidates ──
  const founderBlocked = [{ checkIn: '2026-09-21', checkOut: '2026-09-25' }];
  assert(
    isCheckInViable('2026-09-20', founderBlocked, 2, '2026-09-18') === false,
    'C3-REG-11: Check-in candidate preceding a blocked range without minStay contiguous nights must be rejected as unviable'
  );

  // ── 12. Valid Boundary: Check-In candidate with exact minStay contiguous nights ─
  const boundaryBlocked = [{ checkIn: '2026-09-22', checkOut: '2026-09-25' }];
  assert(
    isCheckInViable('2026-09-20', boundaryBlocked, 2, '2026-09-18') === true,
    'C3-REG-12: Check-in candidate with exact minStay (Sep 20-22) before a blocked range starting Sep 22 must be viable'
  );

  // ── 13. After Blocked Range: Check-In on checkout date of prior reservation ─────
  assert(
    isCheckInViable('2026-09-25', founderBlocked, 2, '2026-09-18') === true,
    'C3-REG-13: Check-in candidate on the checkout day of a prior blocked reservation must be viable'
  );

  // ── 14. Month Boundary Viability without timezone or day drift ─────────────────
  const octBlocked = [{ checkIn: '2026-10-05', checkOut: '2026-10-10' }];
  assert(
    isCheckInViable('2026-09-30', octBlocked, 2, '2026-09-18') === true,
    'C3-REG-14a: Month boundary crossing into next month (Sep 30 -> Oct 2) must be viable when nights are open'
  );
  const oct1Blocked = [{ checkIn: '2026-10-01', checkOut: '2026-10-05' }];
  assert(
    isCheckInViable('2026-09-30', oct1Blocked, 2, '2026-09-18') === false,
    'C3-REG-14b: Month boundary crossing into next month must be rejected if stay interval overlaps next month blocked date'
  );

  // ── 15. Zero Blocks & Past Date Enforcement ────────────────────────────────────
  assert(
    isCheckInViable('2026-10-15', [], 3, '2026-09-18') === true,
    'C3-REG-15a: Future date on open calendar with zero blocks must be viable'
  );
  assert(
    isCheckInViable('2026-09-17', [], 2, '2026-09-18') === false,
    'C3-REG-15b: Past date relative to today must not be viable as check-in'
  );

  // ── 16. Guaranteed Escape Action & In-line Notice Guard ─────────────────────────
  assert(
    calendarSource.includes('تغيير تاريخ الوصول'),
    'C3-REG-16a: AvailabilityCalendar must provide explicit "تغيير تاريخ الوصول" escape action'
  );
  assert(
    calendarSource.includes('لا توجد ليالٍ كافية بعد هذا التاريخ. اختر تاريخ وصول آخر.'),
    'C3-REG-16b: AvailabilityCalendar must show canonical Arabic inline notice when tapping unviable check-in date'
  );
  assert(
    calendarSource.includes('min-h-[44px]'),
    'C3-REG-16c: AvailabilityCalendar touch targets must meet minimum 44px requirement'
  );

  console.log('ALL C3 REGRESSION CHECKS PASSED DETERMINISTICALLY (16/16)');
}

run().catch((err) => {
  console.error('C3 REGRESSION TEST FAILURE:', err);
  throw err;
});

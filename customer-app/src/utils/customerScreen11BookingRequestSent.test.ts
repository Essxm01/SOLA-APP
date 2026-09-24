/**
 * SOLA Customer App — Screen 11 Booking Request Sent Test Suite
 *
 * Deterministic regression tests covering all 24 required Screen 11 rules:
 * 1. Screen 11 never appears before successful backend booking response.
 * 2. Successful create response mounts Screen 11.
 * 3. Screen 11 does not depend on bookings refresh.
 * 4. Account-summary refresh failure does not revoke Screen 11 success.
 * 5. Booking-list refresh failure does not revoke Screen 11 success.
 * 6. No auto-submit.
 * 7. No duplicate booking creation.
 * 8. Primary CTA routes to BOOKINGS.
 * 9. Secondary action routes to EXPLORE.
 * 10. No visible Back/X to Review.
 * 11. Screen 07 state is cleared after successful submission.
 * 12. PENDING_OWNER_APPROVAL maps to قيد مراجعة المالك.
 * 13. Raw enum is not shown.
 * 14. No Payment CTA.
 * 15. No notification promise.
 * 16. No SLA / 24 ساعة.
 * 17. No commission / Owner net.
 * 18. No "تم تأكيد الحجز" or "مبروك".
 * 19. Optional property title absence is safe.
 * 20. Long booking number renders without unsafe truncation.
 * 21. Canonical 2/3/30-night values render safely.
 * 22. Idempotent replay does not expose technical replay language.
 * 23. Advanced replay state does not falsely claim pending review.
 * 24. Stay-length product rule (min 2, max 30) validated.
 */

import {
  isAllowedStayLength,
  formatArabicNights,
  formatArabicGuests,
  formatStayDurationAndGuests,
  resolveScreen11SuccessRouting,
  type CustomerBookingCreateResponseDto,
} from './customerScreen11BookingRequestSent.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  assert(actual === expected, `${message} (actual=${String(actual)} expected=${String(expected)})`);
}

async function run() {
  console.log('Running Customer Screen 11 Booking Request Sent regression suite...');

  // @ts-ignore
  const { readFileSync } = await import('node:fs');

  const screen11Source: string = readFileSync(
    new URL('../components/BookingRequestSentScreen.tsx', import.meta.url),
    'utf8'
  );
  const appSource: string = readFileSync(
    new URL('../App.tsx', import.meta.url),
    'utf8'
  );
  const reviewScreenSource: string = readFileSync(
    new URL('../components/BookingRequestReviewScreen.tsx', import.meta.url),
    'utf8'
  );

  // ── 1. Screen 11 never appears before successful backend response ──────────
  assert(
    reviewScreenSource.includes('if ((res.status === 200 || res.status === 201) && json?.success && json?.data) {') &&
    reviewScreenSource.includes('onSubmitSuccess(json.data)'),
    'RULE-01: BookingRequestReviewScreen must ONLY call onSubmitSuccess upon confirmed 200/201 response'
  );

  // ── 2. Successful create response mounts Screen 11 ─────────────────────────
  assert(
    appSource.includes('bookingRequestSent') &&
    appSource.includes('<BookingRequestSentScreen'),
    'RULE-02: App.tsx must mount BookingRequestSentScreen when bookingRequestSent state is present'
  );

  // ── 3. Screen 11 does not depend on bookings refresh ───────────────────────
  assert(
    appSource.includes('setBookingRequestSent(') &&
    !appSource.includes('await fetchBookings') &&
    !appSource.includes('await fetchAccountSummary'),
    'RULE-03: handleBookingSuccess must set bookingRequestSent without awaiting background refreshes'
  );

  // ── 4 & 5. Refresh failures do not revoke Screen 11 success ────────────────
  assert(
    appSource.includes('void fetchBookings(token).catch(') &&
    appSource.includes('void fetchAccountSummary(token).catch('),
    'RULE-04/05: Secondary fetchBookings and fetchAccountSummary failures must be caught and ignored'
  );

  // ── 6 & 7. No auto-submit and no duplicate booking creation ───────────────
  assert(
    !reviewScreenSource.includes('void handleSubmitBooking()') &&
    !reviewScreenSource.includes('autoSubmit'),
    'RULE-06/07: No auto-submit mechanism must exist in booking review'
  );

  // ── 8. Primary CTA routes to BOOKINGS ──────────────────────────────────────
  assert(
    screen11Source.includes('onGoToBookings') &&
    screen11Source.includes('متابعة الطلب في حجوزاتي'),
    'RULE-08a: Screen 11 must provide primary CTA labeled متابعة الطلب في حجوزاتي'
  );
  assert(
    appSource.includes("setActiveTab('BOOKINGS')") &&
    appSource.includes('setBookingRequestSent(null)'),
    'RULE-08b: Primary CTA in App.tsx must set activeTab to BOOKINGS and clear Screen 11'
  );

  // ── 9. Secondary action routes to EXPLORE ──────────────────────────────────
  assert(
    screen11Source.includes('onExplore') &&
    screen11Source.includes('العودة إلى الاستكشاف'),
    'RULE-09a: Screen 11 must provide secondary action labeled العودة إلى الاستكشاف'
  );
  assert(
    appSource.includes("setDiscoveryView('EXPLORE')"),
    'RULE-09b: Secondary action must navigate to EXPLORE'
  );

  // ── 10. No visible Back/X to Review ────────────────────────────────────────
  assert(
    !screen11Source.includes('onBack') &&
    !screen11Source.includes('ArrowLeft') &&
    !screen11Source.includes('ArrowRight') &&
    !screen11Source.includes('ChevronLeft') &&
    !screen11Source.includes('ChevronRight') &&
    !screen11Source.includes('Close') &&
    !screen11Source.includes('X className'),
    'RULE-10: Screen 11 must NOT render any Back button or Close X'
  );

  // ── 11. Screen 07 state is cleared after successful submission ─────────────
  assert(
    appSource.includes('setSelectedProperty(null)') &&
    appSource.includes('setRestoreBookingReview(false)') &&
    appSource.includes('setInterceptedContext(null)') &&
    appSource.includes("localStorage.removeItem('sola_customer_pending_booking_intent')"),
    'RULE-11: Screen 07 review state and pending intent must be cleared upon booking success'
  );

  // ── 12. PENDING_OWNER_APPROVAL maps to قيد مراجعة المالك ────────────────────
  assert(
    screen11Source.includes('قيد مراجعة المالك'),
    'RULE-12: Screen 11 must display status badge labeled قيد مراجعة المالك'
  );

  // ── 13. Raw enum is not shown ──────────────────────────────────────────────
  assert(
    !screen11Source.includes('{booking.status}') &&
    !screen11Source.includes('PENDING_OWNER_APPROVAL'),
    'RULE-13: Screen 11 must NOT display raw backend status enums'
  );

  // ── 14. No Payment CTA ─────────────────────────────────────────────────────
  assert(
    !screen11Source.includes('ادفع الآن') &&
    !screen11Source.includes('الدفع الآن') &&
    !screen11Source.includes('دفع العربون الآن') &&
    screen11Source.includes('لا يوجد أي مبلغ مطلوب الآن.'),
    'RULE-14: Screen 11 must reassure customer that no payment is required now'
  );

  // ── 15. No notification promise ────────────────────────────────────────────
  assert(
    !screen11Source.includes('سيصلك إشعار') &&
    !screen11Source.includes('سنرسل لك إشعارًا') &&
    !screen11Source.includes('إشعار فوري'),
    'RULE-15: Screen 11 must NOT promise push/SMS notifications'
  );

  // ── 16. No SLA / 24 ساعة ───────────────────────────────────────────────────
  assert(
    !screen11Source.includes('24 ساعة') &&
    !screen11Source.includes('خلال يوم') &&
    !screen11Source.includes('فورًا'),
    'RULE-16: Screen 11 must NOT make unbacked SLAs or 24-hour promises'
  );

  // ── 17. No commission / Owner net ──────────────────────────────────────────
  assert(
    !screen11Source.includes('عمولة') &&
    !screen11Source.includes('صافي المالك') &&
    !screen11Source.includes('أتعاب الخدمة'),
    'RULE-17: Screen 11 must NEVER display internal platform commission or owner net'
  );

  // ── 18. No "تم تأكيد الحجز" or "مبروك" ─────────────────────────────────────
  assert(
    !screen11Source.includes('تم تأكيد الحجز') &&
    !screen11Source.includes('تم الحجز') &&
    !screen11Source.includes('مبروك') &&
    !screen11Source.includes('التواريخ محجوزة'),
    'RULE-18: Screen 11 must NOT claim booking confirmation or celebration'
  );

  // ── 19. Optional property title absence is safe ───────────────────────────
  assert(
    screen11Source.includes('cleanTitle &&') || screen11Source.includes('propertyTitle &&'),
    'RULE-19: Property title row must be conditionally rendered only when truthfully present'
  );

  // ── 20. Long booking number renders with dir="ltr" and wrapping ────────────
  assert(
    screen11Source.includes('dir="ltr"') &&
    screen11Source.includes('break-all') &&
    screen11Source.includes('booking.bookingNumber'),
    'RULE-20: Booking number must be rendered with dir="ltr" and break-all'
  );

  // ── 21. Canonical 2/3/30-night values render safely ────────────────────────
  assertEqual(formatArabicNights(2), 'ليلتان', '2 nights format');
  assertEqual(formatArabicNights(3), '3 ليالٍ', '3 nights format');
  assertEqual(formatArabicNights(5), '5 ليالٍ', '5 nights format');
  assertEqual(formatArabicNights(10), '10 ليالٍ', '10 nights format');
  assertEqual(formatArabicNights(14), '14 ليلة', '14 nights format');
  assertEqual(formatArabicNights(30), '30 ليلة', '30 nights format');

  assertEqual(formatArabicGuests(1), 'ضيف واحد', '1 guest format');
  assertEqual(formatArabicGuests(2), 'ضيفان', '2 guests format');
  assertEqual(formatArabicGuests(4), '4 ضيوف', '4 guests format');
  assertEqual(formatArabicGuests(12), '12 ضيف', '12 guests format');

  assertEqual(
    formatStayDurationAndGuests(2, 2),
    'ليلتان • ضيفان',
    'combined 2 nights 2 guests'
  );
  assertEqual(
    formatStayDurationAndGuests(30, 4),
    '30 ليلة • 4 ضيوف',
    'combined 30 nights 4 guests'
  );

  // ── 22. Idempotent replay does not expose technical replay language ────────
  assert(
    !screen11Source.includes('idempotentReplay') &&
    !screen11Source.includes('إعادة طلب') &&
    !screen11Source.includes('طلب مكرر'),
    'RULE-22: Screen 11 must never expose internal idempotent replay terminology'
  );

  // ── 23. Advanced replay state does not falsely claim pending review ────────
  const mockBaseBooking: CustomerBookingCreateResponseDto = {
    id: 'bkg-123',
    propertyId: 'prop-456',
    bookingNumber: 'SOLA-2026-9999',
    status: 'PENDING_OWNER_APPROVAL',
    checkIn: '2026-10-01',
    checkOut: '2026-10-03',
    nights: 2,
    guestsCount: 2,
    totalStay: 5000,
    depositAmount: 2500,
    remainingAmount: 2500,
    currency: 'EGP',
    createdAt: '2026-09-24T12:00:00Z',
  };

  const pendingRoute = resolveScreen11SuccessRouting(mockBaseBooking, 'فيلا الساحل');
  assertEqual(pendingRoute.action, 'SHOW_SCREEN_11', 'Pending booking shows Screen 11');

  const approvedRoute = resolveScreen11SuccessRouting(
    { ...mockBaseBooking, status: 'APPROVED_PENDING_PAYMENT', idempotentReplay: true },
    'فيلا الساحل'
  );
  assertEqual(
    approvedRoute.action,
    'NAVIGATE_TO_BOOKINGS',
    'Approved replay routes to bookings instead of showing pending Screen 11'
  );

  const confirmedRoute = resolveScreen11SuccessRouting(
    { ...mockBaseBooking, status: 'CONFIRMED', idempotentReplay: true },
    'فيلا الساحل'
  );
  assertEqual(
    confirmedRoute.action,
    'NAVIGATE_TO_BOOKINGS',
    'Confirmed replay routes to bookings instead of showing pending Screen 11'
  );

  // ── 24. Stay-length rule validation (min 2, max 30) ────────────────────────
  assertEqual(isAllowedStayLength(1), false, '1 night rejected by stay rule');
  assertEqual(isAllowedStayLength(2), true, '2 nights accepted by stay rule');
  assertEqual(isAllowedStayLength(15), true, '15 nights accepted by stay rule');
  assertEqual(isAllowedStayLength(30), true, '30 nights accepted by stay rule');
  assertEqual(isAllowedStayLength(31), false, '31 nights rejected by stay rule');
  assertEqual(isAllowedStayLength(0), false, '0 nights rejected');
  assertEqual(isAllowedStayLength(-2), false, 'negative nights rejected');

  console.log('ALL 24 SCREEN 11 REGRESSION CHECKS PASSED DETERMINISTICALLY!');
}

run().catch((err) => {
  console.error('Screen 11 Regression Suite FAILED:', err);
  throw err;
});

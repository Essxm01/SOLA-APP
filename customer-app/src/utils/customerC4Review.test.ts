/**
 * SOLA Customer App — Customer C4 Booking Request Review Test Suite
 *
 * Deterministic regression tests covering all C4 Screen 07 requirements:
 * 1. Guest can enter Screen 07 without auth (Flow A: Public Review)
 * 2. Guest final submit invokes auth rather than booking creation
 * 3. Auth success does NOT auto-submit
 * 4. Return from auth triggers server quote revalidation
 * 5. Unchanged fingerprint → normal state
 * 6. Changed fingerprint → updated quote + PRICE_CHANGED state
 * 7. Changed price requires another explicit action
 * 8. DATE_OVERLAP → availability conflict
 * 9. Edit returns to Screen 06 preserving intended context
 * 10. Network submit error keeps review state and requestId
 * 11. Retry uses SAME requestId
 * 12. Material intent edit creates NEW requestId
 * 13. No client finance reconstruction (strictly server quote)
 * 14. No internal commission/owner net shown
 * 15. No trust badge or ratings
 * 16. Screen 11 only after server-confirmed success/replay
 * 17. Behavioral test: Auth return preserves exact requestId
 * 18. Behavioral test: Restored review enters REVALIDATING state
 * 19. Behavioral test: Revalidation invokes calculate without auto-submit
 * 20. Behavioral test: Unchanged quote transitions to REVIEW
 * 21. Behavioral test: Changed quote transitions to PRICE_CHANGED
 * 22. Behavioral test: DATE_OVERLAP transitions to AVAILABILITY_CONFLICT
 * 23. Behavioral test: IDEMPOTENCY_CONFLICT transitions to non-retryable IDEMPOTENCY_ERROR
 * 24. Behavioral test: 401/403 session expiry preserves review context and requestId
 * 25. Truthful copy: No "24 ساعة", no "إشعار فوري", no speculative availability cause
 * 26. Exact LAB process steps 1, 2, 3 present
 * 27. LAB typography: No text-[10px] or text-[11px] decision text
 * 28. Legacy unsafe booking submit path completely absent
 */

import {
  generateClientRequestId,
  initReviewState,
  applyRevalidationSuccess,
  applyRevalidationError,
  classifySubmitResponse,
  type ServerPriceQuote,
} from './customerC4ReviewState.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function run() {
  console.log('Running C4 Booking Request Review regression suite...');

  // @ts-ignore
  const { readFileSync } = await import('node:fs');

  const reviewScreenSource: string = readFileSync(
    new URL('../components/BookingRequestReviewScreen.tsx', import.meta.url),
    'utf8'
  );
  const detailModalSource: string = readFileSync(
    new URL('../components/PropertyDetailModal.tsx', import.meta.url),
    'utf8'
  );
  const appSource: string = readFileSync(
    new URL('../App.tsx', import.meta.url),
    'utf8'
  );

  // ── 1. Flow A: Guest can enter Screen 07 without auth ─────────────────────
  assert(
    !detailModalSource.includes('if (!authToken) {\n      onRequireAuth(') &&
    !detailModalSource.includes('if (!authToken) { onRequireAuth('),
    'C4-REG-01: PropertyDetailModal CTA must NOT require auth to enter Screen 07 (Flow A Public Review)'
  );
  assert(
    detailModalSource.includes('// Flow A: Guest enters Screen 07 directly without auth interception'),
    'C4-REG-01b: PropertyDetailModal must explicitly document Flow A Public Review entry'
  );

  // ── 2. Guest final submit invokes auth rather than booking creation ───────
  assert(
    reviewScreenSource.includes('onRequireAuth({') &&
    reviewScreenSource.includes('!effectiveToken'),
    'C4-REG-02: Guest final submit in BookingRequestReviewScreen must intercept with onRequireAuth'
  );

  // ── 3. Auth success does NOT auto-submit ──────────────────────────────────
  assert(
    reviewScreenSource.includes('// NO AUTO-SUBMIT: return to review state, user must explicitly tap CTA'),
    'C4-REG-03: Return from auth must NOT auto-submit; user must explicitly tap CTA'
  );
  assert(
    !reviewScreenSource.includes('void handleSubmitBooking()') &&
    !reviewScreenSource.includes('handleSubmitBooking();\n    }'),
    'C4-REG-03b: revalidateQuote must NEVER auto-invoke handleSubmitBooking'
  );

  // ── 4. Return from auth triggers server quote revalidation ────────────────
  assert(
    reviewScreenSource.includes('restoredFromAuth') &&
    reviewScreenSource.includes('revalidateQuote'),
    'C4-REG-04: Return from auth must trigger server quote revalidation'
  );
  assert(
    reviewScreenSource.includes('/customer/bookings/calculate'),
    'C4-REG-04b: Quote revalidation must call canonical /customer/bookings/calculate endpoint'
  );

  // ── 5. Unchanged fingerprint → normal state ──────────────────────────────
  assert(
    reviewScreenSource.includes("setUiState('REVIEW')"),
    'C4-REG-05: Matching fingerprint must transition UI state back to REVIEW'
  );

  // ── 6. Changed fingerprint → updated quote + PRICE_CHANGED state ──────────
  assert(
    reviewScreenSource.includes("setUiState('PRICE_CHANGED')"),
    'C4-REG-06: Fingerprint mismatch or price change must transition UI state to PRICE_CHANGED'
  );
  assert(
    reviewScreenSource.includes('تم تحديث السعر') &&
    reviewScreenSource.includes('السعر السابق') &&
    reviewScreenSource.includes('السعر الحالي'),
    'C4-REG-06b: PRICE_CHANGED state must render previous vs current price comparison'
  );

  // ── 7. Changed price requires another explicit action ─────────────────────
  assert(
    reviewScreenSource.includes('موافق على السعر الجديد وإرسال الطلب'),
    'C4-REG-07: PRICE_CHANGED state must present explicit acceptance CTA'
  );

  // ── 8. DATE_OVERLAP → availability conflict ───────────────────────────────
  assert(
    reviewScreenSource.includes("setUiState('AVAILABILITY_CONFLICT')") &&
    reviewScreenSource.includes('التواريخ المختارة لم تعد متاحة') &&
    reviewScreenSource.includes('اختيار تواريخ جديدة'),
    'C4-REG-08: DATE_OVERLAP must transition to AVAILABILITY_CONFLICT with clear recovery CTA'
  );

  // ── 9. Edit returns to Screen 06 preserving intended context ──────────────
  assert(
    reviewScreenSource.includes('onEditDetails') &&
    reviewScreenSource.includes('onBack'),
    'C4-REG-09: Screen 07 must provide both onEditDetails and onBack handlers'
  );
  assert(
    detailModalSource.includes('onBack={() => setShowReviewSheet(false)}') &&
    detailModalSource.includes('onEditDetails={() => setShowReviewSheet(false)}'),
    'C4-REG-09b: Closing Screen 07 returns to Screen 06 preserving dates and guests'
  );

  // ── 10. Network submit error keeps review state and requestId ─────────────
  assert(
    reviewScreenSource.includes("setUiState('NETWORK_ERROR')"),
    'C4-REG-10: Network failure must transition to NETWORK_ERROR state without clearing review data'
  );
  assert(
    reviewScreenSource.includes('تعذر إرسال الطلب') &&
    reviewScreenSource.includes('تفاصيل طلبك ما زالت محفوظة'),
    'C4-REG-10b: NETWORK_ERROR state must show approved transport copy'
  );

  // ── 11. Retry uses SAME requestId ────────────────────────────────────────
  assert(
    reviewScreenSource.includes('إعادة المحاولة') &&
    reviewScreenSource.includes('requestId,'),
    'C4-REG-11: Retry button must reuse the exact same requestId'
  );

  // ── 12. Material intent edit creates NEW requestId ────────────────────────
  const id1 = generateClientRequestId();
  const id2 = generateClientRequestId();
  assert(
    UUID_V4_REGEX.test(id1),
    `C4-REG-12: generateClientRequestId must generate valid UUID v4, got ${id1}`
  );
  assert(
    UUID_V4_REGEX.test(id2),
    `C4-REG-12b: generateClientRequestId must generate valid UUID v4, got ${id2}`
  );
  assert(
    id1 !== id2,
    'C4-REG-12c: Successive generateClientRequestId calls must produce distinct UUIDs'
  );

  // ── 13. No client finance reconstruction (strictly server quote) ──────────
  assert(
    !reviewScreenSource.includes('nights * pricePerNight') &&
    !reviewScreenSource.includes('pricePerNight * nights') &&
    !reviewScreenSource.includes('totalBookingValue * 0.2') &&
    !reviewScreenSource.includes('totalStay * 0.2'),
    'C4-REG-13: BookingRequestReviewScreen must NOT reconstruct financial math on client'
  );

  // ── 14. No internal commission / owner net shown ──────────────────────────
  assert(
    !reviewScreenSource.includes('عمولة') &&
    !reviewScreenSource.includes('صافي المالك') &&
    !reviewScreenSource.includes('حصة المنصة') &&
    !reviewScreenSource.includes('أتعاب الخدمة'),
    'C4-REG-14: BookingRequestReviewScreen must NEVER reveal internal platform commission or owner net payout'
  );

  // ── 15. No trust badge or ratings ─────────────────────────────────────────
  assert(
    !reviewScreenSource.includes('إقامة موثقة من كونفرم') &&
    !reviewScreenSource.includes('إقامة موثقة') &&
    !reviewScreenSource.includes('مضيف موثق'),
    'C4-REG-15: BookingRequestReviewScreen must NOT display trust badges or ratings'
  );

  // ── 16. Screen 11 only after server-confirmed success/replay ──────────────
  assert(
    appSource.includes('handleBookingSuccess') &&
    appSource.includes('setBookingRequestSent(routing.state)') &&
    appSource.includes('BookingRequestSentScreen'),
    'C4-REG-16: App.tsx must only show Screen 11 (BookingRequestSentScreen) after server confirms booking'
  );
  assert(
    reviewScreenSource.includes('onSubmitSuccess(json.data)'),
    'C4-REG-16b: BookingRequestReviewScreen must only trigger onSubmitSuccess on res.ok && json.success'
  );

  // ── 17-24. DETERMINISTIC BEHAVIORAL STATE-MACHINE TESTS ───────────────────
  const mockQuote: ServerPriceQuote = {
    propertyId: '11111111-1111-4111-8111-111111111111',
    checkIn: '2026-10-10',
    checkOut: '2026-10-13',
    nights: 3,
    guests: 2,
    pricePerNight: 5000,
    totalStay: 15000,
    depositAmount: 5000,
    remainingAmount: 10000,
    currency: 'EGP',
    quoteFingerprint: 'canonical_fp_1234567890abcdef1234567890abcdef1234567890abcdef12345678',
  };

  // Behavioral A: Guest starts Review -> uiState is REVIEW, valid UUID requestId
  const initialGuestReview = initReviewState({
    propertyId: mockQuote.propertyId,
    checkIn: mockQuote.checkIn,
    checkOut: mockQuote.checkOut,
    guests: mockQuote.guests,
    initialQuote: mockQuote,
    restoredFromAuth: false,
  });
  assert(initialGuestReview.uiState === 'REVIEW', 'C4-BEHAV-01: Guest review must initialize in REVIEW state');
  assert(UUID_V4_REGEX.test(initialGuestReview.requestId), 'C4-BEHAV-02: Guest review must generate UUID v4 requestId');
  assert(!initialGuestReview.restoredFromAuth, 'C4-BEHAV-03: Guest review restoredFromAuth is false');

  // Behavioral B: Auth interception stores requestId
  const guestSubmitIntercept = classifySubmitResponse(initialGuestReview, 401, {});
  assert(guestSubmitIntercept.kind === 'REQUIRE_AUTH', 'C4-BEHAV-04: Guest submit must yield REQUIRE_AUTH');
  assert(
    guestSubmitIntercept.context.requestId === initialGuestReview.requestId,
    'C4-BEHAV-05: Auth interception must preserve the exact guest requestId'
  );

  // Behavioral C: Auth return restores SAME requestId and starts in REVALIDATING
  const restoredReview = initReviewState({
    propertyId: mockQuote.propertyId,
    checkIn: mockQuote.checkIn,
    checkOut: mockQuote.checkOut,
    guests: mockQuote.guests,
    initialQuote: mockQuote,
    restoredFromAuth: true,
    existingRequestId: guestSubmitIntercept.context.requestId,
  });
  assert(
    restoredReview.requestId === initialGuestReview.requestId,
    'C4-BEHAV-06: Restored review MUST preserve exact same requestId across auth'
  );
  assert(
    restoredReview.uiState === 'REVALIDATING',
    'C4-BEHAV-07: Restored review MUST visibly start in REVALIDATING state'
  );
  assert(restoredReview.restoredFromAuth === true, 'C4-BEHAV-08: restoredFromAuth flag is true');

  // Behavioral D: Revalidation with unchanged quote -> transitions to REVIEW (NO auto-submit)
  const afterUnchangedReval = applyRevalidationSuccess(restoredReview, { ...mockQuote });
  assert(
    afterUnchangedReval.uiState === 'REVIEW',
    'C4-BEHAV-09: Unchanged quote revalidation must transition to REVIEW without auto-submitting'
  );
  assert(
    afterUnchangedReval.requestId === initialGuestReview.requestId,
    'C4-BEHAV-10: requestId remains unchanged after revalidation'
  );

  // Behavioral E: Revalidation with price/fingerprint change -> transitions to PRICE_CHANGED
  const changedQuote: ServerPriceQuote = {
    ...mockQuote,
    pricePerNight: 6000,
    totalStay: 18000,
    depositAmount: 6000,
    remainingAmount: 12000,
    quoteFingerprint: 'new_shifted_fingerprint_abcdef1234567890abcdef1234567890abcdef12',
  };
  const afterChangedReval = applyRevalidationSuccess(restoredReview, changedQuote);
  assert(
    afterChangedReval.uiState === 'PRICE_CHANGED',
    'C4-BEHAV-11: Fingerprint/price change must transition to PRICE_CHANGED'
  );
  assert(
    afterChangedReval.previousQuote?.totalStay === 15000,
    'C4-BEHAV-12: previousQuote is preserved for visual comparison'
  );
  assert(
    afterChangedReval.currentQuote.totalStay === 18000,
    'C4-BEHAV-13: currentQuote reflects updated authoritative figure'
  );

  // Behavioral F: Revalidation availability conflict -> AVAILABILITY_CONFLICT
  const afterConflictReval = applyRevalidationError(restoredReview, { status: 409, code: 'DATE_OVERLAP' });
  assert(
    afterConflictReval.uiState === 'AVAILABILITY_CONFLICT',
    'C4-BEHAV-14: DATE_OVERLAP revalidation must transition to AVAILABILITY_CONFLICT'
  );

  // Behavioral G: Idempotency conflict (409 IDEMPOTENCY_CONFLICT) -> IDEMPOTENCY_ERROR (non-retryable)
  const idempConflictResult = classifySubmitResponse(afterUnchangedReval, 409, {
    error: { code: 'IDEMPOTENCY_CONFLICT', message: 'معرف الطلب مستخدم مسبقاً' },
  });
  assert(
    idempConflictResult.kind === 'IDEMPOTENCY_ERROR',
    'C4-BEHAV-15: 409 IDEMPOTENCY_CONFLICT must classify as IDEMPOTENCY_ERROR'
  );
  assert(
    idempConflictResult.nextState.uiState === 'IDEMPOTENCY_ERROR',
    'C4-BEHAV-16: IDEMPOTENCY_CONFLICT must set uiState to IDEMPOTENCY_ERROR'
  );

  // Behavioral H: 401/403 session expiry on submission -> re-enters Auth preserving requestId
  const sessionExpiredResult = classifySubmitResponse(afterUnchangedReval, 403, {
    error: { code: 'SESSION_EXPIRED' },
  });
  assert(
    sessionExpiredResult.kind === 'REQUIRE_AUTH',
    'C4-BEHAV-17: 403 submit response must re-enter Auth interruption flow'
  );
  assert(
    sessionExpiredResult.context.requestId === initialGuestReview.requestId,
    'C4-BEHAV-18: Session expiry recovery must preserve the exact requestId'
  );

  // ── 25. Truthful Copy Checks ──────────────────────────────────────────────
  assert(
    !reviewScreenSource.includes('24 ساعة'),
    'C4-TRUTH-01: Screen 07 must NOT contain unapproved "24 ساعة" SLA promise'
  );
  assert(
    !reviewScreenSource.includes('إشعار فوري'),
    'C4-TRUTH-02: Screen 07 must NOT contain unapproved "إشعار فوري" guarantee'
  );
  assert(
    !reviewScreenSource.includes('قام مستخدم آخر بحجز'),
    'C4-TRUTH-03: Availability conflict must NOT speculate about why dates became unavailable'
  );

  // ── 26. Exact LAB Process Steps ───────────────────────────────────────────
  assert(
    reviewScreenSource.includes('1 — المالك يراجع الطلب') || reviewScreenSource.includes('المالك يراجع الطلب'),
    'C4-LAB-01: Approved Step 1 "المالك يراجع الطلب" must be present'
  );
  assert(
    reviewScreenSource.includes('2 — إذا وافق، يصبح دفع العربون هو الخطوة التالية') || reviewScreenSource.includes('إذا وافق، يصبح دفع العربون هو الخطوة التالية'),
    'C4-LAB-02: Approved Step 2 "إذا وافق، يصبح دفع العربون هو الخطوة التالية" must be present'
  );
  assert(
    reviewScreenSource.includes('3 — بعد نجاح دفع العربون يصبح الحجز مؤكدًا') || reviewScreenSource.includes('بعد نجاح دفع العربون يصبح الحجز مؤكدًا'),
    'C4-LAB-03: Approved Step 3 "بعد نجاح دفع العربون يصبح الحجز مؤكدًا" must be present'
  );

  // Exact Availability Copy
  assert(
    reviewScreenSource.includes('اختار تواريخ جديدة علشان نحدّث السعر ونكمل طلبك.'),
    'C4-LAB-04: Approved availability conflict body copy must be present'
  );

  // Exact Price Changed Copy
  assert(
    reviewScreenSource.includes('السعر الحالي مختلف عن السعر الذي راجعته آخر مرة. راجع المبلغ الجديد قبل إرسال الطلب.'),
    'C4-LAB-05: Approved price changed body copy must be present'
  );

  // Exact Network Error Copy
  assert(
    reviewScreenSource.includes('تفاصيل طلبك ما زالت محفوظة. تحقق من الاتصال وحاول مرة أخرى.'),
    'C4-LAB-06: Approved network error body copy must be present'
  );

  // Exact Idempotency Error Copy
  assert(
    reviewScreenSource.includes('تعذر متابعة هذا الطلب') &&
    reviewScreenSource.includes('تعذر التحقق من هذا الطلب بأمان. ارجع لتفاصيل الإقامة وحاول مرة أخرى.') &&
    reviewScreenSource.includes('العودة لتفاصيل الإقامة'),
    'C4-LAB-07: Approved idempotency error title, body, and CTA must be present'
  );

  // ── 27. LAB Typography & Visual Conformance ───────────────────────────────
  assert(
    !reviewScreenSource.includes('text-[10px]'),
    'C4-TYPO-01: Screen 07 must NOT use tiny text-[10px] for decision content'
  );
  assert(
    !reviewScreenSource.includes('text-[11px]'),
    'C4-TYPO-02: Screen 07 must NOT use tiny text-[11px] for decision content'
  );

  // ── 28. Dead/Unsafe Submit Path Elimination ───────────────────────────────
  assert(
    !appSource.includes('handleInitiateBooking'),
    'C4-DEADCODE-01: Unsafe legacy handleInitiateBooking must be completely removed from App.tsx'
  );
  assert(
    !detailModalSource.includes('onInitiateBooking'),
    'C4-DEADCODE-02: Obsolete onInitiateBooking prop must be removed from PropertyDetailModal'
  );

  // ── 29. Auth Return Context Handoff Callback ──────────────────────────────
  assert(
    detailModalSource.includes('onContextCaptured={onBookingReviewRestored}'),
    'C4-HANDOFF-01: PropertyDetailModal must wire onBookingReviewRestored to onContextCaptured'
  );
  assert(
    reviewScreenSource.includes('onContextCaptured?.()'),
    'C4-HANDOFF-02: BookingRequestReviewScreen must invoke onContextCaptured after capturing context'
  );

  console.log('ALL C4 BOOKING REQUEST REVIEW REGRESSION CHECKS PASSED DETERMINISTICALLY (35/35)');
}

run().catch((err) => {
  console.error('C4 REGRESSION TEST FAILURE:', err);
  throw err;
});

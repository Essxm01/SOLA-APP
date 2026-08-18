# SOLA — PHASE 2 EXECUTION TASK BOARD
**Customer App Discovery + UX Architecture + Existing Code Audit + Mobile App Correction**

---

## 0. AUTHORITATIVE PLATFORM MATRIX
- **Customer App**: **MOBILE APPLICATION** (Mobile-first UX, 375px/390px/430px viewports, persistent mobile bottom nav, white-dominant background, NO dark navy headers or desktop horizontal search bars).
- **Owner App**: **MOBILE APPLICATION** (Mobile-first management dashboard).
- **Admin App**: **WEB APPLICATION ONLY** (Desktop governance and operations portal).

---

## 1. Phase Objective
Replace desktop-style layouts and dark navy headers in Customer App with a **WHITE-DOMINANT, MOBILE-NATIVE VACATION RENTAL APPLICATION**. Enforce public browsing without login, mobile search card, horizontal destination chips (مراسي, رأس الحكمة, سيدي عبد الرحمن, هاسيندا, الساحل الشمالي), mobile property cards, full-screen mobile property details sheet, sticky booking request CTA ("اطلب حجز الوحدة"), guest auth interception with context preservation, and persistent mobile bottom navigation (`استكشف`, `المفضلة`, `حجوزاتي`, `الحساب`).

---

## 2. Locked Visual Identity Rules
1. **Dominant Color**: **WHITE (`#FFFFFF`)** must visually dominate background, navigation surfaces, search cards, and sheets.
2. **Primary Accent**: **`#0059FF` SOLA Blue**.
3. **Secondary Accent**: **`#FFD700` SOLA Summer Yellow** (exact approved brand value only, used for ratings/highlights).
4. **NO Dark Navy Dominant Header**: Eliminate dark navy top headers or page-filling dark backgrounds.
5. **Aesthetic**: Bright, clean, premium, coastal, spacious, comfortable.

---

## 3. PHASE 2C — CUSTOMER MOBILE APP CORRECTION CHECKLIST

- [x] Task 3.1: Lock Customer = Mobile App platform matrix.
- [x] Task 3.2: Remove desktop-first shell and wide horizontal web search bars.
- [x] Task 3.3: Remove dark/navy dominant header surfaces (`glass-header`).
- [x] Task 3.4: Apply white-dominant SOLA visual identity (`#FFFFFF` bg, `#0059FF` blue accent, `#FFD700` yellow).
- [x] Task 3.5: Create mobile app compact white header (`CustomerHeader.tsx`).
- [x] Task 3.6: Create persistent mobile bottom navigation bar (`CustomerBottomNav.tsx`: استكشف, المفضلة, حجوزاتي, الحساب).
- [x] Task 3.7: Redesign mobile Explore/Home ("هتصيف فين؟" greeting + compact mobile search button).
- [x] Task 3.8: Mobile search interaction & bottom sheet / filter modal.
- [x] Task 3.9: Destination discovery cards/chips (مراسي, رأس الحكمة, سيدي عبد الرحمن, هاسيندا, الساحل الشمالي).
- [x] Task 3.10: Mobile property feed with large prominent cover imagery.
- [x] Task 3.11: Mobile property cards (`PropertyCard.tsx`).
- [x] Task 3.12: Full-screen mobile property details screen/sheet with gallery & sticky CTA (`PropertyDetailModal.tsx`).
- [x] Task 3.13: Sticky booking request CTA ("اطلب حجز الوحدة").
- [x] Task 3.14: Guest auth interception (Intercept unauthenticated booking & favorite clicks).
- [x] Task 3.15: Context restoration (Return guest to exact same property & dates post-login).
- [x] Task 3.16: Favorites protected flow.
- [x] Task 3.17: My Bookings mobile screen.
- [x] Task 3.18: Real data verification (Connected to PostgreSQL `propertyDb` & `imageDb`).
- [x] Task 3.19: 375px Visual QA.
- [x] Task 3.20: 390px Visual QA.
- [x] Task 3.21: 430px Visual QA.
- [x] Task 3.22: Live Cloudflare & GitHub Actions CI Verification.

---

## 4. Non-Negotiable Product Rules
1. **Single Account Model**: Tenant/Owner modes.
2. **Property Verification**: Unverified properties are NEVER public.
3. **Property Lifecycle**: `DRAFT` -> `COMPLETE` -> `SUBMIT_REVIEW` -> `UNDER_REVIEW` -> `PUBLISHED` -> `HIDDEN` -> `ARCHIVED`.
4. **Owner Lock**: Owner edits are locked when there is an active/upcoming booking.
5. **Images Policy**: 5-20 images, cover first, moderation required, no contact info/QRs/watermarks/videos.
6. **Unauthenticated Guest Restrictions**: Guests can browse/search/view, but CANNOT book, favorite, pay, or review.
7. **Post-Login Interception**: After login, guest MUST return to same property & selected dates/guests.
8. **Financial Invariants**: Deposit = 1 night; Commission = 20% of deposit (NOT 20% of total booking); Available 24h post check-in.
9. **Booking CTA Rule**: Detail page CTA must say **"اطلب حجز الوحدة"** (Request Booking). Deposit payment is ONLY for `APPROVED_PENDING_PAYMENT` state after owner approval!

---

## 5. Final Acceptance Criteria
- 100% White-dominant mobile marketplace application.
- ZERO dark navy top headers or page-filling dark backgrounds.
- Designed for mobile touch viewports (375px / 390px / 430px).
- Native-feeling bottom navigation bar.
- Guest browse without login enabled.
- Real published properties rendered from PostgreSQL.
- Booking CTA says "اطلب حجز الوحدة".
- Login OTP modal triggers on protected action and preserves context.
- Zero build or type errors across all modules.

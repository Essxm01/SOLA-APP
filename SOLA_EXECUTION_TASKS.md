# SOLA — AUTHORITATIVE CUSTOMER JOURNEY BLUEPRINT & EXECUTION TASK BOARD

---

## 0. AUTHORITATIVE PLATFORM MATRIX
- **Customer App**: **MOBILE APPLICATION** (Mobile-first UX, 375px/390px/430px viewports, persistent mobile bottom nav, white-dominant background `#FFFFFF`, `#0059FF` SOLA blue accent, `#FFD700` SOLA summer yellow accent).
- **Owner App**: **MOBILE APPLICATION** (Mobile-first management dashboard).
- **Admin App**: **WEB APPLICATION ONLY** (Desktop governance and operations portal).

---

## 1. PRODUCT PRINCIPLE & NON-NEGOTIABLE LIFECYCLE

### Human-Centered Customer Journey
`OPEN APP`
➔ `EXPLORE`
➔ `SEARCH`
➔ `RESULTS`
➔ `PROPERTY DETAILS`
➔ `SELECT DATES` (Explicit check-in & check-out selection, min 2 nights)
➔ `SELECT GUESTS` (Respect maxGuests capacity)
➔ `REVIEW PRICE` (Nightly price, stay total, required deposit = 1 night, remaining balance)
➔ `REVIEW BOOKING REQUEST` (Confirmation sheet: "إرسال طلب الحجز")
➔ `AUTHENTICATE IF REQUIRED` (OTP Login preserving context)
➔ `SUBMIT BOOKING REQUEST` (`POST /api/v1/customer/bookings` ➔ `PENDING_OWNER_APPROVAL`)
➔ `WAIT FOR OWNER APPROVAL` ("بانتظار رد المالك")
➔ `OWNER APPROVES` (`APPROVED_PENDING_PAYMENT`)
➔ `PAY ONE-NIGHT DEPOSIT` (Paymob Gateway)
➔ `CONFIRMED`
➔ `STAY`
➔ `COMPLETED`
➔ `REVIEW`

### Critical Rules
1. **NO FAKE / DEFAULT DECISIONS**: Never pre-fill fake dates, fake guest count, or create instant fake bookings. If dates/guests are unselected, guide the user to select them.
2. **PAYMENT AFTER OWNER APPROVAL ONLY**: Detail screen CTA must say **"اطلب حجز الوحدة"** (Request Booking). Deposit payment is ONLY enabled when owner approves (`APPROVED_PENDING_PAYMENT`).
3. **FINANCIAL DISCLOSURE**: Display nightly price, total stay, required 1-night deposit, and remaining balance. NEVER expose 20% SOLA commission or owner wallet internal split.

---

## 2. CUSTOMER JOURNEY UX BLUEPRINT (18 AUTHORITATIVE SCREENS)

### Screen 1: Splash / App Entry
- **Purpose**: Initialize application state and load public published properties.
- **Entry Condition**: User opens Customer App URL/App.
- **Data Required**: Published properties feed from `GET /api/v1/customer/properties/search`.
- **User Actions**: Automatic transition to Explore Home.
- **Validation**: Fallback UI if offline.
- **Exit Path**: Transition to Screen 2.
- **Next Screen**: Explore Home.

### Screen 2: Explore Home
- **Purpose**: Help customer discover coastal vacation rentals in the Egyptian North Coast.
- **Entry Condition**: Default app landing screen.
- **Data Required**: List of published properties, popular coastal destinations.
- **User Actions**: Tap search card, tap destination chip, tap property card, switch bottom tabs.
- **Validation**: Public access enabled (NO login required).
- **Exit Path**: Tap search ➔ Screen 3; Tap property ➔ Screen 5.
- **Next Screen**: Search or Property Details.

### Screen 3: Search
- **Purpose**: Let customer define search criteria (Destination, Dates, Guests, Filters).
- **Entry Condition**: Tapping search card on Explore Home.
- **Data Required**: Search criteria state.
- **User Actions**: Select destination, pick check-in/check-out dates, pick guest count, apply filters.
- **Validation**: Check-out must be after check-in; Guests <= property capacity.
- **Exit Path**: Tap "بحث عن إقامات".
- **Next Screen**: Search Results.

### Screen 4: Search Results
- **Purpose**: Display filtered published properties matching customer criteria.
- **Entry Condition**: Submitting search criteria or destination chip.
- **Data Required**: Filtered array of `PUBLISHED` properties from PostgreSQL.
- **User Actions**: Scroll feed, tap property card, adjust filter.
- **Validation**: Empty state if 0 results; Error state if network fails.
- **Exit Path**: Tap property card.
- **Next Screen**: Property Details.

### Screen 5: Property Details
- **Purpose**: Complete decision screen for a coastal property.
- **Entry Condition**: Tapping property card from Explore or Search Results.
- **Data Required**: Public property DTO (title, address, gallery, amenities, capacity, base price/night, verified host badge).
- **User Actions**: Browse gallery, inspect amenities, pick dates, pick guests, tap "اطلب حجز الوحدة".
- **Validation**: Guide user to select valid dates if unselected.
- **Exit Path**: Tap "اطلب حجز الوحدة" ➔ Screen 8/9; Tap Back ➔ Screen 2/4.
- **Next Screen**: Date Selection / Price Review / Request Review.

### Screen 6: Date Selection (Mobile Calendar UX)
- **Purpose**: Explicitly select check-in and check-out dates.
- **Entry Condition**: Tapping date selector in Property Details.
- **Data Required**: Property availability, minimum stay (2 nights), max stay (30 nights).
- **User Actions**: Pick arrival date, pick departure date.
- **Validation**: Check-out > Check-in, min stay 2 nights, disabled booked dates.
- **Exit Path**: Tap "تأكيد التواريخ".
- **Next Screen**: Property Details (Updated nights & price).

### Screen 7: Guest Selection
- **Purpose**: Explicitly select total guests.
- **Entry Condition**: Tapping guest selector in Property Details.
- **Data Required**: Property `maxGuests` capacity limit.
- **User Actions**: Increment/decrement guest count.
- **Validation**: Guest count <= `maxGuests`.
- **Exit Path**: Tap "تأكيد عدد الأفراد".
- **Next Screen**: Property Details.

### Screen 8: Price Review
- **Purpose**: Display transparent stay price calculation before request submission.
- **Entry Condition**: Dates and guests selected in Property Details.
- **Data Required**: Base price per night, total nights, total booking value, 1-night deposit, remaining balance.
- **User Actions**: Review breakdown, proceed to Request Review.
- **Validation**: 100% accurate HALF_EVEN integer cents math.
- **Exit Path**: Tap "متابعة طلب الحجز".
- **Next Screen**: Booking Request Review.

### Screen 9: Booking Request Review
- **Purpose**: Final intent confirmation screen before sending request to owner.
- **Entry Condition**: Valid dates, guests, and price review.
- **Data Required**: Property summary, dates, nights, guests, total price, 1-night deposit.
- **User Actions**: Tap "إرسال طلب الحجز" (Submit Request) or "تعديل التفاصيل".
- **Validation**: Explains: "سيتم إرسال طلبك إلى المالك للموافقة أولاً. لن يتم خصم العربون قبل موافقة المالك."
- **Exit Path**: Tap "إرسال طلب الحجز" ➔ Screen 10 (if unauth) or Screen 11 (if auth).
- **Next Screen**: OTP Auth or Request Success.

### Screen 10: OTP Auth (Guest Interception)
- **Purpose**: Authenticate unauthenticated guest via phone OTP while preserving booking context.
- **Entry Condition**: Triggering protected action ("إرسال طلب الحجز" or Favorite).
- **Data Required**: Intercepted context (`propertyId`, `checkIn`, `checkOut`, `guests`, intended action).
- **User Actions**: Enter Egyptian phone number, receive OTP, enter 4-digit code.
- **Validation**: Phone format, code correctness.
- **Exit Path**: On success ➔ Return to Screen 9 with preserved context.
- **Next Screen**: Booking Request Review (Context Preserved).

### Screen 11: Request Success ("تم إرسال طلبك للمالك")
- **Purpose**: Inform guest that booking request was sent to owner.
- **Entry Condition**: Successful `POST /api/v1/customer/bookings` submission.
- **Data Required**: Booking ID, booking number, status (`PENDING_OWNER_APPROVAL`), owner response SLA explanation.
- **User Actions**: Tap "متابعة حالة الطلب في حجوزاتي" or "العودة للرئيسية".
- **Validation**: Status = `PENDING_OWNER_APPROVAL`. NO payment CTA displayed.
- **Exit Path**: Tap "متابعة حالة الطلب" ➔ Screen 12/13.
- **Next Screen**: My Bookings / Booking Details.

### Screen 12: My Bookings
- **Purpose**: Customer bookings management grouped by lifecycle status.
- **Entry Condition**: Tapping "حجوزاتي" in bottom navigation.
- **Data Required**: List of customer bookings (Pending, Approved/Payment Required, Confirmed, Completed, Cancelled/Rejected).
- **User Actions**: Filter by tab/status, tap booking card to open details.
- **Validation**: IDOR scoped to logged in customer identity.
- **Exit Path**: Tap booking card ➔ Screen 13/14/15/16.
- **Next Screen**: Booking Details (Lifecycle-Specific).

### Screen 13: Booking Details — Pending Owner Approval
- **Purpose**: View status of booking request awaiting owner review.
- **Entry Condition**: Tapping pending booking in My Bookings.
- **Data Required**: Booking details, status = `PENDING_OWNER_APPROVAL`.
- **User Actions**: View request summary, cancel request if within window.
- **Validation**: Displays "⏳ طلبك قيد المراجعة لدى المالك". NO payment CTA.
- **Exit Path**: Back to My Bookings.
- **Next Screen**: My Bookings.

### Screen 14: Booking Details — Payment Required (Approved)
- **Purpose**: Pay 1-night deposit for booking approved by owner.
- **Entry Condition**: Owner accepts request; status = `APPROVED_PENDING_PAYMENT`.
- **Data Required**: Booking details, 1-night deposit amount, payment deadline.
- **User Actions**: Tap "ادفع العربون واضمن حجزك الان" ➔ Open Paymob Checkout.
- **Validation**: Authoritative payment status check (`GET /payment-status`).
- **Exit Path**: Payment success ➔ Screen 15.
- **Next Screen**: Booking Details — Confirmed.

### Screen 15: Booking Details — Confirmed
- **Purpose**: View arrival instructions and check-in details for confirmed stay.
- **Entry Condition**: Deposit payment success; status = `CONFIRMED`.
- **Data Required**: Property address, check-in time (2:00 PM), remaining cash amount for owner.
- **User Actions**: View check-in rules, contact support.
- **Validation**: Displays "🎉 تم تأكيد حجزك رسمياً".
- **Exit Path**: Back to My Bookings.
- **Next Screen**: My Bookings.

### Screen 16: Booking Details — Rejected / Expired
- **Purpose**: Explain owner rejection or timeout and guide customer to alternatives.
- **Entry Condition**: Status = `REJECTED` or `EXPIRED`.
- **Data Required**: Status explanation, rejection reason if provided.
- **User Actions**: Tap "استكشف وحدات مشابهة".
- **Exit Path**: Tap "استكشف وحدات مشابهة" ➔ Screen 2.
- **Next Screen**: Explore Home.

### Screen 17: Favorites
- **Purpose**: View saved favorite coastal properties.
- **Entry Condition**: Tapping "المفضلة" in bottom navigation.
- **Data Required**: Array of favorited property IDs.
- **User Actions**: Tap property card, remove from favorites.
- **Validation**: Protected tab (requires OTP login).
- **Exit Path**: Tap property card ➔ Screen 5.
- **Next Screen**: Property Details.

### Screen 18: Account
- **Purpose**: User account identity and session management.
- **Entry Condition**: Tapping "الحساب" in bottom navigation.
- **Data Required**: User phone number, verification badge, booking count.
- **User Actions**: View phone identity, log out.
- **Validation**: Shows verification badge.
- **Exit Path**: Tap logout ➔ Reset session ➔ Screen 2.
- **Next Screen**: Explore Home.

---

## 3. ORDERED IMPLEMENTATION BATCHES

- [x] **BATCH 1: Explore + Search + Results** (`CustomerHeader.tsx`, `CoastalSearchBar.tsx`, `StateViews.tsx`)
- [x] **BATCH 2: Property Details + Mobile Calendar + Guests** (`PropertyCard.tsx`, `PropertyDetailModal.tsx`, `AvailabilityCalendar.tsx` [NEW], `GuestSelector.tsx` [NEW])
- [x] **BATCH 3: Price Calculation + Booking Request Review** (`PropertyDetailModal.tsx` — server-authoritative `POST /api/v1/customer/bookings/calculate` wired; BookingReviewSheet opens ONLY after server quote; loading/error/retry states)
- [x] **BATCH 4: Auth Interception + Context Preservation** (`CustomerAuthModal.tsx`, `App.tsx`)
- [x] **BATCH 5: Booking Request Submission + Success** (`App.tsx`, `BookingSuccessModal.tsx`)
- [x] **BATCH 6: My Bookings + Booking Details Lifecycle** (`MyBookingsView.tsx`, `BookingDetailView.tsx`)
- [x] **BATCH 7: Owner Integration** (Owner App notification & accept/reject review integration)
- [x] **BATCH 8: Payment-after-approval Flow** (`CustomerCheckoutModal.tsx` enabled ONLY for `APPROVED_PENDING_PAYMENT`)
- [x] **BATCH 9: Favorites + Account** (`App.tsx`)
- [x] **BATCH 10: UX Hardening + Mobile QA** (375px/390px/430px visual verification & zero lint/type errors)

---

## 4. NON-NEGOTIABLE PRODUCT RULES
1. **Single Account Model**: Tenant/Owner modes.
2. **Property Verification**: Unverified properties are NEVER public.
3. **Property Lifecycle**: `DRAFT` -> `COMPLETE` -> `SUBMIT_REVIEW` -> `UNDER_REVIEW` -> `PUBLISHED` -> `HIDDEN` -> `ARCHIVED`.
4. **Owner Lock**: Owner edits are locked when there is an active/upcoming booking.
5. **Images Policy**: 5-20 images, cover first, moderation required, no contact info/QRs/watermarks/videos.
6. **Unauthenticated Guest Restrictions**: Guests can browse/search/view, but CANNOT book, favorite, pay, or review.
7. **Post-Login Interception**: After login, guest MUST return to same property & selected dates/guests.
8. **Financial Invariants**: Deposit = 1 night; Commission = 20% of deposit (NOT 20% of total booking); Available 24h post check-in.
9. **Booking Request Rule**: Booking CTA says **"اطلب حجز الوحدة"**. Deposit payment is ONLY required AFTER owner approval (`APPROVED_PENDING_PAYMENT`).

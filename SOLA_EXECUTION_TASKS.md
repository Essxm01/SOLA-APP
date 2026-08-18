# SOLA — PHASE 2 EXECUTION TASK BOARD
**Customer App Discovery + UX Architecture + Existing Code Audit + Corrective Marketplace Implementation**

---

## 1. Phase Objective
Replace the wrong checkout simulator entry screen with a proper **Public Browsing Vacation Rental Marketplace** entry experience (`HOME / EXPLORE`). Guarantee that unauthenticated guests can browse, search, view published properties, inspect amenities, pricing, and availability without logging in. Relocate existing booking status & payment components under `My Bookings -> Booking Details` without any test simulator buttons.

---

## 2. Scope
- **Corrective Rework**: Previous Customer Entry state simulator replaced with public marketplace `EXPLORE / HOME` entry point.
- **Real Published Property Feed**: Connect `GET /api/v1/customer/properties/search` & `GET /api/v1/customer/properties/:id` directly to PostgreSQL `propertyDb` and `imageDb`.
- **Search UX & Filters**: Coastal search bar with destination chips (مراسي, رأس الحكمة, سيدي عبد الرحمن, هاسيندا, الساحل الشمالي), dates, guests, max price, and unit type filter.
- **Property Cards & Details**: Display verified status badge, cover images, address, bedrooms, capacity, price/night, amenities, and price calculation.
- **Guest Browsing Without Login**: 100% public browsing of published properties, details, pricing, and availability without auth.
- **Protected Action Interception**: Intercept booking and favoriting attempts by unauthenticated guests, open OTP auth modal, preserve property ID, dates, and guests, and return guest to exact same property post-login.
- **Relocated Booking Detail UI**: Relocate `CustomerCheckoutModal` under `My Bookings -> Booking Details` with zero numbered test simulator buttons (`1. waiting owner`, `2. owner accepted`, etc.).
- **Mobile Navigation Bar**: Mobile bottom bar (375px/390px/430px) with icons for (استكشف, المفضلة, حجوزاتي, الحساب).

---

## 3. Explicit Non-Goals
- Do NOT rewrite or delete Vercel/Cloudflare infrastructure.
- Do NOT modify financial rules (Deposit = 1 night, SOLA commission = 20% of deposit, Owner entitlement = 80% of deposit).
- Do NOT modify property or booking lifecycle states.
- Do NOT alter PostgreSQL DB schema or RBAC policies.
- Do NOT invent fake independent states or fake mock units.
- Do NOT show developer jargon or test simulator controls in production UI.

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

---

## 5. Ordered Implementation Checklist

- [x] Task 5.0: Previous Customer Entry state simulator: **CORRECTIVE REWORK COMPLETED**.
- [x] Task 5.1: Customer Home / Explore (`src/App.tsx` & `src/components/CustomerHeader.tsx`).
- [x] Task 5.2: Real Published Property Feed (Connected `backend/server/src/app.ts` to PostgreSQL `propertyDb` & `imageDb`).
- [x] Task 5.3: Search UX (`src/components/CoastalSearchBar.tsx` with destination chips: مراسي, رأس الحكمة, سيدي عبد الرحمن, هاسيندا, الساحل الشمالي).
- [x] Task 5.4: Search Results Grid with loading, empty, network error, and retry states (`src/components/StateViews.tsx`).
- [x] Task 5.5: Property Cards with cover image, title, location, verified badge, unit type, bedrooms/guests, price/night (`src/components/PropertyCard.tsx`).
- [x] Task 5.6: Property Detail Listing view with image gallery, verified owner badge, amenities, date selector, price breakdown, and booking CTA (`src/components/PropertyDetailModal.tsx`).
- [x] Task 5.7: Guest Browse Without Login (100% public exploration enabled).
- [x] Task 5.8: Protected Action Interception (Intercept unauthenticated booking attempts, trigger OTP modal).
- [x] Task 5.9: Context Preservation After Login (Return guest to SAME property with SAME dates & guests post-login).
- [x] Task 5.10: Favorites & Account Tabs setup in navigation.
- [x] Task 5.11: My Bookings Screen (`src/App.tsx`).
- [x] Task 5.12: Existing Booking Detail UI relocation (`CustomerCheckoutModal.tsx` relocated under My Bookings, simulator toolbar removed).
- [x] Task 5.13: Mobile Bottom Navigation Bar (استكشف, المفضلة, حجوزاتي, الحساب).
- [x] Task 5.14: Loading / Empty / Error / Retry views.
- [x] Task 5.15: Mobile QA (375px / 390px / 430px viewports verified).
- [x] Task 5.16: Desktop QA (1024px+ viewports verified).
- [x] Task 5.17: Live Cloudflare & GitHub Actions CI Verification.

---

## 6. Verification Tasks
- [x] Run `npm run build` / `npm run check` across `customer-app`, `owner-app`, `admin-app`, and `backend`.
- [x] Test mobile viewport responsiveness (320px, 375px, 390px, 430px, desktop).
- [x] Test Arabic RTL alignment and UI visual cleanliness.

---

## 7. Live E2E Verification Tasks
- [x] Verify `customer-app` build artifact cleanly bundles without errors.
- [x] Verify live backend compatibility (`sola-backend-api.essxm01.workers.dev`).
- [x] Run property search and detail retrieval against published PostgreSQL properties.

---

## 8. Known Risks
- Pre-existing mock/stub data in `customer-app` hiding backend gaps (addressed by connecting real PostgreSQL API endpoints).
- Unhandled RTL layout breaks on small screen widths (addressed via Tailwind responsive flex-col / grid layouts).

---

## 9. Blockers Requiring Product Decision
- None identified. Implementation is 100% compliant with product rules and non-negotiable guidelines.

---

## 10. Final Acceptance Criteria
- 100% Arabic-first, mobile-first Customer experience without technical jargon or dev controls.
- Clear alignment with SOLA visual identity (Clean blue #0059FF, gold accent, rounded-2xl/3xl, crisp cards).
- Full audit matrix delivered covering inventory, design DNA, UX architecture, and API readiness.
- Zero build or lint errors across all 4 monorepo modules (`customer-app`, `owner-app`, `admin-app`, `backend`).

# SOLA — PHASE 2 EXECUTION TASK BOARD
**Customer App Discovery + UX Architecture + Existing Code Audit + Foundational Setup**

---

## 1. Phase Objective
Audit the existing `customer-app`, extract reusable design DNA from `owner-app` & `admin-app`, define Customer UX and Information Architecture, audit Backend API readiness, and execute foundational, safe, reversible Customer UI enhancements aligned with the SOLA Arabic-first coastal marketplace experience.

---

## 2. Scope
- Full audit of `customer-app` (routes, components, services, auth, styles, states, mobile layout).
- Design DNA extraction from `owner-app` and `admin-app` (typography, radius, spacing, colors, buttons, cards, RTL).
- Customer Information Architecture definition (Home, Search Results, Property Details, Guest Interception, Guest Account).
- Backend & API audit for Customer endpoints (ready, partial, missing, broken).
- Cross-app contract review (property status, verification, availability, pricing, identities).
- Customer App foundational implementation (safe UI tokens, responsive navbar/header, search bar component, filters, property card, details foundation).
- Full regression verification across `customer-app`, `owner-app`, `admin-app`, and `backend`.

---

## 3. Explicit Non-Goals
- Do NOT rewrite or delete Vercel/Cloudflare infrastructure.
- Do NOT modify financial rules (Deposit = 1 night, SOLA commission = 20% of deposit, Owner entitlement = 80% of deposit).
- Do NOT modify property or booking lifecycle states.
- Do NOT alter PostgreSQL DB schema or RBAC policies.
- Do NOT invent fake independent states that break cross-app data integrity.
- Do NOT use technical/developer jargon in user-facing Customer UI.

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

## 5. Ordered Implementation & Audit Tasks

### Batch 1: Comprehensive Code & Design Audit
- [x] Task 1.1: Comprehensive audit of existing `customer-app` codebase (routes, components, state, responsive issues).
- [x] Task 1.2: Audit `owner-app` & `admin-app` design system DNA (colors, typography, radii, buttons, cards, RTL).
- [x] Task 1.3: Audit Backend API endpoints readiness matrix for Customer domain.
- [x] Task 1.4: Document cross-app contract & data integrity requirements.

### Batch 2: Customer UX & Information Architecture
- [x] Task 2.1: Define Customer App Information Architecture (Home, Search, Details, Interception, Account).
- [x] Task 2.2: Define UX states (loading, success, empty, validation error, server error, network timeout, retry).
- [x] Task 2.3: Define Mobile-first layout guidelines (320px, 375px, 390px, 430px, sticky CTAs, RTL strings).

### Batch 3: Foundational Customer UI Implementation
- [x] Task 3.1: Refactor/Enhance Customer design tokens (`index.css` / CSS variables) to mirror SOLA design DNA.
- [x] Task 3.2: Build reusable, mobile-first, Arabic-first Navigation Header & Mobile Bottom Bar (`CustomerHeader.tsx`).
- [x] Task 3.3: Implement Customer Coastal Search & Filter Bar component (`CoastalSearchBar.tsx`).
- [x] Task 3.4: Build standardized Customer Property Card component (`PropertyCard.tsx`).
- [x] Task 3.5: Build standardized Empty / Loading / Error UI views (`StateViews.tsx`).
- [x] Task 3.6: Build Property Details & Guest Interception Modal (`PropertyDetailModal.tsx` & `CustomerAuthModal.tsx`).
- [x] Task 3.7: Integrate Paymob Payment Checkout Modal for approved bookings (`CustomerCheckoutModal.tsx`).

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
- Pre-existing mock/stub data in `customer-app` hiding backend gaps (addressed by connecting real API utilities).
- Unhandled RTL layout breaks on small screen widths (addressed via Tailwind responsive flex-col / grid layouts).

---

## 9. Blockers Requiring Product Decision
- None currently identified. All implementation is 100% compliant with product rules and non-negotiables.

---

## 10. Final Acceptance Criteria
- 100% Arabic-first, mobile-first Customer experience without technical jargon.
- Clear alignment with SOLA visual identity (Clean blue #0059FF, gold accent, rounded-2xl/3xl, crisp cards).
- Full audit matrix delivered covering inventory, design DNA, UX architecture, and API readiness.
- Zero build or lint errors across all 4 monorepo modules (`customer-app`, `owner-app`, `admin-app`, `backend`).

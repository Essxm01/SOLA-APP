# KONFRM — Customer Phase 5 Master UX

**Status:** Current Customer design-program model  
**Design System baseline:** 2.1.2  
**Purpose:** Keep the current Customer screen architecture and Design Lab intent discoverable in one repository source.  
**Authority boundary:** UX/design contract only. Business, finance, backend and roadmap rules remain governed by their canonical sources.

## Customer product character

The experience should feel like a premium, calm hospitality product that helps the user:

**discover → evaluate → trust → choose dates → understand price → request → wait → pay when eligible → confirmed → communicate → stay**

Customer is browse-first. Authentication happens only when a protected action requires it and must preserve the interrupted context.

## Current primary screen model

01. Splash / App Launch  
02. First-entry Welcome / Guest Entry  
03. Explore / Home  
04. Search & Refine  
05. Search Results  
06. Property Details / Booking Decision  
07. Booking Request Review  
08. Authentication — Phone Entry  
09. OTP Verification  
10. First-time Profile Setup  
11. Booking Request Sent  
12. My Bookings  
13. Booking Details / Stay Hub  
14. Deposit Payment  
15. Favorites  
16. Notification Center  
17. Account Home  
18. Profile / Edit Profile  
19. Settings  
20. Payment History  
21. Help & Support Center  
22. Booking-scoped Chat  
23. Dispute / Evidence  
24. Review / Rating  
25. Terms & Conditions  
26. Privacy Policy

This supersedes older UX numbering that treated Property Detail, Date Selection, Guest Selection and Price Review as separate primary screens.

## Embedded surfaces — not primary screens

- full-screen property gallery;
- amenities expansion;
- availability calendar inside Property Details/Search;
- guest selector;
- server quote block;
- filter and sort sheets;
- booking conflict state;
- OTP resend/error states;
- booking lifecycle variants;
- payment processing/failure states;
- payment-success transition;
- transaction detail sheet;
- cancellation confirmation/result;
- evidence upload;
- review-submitted state.

A native implementation may use internal routes where technically useful, but that must not fragment the user-visible journey without a Founder/Product design decision.

## Global navigation model

Customer top-level destinations (4 tabs):

- استكشف (`Compass`, strokeWidth 2.2)
- المفضلة (`Heart`, strokeWidth 2.2)
- حجوزاتي (`CalendarDays`, strokeWidth 2.2)
- الحساب (`UserRound`, strokeWidth 2.2)

Bottom navigation is fixed to the viewport, safe-area aware, >=48px touch targets, with an active state of Blue icon + Blue label (`#0059FF`) without background bubble/pill/fill.

Chat remains contextual by default rather than a permanent bottom-navigation destination.

Bottom navigation is hidden where a full entity/temporary flow requires focus.

Screen 03 (Explore / Home) header combines the standalone KONFRM mark (`/favicon.svg` with `alt="KONFRM"`) and exactly one account/identity affordance across open space:
- Guest: `UserRoundPlus` icon button opening existing auth modal (`aria-label="تسجيل الدخول أو إنشاء حساب"`); closing auth leaves Explore intact.
- Authenticated: Truthful identity affordance routing to Account (`setActiveTab('ACCOUNT')`) with fallback hierarchy: canonical `avatarUrl` → initials (real canonical `fullName` only) → `UserRound`.
- Notifications: DEFERRED / no Bell icon.
*(Supersedes the interim brand-only Explore header model while preserving browse-first ethos).*

## Core booking journey

Property decision → dates → guests → canonical quote → Booking Request Review → auth if required → exact context restore → submit request → Request Sent → Pending Owner Approval.

Canonical lifecycle:

PENDING_OWNER_APPROVAL → Owner approves → APPROVED_PENDING_PAYMENT → deposit payment later → CONFIRMED.

No payment before Owner approval.

## Screen 06 consolidation rule

Property Details is one coherent long mobile decision screen, not separate Property / Dates / Guests / Price pages.

It contains property media, identity and public truthful location, decision-relevant facts, description, amenities, availability/calendar, date selection, guest selection, server-authoritative quote, booking-process explanation and state-aware sticky CTA.

See C3_PROPERTY_DETAIL_BOOKING_DECISION.md.

## Screen 13 lifecycle rule

Booking Details / Stay Hub is one state-driven screen where possible.

Human-facing states include: قيد المراجعة، بانتظار الدفع، مؤكد، مرفوض، منتهي when canonically applicable, ملغي when policy/result is canonical, and مكتمل.

Do not expose raw backend enums as the primary Customer language.

## Design-program packages

- C1 — Entry shell: 01, 02 + Bottom Navigation
- C2 — Discovery: 03, 04, 05
- C3 — Property Decision: 06
- C4 — Booking Request + Auth: 07–11
- C5 — Booking Management: 12–13
- C6 — Account: 15, 17–21, 25, 26
- C7 — Notifications: 16 when roadmap capability is ready
- C8 — Payment: 14 when roadmap capability is ready
- C9 — Chat: 22 when roadmap capability is ready
- C10 — Post-booking: 23–24 plus approved cancellation flows when rules/capabilities are ready

A visual shell for a future roadmap feature does not mean the feature is complete.

## Current historical progress marker

At the repository baseline used for this sync:

- C1 — closed / merged / live verified.
- C2 — closed / merged / live verified.
- C3 — implementation merged to main through PR #33. This document does not independently assert final Founder visual/live acceptance beyond recorded evidence.

Future status updates should be recorded by the execution/closure evidence system rather than rewriting historical facts silently.

## Customer design rules

- Arabic-first RTL, Cairo.
- White/light-first.
- KONFRM Blue #0059FF.
- Yellow #FFD700 sparingly.
- Real hospitality imagery.
- Strong hierarchy and open surfaces.
- No card soup.
- No fake trust/ratings/scarcity.
- No customer exposure of commission, Owner net or wallet internals.
- Error must not masquerade as empty.
- Authentication preserves interrupted action.
- Required mobile touch target >=44px; frequent controls prefer 48px.
- Primary CTA approximately 52–56px.
- Visual acceptance includes 360×800, 390×844 and 430×932 plus designated physical-device review.

## Unresolved Product rules remain unresolved

Design must not invent booking request expiry, post-approval payment deadline, competing pending-request resolution beyond canonical current behavior, cancellation/refund matrix, no-show policy, remaining-balance method, final operational check-in/out policy, notification event matrix, chat eligibility/retention/attachment policy, review schema, dispute evidence limits/timelines or legal/privacy retention claims.

# Phase 5 — Customer Screen 03 Explore Visual Quality Remediation

TASK_ID: CUSTOMER_EXPLORE_VISUAL_REMEDIATION_01
ROADMAP_PHASE: PHASE_5_CUSTOMER_EXPERIENCE
STAGE: FOUNDER_AUTHORIZED
EXECUTOR: Founder + Bridge + UI/UX Design Lab
AUTHORITATIVE_BASELINE: 2d27553569c7962e62080d7ab471d16ef1c9e435
TARGET_BRANCH: phase5/customer-explore-visual-remediation
C4_SCREEN_07_STATUS: CLOSED / MERGED / MAIN-CI VERIFIED / PRODUCTION VERIFIED / FOUNDER APPROVED (PR #35 @ 2d27553569c7962e62080d7ab471d16ef1c9e435)
ACTIVE_TARGET: Customer Screen 03 — Explore/Home Visual Quality Remediation (EXPLORE_FINAL_REDESIGN_SPEC + EXPLORE_FINAL_POLISH_V2)
NEXT_AFTER_EXPLORE: Screen 08 — Auth Phone (NOT STARTED)
C5_STATUS: NOT STARTED
SEARCH_INTENT_RESET: DEFERRED / UNCHANGED

## Phase 5 / C4 (Screen 07) Closure Summary
- PR #35 merged into main at `2d27553569c7962e62080d7ab471d16ef1c9e435`.
- Screen 07 Booking Request Review and Safety Contract fully verified:
  - Truthful booking request lifecycle (طلب الحجز يُرسل إلى المالك → المالك يراجع الطلب → إذا وافق، يصبح دفع العربون هو الخطوة التالية → بعد نجاح دفع العربون يصبح الحجز مؤكدًا). No Owner-response SLA or duration is approved or stated.
  - Exact financial breakdown from calculation engine with zero client recalculation.
  - Fail-closed quote revalidation and price mismatch handling.
  - Zero payment collection / zero premature booking creation.
  - Founder physical preview passed on Samsung Galaxy A56.
  - All CI and production verification passed.

## Current Task: Customer Screen 03 Explore Visual Quality Remediation
- Implement the Founder/LAB-approved `EXPLORE_FINAL_REDESIGN_SPEC` and `EXPLORE_FINAL_POLISH_V2`.
- Visual + UX quality remediation while strictly preserving C2 functional truth.
- Zero backend, DB, migration, or RPC changes.
- Zero booking/finance/availability rule changes.
- Shared `PropertyCard` anatomy across Explore, Search Results, and Favorites (Title before location, 1.4:1 ratio, compact 13px facts, clean price without redundant labels, independent favorite).
- Explore Header: Standalone KONFRM mark + one control-radius account/identity affordance using canonical radius.control (12px / rounded-xl equivalent) across open space:
  - Guest Explore: Control-radius `UserRoundPlus` button (44px touch target, 40px `rounded-xl` visual surface, opens existing auth modal, accessible label "تسجيل الدخول أو إنشاء حساب").
  - Authenticated Explore: Truthful control-radius identity affordance routing to Account (`setActiveTab('ACCOUNT')`) with 44px touch target and 40px `rounded-xl` visual surface; fallback hierarchy: canonical avatarUrl (12px / rounded-xl) → initials (12px / rounded-xl) → UserRound (12px / rounded-xl).
  - Notifications: DEFERRED / zero Bell icon.
  *(Supersedes the interim brand-only Explore header model).*
- Explore Hero: Headline "هتصيف فين؟", Subtitle: NONE (direct headline → search flow with 16–20px rhythm).
- 4-tab bottom navigation with updated icons (`Compass`, `Heart`, `CalendarDays`, `UserRound`), uniform 2.2 stroke width, and active state blue icon + blue label without bubble/pill background.
- Local Explore state views (skeleton feed, empty state, error state).


## Phase 3 closure verdict

`PHASE_3_LIVE_CLOSED`

The approved Phase 3 same-entity property vertical slice is complete and live-verified.

Live trace property:
`9927b705-7b9d-4f4c-a7cf-903c4a330ae2`

Verified flow:

1. Owner created the disposable QA property.
2. Owner uploaded real media through the standard property media flow.
3. Owner submitted the property for review.
4. Admin queue showed the same property ID.
5. Admin Detail loaded the same canonical property and media.
6. Admin approved it.
7. Canonical persisted state became `PUBLISHED + VERIFIED`.
8. The existing Owner session revalidated the same property without browser reload or re-authentication and showed the published state.
9. Customer Explore returned the same property.
10. Customer Detail fetched the same property ID and rendered canonical description, amenities, images, price, capacity, location, type, and applicable house rules without fabricated fallbacks.

The disposable QA property was archived afterwards through the standard Owner API.

## Phase 3 implementation outcomes

### Task 3.9 — Owner external-state revalidation

Closed.

- Property-scoped revalidation only.
- No broad multi-domain refresh requirement.
- Focus / visibility revalidation supported.
- Revalidation failure remains visible and retryable.
- Out-of-order response protection prevents an older request from overwriting newer canonical state.

### Task 3.11 — Customer canonical Property Detail

Closed.

- `GET /api/v1/customer/properties/:id` is the canonical detail source.
- Required canonical detail payload is validated fail-closed.
- Canonical empty images remain authoritative.
- Location does not fall back to stale Explore data after detail success.
- Canonical capacity drives guest limits.
- Canonical unit/property type, description, amenities, images, and persisted house-rule content are rendered truthfully.
- Loading/error/retry states remain explicit.

## Phase 3 publication evidence

- PR #19 merged into `main`.
- Phase 3 main SHA: `9ef59f64008db16df0386ac92c5d64bfc8c73b58`.
- Main CI run `34007323794`: `completed / success`.
- Owner, Customer, Admin, and Backend validation jobs succeeded.
- Cloudflare Worker deployment step succeeded.
- Live vertical slice result: `PHASE_3_LIVE_PASS`.

## Boundaries preserved

- No database schema change.
- No migration or RPC change.
- No booking, availability, or finance business-rule change.
- No architecture change.
- No broad Phase 4–7 UI redesign was introduced into Phase 3.

---

# Founder Phase 4 Entry Decision — 2026-09-06

The previous next gate was:

`STOP_BEFORE_PHASE_4`

That stop was intentionally waiting for explicit Founder continuation and UI/UX Design Lab / LAP entry.

The Founder has now explicitly resumed the program and authorized Phase 4 entry.

Current gate:

`PHASE_4_ENTRY_AUTHORIZED`

Meaning:

- Phase 4 may begin.
- LAP formally joins the Phase 4–7 design program.
- Bridge remains responsible for protecting architecture/business/finance rules and translating approved design into safe implementation packages.
- R2–R5 from the Pre-Phase-4 remediation plan are **deferred, not closed**.
- Their mandatory return point is after Phase 7 and before Phase 8.
- The canonical deferred closure contract is `tasks/POST_PHASE_7_DEFERRED_CLOSURE.md`.

Do not re-block Phase 4 merely because older remediation text required R5 before Phase 4; the Founder explicitly changed the execution timing while preserving the deferred obligations.

## Immediate next work

1. **Phase 4 UX Test Lane (`PHASE_4_UX_TEST_LANE`):** `LIVE_PROVISIONED_READY`.
   - Complete isolated test lane provisioned for `P4_UX_CUSTOMER`, `P4_UX_OWNER`, and `P4_UX_ADMIN`.
   - Real-behavior fixtures: Property A (Published), Property B (Pending Review in Admin Queue), Availability Block, and Booking Request.
   - Credentials secured locally in Windows Credential Manager (`KONFRM/UXTL/P4/*`); zero secrets in git.
   - Specification and tooling guide: [`tasks/PHASE_4_UX_TEST_LANE.md`](./PHASE_4_UX_TEST_LANE.md).
2. Begin the Phase 4 Unified Design System / UI/UX Design Lab × Bridge kickoff under the approved design operating contract using the active UX Test Lane for auditing and evaluation.

Do not automatically implement new functional/business capabilities discovered by design. Record them as dependencies/deferred opportunities unless the Founder explicitly pulls them forward.

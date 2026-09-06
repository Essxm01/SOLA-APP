# PHASE 3 — Owner → Admin → Renter Vertical Slice Closure

**Status:** APPROVED_FOR_IMPLEMENTATION  
**Approved by Founder:** 2026-09-06  
**Starting product baseline:** `e177736d2ca2ece935eea9e5059cc1e86825dd16`  
**Executor:** Antigravity  
**Scope type:** Bounded frontend integration closure

## Objective

Close the remaining Phase 3 gaps so the SAME canonical property propagates truthfully through:

`Owner → Backend/DB → Admin → Backend/DB → Owner + Customer`

Phase 3 is not a redesign phase. Only close the two proven frontend gaps below, add focused regressions, and prove the complete same-entity flow Live.

## Verified current reality

Tasks 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, and 3.10 are implemented/proven sufficiently for Phase 3 continuation.

Two code gaps remain:

### Task 3.9 — Owner sees Admin-driven approval state

Backend/database behavior is already correct: after Admin approval, `GET /api/v1/owner/properties` returns the same property as `PUBLISHED + VERIFIED` under the existing Owner session.

The Owner frontend can remain stale because `properties` live in `AppContext` memory and are not automatically revalidated after an external Admin mutation. A full browser reload or logout/login is not acceptable Phase 3 evidence.

### Task 3.11 — Customer Details renders canonical property detail

Backend already exposes canonical public detail through:

`GET /api/v1/customer/properties/:id`

The Customer detail DTO includes the search fields plus canonical detail fields such as:

- `description`
- `amenities`
- `bedsCount`
- `areaSqM`
- `houseRules`

Current `customer-app/src/components/PropertyDetailModal.tsx` does not fetch that endpoint. It renders hardcoded description and hardcoded amenities instead. This is fabricated UI truth and breaks same-entity propagation.

## Implementation requirements

### A. Task 3.9 — narrow Owner property revalidation

Implement a narrow revalidation path for Owner properties only.

Preferred behavior:

- refresh canonical Owner properties when entering/returning to the Properties surface and/or when the application regains focus/visibility;
- use the existing Owner property repository/API contract;
- update only the property state needed for this external-state revalidation;
- do not require browser reload, logout/login, or token re-bootstrap;
- do not add continuous polling unless evidence proves the narrower event-driven approach cannot satisfy the flow.

Do **not** use the broad `refreshData()` as the default revalidation mechanism if that unnecessarily fetches bookings, notifications, messaging, disputes, payouts, analytics, wallet, etc. Keep this change property-scoped.

Required truthful behavior:

- successful revalidation replaces stale property state with canonical server state;
- failed revalidation must not fabricate a new status or silently claim success;
- existing property data must not be overwritten by fake/default values;
- Owner authorization remains unchanged.

### B. Task 3.11 — canonical Customer Property Detail

When `PropertyDetailModal` opens for a property ID:

1. fetch `GET /api/v1/customer/properties/:id`;
2. use a dedicated public-detail client shape matching the current backend contract;
3. render canonical returned detail fields instead of hardcoded property content;
4. preserve server-authoritative search/list data only as the opening identity context while detail is loading;
5. no fabricated fallback description or amenities.

At minimum bind truthfully:

- same property ID
- title
- unitType / propertyType
- address / region / resortName
- images
- bedrooms / bathrooms / maxGuests
- basePricePerNight
- description
- amenities
- bedsCount where displayed/applicable
- areaSqM where displayed/applicable
- houseRules where displayed/applicable

### Customer detail states

The modal must have explicit detail states:

- loading
- success
- error

On detail fetch failure:

- show a truthful error/retry state for detail-dependent content;
- do not substitute hardcoded marketing copy or generic amenities as if they belonged to the property;
- do not break existing public availability, quote, favorite, or booking flows unnecessarily.

## TDD / regression requirements

Before implementation, add focused RED regressions proving the two current defects.

Required coverage:

### Owner 3.9

- external canonical property status changes from review state to `PUBLISHED + VERIFIED`;
- property-scoped revalidation updates the active Owner UI state without full browser reload/re-authentication;
- unrelated Owner domains are not required to refresh for this state update;
- failure remains truthful.

### Customer 3.11

- opening Customer Property Detail triggers canonical detail fetch for the selected property ID;
- returned canonical description is rendered;
- returned canonical amenities are rendered;
- hardcoded placeholder description/amenities are absent as property truth;
- same property ID is preserved from Explore selection to Detail response;
- loading and error/retry behavior are covered;
- existing public visibility/privacy rules remain intact.

Run existing relevant property/public/Owner regression suites plus Customer/Owner build/typecheck gates.

## Explicit non-goals

Do not change:

- backend property business rules;
- database schema;
- migrations;
- RPCs;
- Worker DB architecture;
- public visibility rule (`PUBLISHED + VERIFIED`);
- Owner capability/KYC rules;
- booking lifecycle;
- availability rules;
- finance rules;
- notifications architecture;
- broad UI redesign/theme/layout program;
- Phase 4–7 design-system work.

No new dependency unless strictly necessary and justified.

## Historical script

`backend/server/src/scripts/test_m03_vertical_slice.ts` is historical evidence only.

Do not use it as closure authority and do not run it blindly. It contains stale/unsafe assumptions including legacy auth behavior, fake-token fallback, direct PostgreSQL access, destructive cleanup, and incomplete Customer Detail/Owner post-approval proof.

## Implementation workflow

1. Re-read mandatory project context and this contract.
2. Confirm current main and report any drift from the stated starting product baseline.
3. Create one narrow implementation branch.
4. RED tests first.
5. Implement only 3.9 and 3.11.
6. Run focused regressions + required repo gates.
7. Push one PR to `main`.
8. Do not merge or deploy until Bridge exact-SHA review.

If implementation unexpectedly requires architecture/schema/RPC/business-rule changes, STOP and report the exact blocker.

## Exact acceptance before publication

A candidate is implementation-ready only if:

- Task 3.9 regression passes;
- Task 3.11 regression passes;
- no hardcoded Customer property description/amenities remain as property truth;
- Owner property external-state revalidation is property-scoped and truthful;
- existing public property contract/privacy tests pass;
- Owner API/property regressions pass;
- Customer and Owner builds/typechecks pass;
- no unrelated product behavior changes;
- exact-head CI is green and relevant tests actually executed.

## Live closure plan after Bridge merge/deploy

Use safe disposable QA data only.

Trace one SAME property ID through:

1. Owner creates property.
2. Owner uploads real media.
3. Owner submits.
4. Admin queue shows same property.
5. Admin opens same property detail.
6. Admin approves.
7. canonical persisted state is `PUBLISHED + VERIFIED`.
8. existing Owner session sees the same property become published without browser reload/re-authentication.
9. Customer Explore shows the same property.
10. Customer Detail fetches the same property ID and renders the actual canonical description, amenities, images, price, capacity and applicable detail fields.

No fake state, fabricated fields, manual DB patching, or refresh hack counts as evidence.

Only after this Live trace passes may Phase 3 be marked `LIVE_CLOSED`.

## Return format

Return a concise implementation report containing:

- starting main SHA;
- branch;
- PR;
- final candidate SHA;
- exact changed paths;
- RED evidence for 3.9 and 3.11;
- implementation summary;
- tests/gates run and results;
- exact-head CI status;
- confirmation no migration/RPC/business-rule/architecture change;
- any unresolved issue;
- recommended next gate: `BRIDGE_EXACT_SHA_REVIEW`.

Do not claim Phase 3 closed before publication + Live verification.
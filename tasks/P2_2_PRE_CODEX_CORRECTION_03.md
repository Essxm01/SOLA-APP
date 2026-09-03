# P2.2 — Pre-Codex Correction 03

## Mode
BOUNDED_CORRECTION / SINGLE_WRITER / STRICT_TDD

## Authority
- Base main: `198a00ea39083932012f54144f93fb7516204024`
- Starting candidate: `8977e99b255d24564c12c6469776cf04bef0d1a9`
- Branch: `validation/p2-2-rc`
- This correction exists only to close the remaining end-to-end canonical hydration gap found after Correction 02.

## Verified Remaining Defect
`backend/server/src/services/dbRepository.ts::hydrateBooking()` still fabricates plausible Customer booking-property values before the strict P2.2 DTO sees them:

```ts
bedrooms: Number(property.bedrooms) || 0,
bathrooms: Number(property.bathrooms) || 0,
maxGuests: Number(property.maxGuests) || 0,
```

This defeats the Correction 02 DTO guards because missing/malformed canonical capacity can become a legitimate-looking `0` before `toCustomerBookingDetailDto()` validates it. `bedrooms`/`bathrooms` allow genuine zero values, so the DTO cannot distinguish a real zero from a fabricated zero after hydration.

The same hydration block also uses broad truthy/default transforms for canonical detail fields and converts financial values with `Number(...)`; null/undefined/boolean values must never become plausible numeric zero.

## Required Correction

### C3-F1 — Preserve canonical property values through hydration
In `hydrateBooking()` remove fabricated capacity defaults.

For Customer-booking property fields consumed by P2.2 DTOs, preserve the canonical value so the DTO can validate it. In particular:
- `bedrooms`: do not use `|| 0`.
- `bathrooms`: do not use `|| 0`.
- `maxGuests`: do not use `|| 0`.
- Do not introduce replacement defaults such as `?? 0`, `?? 1`, hardcoded taxonomy, or server-time values.

Valid persisted `0` bedrooms/bathrooms must remain `0`; missing/malformed values must remain detectable and cause the Customer route to fail closed.

Preserve valid existing Owner/Admin behavior for valid canonical rows; do not redesign the repository.

### C3-F2 — Do not silently normalize malformed Customer detail fields
Within the same hydration block, avoid converting malformed canonical Customer-detail data into harmless-looking defaults where P2.2 expects validation.

At minimum:
- preserve `description` rather than turning arbitrary falsy values into `''`;
- preserve capacity fields exactly enough for DTO validation;
- do not add new `.filter(Boolean)`, `catch(() => [])`, or empty-object/empty-array compensation in this correction.

Do not broaden scope into Owner/Admin UI changes.

### C3-F3 — Financial hydration must not turn nullish/boolean values into numeric zero
For Customer-facing hydrated financial values (`totalStay`, `depositAmount`, `remainingAmount`, and the corresponding values used to build `financialSummary`), reject or preserve detectably malformed null/undefined/boolean inputs before numeric conversion.

String/number PostgreSQL numeric representations may still be normalized to finite numbers.

Do not change any finance formula:
- deposit = actual first-night price;
- commission = 20% of deposit only;
- Owner net = 80% of deposit;
- remaining = total - deposit;
- commission on remaining = 0.

### C3-F4 — Regression evidence must cover the real hydration layer
Add regression coverage that proves the repository hydration layer itself can no longer hide malformed capacity/finance before the P2.2 DTO boundary.

Preferred: behavioral coverage through the real hydration path.
If the current module shape makes direct behavioral isolation impractical without architectural refactoring, use a narrowly-scoped deterministic source-contract assertion in `p22RenterApiContract.test.ts` that prevents reintroduction of the exact fabricated hydration patterns, together with existing DTO/route fail-closed behavioral tests.

Required assertions include at least:
- no `Number(property.bedrooms) || 0` in canonical booking hydration;
- no `Number(property.bathrooms) || 0`;
- no `Number(property.maxGuests) || 0`;
- a missing bedrooms/bathrooms/maxGuests value remains capable of reaching the strict DTO as missing and causes failure;
- nullish/boolean customer-facing finance cannot become zero-success.

Record RED before implementation.

## Allowed Changed Paths ONLY
- `backend/server/src/services/dbRepository.ts`
- `backend/server/src/tests/p22RenterApiContract.test.ts`

If any other path is required, STOP and report before editing.

## Preserve Completely
- Correction 01 and Correction 02 behavior.
- Migration 028 and Favorites RPC.
- Worker/PostgREST exact matchers/cardinality/identity validation.
- Profile/Account fail-closed behavior.
- Booking create Migration 026 atomic path.
- Customer create response has no `financialSummary` in any form.
- No route-level booking hydration fallback.
- Booking privacy/IDOR.
- Customer canonical Favorites integration.
- Notifications P9.1 / Payment P10 / Chat P12 boundaries.

## Forbidden
- Do not modify Migration 028.
- Do not modify `dbClient.ts`.
- Do not modify Customer App.
- Do not modify CI/package files.
- Do not apply any migration live.
- Do not mutate Supabase/Storage.
- Do not deploy.
- Do not merge or push `main`.
- Do not open a PR.
- Do not force-push.
- Do not call P2.2 CLEAN/CLOSED/final/publication-ready/Codex-ready.

## TDD
1. Add regression assertions first.
2. Run `npm --prefix backend run test:p2-2-renter-api` and capture RED.
3. Apply the minimal two-file correction.
4. Run the complete gate below fresh.

## Required Fresh Verification
```text
npm --prefix backend run check
npm --prefix backend run test:p2-2-renter-api
npm --prefix backend run test:p12-identity-session
npm --prefix backend run test:p1-4-availability
npm --prefix backend run test:p1-4-worker-availability
npm --prefix backend run test:p1-5-atomic-booking
npm --prefix backend run test:p1-6-wallet-ledger
npm --prefix backend run test:p2-1-public-api
npm --prefix backend run test:p13-worker-adapter
npm --prefix customer-app run test:truthful-state
npm --prefix customer-app run build
git diff --check
```

Push only to `validation/p2-2-rc`.

## Required Report
```text
RESULT: P2_2_PRE_CODEX_CORRECTION_03_PASS | BLOCKED
START_SHA:
FINAL_SHA:
BASE_SHA:
CHANGED_PATHS:
RED_EVIDENCE:
CORRECTION_DISPOSITION:
- C3_F1_HYDRATION_NO_CAPACITY_FABRICATION:
- C3_F2_DETAIL_VALUES_PRESERVED_FOR_VALIDATION:
- C3_F3_FINANCE_NULLISH_NOT_ZERO:
- C3_F4_REAL_HYDRATION_REGRESSION:
AUTOMATED_GATES:
LIVE_MUTATIONS: NONE
DEPLOYMENT: NONE
MERGE: NONE
UNRESOLVED:
```

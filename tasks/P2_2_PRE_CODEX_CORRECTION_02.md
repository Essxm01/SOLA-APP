# P2.2 — Pre-Codex Correction 02

Mode: `BOUNDED_CORRECTION / SINGLE_WRITER / STRICT_TDD`

## Immutable references

- Repository: `Essxm01/SOLA-APP`
- Base main SHA: `198a00ea39083932012f54144f93fb7516204024`
- Starting candidate SHA: `1cbc48d283a57e9ccb4920441c6079bdc201a641`
- Candidate branch: `validation/p2-2-rc`
- Prior correction contract SHA: `c4bbd352cbcea96ac4da4635a613cc9d3d8dd332`

## Why this correction exists

Correction 01 fixed several real defects, but independent review found production-code workarounds and remaining fail-closed gaps that must be removed before PR/Codex review.

### C2-F1 — Never mutate the Customer create response to satisfy a legacy test

Current `app.ts` does two forbidden compatibility workarounds after booking persistence:

1. if `createdAt` is absent, it manufactures `created.createdAt = timestamp`;
2. after building `CustomerBookingCreateResponseDto`, it attaches a hidden non-enumerable `financialSummary` using `Object.defineProperty`.

Required correction:

- Remove both behaviors completely.
- `toCustomerBookingCreateResponseDto()` remains the full Customer response authority.
- Missing/malformed canonical `createdAt` must fail closed; never synthesize one at route level.
- The Customer HTTP response object must not contain `financialSummary` in any form — enumerable, non-enumerable, symbol-backed, prototype-backed, or otherwise.
- Keep internal `bookingDb.create()` / Migration 026 financial summary behavior unchanged. Only the Customer response boundary changes.
- If DTO mapping fails after successful persistence, return a truthful 500 malformed-response error; do not convert it to a 400 client validation error.

### C2-F2 — Fix the legacy P1.5 route regression fixture instead of production code

`backend/server/src/tests/p15BookingAtomicPersistence.test.ts` currently stubs `bookingDb.create()` without `createdAt` and asserts the old Customer response `data.financialSummary` shape.

Required correction:

- Update only the route-level P1.5 fixture/assertions necessary to reflect the new P2.2 Customer contract.
- Add a valid canonical `createdAt` to the mocked `bookingDb.create()` result.
- Preserve all internal atomic-persistence and finance invariants:
  - one booking + one financial summary transaction;
  - deposit = first-night price;
  - commission = 20% of deposit;
  - owner net = 80% of deposit;
  - remaining balance unchanged;
  - zero commission on remaining;
  - no compensating delete;
  - availability/manual-block mapping unchanged.
- Move Customer route assertions to the flat safe response fields: `totalStay`, `depositAmount`, `remainingAmount`, `currency`, plus normal booking fields.
- Assert route response has no `financialSummary` property at all.
- Do not weaken repository/RPC internal financial-summary assertions elsewhere in P1.5.

### C2-F3 — Remove Booking Detail compensating/fallback hydration

Current Customer Booking Detail route contains a fallback block that, when `booking.property` or `booking.financialSummary` is missing, performs extra reads and then:

- converts image read failure into `[]` via `.catch(() => [])`;
- uses `.filter(Boolean)` on image data;
- swallows the entire fallback error with `catch {}`.

This violates fail-closed semantics and duplicates the canonical hydrated `bookingDb.getById()` boundary.

Required correction:

- Remove this fallback block entirely.
- Customer Booking Detail must consume the canonical hydrated `bookingDb.getById()` result and map it through the strict Customer DTO.
- Missing/malformed property, finance, or media data must result in truthful 500 `CUSTOMER_BOOKING_DATA_MALFORMED` (or the existing equivalent P2.2 malformed code), never fake empty media or silent compensation.
- Do not add another property/media/finance composition path in the route.
- Update P2.2 route tests to stub a complete canonical hydrated booking when success is expected.
- Add regression: partial booking missing property/financial summary must fail closed and must not trigger compensating repository reads.

### C2-F4 — Remove fabricated Booking Detail capacity defaults

Current `mapCustomerBookingDetailProperty()` manufactures:

- `bedrooms = 0` when missing;
- `bathrooms = 0` when missing;
- `maxGuests = 1` when missing.

Required correction:

- `bedrooms` and `bathrooms` must be explicitly present and valid non-negative integers.
- `maxGuests` must be explicitly present and a positive integer.
- Missing/malformed values throw `MALFORMED_CUSTOMER_BOOKING_PROPERTY_DATA`.
- Keep `description` nullable.
- `amenities`/`houseRules` may follow the already-approved P2.1 public-detail semantics, but malformed supplied values must not be silently filtered into plausible data.
- Do not introduce new defaults for canonical property fields.

### C2-F5 — Make Customer Favorites helper parity match the P2.1 public DTO

Current `validateFavoriteItem()` still manufactures:

- missing/malformed `bedrooms` -> `0`;
- missing/malformed `bathrooms` -> `0`;
- missing/malformed `maxGuests` -> `1`;
- and accepts `basePricePerNight = 0` although the P2.1 public contract requires a positive value.

Required correction:

- Validate Favorites response items with semantics equivalent to the P2.1 `PublicPropertySearchItem` contract.
- `bedrooms`: required non-negative integer.
- `bathrooms`: required non-negative integer.
- `maxGuests`: required positive integer.
- `basePricePerNight`: required finite positive number (`> 0`).
- `currency`: type and runtime value exactly `'EGP'`.
- No fallback `0/0/1` values.
- Preserve strict image validation and requested-property equality checks for add/remove.

## Required RED tests before implementation

Add regressions first and capture actual failing evidence for all of the following:

1. Customer create route response:
   - `financialSummary in data === false`;
   - `Object.getOwnPropertyDescriptor(data, 'financialSummary') === undefined`;
   - JSON serialization contains no nested `financialSummary`;
   - a persisted result missing `createdAt` fails closed instead of receiving server time.
2. P1.5 route fixture uses canonical `createdAt` and verifies the flat Customer response while preserving internal atomic-finance checks.
3. Booking Detail route given partial/malformed hydrated booking returns 500 and does not perform route-level compensating property/finance/media reads.
4. Booking detail DTO rejects missing bedrooms, bathrooms, and maxGuests.
5. Customer Favorites helper rejects missing/malformed bedrooms, bathrooms, maxGuests, and zero basePricePerNight.

## Allowed changed paths — exact maximum set

- `backend/server/src/app.ts`
- `backend/server/src/contracts/customerRenter.ts`
- `backend/server/src/tests/p22RenterApiContract.test.ts`
- `backend/server/src/tests/p15BookingAtomicPersistence.test.ts`
- `customer-app/src/utils/customerFavorites.ts`
- `customer-app/src/utils/customerTruthfulState.test.ts`

If any other path is required, STOP and report before changing it.

Do NOT modify in this correction unless a newly proven blocker forces a stop/report:

- Migration 028
- `dbClient.ts`
- `dbRepository.ts`
- `backend/package.json`
- CI workflow
- `customer-app/src/App.tsx`
- BookingDetailModal
- Owner/Admin

## Preserve already-correct Correction 01 results

Do not regress:

- Migration 028 `SECURITY INVOKER`, `search_path = public, pg_temp`, service-role-only RPC execute;
- no service-role table UPDATE grant;
- `ON CONFLICT DO NOTHING` duplicate strategy;
- Favorite Worker exact matchers and strict response/cardinality/request-identity validation;
- Favorite path UUID validation;
- Account Summary DB failure and malformed deposit fail-closed behavior;
- Customer profile canonical server confirmation;
- stale account metrics invalidation;
- user-visible Favorite write failure;
- Favorites loading/error header truthfulness;
- Booking privacy/IDOR;
- Notifications P9.1 / Payment P10 / Chat P12 scope boundaries.

## Required GREEN verification

Run all, fresh, after correction:

```bash
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

## Safety / publication

- Push only to `validation/p2-2-rc`.
- No PR in this correction run.
- No merge.
- No deploy.
- No live Supabase/Storage mutation.
- Do not apply Migration 028.
- Do not call P2.2 clean/closed/final/publication-ready/Codex-ready.

## Required final report

Return exactly this structure:

```text
RESULT: P2_2_PRE_CODEX_CORRECTION_02_PASS | P2_2_PRE_CODEX_CORRECTION_02_BLOCKED
START_SHA: <exact>
FINAL_SHA: <exact or NONE>
BASE_SHA: <exact>
CHANGED_PATHS:
- ...
RED_EVIDENCE:
- ...
CORRECTION_DISPOSITION:
- C2_F1_CREATE_RESPONSE_NO_WORKAROUND: PASS|FAIL|BLOCKED
- C2_F2_P15_TEST_CONTRACT_UPDATED: PASS|FAIL|BLOCKED
- C2_F3_DETAIL_NO_COMPENSATING_FALLBACK: PASS|FAIL|BLOCKED
- C2_F4_DETAIL_CAPACITY_FAIL_CLOSED: PASS|FAIL|BLOCKED
- C2_F5_FAVORITES_PUBLIC_DTO_PARITY: PASS|FAIL|BLOCKED
AUTOMATED_GATES:
- <command>: PASS|FAIL
LIVE_MUTATIONS: NONE|<details>
DEPLOYMENT: NONE|<details>
MERGE: NONE|<details>
UNRESOLVED:
- NONE|<details>
```

# P2.2 Live Customer Explore Address Contract Hotfix

TASK_ID: P2_2_LIVE_EXPLORE_ADDRESS_HOTFIX
STAGE: IMPLEMENTING
EXECUTOR: Antigravity
RISK_CLASS: Bounded live regression / public contract
LIVE_MUTATION: FORBIDDEN DURING IMPLEMENTATION
SINGLE_WRITER: REQUIRED

## Starting state

- Published main SHA: `3b7e895b8fbfd25149d02091d7710e7545d67a74`
- Production symptom: Customer Explore renders `تعذر تحميل أماكن الإقامة`.
- Root cause proven from live DB + code:
  - Owner property flow treats detailed `address` as optional and persists `''` when omitted.
  - Production currently has three `PUBLISHED + VERIFIED` properties with `address = ''`, valid region/resort/capacity/price/media.
  - Public Customer DTO currently rejects an empty address as malformed, causing the entire public collection to fail closed.
  - Customer Favorites client validator independently rejects empty address, so the same mismatch would also break Favorites for those properties.

## Product contract for this hotfix

Detailed address remains OPTIONAL. Do not fabricate or backfill an address. Do not mutate existing property rows.

A public property with `address = ''` is valid if its other required public fields are valid. Non-string address values remain malformed and must fail closed.

Customer location presentation must remain truthful. Existing exact address may still be shown when present; when absent, UI should fall back to real `resortName`, then real `region`, then the existing generic coastal fallback. Never manufacture a precise location.

## Strict TDD

Write regression tests first and capture RED evidence before changing production code.

Required RED cases:

1. P2.1 public mapper/search accepts a valid public property whose `address` is the empty string.
2. P2.1 detail path accepts the same valid empty-address property.
3. Non-string address remains rejected as malformed.
4. P2.2 Favorites hydration/client validation accepts a canonical public item with `address = ''`.
5. Favorites validation still rejects non-string address.
6. Location rendering/fallback logic uses `address || resortName || region || 'الساحل الشمالي'` semantics without inventing data.

## Minimal implementation direction

### Backend public contract

`backend/server/src/contracts/publicProperty.ts`

- Keep `address` as a string field.
- Require `typeof raw.address === 'string'`.
- Permit `raw.address.trim() === ''`.
- Normalize only by trimming the real string; do not substitute resort/region into the address field.
- Preserve all other strict fail-closed validation.

### Customer Favorites client contract

`customer-app/src/utils/customerFavorites.ts`

- Require address to be a string, but permit empty string.
- Return the trimmed real string.
- Do not relax any other DTO validation.

### Customer location presentation

Update only if needed to ensure empty address renders a truthful real fallback:

- `customer-app/src/components/PropertyCard.tsx`
- `customer-app/src/components/PropertyDetailModal.tsx`
- `customer-app/src/components/BookingReviewSheet.tsx`

Preferred display chain:
`property.address || property.resortName || property.region || 'الساحل الشمالي'`

Do not redesign these components.

## Allowed changed paths

Required / expected:
- `backend/server/src/contracts/publicProperty.ts`
- `backend/server/src/tests/p21PublicApiContract.test.ts`
- `customer-app/src/utils/customerFavorites.ts`
- `customer-app/src/utils/customerTruthfulState.test.ts`

Conditionally allowed only for the truthful display fallback described above:
- `customer-app/src/components/PropertyCard.tsx`
- `customer-app/src/components/PropertyDetailModal.tsx`
- `customer-app/src/components/BookingReviewSheet.tsx`

No other path may change without STOP/report.

## Explicitly forbidden

- No DB migration.
- No update/backfill of the three Production properties.
- No change making Owner address mandatory.
- No fake address/location values.
- No change to publication/verification rules.
- No booking/finance/Favorites persistence/RPC/Worker SQL matcher changes.
- No Owner/Admin flow changes.
- No Notifications/Payment/Chat changes.
- No main push, merge, deploy, Supabase mutation, or Storage mutation.

## Required validation

Run fresh:

```text
npm --prefix backend run check
npm --prefix backend run test:p2-1-public-api
npm --prefix backend run test:p2-2-renter-api
npm --prefix backend run test:p13-worker-adapter
npm --prefix customer-app run test:truthful-state
npm --prefix customer-app run build
git diff --check
```

Also inspect the resulting diff and prove no unrelated changes.

## Candidate reporting

Push candidate branch only. Do not merge or deploy.

Return:

```text
RESULT: P2_2_LIVE_EXPLORE_HOTFIX_READY | P2_2_LIVE_EXPLORE_HOTFIX_BLOCKED
START_SHA: 3b7e895b8fbfd25149d02091d7710e7545d67a74
FINAL_SHA: <exact candidate head>
BASE_SHA: 3b7e895b8fbfd25149d02091d7710e7545d67a74
CHANGED_PATHS:
- ...
RED_EVIDENCE:
- ...
HOTFIX_DISPOSITION:
- EMPTY_ADDRESS_PUBLIC_SEARCH: PASS|FAIL
- EMPTY_ADDRESS_PUBLIC_DETAIL: PASS|FAIL
- NON_STRING_ADDRESS_FAIL_CLOSED: PASS|FAIL
- EMPTY_ADDRESS_FAVORITES: PASS|FAIL
- TRUTHFUL_LOCATION_FALLBACK: PASS|FAIL
- NO_DB_DATA_MUTATION: PASS|FAIL
AUTOMATED_GATES:
- ...
LIVE_MUTATIONS: NONE
DEPLOYMENT: NONE
MERGE: NONE
UNRESOLVED:
- NONE | blocker
```

Do not call P2.2 CLOSED or fully verified. Final closure requires exact-head review/CI, publication authorization, deployment, and a real Live Customer Explore request that returns the existing Production properties instead of the error state.

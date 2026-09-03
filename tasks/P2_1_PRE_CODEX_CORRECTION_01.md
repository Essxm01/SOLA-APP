# P2.1 — Pre-Codex Fail-Closed Correction 01

TASK_ID: P2.1_PRE_CODEX_CORRECTION_01
STAGE: ADVERSARIAL_PREFLIGHT_CORRECTION
EXECUTOR: Antigravity
PR: #11
CANDIDATE_BRANCH: validation/p2-1-rc
STARTING_CANDIDATE_SHA: fae34f4d77d6efb02e1b2ff75e1b8564bf66eb2c
BASE_MAIN_SHA: 317b7c3071fdd167b3419e8fd1b7f96d08ba6427
LIVE_MUTATION: FORBIDDEN

## Objective

Close three deterministic fail-closed gaps discovered after the initial P2.1 implementation and before spending the final Codex review.

Do not redesign P2.1. Preserve the approved Design Spec and Implementation Plan.

## Finding 1 — malformed public source rows can silently disappear or fabricate zero values during filtered search

Current `propertyDb.searchPublic()` normalizes required numeric fields with defaults such as `?? 0`, then applies filters before the public DTO mapper runs. Consequences include:

- missing `bedrooms` or `bathrooms` can become a successful public `0` value;
- malformed/missing `maxGuests` or `basePricePerNight` can become `0`/`NaN` and be silently filtered out under `guests` / `maxPrice`, producing a truthful-looking partial/zero search result instead of failing closed;
- malformed required string fields can also be excluded before the route mapper validates them.

### Required correction

Validate/normalize every public search source row **before any search predicate is applied**.

At minimum validate the fields consumed by the approved public search DTO/filters:

- `id`: non-empty string
- `title`: non-empty string
- `unitType`: non-empty string
- `propertyType`: null/undefined or non-empty string
- `address`: non-empty string
- `region`: null/undefined or string
- `resortName`: null/undefined or string
- `bedrooms`: non-negative integer
- `bathrooms`: non-negative integer
- `maxGuests`: positive integer
- `basePricePerNight`: positive finite number

Do not default missing required values to zero/empty strings. A malformed canonical DB/Worker row must throw and make the route return an error, never disappear from a filtered result.

Prefer factoring one reusable strict base-row validator/normalizer in the public contract boundary rather than duplicating inconsistent rules, if this can be done without broad refactor.

Also tighten optional public string fields in DTO mapping: do not convert arbitrary numbers/objects with `String(...)`. Invalid non-null optional string values must fail closed.

## Finding 2 — malformed media rows are silently filtered out

Current public route hydration uses patterns equivalent to:

```ts
images.map((img) => img.fileUrl).filter(Boolean)
```

This can turn a malformed successful media response (missing/null/empty `fileUrl`) into an apparently valid property with fewer or zero images.

### Required correction

Do not silently filter malformed canonical media rows.

For every media row returned by `imageDb.getImagesByPropertyId` in P2.1 public Search and Details:

- require `fileUrl` to be a non-empty string;
- preserve canonical ordering;
- if any returned active media row has an invalid URL, fail closed with HTTP 500 rather than omitting it.

Existing genuine zero-media response (`[]`) may remain a valid empty image array if that is already allowed by the current persistence/product contract; do not fabricate placeholder URLs.

Add deterministic Search + Detail route tests for malformed media rows (missing, null, empty-string URL) proving the route does not return `200` with a silently reduced `images` array.

## Finding 3 — Customer search helper can silently degrade invalid filters to broad Explore

Current `buildPublicPropertySearchPath()` omits invalid non-positive/non-finite `totalGuests` or `maxPrice` values instead of rejecting them. This means a client-side bug can turn an invalid search intent into a broader valid request, bypassing the server's `400 INVALID_PUBLIC_SEARCH_FILTER` contract.

### Required correction

The Customer search request builder must not silently omit an explicitly provided invalid numeric filter.

- explicit invalid `totalGuests` -> throw/return a deterministic invalid-filter failure;
- explicit invalid `maxPrice` -> throw/return deterministic invalid-filter failure;
- absent values remain omitted;
- `unitType=ALL` remains intentionally omitted;
- valid values preserve the current query parameter names and encoding.

Ensure `App.tsx` converts any local path-construction failure into the existing truthful property `ERROR` state; it must not issue an unfiltered request.

Add customer truthful-state/helper tests proving invalid explicit filters never call the network as broad Explore.

## Scope

Expected changed paths should be limited to the smallest subset of:

- `backend/server/src/contracts/publicProperty.ts`
- `backend/server/src/services/dbRepository.ts`
- `backend/server/src/app.ts`
- `backend/server/src/tests/p21PublicApiContract.test.ts`
- `customer-app/src/utils/publicPropertySearch.ts`
- `customer-app/src/App.tsx`
- `customer-app/src/utils/customerTruthfulState.test.ts`

Do not modify migrations, finance, availability rules, booking lifecycle, Owner/Admin UI, deployment workflows, or unrelated documentation.

## Required tests

Run at minimum:

```bash
npm --prefix backend run check
npm --prefix backend run test:p2-1-public-api
npm --prefix backend run test:p13-property-persistence
npm --prefix backend run test:p13-property-media
npm --prefix backend run test:p13-worker-adapter
npm --prefix backend run test:p1-4-availability
npm --prefix backend run test:p1-5-atomic-booking
npm --prefix backend run test:p1-6-wallet-ledger
npm --prefix customer-app run test:truthful-state
npm --prefix customer-app run build
git diff --check
```

Push only to `validation/p2-1-rc`. PR #11 should update automatically. Do not merge or deploy.

## Stop conditions

Stop and report if the correction requires:

- schema/migration/index change;
- new endpoint;
- business/product/finance/availability rule change;
- breaking route contract;
- unrelated refactor.

## Report

Return:

- `RESULT: P2_1_PRE_CODEX_CORRECTION_PASS` or `BLOCKED`
- starting SHA
- final SHA
- exact changed paths
- disposition of Findings 1–3
- exact local test results
- PR #11 exact-head CI run/status if available
- live mutation: NONE
- unresolved: NONE or exact blocker

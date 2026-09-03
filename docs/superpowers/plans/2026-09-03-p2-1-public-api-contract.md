# P2.1 Public API Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the existing public Customer API so KONFRM owns server-side search semantics, emits explicit privacy-safe property DTOs, preserves Phase 1 availability/quote invariants, and moves the Customer App from local-authoritative filtering to the canonical backend search contract.

**Architecture:** Keep the existing `/api/v1/customer/*` routes. Add a small typed public-contract boundary, dedicated public repository reads, collision-safe Worker adapter handling for the canonical public property queries, and explicit DTO mappers. The Customer App keeps its current UI but sends approved filters to the server. No database migration, no new dependency, no business-rule change.

**Tech Stack:** TypeScript 6, Node/Express-style router, Cloudflare Worker, Supabase PostgreSQL/PostgREST compatibility adapter, React 19, Vite 8.

**Spec:** `docs/superpowers/specs/2026-09-03-p2-1-public-api-contract-design.md`

## Global Constraints

- Base `main` SHA for this plan: `317b7c3071fdd167b3419e8fd1b7f96d08ba6427`.
- Preserve the existing route family; do not create `/api/v1/public/*`.
- Public property visibility remains `PUBLISHED + VERIFIED` only.
- Public DTOs must be explicit allowlists; do not spread repository/admin rows into public responses.
- No Owner phone/email/private IDs, KYC data, admin-review metadata, storage internals, commission, Owner net, wallet/ledger or payout data may enter public DTOs.
- Availability remains 2–30 nights; `PENDING_OWNER_APPROVAL` does not block; `APPROVED_PENDING_PAYMENT` and `CONFIRMED` block; canonical manual blocks block; failures fail closed.
- Quote remains public, server-authoritative, does not hold dates, and returns Customer-safe totals only.
- Deposit = actual first-night price. Remaining = total - deposit. No change to commission, Owner net, booking lifecycle or payment timing.
- No database migration, schema/index change, dependency addition, deploy, merge, or live mutation during candidate implementation.
- If a migration, business-rule change, public Owner contact field, new media endpoint, or breaking route change appears necessary, stop and report.
- Single Writer applies to the implementation branch.

---

## File Structure

### Create

- `backend/server/src/contracts/publicProperty.ts` — public search/filter types, public DTOs, query-parameter parser, and explicit DTO mappers.
- `backend/server/src/tests/p21PublicApiContract.test.ts` — focused P2.1 API/privacy/search/Worker-contract suite.
- `customer-app/src/utils/publicPropertySearch.ts` — builds the canonical `/customer/properties/search` request path from existing UI filter intent.

### Modify

- `backend/server/src/services/dbRepository.ts` — add `propertyDb.searchPublic(filters)` and `propertyDb.getPublicById(id)`; retain `getAllForPublic()` as a compatibility alias to unfiltered public search.
- `backend/server/src/services/dbClient.ts` — add collision-safe exact canonical Worker adapter handling for the new public list/detail SQL shapes and prevent generic property matchers from intercepting those shapes.
- `backend/server/src/app.ts` — validate public search parameters, call the dedicated public reads, attach canonical active media, map via explicit public DTO mappers, and use non-enumerating public detail behavior.
- `backend/package.json` — add `test:p2-1-public-api`.
- `customer-app/src/App.tsx` — replace local-authoritative property filtering with server requests while preserving loading/error/empty states and current visuals.
- `customer-app/src/components/PropertyCard.tsx` — align `CustomerPropertyItem` with the approved public DTO; remove raw publication/verification/Owner fields from the Customer model.
- `customer-app/src/utils/customerTruthfulState.test.ts` — add deterministic tests for canonical search path construction and truthful error/empty behavior.
- `.github/workflows/ci-validation.yml` — run `test:p2-1-public-api` in Backend CI and `test:truthful-state` in Customer CI; do not alter deploy conditions or perform the broader CI-hardening side quest in this task.
- `docs/ARCHITECTURE.md` — record the dedicated public read/DTO boundary and server-authoritative search ownership.
- `docs/CURRENT_STATE.md` — record Phase 1 closed and P2.1 candidate state/evidence truthfully; do not claim P2.1 closed before publication.
- `tasks/CURRENT_TASK.md` — replace stale P1.6 active-task text with the P2.1 execution contract pointer/state on the candidate branch.

---

### Task 1: Public Contract Types, Parser, and Explicit DTO Mappers

**Files:**
- Create: `backend/server/src/contracts/publicProperty.ts`
- Create: `backend/server/src/tests/p21PublicApiContract.test.ts`
- Modify: `backend/package.json`

**Interfaces:**
- Produces: `PublicPropertySearchFilters`, `PublicPropertySearchItem`, `PublicPropertyDetail`, `parsePublicPropertySearchFilters()`, `toPublicPropertySearchItem()`, `toPublicPropertyDetail()`.
- Consumes later: repository methods return source rows; routes pass rows + canonical `images: string[]` to the mappers.

- [ ] **Step 1: Add the focused test script**

Add to `backend/package.json`:

```json
"test:p2-1-public-api": "npx tsx server/src/tests/p21PublicApiContract.test.ts"
```

- [ ] **Step 2: Write failing parser and DTO privacy tests**

Start `p21PublicApiContract.test.ts` with assertions equivalent to:

```ts
import assert from 'node:assert/strict';
import {
  parsePublicPropertySearchFilters,
  toPublicPropertySearchItem,
  toPublicPropertyDetail,
} from '../contracts/publicProperty.js';

const filters = parsePublicPropertySearchFilters(
  new URLSearchParams('destination=%D9%85%D8%B1%D8%A7%D8%B3%D9%8A&unitType=CHALET&guests=4&maxPrice=25000')
);
assert.deepEqual(filters, {
  destination: 'مراسي',
  unitType: 'CHALET',
  guests: 4,
  maxPrice: 25000,
});

assert.throws(
  () => parsePublicPropertySearchFilters(new URLSearchParams('guests=0')),
  /INVALID_PUBLIC_SEARCH_FILTER/
);
assert.throws(
  () => parsePublicPropertySearchFilters(new URLSearchParams('guests=2.5')),
  /INVALID_PUBLIC_SEARCH_FILTER/
);
assert.throws(
  () => parsePublicPropertySearchFilters(new URLSearchParams('maxPrice=-1')),
  /INVALID_PUBLIC_SEARCH_FILTER/
);

const poisoned = {
  id: 'property-1',
  title: 'مراسي شاليه',
  unitType: 'CHALET',
  propertyType: 'CHALET',
  address: 'مراسي',
  region: 'الساحل الشمالي',
  resortName: 'مراسي',
  bedrooms: 2,
  bathrooms: 2,
  bedsCount: 3,
  maxGuests: 6,
  areaSqM: 120,
  description: 'وصف',
  amenities: ['POOL'],
  houseRules: { smoking: false },
  basePricePerNight: 7500,
  ownerId: 'owner-secret',
  ownerPhone: '+201000000000',
  ownerEmail: 'secret@example.com',
  verificationStatus: 'VERIFIED',
  createdAt: '2026-09-03T00:00:00.000Z',
  solaCommissionAmount: 1500,
};

const item = toPublicPropertySearchItem(poisoned, ['https://example.test/cover.jpg']);
assert.deepEqual(Object.keys(item).sort(), [
  'address','basePricePerNight','bathrooms','bedrooms','currency','id','images',
  'maxGuests','propertyType','region','resortName','title','unitType',
].sort());
assert.equal('ownerPhone' in item, false);
assert.equal('verificationStatus' in item, false);

const detail = toPublicPropertyDetail(poisoned, ['https://example.test/cover.jpg']);
assert.equal('ownerId' in detail, false);
assert.equal('ownerEmail' in detail, false);
assert.equal('solaCommissionAmount' in detail, false);
```

Also assert required malformed source fields fail closed rather than becoming `undefined`/`NaN` public success.

- [ ] **Step 3: Run the focused suite and verify it fails because the contract file does not exist**

Run:

```bash
npm --prefix backend run test:p2-1-public-api
```

Expected: FAIL resolving `../contracts/publicProperty.js` or missing exported functions.

- [ ] **Step 4: Implement the public contract file**

Use exact exported interfaces:

```ts
export interface PublicPropertySearchFilters {
  destination?: string;
  unitType?: string;
  guests?: number;
  maxPrice?: number;
}

export interface PublicPropertySearchItem {
  id: string;
  title: string;
  unitType: string;
  propertyType?: string | null;
  address: string;
  region?: string | null;
  resortName?: string | null;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  basePricePerNight: number;
  currency: 'EGP';
  images: string[];
}

export interface PublicPropertyDetail extends PublicPropertySearchItem {
  bedsCount?: number | null;
  areaSqM?: number | null;
  description?: string | null;
  amenities: unknown[];
  houseRules: Record<string, unknown>;
}
```

Implement `parsePublicPropertySearchFilters(searchParams?: URLSearchParams)` with these exact rules:

- absent/blank `destination` -> omitted; otherwise trimmed string;
- absent/blank `unitType` -> omitted; otherwise trimmed uppercase string;
- `guests` -> positive integer only;
- `maxPrice` -> positive finite number only;
- invalid numeric values throw `Error('INVALID_PUBLIC_SEARCH_FILTER: ...')`.

Implement mappers with explicit object literals only. Required strings/numbers must be validated before success. Convert numeric PostgreSQL/PostgREST values with `Number(...)` and reject non-finite or invalid negative values where the schema/domain requires non-negative customer display values. `images` must be an array of non-empty strings. `amenities` defaults to `[]` only when the persisted source value is null/undefined; `houseRules` defaults to `{}` only when persisted source is null/undefined. Never copy unknown keys.

- [ ] **Step 5: Run the focused suite**

```bash
npm --prefix backend run test:p2-1-public-api
```

Expected: parser and mapper tests PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add backend/package.json backend/server/src/contracts/publicProperty.ts backend/server/src/tests/p21PublicApiContract.test.ts
git commit -m "feat(api): add explicit public property contracts"
```

---

### Task 2: Dedicated Public Repository Reads and Collision-Safe Worker Adapter

**Files:**
- Modify: `backend/server/src/services/dbRepository.ts`
- Modify: `backend/server/src/services/dbClient.ts`
- Modify: `backend/server/src/tests/p21PublicApiContract.test.ts`
- Modify: `backend/server/src/tests/p13WorkerAdapter.test.ts`

**Interfaces:**
- Consumes: `PublicPropertySearchFilters` from Task 1.
- Produces:

```ts
propertyDb.searchPublic(filters?: PublicPropertySearchFilters): Promise<any[]>
propertyDb.getPublicById(id: string): Promise<any | null>
```

- `propertyDb.getAllForPublic()` remains available and delegates to `searchPublic({})` for compatibility.

- [ ] **Step 1: Add failing repository/filter tests**

Mock `queryDb`/Worker fetch through the existing test conventions and assert:

- only `PUBLISHED + VERIFIED + deleted_at IS NULL` source is used;
- destination matches case-insensitively against `title`, `address`, `region`, `resortName`;
- `unitType` exact-normalized match uses `propertyType || unitType` without inventing a taxonomy;
- `maxGuests >= guests`;
- `basePricePerNight <= maxPrice`;
- multiple filters combine with AND;
- true no-match returns `[]`;
- `getPublicById()` returns null for a zero-row canonical result.

Use representative rows such as:

```ts
const rows = [
  { id: 'p1', title: 'شاليه مراسي', unitType: 'CHALET', propertyType: 'CHALET', address: 'مراسي', region: 'الساحل', resortName: 'مراسي', bedrooms: 2, bathrooms: 2, maxGuests: 6, basePricePerNight: 7500 },
  { id: 'p2', title: 'فيلا هاسيندا', unitType: 'VILLA', propertyType: 'VILLA', address: 'هاسيندا', region: 'الساحل', resortName: 'هاسيندا', bedrooms: 4, bathrooms: 3, maxGuests: 10, basePricePerNight: 30000 },
];
```

- [ ] **Step 2: Add failing Worker collision/adversarial tests**

Prove the canonical list/detail repository queries dispatch to Supabase REST with publication constraints and explicit `select=` fields.

For the public detail path, assert REST filtering includes all of:

```text
id=eq.<requested-id>
deleted_at=is.null
status=eq.PUBLISHED
verification_status=eq.VERIFIED
```

Assert malformed HTTP-200 payloads fail closed:

- list payload is not an array;
- detail payload is not an array;
- detail returns more than one row;
- detail row id differs from the requested id.

Add collision cases that must **not** enter the canonical public adapter: comment prefix/suffix, wrapper subquery, altered SELECT list, missing verification predicate, wrong placeholder, or extra SQL clause outside the canonical shape.

- [ ] **Step 3: Run tests and verify the new expectations fail on the current broad adapter/repository**

```bash
npm --prefix backend run test:p2-1-public-api
npm --prefix backend run test:p13-worker-adapter
```

Expected: FAIL on missing `searchPublic/getPublicById` and/or broad adapter behavior.

- [ ] **Step 4: Implement the dedicated repository reads**

Use one stable public list SQL shape that selects only public source fields:

```sql
SELECT id, title, unit_type AS "unitType", property_type AS "propertyType",
       address, region, resort_name AS "resortName", bedrooms, bathrooms,
       max_guests AS "maxGuests", base_price_per_night AS "basePricePerNight"
FROM properties
WHERE deleted_at IS NULL
  AND status = 'PUBLISHED'
  AND verification_status = 'VERIFIED'
ORDER BY created_at DESC
```

`searchPublic(filters)` performs the approved filter semantics on these canonical persisted fields in the backend/repository process before image hydration. This deliberately avoids adding a migration/index or proliferating dynamic SQL shapes in P2.1; the external contract can later move predicates into SQL without changing the route contract.

Use a dedicated public detail SQL shape:

```sql
SELECT id, title, unit_type AS "unitType", property_type AS "propertyType",
       address, region, resort_name AS "resortName", bedrooms, bathrooms,
       beds_count AS "bedsCount", max_guests AS "maxGuests", area_sq_m AS "areaSqM",
       description, amenities, house_rules AS "houseRules",
       base_price_per_night AS "basePricePerNight"
FROM properties
WHERE id = $1
  AND deleted_at IS NULL
  AND status = 'PUBLISHED'
  AND verification_status = 'VERIFIED'
```

Do not select `owner_id`, status enums, verification enum, timestamps, Owner joins, or admin-review fields.

- [ ] **Step 5: Implement exact canonical Worker adapter matching**

In `dbClient.ts`, add normalized constants for the two exact SQL shapes and match them with equality after whitespace collapse/case normalization, following the P1.6 matcher discipline.

The exact public matchers must execute before generic property matchers. The generic single-property matcher must explicitly exclude SQL containing the public publication predicates so it cannot steal the public detail query. Replace the broad published-property matcher with the canonical public-list matcher or otherwise prove noncanonical public-like SQL cannot enter it.

Use explicit PostgREST `select=` projections matching the repository SQL. For the public list, use publication filters + `order=created_at.desc`. For detail, add the requested id filter and enforce zero-or-one cardinality.

Do not turn malformed REST 200 payloads into empty success.

- [ ] **Step 6: Run repository/Worker tests**

```bash
npm --prefix backend run test:p2-1-public-api
npm --prefix backend run test:p13-worker-adapter
npm --prefix backend run test:p13-property-persistence
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

```bash
git add backend/server/src/services/dbRepository.ts backend/server/src/services/dbClient.ts backend/server/src/tests/p21PublicApiContract.test.ts backend/server/src/tests/p13WorkerAdapter.test.ts
git commit -m "fix(api): harden public property persistence boundary"
```

---

### Task 3: Public Search and Detail Route Contracts

**Files:**
- Modify: `backend/server/src/app.ts`
- Modify: `backend/server/src/tests/p21PublicApiContract.test.ts`

**Interfaces:**
- Consumes: `parsePublicPropertySearchFilters`, `toPublicPropertySearchItem`, `toPublicPropertyDetail`, `propertyDb.searchPublic`, `propertyDb.getPublicById`, `imageDb.getImagesByPropertyId`.
- Produces: stable public route behavior for search and details.

- [ ] **Step 1: Add failing route contract tests**

Cover unauthenticated calls to:

```text
GET /api/v1/customer/properties/search
GET /api/v1/customer/properties/search?destination=مراسي&unitType=CHALET&guests=4&maxPrice=25000
GET /api/v1/customer/properties/:id
```

Assert:

- no auth required;
- invalid `guests=0`, `guests=2.5`, `maxPrice=0`, `maxPrice=abc` -> `400 INVALID_PUBLIC_SEARCH_FILTER`;
- genuine zero results -> `200 success:true data:[]`;
- DB search failure -> `500`, not `[]`;
- media failure -> `500`, not fake empty images;
- details for missing/non-public row -> `404 PROPERTY_NOT_FOUND` with no disclosure of unpublished/unverified state;
- search/detail response keys equal the Task 1 allowlists;
- poisoned underlying rows containing `ownerPhone`, `ownerEmail`, `ownerId`, `verificationStatus`, timestamps and finance fields never leak.

- [ ] **Step 2: Run the focused suite and verify failures against the current routes**

```bash
npm --prefix backend run test:p2-1-public-api
```

Expected: FAIL because current search uses `getAllForPublic()` + broad spreading and current details use `getDetailForAdmin()`.

- [ ] **Step 3: Replace the search route implementation**

For `/api/v1/customer/properties/search`:

1. parse `searchParams` via `parsePublicPropertySearchFilters()`;
2. map parser failure to:

```ts
{
  statusCode: 400,
  body: {
    success: false,
    error: { code: 'INVALID_PUBLIC_SEARCH_FILTER', message: 'بيانات البحث غير صالحة. راجع الفلاتر وحاول مرة أخرى.' },
    timestamp,
  },
}
```

3. call `propertyDb.searchPublic(filters)` inside a fail-closed try/catch;
4. hydrate media only for matched rows via `imageDb.getImagesByPropertyId(row.id)`;
5. map each result with `toPublicPropertySearchItem(row, imageUrls)`;
6. return the established success envelope.

Do not spread `...row` into the public response.

- [ ] **Step 4: Replace the public detail route implementation**

For `/api/v1/customer/properties/:id`:

1. call `propertyDb.getPublicById(propertyId)`; do not call `getDetailForAdmin()`;
2. on canonical zero row return `404 PROPERTY_NOT_FOUND`;
3. hydrate active media via `imageDb.getImagesByPropertyId(propertyId)`;
4. map with `toPublicPropertyDetail()`;
5. return a public explicit DTO only.

Do not return `403 UNPUBLISHED_PROPERTY` to a public caller; missing/unpublished/unverified/deleted all collapse to the same not-found boundary because the dedicated repository query only returns public rows.

- [ ] **Step 5: Run focused and property regression suites**

```bash
npm --prefix backend run test:p2-1-public-api
npm --prefix backend run test:p13-property-persistence
npm --prefix backend run test:p13-property-media
npm --prefix backend run test:p13-worker-adapter
npm --prefix backend run test:p13-atomic-media
```

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

```bash
git add backend/server/src/app.ts backend/server/src/tests/p21PublicApiContract.test.ts
git commit -m "feat(api): enforce customer-safe public property routes"
```

---

### Task 4: Availability and Quote Public-Contract Regression Gate

**Files:**
- Modify: `backend/server/src/tests/p21PublicApiContract.test.ts`
- Modify `backend/server/src/app.ts` only if a test exposes an in-scope public-contract defect; do not change Phase 1 business rules.

**Interfaces:**
- Preserves existing availability and quote route contracts.

- [ ] **Step 1: Add public availability assertions**

Call availability without auth and assert:

- `success:true` for a public canonical property fixture;
- `minStay === 2` and `maxStay === 30`;
- `unavailableRanges` is an array;
- serialized public availability data does not contain `ownerId`, `customerId`, `guestPhone`, `bookingId`, wallet/ledger or finance-internal keys;
- query failure remains an error and cannot become `unavailableRanges: []` success.

- [ ] **Step 2: Add public quote assertions**

Call quote without auth using:

```ts
{
  propertyId: 'prop-pub-001',
  checkIn: '2026-09-01',
  checkOut: '2026-09-05',
  guests: 2,
  basePricePerNight: 1,
  solaCommissionAmount: 0,
}
```

Assert the server ignores client financial fields, uses canonical DB price, and emits exactly Customer-safe keys:

```text
propertyId, checkIn, checkOut, nights, guests, pricePerNight,
totalStay, depositAmount, remainingAmount, currency
```

Assert forbidden output keys are absent: `solaCommissionRate`, `solaCommissionAmount`, `ownerNetDepositAmount`, wallet/ledger/payout identifiers.

Also preserve overlap and 2–30-night rejection behavior.

- [ ] **Step 3: Run Phase 1 regression suites**

```bash
npm --prefix backend run test:p2-1-public-api
npm --prefix backend run test:p1-4-availability
npm --prefix backend run test:p1-4-worker-availability
npm --prefix backend run test:p1-4-migration
npm --prefix backend run test:p1-5-atomic-booking
npm --prefix backend run test:p1-6-wallet-ledger
npm --prefix backend run test:booking-01
npm --prefix backend run test:booking-01-1
```

Expected: PASS. If a P2.1 test fails because the route exposes an in-scope field or fabricates state, fix the smallest route/mapper defect and rerun. If fixing requires changing availability/finance/booking rules, stop and report instead.

- [ ] **Step 4: Commit Task 4**

```bash
git add backend/server/src/tests/p21PublicApiContract.test.ts backend/server/src/app.ts
git commit -m "test(api): lock public availability and quote contracts"
```

If `app.ts` did not change in this task, omit it from `git add`.

---

### Task 5: Customer App Uses Server-Authoritative Search

**Files:**
- Create: `customer-app/src/utils/publicPropertySearch.ts`
- Modify: `customer-app/src/App.tsx`
- Modify: `customer-app/src/components/PropertyCard.tsx`
- Modify: `customer-app/src/utils/customerTruthfulState.test.ts`

**Interfaces:**
- Produces:

```ts
export function buildPublicPropertySearchPath(filters?: {
  destination?: string;
  unitType?: string;
  totalGuests?: number;
  maxPrice?: number;
}): string
```

- The function returns `/customer/properties/search` with only approved query parameters. Dates remain UI booking-intent inputs and are not added to the P2.1 search API.

- [ ] **Step 1: Add failing path-builder tests**

Extend `customerTruthfulState.test.ts` with assertions equivalent to:

```ts
assert.equal(buildPublicPropertySearchPath(), '/customer/properties/search');
assert.equal(
  buildPublicPropertySearchPath({ destination: 'مراسي', unitType: 'CHALET', totalGuests: 4, maxPrice: 25000 }),
  '/customer/properties/search?destination=%D9%85%D8%B1%D8%A7%D8%B3%D9%8A&unitType=CHALET&guests=4&maxPrice=25000'
);
assert.equal(
  buildPublicPropertySearchPath({ destination: '', unitType: 'ALL' }),
  '/customer/properties/search'
);
```

Also retain the existing `fetchCanonicalCollection()` distinction between server error and genuine empty success.

- [ ] **Step 2: Run the Customer truthful-state test and verify it fails on the missing helper**

```bash
npm --prefix customer-app run test:truthful-state
```

Expected: FAIL resolving `publicPropertySearch`.

- [ ] **Step 3: Implement the canonical path builder**

Use `URLSearchParams`. Trim destination. Omit `unitType` when empty or `ALL`. Emit `guests` only for a positive integer and `maxPrice` only for a positive finite number. The UI already supplies valid select/slider values; the backend remains the authority and independently validates them.

- [ ] **Step 4: Change `App.tsx` from local-authoritative filtering to backend search**

Change `fetchProperties` to accept optional filters:

```ts
const fetchProperties = async (filters?: SearchFilterState) => {
  setPropertyLoadState('LOADING');
  setPropertyLoadError(null);
  const path = buildPublicPropertySearchPath(filters);
  const result = await fetchCanonicalCollection<CustomerPropertyItem>(path);
  if (result.kind === 'success') {
    setProperties(result.data);
    setFilteredProperties(result.data);
    setPropertyLoadState('SUCCESS');
    return;
  }
  setPropertyLoadError(result.kind === 'unauthorized'
    ? 'تعذر تحميل أماكن الإقامة حالياً. حاول مرة أخرى.'
    : result.message);
  setPropertyLoadState('ERROR');
};
```

Replace `handleSearchFilters` local array filtering with `void fetchProperties(filters)`.

Replace destination-chip local filtering with server calls:

```ts
const handleSelectDestinationChip = (dest: string) => {
  setActiveDestination(dest);
  if (dest === 'الكل') void fetchProperties();
  else void fetchProperties({
    destination: dest,
    checkIn: '',
    checkOut: '',
    totalGuests: 0,
    unitType: 'ALL',
    maxPrice: 0,
  });
};
```

`buildPublicPropertySearchPath()` must omit the zero-valued unused filters above, so the destination chip sends only `destination`.

Do not fall back to local filtering if the backend request fails. Error state must remain distinct from a real empty result.

- [ ] **Step 5: Align the Customer property type with the approved public DTO**

In `PropertyCard.tsx`, remove `status`, `verificationStatus`, and `ownerName` from `CustomerPropertyItem`. Add the harmless public fields needed for contract compatibility:

```ts
region?: string | null;
resortName?: string | null;
currency: 'EGP';
```

The existing verification badge remains a presentation statement derived from the invariant that the backend returns only published+verified properties; it must not consume a raw verification enum.

- [ ] **Step 6: Run Customer tests/build**

```bash
npm --prefix customer-app run test:truthful-state
npm --prefix customer-app run build
```

Expected: PASS with no visual redesign.

- [ ] **Step 7: Commit Task 5**

```bash
git add customer-app/src/utils/publicPropertySearch.ts customer-app/src/utils/customerTruthfulState.test.ts customer-app/src/App.tsx customer-app/src/components/PropertyCard.tsx
git commit -m "feat(customer): use canonical server property search"
```

---

### Task 6: CI Wiring, Repository Memory, and Full Candidate Verification

**Files:**
- Modify: `.github/workflows/ci-validation.yml`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/CURRENT_STATE.md`
- Modify: `tasks/CURRENT_TASK.md`

**Interfaces:**
- Produces durable CI coverage and truthful repository handoff state.

- [ ] **Step 1: Wire the focused tests into existing CI jobs**

In `validate-customer`, run before build:

```bash
npm run test:truthful-state
npm run build
```

In `validate-backend`, append to the critical tests:

```bash
npm run test:p2-1-public-api
```

Do **not** change the existing push conditions or Worker deploy condition in this P2.1 task.

- [ ] **Step 2: Update architecture memory**

Add a concise P2.1 section to `docs/ARCHITECTURE.md` recording:

- existing public route family retained;
- server owns approved search filter semantics;
- dedicated public repository reads are separate from Admin detail reads;
- public DTOs use explicit allowlists;
- public media uses canonical active `property_images` ordering;
- Cloudflare Worker adapter uses exact canonical public-property SQL matching.

Do not duplicate business rules already owned by `docs/BUSINESS_RULES.md`.

- [ ] **Step 3: Update current-state/task memory truthfully**

`docs/CURRENT_STATE.md` must state Phase 1 is closed/live and P2.1 is the active candidate, with no claim of P2.1 publication until the later Founder Publication Gate.

`tasks/CURRENT_TASK.md` must identify:

```text
TASK_ID: P2.1
STAGE: IMPLEMENTATION_CANDIDATE
EXECUTOR: Antigravity
BASE_MAIN_SHA: 317b7c3071fdd167b3419e8fd1b7f96d08ba6427
LIVE_MUTATION: FORBIDDEN_FOR_CANDIDATE
```

and point to the approved spec and implementation plan.

- [ ] **Step 4: Run the complete deterministic gate**

```bash
npm --prefix backend run check
npm --prefix backend run test:p2-1-public-api
npm --prefix backend run test:p13-property-persistence
npm --prefix backend run test:p13-property-media
npm --prefix backend run test:p13-worker-adapter
npm --prefix backend run test:p13-atomic-media
npm --prefix backend run test:p1-4-availability
npm --prefix backend run test:p1-4-worker-availability
npm --prefix backend run test:p1-4-migration
npm --prefix backend run test:p1-5-atomic-booking
npm --prefix backend run test:p1-6-wallet-ledger
npm --prefix backend run test:booking-01
npm --prefix backend run test:booking-01-1
npm --prefix customer-app run test:truthful-state
npm --prefix customer-app run build
git diff --check
```

Every command must exit 0.

- [ ] **Step 5: Run a pre-review privacy/adversarial inspection**

Before requesting final review, inspect the exact candidate and prove:

- no public route uses `getDetailForAdmin()`;
- no public search/detail response spreads raw rows;
- no public DTO includes Owner contact/private/admin/finance fields;
- public list/detail Worker SQL matchers are collision-safe and do not fall through to broad property matchers;
- malformed PostgREST HTTP-200 payloads fail closed;
- Customer App sends search intent to the backend and has no authoritative local fallback;
- availability/quote business rules are unchanged;
- no migration or live mutation exists;
- changed paths are limited to the approved P2.1 scope.

- [ ] **Step 6: Commit Task 6**

```bash
git add .github/workflows/ci-validation.yml docs/ARCHITECTURE.md docs/CURRENT_STATE.md tasks/CURRENT_TASK.md
git commit -m "docs(api): wire P2.1 contract evidence"
```

- [ ] **Step 7: Push candidate branch and open PR to `main`**

PR must remain unmerged. Record exact head SHA and exact base SHA. Wait for exact-head PR CI. Worker production deploy must remain skipped on the PR event.

- [ ] **Step 8: Final review gate**

Only after deterministic gates and exact-head CI are clean, request **one read-only Codex semantic/privacy review** pinned to the exact candidate SHA. Codex must review the public privacy boundary, search semantics, Worker matcher exactness, error/empty truthfulness, availability/quote invariant preservation, and Customer integration.

If production code changes after that review, the previous review is superseded and a delta/final review must target the new exact SHA.

- [ ] **Step 9: Stop at Founder Publication Gate**

Do not merge or deploy. Report:

```text
RESULT
BASE_SHA
FINAL_CANDIDATE_SHA
CHANGED_PATHS
AUTOMATED_GATES
PR_CI
CODEX_REVIEW
LIVE_MUTATIONS: NONE
UNRESOLVED
```

Founder approval is required before merge/deployment.

---

## Self-Review Results

### Spec coverage

- Explore/Search server authority: Tasks 2, 3, 5.
- Explicit search/detail DTO allowlists and privacy: Tasks 1, 3.
- Dedicated public detail read, not Admin read: Tasks 2, 3.
- Canonical active media + deterministic ordering + fail-closed: Tasks 2, 3 and existing `imageDb` regression coverage.
- Availability invariants/privacy: Task 4.
- Quote authority/privacy: Task 4.
- Customer integration without visual redesign: Task 5.
- Worker exact matcher/collision safety: Task 2.
- CI/evidence/docs/publication stop: Task 6.
- No migration/business-rule expansion: Global Constraints + stop conditions.

### Placeholder scan

No `TBD`, `TODO`, “implement later”, generic “add validation”, or unspecified test steps are permitted by this plan.

### Type consistency

The plan uses one filter contract (`PublicPropertySearchFilters`), one search DTO (`PublicPropertySearchItem`), one detail DTO (`PublicPropertyDetail`), repository methods `searchPublic()`/`getPublicById()`, and Customer helper `buildPublicPropertySearchPath()` consistently across tasks.

# P2.2 Renter API Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden authenticated Customer identity/account/booking contracts and add canonical persistent Favorites with an atomic publication-gated add RPC, without changing booking, finance, availability, Notifications, Payment, or Chat product rules.

**Architecture:** Keep the existing `/api/v1/customer/*` route family. Add one focused authenticated-Customer DTO boundary, one migration-backed `customer_favorites` table with `SECURITY INVOKER` add RPC, a narrow repository/Worker adapter, and minimal Customer App integration. Existing Phase 1 and P2.1 persistence/public contracts remain authoritative and must be reused rather than reimplemented.

**Tech Stack:** TypeScript 6, Node 22 backend, React 19/Vite 8 Customer App, PostgreSQL/Supabase, Cloudflare Worker/PostgREST adapter, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-03-p2-2-renter-api-contract-design.md`

## Global Constraints

- Base `main` SHA: `198a00ea39083932012f54144f93fb7516204024`.
- Implementation must occur on an isolated candidate branch/worktree; Single Writer only.
- Customer identity is the verified `ROLE_CUSTOMER` JWT `sub`; never accept a client-selected Customer id.
- Preserve P1.4 availability semantics and P1.5/P1.6 booking/financial semantics exactly.
- Customer finance is total + deposit + remaining + `EGP` only; never commission, Owner net, wallet, ledger or payout internals.
- Favorites persistence moves into P2.2; Favorites visual redesign remains out of scope.
- Customer Notifications remain P9.1; Payment remains P10; Chat remains P12.
- Migration 028 and production data must not be applied/mutated before Founder Publication authorization.
- The only new RPC allowed by this plan is `public.konfrm_add_customer_favorite(UUID, UUID)`.
- That RPC must be `SECURITY INVOKER`, `search_path = public, pg_temp`, and executable by `service_role` only.
- Worker/PostgREST support must remain exact/collision-safe; no generic SQL capability.
- Canonical DB/adapter failures must never become plausible empty/zero success.
- No broad object spreading from internal booking rows into Customer responses.
- No Owner/Admin app changes unless the task stops and reports a proven compatibility requirement.

---

## File Structure

### Create

- `backend/database/migrations/028_customer_favorites.sql` — Favorites table, RLS/ACL, atomic add RPC, migration registration.
- `backend/server/src/contracts/customerRenter.ts` — explicit authenticated-Customer DTO validators/mappers.
- `backend/server/src/tests/p22RenterApiContract.test.ts` — focused P2.2 contract, migration, repository, adapter and route tests.
- `customer-app/src/utils/customerFavorites.ts` — small canonical Favorites API/path/state helper.

### Modify

- `backend/server/src/app.ts` — Profile/Account truthfulness, Customer booking DTO mapping, Favorites routes.
- `backend/server/src/services/dbRepository.ts` — narrow `favoriteDb`; no broad booking repository rewrite.
- `backend/server/src/services/dbClient.ts` — exact Favorite list/remove SQL matchers and exact add-RPC matcher.
- `backend/package.json` — `test:p2-2-renter-api` script.
- `customer-app/src/App.tsx` — canonical profile cache behavior, account error state, Favorites bootstrap/toggle/auth-intent states.
- `customer-app/src/utils/customerTruthfulState.test.ts` — authenticated-state regressions, or add a focused `customerFavorites.test.ts` only if keeping the existing test file focused becomes materially clearer.
- `.github/workflows/ci-validation.yml` — add `npm run test:p2-2-renter-api` to Backend CI only.

### Touch only if proven necessary

- `customer-app/src/components/BookingDetailModal.tsx` — type compatibility only; no Payment/Chat behavior changes.

---

### Task 1: Add the authenticated Customer DTO boundary

**Files:**
- Create: `backend/server/src/contracts/customerRenter.ts`
- Create/Test: `backend/server/src/tests/p22RenterApiContract.test.ts`
- Modify: `backend/package.json`

**Interfaces:**
- Produces:
  - `toCustomerProfileDto(source: unknown): CustomerProfileDto`
  - `toCustomerAccountSummaryDto(source: unknown): CustomerAccountSummaryDto`
  - `toCustomerBookingListItem(source: unknown): CustomerBookingListItem`
  - `toCustomerBookingDetail(source: unknown): CustomerBookingDetail`
  - `toCustomerBookingCreateResult(source: unknown): CustomerBookingCreateResult`
  - `validateCustomerFavoriteRow(source: unknown): CustomerFavoriteRow`
- Later route tasks consume these functions; internal repository rows remain broad.

- [ ] **Step 1: Add the focused test script and RED DTO tests**

In `backend/package.json` add:

```json
"test:p2-2-renter-api": "npx tsx server/src/tests/p22RenterApiContract.test.ts"
```

Start `p22RenterApiContract.test.ts` with strict allowlist/fail-closed assertions. Use an intentionally poisoned booking source:

```ts
import assert from 'node:assert/strict';
import {
  toCustomerProfileDto,
  toCustomerAccountSummaryDto,
  toCustomerBookingListItem,
  toCustomerBookingDetail,
  toCustomerBookingCreateResult,
  validateCustomerFavoriteRow,
} from '../contracts/customerRenter.js';

const poisonedBooking = {
  id: 'b1111111-1111-4111-8111-111111111111',
  bookingNumber: 'BK-220001',
  propertyId: 'p1111111-1111-4111-8111-111111111111',
  ownerId: 'o-secret',
  customerId: 'c-secret',
  guestPhone: '+201000000000',
  checkIn: '2026-12-10',
  checkOut: '2026-12-12',
  nights: 2,
  guestsCount: 3,
  status: 'PENDING_OWNER_APPROVAL',
  createdAt: '2026-09-03T12:00:00.000Z',
  confirmedAt: null,
  rejectedAt: null,
  property: {
    id: 'p1111111-1111-4111-8111-111111111111',
    title: 'شاليه مراسي',
    images: ['https://example.test/p.jpg'],
    address: 'مراسي',
    region: 'الساحل الشمالي',
    resortName: 'مراسي',
    locationName: 'مراسي — الساحل الشمالي',
    description: 'وصف',
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 5,
    pricePerNight: 6000,
    amenities: ['POOL'],
    houseRules: { smoking: false },
  },
  financialSummary: {
    totalBookingValue: 12000,
    depositAmount: 6000,
    remainingBalance: 6000,
    solaCommissionAmount: 1200,
    ownerNetDepositAmount: 4800,
    commissionOnRemainingBalance: 0,
    ownerPayoutStatus: 'NOT_DUE',
  },
};

const listItem = toCustomerBookingListItem(poisonedBooking);
for (const forbidden of [
  'ownerId', 'customerId', 'guestPhone', 'financialSummary',
  'solaCommissionAmount', 'ownerNetDepositAmount', 'commissionOnRemainingBalance', 'ownerPayoutStatus',
]) {
  assert.equal(forbidden in (listItem as any), false, `${forbidden} must not leak`);
}
assert.equal(listItem.totalStay, 12000);
assert.equal(listItem.depositAmount, 6000);
assert.equal(listItem.remainingAmount, 6000);
assert.equal(listItem.currency, 'EGP');

assert.throws(
  () => toCustomerBookingListItem({ ...poisonedBooking, nights: null }),
  /MALFORMED_CUSTOMER_BOOKING_DATA/
);
assert.throws(
  () => toCustomerBookingListItem({ ...poisonedBooking, financialSummary: { ...poisonedBooking.financialSummary, depositAmount: 'bad' } }),
  /MALFORMED_CUSTOMER_BOOKING_DATA/
);
```

Also assert profile exact keys, account finite/non-negative values, booking detail property exact keys, create response denylist, and favorite row UUID/string/timestamp shape.

- [ ] **Step 2: Run RED**

Run:

```bash
npm --prefix backend run test:p2-2-renter-api
```

Expected: FAIL because `customerRenter.ts` and mapper functions do not exist.

- [ ] **Step 3: Implement strict DTO helpers**

Create `customerRenter.ts` with explicit object construction and reusable guards. Minimum guard behavior:

```ts
const fail = (scope: string, field: string): never => {
  throw new Error(`MALFORMED_${scope}: ${field}`);
};

const requiredString = (value: unknown, scope: string, field: string): string => {
  if (typeof value !== 'string' || value.trim() === '') fail(scope, field);
  return value;
};

const nonNegativeFinite = (value: unknown, scope: string, field: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) fail(scope, field);
  return value;
};

const positiveInteger = (value: unknown, scope: string, field: string): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) fail(scope, field);
  return value;
};
```

Construct return DTOs field-by-field. Do not use `{ ...source }` in any Customer mapper.

For booking finance, read canonical values from `source.financialSummary.totalBookingValue`, `.depositAmount`, `.remainingBalance`; validate finite/non-negative and return only `totalStay`, `depositAmount`, `remainingAmount`, `currency: 'EGP'`.

- [ ] **Step 4: Run GREEN**

```bash
npm --prefix backend run check
npm --prefix backend run test:p2-2-renter-api
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/server/src/contracts/customerRenter.ts backend/server/src/tests/p22RenterApiContract.test.ts
git commit -m "feat(api): add authenticated customer DTO contracts"
```

---

### Task 2: Make Profile and Account Summary fail closed

**Files:**
- Modify: `backend/server/src/app.ts`
- Test: `backend/server/src/tests/p22RenterApiContract.test.ts`

**Interfaces:**
- Consumes `toCustomerProfileDto()` and `toCustomerAccountSummaryDto()` from Task 1.
- Produces canonical Profile GET/PATCH and truthful Account Summary route behavior.

- [ ] **Step 1: Add RED route tests for canonical failure semantics**

Use the existing `ExpressServerApp` test pattern and temporary monkey-patching of repository methods. Cover these exact outcomes:

```ts
// Profile DB error must be 500, not phone/memory fallback success.
const originalGetById = userDb.getById;
(userDb as any).getById = async () => { throw new Error('db down'); };
try {
  const res = await app.handleHttpRequest('GET', '/api/v1/customer/profile', customerHeaders);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);
} finally {
  (userDb as any).getById = originalGetById;
}

// Account booking read error must be 500, not a zero summary.
const originalGetByCustomerId = bookingDb.getByCustomerId;
(bookingDb as any).getByCustomerId = async () => { throw new Error('db down'); };
try {
  const res = await app.handleHttpRequest('GET', '/api/v1/customer/account/summary', customerHeaders);
  assert.equal(res.statusCode, 500);
  assert.notDeepEqual(res.body.data, {
    confirmedBookingsCount: 0,
    upcomingStaysCount: 0,
    totalBookingsCount: 0,
    totalDepositsPaidEgp: 0,
  });
} finally {
  (bookingDb as any).getByCustomerId = originalGetByCustomerId;
}
```

Add canonical no-row Profile behavior and malformed account monetary value behavior.

- [ ] **Step 2: Run RED**

```bash
npm --prefix backend run test:p2-2-renter-api
```

Expected: current fallback/`.catch(() => [])` behavior causes at least the new failure-semantic assertions to fail.

- [ ] **Step 3: Implement minimal route hardening**

For Profile GET, replace fallback chain with a single canonical read:

```ts
let user: any;
try {
  user = await userDb.getById(customerId);
} catch {
  return {
    statusCode: 500,
    body: { success: false, error: { code: 'CUSTOMER_PROFILE_QUERY_FAILED', message: 'تعذر تحميل بيانات الحساب حالياً' }, timestamp },
  };
}
if (!user) {
  return {
    statusCode: 404,
    body: { success: false, error: { code: 'CUSTOMER_IDENTITY_NOT_FOUND', message: 'تعذر العثور على حساب المستأجر' }, timestamp },
  };
}
```

Return `toCustomerProfileDto(user)` in both GET and successful PATCH read-back.

For Account Summary, remove `.catch(() => [])`; catch the canonical read at route level and return `CUSTOMER_ACCOUNT_SUMMARY_QUERY_FAILED`. Build a raw summary object only after successful reads and pass it through `toCustomerAccountSummaryDto()` before returning.

Do not modify booking lifecycle or payment/account-wallet routes.

- [ ] **Step 4: Run GREEN + auth regression**

```bash
npm --prefix backend run check
npm --prefix backend run test:p2-2-renter-api
npm --prefix backend run test:p12-identity-session
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/server/src/app.ts backend/server/src/tests/p22RenterApiContract.test.ts
git commit -m "fix(api): make renter profile and account reads fail closed"
```

---

### Task 3: Harden Customer booking create/list/detail response privacy

**Files:**
- Modify: `backend/server/src/app.ts`
- Test: `backend/server/src/tests/p22RenterApiContract.test.ts`

**Interfaces:**
- Consumes Task 1 booking DTO functions.
- Must not alter `bookingDb.create()` atomic RPC or P1.4/P1.5/P1.6 business logic.

- [ ] **Step 1: Add RED privacy and IDOR tests**

Inject a repository booking object containing all forbidden fields and assert exact Customer DTO keys for list/detail/create.

Add assertions like:

```ts
const forbiddenBookingKeys = [
  'ownerId', 'customerId', 'guestPhone', 'financialSummary',
  'solaCommissionAmount', 'ownerNetDepositAmount',
  'commissionOnRemainingBalance', 'ownerPayoutStatus',
];

for (const booking of listRes.body.data) {
  for (const key of forbiddenBookingKeys) {
    assert.equal(key in booking, false, `Customer booking leaked ${key}`);
  }
}
```

For detail, Customer A requesting a booking whose canonical `customerId` is Customer B must not receive data. Preserve the existing protected-route behavior (`403 FORBIDDEN_BOOKING_ACCESS`) unless current route convention is deliberately non-enumerating.

For create, poison the mocked created RPC row/financial summary with commission and Owner fields and assert they are absent from the `201` response.

- [ ] **Step 2: Run RED**

```bash
npm --prefix backend run test:p2-2-renter-api
```

Expected: existing direct hydrated-object responses violate the new allowlist assertions.

- [ ] **Step 3: Map all Customer booking responses explicitly**

In `app.ts`:

```ts
const customerCreated = toCustomerBookingCreateResult(created);
```

Return `customerCreated`, never `{ ...created }`.

For list:

```ts
const customerBookings = bookings.map((booking) => toCustomerBookingListItem(booking));
```

For detail, perform ownership check using the internal canonical booking first, then:

```ts
const detail = toCustomerBookingDetail(booking);
```

Mapper validation failure must become a `500 CUSTOMER_BOOKING_RESPONSE_INVALID` (or one consistent scoped code) rather than a partially valid Customer response.

- [ ] **Step 4: Run GREEN + booking regressions**

```bash
npm --prefix backend run check
npm --prefix backend run test:p2-2-renter-api
npm --prefix backend run test:p1-4-availability
npm --prefix backend run test:p1-5-atomic-booking
npm --prefix backend run test:p1-6-wallet-ledger
```

Expected: PASS with no Phase 1 behavior changes.

- [ ] **Step 5: Commit**

```bash
git add backend/server/src/app.ts backend/server/src/tests/p22RenterApiContract.test.ts
git commit -m "fix(api): enforce customer-safe booking responses"
```

---

### Task 4: Add Migration 028 with the approved atomic Favorites RPC

**Files:**
- Create: `backend/database/migrations/028_customer_favorites.sql`
- Test: `backend/server/src/tests/p22RenterApiContract.test.ts`

**Interfaces:**
- Produces table `public.customer_favorites`.
- Produces `public.konfrm_add_customer_favorite(UUID, UUID)`.
- No live application in this task.

- [ ] **Step 1: Add RED static migration-contract tests**

Read the migration text and assert the exact security/atomicity contract:

```ts
import fs from 'node:fs';
import path from 'node:path';

const migration028 = fs.readFileSync(
  path.resolve('database/migrations/028_customer_favorites.sql'),
  'utf8'
);

for (const required of [
  'CREATE TABLE public.customer_favorites',
  'customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE',
  'property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE',
  'PRIMARY KEY (customer_id, property_id)',
  'ENABLE ROW LEVEL SECURITY',
  'konfrm_add_customer_favorite',
  'SECURITY INVOKER',
  'SET search_path = public, pg_temp',
  "status = 'PUBLISHED'",
  "verification_status = 'VERIFIED'",
  'ON CONFLICT (customer_id, property_id)',
  'REVOKE ALL ON FUNCTION',
  'FROM PUBLIC, anon, authenticated',
  'GRANT EXECUTE ON FUNCTION',
  'TO service_role',
  "VALUES ('028_customer_favorites.sql')",
]) {
  assert.ok(migration028.includes(required), `Migration 028 missing: ${required}`);
}

assert.ok(/REVOKE\s+ALL\s+ON\s+TABLE\s+public\.customer_favorites\s+FROM\s+PUBLIC,\s*anon,\s*authenticated/i.test(migration028));
assert.ok(!/SECURITY\s+DEFINER/i.test(migration028), 'Favorites RPC must not be SECURITY DEFINER');
```

Add an assertion that no `CREATE POLICY` grants direct `anon`/`authenticated` access.

- [ ] **Step 2: Run RED**

```bash
npm --prefix backend run test:p2-2-renter-api
```

Expected: FAIL because migration 028 is absent.

- [ ] **Step 3: Create the migration**

Use this bounded structure:

```sql
BEGIN;

CREATE TABLE public.customer_favorites (
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (customer_id, property_id)
);

CREATE INDEX customer_favorites_customer_created_idx
  ON public.customer_favorites(customer_id, created_at DESC);

ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.customer_favorites FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.customer_favorites TO service_role;

CREATE OR REPLACE FUNCTION public.konfrm_add_customer_favorite(
  p_customer_id UUID,
  p_property_id UUID
)
RETURNS TABLE (
  "customerId" UUID,
  "propertyId" UUID,
  "createdAt" TIMESTAMPTZ
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.customer_favorites (customer_id, property_id)
  SELECT p_customer_id, p_property_id
  FROM public.properties
  WHERE id = p_property_id
    AND deleted_at IS NULL
    AND status = 'PUBLISHED'
    AND verification_status = 'VERIFIED'
  ON CONFLICT (customer_id, property_id)
  DO UPDATE SET created_at = customer_favorites.created_at
  RETURNING customer_id AS "customerId", property_id AS "propertyId", created_at AS "createdAt";
$$;

REVOKE ALL ON FUNCTION public.konfrm_add_customer_favorite(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.konfrm_add_customer_favorite(UUID, UUID)
  TO service_role;

INSERT INTO public.schema_migrations (version)
VALUES ('028_customer_favorites.sql')
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

If PostgreSQL reports name ambiguity in the `ON CONFLICT`/`RETURNING` expressions during safe local migration testing, qualify the table aliases while preserving the exact behavior. Do not change to SECURITY DEFINER or split the operation into two calls.

- [ ] **Step 4: Run GREEN**

```bash
npm --prefix backend run test:p2-2-renter-api
npm --prefix backend run check
```

Expected: static migration contract PASS. Do not apply to production.

- [ ] **Step 5: Commit**

```bash
git add backend/database/migrations/028_customer_favorites.sql backend/server/src/tests/p22RenterApiContract.test.ts
git commit -m "feat(db): add canonical customer favorites persistence"
```

---

### Task 5: Add `favoriteDb` and exact Worker/PostgREST support

**Files:**
- Modify: `backend/server/src/services/dbRepository.ts`
- Modify: `backend/server/src/services/dbClient.ts`
- Test: `backend/server/src/tests/p22RenterApiContract.test.ts`

**Interfaces:**
- Produces:

```ts
favoriteDb.getByCustomerId(customerId: string): Promise<CustomerFavoriteRow[]>
favoriteDb.add(customerId: string, propertyId: string): Promise<CustomerFavoriteRow | null>
favoriteDb.remove(customerId: string, propertyId: string): Promise<void>
```

- `add()` uses only `SELECT * FROM konfrm_add_customer_favorite($1, $2)`.

- [ ] **Step 1: Add RED repository/adapter tests**

Test canonical SQL shapes and fetch behavior. The repository SQL must be stable and narrow:

```ts
const FAVORITE_LIST_SQL = `SELECT customer_id AS "customerId", property_id AS "propertyId", created_at AS "createdAt"
 FROM customer_favorites WHERE customer_id = $1 ORDER BY created_at DESC`;

const FAVORITE_ADD_RPC_SQL = 'SELECT * FROM konfrm_add_customer_favorite($1, $2)';

const FAVORITE_REMOVE_SQL = `DELETE FROM customer_favorites WHERE customer_id = $1 AND property_id = $2
 RETURNING customer_id AS "customerId", property_id AS "propertyId", created_at AS "createdAt"`;
```

Stub `globalThis.fetch` and assert:

- list -> `/rest/v1/customer_favorites?customer_id=eq.<id>&select=customer_id,property_id,created_at&order=created_at.desc`;
- add -> `/rest/v1/rpc/konfrm_add_customer_favorite` with exactly `{ p_customer_id, p_property_id }`;
- remove -> `DELETE` to `customer_favorites` with both filters;
- add `[]` -> repository `null` eligibility miss;
- add one well-formed row -> success;
- add two rows -> throw;
- malformed `200` -> throw;
- list legitimate `[]` -> success;
- list HTTP/network/non-array -> throw;
- remove `[]` -> idempotent success;
- collision strings that merely mention the table/RPC must not match.

- [ ] **Step 2: Run RED**

```bash
npm --prefix backend run test:p2-2-renter-api
```

Expected: favorite repository/adapter operations absent.

- [ ] **Step 3: Implement `favoriteDb`**

Append a narrow repository section in `dbRepository.ts`:

```ts
export const favoriteDb = {
  async getByCustomerId(customerId: string) {
    const res = await queryDb(
      `SELECT customer_id AS "customerId", property_id AS "propertyId", created_at AS "createdAt"
       FROM customer_favorites WHERE customer_id = $1 ORDER BY created_at DESC`,
      [customerId]
    );
    return res.rows;
  },

  async add(customerId: string, propertyId: string) {
    const res = await queryDb(
      'SELECT * FROM konfrm_add_customer_favorite($1, $2)',
      [customerId, propertyId]
    );
    if (res.rows.length === 0) return null;
    if (res.rows.length !== 1) throw new Error('CUSTOMER_FAVORITE_ADD_ROW_COUNT_INVALID');
    return res.rows[0];
  },

  async remove(customerId: string, propertyId: string) {
    await queryDb(
      `DELETE FROM customer_favorites WHERE customer_id = $1 AND property_id = $2
       RETURNING customer_id AS "customerId", property_id AS "propertyId", created_at AS "createdAt"`,
      [customerId, propertyId]
    );
  },
};
```

- [ ] **Step 4: Implement exact Worker adapter branches**

In `dbClient.ts`, define normalized canonical constants for list/remove and exact placeholder validation for the two-argument RPC, following the same collision-safe approach as `konfrm_create_booking_request`.

RPC recognition must require exactly:

```text
SELECT * FROM konfrm_add_customer_favorite($1, $2)
```

After PostgREST response, validate array/cardinality and each consumed field before returning `pg.QueryResult`-shaped data.

For remove, send `Prefer: return=representation`; `[]` is legitimate idempotent success. Non-array JSON is malformed.

Do not add a generic fallback for unknown `customer_favorites` SQL.

- [ ] **Step 5: Run GREEN + collision regressions**

```bash
npm --prefix backend run check
npm --prefix backend run test:p2-2-renter-api
npm --prefix backend run test:p13-worker-adapter
npm --prefix backend run test:p1-5-atomic-booking
npm --prefix backend run test:p1-6-wallet-ledger
npm --prefix backend run test:p2-1-public-api
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/server/src/services/dbRepository.ts backend/server/src/services/dbClient.ts backend/server/src/tests/p22RenterApiContract.test.ts
git commit -m "feat(api): add narrow favorites database adapter"
```

---

### Task 6: Add authenticated Favorites routes with P2.1 public-property hydration

**Files:**
- Modify: `backend/server/src/app.ts`
- Test: `backend/server/src/tests/p22RenterApiContract.test.ts`

**Interfaces:**
- Consumes `favoriteDb`, `validateCustomerFavoriteRow`, `propertyDb.getPublicById`, `imageDb.getImagesByPropertyId`, `extractPublicImageUrls`, `toPublicPropertySearchItem`.

- [ ] **Step 1: Add RED route tests**

Cover:

```ts
GET    /api/v1/customer/favorites
POST   /api/v1/customer/favorites/:propertyId
DELETE /api/v1/customer/favorites/:propertyId
```

Assertions:

- no token -> `401`;
- Owner token -> `403`;
- Customer A list cannot return B rows;
- add eligible property -> `{ propertyId, isFavorite: true }`;
- duplicate add same result;
- `favoriteDb.add()` returning `null` -> public-safe `404`;
- remove missing -> `200 { isFavorite: false }`;
- list DB error -> `500`, not `[]`;
- saved property whose `getPublicById()` returns `null` is hidden, not auto-deleted;
- property/media read error -> `500`;
- returned favorite property object has exactly the P2.1 search-item keys.

- [ ] **Step 2: Run RED**

```bash
npm --prefix backend run test:p2-2-renter-api
```

Expected: routes absent.

- [ ] **Step 3: Implement Favorites routes inside protected Customer family**

For list:

```ts
let rows;
try {
  rows = await favoriteDb.getByCustomerId(customerId);
} catch {
  return { statusCode: 500, body: { success: false, error: { code: 'CUSTOMER_FAVORITES_QUERY_FAILED', message: 'تعذر تحميل المفضلة حالياً' }, timestamp } };
}

const items = [];
for (const raw of rows) {
  const favorite = validateCustomerFavoriteRow(raw);
  const property = await propertyDb.getPublicById(favorite.propertyId);
  if (!property) continue;
  const images = await imageDb.getImagesByPropertyId(favorite.propertyId);
  items.push(toPublicPropertySearchItem(property, extractPublicImageUrls(images)));
}
```

Wrap property/media hydration so actual query/malformed failure returns `500 CUSTOMER_FAVORITES_HYDRATION_FAILED`; only a truthful `null` public property is skipped.

For add:

```ts
const saved = await favoriteDb.add(customerId, propertyId);
if (!saved) {
  return { statusCode: 404, body: { success: false, error: { code: 'FAVORITE_PROPERTY_NOT_AVAILABLE', message: 'هذه الوحدة غير متاحة للحفظ حالياً' }, timestamp } };
}
validateCustomerFavoriteRow(saved);
return { statusCode: 200, body: { success: true, data: { propertyId, isFavorite: true }, timestamp } };
```

For remove, call only `favoriteDb.remove(customerId, propertyId)` and return `isFavorite: false` on successful/idempotent DB completion.

- [ ] **Step 4: Run GREEN**

```bash
npm --prefix backend run check
npm --prefix backend run test:p2-2-renter-api
npm --prefix backend run test:p2-1-public-api
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/server/src/app.ts backend/server/src/tests/p22RenterApiContract.test.ts
git commit -m "feat(api): add canonical customer favorites routes"
```

---

### Task 7: Replace Customer local Favorites and stale account/profile authority

**Files:**
- Create: `customer-app/src/utils/customerFavorites.ts`
- Modify: `customer-app/src/App.tsx`
- Modify/Test: `customer-app/src/utils/customerTruthfulState.test.ts`

**Interfaces:**
- Produces a narrow helper API:

```ts
fetchCustomerFavorites(token: string): Promise<CustomerPropertyItem[]>
addCustomerFavorite(propertyId: string, token: string): Promise<void>
removeCustomerFavorite(propertyId: string, token: string): Promise<void>
```

- App derives `favoriteIds` from canonical returned items.

- [ ] **Step 1: Add RED Customer tests**

Add deterministic helper/state tests that prove:

- canonical Profile `{ fullName: null, email: null }` remains null and does not merge saved values;
- successful favorites response restores IDs/items;
- favorites failed fetch is an error, not empty success;
- add/remove non-2xx throws;
- signed-out Favorites state is `UNAUTHORIZED`, not `SUCCESS []`;
- pending guest favorite property id is preserved through auth completion;
- failed write restores prior heart state if an optimistic path is used.

For the pure helper, use a fetch stub:

```ts
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(JSON.stringify({
  success: true,
  data: [{ id: 'property-1', title: 'شاليه', unitType: 'CHALET', address: 'مراسي', bedrooms: 2, bathrooms: 2, maxGuests: 4, basePricePerNight: 5000, currency: 'EGP', images: [] }],
}), { status: 200, headers: { 'Content-Type': 'application/json' } });
try {
  const favorites = await fetchCustomerFavorites('token');
  assert.deepEqual(favorites.map((p) => p.id), ['property-1']);
} finally {
  globalThis.fetch = originalFetch;
}
```

- [ ] **Step 2: Run RED**

```bash
npm --prefix customer-app run test:truthful-state
```

Expected: helper/state behavior absent or stale merge assertion fails.

- [ ] **Step 3: Implement the narrow Favorites helper**

`customerFavorites.ts` must:

- use `getApiUrl('/customer/favorites')`;
- send `Authorization: Bearer <token>`;
- validate `success` + expected data shape enough to prevent malformed success;
- throw on failed/malformed reads/writes;
- never accept `customerId`.

- [ ] **Step 4: Integrate truthful profile/account/Favorites state in `App.tsx`**

Make these bounded changes:

1. Profile success stores `json.data` exactly; remove `|| parsedSaved?.fullName/email` resurrection.
2. Add `accountSummaryError` and clear/set it truthfully; a failed fetch must not leave an old/zero-looking confirmed state.
3. Replace local-only `favorites: string[]` authority with canonical Favorite items/IDs plus explicit load state:

```ts
type FavoritesLoadState = 'UNAUTHORIZED' | 'LOADING' | 'SUCCESS' | 'ERROR';
const [favoriteProperties, setFavoriteProperties] = useState<CustomerPropertyItem[]>([]);
const [favoritesLoadState, setFavoritesLoadState] = useState<FavoritesLoadState>('UNAUTHORIZED');
const favoriteIds = favoriteProperties.map((p) => p.id);
```

4. On authenticated bootstrap/login, fetch canonical Favorites.
5. On logout, clear canonical Favorite state and pending Favorite intent.
6. Guest heart press stores a dedicated `sola_customer_pending_favorite_property_id`, opens auth, and does not mark saved.
7. After auth success, if a pending Favorite id exists, call canonical add, refresh Favorites, clear the pending key only on success.
8. For signed-in toggle, prefer a pessimistic write: disable/dedupe while request is in flight, call add/remove, then refetch or update from confirmed response. On failure leave prior state and show a scoped error.
9. Favorites tab renders from `favoriteProperties`, not from the current Explore `properties.filter(...)` set; this ensures a favorite remains renderable after a different search filter.
10. Signed-out Favorites tab shows authentication-required state, not “0 saved”.

Do not redesign cards/navigation or booking/payment/chat UI.

- [ ] **Step 5: Run GREEN**

```bash
npm --prefix customer-app run test:truthful-state
npm --prefix customer-app run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add customer-app/src/App.tsx customer-app/src/utils/customerFavorites.ts customer-app/src/utils/customerTruthfulState.test.ts
git commit -m "feat(customer): use canonical favorites and truthful account state"
```

---

### Task 8: Put P2.2 into CI and run the full deterministic release-candidate gate

**Files:**
- Modify: `.github/workflows/ci-validation.yml`
- Test: all touched suites

**Interfaces:**
- CI must run the focused P2.2 backend suite on PRs that touch Backend or workflow files.
- No production deployment from the implementation branch/PR.

- [ ] **Step 1: Add P2.2 to Backend CI**

In the Backend critical-test block, append exactly:

```yaml
          npm run test:p2-2-renter-api
```

Do not change the existing push/deploy condition in this product task; CI hardening is a separate Mission Control task.

- [ ] **Step 2: Run backend deterministic gate**

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
```

Expected: every command exits 0.

- [ ] **Step 3: Run Customer deterministic gate**

```bash
npm --prefix customer-app run test:truthful-state
npm --prefix customer-app run build
```

Expected: PASS.

- [ ] **Step 4: Run diff/scope gate**

```bash
git diff --check
git status --short
git diff --name-only 198a00ea39083932012f54144f93fb7516204024...HEAD
```

Expected changed paths are limited to the implementation surface defined at the top of this plan. Any Owner/Admin/payment/chat/wallet/KYC/unrelated migration path is a STOP condition unless explained by a strictly necessary test fixture and separately reviewed.

- [ ] **Step 5: Commit CI wiring**

```bash
git add .github/workflows/ci-validation.yml
git commit -m "ci: validate P2.2 renter API contract"
```

- [ ] **Step 6: Push candidate, open one PR, and wait for exact-head CI**

Push only the candidate branch. Open one PR to `main`. Do not merge. Record:

```text
BASE_MAIN_SHA=198a00ea39083932012f54144f93fb7516204024
FINAL_CANDIDATE_SHA=<git rev-parse HEAD>
PR=<number>
CI_RUN_ID=<exact-head run>
```

The agent must not apply Migration 028 live.

- [ ] **Step 7: Produce machine-readable closure-candidate report**

Return exactly these fields:

```text
RESULT: P2_2_IMPLEMENTATION_CANDIDATE_READY | P2_2_IMPLEMENTATION_BLOCKED
START_SHA: <candidate starting SHA>
FINAL_SHA: <candidate final SHA>
BASE_SHA: 198a00ea39083932012f54144f93fb7516204024
PR: <number or NONE>
CHANGED_PATHS:
- <path>
AUTOMATED_GATES:
- <command>: PASS|FAIL
SEMANTIC_GATES:
- PROFILE_CANONICAL_FAIL_CLOSED: PASS|FAIL
- ACCOUNT_ERROR_NOT_ZERO: PASS|FAIL
- BOOKING_CUSTOMER_DTO_PRIVACY: PASS|FAIL
- BOOKING_IDOR: PASS|FAIL
- FAVORITES_RPC_ATOMIC: PASS|FAIL
- FAVORITES_RPC_SECURITY_INVOKER: PASS|FAIL
- FAVORITES_RPC_SERVICE_ROLE_ONLY: PASS|FAIL
- FAVORITES_CUSTOMER_SCOPE: PASS|FAIL
- FAVORITES_NONPUBLIC_HIDDEN_INTENT_RETAINED: PASS|FAIL
- WORKER_MATCHERS_EXACT: PASS|FAIL
- CUSTOMER_FAVORITES_CANONICAL: PASS|FAIL
- CUSTOMER_WRITE_FAILURE_TRUTHFUL: PASS|FAIL
LIVE_MUTATIONS: NONE
DEPLOYMENT: NONE
MERGE: NONE
UNRESOLVED:
- NONE | <specific blocker>
```

Do not call P2.2 closed or publication-ready. ChatGPT performs independent diff/SHA/adversarial verification first; Codex is used only after deterministic findings are cleared.

---

## Pre-Codex Review Checklist for the Orchestrator

Before requesting scarce final review, independently verify the exact final candidate for these known failure classes:

```text
[ ] Customer DTOs contain no broad spread from hydrated booking rows.
[ ] No ownerId / Owner contact / commission / Owner net / wallet / ledger / payout leak.
[ ] Required Customer DTO values are type/semantic validated before response.
[ ] Profile has no phone or memory fallback.
[ ] Canonical profile null is not replaced by local cache.
[ ] Account DB failure cannot become zero summary.
[ ] Booking creation still calls only migration-026 atomic RPC path.
[ ] Migration 028 contains only expected table/index/RLS/ACL/RPC/registration DDL.
[ ] Add RPC is SECURITY INVOKER and search_path is public, pg_temp.
[ ] Add RPC execute is revoked from PUBLIC/anon/authenticated and granted only to service_role.
[ ] Add RPC performs property visibility check and insert atomically.
[ ] Worker add matcher requires exact function name + exactly two placeholders.
[ ] Worker list/remove SQL matchers are exact and collision-tested.
[ ] Add 0/1/>1 cardinality is handled explicitly.
[ ] Remove includes both customer_id and property_id filters.
[ ] Favorites list DB/media failure cannot become [].
[ ] Non-public saved property is hidden without deleting intent.
[ ] Customer favorites restore after authenticated bootstrap/login.
[ ] Guest Favorite intent is distinct from booking intent.
[ ] Failed Favorite write cannot remain visually saved.
[ ] Notifications/Payment/Chat business behavior is untouched.
[ ] No live migration, merge, deployment, or production row mutation occurred.
```

Only after this checklist is clean should Codex receive one exact-SHA final semantic/security/privacy review.

# P2.2 — Pre-Codex Correction 01

**Mode:** BOUNDED_CORRECTION / SINGLE_WRITER / STRICT_TDD

**Base main SHA:** `198a00ea39083932012f54144f93fb7516204024`

**Starting candidate SHA:** `7fc10e4e31579942687ef8eaa4f560c2f698ab7f`

**Candidate branch:** `validation/p2-2-rc`

**Authority:** Founder-approved P2.2 Design Spec + RPC amendment + Implementation Plan. This correction closes deterministic gaps found by ChatGPT before Codex. It must not change product business rules, booking lifecycle, finance formulas, availability, Notifications, Payment, Chat, KYC, Owner/Admin behavior, or publication architecture.

---

## 1. Verified deterministic findings

### F1 — Duplicate Favorite add is not executable with the approved ACL

Migration 028 currently grants `service_role` only `SELECT, INSERT, DELETE` on `customer_favorites`, while the `SECURITY INVOKER` add RPC uses `ON CONFLICT ... DO UPDATE`. The duplicate/idempotent path therefore requires an UPDATE privilege that the approved table ACL deliberately does not grant.

**Required correction:** keep the table ACL at `SELECT, INSERT, DELETE` only. Do **not** grant UPDATE. Keep the RPC `SECURITY INVOKER`. Implement duplicate idempotency without UPDATE privilege, inside PostgreSQL and within the same RPC transaction. Preferred bounded implementation: `LANGUAGE plpgsql`; `INSERT ... SELECT ... ON CONFLICT DO NOTHING RETURNING ...`; if no inserted row, return the existing saved row only when the target property is still currently public. Missing/non-public target returns zero rows. The RPC must still return exactly 0 or 1 row.

Do not use SECURITY DEFINER. Do not split into external check-then-insert calls. Do not add another RPC.

### F2 — Favorite Worker adapter accepts malformed success rows

Current add adapter validates IDs only and does not validate `createdAt`; it also does not prove returned IDs match the requested Customer/property. Current remove adapter accepts arbitrary object rows, malformed fields, and multiple rows as success. List validation is also weaker than the approved row contract.

**Required correction:** for Favorite list/add/remove HTTP-200 responses, validate every consumed row before success:
- `customerId/customer_id`: valid UUID;
- `propertyId/property_id`: valid UUID;
- `createdAt/created_at`: valid timestamp string;
- add: 0 rows is eligibility miss; exactly 1 valid row is success; >1 error; returned Customer/property must equal request params;
- remove: 0 rows is idempotent success; at most 1 row; a returned row must be fully valid and match both request params; >1/malformed/mismatch is error;
- list: every row fully valid; malformed row fails the whole read.

Keep exact collision-safe matchers. No generic SQL support.

### F3 — Favorite POST/DELETE path IDs are not validated and POST does not validate the returned canonical row

**Required correction:** validate `:propertyId` as UUID before DB work. Invalid path id -> truthful `400` scoped error. After `favoriteDb.add()`, validate the returned Favorite row and verify both IDs match JWT Customer + path property before returning `isFavorite: true`. Malformed/mismatched row -> `500`, never success.

### F4 — Customer booking DTO manufactures plausible data

Current `customerRenter.ts`:
- defaults missing `unitType` to `CHALET`;
- manufactures missing `createdAt` using `new Date()`;
- silently drops malformed image entries.

**Required correction:** required canonical fields fail closed. No CHALET default. No generated timestamp. Images may be a genuine empty array, but if the source images value exists it must be an array and every element consumed must be a non-empty URL string (or a supported image object with non-empty canonical URL); malformed entries fail the DTO instead of being filtered out.

### F5 — Booking Customer DTO shape regressed the actual Customer UI contract

`BookingDetailModal` consumes `guestsCount` and detail property fields (`description`, `bedrooms`, `bathrooms`, `maxGuests`, `pricePerNight`, `amenities`, `houseRules`). Current DTO emits `guests` and its detail mapper does not add those fields. Current list property also omits `locationName` used by the Customer list adapter.

**Required correction:** make the explicit DTO match the approved/current Customer journey:
- use `guestsCount` in Customer list/detail/create DTOs (no parallel authoritative `guests` field needed);
- list property includes `id,title,images,address,region,resortName,locationName` plus only deliberately required safe fields;
- detail property explicitly extends the list property with `description,bedrooms,bathrooms,maxGuests,pricePerNight,amenities,houseRules`;
- remove `PublicPropertyDetail | any`; use an explicit typed detail property shape;
- no Owner/private/admin/internal-finance fields.

### F6 — Create response exceeds the approved Customer finance contract

Current create DTO returns a nested `financialSummary` with payment-status/method fields. The approved P2.2 Customer finance boundary is flat decision data only: total + deposit + remaining + `EGP`.

**Required correction:** create response must expose only the explicit Customer-safe booking/create fields; remove nested `financialSummary` from the Customer response. Internal `created.financialSummary` remains server-side evidence for persistence and mapper input but is not serialized to the Customer.

Do not change the migration-026 booking RPC or finance formulas.

### F7 — Account Summary can still turn malformed deposit data into zero

Current route uses `Number(b.depositAmount) || 0` when summing confirmed deposits.

**Required correction:** a confirmed booking with missing/non-finite/negative deposit amount must cause a scoped `500` response; it must not contribute a fabricated zero. Genuine numeric zero is only accepted if the canonical business contract truly permits it; current deposit semantics are positive for a real stay, so preserve existing canonical booking rules and validate accordingly. Add deterministic malformed-deposit coverage.

### F8 — Customer helpers/UI still accept or display non-canonical truth

Current Customer code:
- `fetchCustomerFavorites()` validates only `Array.isArray`, not item shapes;
- add/remove do not verify response `propertyId` equals the requested id;
- `mergeCustomerProfile()` defaults missing status to `ACTIVE` and omits `phoneVerifiedAt`;
- Account Summary failure sets an error but can leave a previous successful summary visible;
- Favorite write failure is swallowed with no user-visible retryable error;
- Favorites header displays `(0)` during loading/error/unauthorized states.

**Required correction:**
1. Runtime-validate every Favorite property item returned by the server using the P2.1 public search DTO expectations, including `currency === 'EGP'`, finite semantic numeric fields, and strict image strings. Malformed item -> error, not partial collection.
2. Add/remove response must contain exactly the requested `propertyId` and expected boolean; mismatch -> error.
3. Canonical Profile normalization must preserve canonical nulls and fields including `phoneVerifiedAt`; it must not invent status `ACTIVE` or other server fields. If required canonical profile fields are malformed/missing, fail rather than fabricate.
4. After authentication, canonical `/customer/profile` must still be fetched/confirmed even if prototype login supplied a provisional `user`; do not persist provisional data as canonical truth. On canonical profile failure, do not leave stale cached profile presented as confirmed.
5. On Account Summary read failure, clear/invalidate stale summary before showing error; do not display old metrics as current.
6. Favorite write failure must leave the previous heart state unchanged **and** surface a compact user-visible retryable error. No silent catch. Avoid a visual redesign.
7. Favorites heading must not show an authoritative `(0)` unless the canonical load state is SUCCESS with zero items. During loading/error/unauthorized, omit the numeric count or use a non-numeric placeholder.

---

## 2. Strict TDD evidence required

Add the failing regression assertions **before** production corrections and record RED evidence for at least these cases:

### Backend / migration
- migration ACL has no service-role UPDATE grant and RPC duplicate strategy contains no `DO UPDATE`;
- RPC remains SECURITY INVOKER, pinned search_path, service_role-only execute;
- Favorite add adapter rejects missing/invalid createdAt;
- Favorite add rejects returned customer/property mismatch;
- Favorite remove rejects malformed one-row response;
- Favorite remove rejects >1 rows;
- Favorite list rejects malformed UUID/timestamp row;
- invalid Favorite path UUID returns 400 without repository mutation;
- Favorite POST malformed/mismatched repository row returns 500;
- booking DTO missing unitType throws;
- booking DTO missing createdAt throws;
- booking DTO malformed image element throws;
- booking list/detail uses `guestsCount`;
- detail DTO contains the actual safe fields needed by `BookingDetailModal`;
- list DTO contains `locationName`;
- create DTO contains no `financialSummary` and no internal finance;
- Account Summary malformed deposit -> 500, not zero-looking success.

### Customer
- malformed Favorite item makes list helper reject;
- add/remove mismatched `propertyId` rejects;
- canonical Profile null remains null and missing required canonical status/timestamp is not defaulted;
- Account Summary malformed payload rejects;
- stale summary is invalidated on failed canonical refresh (test pure helper/state seam or a deterministic source assertion if no render harness exists);
- failed Favorite write preserves prior heart state and sets a user-visible error state;
- Favorites non-success header cannot claim `(0)`.

Do not weaken tests merely to accommodate the current implementation.

---

## 3. Expected changed paths ONLY

- `backend/database/migrations/028_customer_favorites.sql`
- `backend/server/src/contracts/customerRenter.ts`
- `backend/server/src/services/dbClient.ts`
- `backend/server/src/app.ts`
- `backend/server/src/tests/p22RenterApiContract.test.ts`
- `customer-app/src/utils/customerFavorites.ts`
- `customer-app/src/App.tsx`
- `customer-app/src/utils/customerTruthfulState.test.ts`

If another path is genuinely required, STOP and report before changing it.

Do not modify `dbRepository.ts`, `backend/package.json`, CI, Owner/Admin, BookingDetailModal, Payment/Chat/Wallet files, or any other migration.

---

## 4. Forbidden actions

- no live Migration 028 application;
- no Supabase/Storage production mutation;
- no live Favorite rows;
- no deploy;
- no merge;
- no main push;
- no force-push;
- no second RPC;
- no SECURITY DEFINER;
- no finance/booking/availability lifecycle changes;
- no Notifications/Payment/Chat product changes.

---

## 5. Required local validation after GREEN

Run all:

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

Push only `validation/p2-2-rc`.

Do **not** open a PR in this correction run unless explicitly instructed by ChatGPT after independent verification. ChatGPT will open the PR after the corrected candidate passes its pre-Codex audit.

---

## 6. Required report

Return exactly:

```text
RESULT: P2_2_PRE_CODEX_CORRECTION_01_PASS | P2_2_PRE_CODEX_CORRECTION_01_BLOCKED
STARTING_CANDIDATE_SHA: 7fc10e4e31579942687ef8eaa4f560c2f698ab7f
FINAL_CANDIDATE_SHA: <sha>
BASE_MAIN_SHA: 198a00ea39083932012f54144f93fb7516204024
EXACT_CHANGED_PATHS:
- <path>
RED_TEST_EVIDENCE:
- <finding/test/failure before fix>
FIX_SUMMARY:
- <finding -> exact correction>
EXACT_LOCAL_TEST_RESULTS:
- <command>: PASS|FAIL
LIVE_MUTATIONS: NONE
DEPLOYMENT: NONE
MERGE: NONE
UNRESOLVED:
- NONE | <specific blocker>
```

Do not call P2.2 CLEAN, CLOSED, final, publication-ready, or Codex-ready. ChatGPT must independently verify the corrected SHA and then open the PR / exact-head CI gate.
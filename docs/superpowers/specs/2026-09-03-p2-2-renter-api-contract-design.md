# P2.2 Renter API Contract Design

**Status:** WRITTEN SPEC APPROVED — FAVORITES RPC AMENDMENT APPROVED IN CHAT  
**Roadmap:** Phase 2 — Backend Contracts / P2.2 Renter APIs  
**Base `main` SHA:** `198a00ea39083932012f54144f93fb7516204024`  
**Design branch:** `spec/p2-2-renter-api-contract`  
**Risk class:** Architectural / authenticated identity + privacy + persistence boundary  
**Implementation authority:** Founder-approved KONFRM product rules + current repository truth. This spec must not change booking lifecycle, availability, finance, payment timing, chat policy, notifications architecture, KYC, cancellation/refund, or publication rules except for the explicitly approved Favorites persistence move and narrow atomic Favorites RPC below.

---

## 1. Objective

P2.2 establishes a stable, truthful authenticated Customer/Renter backend contract on top of the published Phase 1 persistence boundaries and P2.1 public API contract.

P2.2 must:

1. make JWT `sub` the only authenticated Customer identity authority;
2. make Profile and Account Summary canonical and fail-closed;
3. preserve P1.4/P1.5/P1.6 booking authority and atomicity;
4. expose explicit Customer-safe booking DTOs instead of broad internal hydrated objects;
5. prevent Owner/private/internal-finance leakage;
6. add canonical persistent Favorites;
7. replace Customer component-local Favorites authority with backend state;
8. preserve truthful loading/empty/error distinctions;
9. keep Notifications, Payment and Chat outside this task except regression protection.

This is a contract/privacy/truthfulness hardening task plus one new persistence capability: Customer Favorites.

---

## 2. Founder Decisions Recorded

The Founder explicitly approved:

- moving **Favorites persistence** from the previous P5.4 implementation slot into P2.2;
- keeping Customer Notifications in **P9.1**;
- keeping Payment work in **P10**;
- keeping Chat work in **P12**;
- using one narrow atomic Favorites RPC because the deployed Cloudflare Worker does not execute arbitrary SQL and a two-call `check property -> insert favorite` flow would be race-prone.

The former P5.4 slot may later contain Favorites UX/polish/acceptance work, but not the canonical persistence foundation.

---

## 3. Current Reality at Base

### 3.1 Protected Customer identity

Protected `/api/v1/customer/*` routes verify JWTs and derive `customerId` from `jwt.sub`. Public P2.1 routes remain public and are not reclassified by P2.2.

### 3.2 Profile is not fully canonical

Current Profile GET can fall back from `userDb.getById(customerId)` to phone lookup and then in-memory `dbUsersStore`. A DB failure or identity mismatch can therefore appear as successful profile data.

The Customer App also merges successful canonical `null` profile fields with stale localStorage values.

### 3.3 Account Summary can fabricate zero-looking success

Current account summary catches a booking read failure as `[]` and derives zeros. A database outage can therefore look like a genuine account with zero bookings.

### 3.4 Booking creation already has the required persistence authority

`POST /api/v1/customer/bookings` already performs canonical property/price/availability validation and creates booking + financial summary atomically through migration 026 / `konfrm_create_booking_request` with initial status `PENDING_OWNER_APPROVAL`.

P2.2 preserves this boundary.

### 3.5 Booking reads are too broad

Customer list/detail currently return hydrated booking objects that can contain `ownerId`, internal Customer identifiers and financial fields including commission, Owner net and payout state.

P2.2 moves the privacy boundary to explicit Customer DTO mappers.

### 3.6 Favorites are local-only

The Customer App currently stores Favorites in component state. They disappear on reload/session/device changes and can look persisted when they are not.

### 3.7 Notifications are not Customer-ready

The current canonical notifications model is Owner-specific. P2.2 must not invent Customer notifications or unread counts.

---

## 4. Chosen Architecture

Keep the existing `/api/v1/customer/*` family and existing Customer App structure.

Introduce only:

1. explicit authenticated Customer DTO helpers;
2. fail-closed Profile and Account Summary reads;
3. explicit Customer booking create/list/detail responses;
4. migration `028_customer_favorites.sql`;
5. a narrow `favoriteDb` repository;
6. one exact Worker/PostgREST RPC adapter branch for atomic Favorite add;
7. exact Worker branches for Favorite list/remove SQL shapes;
8. minimal Customer App integration for canonical Favorites and truthful account/profile state.

No new API namespace, broad controller rewrite, repository-wide refactor, generic SQL execution path, or Notifications subsystem.

---

## 5. Authenticated Customer Identity Contract

For every protected P2.2 route:

- valid JWT required;
- role must be exactly `ROLE_CUSTOMER`;
- Customer identity is exactly `jwt.sub`;
- client body/query values cannot override Customer identity;
- phone number is profile data, not an alternate authorization key;
- an Owner token for the same human does not authorize Customer protected routes.

Profile, Favorites, My Bookings and Booking Details must use the verified JWT subject directly. They must not silently switch to another user by phone or memory fallback.

---

## 6. Customer Profile Contract

### 6.1 GET `/api/v1/customer/profile`

Source of truth: `users.id = jwt.sub` only.

Behavior:

- canonical row -> `200` explicit DTO;
- canonical no-row -> truthful account identity/not-found response;
- DB/query failure -> `500`;
- no `dbUsersStore` fallback;
- no phone fallback;
- no stale success.

Allowed DTO:

```ts
interface CustomerProfileDto {
  id: string;
  phoneNumber: string;
  phoneVerifiedAt: string | null;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}
```

No Owner capability/KYC fields.

### 6.2 PATCH `/api/v1/customer/profile`

Preserve the current supported editable fields only: `fullName`, `email`, and existing `avatarUrl` semantics.

Rules:

- validate accepted types/formats server-side;
- scope update to `jwt.sub` only;
- client-supplied identity is never authoritative;
- persistence failure -> error;
- read back the canonical row after write and verify requested fields before success;
- return the same explicit Customer profile DTO;
- no new avatar storage/upload flow.

### 6.3 Customer profile cache semantics

LocalStorage is cache/bootstrap only.

After canonical profile success, replace cached server-owned fields exactly. Canonical `null` remains `null`; stale local `fullName`, `email`, avatar or status must not be merged back.

On canonical profile failure, do not render cached values as a confirmed authenticated profile. Preserve truthful retry/error behavior.

---

## 7. Customer Account Summary

`GET /api/v1/customer/account/summary`

Allowed response:

```ts
interface CustomerAccountSummaryDto {
  confirmedBookingsCount: number;
  upcomingStaysCount: number;
  totalBookingsCount: number;
  totalDepositsPaidEgp: number;
}
```

Rules:

- successful canonical zero-booking read -> legitimate zero values;
- booking/financial query failure -> `500`, never zeros;
- counts must be finite non-negative integers;
- money must be finite and non-negative;
- malformed canonical values fail closed instead of coercing to `0`;
- no commission, Owner net, wallet, ledger or payout data.

No new aggregate table/materialized view is required.

---

## 8. Booking Request Creation

`POST /api/v1/customer/bookings`

Client intent remains only:

```ts
interface CustomerCreateBookingRequest {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}
```

Client cannot authoritatively supply Customer/Owner identity, status, price, total, deposit, commission, Owner net, remaining balance or payment state.

Preserve exactly:

- Customer identity = JWT subject;
- property publication eligibility;
- server price authority;
- availability revalidation;
- 2–30 nights;
- guest capacity validation;
- initial `PENDING_OWNER_APPROVAL`;
- `PENDING_OWNER_APPROVAL` does not block availability;
- migration 026 atomic booking + financial-summary RPC;
- no sequential write fallback;
- no payment before Owner approval;
- manual-block conflict remains truthful.

The successful Customer response must be explicitly allowlisted. It must not spread the broad internal `created` object.

---

## 9. Customer Booking Read Contracts

### 9.1 GET `/api/v1/customer/bookings`

Repository read remains scoped by `customer_id = jwt.sub`.

Return explicit list DTOs only:

```ts
interface CustomerBookingListItem {
  id: string;
  bookingNumber: string;
  propertyId: string;
  property: {
    id: string;
    title: string;
    images: string[];
    address: string;
    region: string;
    resortName: string;
    locationName: string;
  };
  checkIn: string;
  checkOut: string;
  nights: number;
  guestsCount: number;
  status: string;
  totalStay: number;
  depositAmount: number;
  remainingAmount: number;
  currency: 'EGP';
  createdAt: string;
  confirmedAt: string | null;
  rejectedAt: string | null;
}
```

A currently required Customer-safe UI field may be added deliberately, but broad spreading is prohibited.

### 9.2 GET `/api/v1/customer/bookings/:id`

Authorization order:

1. valid Customer JWT;
2. canonical booking read;
3. booking exists;
4. `booking.customerId === jwt.sub`;
5. construct Customer DTO.

Customer A must never obtain Customer B's booking by changing the path id.

Detail may extend the list item with Customer-decision property data required by the current `BookingDetailModal`: description, bedrooms, bathrooms, maxGuests, pricePerNight, amenities and houseRules.

P2.2 does not redefine booking snapshot lifecycle semantics.

### 9.3 Customer booking privacy denylist

Create/list/detail must never expose:

- `ownerId`;
- Owner phone/email/contact;
- internal `customerId` when not required by the UI;
- persisted guest phone;
- `solaCommissionAmount`;
- commission rate/internal commission fields;
- `ownerNetDepositAmount`;
- `commissionOnRemainingBalance`;
- `ownerPayoutStatus`;
- wallet/ledger/payout/provider internals;
- Admin/audit metadata.

Customer-visible finance is exactly total + deposit + remaining + currency.

Required numeric/string fields must be validated before response mapping. Missing/malformed required canonical values return server error; they must not become `0`, `''`, `NaN`, or another plausible-looking value.

---

## 10. Migration 028 — Canonical Customer Favorites

Create:

`backend/database/migrations/028_customer_favorites.sql`

### 10.1 Table

```sql
CREATE TABLE public.customer_favorites (
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (customer_id, property_id)
);

CREATE INDEX customer_favorites_customer_created_idx
  ON public.customer_favorites(customer_id, created_at DESC);
```

The composite primary key is the duplicate-prevention constraint. No generated Favorite id is required.

### 10.2 RLS / table privileges

Migration 028 must:

- enable RLS on `public.customer_favorites`;
- create no direct `anon` or `authenticated` application policy;
- revoke direct table privileges from `PUBLIC`, `anon`, `authenticated`;
- grant only the backend `service_role` the required `SELECT`, `INSERT`, `DELETE` table operations;
- make no unrelated schema changes.

A Favorite row never authorizes exposure of an unpublished/unverified/deleted property.

### 10.3 Approved atomic add RPC

Migration 028 must create exactly one narrow add RPC:

```sql
public.konfrm_add_customer_favorite(
  p_customer_id UUID,
  p_property_id UUID
)
```

Required characteristics:

- `SECURITY INVOKER`;
- `SET search_path = public, pg_temp`;
- performs publication eligibility check and insert atomically in PostgreSQL;
- only inserts while target property is `deleted_at IS NULL`, `status = 'PUBLISHED'`, `verification_status = 'VERIFIED'`;
- `ON CONFLICT (customer_id, property_id)` is idempotent and preserves original `created_at`;
- returns exactly one row for an eligible/public target, including the already-saved case;
- returns zero rows for missing/non-public/ineligible target;
- never returns more than one row;
- no business fields beyond `customerId`, `propertyId`, `createdAt`;
- `REVOKE ALL ... FROM PUBLIC, anon, authenticated`;
- `GRANT EXECUTE ... TO service_role` only.

Conceptual body:

```sql
INSERT INTO public.customer_favorites (customer_id, property_id)
SELECT p_customer_id, p_property_id
FROM public.properties
WHERE id = p_property_id
  AND deleted_at IS NULL
  AND status = 'PUBLISHED'
  AND verification_status = 'VERIFIED'
ON CONFLICT (customer_id, property_id)
DO UPDATE SET created_at = public.customer_favorites.created_at
RETURNING customer_id, property_id, created_at;
```

The implementation may adjust SQL syntax needed for PostgreSQL name resolution/return aliases, but not these semantics.

Migration 028 must record itself in `public.schema_migrations` using the repository's current migration convention.

### 10.4 Favorite semantics

- identity comes only from JWT `sub`;
- one Customer/property pair exists at most once;
- duplicate add is idempotent;
- remove of absent record is idempotent;
- an existing Favorite row survives temporary property unpublication;
- a non-public saved property is hidden from Customer-visible Favorites but the intent is not auto-deleted;
- a new Favorite can only be created while the property is public;
- Favorites do not snapshot price/media/Owner/finance data.

---

## 11. Favorites Repository Boundary

Introduce narrow `favoriteDb` operations:

```ts
favoriteDb.getByCustomerId(customerId: string)
favoriteDb.add(customerId: string, propertyId: string)
favoriteDb.remove(customerId: string, propertyId: string)
```

### 11.1 Add

`favoriteDb.add` must call only:

```sql
SELECT * FROM konfrm_add_customer_favorite($1, $2)
```

Semantics:

- exactly one returned row -> saved/idempotently already saved;
- zero rows -> target missing or not currently public;
- more than one row or malformed row -> fail closed;
- no two-call `check then insert` fallback.

### 11.2 Remove

Use a single Customer/property-scoped delete. Legitimate zero-row delete is successful `isFavorite: false`. It must never affect another Customer.

### 11.3 List

List canonical Favorite rows for `jwt.sub`, ordered `created_at DESC`.

The route hydrates visible properties through the P2.1 public property/media boundary. Missing/unpublished/unverified/deleted saved properties are hidden without deleting the Favorite row.

Favorite table query failure, public property query failure, media failure or malformed response must return error, not empty success.

---

## 12. Favorites API

All require `ROLE_CUSTOMER`.

### GET `/api/v1/customer/favorites`

Returns `PublicPropertySearchItem[]` from the P2.1 allowlist, newest saved first among currently visible saved properties.

- genuine zero visible Favorites -> `200 []`;
- DB/media/malformed failure -> error, never `[]`.

### POST `/api/v1/customer/favorites/:propertyId`

Success:

```ts
{ propertyId: string; isFavorite: true }
```

Uses JWT Customer identity and the atomic RPC. Missing/non-public target returns a public-safe not-found/eligibility response without revealing publication internals.

### DELETE `/api/v1/customer/favorites/:propertyId`

Success:

```ts
{ propertyId: string; isFavorite: false }
```

Idempotent, scoped to JWT Customer + path property, and allowed even if the property later became non-public.

---

## 13. Worker / PostgREST Boundary

The Worker adapter must remain narrow and exact.

P2.2 adds only:

1. exact matcher for `SELECT * FROM konfrm_add_customer_favorite($1, $2)` -> `/rest/v1/rpc/konfrm_add_customer_favorite`;
2. exact matcher for Favorite list SQL;
3. exact matcher for Favorite remove SQL.

Requirements:

- no broad `includes('customer_favorites')` matching;
- no generic SQL capability;
- RPC body maps only `p_customer_id` and `p_property_id`;
- strict HTTP error handling;
- RPC response must be a JSON array;
- add: `0` rows is an eligibility miss, `1` row is success, `>1` rows fails closed;
- validate UUID/string/timestamp fields actually consumed;
- list: distinguish legitimate `[]` from failed/malformed response;
- remove: legitimate zero-row delete is allowed, malformed response is not;
- remove REST filters include both `customer_id` and `property_id`;
- collision tests prove the new matchers do not capture existing P1.5/P1.6/P2.1 SQL shapes.

Existing booking/payment/wallet/public-property adapter behavior must remain unchanged.

---

## 14. Customer App Integration

P2.2 is not a visual redesign.

### 14.1 Canonical Favorites state

Authenticated bootstrap/login loads `GET /customer/favorites`.

Customer App derives heart IDs and Favorites-tab property items from the canonical response. Refresh/reload/login restores from the backend.

### 14.2 Guest Favorite interception

Guest heart press:

1. do not show a persistent-looking saved state;
2. open existing Customer auth;
3. preserve only the intended `propertyId` in a dedicated pending Favorite intent;
4. after successful authentication, submit the canonical add request;
5. settle saved UI only after success.

Do not overload booking date/guest interception state.

### 14.3 Write truthfulness

Pessimistic toggle is preferred for minimal risk. If optimistic interaction is retained, it must know previous state, issue request immediately, rollback on failure, display a retryable error, and prevent double-submit.

### 14.4 Favorites destination states

Distinguish:

- signed out / authentication required;
- loading;
- success non-empty;
- genuine success empty;
- error + retry.

Signed-out state must not look like a successful authenticated `0 Favorites` read.

### 14.5 Profile/account truthfulness

Canonical profile `null` overwrites stale local cache. Profile/account/favorite fetch failures produce scoped truthful state rather than silent stale/zero/empty presentation.

Existing booking/account visual hierarchy remains; only minimal state/error UI corrections are permitted.

---

## 15. Error Contract

Continue the existing response envelope. P2.2 does not perform the P2.6 repository-wide error normalization.

Preserve distinctions:

- missing/invalid auth -> `401`;
- wrong role -> `403`;
- out-of-scope booking ownership -> existing protected-route non-enumeration/forbidden behavior;
- invalid request -> `400`;
- missing/non-public Favorite add target -> public-safe `404`/eligibility response;
- booking availability conflict -> `409`;
- DB/adapter/malformed response -> `500`;
- legitimate empty collection -> `200 []`.

No canonical read failure may become plausible empty/zero success.

---

## 16. Testing Strategy

Create focused suite:

`backend/server/src/tests/p22RenterApiContract.test.ts`

and package script:

`test:p2-2-renter-api`.

Tests must cover:

### Identity / Profile

- missing/invalid/wrong-role token;
- JWT `sub` is only identity;
- GET profile explicit DTO;
- no row versus DB failure;
- no phone/memory fallback;
- PATCH subject scoping, validation, persistence failure and read-back verification;
- no private/broad fields;
- Customer canonical null replaces stale local value.

### Account Summary

- genuine zero account;
- correct canonical counts/amount;
- DB failure -> 500;
- malformed value -> fail closed;
- no internal finance.

### Booking Create/List/Detail

- P1.4/P1.5/P1.6 regressions remain green;
- create request cannot choose identity/finance;
- create/list/detail explicit allowlists;
- Customer A/B IDOR isolation;
- forbidden Owner/internal-finance fields absent even if mock repository injects them;
- malformed required DTO values fail closed;
- total/deposit/remaining remain accurate.

### Migration 028

Static contract tests assert:

- exact table/columns/FKs/composite primary key/index;
- RLS enabled;
- direct PUBLIC/anon/authenticated table privileges revoked;
- service_role SELECT/INSERT/DELETE only as needed;
- exact RPC signature;
- RPC is `SECURITY INVOKER` with `search_path = public, pg_temp`;
- atomic `INSERT ... SELECT` publication gate;
- idempotent conflict behavior preserving original timestamp;
- RPC PUBLIC/anon/authenticated execute revoked, service_role execute granted;
- schema_migrations record;
- no unrelated DDL.

### Repository / Worker

- exact list matcher;
- exact remove matcher;
- exact two-argument add RPC matcher;
- collision tests;
- add body and cardinality `0/1/>1`;
- malformed HTTP 200 fail closed;
- list `[]` versus failure;
- remove both-scope filters + idempotent zero-row semantics;
- no generic SQL path.

### Favorites Routes

- Customer A/B isolation;
- public target add;
- duplicate add;
- non-public target cannot be newly saved;
- previously saved non-public target is hidden but record retained;
- remove works for non-public saved target;
- DB/property/media failures do not become empty;
- response properties reuse P2.1 public DTO.

### Customer Integration

- authenticated bootstrap restores Favorites;
- guest intent survives auth and is written canonically;
- failed add/remove cannot remain visually saved;
- signed-out Favorites is not authenticated-looking empty;
- profile canonical null overwrites stale cache;
- account/profile/favorite failures are truthful;
- Customer build remains green.

---

## 17. Migration / Publication Safety

Migration 028 is a production mutation and is not applied during implementation or review.

Publication order:

1. migration authored on candidate;
2. deterministic migration/security/adapter tests;
3. exact stable candidate review;
4. Founder Publication Gate explains live consequences;
5. only after explicit authorization, apply Migration 028 live;
6. independently verify table/FKs/PK/index/RLS/table ACL/function signature/security/search_path/function ACL/schema_migrations;
7. only then merge the exact reviewed application candidate;
8. allow normal main Worker/Pages deployment;
9. verify exact main SHA, CI and deployment metadata;
10. perform non-destructive live Favorites verification where practical.

No implementation agent may apply Migration 028, mutate production Favorites rows, merge main or deploy before Founder approval.

---

## 18. Quality Gates

Before Founder Publication Review:

1. exact base/head SHA;
2. expected changed paths only;
3. migration 028 static security/contract tests;
4. backend TypeScript check;
5. focused P2.2 suite;
6. relevant P1.2 auth/profile regressions;
7. P1.4 availability regressions;
8. P1.5 atomic booking regressions;
9. P1.6 wallet/finance privacy regressions;
10. P2.1 public API regressions;
11. Customer truthful-state/Favorites tests;
12. Customer production build;
13. `git diff --check`;
14. exact-head PR CI;
15. pre-Codex adversarial review;
16. one final Codex semantic/security/privacy review on exact final candidate SHA;
17. no live mutation/merge/deploy before Founder authorization.

Build/CI green alone is not closure evidence.

---

## 19. Pre-Codex Adversarial Checks

Before spending Codex quota, deterministically verify:

- no Customer booking DTO broad-spreads internal rows;
- no commission/Owner-net/payout/wallet/ledger leak;
- no Profile phone/memory fallback;
- no Account Summary failure -> zeros;
- no required numeric booking field defaults to zero;
- Favorites identity always JWT-scoped;
- Favorite add uses only the approved atomic RPC, never check-then-insert;
- RPC is SECURITY INVOKER, pinned search_path, service_role-only execute;
- Favorite remove cannot affect another Customer;
- Favorite GET hides non-public rows without interpreting failures as empty;
- Worker matchers are exact/collision-tested;
- malformed REST/RPC HTTP 200 fails closed;
- cardinality rules are explicit;
- failed Favorite UI write cannot remain visually saved;
- no fake notifications/unread model;
- no P1.4/P1.5/P1.6 business-rule drift;
- candidate truth, live DB truth and deployment truth remain distinct.

Any deterministic finding is corrected before final Codex review.

---

## 20. Explicit Non-Goals

P2.2 must not implement or redesign:

- Customer Notifications/unread/push providers;
- payment provider or payment lifecycle;
- chat architecture/retention/moderation/attachments;
- Owner/Admin APIs;
- cancellation/refund/disputes/reviews;
- wallet release/payout;
- booking statuses;
- availability blocking semantics;
- pricing/commission/deposit rules;
- Customer/Owner role-switching UX;
- KYC;
- Customer visual redesign;
- Favorites ranking/folders/sharing/notes/realtime subscriptions;
- repository-wide error/OpenAPI/controller refactor;
- generic Worker SQL execution;
- any RPC other than the Founder-approved `konfrm_add_customer_favorite` unless a new blocker causes stop/report.

---

## 21. Expected Implementation Surface

Expected paths only unless evidence proves a required compatibility fixture:

### Backend

- `backend/database/migrations/028_customer_favorites.sql` — new;
- `backend/server/src/contracts/customerRenter.ts` — new preferred focused DTO/validation boundary;
- `backend/server/src/app.ts`;
- `backend/server/src/services/dbRepository.ts`;
- `backend/server/src/services/dbClient.ts`;
- `backend/server/src/tests/p22RenterApiContract.test.ts` — new;
- `backend/package.json`;
- `.github/workflows/ci-validation.yml` only to execute the focused P2.2 test if current CI does not pick it up otherwise.

### Customer

- `customer-app/src/App.tsx`;
- `customer-app/src/utils/customerFavorites.ts` — preferred focused API/state helper if extraction improves testability;
- `customer-app/src/utils/customerTruthfulState.test.ts` or a focused Favorites test file;
- booking detail component only if a DTO type compatibility correction is actually required.

Unexpected Owner/Admin/payment/chat/wallet/KYC or unrelated migration changes require stop/report.

---

## 22. Implementation Ownership

- **ChatGPT:** orchestration, task contract, deterministic/adversarial verification, publication;
- **Antigravity:** primary Single Writer for implementation/tests/Customer integration and the bounded migration/RPC if it remains exactly within this spec;
- **ZCode:** only if irreducible SQL/RLS/transaction complexity appears; not automatic;
- **Codex:** one final semantic/security/privacy review after deterministic gates are clean.

---

## 23. Stop Conditions

Stop and report instead of improvising if:

- Favorites requires changing unified identity;
- an RPC other than the approved add RPC becomes necessary;
- the approved RPC cannot remain SECURITY INVOKER/service_role-only;
- direct authenticated table access becomes necessary;
- a new Favorite business rule is needed;
- booking DTO correctness requires lifecycle/finance/snapshot semantic changes;
- live schema materially conflicts with migration assumptions;
- `customer_favorites` or migration 028 already exists unexpectedly;
- Worker support cannot remain narrow/exact;
- Customer notifications become required;
- Payment/Chat behavior must materially change;
- implementation escapes expected product boundaries;
- any live mutation/deployment is proposed before Founder authorization.

---

## 24. Definition of Done

P2.2 is closed only when evidence proves:

- JWT-sub scoped protected Customer contracts;
- Profile DB failure is not replaced by fallback;
- canonical nulls do not resurrect stale cache;
- Profile writes are verified before success;
- Account zero is distinct from read failure;
- Booking create/list/detail use explicit Customer allowlists;
- IDOR isolation holds;
- no Owner/private/internal-finance leakage;
- Customer sees only total/deposit/remaining/currency finance;
- Migration 028 + atomic add RPC pass security/contract review;
- Favorites persist across reload/login;
- add/remove are idempotent and Customer-scoped;
- only currently public saved properties are displayed;
- hidden saved intent remains persisted;
- Favorite read/write failures remain truthful;
- Worker adapter is exact and fail-closed;
- Notifications remain P9.1, Payment P10, Chat P12;
- exact-head CI is green;
- final Codex review is CLEAN on exact candidate SHA;
- Founder explicitly authorizes Migration 028 + publication;
- live migration metadata/security + post-merge deployment are independently verified.

Only then may the project advance to P2.3.

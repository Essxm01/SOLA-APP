# P2.2 Renter API Contract Design

**Status:** DESIGN APPROVED IN CHAT — WRITTEN SPEC PENDING FOUNDER REVIEW  
**Roadmap:** Phase 2 — Backend Contracts / P2.2 Renter APIs  
**Base `main` SHA:** `198a00ea39083932012f54144f93fb7516204024`  
**Design branch:** `spec/p2-2-renter-api-contract`  
**Risk class:** Architectural / authenticated identity + privacy + persistence boundary  
**Implementation authority:** Founder-approved product rules + current KONFRM repository truth. This document must not change booking lifecycle, availability, finance, payment timing, chat policy, notifications architecture, KYC, cancellation/refund, or publication rules unless explicitly stated below.

---

## 1. Objective

P2.2 establishes a stable, truthful, authenticated Customer/Renter backend contract on top of the already-published Phase 1 persistence boundaries and P2.1 public API contract.

The goal is **not** to rebuild the Customer App or replace the existing `/api/v1/customer/*` route family. The goal is to harden and complete the authenticated Renter surface so that:

1. JWT subject identity is the only authenticated Customer identity authority;
2. Profile and account reads fail closed instead of falling back to stale or fake-success data;
3. booking creation preserves P1.4/P1.5/P1.6 server authority and atomic persistence;
4. Customer booking list/detail/create responses use explicit Customer-safe DTO allowlists;
5. internal finance, Owner/private and persistence-only fields cannot leak to the Customer;
6. Favorites become a real, canonical, persistent Customer capability backed by the shared database/backend architecture;
7. the Customer App uses canonical Favorites instead of component-local state;
8. genuine empty state remains distinct from failed canonical reads;
9. Notifications, Payment and Chat are not pulled forward into P2.2 beyond regression protection.

P2.2 is therefore primarily a **contract/privacy/truthfulness hardening task plus one bounded new persistence capability: Customer Favorites**.

---

## 2. Founder Decision Recorded by This Spec

The Founder explicitly approved moving **Favorites persistence** from its prior P5.4 implementation slot into P2.2 so that the backend contract exists before later Customer UX polishing.

The roadmap interpretation for this task is therefore:

### In P2.2

- Customer Profile contract;
- Customer account-summary truthfulness required by the current authenticated Account surface;
- Booking request creation contract regression protection;
- My Bookings contract;
- Booking Details contract;
- canonical persistent Favorites contract and minimal Customer integration.

### Explicitly deferred

- Customer Notifications persistence/read/unread model -> **P9.1**;
- Payment implementation/rework -> **P10**;
- Chat implementation/rework -> **P12**;
- Favorites visual redesign/polish -> later Customer UX work, including the former P5.4 UX slot as needed.

Existing Payment and Chat code must be preserved unless a direct P2.2 regression requires a minimal compatibility correction. Their product/business behavior is not redesigned here.

---

## 3. Current Reality at the Approved Base

### 3.1 Authentication and route family

Protected `/api/v1/customer/*` routes require a valid `ROLE_CUSTOMER` JWT. The server derives `customerId` from the verified JWT `sub` claim.

Public P2.1 routes remain separately accessible without authentication and are not reclassified by P2.2.

### 3.2 Profile exists but is not fully fail-closed

Current routes:

- `GET /api/v1/customer/profile`
- `PATCH /api/v1/customer/profile`

The current GET path attempts the canonical user read, then may fall back by phone and finally to an in-memory `dbUsersStore`. That can allow a database failure or identity-resolution defect to appear as successful canonical profile data.

The Customer App also merges successful server profile data with locally persisted `fullName` / `email` values when the server returns null. This can resurrect stale local values after canonical validation.

### 3.3 Account summary can fabricate zero-looking success

Current route:

- `GET /api/v1/customer/account/summary`

The implementation currently catches booking-read failures as `[]` and derives zero counts and zero deposit totals. A canonical database failure can therefore look like an honest account with no bookings.

### 3.4 Booking creation is already a protected Phase 1 boundary

Current route:

- `POST /api/v1/customer/bookings`

It already performs the important P1.4/P1.5/P1.6 work:

- authenticated Customer identity from JWT;
- canonical property lookup;
- publication/verification eligibility check;
- canonical price authority;
- availability revalidation;
- stay and guest validation;
- atomic booking + financial summary persistence through migration 026 / `konfrm_create_booking_request`;
- initial status `PENDING_OWNER_APPROVAL`;
- no payment before Owner approval.

P2.2 must preserve this implementation boundary rather than replace it.

### 3.5 Booking reads currently expose an overly broad hydrated object

Current routes:

- `GET /api/v1/customer/bookings`
- `GET /api/v1/customer/bookings/:id`

`bookingDb.getByCustomerId()` and `bookingDb.getById()` hydrate a broad internal booking object. That object currently includes fields such as:

- `ownerId`;
- `customerId`;
- internal financial summary fields such as `solaCommissionAmount`;
- `ownerNetDepositAmount`;
- `commissionOnRemainingBalance`;
- `ownerPayoutStatus`;
- other persistence-oriented data not required by the Customer decision flow.

The Customer route currently returns the hydrated object directly for list/detail, so the Customer API privacy boundary is not explicit.

### 3.6 Favorites are currently local-only UI state

The Customer App currently keeps Favorites in component-local state:

```ts
const [favorites, setFavorites] = useState<string[]>([]);
```

The heart toggle mutates that local array only. Favorites therefore disappear across reload/session/device boundaries and the UI can present a saved-looking state without canonical persistence.

Founder-approved product authority already says Favorites is a real Customer capability that must eventually be persistent and canonical through shared backend/database architecture. P2.2 is now the approved persistence point.

### 3.7 Notifications are not Customer-ready

The current canonical `notifications` model is Owner-specific (`owner_id NOT NULL`), and the repository exposes Owner notification reads. There is no accepted canonical Customer notification/unread model.

P2.2 must not manufacture Customer notification endpoints or fake unread counts. That subsystem remains P9.1.

---

## 4. Chosen Architecture

### Approach: Harden the existing authenticated route family + add one canonical Favorites persistence boundary

Keep the existing `/api/v1/customer/*` URLs and current Customer application structure.

Introduce:

1. explicit authenticated Customer DTO mappers/validators;
2. fail-closed Profile and Account Summary reads;
3. explicit Customer-safe booking responses for create/list/detail;
4. migration `028_customer_favorites.sql` for canonical Favorites persistence;
5. a narrow `favoriteDb` repository boundary;
6. exact Worker/PostgREST support for the new favorite SQL shapes;
7. minimal Customer App integration to replace local Favorites authority.

Do **not** introduce a new API namespace, a controller/framework rewrite, a broad repository refactor, or a notifications subsystem.

---

## 5. Authenticated Customer Identity Contract

For every protected P2.2 route:

- authentication requires a valid JWT;
- JWT role must be exactly `ROLE_CUSTOMER`;
- canonical Customer identity is `jwt.sub`;
- client body/query/path data must never select or override the Customer identity;
- a phone number may be returned as Customer profile data where approved, but it is not an alternate authorization key for protected reads/writes;
- Owner capability on the same human identity does not authorize an Owner token to call Customer protected routes.

### Identity resolution rule

P2.2 Profile, Favorites, My Bookings and Booking Details must use the verified JWT subject directly.

They must not silently recover a different user by phone if `userDb.getById(jwt.sub)` fails or returns no row.

A missing canonical Customer identity is an authenticated-account error/not-found condition, not permission to substitute an in-memory or phone-matched user.

---

## 6. Customer Profile Contract

### 6.1 GET profile

`GET /api/v1/customer/profile`

#### Source of truth

Canonical `users` row selected by `id = jwt.sub` only.

#### Required behavior

- canonical read succeeds with one user -> `200` Customer profile DTO;
- canonical read succeeds with no user -> truthful not-found/account identity error;
- database/query failure -> `500` profile query error;
- no fallback to `dbUsersStore`;
- no fallback to phone lookup;
- no stale profile success fabricated from local/in-memory state.

#### Customer profile DTO

The response may contain only Customer-owned account fields needed by the current Account UI:

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

This contract does not add Owner capability/KYC fields to the Customer profile.

### 6.2 PATCH profile

`PATCH /api/v1/customer/profile`

Preserve the current supported editable fields unless implementation evidence requires a stop/report:

- `fullName`;
- `email`;
- `avatarUrl` only to the extent the current application already supports it.

Rules:

- server validates accepted input types and formats;
- update is scoped exclusively to `jwt.sub`;
- a client-supplied user/customer id is ignored/rejected and never authoritative;
- persistence failure returns error;
- after write, the route verifies the canonical updated row before returning success;
- the returned object uses the explicit Customer profile DTO.

P2.2 must not create a new avatar upload/storage flow.

### 6.3 Customer App profile cache semantics

Local storage is a bootstrap/cache mechanism only, not account truth.

After a successful canonical profile response:

- replace cached server-owned fields with the canonical response exactly;
- canonical `null` remains `null`;
- do not merge old local `fullName`, `email`, avatar or status values back over the server result.

On canonical profile failure:

- do not present stale cached values as a confirmed authenticated profile;
- preserve the existing truthful session/error policy from P0.2;
- expose a scoped retryable account/session error where appropriate rather than silently swallowing the failure.

---

## 7. Customer Account Summary Contract

`GET /api/v1/customer/account/summary`

This route is included because it is part of the current authenticated Account surface and currently violates the repository-wide rule **error is not empty/zero**.

### Required response fields

Preserve the current Customer-relevant summary unless a type correction is required:

```ts
interface CustomerAccountSummaryDto {
  confirmedBookingsCount: number;
  upcomingStaysCount: number;
  totalBookingsCount: number;
  totalDepositsPaidEgp: number;
}
```

### Truthfulness rules

- successful canonical read with zero bookings -> legitimate zero values;
- booking/financial read failure -> `500`, never a zero-looking success;
- all counts must be non-negative finite integers;
- monetary amount must be finite and non-negative;
- malformed canonical values must fail closed rather than be coerced to zero;
- Customer financial privacy applies: no commission, Owner net, wallet, ledger or payout figures.

The route may continue deriving the summary from canonical bookings/financial summaries; P2.2 does not require a new aggregate database table or materialized view.

---

## 8. Booking Request Creation Contract

`POST /api/v1/customer/bookings`

P2.2 treats this route as **preserve + harden response boundary**, not a new booking implementation.

### Request intent

Client supplies only booking intent:

```ts
interface CustomerCreateBookingRequest {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}
```

The client must not authoritatively supply:

- Customer id;
- Owner id;
- booking status;
- nightly price;
- total;
- deposit;
- commission;
- Owner net;
- remaining balance;
- payment state.

### Preserved server invariants

- Customer identity = JWT subject;
- property must exist and be bookable under current publication rules;
- server reads canonical price;
- server revalidates availability;
- stay length remains 2–30 nights;
- guest capacity remains server validated;
- `PENDING_OWNER_APPROVAL` remains the initial state;
- `PENDING_OWNER_APPROVAL` does not block availability;
- migration 026 remains the single atomic booking + financial-summary persistence boundary;
- no sequential fallback writes;
- no payment is taken before Owner approval;
- database/manual-block conflict remains a truthful conflict, not a generic success/failure fabrication.

### Creation response

The route must not return `...created` or another broad internal booking object directly to the Customer.

Successful creation must pass through the same explicit Customer-safe booking mapper used by authenticated booking reads, or an equally strict create DTO whose fields are a subset of the approved Customer booking contract.

Internal Owner/finance fields remain excluded.

---

## 9. Customer Booking Read Contracts

P2.2 introduces explicit DTO allowlists for authenticated Customer booking responses.

The internal repository may remain broader because Owner/Admin/server workflows also consume booking data. The privacy boundary belongs at the Customer contract mapper/route boundary.

### 9.1 My Bookings

`GET /api/v1/customer/bookings`

Repository query remains scoped by `customer_id = jwt.sub`.

The route must return an array of explicit `CustomerBookingListItem` DTOs.

Recommended contract:

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

If the existing UI requires a currently-present field not listed above, implementation may add it only when it is Customer-relevant and privacy-safe. The agent must not copy the entire hydrated object for convenience.

### 9.2 Booking Details

`GET /api/v1/customer/bookings/:id`

Authorization sequence:

1. valid Customer JWT;
2. canonical booking read;
3. booking exists;
4. `booking.customerId === jwt.sub`;
5. only then construct and return the Customer detail DTO.

A Customer must never obtain another Customer's booking by changing the path id.

The detail DTO may extend the list item with Customer-decision property fields currently required by `BookingDetailModal`, for example:

```ts
interface CustomerBookingDetail extends CustomerBookingListItem {
  property: {
    id: string;
    title: string;
    images: string[];
    address: string;
    region: string;
    resortName: string;
    locationName: string;
    description: string;
    bedrooms: number;
    bathrooms: number;
    maxGuests: number;
    pricePerNight: number;
    amenities: unknown[];
    houseRules: Record<string, unknown>;
  };
}
```

P2.2 does not redefine booking-snapshot lifecycle semantics. It sanitizes the current canonical booking composition. Any future switch between live property metadata and immutable booking snapshots belongs to the booking lifecycle phase unless a correctness blocker is proven.

### 9.3 Customer booking privacy denylist

The following must never appear in create/list/detail Customer responses, even if the repository object contains them:

- `ownerId`;
- Owner phone/email/contact data;
- internal `customerId` when not needed by the UI;
- guest phone persistence fields;
- `solaCommissionAmount`;
- commission rate/internal commission fields;
- `ownerNetDepositAmount`;
- `commissionOnRemainingBalance`;
- `ownerPayoutStatus`;
- wallet balances;
- wallet/ledger identifiers;
- payout data;
- provider transaction internals;
- Admin/audit metadata.

Customer-visible finance remains exactly the decision-relevant contract:

- total;
- deposit;
- remaining;
- currency.

### 9.4 Booking DTO fail-closed rules

Required numbers such as nights, guests, total, deposit, remaining and price must be finite and semantically valid.

Malformed/missing canonical required fields must return a server error rather than silently default to `0`, empty strings, or other plausible-looking values.

An honest optional null may remain null when the DTO defines it as optional/null.

---

## 10. Canonical Customer Favorites Persistence

### 10.1 Migration

P2.2 introduces one new migration:

`backend/database/migrations/028_customer_favorites.sql`

Target table:

```sql
CREATE TABLE public.customer_favorites (
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (customer_id, property_id)
);
```

A supporting index for Customer list ordering may be included:

```sql
CREATE INDEX customer_favorites_customer_created_idx
  ON public.customer_favorites(customer_id, created_at DESC);
```

The composite primary key is the canonical duplicate-prevention constraint. No generated Favorite id is required for the current product contract.

### 10.2 Database access/security posture

Favorites are a protected backend capability.

Migration 028 must:

- enable RLS on `customer_favorites`;
- create no direct `anon` or `authenticated` policy for prototype application access;
- revoke direct table privileges from `PUBLIC`, `anon`, and `authenticated` as appropriate to the current Supabase privilege model;
- permit the backend service role only the table operations it needs (`SELECT`, `INSERT`, `DELETE`);
- not introduce a SECURITY DEFINER RPC unless implementation proves a correctness requirement and stops for review first.

The public property API remains the source for public property visibility. A Favorite record is not authorization to expose an unpublished, unverified or deleted property.

### 10.3 Favorite semantics

- Customer identity comes only from JWT `sub`;
- client never sends authoritative `customerId`;
- one Customer/property pair can exist once;
- adding an already-saved property is idempotent;
- deleting an already-absent favorite is idempotent;
- Favorite record preserves the user's save intent if a property later becomes temporarily non-public;
- a non-public property is simply excluded from Customer-visible Favorites until it becomes public again or is permanently removed;
- saving a property is allowed only while that property is currently `PUBLISHED + VERIFIED` and not deleted;
- Favorites do not snapshot price, media, Owner details or financial information.

---

## 11. Favorites Repository and Atomicity Direction

Introduce a narrow repository such as `favoriteDb` rather than embedding raw SQL throughout route code.

Expected operations:

- `getByCustomerId(customerId)`;
- `add(customerId, propertyId)`;
- `remove(customerId, propertyId)`.

### 11.1 Add favorite

Preferred database semantics are one atomic SQL statement that inserts only if the target property is currently public, for example conceptually:

```sql
INSERT INTO customer_favorites (customer_id, property_id)
SELECT $1, $2
FROM properties
WHERE id = $2
  AND deleted_at IS NULL
  AND status = 'PUBLISHED'
  AND verification_status = 'VERIFIED'
ON CONFLICT (customer_id, property_id)
DO UPDATE SET created_at = customer_favorites.created_at
RETURNING customer_id, property_id, created_at;
```

The exact SQL may be adjusted for repository/Worker compatibility, but the semantics must remain:

- public eligibility checked by the database statement that performs the save;
- duplicate add returns an idempotent saved state;
- zero-row result means no eligible public property was saved;
- malformed multi-row/unexpected response fails closed.

No new RPC is expected for this bounded write.

### 11.2 Remove favorite

Delete is scoped by both:

- `customer_id = jwt.sub`;
- requested `property_id`.

Removing a missing Favorite returns a truthful idempotent `isFavorite: false` result rather than mutating any other Customer's data.

### 11.3 List favorites

`favoriteDb.getByCustomerId(jwt.sub)` returns canonical saved property ids ordered by `created_at DESC`.

The Customer route then hydrates each visible Favorite through the already-approved P2.1 public property boundary and canonical media reads.

Rules:

- truly missing/unpublished/unverified/deleted property -> skip from Customer-visible Favorites without deleting the saved intent;
- favorite table query failure -> error, not empty success;
- public property query failure -> error;
- media query/malformed media failure -> error;
- malformed favorite row -> error;
- final property shape reuses the P2.1 `PublicPropertySearchItem` DTO rather than creating a second broad property contract.

The implementation may optimize query count only if it preserves the same privacy/publication/fail-closed semantics. P2.2 does not require a broad join refactor.

---

## 12. Favorites API Contract

All Favorites endpoints are protected and require `ROLE_CUSTOMER`.

### 12.1 List

`GET /api/v1/customer/favorites`

Success:

```ts
PublicPropertySearchItem[]
```

The list contains only currently public saved properties, ordered by saved time newest-first unless a later approved UX decision changes ordering.

A successful canonical read with no visible saved properties returns `[]`.

A database/media failure must not return `[]`.

### 12.2 Add

`POST /api/v1/customer/favorites/:propertyId`

Success response data:

```ts
{
  propertyId: string;
  isFavorite: true;
}
```

Semantics:

- idempotent;
- property must currently be public (`PUBLISHED + VERIFIED`, not deleted);
- missing/non-public property returns a public-safe not-found/eligibility response without exposing unpublished state internals;
- Customer identity comes from JWT only.

### 12.3 Remove

`DELETE /api/v1/customer/favorites/:propertyId`

Success response data:

```ts
{
  propertyId: string;
  isFavorite: false;
}
```

Semantics:

- idempotent when already absent;
- can remove the Customer's saved record even if the property later became non-public;
- cannot remove another Customer's saved record.

---

## 13. Worker / PostgREST Boundary

The deployed backend uses a narrow Worker/PostgREST compatibility adapter for SQL shapes.

P2.2 Favorites must therefore add explicit support only for the exact new favorite repository operations required by this spec.

Requirements:

- exact/collision-safe normalized matchers;
- no broad `includes('customer_favorites')` dispatch that can capture unrelated future SQL;
- correct REST filters for both `customer_id` and `property_id` on scoped writes;
- strict HTTP error handling;
- strict response cardinality/shape validation;
- malformed HTTP 200 responses fail closed;
- add operation must not silently treat zero returned rows as a saved Favorite;
- list query must distinguish failed fetch from legitimate empty array;
- remove permits legitimate zero-row idempotent success but not malformed response shapes;
- no generic arbitrary-SQL capability is introduced.

Existing P1.5/P1.6 strict RPC/payment/wallet matchers and P2.1 public-property matchers must remain unchanged except for narrowly required non-overlap tests.

---

## 14. Customer App Integration

P2.2 is not a visual redesign.

### 14.1 Replace local Favorites authority

The current component-local Favorite array is no longer the source of truth after authentication.

For an authenticated Customer:

- initial Favorites state is loaded from `GET /customer/favorites`;
- Favorite heart state reflects canonical server state;
- Favorites tab renders server-returned public-safe property items;
- refresh/reload/login restores Favorites from the backend.

### 14.2 Guest Favorite interception

If a guest taps Favorite:

1. do not mutate a permanent-looking local Favorite state;
2. open the existing Customer authentication flow;
3. preserve the intended `propertyId` through the auth flow using a dedicated pending Favorite intent rather than overloading booking date/guest context;
4. after successful Customer authentication, submit the canonical Favorite write;
5. only then settle the UI into the saved state.

### 14.3 Optimistic interaction

A minimal optimistic heart toggle is allowed only if:

- previous state is known;
- the canonical request is issued immediately;
- failure rolls the heart back to the previous state;
- the user receives a truthful retryable error;
- no failed write remains visually presented as saved.

A simpler pessimistic toggle is acceptable if it provides clear progress and avoids double submissions.

### 14.4 Favorites destination while signed out

A signed-out Customer has no canonical Favorite collection.

The Favorites tab/destination must not render a credible `0 saved` state as if an authenticated collection was successfully read. It should require/signpost authentication using the existing Customer auth UX.

### 14.5 Favorite load states

The Favorites destination must distinguish:

- loading;
- successful non-empty list;
- successful genuine empty list;
- unauthorized/signed-out;
- error + retry.

### 14.6 Booking/Profile integration

The current Customer booking and account visual hierarchy remains. P2.2 may add scoped error/retry presentation needed to stop silent failures, but must not redesign the Customer information architecture.

---

## 15. Error and Response Contract

P2.2 continues the established envelope:

Successful response:

```json
{
  "success": true,
  "data": {},
  "timestamp": "ISO-8601"
}
```

Error response:

```json
{
  "success": false,
  "error": {
    "code": "STABLE_MACHINE_CODE",
    "message": "Arabic user-safe message"
  },
  "timestamp": "ISO-8601"
}
```

This task does not perform the repository-wide Error Contract normalization reserved for P2.6.

P2.2 must still use stable scoped error codes and preserve these distinctions:

- unauthenticated -> `401`;
- wrong role -> `403`;
- resource outside Customer ownership -> `403` or approved non-enumerating behavior according to the existing protected-route pattern;
- missing public Favorite target -> public-safe `404`/eligibility response;
- invalid request -> `400`;
- booking availability conflict -> `409`;
- canonical DB/adapter/malformed-response failure -> `500`;
- legitimate empty collection -> `200 []`.

No catch block may convert canonical failure into a plausible empty/zero success.

---

## 16. Testing Strategy

P2.2 requires a focused deterministic suite, preferably one dedicated contract suite plus existing regression suites.

Suggested new suite:

`backend/server/src/tests/p22RenterApiContract.test.ts`

with an explicit package script such as `test:p2-2-renter-api`.

### 16.1 Authentication / identity

Cover:

- missing token on each protected family -> 401;
- invalid token -> 401;
- Owner token -> 403;
- Customer JWT `sub` is the only identity used;
- client-supplied customer id cannot switch scope;
- Profile does not fall back by phone or memory when canonical id read fails.

### 16.2 Profile

Cover:

- successful GET explicit DTO;
- canonical no-row behavior;
- DB failure -> error, not memory fallback;
- PATCH scopes to JWT subject;
- validation errors;
- write failure;
- post-write canonical verification;
- no broad/private fields.

Customer tests must prove canonical null values replace stale cached values rather than being merged with localStorage.

### 16.3 Account summary

Cover:

- genuine no-booking account -> zero summary;
- canonical bookings -> correct counts;
- confirmed/upcoming semantics preserved;
- DB failure -> 500, never zeros;
- malformed financial value -> fail closed;
- no internal finance fields.

### 16.4 Booking create/list/detail

Preserve P1.4/P1.5/P1.6 regression suites and add P2.2 assertions for:

- create intent ignores client financial/identity authority;
- create response explicit allowlist;
- list Customer A only returns A's bookings;
- detail Customer A cannot read B's booking;
- list/detail/create omit Owner/private/internal-finance fields even when mocked repository objects contain them;
- required malformed DTO values fail closed;
- total/deposit/remaining remain accurate;
- no change to booking lifecycle or blocking rules.

### 16.5 Favorites migration contract

Static/deterministic migration assertions cover:

- exact table name/columns;
- FKs to `users` and `properties`;
- composite primary key/duplicate prevention;
- created timestamp;
- RLS enabled;
- no permissive anon/authenticated policy;
- restrictive/revoked direct privileges;
- service-role access required by backend;
- no unrelated schema changes.

### 16.6 Favorite repository / Worker adapter

Cover:

- exact matcher for list;
- exact matcher for add;
- exact matcher for remove;
- collision tests against similar SQL;
- list empty success versus HTTP/network/malformed failure;
- add idempotency;
- add zero-row public-ineligible result;
- add malformed/multi-row fail closed;
- remove correct Customer/property scoping;
- remove zero-row idempotent success;
- no broad arbitrary SQL adapter path.

### 16.7 Favorites route behavior

Cover:

- authenticated list;
- Customer A/B isolation;
- public property saved successfully;
- duplicate add remains one canonical row;
- missing/unpublished/unverified/deleted property cannot be newly saved;
- existing saved property that later becomes non-public is hidden but record is not auto-deleted;
- removal works even when property is no longer public;
- DB failure -> error, not empty collection;
- media/property hydration failure -> error;
- list DTO exactly reuses P2.1 public-safe property boundary.

### 16.8 Customer integration

Cover:

- favorites restore from server after authenticated bootstrap;
- guest Favorite triggers auth and preserves intended property;
- post-auth favorite is submitted canonically;
- failed add/remove does not leave false heart state;
- signed-out Favorites destination does not render authenticated-looking empty success;
- profile canonical null overwrites stale local cache;
- account/profile/favorites failures receive truthful state;
- existing booking request/detail flow still builds.

---

## 17. Migration and Publication Safety

Migration 028 is a production mutation and is **not** applied during implementation or review.

Expected lifecycle:

1. migration authored in the candidate branch;
2. deterministic migration-contract tests;
3. local/CI application only in safe test contexts if available;
4. exact final candidate review;
5. Founder Publication Gate explains live consequences;
6. only after explicit Founder authorization, apply Migration 028 live;
7. independently verify live table/constraints/RLS/ACL metadata;
8. only then merge the exact reviewed application candidate and allow normal Worker/Pages deployment;
9. verify exact main SHA, CI and live deployment evidence;
10. verify the live Favorites contract non-destructively where practical.

No agent may apply Migration 028, mutate production Favorites rows, merge to main or deploy before the Founder Publication Gate.

---

## 18. Quality Gates

Before final publication review:

1. exact base/head SHA evidence;
2. expected changed paths only;
3. migration 028 static contract evidence;
4. backend TypeScript check;
5. focused P2.2 contract suite;
6. P1.2 auth/profile regressions;
7. P1.4 availability regressions;
8. P1.5 atomic booking regressions;
9. P1.6 wallet/finance privacy regressions;
10. P2.1 public API regressions;
11. Customer truthful-state/auth integration tests;
12. Customer production build;
13. `git diff --check`;
14. exact-head PR CI;
15. pre-Codex adversarial review against the KONFRM Known Failure patterns;
16. one final Codex semantic/security/privacy review on the exact final candidate SHA;
17. no live mutation/deployment/merge before Founder approval.

Build/CI green alone is never closure evidence.

---

## 19. Pre-Codex Adversarial Checks Specific to P2.2

Before consuming Codex quota, verify deterministically:

- no Customer DTO uses broad object spreading from an internal booking row;
- no Customer response contains commission/Owner-net/payout/wallet/ledger fields;
- no Customer Profile read falls back to phone/memory after canonical failure;
- no Account Summary catch turns a failed query into zeros;
- no required numeric booking field is defaulted to zero;
- Favorites identity is always JWT-scoped;
- favorite add is atomic/idempotent and publication-gated;
- favorite remove cannot affect another Customer;
- Favorites GET hides non-public properties without interpreting query failure as hidden/empty;
- Worker matchers are exact and collision-tested;
- HTTP 200 malformed REST responses fail closed;
- cardinality expectations are explicit (0/1/>1);
- Customer optimistic UI rolls back on write failure;
- no fake notification/read/unread capability has been introduced;
- no P1.4/P1.5/P1.6 business rule drift;
- migration/live truth remains distinct from repository candidate truth.

Any deterministic finding is corrected before final Codex review.

---

## 20. Explicit Non-Goals

P2.2 must not implement or redesign:

- Customer Notifications or unread counts;
- push notification providers;
- payment provider integration;
- payment lifecycle changes;
- chat architecture, retention, moderation or attachments;
- Owner APIs;
- Admin APIs;
- cancellation/refund policy;
- disputes/reviews;
- wallet release/payout behavior;
- booking lifecycle statuses;
- availability blocking semantics;
- pricing/commission/deposit rules;
- Customer/Owner role switching UX;
- KYC;
- Customer visual redesign;
- Favorites ranking/folders/sharing/notes;
- cross-device realtime favorite subscriptions;
- generic API error-contract refactor (P2.6);
- repository-wide controller/OpenAPI refactor;
- arbitrary SQL Worker capability;
- new RPCs unless a proven correctness blocker requires a stop/report.

---

## 21. Expected Implementation Surface

The implementation plan may refine exact filenames after repository inspection, but expected touched areas are limited to:

### Backend

- `backend/database/migrations/028_customer_favorites.sql` — new;
- `backend/server/src/app.ts` — route hardening/new Favorites routes;
- `backend/server/src/contracts/` — Customer profile/booking/favorite-safe contract helpers as needed;
- `backend/server/src/services/dbRepository.ts` — narrow `favoriteDb` and any minimal Customer read corrections;
- `backend/server/src/services/dbClient.ts` — exact Worker/PostgREST favorite operation support;
- focused P2.2 tests plus strictly necessary existing regression fixtures/scripts;
- `backend/package.json` for a focused test script if required.

### Customer App

- `customer-app/src/App.tsx` — canonical profile/Favorites/account truthfulness integration;
- small Customer utility/service files if extracting Favorites API/state improves testability;
- focused truthful-state/Favorites tests;
- existing booking/detail component only if a type-contract compatibility adjustment is necessary.

### Documentation / CI

- task/evidence documentation;
- CI workflow only if the new focused P2.2 test is not otherwise executed and a bounded change is required.

Unexpected changes to Owner/Admin, payment, chat, wallet, payout, KYC or unrelated migrations require stop/report.

---

## 22. Implementation Ownership / Quota Routing

After Founder approval of this written spec and its implementation plan:

- **ChatGPT:** reality snapshot, architecture guard, task contract, deterministic/adversarial verification, publication orchestration;
- **Antigravity:** primary implementation writer for DTO/fail-closed/Customer integration/tests and the bounded Favorites persistence implementation if it remains straightforward;
- **ZCode:** reserved for a proven SQL/RLS/transaction/Worker complexity that Antigravity should not improvise; not automatically required merely because migration 028 exists;
- **Codex:** one final semantic/security/privacy review only after deterministic gates are clean.

Single Writer applies to the implementation branch.

---

## 23. Stop Conditions

The implementing agent must stop and report rather than improvise if any of the following occurs:

- Favorites requires changing the unified identity model;
- Favorites requires a SECURITY DEFINER RPC or direct authenticated table access;
- a new business rule is needed for saving/unpublishing/deleting Favorites beyond this spec;
- Customer booking DTO correctness requires changing booking lifecycle, financial formulas or snapshot semantics;
- current live schema differs materially from the migration assumptions;
- Migration 028 would conflict with an existing live/repository object named `customer_favorites`;
- Worker/PostgREST support cannot remain narrow and exact;
- a Customer notification/unread requirement becomes necessary to make P2.2 work;
- Payment or Chat behavior must materially change;
- implementation requires changes outside the expected product boundaries;
- any production mutation or deployment is proposed before Founder authorization.

---

## 24. P2.2 Closure Criteria

P2.2 can be declared closed only when all applicable evidence proves:

### Identity / Profile

- protected routes are JWT-sub scoped;
- Profile canonical DB failure is not replaced by phone/memory fallback;
- canonical null profile fields do not resurrect stale local values;
- Profile write persistence is verified before success.

### Account

- genuine zero summary is distinguishable from failed canonical reads;
- no malformed financial values become plausible zeros.

### Booking

- creation still satisfies P1.4/P1.5/P1.6 invariants;
- create/list/detail Customer responses use explicit allowlists;
- Customer A cannot read Customer B's booking;
- no Owner/private/internal-finance fields leak;
- Customer sees only total/deposit/remaining/currency financial values required by the journey.

### Favorites

- Migration 028 exists and passes contract/security review;
- Favorites persist canonically across reload/login;
- duplicate add is idempotent;
- remove is idempotent and Customer-scoped;
- client cannot choose another Customer identity;
- only currently public saved properties are displayed;
- non-public saved intent is retained without exposure;
- failed Favorite read does not become an empty list;
- failed Favorite write does not remain visually saved;
- Worker adapter behavior is exact and fail-closed.

### Scope / Delivery

- Notifications remain deferred to P9.1;
- Payment remains P10;
- Chat remains P12;
- no unauthorized live mutation occurred;
- exact-head CI passed;
- final Codex review is CLEAN on the exact candidate SHA;
- Founder explicitly authorizes Migration 028 + publication;
- live migration metadata/security and post-merge deployment are independently verified before closure.

Only after these gates may the project advance from P2.2 to P2.3.

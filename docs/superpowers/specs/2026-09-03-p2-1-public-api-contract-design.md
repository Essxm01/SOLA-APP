# P2.1 Public API Contract Design

**Status:** DESIGN APPROVED IN CHAT — WRITTEN SPEC PENDING FOUNDER REVIEW  
**Roadmap:** Phase 2 — Backend Contracts / P2.1 Public APIs  
**Base `main` SHA:** `317b7c3071fdd167b3419e8fd1b7f96d08ba6427`  
**Design branch:** `spec/p2-1-public-api-contract`  
**Risk class:** Architectural / public contract / privacy boundary  
**Implementation authority:** Founder-approved product rules + KONFRM repository truth. This document must not change finance, booking lifecycle, availability, KYC, privacy, or publication rules.

---

## 1. Objective

P2.1 establishes a stable, customer-safe public backend contract for property discovery and pre-booking decisions.

The goal is **not** to redesign the Customer UI or replace the existing `/api/v1/customer/*` route family. The goal is to harden the current public surface so that:

1. public property data is explicitly allowlisted;
2. Owner/private/admin-only fields cannot leak through DTO spreading;
3. Search semantics are server-authoritative instead of being reimplemented by each frontend;
4. public media comes only from canonical persisted property media;
5. availability and quote preserve the Phase 1 business rules and fail-closed behavior;
6. the existing Customer App can migrate with minimal integration change and no visual redesign.

---

## 2. Current Reality

At the approved base SHA, four routes are already publicly accessible without Customer authentication:

- `GET /api/v1/customer/properties/search`
- `GET /api/v1/customer/properties/:id`
- `GET /api/v1/customer/properties/:id/availability`
- `POST /api/v1/customer/bookings/calculate`

The existing implementation already provides important Phase 1 invariants:

- public listing source is constrained to `PUBLISHED` + `VERIFIED` properties;
- availability uses the canonical blocking rules;
- quote uses DB-authoritative property pricing;
- quote returns customer-facing totals, deposit and remaining amount;
- availability failures fail closed rather than manufacturing an open calendar.

However, P2.1 must close two architectural defects:

### 2.1 Search is currently client-side

`GET /customer/properties/search` currently returns the public collection, while the Customer App filters destination, unit type, guest count and max price locally. This makes the frontend the de facto owner of search semantics.

### 2.2 Public DTO boundaries are not explicit

The current search response spreads repository rows into the public response. Those repository rows include internal fields such as `ownerId`, `verificationStatus`, timestamps and other persistence metadata.

The current property-details route reads through `getDetailForAdmin()`, whose row can include Owner phone/email/status and admin-facing metadata. The current sanitizer does not explicitly remove every possible private/admin-only field. This is an unacceptable public privacy boundary.

P2.1 therefore treats **explicit public DTO allowlists** as a core correctness requirement, not cosmetic cleanup.

---

## 3. Chosen Architecture

### Approach: Harden the existing route family

Keep the existing public URLs for compatibility, but introduce dedicated public read models and explicit response mappers.

Do **not** create a parallel `/api/v1/public/*` namespace in P2.1.

Do **not** introduce an OpenAPI/framework/controller rewrite in P2.1.

Do **not** change database schema unless implementation proves a correctness requirement that cannot be satisfied by the existing schema. Any such discovery upgrades the task and requires a stop/report before migration work.

---

## 4. Public Route Contracts

### 4.1 Explore + Search

`GET /api/v1/customer/properties/search`

#### Authentication

Public. No login required.

#### Query parameters

All optional:

- `destination: string`
- `unitType: string`
- `guests: positive integer`
- `maxPrice: positive finite number`

No additional filters are introduced in P2.1.

#### Semantics

No query parameters means **Explore feed**.

When parameters are supplied, filtering is performed server-side against canonical persisted property fields.

Recommended matching rules:

- `destination`: normalized case-insensitive containment against public location/title fields: `title`, `address`, `region`, `resort_name`;
- `unitType`: normalized exact match against the canonical public unit/property type representation; the implementation must preserve compatibility with the Customer App's existing values and must not invent a new product taxonomy;
- `guests`: property `max_guests >= guests`;
- `maxPrice`: `base_price_per_night <= maxPrice`.

Multiple filters combine with logical AND.

Invalid parameter values return a truthful `400` error. Invalid filters must not silently degrade to an unfiltered Explore response.

Database or media read failures return an error, never a successful empty collection.

#### Public search item DTO

Only the following fields may be emitted:

```ts
interface PublicPropertySearchItem {
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
```

Fields such as `ownerId`, `ownerName`, `ownerPhone`, `ownerEmail`, `status`, `verificationStatus`, `createdAt`, `updatedAt`, review/admin metadata and internal finance data are **not part of the public contract**.

The property is implicitly trustworthy for display because the source query itself requires `PUBLISHED + VERIFIED`; the client must not need raw verification enums to decide whether it is public.

---

### 4.2 Property Details

`GET /api/v1/customer/properties/:id`

#### Authentication

Public. No login required.

#### Data source

Must use a **dedicated public property read** or equivalent explicit public projection.

It must **not** use `getDetailForAdmin()` as the public data source.

The persistence query itself should enforce:

- `deleted_at IS NULL`
- `status = 'PUBLISHED'`
- `verification_status = 'VERIFIED'`

This avoids reading a broader admin object and trying to sanitize it after the fact.

#### Visibility behavior

A property that is missing, deleted, unpublished or unverified must not reveal private state details to a public caller.

The implementation should prefer a non-enumerating public result such as `404 PROPERTY_NOT_FOUND` for all non-public/missing cases rather than exposing `UNPUBLISHED_PROPERTY` state to guests.

#### Public detail DTO

Only customer-decision fields may be emitted:

```ts
interface PublicPropertyDetail {
  id: string;
  title: string;
  unitType: string;
  propertyType?: string | null;
  address: string;
  region?: string | null;
  resortName?: string | null;
  bedrooms: number;
  bathrooms: number;
  bedsCount?: number | null;
  maxGuests: number;
  areaSqM?: number | null;
  description?: string | null;
  amenities: unknown[];
  houseRules: Record<string, unknown>;
  basePricePerNight: number;
  currency: 'EGP';
  images: string[];
}
```

No Owner identifier or contact details are public in P2.1.

No Owner phone/email leakage is permitted anywhere in the public DTO.

No internal property verification/admin-review state is permitted.

No internal finance fields are permitted.

---

### 4.3 Property Media

P2.1 does **not** create a new media endpoint merely for architectural symmetry.

Canonical public media remains embedded in the search/details DTO as `images: string[]`.

Requirements:

- source: canonical persisted `property_images` records only;
- only active/committed media eligible under existing persistence rules may be exposed;
- deterministic ordering must preserve the canonical cover/order semantics already stored by the media model;
- no fake/placeholder remote image URLs may be generated by the backend;
- media read failure must fail closed rather than appear as an honest zero-image result;
- public response exposes only the URL strings needed by the Customer UI, not storage keys, upload intent identifiers or moderation internals.

If implementation proves that an independent media endpoint is technically required, the agent must stop and report the reason rather than silently broadening architecture.

---

### 4.4 Availability

`GET /api/v1/customer/properties/:id/availability`

P2.1 preserves P1.4 semantics and only hardens the external contract/tests.

Required invariants:

- public without authentication;
- 2-night minimum;
- 30-night maximum;
- `PENDING_OWNER_APPROVAL` does not block;
- `APPROVED_PENDING_PAYMENT` blocks;
- `CONFIRMED` blocks;
- manual canonical owner blocks remain blocking;
- database/query failure returns error and never fake empty availability;
- unavailable ranges remain customer-safe and contain no internal booking/customer/owner identifiers.

P2.1 must not change availability business rules.

---

### 4.5 Quote

`POST /api/v1/customer/bookings/calculate`

P2.1 preserves P1.5/P1.6 financial authority and availability semantics.

#### Authentication

Public. No login required. A quote is not a booking and not a hold.

#### Request intent

```ts
interface PublicQuoteRequest {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}
```

Client-supplied prices or financial breakdowns are ignored/rejected and never authoritative.

#### Customer-safe response

```ts
interface PublicQuoteResponse {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  pricePerNight: number;
  totalStay: number;
  depositAmount: number;
  remainingAmount: number;
  currency: 'EGP';
}
```

Must not expose:

- commission rate;
- commission amount;
- Owner net deposit;
- ledger/wallet identifiers;
- payout/internal finance fields.

Financial invariants remain unchanged:

- deposit = actual first-night price;
- total = canonical server-calculated stay total;
- remaining = total - deposit;
- no payment occurs before Owner approval;
- quote revalidates canonical availability and fails on blocking overlap;
- quote does not reserve dates.

---

## 5. Response Envelope

Keep the repository's established envelope shape:

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

P2.1 should normalize only the public routes in scope. It must not trigger a repository-wide response-envelope refactor.

---

## 6. Privacy & Security Boundary

Public DTO construction uses explicit allowlists. `...row`, `...property`, or equivalent broad object spreading into a public response is prohibited.

The following categories are deny-by-contract even if future repository queries start returning them:

- Owner/user IDs not explicitly required by the public UI;
- phone numbers;
- email addresses;
- KYC/verification document data;
- Owner account status;
- property review/admin notes;
- storage keys/upload intents;
- Customer/booking private data;
- commission/Owner net/payout/ledger/wallet internals;
- raw database timestamps unless a future approved public requirement explicitly needs them.

A repository query growing new columns in the future must therefore not automatically expand the public API.

---

## 7. Customer App Integration

P2.1 is not a Customer UI redesign.

The required integration change is limited to making the existing search controls send intent to the canonical backend search contract rather than applying the authoritative filter locally.

The existing visual states remain:

- loading;
- success with results;
- genuine empty results;
- error + retry.

A backend/search failure must never look like an honest zero-result search.

Existing public property cards and detail UX remain visually unchanged unless a minimal type adjustment is required to remove now-private fields such as `verificationStatus` from the client model.

The Customer UI may render a KONFRM verification badge because the backend only returns public verified properties; it must not depend on receiving the raw database verification enum.

---

## 8. Repository/API Design Direction

Implementation should prefer a small explicit public read boundary, for example:

- dedicated repository methods such as `propertyDb.searchPublic(filters)` and `propertyDb.getPublicById(id)`; and/or
- dedicated public DTO mapper functions with typed allowlists.

The exact file organization may follow existing repository conventions, but the implementation must preserve these architectural rules:

1. public queries should be narrow and purpose-built;
2. public routes must not reuse admin-detail rows;
3. public response construction must be explicit;
4. route handlers remain thin enough that privacy rules are testable independently;
5. no new database migration without a stop/report and Founder approval.

---

## 9. Testing Strategy

P2.1 requires deterministic contract tests before final review.

### Search contract

Cover:

- no-filter Explore success;
- destination filter;
- unit type filter;
- guest capacity filter;
- max price filter;
- combined filters;
- invalid guests/maxPrice values -> 400;
- true zero-result search -> successful empty array;
- DB failure -> error, not empty success;
- media failure -> error, not empty-images success;
- unpublished/unverified/deleted property never appears;
- public DTO contains only allowlisted keys;
- forbidden privacy fields remain absent even when the underlying mocked repository row contains them.

### Details contract

Cover:

- published+verified property -> 200;
- missing/unpublished/unverified/deleted -> public-safe not-found behavior;
- image/media success and ordering;
- media failure -> error;
- explicit allowlist privacy assertions for Owner phone/email/IDs and admin fields.

### Availability regression

Preserve existing P1.4 tests plus public DTO privacy assertions.

### Quote regression

Preserve existing P1.5/P1.6 tests and assert:

- DB price authority;
- 2-30-night rules;
- blocking statuses;
- no hold creation;
- no commission/Owner net/internal-finance keys in public quote output;
- malformed/invalid request fails truthfully.

### Customer integration

Cover that the Customer search controls cause the server search request to carry the intended filters and that server errors remain distinct from genuine zero results.

---

## 10. Quality Gates

Before publication review:

1. exact base/head SHA evidence;
2. expected changed paths only;
3. backend TypeScript check;
4. focused P2.1 public contract suite;
5. all P1.3/P1.4/P1.5/P1.6 regression suites relevant to property/media/availability/quote;
6. Customer App typecheck/build and truthful-state tests;
7. `git diff --check`;
8. exact-head PR CI;
9. no live Supabase mutation;
10. no deployment/merge before Founder Publication Gate;
11. one final Codex semantic/privacy review on the exact final candidate SHA.

Build/CI success alone is not closure evidence.

---

## 11. Explicit Non-Goals

P2.1 must not implement or alter:

- booking creation lifecycle beyond regression protection;
- payment processing;
- wallet/ledger logic;
- payouts;
- cancellation/refund rules;
- chat;
- reviews;
- KYC flows;
- property publication workflow;
- Owner/Admin UI redesign;
- Customer visual redesign;
- new property taxonomy;
- ranking/recommendation engine;
- pagination unless current data volume/implementation proves it necessary for correctness;
- geo-radius/map search;
- new database indexes or schema changes without explicit stop/report;
- `/api/v1/public/*` duplicate route family;
- repository-wide OpenAPI/framework refactor.

---

## 12. Implementation Ownership / Quota Routing

Preferred execution routing after the written spec and implementation plan are Founder-approved:

- **ChatGPT:** reality snapshot, task contract, deterministic evidence verification, publication orchestration;
- **Antigravity:** primary implementation, repo-local tests, mechanical DTO/search integration work;
- **ZCode:** only if implementation exposes irreducible DB/transaction/concurrency complexity; not planned by default;
- **Codex:** one final semantic/privacy review after all deterministic and adversarial gates pass.

Single Writer rule applies to the implementation branch.

---

## 13. Stop Conditions

The implementing agent must stop and report rather than improvise if any of the following is discovered:

- the approved filters require a database schema/index change for correctness rather than optimization;
- current media persistence cannot provide deterministic public ordering without changing schema/business rules;
- a public Owner identity/contact field is required by an existing approved Customer flow;
- availability or quote needs a business-rule change;
- a migration is required;
- public contract compatibility cannot be preserved without a breaking frontend change;
- implementation reveals that P2.1 is larger than the approved scope.

---

## 14. Definition of Done

P2.1 is complete only when all of the following are true on one exact reviewed candidate:

- public Explore/Search/Details/Availability/Quote contracts are deterministic and tested;
- server owns search semantics;
- only `PUBLISHED + VERIFIED` properties are public;
- public property DTOs are explicit allowlists;
- no Owner contact/private/admin/internal-finance leakage exists;
- media is canonical and fail-closed;
- quote remains server-authoritative and customer-safe;
- Customer App uses the server search contract without a visual redesign;
- deterministic/regression gates pass;
- exact-head CI passes;
- Codex final review is clean;
- Founder explicitly approves publication;
- only then any merge/deployment occurs;
- post-publication verification succeeds.

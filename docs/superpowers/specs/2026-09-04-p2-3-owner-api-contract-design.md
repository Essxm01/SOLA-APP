# P2.3 Owner API Contract Design

**Status:** FOUNDER-APPROVED DESIGN — READY FOR IMPLEMENTATION PLANNING
**Roadmap:** Phase 2 — Backend Contracts / P2.3 Owner APIs
**Base `main` SHA:** `baecc9f7f9c16aafa1954ddf7aa6e3cead5c757a`
**Design branch:** `spec/p2-3-owner-api-contract`
**Risk class:** Architectural / authenticated Owner + cross-role + financial-read boundary
**Chosen approach:** **Owner Core Contract Hardening + Truthful Client Alignment**

**Implementation authority:** latest Founder decisions, KONFRM Master Project Context, Master Rules, Quality Gates, fixed PHASE 0–22 roadmap, and current repository truth. This specification is additive. It must not rewrite the roadmap or pull full future features into P2.3 merely because historical frontend interfaces/routes exist.

---

## 1. Objective

P2.3 establishes a stable, truthful Owner core backend contract on top of the closed Phase 1 persistence foundation and the published P2.1/P2.2 Customer contracts.

P2.3 must make the currently required Owner core flows depend on canonical server/database truth while preserving all existing cross-role invariants.

The P2.3 core is:

1. Owner identity/profile;
2. Owner properties and property media;
3. Owner calendar/manual availability blocks;
4. Owner booking requests and approve/reject decisions;
5. booking-scoped Owner financial reads using canonical persisted financial summaries;
6. canonical Owner wallet/ledger reads;
7. minimal Owner client alignment so missing/deferred/failed backend capabilities cannot masquerade as successful real data.

P2.3 is **not** permission to implement every historical method in `owner-app/src/services/contracts/index.ts` or `HttpRepository.ts`.

---

## 2. Founder Decisions Recorded

The Founder explicitly approved the following P2.3 interpretation:

- P2.3 is **Owner Core Contract Hardening + Truthful Client Alignment**.
- Do not build full Notifications, Payout, Chat, Disputes, Analytics, cancellation/modification, or other future engines early simply because legacy interfaces/routes mention them.
- Full Notification work remains Phase 9.
- Full Payout/financial workflow remains Phase 11.
- Full Chat remains Phase 12.
- Disputes/cancellation/reviews remain Phase 13.
- Security, failure handling, regression, UI/UX QA, and live verification are continuous disciplines, but later dedicated audit phases remain preserved.
- The fixed PHASE 0–22 macro roadmap is not renumbered or rewritten.
- No database migration is assumed for P2.3. If implementation proves a new schema/RPC/transaction boundary is required, execution must STOP and return to an architecture/publication gate before adding it.

---

## 3. Verified Current Reality at Base

### 3.1 Owner App production repository selection

`owner-app/src/services/repositoryFactory.ts` uses Mock mode only when:

```ts
import.meta.env.VITE_USE_MOCK_REPO === 'true'
```

Therefore omission of the variable evaluates to HTTP mode, not Mock mode. The nearby legacy comment claiming Mock is the default is stale implementation documentation and must not override the executable condition.

### 3.2 Owner Profile GET masks database failure

Current `GET /api/v1/owner/profile` performs:

```ts
ownerDb.getById(ownerId).catch(() => null)
```

and then converts `null` to `404 OWNER_PROFILE_NOT_FOUND`.

A database/query failure can therefore be reported as a false account-not-found state. P2.3 must separate genuine no-row from query failure.

### 3.3 Owner booking decisions have a good existing core

Current Owner approval already verifies:

- booking exists;
- `booking.ownerId === jwt.sub`;
- status is `PENDING_OWNER_APPROVAL`;
- canonical availability is rechecked;
- manual-block race conflicts remain conflicts;
- success transitions to `APPROVED_PENDING_PAYMENT`, not `CONFIRMED`.

Current rejection similarly enforces ownership/status and transitions to `REJECTED`.

P2.3 must harden this boundary rather than rewrite its state machine.

### 3.4 Booking financial endpoint is fabricated

Current `GET /api/v1/owner/bookings/:id/financials` calls:

```ts
calculateBookingFinancials(1500, 500)
```

The response therefore contains plausible-looking Owner financial data derived from fixed demo constants rather than the requested booking's canonical persisted financial summary.

This must not survive P2.3.

### 3.5 Payout POST is a fake-success legacy surface

Current `POST /api/v1/owner/payouts` validates against a hardcoded `5000` EGP available balance, uses a fixed fee of `15`, fabricates an id from `Date.now()`, and returns success without proving canonical payout persistence.

This is not a canonical Payout implementation. P2.3 must prevent this route from representing a successful financial truth, but must not build Phase 11 early.

### 3.6 Owner Notifications can hide DB failure

Current Owner notification read attempts canonical DB, but catches failures and falls back to an in-memory notification store. A database outage may therefore appear as a legitimate successful notification payload.

P2.3 may harden this already-existing read boundary so it fails truthfully, but must not build the Phase 9 Notification Engine.

### 3.7 Owner App contracts are broader than backend reality

`HttpRepository.ts`/service interfaces contain historical calls for surfaces such as pause/resume, pricing overrides, booking detail/create/modification/cancellation, payout methods/list, disputes, analytics, and others that are not all backed by current canonical routes.

Historical interface presence is implementation evidence, not Product authority.

### 3.8 Owner App currently masks some future-domain failures

`AppContext.tsx` contains future-domain reads wrapped with patterns such as `.catch(() => [])` / `.catch(() => null)`. Such fallbacks must never be allowed to redefine a failed canonical core read as genuine empty/zero state.

P2.3 should touch these only where required to isolate P2.3 core from deferred domains and prevent a currently visible/core surface from lying. Broad P2.6 error-system redesign is out of scope.

---

## 4. Chosen Architecture

Keep the existing `/api/v1/owner/*` family, existing database repositories, existing P1.3 media boundary, P1.4 availability boundary, P1.5 booking atomicity, and P1.6 wallet/ledger persistence.

Introduce only the minimum contract layer required to make Owner core reads/writes explicit and truthful.

Preferred shape:

1. add a focused backend Owner contract module, e.g. `backend/server/src/contracts/ownerCore.ts`, for allowlisted DTO mapping and required-value validation;
2. harden existing Owner routes in `backend/server/src/app.ts` instead of creating a parallel API namespace;
3. reuse existing repository operations where they are canonical;
4. add only missing repository helpers needed to read already-persisted canonical data;
5. align only currently required Owner HTTP client methods/types with the approved backend truth;
6. retire/isolate fake-success financial/deferred behavior without completing future feature engines;
7. add one focused P2.3 backend contract test suite and proportionate Owner frontend contract/regression tests;
8. keep Worker/PostgREST changes narrow and exact if a currently required P2.3 query shape is unsupported.

No broad controller rewrite, ORM introduction, generic SQL execution layer, mass type-system redesign, or future-feature implementation.

---

## 5. Owner Identity and Profile Contract

All protected P2.3 Owner routes require:

- valid canonical JWT;
- role exactly `ROLE_OWNER`;
- Owner identity exactly `jwt.sub`;
- existence of canonical Owner capability where the operation requires it;
- no client-supplied Owner id as authorization authority.

### GET `/api/v1/owner/profile`

Source of truth: canonical Owner row for `jwt.sub`.

Required behavior:

- canonical row -> `200` allowlisted Owner profile DTO;
- genuine no-row -> truthful not-found/capability response;
- DB/query failure -> `5xx`, never false 404;
- no in-memory Owner fallback;
- no phone-based alternate identity fallback.

The DTO must expose only fields required by the current Owner app/profile/auth state. It must not expose private KYC document storage keys or unrelated server/internal metadata.

### PUT `/api/v1/owner/profile`

Preserve currently supported profile edits only.

Rules:

- scope to `jwt.sub`;
- validate accepted fields server-side;
- reject/ignore lifecycle/role/identity tampering rather than spreading request bodies;
- persistence failure -> error;
- success returns canonical allowlisted Owner profile DTO.

P2.3 does not redesign KYC. Existing canonical KYC endpoints remain protected regression surfaces.

---

## 6. Owner Property Contract

P2.3 preserves the current canonical property model and lifecycle.

Core required actions:

- `GET /api/v1/owner/properties`;
- create Owner property draft;
- update Owner-owned property;
- submit for Admin review;
- archive/restore/delete only where existing product integrity rules allow;
- canonical property media actions required by the current wizard.

Rules:

- all property reads/writes are Owner-scoped;
- foreign Owner access is denied;
- client cannot publish/verify itself;
- property rejection remains the existing composite product state, not a new invented enum;
- detailed `address` remains a string that may be empty; it is not redefined as mandatory;
- public visibility remains `PUBLISHED + VERIFIED` and cannot be weakened;
- destructive/lifecycle operations must not violate protected-booking integrity;
- persistence/query failures must not become empty list, fake success, or false not-found.

### Property DTO strategy

P2.3 may reuse the current Owner `Property` shape only after validating that the route deliberately supplies the fields the current Owner UI needs. Broad spreading of arbitrary DB rows is not an API contract.

Any normalization performed for Owner data must remain compatible with the published P2.1 public property contract. In particular, empty canonical `address` must remain valid and must not poison Customer Explore/Search/Detail/Favorites.

---

## 7. Property Media Contract

P1.3 remains authoritative.

P2.3 must preserve:

- Owner/property ownership checks;
- upload-intent validation;
- MIME/size/object-key validation;
- private server authority over Storage metadata;
- atomic image metadata + upload-intent commit semantics;
- idempotent safe replay semantics already established;
- truthful errors when property/media persistence fails.

No new media architecture or migration is allowed by default.

---

## 8. Availability / Calendar Contract

Core P2.3 availability actions are:

- read the Owner calendar for an Owner-owned property;
- manual block/unblock through the current canonical persistence boundary.

Non-negotiable shared rules:

- stay length remains 2–30 nights;
- `PENDING_OWNER_APPROVAL` does not block;
- `APPROVED_PENDING_PAYMENT` blocks;
- `CONFIRMED` blocks;
- Quote is not a hold;
- Customer and Owner availability use the same canonical truth;
- database/Worker failure fails closed;
- a manual block cannot silently overlap a protected booking;
- approval/manual-block race behavior established by P1.4/P1.5 must not be weakened.

Historical frontend methods for nightly price override/batch pricing do not become P2.3 requirements unless current canonical product behavior and backend persistence prove they are already part of the required core. Do not create them solely to satisfy old interfaces.

---

## 9. Owner Booking Contract

### GET `/api/v1/owner/bookings`

Required behavior:

- query only bookings belonging to the authenticated Owner;
- DB/query failure -> `5xx`, never `[]`;
- return explicit Owner-safe booking DTOs rather than arbitrary internal DB objects;
- include only Customer information required by the current Owner decision UX and allowed by privacy rules;
- do not expose unrelated Customer private/account data;
- financial fields must come from canonical booking/financial summary truth.

### GET `/api/v1/owner/bookings/:id`

Add/harden a detail route only if the current Owner booking-detail flow requires a standalone read. If list state already supplies the same canonical detail safely, do not add an endpoint merely because a historical interface exists.

If provided, authorization order is:

1. valid Owner JWT;
2. canonical booking read;
3. booking exists;
4. `booking.ownerId === jwt.sub`;
5. explicit Owner DTO mapping.

### POST `/api/v1/owner/bookings/:id/approve`

Preserve exactly:

- Owner ownership;
- current status must be `PENDING_OWNER_APPROVAL`;
- canonical availability revalidation;
- atomic blocking transition protections;
- manual-block/race conflicts remain clean conflicts;
- success -> `APPROVED_PENDING_PAYMENT`;
- never -> `CONFIRMED`;
- no payment is performed here.

### POST `/api/v1/owner/bookings/:id/reject`

Preserve exactly:

- Owner ownership;
- current status `PENDING_OWNER_APPROVAL`;
- success -> `REJECTED`;
- competing/replayed decision -> truthful conflict.

Customer P2.2 booking list/detail must observe the resulting canonical state.

---

## 10. Owner Booking Financial Read

`GET /api/v1/owner/bookings/:id/financials` must stop calculating from demo constants.

Source of truth:

- canonical booking for ownership check;
- canonical persisted `booking_financial_summaries` record created by the booking transaction.

Rules:

- booking must belong to `jwt.sub`;
- missing booking -> truthful not-found;
- foreign booking -> forbidden;
- missing/malformed financial summary -> error, not reconstructed guesses;
- database failure -> error;
- no calculation from current property price;
- no hardcoded amount;
- no client-authoritative finance.

Financial invariants are unchanged:

- deposit = actual first-night price;
- KONFRM commission = 20% of deposit only;
- Owner net deposit = 80% of deposit;
- remaining = total - deposit;
- 0% commission on remaining;
- money remains server-authoritative.

The Owner DTO may expose Owner-relevant internal split that the Customer contract intentionally hides, but it must reflect the persisted booking snapshot, not recomputation from mutable listing state.

---

## 11. Owner Wallet / Ledger Reads

P1.6 remains authoritative.

Core P2.3 reads:

- `GET /api/v1/owner/wallet`;
- `GET /api/v1/owner/wallet/ledger`.

Rules:

- scope exclusively to JWT Owner;
- read canonical wallet/immutable ledger persistence;
- no reconstruction from bookings/properties;
- DB failure -> error, never zero balance;
- malformed values fail closed;
- Available, Pending, Held and ReservedForPayout remain semantically distinct;
- no same amount double-counting across buckets;
- P2.3 does not create new wallet mutation semantics.

---

## 12. Deferred / Legacy Surfaces

### 12.1 Payout

Full payout implementation remains Phase 11.

The existing fake-success `POST /api/v1/owner/payouts` must not survive as a plausible financial success path.

P2.3 may retire it behind an explicit non-success response such as a stable feature-unavailable contract, and the current Owner client must not present a fabricated payout as completed/submitted.

P2.3 must **not** invent:

- payout provider integration;
- payout methods persistence;
- provider transaction ids;
- real provider fee values;
- new reservation/accounting flow.

The approved prototype rules (minimum 500 EGP, actual provider fee borne by Owner, Available -> ReservedForPayout semantics) remain rules for Phase 11; they do not authorize a fake P2.3 implementation.

### 12.2 Notifications

Full Notification Engine remains Phase 9.

If the existing Owner notification read is retained because current UI uses it, it must fail truthfully on DB failure and must not fall back to an in-memory success. P2.3 does not add new events, unread architecture, push notifications, or deep-linking.

### 12.3 Chat

Full Chat remains Phase 12. Existing canonical booking-scoped routes are regression surfaces only unless P2.3 changes a shared booking DTO they consume.

### 12.4 Disputes / cancellation / modification / analytics

Do not implement these in P2.3. Historical frontend contracts may be documented/isolated but do not create backend requirements.

---

## 13. Owner Client Alignment

P2.3 must align the Owner App with approved canonical core behavior without redesigning Owner UX.

Rules:

- `repositoryFactory` truth remains: Mock mode only when `VITE_USE_MOCK_REPO === 'true'`;
- stale comments/documentation around that toggle may be corrected in-scope;
- core Profile/Properties/Bookings/Wallet failures must remain distinguishable from genuine empty data;
- no `.catch(() => [])` / `.catch(() => null)` may hide failure for a P2.3 core source and then display the result as canonical truth;
- deferred-domain failures must not block core Owner bootstrap, but they also must not be presented as confirmed canonical empty/zero data when their screens/actions are used;
- do not implement missing historical endpoints simply to satisfy interface symmetry;
- remove/deprecate or stop calling clearly invalid historical methods only where current usage makes that necessary for truthful P2.3 behavior;
- preserve existing UX structure. Phase 6 owns full Owner UX redesign.

---

## 14. Worker / PostgREST Boundary

The Cloudflare Worker adapter remains a narrow compatibility layer, not a general SQL engine.

For every P2.3 core query/write touched by implementation:

- verify the exact Worker matcher exists or add the smallest exact matcher required;
- matcher ordering must avoid collisions with broader legacy patterns;
- malformed or non-OK PostgREST responses fail closed;
- preserve database error/conflict semantics where the Worker maps them;
- do not emulate transactions in application code when the database transaction/RPC is the authority;
- do not broaden `dbClient` into general SQL parsing/execution.

If canonical behavior requires transaction semantics the current Worker cannot safely represent, STOP and return to architecture review rather than building a sequential fallback.

---

## 15. Database / Migration Boundary

**Default: no new migration.**

P2.3 should consume the persistence already established by Phase 1.

If a new migration/RPC/index/schema change appears necessary:

1. stop implementation;
2. report the exact missing persistence capability;
3. show why existing tables/repositories/RPCs cannot satisfy it;
4. obtain a new architecture decision before authoring/applying the migration.

No live Supabase/Storage mutation is authorized by this written spec alone.

---

## 16. Mandatory Regression Surface

Every implementation candidate must re-prove the currently working flows that share the touched boundaries.

### Owner

- login/session -> canonical profile;
- KYC status/onboarding remains intact;
- Properties list;
- create/edit property;
- property image upload/commit/list/delete as currently supported;
- submit property for review;
- calendar manual block/unblock;
- booking requests list;
- approve -> `APPROVED_PENDING_PAYMENT`;
- reject -> `REJECTED`;
- Wallet summary/ledger.

### Admin

- Owner verification visibility/actions where shared Owner data is touched;
- submitted property enters Admin review;
- Admin approval publishes the same property;
- existing booking supervision visibility where currently present.

### Customer

- Explore/Search still returns published verified properties;
- empty property address remains valid;
- Property Detail still opens;
- Favorites still work with empty-address canonical properties;
- Availability/Quote remain truthful;
- booking creation remains atomic and `PENDING_OWNER_APPROVAL`;
- Customer booking list/detail sees Owner approve as `APPROVED_PENDING_PAYMENT`;
- Customer booking list/detail sees Owner reject as `REJECTED`;
- no Owner-internal finance leaks into Customer DTOs.

### Shared persistence/security

- P1.3 property/media tests;
- P1.4 availability/manual-block tests;
- P1.5 booking atomicity/concurrency tests;
- P1.6 wallet/ledger tests;
- P2.1 public property tests;
- P2.2 Renter contract tests;
- role/IDOR tests for all new/hardened Owner routes.

---

## 17. Test Strategy

Implementation must follow RED -> GREEN for every new/changed behavior.

Add a focused backend suite:

`backend/server/src/tests/p23OwnerApiContract.test.ts`

and package script:

`test:p2-3-owner-api`

The suite must cover at minimum:

1. Owner profile DB failure is 5xx, not false 404;
2. genuine missing Owner remains truthful;
3. Customer/foreign Owner access is denied;
4. Owner property/list failures do not become empty success;
5. empty property `address` remains valid;
6. Owner booking list/query failure is error;
7. Owner booking DTO does not leak unrelated Customer/private fields;
8. approve/reject preserve exact lifecycle and ownership;
9. booking financials are read from canonical persisted summary, never hardcoded/recomputed;
10. wallet and ledger query failures remain errors;
11. fake payout success is unavailable/retired, not 201 synthetic success;
12. Owner notification DB failure cannot silently return memory fallback if that route is hardened in P2.3;
13. relevant Worker malformed/error behavior fails closed.

Owner frontend changes must have focused tests for any new pure adapter/state helper introduced. Existing Owner utility tests and build are regression gates.

---

## 18. Implementation Packaging

P2.3 remains one roadmap task but may be implemented as internally reviewable packages:

### Package A — Owner Profile / capability truth

Truthful profile/capability reads + DTO + auth/IDOR tests.

### Package B — Properties / Media truth

Owner property contract, existing media boundary, public-contract compatibility.

### Package C — Calendar / Availability truth

Owner calendar/manual block read/write contract without new pricing engine.

### Package D — Booking decisions / canonical booking finance

Owner booking DTOs, approve/reject regression, persisted financial summary read.

### Package E — Wallet reads

Canonical summary/ledger, error semantics, client alignment.

### Package F — Deferred-surface isolation + Owner client alignment + docs/regression

Remove fake-success financial behavior, prevent core errors becoming empty/zero, preserve future phase boundaries, update operational docs only after implementation evidence exists.

One active implementation writer at a time.

---

## 19. Execution / Agent Strategy

Default writer: **Antigravity**, only while the approved implementation remains contract/DTO/error/frontend-alignment work with no new DB transaction/schema/financial mutation.

Escalate to **ZCode** only if implementation proves the task requires:

- new SQL/RPC/migration;
- new transaction/concurrency semantics;
- booking state-machine change;
- wallet/payout mutation logic;
- another irreducibly complex backend change.

Use **Codex** once near final candidate for independent semantic/adversarial review of the exact candidate SHA, especially Owner authorization, booking lifecycle, finance privacy/truth, Worker strictness, and future-feature boundary.

Quota policy:

- deterministic tools and existing tests first;
- no repeated broad prompts;
- agent prompts should point to this spec/task contract rather than restating the whole project;
- every expensive finding should become a deterministic test/guard when practical.

---

## 20. Publication / Live Acceptance

P2.3 is deployment-sensitive and cross-role.

A candidate is not closed because build/CI is green.

Before publication:

- exact candidate SHA known;
- changed-path scope reviewed;
- focused + regression gates pass;
- final independent review on exact candidate if risk warrants;
- no unauthorized migration/live mutation.

After Founder publication approval and production deployment, Live verification must prove at minimum:

### Owner core

- authenticated test Owner loads canonical profile;
- Owner sees their real properties;
- Owner calendar/manual block works for a dedicated test property;
- Wallet summary/ledger display canonical state or truthful error.

### Cross-role booking

`Test Customer submits booking`
-> `same Test Owner sees same request`
-> `Owner approves`
-> `same Customer observes APPROVED_PENDING_PAYMENT`.

A separate rejection path must prove:

`Test Customer request`
-> `Owner rejects`
-> `Customer observes REJECTED`.

### Cross-role property regression

`Owner create/edit/submit`
-> `Admin review/publish`
-> `Customer Explore/Search/Detail displays same canonical property`, including valid empty-address behavior where applicable.

No task closure without actual affected user-flow evidence.

---

## 21. Non-Goals

P2.3 must not:

- redesign Owner UI/UX;
- change the PHASE 0–22 roadmap;
- complete Notifications/Chat/Payout/Disputes/Analytics early;
- change deposit/commission/remaining formulas;
- change booking lifecycle;
- change availability blocking rules;
- change KYC policy;
- invent cancellation/refund/payment-expiry policy;
- expose Customer-private/internal data to Owner beyond current approved decision needs;
- expose Owner-internal finance to Customer;
- introduce a broad new backend architecture;
- add a DB migration without returning to an explicit architecture gate;
- mutate Production data or deploy without publication authorization.

---

## 22. Definition of Done

P2.3 is complete only when all applicable evidence exists:

1. Owner core contracts are explicit and server-authoritative;
2. known false-success/fabricated core behavior is removed or truthfully isolated;
3. Owner Profile DB failures do not become false not-found;
4. Owner booking financial read uses canonical persisted financial summary;
5. fake payout 201 success is gone without building Phase 11 early;
6. Owner property/media/availability/booking/wallet invariants remain intact;
7. Customer/Admin adjacent flows regressions pass;
8. focused P2.3 tests plus P1.3/P1.4/P1.5/P1.6/P2.1/P2.2 regressions pass;
9. Owner App build and relevant tests pass;
10. Worker boundary is proven for touched queries;
11. exact-head PR CI passes;
12. final semantic/adversarial review covers exact candidate SHA when required;
13. publication is explicitly Founder-approved;
14. deployed exact revision is verified;
15. real Live Owner + Customer + Admin affected journeys are exercised;
16. `docs/CURRENT_STATE.md`, `tasks/CURRENT_TASK.md`, and task closure evidence are reconciled only after the real state changes.

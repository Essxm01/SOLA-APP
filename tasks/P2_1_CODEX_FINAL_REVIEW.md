# P2.1 — FINAL CODEX SEMANTIC / PRIVACY REVIEW

TASK_ID: P2.1
MODE: FINAL_READ_ONLY_REVIEW
RESULT_REQUIRED: P2_1_CODEX_FINAL_CLEAN | P2_1_CODEX_FINAL_BLOCKED

## Exact review target

Repository: `Essxm01/SOLA-APP`
Final candidate branch: `validation/p2-1-rc`
FINAL_IMPLEMENTATION_SHA: `0bd948448be508a75cc381da2cb3a6724fd4ac8b`
BASE_MAIN_SHA: `317b7c3071fdd167b3419e8fd1b7f96d08ba6427`
Pull Request: `#11`
Exact-head PR CI: Run `#174`, Run ID `33761019716`, conclusion `SUCCESS`

Founder-approved design:
`docs/superpowers/specs/2026-09-03-p2-1-public-api-contract-design.md`

Approved implementation plan:
`docs/superpowers/plans/2026-09-03-p2-1-public-api-contract.md`

No database migration is part of P2.1. No live Supabase/Storage mutation or production deploy has been authorized or performed for this candidate. PR Worker deployment was skipped.

## Review protocol

1. Fetch origin explicitly.
2. Stop immediately if any exact SHA or PR head/base does not match the values above.
3. Review the complete diff `BASE_MAIN_SHA..FINAL_IMPLEMENTATION_SHA`, not only the final correction commit.
4. Treat green CI as evidence only, never as semantic proof.
5. READ ONLY: do not modify files, push, merge, deploy, or mutate Supabase/Storage.

## Product / architecture invariants

- Existing public route family remains `/api/v1/customer/*`; no parallel `/api/v1/public/*`.
- Public inventory is only `PUBLISHED + VERIFIED` and not deleted.
- Search is server-authoritative.
- Public DTOs are explicit allowlists. Owner phone/email/private IDs, KYC/admin-review metadata, raw verification/publication enums, storage internals, Customer/booking private data, and internal finance must not leak.
- Canonical property media only; no fake/placeholder backend media.
- Availability rules remain unchanged: 2–30 nights; `PENDING_OWNER_APPROVAL` does not block; `APPROVED_PENDING_PAYMENT` and `CONFIRMED` block; canonical manual blocks block; failures fail closed.
- Quote is public and server-authoritative, is not a hold, and exposes Customer-safe totals only. Deposit = actual first-night price; remaining = total - deposit. No commission/Owner-net/wallet/ledger/payout internals.
- No Customer UI redesign in P2.1.

## Mandatory semantic review

### A. Public property read / privacy boundary

Review `publicProperty.ts`, `dbRepository.ts`, and `app.ts` end-to-end.

Verify:
- search/detail persistence reads are dedicated public projections and enforce `deleted_at IS NULL + PUBLISHED + VERIFIED`;
- public detail no longer reads through an Admin-detail object;
- response construction is allowlist-based and future extra repository columns cannot silently become public;
- malformed required property values fail closed instead of becoming `0`, `NaN`, empty strings, or successful partial DTOs;
- optional public strings are semantically validated rather than arbitrary-coerced;
- missing/unpublished/unverified/deleted detail states are non-enumerating public not-found behavior;
- no Owner contact, Owner ID, admin-review state, verification internals, timestamps, or internal finance leak through search/detail.

### B. Server-authoritative Search

Verify exact external semantics for optional `destination`, `unitType`, `guests`, and `maxPrice`:
- no filters = Explore;
- destination case-insensitive containment over the approved public location/title fields;
- unit type exact normalized match without inventing a new taxonomy;
- `maxGuests >= guests`;
- `basePricePerNight <= maxPrice`;
- multiple filters combine with AND;
- invalid numeric filters produce truthful 400 behavior, never broad Explore;
- every source row is validated BEFORE any predicate can silently exclude malformed data;
- DB failure remains distinct from genuine zero results.

Scrutinize compatibility behavior around `getAllForPublic()` / `searchPublic()` and ensure it cannot weaken production privacy or correctness.

### C. Canonical media / malformed success

Verify:
- public media comes from the canonical persisted image read and preserves canonical ordering;
- genuine zero-media is valid `[]`;
- failed media read is an error;
- every returned media row must carry a non-empty URL and malformed media cannot be silently dropped by filtering/coercion;
- public output exposes URL strings only, not storage/upload internals.

### D. Cloudflare Worker adapter boundary

Review the complete P2.1 `dbClient.ts` changes and relevant tests.

Verify:
- public list/detail SQL shapes are collision-safe exact canonical matches after normalization;
- canonical matchers execute before broad legacy property matchers and cannot be stolen by them;
- PostgREST requests use explicit projections and required publication filters;
- list HTTP-200 malformed non-array payload fails closed;
- detail HTTP-200 payload enforces array shape, zero-or-one cardinality, and requested-id equality;
- comments, wrappers, altered SELECT lists, missing predicates, wrong placeholders, or extra clauses cannot accidentally enter the canonical public adapter;
- no generic SQL execution capability or privacy broadening is introduced.

### E. Availability regression

Verify P2.1 does not change P1.4 semantics or expose private booking/customer/owner identifiers through the public availability response. Confirm failures remain fail-closed.

### F. Quote / finance regression

Verify P2.1 preserves P1.5/P1.6 authority:
- DB price is authoritative;
- quote does not hold dates or create booking/payment state;
- stay-length and overlap semantics remain unchanged;
- response contains only approved Customer-safe quote fields;
- no commission, Owner net, wallet, ledger, payout, or other internal-finance leakage;
- no financial recomputation rule was changed.

### G. Customer App integration / truthful UX state

Verify:
- existing UI sends search intent to the server instead of locally owning canonical filtering;
- invalid client filter state cannot silently downgrade to an unfiltered Explore request;
- path-construction failure and backend failure become truthful ERROR state;
- genuine zero results remain distinct from error;
- no visual redesign or unrelated Customer behavior was introduced;
- client model no longer depends on raw verification/private fields for public properties.

### H. Scope, tests, docs, CI, live truth

Verify:
- expected PR paths are scoped to P2.1 design/plan/tests/docs only;
- no migration/schema/index/dependency/business-rule change;
- no live mutation/deploy/merge claim is fabricated;
- Run #174 / `33761019716` is associated with final candidate SHA and passed; Backend CI explicitly runs P2.1 suite; Customer CI explicitly runs truthful-state + production build; PR Worker deploy was skipped;
- repository documentation/current-task wording does not materially misrepresent publication state or product rules.

## Known pre-Codex findings — explicit disposition required

Do not assume these are resolved merely because tests pass. Explicitly state RESOLVED or BLOCKING with reasoning for each:

1. Client-side search was the semantic authority rather than the backend.
2. Public search/detail DTO boundaries could leak persistence/Admin/Owner fields, including Owner contact data.
3. Malformed public property source rows could be defaulted or silently removed by filters instead of failing closed.
4. Malformed active media `fileUrl` could be silently filtered out and presented as honest missing media.
5. Invalid Customer numeric search filters could be silently omitted, broadening the request to Explore.

Also independently search for any new Critical/Important issue not in this list.

## Required output

Return one of exactly:

`P2_1_CODEX_FINAL_CLEAN`

or

`P2_1_CODEX_FINAL_BLOCKED`

Include:
- reviewed candidate SHA and base SHA;
- PR head/base verification;
- concise disposition of sections A–H;
- explicit disposition of known findings 1–5;
- blockers, if any, with file/path and semantic impact;
- non-blocking observations separately;
- confirmation that no write/merge/deploy/live mutation was performed.

If and only if CLEAN, end with:

`READY_FOR_FOUNDER_PUBLICATION_REVIEW`

# P2.2 — Final Codex Semantic/Security Review

## Mode
READ-ONLY FINAL REVIEW. Do not modify, commit, push, merge, deploy, or mutate Supabase/Storage.

## Exact review target
- Repository: `Essxm01/SOLA-APP`
- PR: `#12` (`validation/p2-2-rc` → `main`)
- Candidate SHA: `f711d0cbbcc5654cb77e91e000c7c7aedb9ed3f9`
- Base SHA: `198a00ea39083932012f54144f93fb7516204024`
- CI Run: `#177`
- CI Run ID: `33785956671`
- CI result: `SUCCESS` on the exact candidate SHA
- Worker deploy step on PR: `SKIPPED`

STOP if PR #12 head/base do not exactly match the SHAs above.

## Approved authority
Read these from the candidate/base as applicable:
- `docs/superpowers/specs/2026-09-03-p2-2-renter-api-contract-design.md`
- `docs/superpowers/plans/2026-09-03-p2-2-renter-api-contract.md`

P2.2 scope is:
1. Customer Profile canonical/fail-closed contract.
2. Customer Account Summary truthful/fail-closed contract.
3. Customer booking create/list/detail privacy-safe DTO contracts + IDOR.
4. Migration 028 canonical Customer Favorites persistence.
5. Atomic Favorites add RPC.
6. Exact/fail-closed Worker/PostgREST Favorites adapter.
7. Server-authoritative Customer Favorites UX integration.

Out of scope and must remain unchanged in product semantics:
- Notifications → P9.1
- Payment → P10
- Chat → P12
- P1.4 availability rules
- P1.5 Migration 026 atomic booking/financial formulas
- P1.6 wallet/ledger rules

## Full candidate changed paths
Exactly these 14 paths versus base:
- `.github/workflows/ci-validation.yml`
- `backend/database/migrations/028_customer_favorites.sql`
- `backend/package.json`
- `backend/server/src/app.ts`
- `backend/server/src/contracts/customerRenter.ts`
- `backend/server/src/services/dbClient.ts`
- `backend/server/src/services/dbRepository.ts`
- `backend/server/src/tests/p15BookingAtomicPersistence.test.ts`
- `backend/server/src/tests/p22RenterApiContract.test.ts`
- `customer-app/src/App.tsx`
- `customer-app/src/utils/customerFavorites.ts`
- `customer-app/src/utils/customerTruthfulState.test.ts`
- `docs/superpowers/plans/2026-09-03-p2-2-renter-api-contract.md`
- `docs/superpowers/specs/2026-09-03-p2-2-renter-api-contract-design.md`

## Mandatory review focus

### A. Migration 028 / RPC security and correctness
Verify:
- `customer_favorites(customer_id, property_id)` uniqueness and FKs are correct.
- RLS enabled.
- table ACL does not expose PUBLIC/anon/authenticated.
- service role table privileges are no broader than required.
- `konfrm_add_customer_favorite(UUID, UUID)` is `SECURITY INVOKER`, never DEFINER.
- `search_path = public, pg_temp` is pinned.
- execution revoked from PUBLIC/anon/authenticated and granted only to service_role.
- add remains atomic: publication eligibility (`deleted_at IS NULL`, `PUBLISHED`, `VERIFIED`) and insert are inside PostgreSQL.
- duplicate add is idempotent without needing UPDATE privilege.
- duplicate path does not resurrect or expose a now-nonpublic property.
- no second RPC/generic SQL escape hatch was introduced.

### B. Worker / PostgREST boundary
Verify exact matcher collision safety for Favorites add/list/delete.
Check response semantics and cardinality:
- add: 0 row truthful non-eligible/not found path; exactly 1 validated row success; >1 fail closed.
- returned customerId/propertyId/createdAt validated semantically and identity-matched.
- list: every row validated; one malformed/mismatched row fails whole read.
- delete: 0 rows is idempotent success; 1 validated matching row success; >1/malformed/mismatched fails.
- no broad SQL matcher or fallback.

### C. Customer identity/profile/account
Verify JWT `sub` is authority and client cannot choose customerId.
Profile DB failure must fail closed, not fall back to memory/phone/local cache as canonical.
Canonical null profile fields must remain null.
Account Summary DB/malformed finance failure must not become truthful-looking zeros.
Genuine zero bookings may return genuine zero metrics.

### D. Booking privacy / business invariants
Customer create/list/detail must not expose internal finance or owner-private data, including ownerId/customerId where not needed, guestPhone, SOLA/KONFRM commission, owner net, payout/wallet/ledger internals.
Customer finance response is only total/deposit/remaining/currency EGP.
Create response must not contain hidden/non-enumerable/prototype-backed `financialSummary`.
Persisted missing/malformed `createdAt` must fail, never be manufactured.
P1.5 atomic Migration 026 path and formulas remain unchanged:
- deposit = actual first night
- commission = 20% of deposit only
- owner net = 80% of deposit
- remaining = total - deposit
- 0 commission on remaining
IDOR: Customer A cannot read Customer B booking.

### E. Fail-closed hydration/DTO chain
Review the full production path, not only direct DTO unit tests.
Check `hydrateBooking()` does not manufacture plausible capacity or finance values before DTO validation.
Missing/malformed bedrooms/bathrooms/maxGuests and customer-facing finance must remain detectable.
Valid PostgreSQL numeric strings may normalize only if semantically valid downstream.
Malformed images/required fields must not be silently dropped/defaulted.
No route-level compensating reads/catch-and-empty behavior may recreate partial booking data.

### F. Favorites public DTO + client truthfulness
GET Favorites must expose only P2.1 public-safe properties that are currently PUBLISHED + VERIFIED, while retaining hidden/nonpublic favorite intent in DB.
DB/media/property failure must be error, not fake empty list.
Customer client validation must not fabricate bedrooms/bathrooms/maxGuests/price.
Favorites state must be server-authoritative and survive reload/login.
Guest favorite intent restoration must not bypass authentication.
Write failure must roll back UI state and show retryable user-visible error.
Loading/error/unauthorized state must not falsely display `(0)` as canonical count.

### G. Regression and scope
Confirm Correction 01/02/03 did not regress P1.2, P1.4, P1.5, P1.6 or P2.1.
Review whether tests actually exercise production-relevant boundaries rather than only source-string checks.
Do not treat green CI alone as correctness proof.

## Known pre-Codex corrections already addressed
1. Duplicate Favorite used `DO UPDATE` without UPDATE grant → changed to `DO NOTHING` + eligible duplicate read.
2. Worker Favorite response/cardinality validation hardened.
3. Missing/malformed booking DTO values no longer defaulted at DTO layer.
4. Customer create response hidden `financialSummary` workaround removed; P1.5 legacy test updated instead.
5. Route-level compensating booking-detail hydration removed.
6. Favorite client public DTO validation hardened.
7. `hydrateBooking()` capacity/finance nullish fabrication corrected and regression-tested.

Independently verify each; do not assume these claims are true.

## CI evidence to independently verify
GitHub Actions Run #177 / `33785956671`:
- event: pull_request
- head: `f711d0cbbcc5654cb77e91e000c7c7aedb9ed3f9`
- base: `198a00ea39083932012f54144f93fb7516204024`
- conclusion: SUCCESS
- Backend check: success
- critical backend regression suite: success, including `test:p2-2-renter-api`
- Customer build/truthful-state validation: success
- Owner/Admin validation: success
- Cloudflare Worker deploy step: SKIPPED

## Output contract
Report findings by severity: Critical / Important / Minor.
Only Critical or Important correctness/security/privacy/product-contract regressions block publication.
For every blocker provide exact file/function/behavior and why it violates the approved contract.
Do not propose unrelated refactors.

If no Critical or Important blocker remains, end EXACTLY with:
`READY_FOR_FOUNDER_PUBLICATION_REVIEW`

If any Critical or Important blocker remains, end EXACTLY with:
`P2_2_CODEX_FINAL_BLOCKED`

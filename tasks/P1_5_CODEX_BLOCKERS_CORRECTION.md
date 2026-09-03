# P1.5 — Codex Blockers Correction Contract

TASK_ID: P1.5-CODEX-BLOCKERS-CORRECTION
MODE: TARGETED_IMPLEMENTATION_CORRECTION
REPOSITORY: Essxm01/SOLA-APP
CANDIDATE_BRANCH: validation/p1-5-rc
STARTING_CANDIDATE_SHA: 88c2dcedc0e76df023446fa9aef46cea1a6f7bc0
BASE_MAIN_SHA: 477ef6a1b274e98a7b757f0b0b77ea8815cee741
PULL_REQUEST: #9
LIVE_MUTATION: FORBIDDEN
MIGRATION_026_STATUS: REPOSITORY_ONLY_NOT_APPLIED_LIVE

## Objective
Correct exactly the three semantic blockers found by the final Codex review of P1.5, without changing product, financial, booking lifecycle, availability, payment, idempotency, or architecture rules beyond the already-approved atomic booking persistence boundary.

Do not broaden scope. Do not refactor unrelated code.

## Fail-Fast
Before editing:
1. Fetch origin.
2. Verify current branch is `validation/p1-5-rc`.
3. Verify `origin/validation/p1-5-rc` is exactly `88c2dcedc0e76df023446fa9aef46cea1a6f7bc0`.
4. Verify merge-base with `origin/main` is `477ef6a1b274e98a7b757f0b0b77ea8815cee741` unless main has moved. If main moved, STOP and report `BASE_MAIN_MOVED` without rebasing or inventing a resolution.
5. Verify Migration 026 is still repository-only; do not contact or mutate Supabase.

On SHA mismatch stop with `TASK_HANDOFF_MISMATCH`.

## Required Corrections — Exactly Three

### 1. Migration 026 return-type correctness
File: `backend/database/migrations/026_atomic_booking_request_creation.sql`

The function declares `"guestName" text` but `public.bookings.guest_name` is `varchar(100)` and the current `RETURN QUERY` returns `v_booking.guest_name` without a cast.

Make the smallest safe correction:
- return `v_booking.guest_name::text` for the `guestName` result column.
- Do not change the table schema.
- Do not change the RPC signature, privileges, transaction boundary, financial values, status guard, or Migration 025/exclusion behavior.

Add/strengthen a migration-contract assertion so this exact regression is caught deterministically.

### 2. Make the Worker RPC matcher exact and collision-safe
File: `backend/server/src/services/dbClient.ts`

Current defect:
`lowerSql.includes('konfrm_create_booking_request')` is too broad and can reinterpret unrelated future SQL mentioning the function as the mutating RPC.

Required behavior:
- Match only the exact canonical repository query shape used by `bookingDb.create`:
  `SELECT * FROM konfrm_create_booking_request($1, ... $18)`
- Whitespace/case normalization is acceptable, but the semantic shape and all 18 positional placeholders must be exact.
- A comment, unrelated SELECT, wrapper query, different argument count, or any SQL that merely contains the function name must NOT enter this RPC adapter branch.
- Do not create a generic RPC/SQL execution surface.
- Preserve the one-request PostgREST RPC behavior for the canonical query.

Add a deterministic negative matcher-collision test plus the existing positive exact-match test.

### 3. Fail closed on partial/malformed RPC rows
File: `backend/server/src/services/dbClient.ts`
Tests: `backend/server/src/tests/p15BookingAtomicPersistence.test.ts`

Current defect:
The adapter validates only a subset of the returned row, so a partial one-row RPC response can flow to the route as a false `201` with missing values (for example missing `summaryRemainingBalance`).

Required behavior:
- Before returning success from the adapter, validate every booking/result field required to construct the canonical returned booking and financial summary.
- At minimum, all fields returned by Migration 026 and consumed/mapped into the adapter result must be present and non-null where the DB contract is non-null: booking identity/ownership/date/status fields plus all six financial-summary result values.
- Numeric summary fields must reject missing/null/non-finite values rather than allowing `Number(undefined)`/`null`-like false success downstream.
- Preserve truthful `DATE_MANUALLY_BLOCKED` evidence and existing non-2xx/network/zero-row/multi-row failure semantics.
- Do not expose internal commission/Owner-net values to the Customer response; this correction is adapter validation only.

Add a focused test where an otherwise one-row success response is missing `summaryRemainingBalance` (and preferably one additional required field) and assert fail-closed with the P1.5 malformed-response error, never `201`.

## Preserve Invariants
- One narrow PostgreSQL RPC transaction creates booking + financial summary atomically.
- Initial status remains `PENDING_OWNER_APPROVAL` only.
- PENDING_OWNER_APPROVAL remains non-blocking.
- APPROVED_PENDING_PAYMENT and CONFIRMED remain blocking.
- Deposit = actual first-night price.
- KONFRM commission = 20% of deposit only.
- Owner net deposit = 80% of deposit.
- Remaining balance = total - deposit.
- Commission on remaining balance = 0.
- Customer must not see internal commission/Owner split.
- No booking-create idempotency contract may be invented.
- No sequential booking + summary fallback.
- No compensating delete in the active create route.

## Required Validation
Run at minimum:
- `npm --prefix backend run check`
- `npm --prefix backend run test:p1-5-atomic-booking`
- `npm --prefix backend run test:p1-4-availability`
- `npm --prefix backend run test:p1-4-worker-availability`
- `npm --prefix backend run test:p1-4-migration`
- `npm --prefix backend run test:booking-01`
- `npm --prefix backend run test:booking-01-1`
- `git diff --check`

If a test fails, fix only defects directly caused by this correction and rerun until clean. Do not hide or weaken assertions.

## Publication Restrictions
DO NOT:
- apply Migration 026 live;
- mutate Supabase or Storage;
- deploy Cloudflare;
- merge PR #9;
- modify financial/business rules;
- rebase onto a moved main without Orchestrator direction;
- touch unrelated production files.

Push the corrected candidate to `origin/validation/p1-5-rc` only after validation is clean.

## Required Report
Return:
1. `P1_5_CODEX_BLOCKERS_CORRECTION_PASS` or `...BLOCKED`.
2. Starting candidate SHA.
3. Final corrected candidate SHA.
4. Exact changed paths.
5. Exact fix for each of the three Codex blockers.
6. Validation command results.
7. PR #9 exact-head CI run ID/result if available after push.
8. Migration 026 status = NOT APPLIED LIVE.
9. Live mutation = NONE.
10. Remaining blocker before final Codex re-review, if any.

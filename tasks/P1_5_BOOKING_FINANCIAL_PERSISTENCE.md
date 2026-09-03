# KONFRM — P1.5 Booking + Financial Summary Persistence Integrity

TASK_ID: P1.5
EXECUTOR: ZCode
MODE: HEAVY_IMPLEMENTATION
BASE_MAIN_SHA: 477ef6a1b274e98a7b757f0b0b77ea8815cee741
BRANCH: validation/p1-5-rc
LIVE_MUTATION: FORBIDDEN
MERGE_TO_MAIN: FORBIDDEN
CLOUDFLARE_DEPLOY: FORBIDDEN
SUPABASE_MIGRATION_APPLY: FORBIDDEN

## Current verified baseline

- P1.4 is CLOSED and live-verified.
- Migration `025_availability_blocking_integrity.sql` is applied live in Supabase.
- `main` is `477ef6a1b274e98a7b757f0b0b77ea8815cee741`.
- GitHub Actions run #161 / ID `33704714608` passed on that main SHA.
- Cloudflare Worker deployment from run #161 succeeded; Worker Version ID `e2e963a9-3fb8-407e-a305-cd72fe2a0cc9`.
- Do not reopen P1.4.

## Problem to close

Current Customer booking creation is not atomic across booking persistence and canonical financial-summary persistence.

Current verified route behavior in `backend/server/src/app.ts`:
1. revalidates availability,
2. calculates canonical booking financials server-side,
3. persists the booking via `bookingDb.create(...)`,
4. then separately persists `booking_financial_summaries` via `bookingDb.createFinancialSummary(...)`,
5. if the second write fails, attempts `bookingDb.deleteNewBooking(...)` as compensating cleanup.

Current verified repository behavior in `backend/server/src/services/dbRepository.ts`:
- `bookingDb.create` is a standalone booking INSERT.
- `bookingDb.createFinancialSummary` is a standalone financial-summary INSERT.
- `bookingDb.deleteNewBooking` is a compensating DELETE limited to pending bookings.

The Worker/PostgREST adapter performs the booking and summary writes as separate HTTP statements. Compensating deletion is not equivalent to one PostgreSQL transaction and must not be treated as atomicity.

## Objective

Make creation of a booking request and its canonical `booking_financial_summaries` row one indivisible database transaction, while preserving every current product, availability, security, and financial invariant.

Success means:
- both records persist, or neither persists;
- no orphan booking can remain because financial-summary persistence failed;
- no orphan financial summary can exist without its booking;
- Worker execution uses one transaction-capable database boundary rather than sequential PostgREST mutations plus compensation;
- current API success/error semantics remain truthful.

## Required implementation direction

At implementation start, verify the exact transaction mechanism against current repository/live-schema conventions.

Preferred architecture is one narrow PostgreSQL transaction/RPC invoked once by the backend/Worker adapter. Do NOT invent a generic SQL-over-HTTP mechanism and do NOT add a broad database execution surface.

If an RPC/function is introduced:
- keep it narrowly scoped to atomic booking + financial-summary creation;
- it must execute the booking INSERT and summary INSERT in the same PostgreSQL transaction;
- preserve Migration 025 booking trigger behavior, the existing booking overlap exclusion constraint, FK constraints, and all existing integrity checks;
- do not bypass triggers or constraints;
- do not expose a new user-callable public capability;
- revoke EXECUTE from `PUBLIC`, `anon`, and `authenticated` unless an existing authoritative pattern proves otherwise;
- preserve required `service_role` backend execution;
- set a safe explicit `search_path`;
- do not weaken RLS/security posture;
- use the next migration number only after confirming repository sequence from the current branch. Migration candidate must remain repository-only.

## Product invariants — immutable

Availability:
- stay length: 2–30 nights;
- `PENDING_OWNER_APPROVAL` does NOT block inventory;
- `APPROVED_PENDING_PAYMENT` blocks inventory;
- `CONFIRMED` blocks inventory;
- quote is not a hold;
- booking creation revalidates availability;
- availability/DB failure fails closed;
- Migration 025 manual-block race protection must remain intact.

Booking lifecycle:
- new request starts `PENDING_OWNER_APPROVAL`;
- Owner approval -> `APPROVED_PENDING_PAYMENT`;
- rejection -> `REJECTED`;
- no payment before Owner approval;
- payment later moves eligible booking to `CONFIRMED` through the existing payment path.

Finance — do not change formulas:
- deposit = actual first-night price;
- commission = 20% of deposit only;
- Owner net deposit = 80% of deposit;
- remaining balance = total booking value - deposit;
- commission on remaining balance = 0;
- Customer must not receive internal commission/Owner split fields;
- backend remains authoritative for financial calculation;
- P1.5 is persistence integrity, not a finance-policy redesign.

## Do not touch unless strictly required by the atomic persistence boundary

- cancellation/refund policy;
- payment provider/live Paymob networking;
- wallet/payout rules;
- chat/reviews/notifications;
- Owner/Admin/Customer UI;
- unrelated schema/RLS/storage;
- Migration 025 logic except compatibility required by the atomic insert path;
- broad `dbClient` refactors.

## Hot context — inspect these first

1. `backend/server/src/app.ts`
   - Customer booking creation around the current `bookingDb.create` -> `createFinancialSummary` -> `deleteNewBooking` compensation path.
2. `backend/server/src/services/dbRepository.ts`
   - `bookingDb.create`
   - `bookingDb.createFinancialSummary`
   - `bookingDb.deleteNewBooking`
   - `bookingDb.getFinancialSummary`
3. `backend/server/src/services/dbClient.ts`
   - current PostgREST handling for booking INSERT / financial-summary INSERT / delete and RPC conventions.
4. `backend/database/migrations/025_availability_blocking_integrity.sql`
5. existing booking/payment RPC migrations, especially transaction/security patterns.
6. `backend/server/src/tests/booking01.test.ts`
7. P1.4 focused availability/Worker/migration tests.
8. `docs/BUSINESS_RULES.md`

Use additional files only when a concrete dependency requires them. Do not perform a broad repo rediscovery.

## Idempotency boundary

Verify current authoritative booking-create idempotency expectations before changing behavior.

- If an existing authoritative contract/test already requires an idempotency mechanism, preserve/close it in P1.5.
- If no authoritative client-visible booking-create idempotency contract exists, do not invent a new product/API contract merely for this task.
- Atomicity itself is mandatory regardless.

## Required tests

Add/update deterministic tests proving at minimum:

1. Atomic success
   - one request produces one booking and one matching financial summary.

2. Atomic failure of summary persistence
   - force/represent a summary-side DB failure;
   - prove no booking survives.

3. Booking-side conflict
   - booking constraint/manual availability conflict creates neither record.

4. Migration 025 compatibility
   - manual block conflict remains a truthful availability conflict;
   - PENDING request semantics and approval-time blocking rules remain unchanged.

5. Financial persistence integrity
   - stored summary matches canonical server-calculated total/deposit/commission/owner-net/remaining values;
   - `commission_on_remaining_balance = 0`.

6. Worker/PostgREST contract
   - one narrow transaction-capable call is used for atomic creation;
   - malformed/error response fails closed;
   - no fallback to sequential booking + summary writes.

7. Regression
   - existing booking lifecycle tests;
   - P1.4 availability tests;
   - P1.3 Worker adapter regression where relevant;
   - TypeScript check.

## CI

Add the focused P1.5 deterministic test command(s) to the Backend validation job if required.
Do not alter deployment triggers/gating in this task. The known CI deploy-gating defect is separate and non-blocking.

## Documentation

Update only operational task/current-state documentation necessary to state:
- P1.4 is closed/live-verified at `main` `477ef6a1...` with Migration 025 live;
- P1.5 is the active candidate;
- any new migration for P1.5 remains NOT APPLIED LIVE;
- do not claim P1.5 closed or live before publication gates.

Do not perform broad documentation cleanup.

## Fail-fast checks before editing

Verify all of the following:
- branch is exactly `validation/p1-5-rc`;
- task handoff SHA provided by Founder/Orchestrator is exact remote branch HEAD;
- merge base/main is `477ef6a1b274e98a7b757f0b0b77ea8815cee741` unless the Orchestrator explicitly supplies a newer approved baseline;
- working tree is clean;
- Migration 025 file is present in the baseline;
- no live mutation authorization exists for P1.5.

Mismatch => stop with `TASK_HANDOFF_MISMATCH`.

## Validation before reporting ready

Run focused relevant checks, including at minimum:
- backend TypeScript check;
- all new P1.5 tests;
- existing booking canonical tests;
- P1.4 availability + Worker availability + migration-contract suites;
- `git diff --check`;
- clean tracked working tree after commit.

Push the completed candidate to `origin/validation/p1-5-rc`.
Do not open/merge a publication PR unless explicitly requested; the Orchestrator may open the PR after independent verification.

## Required final report

Return:

1. `RESULT`: `P1_5_IMPLEMENTATION_READY_FOR_REVIEW` or exact blocker.
2. Starting TASK HANDOFF SHA.
3. Verified base main SHA.
4. Final implementation SHA.
5. Exact changed paths.
6. Transaction mechanism implemented and why it is truly atomic.
7. New migration filename/status (`REPOSITORY_ONLY_NOT_APPLIED_LIVE`).
8. Security/EXECUTE-grant treatment for any new RPC.
9. Validation commands + concise PASS/FAIL evidence.
10. Confirmation Migration 025 semantics/regressions remain intact.
11. Confirmation no live Supabase/Storage/Cloudflare mutation occurred.
12. Any remaining blocker before final Codex review.

Do not declare P1.5 closed. Do not apply any migration live. Do not merge to main.
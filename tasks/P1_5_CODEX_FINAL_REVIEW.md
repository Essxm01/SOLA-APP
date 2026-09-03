# P1.5 — Final Codex Review Contract

TASK_ID: P1.5-FINAL-CODEX-REVIEW
MODE: READ_ONLY_FINAL_REVIEW
REPOSITORY: Essxm01/SOLA-APP
CANDIDATE_BRANCH: validation/p1-5-rc
FINAL_IMPLEMENTATION_SHA: 88c2dcedc0e76df023446fa9aef46cea1a6f7bc0
BASE_MAIN_SHA: 477ef6a1b274e98a7b757f0b0b77ea8815cee741
PULL_REQUEST: #9
EXACT_HEAD_CI: Run #163 / 33708817324 — SUCCESS
LIVE_MUTATION: FORBIDDEN
MIGRATION_026: REPOSITORY_ONLY_NOT_APPLIED_LIVE

## Objective
Perform one final semantic review of the exact corrected P1.5 implementation SHA. Decide whether the candidate safely closes Booking + Financial Summary persistence integrity without changing product, finance, availability, payment, or architecture rules beyond the approved atomic persistence boundary.

## Required Review Focus

### 1. True transaction atomicity
Verify customer booking request creation no longer depends on two independent Worker/PostgREST writes plus compensation. The accepted mechanism must be ONE narrow PostgreSQL transaction/RPC such that:
- booking row and `booking_financial_summaries` row persist together or neither persists;
- summary failure rolls back booking creation;
- booking/availability constraint failure leaves no summary;
- there is no sequential REST fallback in the active customer create route.

### 2. Migration 026 correctness
Review `backend/database/migrations/026_atomic_booking_request_creation.sql` for:
- PostgreSQL/PLpgSQL correctness and no ambiguous identifier defect;
- ordinary INSERTs that still fire Migration 025 availability guards and existing booking constraints;
- canonical initial status restricted to `PENDING_OWNER_APPROVAL`;
- no public/general-purpose booking write surface;
- `SECURITY INVOKER`, controlled `search_path`, and EXECUTE restricted to `service_role`;
- schema_migrations recording only after successful migration transaction.

### 3. Financial invariants
The implementation MUST preserve existing authoritative server-calculated values and MUST NOT change product finance rules:
- deposit = actual first-night price;
- commission = 20% of deposit only;
- Owner net deposit = 80% of deposit;
- remaining balance = total - deposit;
- commission on remaining balance = 0;
- Customer-facing response does not expose internal commission split.
Confirm the RPC persists backend-calculated values rather than introducing a new calculation source.

### 4. Worker/PostgREST adapter semantics
Review the narrow `dbClient.ts` matcher and `bookingDb.create` call:
- exactly one RPC request for atomic create;
- malformed/non-2xx/zero-or-multi-row/network failure fails closed;
- Migration 025 `DATE_MANUALLY_BLOCKED` evidence remains available for truthful 409 mapping;
- no generic SQL/RPC execution surface is introduced;
- no matcher collision with unrelated SQL paths.

### 5. Route and regression behavior
Confirm:
- booking creation still revalidates availability;
- `PENDING_OWNER_APPROVAL` remains non-blocking;
- Owner approval/payment ordering remains unchanged;
- compensating delete is absent from the active create path;
- legacy helper retention elsewhere does not create an active sequential fallback for this route;
- P1.4 semantics remain intact.

### 6. Corrected test / CI evidence
The only change after implementation SHA `25b351939697968de6dc3258e32cebcbf073a2a6` is one hermeticity correction commit touching only `backend/server/src/tests/p15BookingAtomicPersistence.test.ts` (+5/-2). Confirm no production or migration file changed in that correction.
Review P1.5 test coverage, modified P1.4 stub, package script, and CI wiring. Exact-head CI #163 succeeded: Detect Changed Modules, Backend, Customer, Owner, Admin all PASS; Worker deploy skipped because PR event.

### 7. Idempotency boundary
Do NOT invent booking-create idempotency. Verify that no authoritative booking-create idempotency contract currently exists. Treat idempotency as out of scope unless an existing approved contract is found in current authority.

### 8. Live-state boundary
Read-only Supabase verification before this handoff showed:
- migration 026 is not recorded in `schema_migrations`;
- `public.konfrm_create_booking_request` does not exist live.
Do not mutate Supabase during review.

## Do Not
- Do not edit files.
- Do not commit or push.
- Do not apply Migration 026.
- Do not deploy Cloudflare.
- Do not merge PR #9.
- Do not change financial/business rules.
- Do not expand P1.5 into P1.6 or later phases.

## Expected Output
Return exactly one of:

`P1_5_CODEX_FINAL_CLEAN`

or

`P1_5_CODEX_FINAL_BLOCKED`

Then include:
- reviewed implementation SHA;
- base main SHA;
- PR/head state;
- exact blocking findings, if any, with file/function references;
- assessment of transaction atomicity, financial-rule preservation, Worker adapter strictness, Migration 026 privilege surface, and regression coverage;
- whether Migration 026 remains unapplied live;
- confirmation no mutation was performed;
- final gate: `READY_FOR_FOUNDER_PUBLICATION_REVIEW` only if CLEAN.

Stop on any SHA mismatch.
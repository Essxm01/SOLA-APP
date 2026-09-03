# P1.5 — Final Codex Re-Review Contract

TASK_ID: P1.5-FINAL-CODEX-REREVIEW
MODE: READ_ONLY_FINAL_REVIEW
REPOSITORY: Essxm01/SOLA-APP
CANDIDATE_BRANCH: validation/p1-5-rc
FINAL_IMPLEMENTATION_SHA: b0b61bcd1974f15028ff59e2954f74eca14ce27e
BASE_MAIN_SHA: 477ef6a1b274e98a7b757f0b0b77ea8815cee741
PULL_REQUEST: #9
EXACT_HEAD_CI: Run #164 / 33710265122 — SUCCESS
LIVE_MUTATION: FORBIDDEN
MIGRATION_026: REPOSITORY_ONLY_NOT_APPLIED_LIVE

## Objective
Perform the final semantic re-review of the exact P1.5 candidate after the three previously reported Codex blockers were corrected. Decide whether P1.5 safely closes Booking + Financial Summary persistence integrity without changing product, finance, availability, payment, or architecture rules beyond the approved atomic persistence boundary.

## Mandatory Re-Review of the Three Prior Blockers

### Blocker 1 — Migration return-type correctness
Verify `backend/database/migrations/026_atomic_booking_request_creation.sql` now returns `v_booking.guest_name::text` for the declared `"guestName" text` result column, and that the migration remains otherwise semantically unchanged.

### Blocker 2 — Collision-safe Worker matcher
Verify `backend/server/src/services/dbClient.ts` recognizes only the exact normalized repository query shape for `SELECT * FROM konfrm_create_booking_request($1 ... $18)` with the canonical ordered 18 placeholders. Comments, wrappers, string mentions, wrong arity, or wrong parameter order must not be reinterpreted as the booking-create RPC.

### Blocker 3 — Fail closed on partial RPC rows
Verify the Worker adapter validates every booking and financial-summary field consumed downstream before treating a one-row response as success. Missing/null/invalid required values must fail with `REST_BOOKING_REQUEST_CREATE_MALFORMED_RESPONSE`; `customerId` may remain nullable only where allowed by the DB contract. Confirm tests cover a missing summary field and a missing booking field.

## Full Final Review Focus

### 1. True transaction atomicity
Verify customer booking request creation uses ONE narrow PostgreSQL transaction/RPC such that:
- booking row and `booking_financial_summaries` row persist together or neither persists;
- summary failure rolls back booking creation;
- booking/availability constraint failure leaves no summary;
- there is no sequential REST fallback in the active customer create route.

### 2. Migration 026 correctness and privilege surface
Verify:
- PostgreSQL/PLpgSQL return types are valid;
- ordinary INSERTs still fire Migration 025 availability guards and existing booking constraints;
- canonical initial status is restricted to `PENDING_OWNER_APPROVAL`;
- no public/general-purpose booking write surface exists;
- `SECURITY INVOKER`, controlled `search_path`, and EXECUTE remain restricted to `service_role`;
- `schema_migrations` is recorded only after successful migration transaction.

### 3. Financial invariants
The implementation MUST preserve authoritative server-calculated values:
- deposit = actual first-night price;
- commission = 20% of deposit only;
- Owner net deposit = 80% of deposit;
- remaining balance = total - deposit;
- commission on remaining balance = 0;
- Customer-facing response does not expose internal commission split.
Confirm the RPC persists backend-calculated values rather than introducing a new calculation source.

### 4. Worker/PostgREST semantics
Confirm:
- exactly one RPC request for atomic create;
- malformed/non-2xx/zero-or-multi-row/network failure fails closed;
- Migration 025 `DATE_MANUALLY_BLOCKED` evidence remains available for truthful 409 mapping;
- no generic SQL/RPC execution surface or matcher collision is introduced.

### 5. Route and regression behavior
Confirm:
- booking creation still revalidates availability;
- `PENDING_OWNER_APPROVAL` remains non-blocking;
- Owner approval/payment ordering remains unchanged;
- compensating delete is absent from the active create path;
- P1.4 semantics remain intact.

### 6. Correction scope and CI evidence
Compare prior reviewed SHA `88c2dcedc0e76df023446fa9aef46cea1a6f7bc0` to final SHA `b0b61bcd1974f15028ff59e2954f74eca14ce27e`.
The correction must be one commit touching only:
- `backend/database/migrations/026_atomic_booking_request_creation.sql`
- `backend/server/src/services/dbClient.ts`
- `backend/server/src/tests/p15BookingAtomicPersistence.test.ts`

Exact-head CI #164 / 33710265122 succeeded. Backend, Customer, Owner, Admin, and Detect Changed Modules all PASS. Cloudflare Worker deployment was skipped because the event is a pull request.

### 7. Idempotency boundary
Do NOT invent booking-create idempotency. No authoritative booking-create idempotency contract has been approved for this scope.

### 8. Live-state boundary
Independent read-only Supabase verification immediately before this handoff showed:
- migration 026 is not recorded in `schema_migrations`;
- `public.konfrm_create_booking_request(...)` does not exist live.
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
- disposition of each of the three prior blockers;
- exact blocking findings, if any;
- assessment of transaction atomicity, financial-rule preservation, Worker adapter strictness, Migration 026 privilege surface, and regression coverage;
- whether Migration 026 remains unapplied live;
- confirmation no mutation was performed;
- final gate: `READY_FOR_FOUNDER_PUBLICATION_REVIEW` only if CLEAN.

Stop on any SHA mismatch.
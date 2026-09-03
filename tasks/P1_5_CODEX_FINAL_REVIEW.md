# P1.5 — Final Codex Re-Review Contract

TASK_ID: P1.5-FINAL-CODEX-REREVIEW
MODE: READ_ONLY_FINAL_REVIEW
REPOSITORY: Essxm01/SOLA-APP
CANDIDATE_BRANCH: validation/p1-5-rc
FINAL_IMPLEMENTATION_SHA: 9bb8d7be6d97bebcc21551c74b3c812f8a9984b4
BASE_MAIN_SHA: 477ef6a1b274e98a7b757f0b0b77ea8815cee741
PULL_REQUEST: #9
EXACT_HEAD_CI: Run #165 / 33711327303 — SUCCESS
LIVE_MUTATION: FORBIDDEN
MIGRATION_026: REPOSITORY_ONLY_NOT_APPLIED_LIVE

## Objective
Perform the final semantic re-review of the exact P1.5 candidate after all previously reported Codex blockers and the final invalid-booking-field validation blocker were corrected. Decide whether P1.5 safely closes Booking + Financial Summary persistence integrity.

## Mandatory blocker disposition

### 1. Migration return-type correctness
Verify `backend/database/migrations/026_atomic_booking_request_creation.sql` returns `v_booking.guest_name::text` for declared `"guestName" text` and remains otherwise semantically sound.

### 2. Collision-safe Worker matcher
Verify `backend/server/src/services/dbClient.ts` accepts only the exact canonical `SELECT * FROM konfrm_create_booking_request($1 ... $18)` shape with ordered 18 placeholders. Comments, wrappers, string mentions, wrong arity, or wrong order must not enter the RPC branch.

### 3. Partial/malformed RPC row handling
Verify every booking and financial-summary field consumed downstream is validated before success. Missing/null/invalid values must fail with `REST_BOOKING_REQUEST_CREATE_MALFORMED_RESPONSE`.

### 4. Final invalid-booking-field validation correction
Explicitly verify the final commit after `b0b61bcd1974f15028ff59e2954f74eca14ce27e`:
- changes only `backend/server/src/services/dbClient.ts` and `backend/server/src/tests/p15BookingAtomicPersistence.test.ts`;
- validates `id`, `propertyId`, `ownerId` as UUID strings;
- validates `bookingNumber` and `guestName` as non-empty strings;
- requires `customerId` to be present, allows `null`, otherwise requires UUID string;
- validates `checkIn` and `checkOut` as real strict `YYYY-MM-DD` calendar dates;
- validates `nights` and `guestsCount` as positive integers;
- validates `status` exactly as `PENDING_OWNER_APPROVAL`;
- validates `createdAt` as a non-empty parseable date/time string;
- preserves strict finite-number validation for all six financial summary values;
- preserves `customerId: null` during validation and mapping;
- adds deterministic malformed-row tests for invalid types/values and a positive nullable-customerId case.

## Full final review focus

### Atomicity
Verify customer booking request creation uses ONE narrow PostgreSQL transaction/RPC such that booking + financial summary persist together or neither persists, with no sequential REST fallback or compensating-delete path in the active create route.

### Migration 026 and privilege surface
Verify PostgreSQL correctness, Migration 025 trigger/exclusion compatibility, canonical initial status restriction, `SECURITY INVOKER`, controlled `search_path`, service-role-only EXECUTE, and migration recording only after successful transaction.

### Financial invariants
Must remain unchanged:
- deposit = actual first-night price;
- commission = 20% of deposit only;
- Owner net deposit = 80% of deposit;
- remaining balance = total - deposit;
- commission on remaining balance = 0;
- Customer-facing response does not expose internal commission split.
The RPC must persist backend-calculated values and not become a new financial calculation source.

### Worker/PostgREST semantics
Confirm exactly one atomic-create RPC request; malformed/non-2xx/zero-or-multi-row/network outcomes fail closed; `DATE_MANUALLY_BLOCKED` evidence survives for truthful 409 mapping; no generic SQL/RPC surface or matcher collision exists.

### Route/regression behavior
Confirm availability is revalidated; `PENDING_OWNER_APPROVAL` remains non-blocking; Owner approval/payment ordering is unchanged; P1.4 semantics remain intact; no booking-create idempotency contract was invented.

## Exact correction scope and CI evidence
Final correction from `b0b61bcd1974f15028ff59e2954f74eca14ce27e` to `9bb8d7be6d97bebcc21551c74b3c812f8a9984b4` is one commit and must touch only:
- `backend/server/src/services/dbClient.ts`
- `backend/server/src/tests/p15BookingAtomicPersistence.test.ts`

Exact-head CI #165 / 33711327303 succeeded. Backend, Customer, Owner, Admin, and Detect Changed Modules all PASS. Worker deployment was skipped because the event is a pull request.

## Live-state boundary
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
- explicit disposition of all prior blockers including the final invalid-value blocker;
- exact blocking findings, if any;
- assessment of transaction atomicity, financial-rule preservation, Worker adapter strictness, Migration 026 privilege surface, and regression coverage;
- whether Migration 026 remains unapplied live;
- confirmation no mutation was performed;
- final gate: `READY_FOR_FOUNDER_PUBLICATION_REVIEW` only if CLEAN.

Stop on any SHA mismatch.
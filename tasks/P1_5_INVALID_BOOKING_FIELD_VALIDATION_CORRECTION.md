# P1.5 — Invalid Booking Field Validation Correction

TASK_ID: P1.5-INVALID-BOOKING-FIELD-VALIDATION
MODE: TARGETED_IMPLEMENTATION_CORRECTION
REPOSITORY: Essxm01/SOLA-APP
CANDIDATE_BRANCH: validation/p1-5-rc
STARTING_CANDIDATE_SHA: b0b61bcd1974f15028ff59e2954f74eca14ce27e
BASE_MAIN_SHA: 477ef6a1b274e98a7b757f0b0b77ea8815cee741
PULL_REQUEST: #9
LIVE_MUTATION: FORBIDDEN
MIGRATION_026: MUST_REMAIN_UNAPPLIED_LIVE

## Objective
Close the single remaining Codex blocker in the P1.5 Worker/PostgREST adapter. The current adapter rejects missing/null required booking fields but can still accept invalid types/values and return a false 201. Correct this narrowly without changing transaction design, migration 026, booking rules, financial rules, route behavior, or unrelated adapter matchers.

## Verified Current Defect
At starting SHA `b0b61bcd...`, `backend/server/src/services/dbClient.ts` validates presence of booking fields but not semantic type/value validity. Therefore malformed one-row RPC responses such as `status: 17`, `nights: "two"`, or `checkIn: {}` can pass the adapter and reach the customer route as success.

## Required Correction
Modify only the P1.5 RPC response validation and its deterministic tests unless a directly necessary adjacent type/helper definition must change.

### Booking fields that must fail closed when invalid
Validate the values after camelCase/snake_case resolution and before mapping:
- `id`: non-empty UUID string.
- `bookingNumber`: non-empty string.
- `propertyId`: non-empty UUID string.
- `ownerId`: non-empty UUID string.
- `customerId`: field must be present; value may be `null` because schema allows it, otherwise must be a non-empty UUID string.
- `guestName`: non-empty string.
- `checkIn`: valid strict ISO date string `YYYY-MM-DD`.
- `checkOut`: valid strict ISO date string `YYYY-MM-DD`.
- `nights`: positive integer.
- `guestsCount`: positive integer.
- `status`: exact canonical `PENDING_OWNER_APPROVAL` for this create RPC result.
- `createdAt`: valid non-empty timestamp string parseable as a date/time; reject non-string values and invalid timestamp strings.

Preserve the existing strict validation for all six financial summary fields: each required and finite numeric.

All malformed booking-field failures must throw an error beginning with:
`REST_BOOKING_REQUEST_CREATE_MALFORMED_RESPONSE`

Do not silently coerce invalid values with `String()`, `Number()`, truthiness, or permissive parsing that would convert malformed payloads into valid-looking data.

## Required Tests
Extend `backend/server/src/tests/p15BookingAtomicPersistence.test.ts` with deterministic malformed-response cases proving at minimum:
1. numeric/non-string `status` is rejected;
2. non-integer/string `nights` is rejected;
3. object/non-string `checkIn` is rejected;
4. invalid UUID for `id` or one owner/property identifier is rejected;
5. invalid/non-string `createdAt` is rejected;
6. nullable `customerId: null` remains accepted when all other fields are valid;
7. existing missing-field and missing-summary tests remain green;
8. valid canonical RPC response still succeeds with one RPC call.

Prefer table-driven test cases to keep the correction compact.

## Scope Boundaries
Do NOT:
- modify `026_atomic_booking_request_creation.sql`;
- change the exact 18-placeholder matcher unless strictly necessary to keep tests compiling;
- change the booking route or repository transaction mechanism;
- change any financial formula or customer-facing financial exposure;
- add idempotency;
- broaden to P1.6;
- apply any migration live;
- deploy Cloudflare;
- merge PR #9.

## Validation
Run at minimum:
- `npm --prefix backend run check`
- `npm --prefix backend run test:p1-5-atomic-booking`
- `npm --prefix backend run test:p1-4-availability`
- `npm --prefix backend run test:p1-4-worker-availability`
- `npm --prefix backend run test:p1-4-migration`
- `npm --prefix backend run test:booking-01`
- `npm --prefix backend run test:booking-01-1`
- `git diff --check`

Commit and push the correction to `validation/p1-5-rc`. Do not force-push.

## Required Report
Return:
1. RESULT = `P1_5_INVALID_BOOKING_FIELD_VALIDATION_PASS` or `P1_5_INVALID_BOOKING_FIELD_VALIDATION_FAIL`
2. starting candidate SHA
3. final corrected candidate SHA
4. exact changed paths
5. exact validation rules added
6. tests added and results
7. PR #9 exact-head CI run/result after push
8. Migration 026 status = NOT APPLIED LIVE
9. Live mutation = NONE
10. remaining blocker before Codex re-review

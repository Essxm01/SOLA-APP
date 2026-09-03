# P1.6 — Pre-Codex Correction

TASK_ID: P1.6_PRE_CODEX_CORRECTION
EXECUTOR: Antigravity
MODE: TARGETED_MECHANICAL_CORRECTION
CANDIDATE_BRANCH: validation/p1-6-rc
STARTING_CANDIDATE_SHA: 73f44168e7cb0a9bfa0f782444e1fe7a4bc5de68
BASE_MAIN_SHA: 49fb158282ddc0963a29e2236d280dde82c5f197
PR: #10
LIVE_MUTATION: FORBIDDEN

## Purpose
Close exactly two pre-Codex findings discovered by the Orchestrator after independent review of the P1.6 candidate. Do not broaden scope.

## Finding 1 — append-only guard does not block TRUNCATE

Current candidate migration:
`backend/database/migrations/027_wallet_ledger_append_only.sql`

It blocks `UPDATE` and `DELETE` through a trigger, but not `TRUNCATE`.

Fresh read-only production metadata confirms `service_role` currently has `TRUNCATE` privilege on `public.wallet_ledger_entries` in addition to SELECT/INSERT/UPDATE/DELETE. Therefore the current migration does not yet make destructive ledger mutation non-credible.

### Required correction
Update repository-only Migration 027 so `wallet_ledger_entries` is protected against:
- UPDATE
- DELETE
- TRUNCATE

Use the smallest PostgreSQL-safe trigger design. A separate statement-level BEFORE TRUNCATE trigger using the same guard function is acceptable. Preserve INSERT behavior unchanged.

Requirements:
- do not edit migration 019;
- do not change deposit/payment/wallet accounting rules;
- keep the guard `SECURITY INVOKER` with controlled search_path;
- do not add SECURITY DEFINER;
- do not weaken or disable existing triggers/constraints;
- do not revoke SELECT/INSERT required by current approved backend flows;
- Migration 027 remains repository-only / NOT APPLIED LIVE.

Extend `p16WalletLedgerPersistence.test.ts` to prove the migration contract blocks all three destructive operations conceptually/configurationally and does not interfere with INSERT.

## Finding 2 — malformed-response validation is still partial

Current candidate `dbClient.ts` correctly validates arrays, balance numeric fields, transaction type, and idempotency key, but P1.6 requires malformed canonical responses to fail closed. Apply the P1.5 learned failure pattern: validate every consumed canonical field before mapping, without coercion.

### Wallet row requirements
For a successful wallet row, validate before mapping:
- `owner_id`: non-empty string and exactly equals the requested ownerId;
- `currency`: non-empty string;
- `available_balance`, `pending_balance`, `held_balance`, `reserved_for_payout_balance`: finite numbers;
- `updated_at`: non-empty parseable timestamp string.

Do not invent a new currency enum/closed list.

### Ledger row requirements
Validate before mapping:
- `id`: UUID string;
- `owner_id`: UUID string and exactly equals requested ownerId;
- nullable IDs `booking_id`, `payout_request_id`, `dispute_id`: null or UUID string;
- `transaction_type`: non-empty string; do not invent a closed transaction-type list;
- `amount`, `balance_after`: finite numbers;
- `idempotency_key`: non-empty string;
- `created_at`: non-empty parseable timestamp string.

Failures must use the existing bounded malformed-response error families:
- `REST_OWNER_WALLET_MALFORMED_RESPONSE`
- `REST_OWNER_WALLET_LEDGER_MALFORMED_RESPONSE`

Do not use String()/Number()/truthiness coercion to make malformed data appear valid.

### Deterministic tests
Add table-driven malformed-response cases covering at minimum:
- wallet owner mismatch;
- missing/invalid currency;
- invalid wallet updated_at;
- invalid ledger id;
- ledger owner mismatch;
- invalid non-null nullable ID;
- invalid ledger created_at;
- retain existing non-numeric/missing-field cases;
- retain genuine empty-array semantics as valid zero/empty state.

## Allowed changed paths
Prefer only:
- `backend/database/migrations/027_wallet_ledger_append_only.sql`
- `backend/server/src/services/dbClient.ts`
- `backend/server/src/tests/p16WalletLedgerPersistence.test.ts`

If another path is genuinely required for deterministic validation, explain before changing it. Do not change business docs, product rules, migration 019, or other production flows.

## Validation
Run all of:
- `npm --prefix backend run check`
- `npm --prefix backend run test:p1-6-wallet-ledger`
- `npm --prefix backend run test:owner-wallet-01`
- `npm --prefix backend run test:payment-01`
- `npm --prefix backend run test:p14-rpc-privileges`
- `npm --prefix backend run test:booking-01`
- `npm --prefix backend run test:booking-01-1`
- `npm --prefix backend run test:p1-4-availability`
- `npm --prefix backend run test:p1-4-worker-availability`
- `npm --prefix backend run test:p1-5-atomic-booking`
- `git diff --check`

Push candidate branch fast-forward only. Do not force-push.

After push, report exact final SHA and exact changed paths. PR #10 exact-head CI must run on the new SHA before final semantic review.

## Stop conditions
Stop rather than inventing product/architecture decisions. No Supabase mutation, no Storage mutation, no deployment, no merge.

## Expected result
Return:
`P1_6_PRE_CODEX_CORRECTION_PASS`

Then:
1. starting SHA;
2. final SHA;
3. changed paths;
4. exact TRUNCATE protection mechanism;
5. exact semantic response validations added;
6. tests added;
7. validation matrix result;
8. PR #10 exact-head CI state if available;
9. Migration 027 live status = NOT_APPLIED_LIVE;
10. live mutation = NONE.

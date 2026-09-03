# P1.6 — Pre-Codex Follow-up Correction

TASK_ID: P1.6_PRE_CODEX_FOLLOWUP
EXECUTOR: Antigravity
MODE: TARGETED_MECHANICAL_CORRECTION
REPOSITORY: Essxm01/SOLA-APP
CANDIDATE_BRANCH: validation/p1-6-rc
STARTING_CANDIDATE_SHA: e18e16cc378cb3b42e26c48ea12a2412c75bcf68
BASE_MAIN_SHA: 49fb158282ddc0963a29e2236d280dde82c5f197
PR: #10
LIVE_MUTATION: FORBIDDEN

## Why this follow-up exists

The first P1.6 pre-Codex correction resolved the originally identified TRUNCATE gap and owner-scope/response-shape gaps. During independent verification, an already-triggered GitHub Codex review on the earlier candidate exposed additional issues that still remain on the current exact head. Close these before spending a deliberate final Codex review turn.

Do not broaden scope. Do not redesign wallet accounting. Do not change Migration 019 or any finance/product rule.

## Fail-fast

1. Fetch origin.
2. Verify `origin/validation/p1-6-rc` == `e18e16cc378cb3b42e26c48ea12a2412c75bcf68`.
3. Verify `origin/main` == `49fb158282ddc0963a29e2236d280dde82c5f197`.
4. Verify PR #10 head is the same candidate SHA.
5. Verify Migration 027 is still repository-only / not applied live.
6. Stop on mismatch. No Supabase/Storage/Cloudflare mutation. No merge.

## Correction 1 — reject negative canonical wallet balances

Current P1.6 Worker validation requires the four `owner_wallets` balances to be finite numbers but still accepts negative finite values, contradicting the existing DB CHECK constraints.

In `backend/server/src/services/dbClient.ts`, for exactly:
- `available_balance`
- `pending_balance`
- `held_balance`
- `reserved_for_payout_balance`

require each value to be:
- `typeof number`
- finite
- `>= 0`

No coercion. Keep legitimate zero valid. Do not change ledger `amount` semantics; ledger movement amounts may be signed.

Extend `p16WalletLedgerPersistence.test.ts` with deterministic negative-balance malformed-response cases.

## Correction 2 — reconcile ledger immutability with the existing booking FK

Verified repository/live contract:
`wallet_ledger_entries.booking_id REFERENCES bookings(id) ON DELETE SET NULL`.

The current Migration 027 blanket `BEFORE UPDATE` rejection would incidentally prevent this existing FK referential action when a referenced booking is deleted. Preserve the existing FK contract while keeping financial ledger content immutable.

Modify only Migration 027's guard semantics so:
- DELETE always raises `WALLET_LEDGER_IMMUTABLE`.
- TRUNCATE always raises `WALLET_LEDGER_IMMUTABLE`.
- ordinary/direct UPDATE remains rejected.
- the only permitted UPDATE is the existing FK-style transition `OLD.booking_id IS NOT NULL -> NEW.booking_id IS NULL` while every other ledger field is unchanged.
- narrow that exception to nested trigger execution using `pg_trigger_depth() > 1`, so a normal direct UPDATE that merely tries to null `booking_id` is still rejected.
- compare all other fields with null-safe equality (`IS NOT DISTINCT FROM`) including: `id`, `owner_id`, `payout_request_id`, `dispute_id`, `transaction_type`, `amount`, `balance_after`, `idempotency_key`, `created_at`.
- INSERT remains untouched.
- keep SECURITY INVOKER, controlled search_path, and direct EXECUTE revocations unchanged.
- do not alter the FK itself.

Add deterministic migration-contract evidence for the narrow FK-nulling exception and for rejection of any financial/core mutation.

## Correction 3 — make the real PostgreSQL runtime fixture cleanup compatible

`backend/server/src/tests/postgresRuntime.test.ts` currently directly deletes `wallet_ledger_entries` during both pre-seed cleanup and final teardown. Once Migration 027 exists in a test database, those deletes are rejected and the cleanup can leave fixtures behind.

Fix the cleanup only; do not weaken production Migration 027 for tests.

Preferred minimal strategy:
- keep the existing `assertSafeTestDatabase(...)` production guard.
- create a small cleanup helper that obtains one dedicated Pool client so BEGIN/cleanup/COMMIT are on the same connection.
- inside that test-only cleanup transaction, temporarily `ALTER TABLE public.wallet_ledger_entries DISABLE TRIGGER USER`, perform the existing ordered fixture cleanup, then `ALTER TABLE ... ENABLE TRIGGER USER` before COMMIT.
- on error, ROLLBACK so trigger state is restored transactionally.
- use the helper for both initial fixture cleanup and final teardown.
- do not disable constraints or triggers in production code/migrations.

If the exact local runtime architecture makes this strategy invalid, stop and report the concrete reason rather than inventing a production bypass.

## Correction 4 — update authoritative database memory

`AGENTS.md` states that persistence/schema changes belong in `docs/DATABASE.md`. Migration 027 materially changes the ledger persistence rule.

Update `docs/DATABASE.md` minimally so it records:
- Migration 025 availability integrity is live/published.
- Migration 026 atomic booking creation is live/published.
- Migration 027 is the current P1.6 repository-only candidate and is NOT_APPLIED_LIVE.
- `wallet_ledger_entries` financial history is protected against UPDATE/DELETE/TRUNCATE, with the existing booking FK `ON DELETE SET NULL` referential-null transition preserved as the narrow non-financial exception.

Do not claim P1.6 closed or 027 live.

## Required validation

Run and report fresh results for:
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
- run the real PostgreSQL runtime suite if its existing safe-test-db prerequisites are available locally; if unavailable, report that explicitly and prove the cleanup change deterministically/staticly in P1.6 tests instead.
- `git diff --check`

Push one fast-forward correction commit to `validation/p1-6-rc`. Do not force-push.
Wait for exact-head PR #10 CI and report run ID/conclusion. PR events must not deploy the Worker.

## Expected report

Return `P1_6_PRE_CODEX_FOLLOWUP_PASS` only if all four corrections are closed.
Report:
1. starting SHA;
2. final SHA;
3. exact changed paths;
4. negative-balance validation proof;
5. FK-nulling exception proof;
6. runtime cleanup compatibility proof;
7. docs/DATABASE update;
8. local validation results;
9. exact-head PR CI;
10. Migration 027 live status = NOT_APPLIED_LIVE;
11. live mutation = NONE;
12. remaining blocker, if any.

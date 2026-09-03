# P1.6 — Wallet + Immutable Ledger Persistence Integrity

TASK_ID: P1.6
EXECUTOR: ZCode
MODE: HEAVY_IMPLEMENTATION_OR_PRESERVE_VERIFY
REPOSITORY: Essxm01/SOLA-APP
BRANCH: validation/p1-6-rc
BASE_MAIN_SHA: 49fb158282ddc0963a29e2236d280dde82c5f197
LIVE_MUTATION: FORBIDDEN

## Objective
Close the Phase 1 persistence boundary for Owner wallet balances and the immutable wallet ledger. Start from current reality, preserve correct existing behavior, and implement only the minimum repository changes required to make the persistence contract provably safe.

P1.6 is a **preserve/verify** boundary first. Do not assume a new migration is required. If current repository/live-compatible behavior already satisfies an invariant, preserve it and add deterministic evidence. If a real persistence defect exists, fix only that defect.

## Verified baseline entering P1.6

- P1.5 is CLOSED and live-verified at main `49fb158282ddc0963a29e2236d280dde82c5f197`.
- Migration 026 is live and the atomic booking-create RPC is verified service-role-only.
- Main CI Run #166 / `33711969665` succeeded.
- Production Worker Version ID: `5378c632-715f-45db-bfda-f62973e4c7ee`.
- Existing business authority says:
  - `owner_wallets` is canonical balance state.
  - `wallet_ledger_entries` is canonical immutable financial activity.
  - confirmed prototype deposit completion credits **only canonical Owner net deposit** to `pending_balance` once.
  - deposit completion does **not** increase available balance.
  - pending → available occurs 24h after check-in, but that implementation/verification belongs to Phase 11.3, not P1.6.
  - minimum payout 500 EGP / provider fee rules belong to payout phases and must not be implemented here.
  - failed wallet/ledger reads are errors, never credible zero/empty state.

Read-only live metadata observed before handoff:
- `owner_wallets` and `wallet_ledger_entries` have RLS enabled and no custom triggers.
- broad table/RLS posture is a Phase 14 concern; do not expand P1.6 into a general RLS remediation.

## Fail-fast before editing

1. Fetch origin.
2. Verify `origin/validation/p1-6-rc` equals the exact TASK HANDOFF SHA supplied by the Orchestrator.
3. Verify `origin/main` still equals `49fb158282ddc0963a29e2236d280dde82c5f197`.
4. Verify merge-base with main is exactly that main SHA and working tree is clean.
5. Verify migrations 019, 021, 025, and 026 are present in baseline.
6. If main moved or branch/SHA mismatches, stop with `TASK_HANDOFF_MISMATCH`.
7. No Supabase/Storage/Cloudflare mutation. Read-only inspection is allowed only if available and must be reported separately.

## Hot context — inspect these first, not the whole repo

- `docs/BUSINESS_RULES.md` — Owner wallet and ledger section.
- `docs/codex/KONFRM_EXECUTION_MAP.md` — P1.6 definition only; its historical status lines are stale.
- `backend/database/schema.sql` — `owner_wallets`, `wallet_ledger_entries`, related constraints.
- `backend/database/migrations/019_konfrm_complete_deposit_payment.sql` — current atomic deposit finalization + pending wallet credit.
- `backend/database/migrations/021_harden_critical_rpc_privileges.sql` — existing RPC privilege hardening; preserve it.
- `backend/server/src/services/dbClient.ts` — payment RPC matcher + wallet/ledger Worker read adapters.
- `backend/server/src/services/dbRepository.ts` — `walletDb` and any active wallet mutation path.
- `backend/server/src/app.ts` — Owner wallet/ledger routes and payment completion route.
- `backend/server/src/tests/ownerWallet01.test.ts`.
- `backend/server/src/tests/payment01.test.ts`.
- `backend/server/src/tests/p14RpcPrivilegeContract.test.ts`.
- `backend/package.json` and `.github/workflows/ci-validation.yml`.
- `docs/CURRENT_STATE.md` and `tasks/CURRENT_TASK.md` for status reconciliation.

Search beyond hot context only when a concrete reference requires it.

## Mandatory persistence invariants

### A. Canonical wallet balance source
- Owner balances come only from `owner_wallets`.
- Never reconstruct wallet balance from property price, booking nightly price, or UI totals.
- Wallet row fields must remain non-negative according to existing DB contract.
- Owner wallet reads must be scoped from verified Owner JWT subject, never a client-supplied Owner ID.
- A successful missing wallet row may map to the existing canonical zero-wallet semantics only if that behavior is already authoritative and explicit; a DB/REST failure must fail closed as `WALLET_QUERY_FAILED` or equivalent existing truthful error.

### B. Canonical immutable ledger
- `wallet_ledger_entries` is append-only financial history.
- Prove there is no active production path that updates or deletes ledger entries.
- Persistence integrity must make accidental mutation non-credible. Inspect actual DB/repository enforcement, not only comments.
- If immutability is not sufficiently enforced at persistence level, implement the smallest safe database enforcement compatible with current approved flows.
- Do NOT edit a historical live migration in place to change production semantics. If DDL is required, add the next migration (`027_...sql`) and leave it repository-only/unapplied.
- Do not invent a closed list of transaction types unless existing authority already defines it exhaustively.

### C. Deposit completion → wallet/ledger accounting
Preserve the current prototype accounting boundary in `konfrm_complete_deposit_payment`:
- one atomic PostgreSQL transaction finalizes eligible deposit payment and wallet credit;
- wallet row is created if absent, then locked for balance mutation;
- only `booking_financial_summaries.owner_net_deposit_amount` is credited;
- credit goes to `pending_balance` exactly once;
- `available_balance` is not increased by deposit completion;
- ledger entry records the same canonical amount;
- idempotency/retry/concurrency cannot double-credit the Owner or duplicate the ledger entry;
- payment/booking status rules remain unchanged;
- no financial summary values are recomputed here.

If current migration 019 already satisfies these requirements, preserve it. If a defect requires changing the live RPC definition, do NOT modify migration 019; create a new migration 027 that safely replaces/hardens the function and re-applies the existing service-role-only privilege boundary.

### D. Balance / ledger consistency evidence
Add deterministic evidence for the approved existing semantics without inventing new finance rules. At minimum prove:
- first valid completion: pending increases by Owner net deposit exactly once;
- retry/idempotent completion: balances and ledger entry count do not change again;
- failure before completion leaves wallet/ledger unchanged;
- concurrent/repeated completion cannot double-credit;
- ledger `amount` equals canonical Owner net deposit for the deposit-held entry;
- `balance_after` retains its current authoritative meaning; do not redefine it without an explicit authority source.

### E. Worker/PostgREST behavior
- Wallet and ledger read adapters must remain narrow and owner-scoped.
- Non-2xx/network/malformed canonical responses must fail closed, not return false zero/empty state.
- Payment finalization must continue through the narrow existing RPC; do not add a generic SQL-over-HTTP path.
- Matcher collisions must not be introduced.

### F. Privacy / role boundary
- Customer-facing booking/payment responses must not expose Owner wallet, payout, commission, or Owner-net internals beyond already approved Customer totals/deposit/remaining values.
- Owner wallet/ledger routes must use authenticated Owner identity.
- Do not add new Admin wallet APIs in P1.6.
- Do not treat direct table RLS/ACL cleanup as P1.6 unless it is strictly required by a wallet persistence defect; broader RLS remediation remains Phase 14.

## Explicitly out of scope

Do NOT implement or change:
- 24h pending → available release mechanism (P11.3).
- payout reservation/request processing (P11.2).
- minimum payout or provider-fee business rules.
- payout provider integration.
- cancellation/refund/dispute accounting.
- remaining-balance payment.
- real Paymob/live payment networking.
- booking-create/payment idempotency contracts beyond existing approved behavior.
- general RLS/security architecture.
- UI redesign.

## Required tests/evidence

Create focused P1.6 deterministic tests. Prefer one new suite such as:
`backend/server/src/tests/p16WalletLedgerPersistence.test.ts`
with package script:
`test:p1-6-wallet-ledger`

The suite must cover, as applicable:
1. canonical `owner_wallets` reads and owner scoping;
2. canonical `wallet_ledger_entries` reads and owner scoping;
3. error-is-not-zero/empty behavior;
4. payment completion pending-credit amount sourced from canonical financial summary;
5. no available-balance credit at deposit completion;
6. retry/idempotency does not double-credit or duplicate ledger entry;
7. concurrency/double-execution safety using deterministic contract/runtime evidence appropriate to the existing architecture;
8. immutable-ledger enforcement or authoritative persistence proof;
9. Worker matcher / fail-closed regressions;
10. privilege preservation if any RPC/DDL changes occur.

If migration 027 is added, add a migration-contract test proving its exact safety properties and that it does not weaken migration 019/021/025/026 invariants.

Required validation before report:
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
- any focused migration test added by P1.6
- `git diff --check`
- clean tracked working tree after commit

Wire `test:p1-6-wallet-ledger` into Backend CI if the suite is added.

## Documentation truth

Update `docs/CURRENT_STATE.md` and `tasks/CURRENT_TASK.md` in the candidate so they state:
- P1.5 CLOSED/live-verified at main `49fb158282ddc0963a29e2236d280dde82c5f197`;
- migration 026 live;
- P1.6 is the active candidate;
- any new P1.6 migration is REPOSITORY_ONLY_NOT_APPLIED_LIVE until Founder publication approval.

Do not claim P1.6 closed or any new migration live.

## Stop conditions

Return `P1_6_REQUIRES_PRODUCT_DECISION` instead of guessing if closure would require changing:
- wallet release timing;
- payout eligibility/fees;
- cancellation/refund accounting;
- ledger balance semantics not established by existing authority;
- cross-role visibility rules not already approved.

Return `P1_6_REQUIRES_ARCHITECTURE_DECISION` if closure would require replacing the Worker/PostgREST architecture or introducing a generic DB transaction surface.

## Expected report

Return one of:
- `P1_6_IMPLEMENTATION_READY_FOR_REVIEW`
- `P1_6_PRESERVE_VERIFY_READY_FOR_REVIEW`
- `P1_6_REQUIRES_PRODUCT_DECISION`
- `P1_6_REQUIRES_ARCHITECTURE_DECISION`

Then report:
1. starting TASK HANDOFF SHA;
2. verified base main SHA;
3. final candidate SHA;
4. exact changed paths;
5. actual current wallet/ledger write paths found;
6. whether a new migration was required and why;
7. exact atomic/idempotency/immutability proof;
8. privacy/owner-scope proof;
9. validation results;
10. CI exact-head result if pushed/open PR exists;
11. new migration live status (`NOT_APPLIED_LIVE` unless separately authorized);
12. live mutation (`NONE`);
13. exact remaining blocker, if any.

Do not merge, deploy, or apply migrations.
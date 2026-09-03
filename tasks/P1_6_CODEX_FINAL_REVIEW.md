# P1.6 — Final Codex Review Contract

TASK_ID: P1.6
MODE: FINAL_READ_ONLY_REVIEW
REPOSITORY: Essxm01/SOLA-APP
CANDIDATE_BRANCH: validation/p1-6-rc
FINAL_IMPLEMENTATION_SHA: d4e88a42db8634a1270c946b5a643e6f3feff816
BASE_MAIN_SHA: 49fb158282ddc0963a29e2236d280dde82c5f197
PULL_REQUEST: #10
EXACT_HEAD_CI_RUN: #171 / 33716420583 / SUCCESS
LIVE_MUTATION: FORBIDDEN
MIGRATION_027_LIVE_STATUS: NOT_APPLIED_LIVE

## Objective
Perform one final independent semantic review of the exact P1.6 candidate. Do not modify files. Decide whether the candidate is safe to enter Founder Publication Review.

## Fail-fast
1. Fetch origin explicitly.
2. Verify origin/validation/p1-6-rc equals FINAL_IMPLEMENTATION_SHA exactly.
3. Verify origin/main equals BASE_MAIN_SHA exactly.
4. Verify PR #10 is open, unmerged, base main, and head equals FINAL_IMPLEMENTATION_SHA.
5. Verify exact-head CI #171 / 33716420583 is completed SUCCESS.
6. Stop on any mismatch with `P1_6_CODEX_FINAL_BLOCKED` and report the mismatch only.

## Authority / scope
P1.6 closes Phase 1 wallet + immutable-ledger persistence integrity only. Preserve existing product and finance rules. Do not invent or change:
- 24h pending -> available release timing;
- payout eligibility, 500 EGP minimum, provider fees, payout processing;
- cancellation/refund/dispute accounting;
- remaining-balance payment;
- booking/payment idempotency beyond already approved behavior;
- general RLS/security architecture;
- UI behavior.

Relevant authority:
- tasks/P1_6_WALLET_LEDGER_PERSISTENCE.md at handoff b1e0347e163fabc2ff71522d4364b47e258acf5b
- docs/BUSINESS_RULES.md wallet/payment sections
- docs/DATABASE.md
- migration 019 and migration 021

## Exact candidate areas to review
Review the full diff BASE_MAIN_SHA..FINAL_IMPLEMENTATION_SHA, with special attention to:
- backend/database/migrations/027_wallet_ledger_append_only.sql
- backend/server/src/services/dbClient.ts
- backend/server/src/services/dbRepository.ts
- backend/server/src/services/paymentService.ts
- backend/server/src/app.ts
- backend/server/src/tests/p16WalletLedgerPersistence.test.ts
- backend/server/src/tests/ownerWallet01.test.ts
- backend/server/src/tests/payment01.test.ts
- backend/server/src/tests/postgresRuntime.test.ts
- .github/workflows/ci-validation.yml
- docs/DATABASE.md
- docs/CURRENT_STATE.md
- tasks/CURRENT_TASK.md

## Mandatory final dispositions
Explicitly state PASS/FAIL for every item below.

### A. Preserve canonical deposit accounting
Verify migration 019 remains unchanged by P1.6 and still provides one atomic finalization boundary:
- locks canonical transaction/booking rows;
- consumes booking_financial_summaries.owner_net_deposit_amount only;
- credits pending_balance once;
- does not credit available_balance;
- inserts the same canonical amount into wallet_ledger_entries;
- retry/concurrency cannot double-credit or duplicate the ledger entry;
- booking/payment status semantics are unchanged.

### B. Migration 027 append-only enforcement
Verify the repository-only migration:
- does not modify migration 019/021/025/026;
- blocks UPDATE and DELETE row mutations;
- blocks TRUNCATE at statement level;
- leaves INSERT untouched;
- uses SECURITY INVOKER and controlled search_path;
- does not introduce SECURITY DEFINER or generic mutation surface;
- preserves the live FK contract `wallet_ledger_entries.booking_id REFERENCES bookings(id) ON DELETE SET NULL` through a narrow referential-only exception;
- direct application UPDATE cannot exploit the FK exception;
- the `pg_trigger_depth() > 1` condition is semantically appropriate for PostgreSQL FK `ON DELETE SET NULL` behavior and does not create an unacceptable application mutation bypass;
- all other ledger financial/core fields remain immutable during that exception;
- runtime-test cleanup bypass is test-only and cannot weaken production migration behavior.

Read-only live metadata available before this handoff showed only two live FKs on wallet_ledger_entries: booking_id ON DELETE SET NULL and owner_id ON DELETE RESTRICT. Do not perform live mutation to reconfirm.

### C. Owner wallet/ledger Worker boundary
Verify:
- only exact canonical wallet summary, lifetime ledger, and paginated ledger SQL shapes dispatch to their REST adapters;
- comments, wrappers, altered projections/predicates/placeholders, and unrelated mentions do not collide;
- wallet REST cardinality is exactly 0 or 1 row;
- 0 wallet rows + 0 ledger rows preserves existing canonical zero-wallet semantics;
- malformed/non-array/multi-row/owner-mismatch responses fail closed;
- wallet balances require non-negative finite numeric values;
- timestamps/UUIDs/nullable IDs and all consumed ledger fields are semantically validated;
- Owner scoping comes from verified authenticated Owner identity, not a client-supplied Owner ID;
- Customer payment surfaces do not expose wallet/commission/Owner-net internals.

### D. Payment-finalization Worker boundary
Verify the exact active repository query remains:
`SELECT * FROM konfrm_complete_deposit_payment($1, $2, $3)`

Then verify:
- only that canonical 3-placeholder shape dispatches to the mutating RPC adapter;
- comments, wrappers, string mentions, wrong arity/order/duplication, and changed SELECT lists do not collide;
- successful HTTP 200 RPC payload is validated before success;
- paymentTransactionId and bookingId must match requested IDs;
- paymentStatus must be SUCCEEDED;
- bookingStatus must be CONFIRMED;
- confirmedAt must be a valid timestamp string;
- amountCents must be a positive finite integer;
- currency must be EGP;
- idempotent must be boolean;
- empty/multi-row/primitive/null/missing/wrong-type/wrong-value payloads fail closed;
- the Customer completion route no longer fabricates CONFIRMED/SUCCEEDED/EGP defaults from a malformed result;
- malformed completion results produce a 5xx truthful error, never a false success;
- no finance values are recomputed in the adapter or route.

### E. Scope / regression / evidence
Verify:
- no new wallet/ledger production mutation path was added outside the canonical payment RPC;
- no payout/release/cancellation business rule was implemented;
- P1.6 changed paths are justified and contain no unrelated architecture drift;
- docs accurately say P1.5 is live, P1.6 is active candidate, and migration 027 is NOT_APPLIED_LIVE;
- exact-head CI #171 SUCCESS is relevant to the final SHA and Worker deploy was skipped on PR;
- no migration, merge, Storage mutation, or production deploy was authorized or performed by this review.

## Known pre-Codex findings that must be explicitly re-disposed
The pre-Codex process already found and corrected these. Re-evaluate them on FINAL_IMPLEMENTATION_SHA; do not assume they are fixed because tests are green:
1. ledger TRUNCATE was initially unguarded;
2. malformed wallet/ledger 200 responses could fabricate zero/empty state;
3. negative wallet balances were initially accepted;
4. ledger UPDATE guard initially conflicted with booking_id ON DELETE SET NULL;
5. postgresRuntime fixture cleanup initially conflicted with immutable-ledger enforcement;
6. docs/DATABASE.md initially lacked migration 027 truth;
7. wallet/ledger SQL matchers were initially broad;
8. owner_wallet REST cardinality >1 was initially accepted;
9. payment finalization RPC matcher was initially broad;
10. malformed payment RPC 200 payloads could previously pass through;
11. payment completion route previously had default-success fallbacks.

## Review style
- READ ONLY.
- Prefer semantic correctness over test-count reporting.
- CI green is evidence, not proof.
- Do not suggest unrelated refactors or Phase 14 hardening as blockers unless they are newly introduced by P1.6 or directly break this contract.
- If a finding is non-blocking, label it clearly as backlog/non-blocking.

## Required output
Return exactly one primary result:
- `P1_6_CODEX_FINAL_CLEAN`
- `P1_6_CODEX_FINAL_BLOCKED`

Then provide:
1. reviewed FINAL_IMPLEMENTATION_SHA and BASE_MAIN_SHA;
2. PR #10 exact-head disposition;
3. A-E PASS/FAIL table or concise equivalent;
4. explicit disposition of all 11 known pre-Codex findings;
5. any newly discovered blocker with exact file/logic evidence;
6. confirmation Migration 027 remains NOT_APPLIED_LIVE and no mutation was performed.

If clean, end with:
`READY_FOR_FOUNDER_PUBLICATION_REVIEW`

Do not modify files.
Do not apply Migration 027.
Do not deploy.
Do not merge.

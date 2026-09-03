# P1.6 — Final Pre-Codex Worker Boundary Correction

TASK_ID: P1.6-PRE-CODEX-FINAL-BOUNDARY
EXECUTOR: Antigravity
MODE: NARROW_MECHANICAL_CORRECTION
REPOSITORY: Essxm01/SOLA-APP
CANDIDATE_BRANCH: validation/p1-6-rc
STARTING_CANDIDATE_SHA: 6a1435bbb54ed370bcccd0ae5b10a3d5d88e0c9c
BASE_MAIN_SHA: 49fb158282ddc0963a29e2236d280dde82c5f197
PR: #10
LIVE_MUTATION: FORBIDDEN

## Why this correction exists
The final pre-Codex gate independently rechecked P1.6 invariant E from the original task contract:
- wallet/ledger Worker adapters must remain narrow and owner-scoped;
- malformed canonical responses must fail closed;
- matcher collisions must not be introduced.

The current adapter still uses broad predicates based on `startsWith('select')`, `includes('from owner_wallets' / 'from wallet_ledger_entries')`, and an owner-id predicate regex. This can reinterpret unrelated future SQL that happens to mention the same table and owner predicate as one of the wallet/ledger REST projections. P1.5 already established collision-safe exact matcher discipline; apply the same known-failure guard here.

A second deterministic shape gap exists: `owner_wallets.owner_id` is a primary key, so the canonical response cardinality is exactly 0 or 1 row. A malformed 200 response with >1 wallet row must fail closed rather than silently allowing repository code to consume the first row.

## Scope — exactly two corrections

### 1. Collision-safe canonical wallet/ledger query matching
Replace only the P1.6 wallet/ledger matcher predicates in `backend/server/src/services/dbClient.ts` with collision-safe canonical matching after whitespace normalization and case normalization.

Accept exactly the repository query shapes that exist at the starting SHA:

A. Owner wallet summary row query from `walletDb.getOwnerWalletSummary(ownerId)`.

B. Owner lifetime ledger projection query used by the same summary:
`SELECT transaction_type AS type, amount FROM wallet_ledger_entries WHERE owner_id = $1`
(after normalization/case-insensitive comparison).

C. Owner paginated ledger query from `walletDb.getOwnerLedger(ownerId, limit, offset)`, including its canonical `ORDER BY created_at DESC LIMIT $2 OFFSET $3` structure.

Requirements:
- normalize whitespace safely; comparison may be case-insensitive;
- do not use generic `includes(tableName)` or a broad table/predicate regex as the deciding matcher;
- comments, wrappers, added predicates, alternate SELECT lists, wrong placeholder order/count, extra clauses, or mere string mentions must NOT enter the P1.6 REST branch;
- preserve the existing canonical REST URL mapping and owner scoping for the three accepted repository shapes;
- do not create a generic SQL-over-HTTP path;
- do not change repository SQL unless strictly necessary; prefer adapting the matcher to the existing repository contract.

Add deterministic positive and negative collision tests to `backend/server/src/tests/p16WalletLedgerPersistence.test.ts` proving:
- each of the three canonical repository shapes is accepted;
- representative colliding/noncanonical shapes fall through and do not issue the wallet/ledger REST request. Cover at minimum: comment suffix/prefix, wrapper/subquery, changed SELECT list, extra predicate, wrong placeholder, and a string literal/table-name mention.

### 2. Canonical wallet cardinality fail-closed
In the owner-wallet REST response branch:
- `[]` remains the valid no-wallet-row case used by existing canonical zero-wallet semantics;
- exactly one valid row remains success;
- `raw.length > 1` must throw an error beginning with `REST_OWNER_WALLET_MALFORMED_RESPONSE` before mapping any row.

Add deterministic tests for 0, 1, and >1 wallet rows.

## Do not change
- Migration 027.
- Migration 019 or any other historical migration.
- wallet/ledger financial semantics.
- FK-nulling exception.
- runtime cleanup strategy.
- docs unless a comment must be adjusted for the exact matcher implementation; no new documentation expansion is required.
- any Customer/Owner/Admin UI.
- RLS/ACL posture.

## Required validation
Run and report all exit codes:
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

Push only a fast-forward correction commit to `validation/p1-6-rc`.
Wait for exact-head PR #10 CI and report its run number/ID/conclusion.

## Stop conditions
Stop and report rather than guessing if:
- starting candidate or main SHA mismatches;
- repository currently has another legitimate wallet/ledger SQL shape not listed above that must use the Worker adapter;
- exact matching would require changing product/financial behavior or generic Worker architecture.

## Expected report
Return `P1_6_PRE_CODEX_FINAL_BOUNDARY_PASS` only if all requirements and exact-head CI pass. Include starting SHA, final SHA, exact changed paths, matcher contract, wallet cardinality proof, tests, CI, Migration 027 live status = NOT_APPLIED_LIVE, live mutation = NONE.
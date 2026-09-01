# P1.3 — Reconcile Current Main + Close Migration 024 Ambiguity Blocker

**Parent macro phase:** PHASE 1 — Database Backbone  
**Status:** Open — implementation blocker + Git reconciliation required  
**Execution owner:** Z Code Desktop (primary heavy implementation engineer)  
**Single writer:** Z Code only after this task handoff  
**PR:** #1 (`validation/p1-3-rc` → `main`)  
**Current protected main:** `7c9c639a97092db37924aee8f9a53a9f7ecbb843`  
**Original P1.3 implementation head:** `b534cde247a0285006ed3ad23ccc38f839b25185`  
**Old P1.3 merge base:** `92dc3916afe7a8e7d15620efee31afa58e826870`

## Read first — hot context only

Read, in order:

1. `AGENTS.md`
2. `docs/codex/KONFRM_MASTER_RULES.md`
3. `docs/CURRENT_STATE.md`
4. this file: `tasks/CURRENT_TASK.md`
5. the exact implementation/test files named below

Do not bulk-read unrelated documentation unless a concrete conflict requires it.

## Objective

Complete one tightly scoped P1.3 correction:

1. Reconcile the existing P1.3 candidate safely onto the current protected `main` after the Vercel cleanup/recovery incident.
2. Fix the confirmed PostgreSQL PL/pgSQL ambiguity in Migration 024.
3. Add focused regression protection.
4. Run the required test/fix/retest cycle.
5. Update PR #1 and stop only after exact-head CI is green.

Do **not** ask Native Codex to investigate, implement, or review during this task. Codex quota is reserved for one final review after this report.

Do **not** start P1.4.

## Expected Git state at handoff

The remote P1.3 branch previously pointed at the original implementation commit:

`b534cde247a0285006ed3ad23ccc38f839b25185`

ChatGPT then added **one orchestration-only commit** that changes only `tasks/CURRENT_TASK.md` so Z Code can consume this task from GitHub.

Therefore, before implementation:

- fetch `origin`
- inspect `origin/main`
- inspect `origin/validation/p1-3-rc`
- verify `b534cde247a0285006ed3ad23ccc38f839b25185` is still an ancestor of the P1.3 branch
- verify any commit above `b534...` before your work is only the expected task-contract update to `tasks/CURRENT_TASK.md`
- inspect local worktree status

If there are any other unexpected remote commits, local edits, or untracked files that could be overwritten, stop with `BLOCKED_BY_UNEXPECTED_GIT_STATE` and report exact evidence.

Known unrelated local-only file, if present:

`KONFRM_FOUNDER_AI_OPERATING_SYSTEM.md`

Do not touch, stage, delete, or commit it.

## Main baseline gate

Before editing, verify:

`origin/main = 7c9c639a97092db37924aee8f9a53a9f7ecbb843`

If `origin/main` moved, stop with:

`MAIN_MOVED_RECONCILIATION_REQUIRED`

Do not blindly rebase onto an unknown newer main.

## Safety backup

Before rewriting P1.3 history, create a **local-only** safety reference/branch pointing to the current remote P1.3 tip.

Do not push the backup branch unless explicitly instructed later.

## Reconciliation requirement

The existing P1.3 work was built from the old base `92dc3916...` while current main is `7c9c639...`.

Rebase the P1.3 work onto current `origin/main` without a merge commit.

Final desired history:

```text
7c9c639a97092db37924aee8f9a53a9f7ecbb843
    ↓
ONE logical P1.3 commit
```

The orchestration-only task-contract commit added by ChatGPT is **not** intended to remain as a separate final commit. Fold/squash it into the single final P1.3 commit.

Final commit message:

`fix(properties): close P1.3 persistence integrity`

Final parent must be exactly:

`7c9c639a97092db37924aee8f9a53a9f7ecbb843`

Final commit count above current main must be exactly `1`.

## Conflict resolution rule

If rebase conflicts occur, resolve each conflicting hunk surgically. Do not choose whole-file `ours`/`theirs` without inspection.

Preserve both:

- valid P1.3 property/media persistence work
- current main recovery/Vercel-cleanup state

### Current-main invariants that must survive

Verify after reconciliation:

- `backend/vercel.json` remains absent
- active backend runtime does not restore `process.env.VERCEL` detection
- `backend/server/src/middleware/cors.ts` does not restore Vercel production/preview origins
- `backend/server/src/index.ts` preserves the explicit `NO_SERVER_LISTEN` model
- `backend/server/src/services/storageProvider.ts` preserves current explicit `OBJECT_STORAGE_PROVIDER` behavior

Historical docs may mention Vercel as legacy/history. Do not delete historical evidence solely because it contains the word Vercel.

If you cannot preserve both P1.3 behavior and current-main invariants safely, stop and report.

# Confirmed blocker — Migration 024

File:

`backend/database/migrations/024_atomic_property_media_commit.sql`

Function:

`public.konfrm_commit_property_media(...)`

Final Native Codex review `#5077163837` found a valid blocker: the function uses `RETURNS TABLE` output names including `id` and `status`, which become PL/pgSQL variables. The function also contains unqualified SQL column references such as `id` and `status`.

Representative collision sites include:

- `upload_intents.id` lookup
- `property_images.status` predicate
- `properties.id` predicate
- `upload_intents` UPDATE `id` and `status` predicates

Migration 024 has **not** been applied live.

## SQL objective

Audit the **entire function**, not only the known examples, and remove every relevant PL/pgSQL variable/output/column ambiguity.

Preserve exactly:

- function inputs
- `RETURNS TABLE` output contract
- ownership semantics
- locking order
- transaction semantics
- idempotency/replay behavior
- error codes
- unique-index behavior
- grants
- service-role execution model

Do not redesign the function.

Prefer explicit table aliases and qualified table-column references, e.g. `ui.id`, `ui.status`, `pi.status`, `p.id`, while keeping PostgreSQL-valid UPDATE syntax. Do not qualify the target column on the left side of `SET` if PostgreSQL does not allow it.

Do not rename public RPC outputs merely to avoid ambiguity. If a public contract change appears necessary, stop and request a Founder decision.

## Inspect before editing SQL

Read:

- full Migration 024 function
- `backend/server/src/tests/p13AtomicMediaContract.test.ts`
- runtime caller only as needed to confirm returned shape/error behavior

Identify all possible collisions involving:

- `RETURNS TABLE` output names
- PL/pgSQL local variables
- function parameters
- table columns

## Regression protection

Update:

`backend/server/src/tests/p13AtomicMediaContract.test.ts`

At minimum protect against regression in:

- `upload_intents` id lookup
- `property_images` status predicate
- `properties` id predicate
- `upload_intents` update id predicate
- `upload_intents` update status predicate

Preserve existing varchar/text compatibility assertions.

A stronger small contract test is allowed if it does not introduce new infrastructure.

## Optional local PostgreSQL proof

Check whether a disposable local PostgreSQL runtime already exists.

If available without installation or live access, run an isolated compile/execution proof for the corrected function.

If unavailable:

- do not install PostgreSQL
- do not connect to live Supabase
- do not block completion
- report `NOT_AVAILABLE`

## Required testing

Run at minimum:

```text
npm --prefix backend run check
npm --prefix backend run test:p13-atomic-media
npm --prefix backend run test:p13-property-media
npm --prefix backend run test:p13-worker-adapter
git diff --check
```

Also run focused tests required by any in-scope rebase conflict.

For every in-scope failure:

`diagnose → fix → rerun`

Do not return the task with a known in-scope failing test.

## Non-goals / forbidden changes

Do not change product or financial policy.

Do not change unrelated:

- booking logic
- finance/payment/wallet logic
- availability rules
- owner lifecycle/KYC rules
- public visibility rules
- unrelated UI/apps
- production configuration except preserving current main behavior
- P1.4

Do not:

- apply Migration 024 live
- mutate Supabase
- mutate Storage
- manually deploy
- push `main`
- merge PR #1
- invoke Native Codex

## Push / PR gate

After implementation and local verification:

1. ensure final history is exactly one logical P1.3 commit above current main
2. fetch origin again
3. verify `origin/main` is still exactly `7c9c639...`
4. lease-protected force-push **only** `validation/p1-3-rc`
5. never push `main`
6. PR #1 should update automatically
7. wait for exact-head PR CI

Required checks:

- `Detect Changed Modules`
- `Validate Backend API`
- `Validate Customer App`
- `Validate Owner App`
- `Validate Admin App`

Because this is pull-request validation, Cloudflare production Worker deployment must remain **SKIPPED**.

If the PR remains out-of-date/non-mergeable after the intended reconciliation, diagnose the exact reason before any additional history change.

## Stop gate

Stop after all are true:

- safe reconciliation onto current main completed
- Migration 024 ambiguity fixed
- regression protection added
- required local tests pass
- final history is one logical P1.3 commit above current main
- exact-head PR CI is green
- Worker production deploy is confirmed skipped

Do not request Codex review yourself. Do not merge. Do not deploy. Do not apply Migration 024. Do not start P1.4.

## Required final report

Return exactly this structured report:

```text
P1.3 RECONCILIATION + MIGRATION 024 BLOCKER REPORT

STARTING REMOTE P1.3 TIP:
...

ORIGINAL P1.3 IMPLEMENTATION SHA:
b534cde247a0285006ed3ad23ccc38f839b25185

CURRENT MAIN USED:
7c9c639a97092db37924aee8f9a53a9f7ecbb843

FINAL P1.3 SHA:
...

REBASE:
PASS / FAIL

REBASE CONFLICTS:
...

CURRENT MAIN RECOVERY/VERCEL CLEANUP PRESERVED:
YES / NO

- backend/vercel.json absent:
- Vercel runtime detection absent:
- Vercel CORS origins absent:
- NO_SERVER_LISTEN preserved:
- explicit OBJECT_STORAGE_PROVIDER behavior preserved:

ROOT CAUSE OF MIGRATION BLOCKER:
...

SQL AMBIGUITIES FOUND:
...

FIX:
...

FILES CHANGED FOR BLOCKER:
...

REGRESSION TESTS:
...

LOCAL POSTGRES PROOF:
PASS / NOT_AVAILABLE

TESTS:
command -> result

PARENT OF FINAL P1.3 COMMIT:
...

COMMIT COUNT ABOVE CURRENT MAIN:
...

PR:
#1

PR HEAD:
...

PR MERGEABILITY:
...

CI:
run number / run ID / exact SHA / result

REQUIRED CHECKS:
Detect Changed Modules ->
Validate Backend API ->
Validate Customer App ->
Validate Owner App ->
Validate Admin App ->

WORKER PRODUCTION DEPLOY:
SKIPPED / other

MAIN:
UNCHANGED DURING TASK

MIGRATION 024 LIVE:
NOT APPLIED

LIVE MUTATION:
NONE

CODEX USED:
NO

FINAL STATUS:
READY_FOR_FINAL_CODEX_REVIEW
or
BLOCKED_<exact reason>
```

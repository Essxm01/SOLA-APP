# P1.4 — Targeted Correction Pass

TASK_ID: P1.4-CORRECTION
STAGE: TARGETED_CORRECTION
EXECUTOR: ZCODE
WRITER: ZCODE_ONLY
BRANCH: validation/p1-4-rc
BASE_MAIN_SHA: fb38414d9076f89083bdc680e48e1a0b0329be06
PREVIOUS_CANDIDATE_SHA: b6254dd7c31ab601ea4542ebbbfd973c44c98f94
PR: 5
LIVE_MUTATION: FORBIDDEN
CODEX: DO_NOT_USE_UNTIL_FINAL_REVIEW

## Objective
Correct only the independently verified P1.4 defects below. This is NOT a new investigation and NOT a redesign. Preserve the existing P1.4 architecture, migration 025 concurrency mechanism, product rules, finance rules, booking lifecycle, Owner/Customer contracts, and current main.

## Read hot context only
1. `AGENTS.md`
2. `docs/codex/KONFRM_MASTER_RULES.md`
3. this file
4. only the exact implementation/tests involved in the corrections below

Do not repeat repository-wide discovery.

## Verified candidate state
- Base main: `fb38414d9076f89083bdc680e48e1a0b0329be06`
- Previous P1.4 candidate: `b6254dd7c31ab601ea4542ebbbfd973c44c98f94`
- PR #5 exact-head CI #154 succeeded on the previous candidate.
- Migration 025 is candidate-only and MUST remain unapplied during this task.
- Migration 024 is already live from closed P1.3. Do not report it as unapplied.

## Correction 1 — complete fail-closed response validation
File: `backend/server/src/services/dbClient.ts`

The booking availability collection matcher currently accepts an HTTP 200 unexpected non-array object by normalizing it to `[raw]`. After filtering this can become `[]` and falsely report full availability.

Required:
- Collection availability SELECTs must require the expected PostgREST collection response shape.
- Validate the minimum required row fields used for availability decisions.
- HTTP 200 malformed/unexpected payloads must THROW and must never become empty availability.
- Apply equivalent strictness to new `property_availability` collection reads and write-return payloads where required by their contracts.
- Preserve legitimate empty arrays as valid zero-row results.

Regression proof:
- HTTP 200 unexpected object/malformed availability payload cannot become `[]`.

## Correction 2 — preserve trigger conflict evidence through Worker adapter
Files: `backend/server/src/services/dbClient.ts`, `backend/server/src/app.ts`, focused tests.

Current `property_availability` upsert non-2xx error discards the PostgREST response body. Therefore a DB trigger error containing `DATE_COVERED_BY_ACTIVE_BOOKING` can become generic HTTP 500 instead of canonical HTTP 409 `DATE_OVERLAP` in the deployed Worker path.

Required:
- On non-2xx availability writes, capture bounded error body/evidence sufficient to preserve canonical DB trigger conflict codes.
- Do not expose unbounded or sensitive response data.
- Owner manual-block race/conflict against active booking must map to HTTP 409 `DATE_OVERLAP`, not generic 500.

Regression proof:
- Simulate the real Worker/PostgREST non-2xx trigger-error path and prove `DATE_COVERED_BY_ACTIVE_BOOKING` becomes 409 `DATE_OVERLAP`.

## Correction 3 — reverse race conflict mapping
Audit the exact Worker booking INSERT/update adapters plus application catches for migration 025's booking-side trigger error `DATE_MANUALLY_BLOCKED`.

Required:
- If a manual block wins after application precheck but before booking INSERT or blocking-state transition, the expected availability conflict must surface as clean HTTP 409 conflict semantics.
- Do not convert unrelated DB failures into 409.
- Preserve existing booking/business semantics.

Add only the minimum focused regression proof required for the actual Worker path(s).

## Correction 4 — strict Owner toggle input validation
Route: `POST /api/v1/owner/calendar/toggle-block`

Required:
- Existing action contract is exactly `note: 'BLOCKED' | 'UNBLOCKED'`.
- Missing/other action -> HTTP 400 before DB write.
- Validate a real calendar date in exact `YYYY-MM-DD` form.
- Impossible dates such as `2026-02-31` -> HTTP 400 before DB access.
- Do not change the frontend contract.

## Non-goals / forbidden
- Do not redesign migration 025 unless a correction above proves its mechanism invalid.
- Do not change canonical blocking states or `[checkIn, checkOut)` semantics.
- Do not change finance/payment/wallet/cancellation/KYC/property rules.
- Do not implement P1.5.
- Do not mutate live Supabase/Storage.
- Do not apply migration 025.
- Do not deploy manually.
- Do not push or merge `main`.
- Do not use Native Codex.

## Required tests
Run at minimum:
- `npm --prefix backend run check`
- `npm --prefix backend run test:booking-01`
- `npm --prefix backend run test:booking-01-1`
- `npm --prefix backend run test:p1-4-availability`
- `npm --prefix backend run test:p1-4-worker-availability`
- `npm --prefix backend run test:p1-4-migration`
- `npm --prefix backend run test:p13-worker-adapter`
- `git diff --check`

For in-scope failures: diagnose -> fix -> rerun.

## Git discipline
Before editing:
- fetch origin;
- verify `origin/main == BASE_MAIN_SHA`;
- verify task branch contains the exact correction Task Handoff SHA supplied by the launcher;
- verify `PREVIOUS_CANDIDATE_SHA` is the P1.4 implementation ancestor;
- stop on unexpected remote/main movement.

The correction task-contract commit is orchestration-only. Final history must again be exactly ONE logical P1.4 commit above `BASE_MAIN_SHA`, message:
`fix(availability): close P1.4 persistence integrity`

Amend/squash the correction contract into that single logical implementation commit. Push only `validation/p1-4-rc`, update PR #5, and wait for exact-head PR CI. Production Worker deploy must remain SKIPPED on pull_request.

## Stop gate
Stop only when all four corrections are proven, required tests pass, final history is one logical commit above exact base main, PR #5 exact-head CI is green, production Worker deploy is skipped, and no live mutation occurred.

Return only a compact:

`P1.4 CORRECTION REPORT`

Include:
- previous candidate SHA
- final implementation SHA
- corrections made
- regression proofs
- commit parent/count
- PR head
- exact-head CI/checks
- Worker deploy state
- Migration 025 state
- live mutation
- Codex use
- final status

Final status:
`READY_FOR_FINAL_CODEX_REVIEW`
or `BLOCKED_<exact reason>`.

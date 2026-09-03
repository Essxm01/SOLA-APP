# KONFRM — P1.4 Candidate Refresh Contract

## Task type
Candidate refresh / evidence preparation only. No live mutation. No publication.

## Repository / branch
- Repository: `Essxm01/SOLA-APP`
- Working branch: `validation/p1-4-refresh`
- Base `main`: `ee38f2e90ee4d25fc237929f9756a42e89a22b4b`
- Historical P1.4 candidate: `validation/p1-4-rc` at `67601a1364192f502186da3bd10e9c2fd5eadb54`
- Historical candidate merge-base: `fb38414d9076f89083bdc680e48e1a0b0329be06`

## Why this task exists
The historical P1.4 candidate is one implementation commit ahead of its old base but now diverges from current `main` after reviewed P1.3 current-state reconciliation was published.

Do not review or publish the stale branch directly. Refresh the candidate onto current `main` while preserving the current operational truth already published in `main`.

## Objective
Produce one clean, remote, reviewable P1.4 candidate based on current `main` that carries the intended P1.4 implementation and tests without reintroducing stale P1.3/current-state documentation.

This is not permission to redesign P1.4, apply migration 025, deploy Cloudflare, or merge to main.

## Product/business invariants to preserve
- Stay length: 2–30 nights.
- `PENDING_OWNER_APPROVAL` does NOT block dates.
- `APPROVED_PENDING_PAYMENT` blocks dates.
- `CONFIRMED` blocks dates.
- Quote is not a hold.
- Booking creation revalidates availability.
- Canonical availability read/DB failure must fail closed; never manufacture empty availability/success.
- No payment before Owner approval.
- Do not change unresolved cancellation/payment-expiry/product rules.

## Preflight — fail fast
Before edits:
1. `git fetch origin`
2. checkout `validation/p1-4-refresh`
3. verify exact TASK HANDOFF SHA from launcher
4. verify `origin/main = ee38f2e90ee4d25fc237929f9756a42e89a22b4b`
5. verify `origin/validation/p1-4-rc = 67601a1364192f502186da3bd10e9c2fd5eadb54`
6. verify tracked worktree clean

On mismatch: STOP with `TASK_HANDOFF_MISMATCH`.

## Hot context only
Read:
- `AGENTS.md`
- `docs/codex/KONFRM_MASTER_RULES.md`
- `docs/BUSINESS_RULES.md`
- `docs/DATABASE.md`
- `docs/ARCHITECTURE.md`
- `docs/CURRENT_STATE.md`
- `tasks/CURRENT_TASK.md`
- this contract
- historical candidate diff/commit `67601a...`

Do not bulk-read unrelated history.

## Refresh procedure
Use a clean Git operation to transplant the historical P1.4 implementation commit onto `validation/p1-4-refresh`.

Preferred approach: cherry-pick `67601a1364192f502186da3bd10e9c2fd5eadb54` onto the refresh branch.

If conflicts occur, resolve under these rules:

### Implementation/backend/test files
Preserve the historical P1.4 candidate behavior unless current-main code creates a concrete incompatibility. If a real code incompatibility requires non-mechanical redesign or new implementation, STOP and report `P1_4_REFRESH_REQUIRES_IMPLEMENTATION_REWORK` rather than improvising.

### Current operational documentation
Do NOT restore stale pre-reconciliation P1.3 wording.
Preserve current-main truth:
- P1.3 closed/live-verified.
- migration 024 applied live.
- P1.4 is next boundary.

For `docs/CURRENT_STATE.md` and `tasks/CURRENT_TASK.md`, resolve conflicts conservatively. The refreshed candidate may identify P1.4 as the active review candidate, but must not state that P1.4 is closed, live, published, migration 025 applied, or Founder-approved for rollout.

### CI workflow
The historical candidate changes `.github/workflows/ci-validation.yml`.
Inspect the exact five-line candidate delta and verify it is only P1.4 validation coverage or another clearly in-scope validation change.
Do NOT modify deployment policy in this task.

Known separate CI governance defect: pushes to `main` currently can redeploy the Worker even for docs-only merges. Do not mix that fix into P1.4 refresh. Report it separately as `KNOWN_CI_DEPLOY_GATING_DEFECT` if still present.

## Migration 025
Migration file `backend/database/migrations/025_availability_blocking_integrity.sql` may be present in the candidate.

In this task:
- inspect it
- validate contracts locally/read-only
- DO NOT apply it to Supabase
- DO NOT perform live schema/data mutation

Any later live migration requires explicit Founder approval at the rollout gate.

## Required validation
At minimum run the applicable local checks from the candidate, including:
- backend TypeScript/check
- P1.4 availability behavioral tests
- P1.4 Worker availability tests
- P1.4 migration contract tests
- relevant booking regression test
- `git diff --check`
- changed-path review
- clean tracked `git status`

If a test fails because the historical implementation is defective, do not paper over it. Report whether the defect is same-scope implementation work requiring Z Code.

## Security / credentials
Never print, echo, paste, or include GitHub/Cloudflare/Supabase tokens in commands or reports.
Do not use `git credential fill` in a way that prints credentials.
Use authenticated tooling without exposing secrets.

## Git output
If refresh and validation pass:
- create the refreshed candidate commit(s) as needed on `validation/p1-4-refresh`
- push normally
- no force push
- no PR yet
- no merge

## Forbidden
- No Supabase mutation.
- No migration apply.
- No Storage mutation.
- No Cloudflare deployment.
- No merge to `main`.
- No P1.5 work.
- No business-rule invention.
- No broad refactor.
- No unrelated CI deploy-gating fix.

## Required report
Return exactly these sections:

1. `RESULT`: `P1_4_REFRESH_PASS`, `P1_4_REFRESH_REQUIRES_IMPLEMENTATION_REWORK`, or `P1_4_REFRESH_FAIL`
2. Starting TASK HANDOFF SHA
3. Current `main` SHA verified
4. Historical candidate SHA verified
5. Final refreshed candidate SHA
6. Cherry-pick/conflict resolution summary
7. Exact changed paths vs current main
8. Validation commands and results
9. Migration 025 status: repository-only / NOT APPLIED LIVE
10. CI workflow delta assessment
11. Known CI deploy-gating defect status
12. Remote branch head
13. Live mutation: `NONE`
14. Next recommended tool: Codex final review if clean, otherwise Z Code if implementation rework is required

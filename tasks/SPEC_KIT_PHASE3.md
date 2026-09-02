# KONFRM Spec Kit — Phase 3 Refinement

TASK_ID: SPEC-KIT-P3
STAGE: TEMPLATE_REFINEMENT
EXECUTOR: ANTIGRAVITY
WRITER: ANTIGRAVITY_ONLY
BRANCH: infra/spec-kit-pilot
BASE_SHA: 34000594c14c25ef6456d7ef0070a7f12f1814a7
LIVE_MUTATION: FORBIDDEN
CODEX: NOT_USED

## Objective
Refine the current Spec Kit pilot so it reduces context/quota and never invents roadmap/work that is not actually needed.

Do not change application/backend/database/workflow code. Only Spec Kit infrastructure and this task contract may change.

## Verified issues to correct

### 1. Remove incorrect roadmap examples
Current overrides contain examples such as `PHASE 3 — Calendar & Availability`, which is not a canonical KONFRM macro-phase title.

Replace examples with neutral placeholders only:
- `Macro Roadmap Phase: [PHASE N — exact canonical title from خطة عمل التطبيق.txt]`
- add separate optional `Execution Boundary: [e.g. P1.5]`

Never invent or paraphrase a macro-phase title.

### 2. Make spec/plan templates adaptive, not all-systems-by-default
The current spec/plan templates list all frontends/backend/data/storage surfaces and three user stories by default. This can create fake work and unnecessary context.

Refine so:
- only impacted roles/systems are included;
- backend-only tasks do not require fake frontend sections;
- UI sections are conditional: `N/A — no UI impact` is valid;
- one or more independently testable acceptance journeys are generated only as needed; do not force P2/P3 stories;
- schema, Worker adapter, external integration, and live-verification sections may be `N/A with reason` when genuinely untouched.

### 3. Replace hard-coded T001–T007 workflow with adaptive task generation
The current `tasks-template.md` assumes every feature needs setup → test harness → data layer → backend → frontend → regression → review.

Replace with a metadata-first adaptive task template.

Every generated task must include only relevant fields from:
- TASK_ID
- TITLE / OUTCOME
- EXECUTOR
- RISK
- DEPENDENCIES
- SYSTEMS/FILES
- HOT_CONTEXT
- BUSINESS_RULE_REFS
- LIVE_MUTATION
- CODEX_GATE
- FOUNDER_DECISION_REQUIRED
- REQUIRED_EVIDENCE

Rules:
- Do not create a task solely to fill a phase template.
- No mandatory frontend task for backend-only work.
- No mandatory migration/Worker task if those surfaces are untouched.
- Antigravity = scout / mechanical / long-running verification / CI / low-complexity edits when assigned.
- ZCode = heavy implementation when complex reasoning or multi-file backend/SQL/refactor work is needed.
- Codex = final read-only review gate only when `CODEX_GATE: YES`.
- Exactly one active writer at a time.
- Read-only scouting may run in parallel with another writer only when it cannot mutate the active branch/worktree.

### 4. Do not inject mandatory TDD policy
Current sample task text requires a failing test harness before implementation. KONFRM governance does not universally mandate TDD for every task.

Use:
`Add or update focused regression/contract tests when required; capture baseline failure when useful and feasible.`

Do not introduce a new project-wide TDD rule.

### 5. Fix misleading technical examples
- Do not cite `schema.sql` as canonical; migrations/current database docs are authoritative.
- Do not state that every persistence failure must be HTTP 500. Preserve truthful semantics: validation/domain conflicts may be 4xx; dependency/persistence failures are 5xx.
- Remove `100% automated regression test coverage` as a generic success criterion. Prefer deterministic evidence for all in-scope acceptance/failure scenarios.

### 6. Keep Constitution stable, move volatile routing out of constitutional law
In `.specify/memory/constitution.md`:
- preserve stable principles: Founder authority, immutable roadmap, specification-before-implementation, single-writer, fail-closed/data integrity, evidence, live gates, UX quality, context efficiency;
- do NOT make specific vendor/model assignments constitutionally permanent;
- replace detailed Antigravity/ZCode/Codex role bullets with a stable rule that current agent routing is defined by `AGENTS.md`, the active task contract, and current Founder/orchestrator decisions;
- keep Single Writer explicit.

The templates may still contain current executor metadata and current routing guidance because those are operational, not constitutional.

### 7. Correct publication wording
Current constitution says exact reviewed commit SHAs must be preserved through publication. GitHub merge commits legitimately create a new SHA.

Replace with:
- publication must be pinned to the exact reviewed PR head using an expected-head/lease gate;
- no unreviewed candidate changes may enter publication;
- if merge creates a new main SHA, verify the resulting tree contains the reviewed candidate unchanged as intended, then validate CI/deploy/live state on the resulting main SHA.

## Files allowed to change
- `.specify/memory/constitution.md`
- `.specify/templates/overrides/spec-template.md`
- `.specify/templates/overrides/plan-template.md`
- `.specify/templates/overrides/tasks-template.md`
- `tasks/SPEC_KIT_PHASE3.md` only if status/evidence needs final update

Do not modify core `.specify/templates/*`.
Do not modify `.agents/skills/*` or `.zcode/skills/*`.
Do not add Codex integration.

## Verification
Run:
- `specify version`
- `specify integration status --json`
- `specify integration list`
- placeholder scan for wrong roadmap example and mandatory T001–T007 assumptions
- scan that constitution contains no permanent vendor-specific routing assignments
- `git diff --check`
- `git status`

Verify:
- default integration remains `agy`;
- installed integrations remain exactly `agy` + `zcode`;
- no app/backend/database/.github changes;
- no live mutation.

Commit and push only `infra/spec-kit-pilot`.

## Stop gate
Return `KONFRM SPEC KIT PHASE 3 REPORT` with:
- starting SHA
- final SHA
- exact refinements
- constitution stability summary
- adaptive-template summary
- integration state
- changed paths
- verification results
- live mutation state

Final status must be:
`SPEC_KIT_PHASE3_READY_FOR_REVIEW`
or `BLOCKED_<exact reason>`.
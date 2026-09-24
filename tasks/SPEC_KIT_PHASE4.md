# KONFRM Spec Kit — Phase 4 Final Quota Refinement

## Stage
FINAL_TEMPLATE_REFINEMENT

## Purpose
Make the KONFRM Spec Kit layer truly adaptive and quota-efficient before opening the pilot PR. This is a narrow refinement task, not a redesign.

## Authority
Preserve without weakening:
- `AGENTS.md`
- `docs/codex/KONFRM_MASTER_RULES.md`
- `.specify/memory/constitution.md`
- current integration state (`agy` default; `agy` + `zcode` installed)

## Scope
Modify ONLY:
- `.specify/templates/overrides/spec-template.md`
- `.specify/templates/overrides/plan-template.md`
- `.specify/templates/overrides/tasks-template.md`

Do not modify Constitution unless a direct contradiction blocks these refinements.
Do not touch application code, backend, database, migrations, CI workflows, P1.4, main, Supabase, Storage, or Cloudflare.

## Required Corrections

### 1. Remove universal domain requirements from `spec-template.md`
The template is adaptive, so it MUST NOT force requirements that are irrelevant to the feature.

Current generic FR examples for HTTP error semantics and JWT authorization must become conditional examples, not mandatory universal FR slots.

Requirements section should instruct:
- generate only requirements needed by the in-scope feature;
- include authorization requirements only when an authenticated/role-boundary surface is touched;
- include persistence/fail-closed requirements only when data/dependency behavior is touched;
- do not manufacture requirements merely to fill numbered placeholders.

Success Criteria must also be adaptive:
- do not universally require Worker REST adapter parity for features that do not touch DB queries;
- do not universally require DB fallback criteria for pure UI/docs/tooling work;
- generate deterministic criteria only for actual in-scope acceptance/failure paths.

### 2. Make `plan-template.md` verification surface-driven
The Verification/Test Strategy must explicitly say to include ONLY checks relevant to touched systems.

Do not default every task to:
- backend behavioral tests,
- Worker REST adapter tests,
- frontend checks,
all at once.

Examples may remain, but each must be clearly conditional.

Add an `Evidence Compression` rule:
- passing commands: record command + PASS + essential identifiers only;
- failures: capture only relevant failing section/snippet;
- never paste huge successful logs into agent context;
- CI evidence: run ID, exact SHA, required check conclusions, deploy state.

### 3. Make `tasks-template.md` genuinely minimal
Keep the metadata schema, but strengthen these rules:
- Generate the minimum number of tasks that creates a safe execution boundary.
- A task must represent a real independently verifiable unit, not ceremony.
- Setup/baseline task is optional; omit when handoff launcher already proves SHA/worktree state.
- Verification may be its own Antigravity task when long/mechanical; otherwise it can be evidence requirements on the implementation task.
- Do not create a separate task merely because an example phase exists.

Replace the example `Full test suite passing` requirement with:
`All task-required focused regression/typecheck/build checks pass; exact scope defined by spec/plan.`

### 4. Add immutable handoff metadata support
At the task-list header, add a compact optional execution handoff block suitable for our workflow:
- `BASE_SHA`
- `TASK_HANDOFF_SHA`
- `WRITER`
- `LIVE_MUTATION_AUTHORIZED: YES|NO`
- `FINAL_REVIEW_REQUIRED: YES|NO`

State that SHA values are populated/frozen at dispatch time, not guessed during specification drafting.

### 5. Tighten HOT_CONTEXT guidance
For every implementation task:
- list only exact essential files/sections;
- prefer section pointers over whole-document rereads;
- do not include generic repo-wide docs unless directly governing the task;
- scout summaries should be referenced when they replace broad rediscovery.

### 6. Compact reporting rule
Add to tasks template:
`Agent reports must be evidence-dense and compact: exact SHA, changed surfaces, tests/checks, blockers, live mutation state. Do not include successful raw logs unless specifically requested.`

## Verification
Run:
- `specify version`
- `specify integration status --json`
- `git diff --check`
- grep/search to prove no universal `Full test suite` requirement remains in overrides
- grep/search to prove Worker/backend-only success criteria are conditional rather than universal

Verify:
- default integration remains `agy`
- installed integrations remain exactly `agy`, `zcode`
- no Codex integration installed
- no paths outside the three override templates changed during this phase

## Git Gate
Commit and push only `infra/spec-kit-pilot`.
Do not open a PR yet.
Do not merge.

## Return
Return only a compact report:

`KONFRM SPEC KIT PHASE 4 REPORT`

Include:
- starting SHA
- final SHA
- exact refinements
- final integration state
- changed paths
- verification results
- live mutation state
- final status: `SPEC_KIT_READY_FOR_DRAFT_PR` or precise blocker

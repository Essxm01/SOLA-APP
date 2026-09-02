# KONFRM SPEC KIT DRY RUN — P1.5 PLANNING ONLY

## Purpose
Validate the customized Spec Kit workflow on the next KONFRM execution boundary without starting implementation.

This is a PLANNING-ONLY DRY RUN.
It must produce concise, high-quality Spec Kit artifacts and evaluate context/quota efficiency.
It must not modify application/backend/database/CI code and must not start P1.5 implementation.

## Repository / Branch
- Repository: `Essxm01/SOLA-APP`
- Starting branch: `pilot/spec-kit-p1-5-dry-run`
- Spec Kit source SHA: `f8823af387bb92da41dbfbc9a63a0afa39094f2e`
- Current product main baseline: `fb38414d9076f89083bdc680e48e1a0b0329be06`

## Target Planning Boundary
- Execution boundary: `P1.5`
- Domain: booking persistence + booking financial-summary persistence/integrity.
- This dry run may PLAN for the boundary only.
- P1.4 is NOT CLOSED at the time of this handoff. Do not claim P1.5 started, approved for implementation, or independent of P1.4 publication.
- Treat P1.4 as an unresolved predecessor dependency. Read its candidate only if a specific dependency question requires it; do not adopt unmerged candidate behavior as canonical main state.

## Governing Authority
Use the normal KONFRM precedence. Load only hot context needed to build accurate planning artifacts.

Mandatory planning authorities:
1. `AGENTS.md`
2. `.specify/memory/constitution.md`
3. `docs/codex/KONFRM_MASTER_RULES.md`
4. `docs/codex/KONFRM_EXECUTION_MAP.md` — exact P1.5 boundary / dependencies
5. `docs/BUSINESS_RULES.md` — booking + financial-summary relevant sections only
6. `docs/DATABASE.md` — bookings / booking_financial_summaries relevant sections only
7. `docs/CURRENT_STATE.md` — current verified state
8. exact existing booking/financial implementation files only where needed to ground the plan

Do not bulk-read unrelated historical docs.
Do not copy large authorities into generated artifacts; reference exact paths/sections.

## Required Workflow
Exercise the ACTUAL installed Spec Kit workflow/skills rather than manually fabricating similarly named files.

Generate the Spec Kit planning artifacts for this dry run in an isolated feature-spec area using the installed KONFRM overrides:
1. specification artifact (`spec.md`)
2. implementation plan artifact (`plan.md`)
3. task artifact (`tasks.md`)
4. run Spec Kit consistency/analyze step if available and useful; fix artifact inconsistencies found without changing product requirements

If the Spec Kit workflow requires creation of an isolated feature branch/spec directory, that is allowed for this dry run only. Do not merge it and do not target application implementation.

## Artifact Requirements
### spec.md
Must be concise and surface-driven.
Must include:
- exact macro phase/title from canonical roadmap
- P1.5 execution boundary
- real business purpose
- exact authority references
- scope and non-goals
- actual affected surfaces only
- independently testable acceptance journeys
- open Founder decisions instead of guessed rules
- deterministic success criteria only for touched surfaces

### plan.md
Must:
- be grounded in current code/database reality
- identify exact likely files/systems only after focused inspection
- state migration/RPC/Worker-adapter impact truthfully (including N/A where justified)
- preserve booking lifecycle and finance rules
- identify P1.4 predecessor dependency
- contain a small hot-context list with section pointers
- contain surface-driven verification only
- include evidence compression rules

### tasks.md
Goal: test whether our customization genuinely reduces quota/context.
Generate the MINIMUM number of execution tasks that still create safe independently verifiable boundaries.

Every generated task must include the KONFRM metadata required by the override.
Do not create ceremony/setup tasks when the launcher already verifies the workspace.
Do not create frontend, migration, documentation, or verification tasks unless the spec/plan proves they are actually required.
Separate Antigravity vs ZCode work based on reasoning complexity and work volume.
Codex remains final review gate only.

Handoff metadata inside generated tasks.md:
- `BASE_SHA`: keep the product baseline explicit
- `TASK_HANDOFF_SHA`: mark `DRY_RUN_NOT_DISPATCHED` because this is not an implementation handoff
- `WRITER`: `NONE — PLANNING DRY RUN`
- `LIVE_MUTATION_AUTHORIZED`: `NO`
- `FINAL_REVIEW_REQUIRED`: `YES` only as a future implementation publication gate, not for this dry-run artifact generation

## Forbidden Actions
- NO application/backend/database code edits
- NO migrations
- NO Supabase/Storage access or mutation
- NO Cloudflare deploy
- NO CI workflow edits
- NO P1.4 edits
- NO PR #5 edits
- NO merge to `main`
- NO P1.5 implementation
- NO ZCode execution
- NO Codex execution
- NO invented business/financial/product decisions

Only planning/spec artifacts plus any Spec Kit-managed branch/spec metadata required to exercise the real workflow may be written.

## Evaluation Report
After generation, return a compact:

`KONFRM SPEC KIT P1.5 DRY RUN REPORT`

Include:
- starting SHA
- generated feature/spec branch/path
- exact artifacts generated
- line count for spec.md / plan.md / tasks.md
- number of tasks generated
- executor distribution (Antigravity vs ZCode vs Codex gate)
- hot-context files/sections selected
- open Founder decisions found
- P1.4 dependency treatment
- Spec Kit analyze/consistency result
- changed paths proving no implementation code touched
- git diff --check
- final artifact SHA if committed/pushed
- LIVE MUTATION: NONE
- verdict:
  - `SPEC_KIT_DRY_RUN_PASS`
  - or `SPEC_KIT_DRY_RUN_NEEDS_REFINEMENT`
- if refinement is needed: maximum 5 concrete high-impact issues only

Do not include raw successful logs.

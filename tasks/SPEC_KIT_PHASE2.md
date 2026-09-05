# KONFRM Spec Kit Pilot — Phase 2

TASK_ID: SPEC-KIT-P2
STAGE: GOVERNANCE_AND_MULTI_AGENT_SETUP
EXECUTOR: ANTIGRAVITY
WRITER: ANTIGRAVITY_ONLY
BRANCH: infra/spec-kit-pilot
STARTING_PILOT_SHA: babdcec40b9ade339c76513b75518808006ab2f1
BASE_MAIN_SHA: fb38414d9076f89083bdc680e48e1a0b0329be06
LIVE_MUTATION: FORBIDDEN
APPLICATION_CODE_CHANGES: FORBIDDEN
P1_4_CHANGES: FORBIDDEN

## Objective
Turn the clean Spec Kit bootstrap into a KONFRM-specific, quota-efficient multi-agent operating layer without changing product logic, roadmap, application code, database, deployment, or P1.4.

This phase has exactly three outputs:
1. add ZCode as a second Spec Kit integration without changing Antigravity as default;
2. replace the placeholder Spec Kit constitution with a compact KONFRM constitution derived only from approved authorities and the Founder-approved orchestration rules below;
3. add project-local Spec Kit template overrides that produce smaller, execution-ready specs/plans/tasks for KONFRM.

Do not create a PR, merge, deploy, or touch live systems.

## Preflight
Before editing:
- fetch origin;
- verify `origin/main == BASE_MAIN_SHA`;
- verify `origin/infra/spec-kit-pilot == STARTING_PILOT_SHA`;
- checkout `infra/spec-kit-pilot`;
- ensure worktree is clean except the unrelated Founder file if present; preserve it untouched;
- run `specify version` and require 1.0.3;
- run `specify integration status --json` and save a compact before-state summary.

If any SHA differs, STOP `SPEC_KIT_HANDOFF_MISMATCH`.

## A. Multi-agent integration setup
Current verified state:
- Antigravity integration key: `agy`.
- `agy` is installed and default.
- Antigravity skills are managed under `.agents/skills/`.
- Official Spec Kit v1.0.3 also uses `.agents/skills/` for `codex` and `.zcode/skills/` for `zcode`.

Rules:
1. DO NOT install the `codex` integration in this phase. It overlaps the same `.agents/skills/` path already managed by `agy`; avoid duplicate ownership/manifest conflicts.
2. Install only `zcode` as the second integration.
3. Because `agy` is not declared multi-install-safe by Spec Kit, an explicit `--force` acknowledgement is allowed ONLY for this exact `agy + zcode` combination after confirming the actual target paths do not overlap.
4. Use PowerShell scripts.
5. Keep `agy` as `default_integration` after installation.

Expected command after the path/status preflight:
`specify integration install zcode --script ps --force`

After installation:
- run `specify integration status --json`;
- verify installed integrations contain `agy` and `zcode`;
- verify default remains `agy`;
- verify `.zcode/skills/` exists;
- verify existing `.agents/skills/` files were not unexpectedly rewritten or removed;
- inspect the new ZCode integration manifest and record the managed paths.

If installation attempts to overwrite unrelated existing files or cannot preserve Antigravity cleanly, STOP `SPEC_KIT_MULTI_AGENT_CONFLICT` and do not force through it.

## B. KONFRM Constitution
Replace the placeholder `.specify/memory/constitution.md` with a concise KONFRM-specific constitution.

### Read only the governance hot context needed
Use these authorities:
- `AGENTS.md`
- `docs/INDEX.md`
- `docs/codex/KONFRM_MASTER_RULES.md`
- `docs/BUSINESS_RULES.md`
- `docs/codex/KONFRM_EXECUTION_MAP.md`
- `docs/DECISIONS.md` only where needed to resolve durable decisions referenced by the above

Do NOT bulk-read historical plans or unrelated docs.

### Constitution requirements
The constitution must be compact and reference authoritative files instead of duplicating large business-rule catalogs.

It must encode these principles without inventing product rules:

1. **Founder/Product Authority**
   - latest explicit Founder decision and repository authority hierarchy govern;
   - agents never invent or silently change product, financial, booking, availability, refund/cancellation, identity, role, or architectural rules;
   - unresolved authority conflict stops for Founder/orchestrator decision.

2. **Immutable Roadmap / Bounded Delivery**
   - preserve PHASE 0–22 macro roadmap and current execution ordering;
   - one approved bounded task at a time;
   - no agent self-expands into P1.5 or another phase.

3. **Spec/Contract Before Implementation**
   - objective, authorities, affected systems, non-negotiables, open decisions, evidence, and non-goals must be explicit before code edits;
   - use progressive disclosure and hot context only.

4. **Multi-Agent Role Discipline** — Founder-approved orchestration rule for the Spec Kit pilot
   - ChatGPT = Product + Technical Orchestrator / decision and evidence reviewer;
   - Antigravity = long-running/light executor, scout, trace/search, mechanical setup, verification, regression hunting, CI/evidence collection;
   - ZCode = primary heavy implementation engineer for complex backend/SQL/migrations/multi-file/refactor/debug work;
   - Codex = scarce final reviewer/gatekeeper, not routine implementer;
   - deterministic tools/tests verify facts before expensive model review;
   - only one repository writer on an active branch/worktree at a time.

5. **Business/Data Integrity**
   - Supabase PostgreSQL remains persistence source of truth;
   - Worker REST adapter compatibility must be preserved and tested when touched;
   - failures fail honestly/closed where the domain requires it;
   - cross-app/backend/database effects must be considered before implementation.

6. **Evidence Before Closure**
   - green build/CI alone is never proof of completion;
   - closure requires task-contract compliance, relevant tests, regression evidence, exact Git SHA/PR/CI state, and live verification where deployment-sensitive;
   - agent self-report is evidence, not authority.

7. **Live Mutation / Publication Gate**
   - migrations, production deploys, live Supabase/Storage mutation, merge/publication actions require the existing approval gates and explicit Founder authorization when applicable;
   - exact reviewed SHA must be preserved through publication.

8. **UX Quality by Role**
   - Customer, Owner, and Admin experiences are different business roles;
   - UI changes must respect DESIGN_SYSTEM and role-specific clarity, trust, control, Arabic-first RTL behavior, loading/error/empty/success/retry states;
   - functional correctness alone is not sufficient for UI closure.

9. **Quota / Context Efficiency**
   - do not repeatedly re-read broad repository context;
   - use fresh task sessions, hot-context pointers, compressed evidence, focused failure logs, and deterministic checks first;
   - Antigravity absorbs long mechanical work; ZCode receives narrowed heavy implementation; Codex sees final candidate only where feasible.

10. **Governance**
   - this Spec Kit constitution is an execution aid below the existing KONFRM authority hierarchy; it must not override Founder decisions, Master Rules, Business Rules, Execution Map, or Design System;
   - constitution changes require explicit orchestrator/Founder-approved task scope.

Use a real version and date; no placeholders/TBD/TODO may remain.

## C. Project-local Spec Kit overrides
Do NOT directly customize the managed core templates under `.specify/templates/`.
Create project-local overrides under:
`.specify/templates/overrides/`

Create overrides for:
- `spec-template.md`
- `plan-template.md`
- `tasks-template.md`

Preserve the core Spec Kit semantics and required sections; extend them for KONFRM rather than replacing them with an unrelated format.

### spec-template.md must make generated specs capture
- feature/task purpose and user/business outcome;
- affected role(s): Customer / Owner / Admin / Backend-only;
- explicit scope and non-goals;
- governing business-rule/document references by path/section rather than copied prose;
- cross-app/backend/database impact summary;
- user scenarios and acceptance outcomes;
- UX states where UI is affected;
- unresolved Founder decisions as explicit blockers, never guessed answers.

### plan-template.md must make generated plans capture
- affected applications/services/database/storage/deploy surfaces;
- architecture and data-flow impact;
- schema/migration/RLS/privilege impact when relevant;
- Cloudflare Worker ↔ Supabase REST adapter compatibility when relevant;
- authorization/security boundaries;
- backward compatibility and non-goals;
- test strategy: focused, regression, CI, live verification if needed;
- publication/live-mutation gate;
- context budget / hot-context files required for implementation.

### tasks-template.md must make generated tasks execution-ready and quota-aware
Keep normal Spec Kit task checklist syntax, but add a compact KONFRM dispatch metadata convention so each implementation group can declare:
- TASK_ID
- EXECUTOR: ANTIGRAVITY | ZCODE
- RISK: LOW | MEDIUM | HIGH
- DEPENDENCIES
- SYSTEMS/FILES
- HOT_CONTEXT
- BUSINESS_RULE_REFS
- LIVE_MUTATION: YES/NO
- CODEX_GATE: YES/NO
- FOUNDER_DECISION_REQUIRED: YES/NO
- REQUIRED_EVIDENCE

Task generation guidance must enforce:
- long/easy/mechanical/scout/verification work → Antigravity;
- complex/heavy backend/SQL/migration/refactor/debug implementation → ZCode;
- Codex is not an implementation executor in generated task lists; it is a final review gate via metadata;
- single-writer sequencing;
- parallelism only for read-only/independent work;
- no broad repository rediscovery when a scout/evidence artifact already narrows the work;
- task groups should be small enough for fresh-session execution with hot context only.

Do not add product requirements that are not already authorized.

## D. Verification
Run and report:
- `specify version`
- `specify integration status --json`
- `specify integration list`
- confirm default = `agy`
- confirm installed = `agy`, `zcode`
- confirm no `codex` manifest was installed
- inspect generated/modified paths
- `git diff --check`
- compare all changes against STARTING_PILOT_SHA

Path safety gate:
Allowed new/modified paths in this phase are only:
- `.specify/**`
- `.zcode/**`
- `tasks/SPEC_KIT_PHASE2.md`

No application/backend/database/migration/CI/deployment files may change.
If any forbidden path changes, revert it before completion.

## Git gate
Commit the Phase 2 result on `infra/spec-kit-pilot` only.
Do not rewrite `main` or P1.4 history.
Do not open a PR yet.
Push only this pilot branch.

Return a compact:

`KONFRM SPEC KIT PHASE 2 REPORT`

with:
- starting pilot SHA
- final SHA
- integration before/after state
- exact ZCode install command
- proof Antigravity remained default
- proof Codex was not installed separately
- constitution summary and authority sources used
- override paths and purpose
- changed-path safety result
- git diff check
- live mutation NONE
- final status

Final status must be either:
`SPEC_KIT_PHASE2_READY_FOR_REVIEW`
or `BLOCKED_<exact reason>`.

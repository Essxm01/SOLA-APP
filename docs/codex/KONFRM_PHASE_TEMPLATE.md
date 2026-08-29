# Execution phase template

```md
# [P<macro>.<sequence>] — [Outcome]

**Parent macro phase:** PHASE <0–22>
**Status:** Planned / In progress / Blocked / Complete

## Why this phase exists / objective
## User and role experience intent
## Mandatory context refresh gate
- Core refreshed: `AGENTS.md`, `docs/INDEX.md`, `docs/CURRENT_STATE.md`, `tasks/CURRENT_TASK.md`, and `KONFRM_MASTER_RULES.md`.
- Substantial/cross-system context reviewed as applicable: current reality, decision conflicts, completion matrix, rescue backlog, quality gates.
- Established before editing: authorities, affected systems, non-negotiables, open decisions, evidence to verify, and non-goals.
## Authority and current evidence
## Exact in-scope flow(s)
## Affected roles and surfaces
## Cross-app/entity impact
## Dependencies and relevant matrix/backlog items
## Explicit non-goals
## Product, financial, privacy, and safety guardrails
## Inspect first
## Exact acceptance matrix
## Failure, conflict, and edge cases
## Applicable quality gates
## Verification and evidence plan
## UI QA and interactive evidence (if visible)
## Test and regression plan
## Self-fix loop
Detect → diagnose root cause → fix → retest → reinspect until applicable gates pass.

## No-extension closure discipline
Safe in-scope defects found during this phase remain in this phase until fixed and retested. List only valid stop conditions: Founder/Product decision, unavailable required access, approval-required destructive/live mutation, explicitly unauthorized change, or an external dependency that cannot safely be resolved.

## Live/deployment proof (if applicable)
## Documentation impact
## Closure context re-check
Re-read the active contract, Master Rules, relevant domain authority, and applicable Quality Gates immediately before closure; resolve divergence and retest.
## Stop / Founder-decision conditions
```

Keep the phase independently completable. Split only at a real dependency, risk, product-decision, or acceptance boundary—not at a trivial control-level task.

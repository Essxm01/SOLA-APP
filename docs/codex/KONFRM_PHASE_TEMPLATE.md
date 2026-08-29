# Execution phase template

```md
# [P<macro>.<sequence>] — [Outcome]

**Parent macro phase:** PHASE <0–22>
**Status:** Planned / In progress / Blocked / Complete

## Why this phase exists / objective
## User and role experience intent
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

## Live/deployment proof (if applicable)
## Documentation impact
## Stop / Founder-decision conditions
```

Keep the phase independently completable. Split only at a real dependency, risk, product-decision, or acceptance boundary—not at a trivial control-level task.

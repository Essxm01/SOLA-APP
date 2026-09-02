---
description: "Adaptive task list template for KONFRM feature implementation"
---

# Tasks: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`
**Prerequisites**: `spec.md`, `plan.md`
**Macro Roadmap Phase**: [PHASE N — exact canonical title from خطة عمل التطبيق.txt]
**Execution Boundary**: [e.g. P1.5 — optional task boundary identifier]

<!-- Execution Handoff Metadata (populated/frozen at dispatch time, not guessed during drafting) -->
**BASE_SHA**: `[base-sha]`
**TASK_HANDOFF_SHA**: `[handoff-sha]`
**WRITER**: [ANTIGRAVITY | ZCODE]
**LIVE_MUTATION_AUTHORIZED**: [YES | NO]
**FINAL_REVIEW_REQUIRED**: [YES | NO]

---

## KONFRM Multi-Agent Task Dispatch Guidelines

<!--
  Operational routing guidance for task planning:
-->
- **Antigravity (`agy`)**: Assigned to codebase scouting, mechanical setup, long-running verification, focused test harnesses, documentation, and low-complexity edits.
- **ZCode (`zcode`)**: Assigned to heavy implementation tasks: backend routers, database repositories, Worker REST matchers, SQL migrations, complex refactors, and core debugging.
- **Codex (`codex`)**: Reserved strictly for final exact-head candidate review gate; NOT assigned as a routine implementation executor.
- **Single-Writer Sequencing (NON-NEGOTIABLE)**: Exactly ONE writer operates on an active branch/worktree at a time. Tasks are executed sequentially; read-only scouting may run in parallel only when it cannot mutate the workspace.
- **Minimal Task Sizing**: Generate the MINIMUM number of tasks that creates a safe execution boundary. A task must represent a real, independently verifiable unit—never ceremony.
  - Setup/baseline tasks are optional (omit when the task launcher/contract already proves SHA and worktree state).
  - Verification may be part of the implementation task's required evidence, or a separate Antigravity task when long/mechanical.
  - Omit untouched surfaces completely (no frontend tasks for backend work; no migration tasks when schema is untouched).
- **Testing Policy**: Add or update focused regression/contract tests when required; capture baseline failure when useful and feasible. Do not mandate universal TDD.
- **Compact Reporting**: Agent reports must be evidence-dense and compact: exact SHA, changed surfaces, tests/checks, blockers, live mutation state. Do NOT include raw successful logs unless specifically requested.

---

## Task Metadata Specification

Every task in the plan must specify its operational metadata:

```markdown
- [ ] T### [Component/Area] Clear task title and specific outcome
  - **TASK_ID**: T###
  - **EXECUTOR**: ANTIGRAVITY | ZCODE
  - **RISK**: LOW | MEDIUM | HIGH
  - **DEPENDENCIES**: [List previous task IDs, or 'None']
  - **SYSTEMS/FILES**: [Explicit file paths to create or modify]
  - **HOT_CONTEXT**: [Exact essential files / section pointers; reference scout summaries where available]
  - **BUSINESS_RULE_REFS**: [Section/Rule ID from docs/BUSINESS_RULES.md or KONFRM_MASTER_RULES.md, or 'N/A']
  - **LIVE_MUTATION**: YES | NO
  - **CODEX_GATE**: YES | NO
  - **FOUNDER_DECISION_REQUIRED**: YES | NO
  - **REQUIRED_EVIDENCE**: [Deterministic proof of completion: passing test name, status code, clean diff]
```

---

## Feature Implementation Tasks *(Adaptive to In-Scope Work)*

<!--
  Generate ONLY the tasks genuinely required for this feature.
  Do NOT create separate tasks merely because an example phase exists below.
-->

### Core Tasks

- [ ] T001 [Implementation] Implement in-scope changes and required tests
  - **TASK_ID**: T001
  - **EXECUTOR**: ZCODE
  - **RISK**: MEDIUM
  - **DEPENDENCIES**: None
  - **SYSTEMS/FILES**: `[exact/path/to/file.ts]`, `[exact/path/to/test.ts]`
  - **HOT_CONTEXT**: `docs/codex/KONFRM_MASTER_RULES.md [MR-##]`, `docs/BUSINESS_RULES.md [§ Section]`
  - **BUSINESS_RULE_REFS**: [BR-##]
  - **LIVE_MUTATION**: NO
  - **CODEX_GATE**: NO
  - **FOUNDER_DECISION_REQUIRED**: NO
  - **REQUIRED_EVIDENCE**: Focused automated test suite passes covering happy, boundary, and fail-closed error paths

---

### Verification & Review Gate *(If separate verification pass or Codex review gate required)*

- [ ] T002 [Verification] Run required checks and prepare candidate review package
  - **TASK_ID**: T002
  - **EXECUTOR**: ANTIGRAVITY
  - **RISK**: LOW
  - **DEPENDENCIES**: T001
  - **SYSTEMS/FILES**: `tasks/CURRENT_TASK.md`
  - **HOT_CONTEXT**: `tasks/CURRENT_TASK.md`
  - **LIVE_MUTATION**: NO
  - **CODEX_GATE**: YES
  - **FOUNDER_DECISION_REQUIRED**: NO
  - **REQUIRED_EVIDENCE**: All task-required focused regression/typecheck/build checks pass; exact scope defined by spec/plan; exact candidate commit SHA recorded; `git diff --check` clean

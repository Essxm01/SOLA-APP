---
description: "Adaptive task list template for KONFRM feature implementation"
---

# Tasks: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`
**Prerequisites**: `spec.md`, `plan.md`
**Macro Roadmap Phase**: [PHASE N — exact canonical title from خطة عمل التطبيق.txt]
**Execution Boundary**: [e.g. P1.5 — optional task boundary identifier]

---

## KONFRM Multi-Agent Task Dispatch Guidelines

<!--
  Operational routing guidance for task planning:
-->
- **Antigravity (`agy`)**: Assigned to codebase scouting, mechanical setup, long-running verification, focused test harnesses, documentation, and low-complexity edits.
- **ZCode (`zcode`)**: Assigned to heavy implementation tasks: backend routers, database repositories, Worker REST matchers, SQL migrations, complex refactors, and core debugging.
- **Codex (`codex`)**: Reserved strictly for final exact-head candidate review gate; NOT assigned as a routine implementation executor.
- **Single-Writer Sequencing (NON-NEGOTIABLE)**: Exactly ONE writer operates on an active branch/worktree at a time. Tasks are executed sequentially; read-only scouting may run in parallel only when it cannot mutate the workspace.
- **Adaptive Task Sizing**: Generate tasks only for impacted surfaces. Do NOT create empty/filler tasks (e.g. no frontend tasks for backend-only work; no migration tasks when schema is untouched).
- **Testing Policy**: Add or update focused regression/contract tests when required; capture baseline failure when useful and feasible. Do not mandate universal TDD.

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
  - **HOT_CONTEXT**: [Minimal essential reference files]
  - **BUSINESS_RULE_REFS**: [Section/Rule ID from docs/BUSINESS_RULES.md or KONFRM_MASTER_RULES.md, or 'N/A']
  - **LIVE_MUTATION**: YES | NO
  - **CODEX_GATE**: YES | NO
  - **FOUNDER_DECISION_REQUIRED**: YES | NO
  - **REQUIRED_EVIDENCE**: [Deterministic proof of completion: test output, status code, diff]
```

---

## Feature Implementation Tasks *(Adaptive to In-Scope Work)*

<!--
  Group tasks logically by component or user story. Include ONLY the phases and tasks genuinely required.
  Examples of typical execution phases (omit any unneeded phase):
-->

### Phase 1: Setup & Baseline Verification *(If workspace prep or test harness needed)*

- [ ] T001 [Setup] Verify baseline commit SHA and workspace cleanliness
  - **TASK_ID**: T001
  - **EXECUTOR**: ANTIGRAVITY
  - **RISK**: LOW
  - **DEPENDENCIES**: None
  - **HOT_CONTEXT**: `tasks/CURRENT_TASK.md`, `AGENTS.md`
  - **LIVE_MUTATION**: NO
  - **CODEX_GATE**: NO
  - **FOUNDER_DECISION_REQUIRED**: NO
  - **REQUIRED_EVIDENCE**: Clean working tree and correct baseline HEAD SHA

---

### Phase 2: Core Implementation *(Include Data, Backend, and/or Frontend tasks as needed)*

<!--
  Example data/backend task (assigned to ZCode for heavy logic):
-->
- [ ] T002 [Backend/Data] Implement core logic and required tests
  - **TASK_ID**: T002
  - **EXECUTOR**: ZCODE
  - **RISK**: MEDIUM
  - **DEPENDENCIES**: T001
  - **SYSTEMS/FILES**: `[exact/path/to/file.ts]`, `[exact/path/to/test.ts]`
  - **HOT_CONTEXT**: `docs/codex/KONFRM_MASTER_RULES.md`, `docs/BUSINESS_RULES.md`
  - **BUSINESS_RULE_REFS**: [BR-##]
  - **LIVE_MUTATION**: NO
  - **CODEX_GATE**: NO
  - **FOUNDER_DECISION_REQUIRED**: NO
  - **REQUIRED_EVIDENCE**: Automated tests pass cleanly covering happy, boundary, and fail-closed error paths

---

### Phase 3: Verification & Review Gate *(Verification and candidate preparation)*

- [ ] T003 [Verification] Run regression checks and prepare review package
  - **TASK_ID**: T003
  - **EXECUTOR**: ANTIGRAVITY
  - **RISK**: LOW
  - **DEPENDENCIES**: T002
  - **LIVE_MUTATION**: NO
  - **CODEX_GATE**: YES
  - **FOUNDER_DECISION_REQUIRED**: NO
  - **REQUIRED_EVIDENCE**: Full test suite passing, `git diff --check` clean, exact candidate commit SHA recorded

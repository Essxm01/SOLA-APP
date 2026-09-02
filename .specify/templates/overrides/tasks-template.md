---
description: "Task list template for KONFRM feature implementation"
---

# Tasks: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`
**Prerequisites**: `spec.md`, `plan.md`
**Macro Roadmap Phase**: [e.g. PHASE 1 — Database Backbone / PHASE 3 — Calendar & Availability]

---

## KONFRM Multi-Agent Dispatch Guidelines

- **Antigravity (`agy`)**: Assigned to lightweight tasks, mechanical setup, codebase scouting, test harnesses, CI verification, and documentation.
- **ZCode (`zcode`)**: Assigned to heavy implementation tasks: backend routers, database repositories, Worker REST matchers, SQL migrations, complex refactors, and core debugging.
- **Codex (`codex`)**: Reserved strictly for final exact-head candidate review gate; NOT assigned as an implementation executor.
- **Single-Writer Sequencing**: Exactly ONE writer per active branch/worktree. Sequential implementation; parallel execution permitted only for read-only scouting or isolated tests.

---

## Phase 1: Prerequisite & Environment Setup

**Goal**: Prepare isolated worktree, verify baseline, and establish test harness.

- [ ] T001 [Setup] Verify baseline commit SHA and clean working tree
  - **TASK_ID**: T001
  - **EXECUTOR**: ANTIGRAVITY
  - **RISK**: LOW
  - **HOT_CONTEXT**: `tasks/CURRENT_TASK.md`, `AGENTS.md`
  - **REQUIRED_EVIDENCE**: Clean `git status`, correct HEAD SHA

- [ ] T002 [Test-Harness] Create or extend focused test harness
  - **TASK_ID**: T002
  - **EXECUTOR**: ANTIGRAVITY
  - **RISK**: LOW
  - **SYSTEMS/FILES**: `backend/server/src/tests/[feature].test.ts`
  - **REQUIRED_EVIDENCE**: Test file created with failing assertions for new functionality

---

## Phase 2: Core Domain & Data Layer Implementation

**Goal**: Implement database repositories, Worker REST adapter matchers, and backend endpoints.

- [ ] T003 [Data-Layer] Implement repository methods and Worker REST matchers
  - **TASK_ID**: T003
  - **EXECUTOR**: ZCODE
  - **RISK**: HIGH
  - **DEPENDENCIES**: T001, T002
  - **SYSTEMS/FILES**: `backend/server/src/services/dbRepository.ts`, `backend/server/src/services/dbClient.ts`
  - **HOT_CONTEXT**: `docs/DATABASE.md`, `docs/BUSINESS_RULES.md`
  - **BUSINESS_RULE_REFS**: [BR-## / Section]
  - **LIVE_MUTATION**: NO
  - **REQUIRED_EVIDENCE**: Unit tests passing for repository and REST adapter

- [ ] T004 [Backend-API] Mount and harden backend HTTP route handlers
  - **TASK_ID**: T004
  - **EXECUTOR**: ZCODE
  - **RISK**: MEDIUM
  - **DEPENDENCIES**: T003
  - **SYSTEMS/FILES**: `backend/server/src/app.ts`
  - **HOT_CONTEXT**: `docs/codex/KONFRM_MASTER_RULES.md`
  - **BUSINESS_RULE_REFS**: [Rule ID]
  - **REQUIRED_EVIDENCE**: Route handles happy path, boundary validation, and fail-closed 5xx responses

---

## Phase 3: Frontend Integration & State Handling

**Goal**: Connect frontend components to canonical backend endpoints with all 5 UI states.

- [ ] T005 [Frontend] Wire API client and implement 5-state UI handling
  - **TASK_ID**: T005
  - **EXECUTOR**: ZCODE
  - **RISK**: MEDIUM
  - **DEPENDENCIES**: T004
  - **SYSTEMS/FILES**: `[app]/src/components/...`, `[app]/src/services/...`
  - **HOT_CONTEXT**: `DESIGN_SYSTEM/`
  - **REQUIRED_EVIDENCE**: Ideal, empty, loading, error+retry, and unauthorized states functional

---

## Phase 4: Verification, Regression & Quality Gate

**Goal**: Execute full test suite, verify non-regression, and prepare review evidence.

- [ ] T006 [Regression] Run full focused test suite and typechecks
  - **TASK_ID**: T006
  - **EXECUTOR**: ANTIGRAVITY
  - **RISK**: LOW
  - **DEPENDENCIES**: T003, T004, T005
  - **REQUIRED_EVIDENCE**: All test suites passing, 0 TypeScript errors, `git diff --check` clean

- [ ] T007 [Review-Gate] Final exact-head review preparation
  - **TASK_ID**: T007
  - **EXECUTOR**: ANTIGRAVITY
  - **RISK**: LOW
  - **CODEX_GATE**: YES
  - **FOUNDER_DECISION_REQUIRED**: NO
  - **REQUIRED_EVIDENCE**: Exact candidate commit SHA, push to validation branch, CI pass on exact HEAD

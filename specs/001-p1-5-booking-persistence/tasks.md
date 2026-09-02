---
description: "Adaptive task list template for KONFRM feature implementation"
---

# Tasks: P1.5 Booking & Financial Summary Persistence Integrity

**Git Branch**: `pilot/spec-kit-p1-5-dry-run`
**Spec Directory**: `specs/001-p1-5-booking-persistence/`
**Prerequisites**: `spec.md`, `plan.md`
**Macro Roadmap Phase**: PHASE 1 — التدقيق الشامل للبنية التحتية والبيانات الأساسية (Database Backbone & Persistence Integrity)
**Execution Boundary**: P1.5 — Booking and Financial-Summary Persistence Integrity

<!-- Execution Handoff Metadata (populated/frozen at dispatch time, not guessed during drafting) -->
**BASE_MAIN_SHA**: `fb38414d9076f89083bdc680e48e1a0b0329be06` (canonical published main baseline)
**DRY_RUN_HANDOFF_SHA**: `08866866fe1b0f0cd51e0d5dc74268ce43c84fa9` (planning dry run branch starting commit)
**TASK_HANDOFF_SHA**: `DRY_RUN_NOT_DISPATCHED (planning only, no implementation dispatched)`
**WRITER**: `NONE — PLANNING DRY RUN`
**LIVE_MUTATION_AUTHORIZED**: `NO`
**FINAL_REVIEW_REQUIRED**: `YES (publication review gate for future implementation)`

---

## KONFRM Multi-Agent Task Dispatch Guidelines

- **Antigravity (`agy`)**: Assigned to codebase scouting, mechanical setup, long-running verification, focused test harnesses, documentation, and low-complexity edits.
- **ZCode (`zcode`)**: Assigned to heavy implementation tasks: backend routers, database repositories, Worker REST matchers, SQL migrations, complex refactors, and core debugging.
- **Codex (`codex`)**: Reserved strictly for final exact-head candidate review gate; NOT assigned as a routine implementation executor.
- **Single-Writer Sequencing (NON-NEGOTIABLE)**: Exactly ONE writer operates on an active branch/worktree at a time.
- **Minimal Task Sizing**: Minimum number of execution tasks creating safe, verifiable boundaries without ceremony.
- **Predecessor Gate**: P1.4 is an unresolved predecessor dependency; implementation dispatch requires published P1.4 baseline.

---

## Feature Implementation Tasks

- [ ] T001 [Data-Layer] Implement atomic booking and financial-summary repository methods and Worker REST matchers
  - **TASK_ID**: T001
  - **EXECUTOR**: ZCODE
  - **RISK**: HIGH
  - **DEPENDENCIES**: None
  - **SYSTEMS/FILES**: `backend/server/src/services/dbRepository.ts`, `backend/server/src/services/dbClient.ts`
  - **HOT_CONTEXT**: `docs/DATABASE.md § Booking/chat`, `docs/BUSINESS_RULES.md § Booking Lifecycle`
  - **BUSINESS_RULE_REFS**: [MR-12, MR-13]
  - **LIVE_MUTATION**: NO
  - **CODEX_GATE**: NO
  - **FOUNDER_DECISION_REQUIRED**: NO
  - **REQUIRED_EVIDENCE**: Unit tests pass for repository methods and Worker REST matchers with zero synthetic fallbacks

- [ ] T002 [Backend-API] Harden booking creation and calculation route handlers with fail-closed error handling
  - **TASK_ID**: T002
  - **EXECUTOR**: ZCODE
  - **RISK**: MEDIUM
  - **DEPENDENCIES**: T001
  - **SYSTEMS/FILES**: `backend/server/src/app.ts`, `backend/server/src/tests/booking011.test.ts`
  - **HOT_CONTEXT**: `docs/codex/KONFRM_MASTER_RULES.md [MR-12, MR-14]`, `backend/server/src/app.ts:3030-3180`
  - **BUSINESS_RULE_REFS**: [MR-12, MR-14]
  - **LIVE_MUTATION**: NO
  - **CODEX_GATE**: NO
  - **FOUNDER_DECISION_REQUIRED**: NO
  - **REQUIRED_EVIDENCE**: Automated tests pass covering atomic creation, calculation arithmetic, stay length bounds, and 500 fail-closed errors

- [ ] T003 [Verification] Run focused regression suites and prepare review package
  - **TASK_ID**: T003
  - **EXECUTOR**: ANTIGRAVITY
  - **RISK**: LOW
  - **DEPENDENCIES**: T002
  - **SYSTEMS/FILES**: `tasks/CURRENT_TASK.md`
  - **HOT_CONTEXT**: `tasks/CURRENT_TASK.md`
  - **LIVE_MUTATION**: NO
  - **CODEX_GATE**: YES
  - **FOUNDER_DECISION_REQUIRED**: NO
  - **REQUIRED_EVIDENCE**: All focused booking tests pass, `git diff --check` clean, exact candidate commit SHA recorded

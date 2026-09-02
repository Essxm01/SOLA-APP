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
- **Atomicity Gate**: `TRANSACTION_MECHANISM_TO_BE_VERIFIED_AT_IMPLEMENTATION_START`. The Worker may map one database-transactional RPC/function exactly; it must not compose independent REST inserts as a transaction.

---

## Feature Implementation Tasks

- [ ] T001 [Data-Layer] Verify and implement one database-transactional booking-and-financial-summary operation with a narrow Worker RPC mapping
  - **TASK_ID**: T001
  - **EXECUTOR**: ZCODE
  - **RISK**: HIGH
  - **DEPENDENCIES**: None
  - **SYSTEMS/FILES**: `backend/server/src/services/dbRepository.ts`, `backend/server/src/services/dbClient.ts`, additive database RPC/migration only if the implementation-start gate confirms it
  - **HOT_CONTEXT**: `docs/DATABASE.md`, `docs/BUSINESS_RULES.md § Booking lifecycle and availability`, `docs/codex/KONFRM_MASTER_RULES.md [MR-07, MR-08, MR-12, MR-13]`
  - **BUSINESS_RULE_REFS**: [MR-07, MR-08, MR-12, MR-13]
  - **LIVE_MUTATION**: NO
  - **CODEX_GATE**: NO
  - **FOUNDER_DECISION_REQUIRED**: NO
  - **REQUIRED_EVIDENCE**: Unit tests prove one transactionally atomic operation; Worker tests prove one exact RPC mapping and zero synthetic fallbacks. No independent REST booking/summary write pair may report success.

- [ ] T002 [Backend-API] Harden booking creation and calculation route handlers with fail-closed error handling
  - **TASK_ID**: T002
  - **EXECUTOR**: ZCODE
  - **RISK**: MEDIUM
  - **DEPENDENCIES**: T001
  - **SYSTEMS/FILES**: `backend/server/src/app.ts`, `backend/server/src/tests/booking011.test.ts`
  - **HOT_CONTEXT**: `docs/codex/KONFRM_MASTER_RULES.md [MR-07, MR-12, MR-13]`, `backend/server/src/app.ts:3110-3260`
  - **BUSINESS_RULE_REFS**: [MR-07, MR-12, MR-13]
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

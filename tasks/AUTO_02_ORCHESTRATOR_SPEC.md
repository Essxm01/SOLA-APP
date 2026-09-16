# Task Contract: AUTO-02 / AUTO-02R — Neutral Orchestrator Architecture & Agent Adapter Contract

**TASK_ID:** `AUTO-02R`
**ROADMAP_PHASE:** `TOOLING_AUTOMATION`
**STAGE:** `BRIDGE_REVIEW_REVISION`
**BASE_MAIN_SHA:** `04a611eecd587414f2d2e5de1179600259e4a1ca`
**STARTING_HEAD_SHA:** `1d21160cca09766da30146280cf1aacd237c1eb3`
**BRANCH:** `tooling/auto-02-orchestrator-spec`
**CANONICAL_SPECIFICATION:** [`docs/automation/KONFRM_AUTO_ORCHESTRATOR_SPEC.md`](../docs/automation/KONFRM_AUTO_ORCHESTRATOR_SPEC.md)
**GOVERNING_AUTHORITY:** Founder + ChatGPT Strategic Brain

---

## 1. Objective

Define the implementation-ready technical specification, common adapter interfaces, locking protocols, state machine, and failure handling for the **Neutral KONFRM AUTO ORCHESTRATOR**.

This task contract covers both the baseline specification pass (AUTO-02) and the Bridge architecture correction pass (AUTO-02R) prior to any AUTO-03 supervisor implementation.

---

## 2. Canonical Reference

Per KONFRM documentation deduplication rules, all architectural details, TypeScript interface definitions, state machine transition tables, and Architecture Decision Records reside exclusively in the canonical specification:

👉 **[`docs/automation/KONFRM_AUTO_ORCHESTRATOR_SPEC.md`](../docs/automation/KONFRM_AUTO_ORCHESTRATOR_SPEC.md)**

---

## 3. Scope & Deliverables

1. **Canonical Architecture Specification (`docs/automation/KONFRM_AUTO_ORCHESTRATOR_SPEC.md`):**
   - Covers all 13 modular orchestrator subsystems.
   - Restores canonical ADR numbering (ADR-AUTO-001 through ADR-AUTO-008).
   - Records Node.js ESM runtime recommendation as `ADR-AUTO-009 (Proposed, Pending Founder Approval)`.
   - Distinguishes host local discovery (`CURRENT_LOCAL_VERSION`) from engine minimum (`MINIMUM_SUPPORTED_RUNTIME`).
   - Upgrades worktree lock identity to `canonicalGitCommonDir + "\n" + canonicalWorktreeRealpath`.
   - Adds race-safe stale lock recovery with random `lockInstanceId`.
   - Defines explicit `tasks/CURRENT_TASK.md` metadata comparison (`actualBranch === EXPECTED_BRANCH`).
   - Enforces `RAW_PROVIDER_LOGGING = DISABLED_BY_DEFAULT`.
   - Specifies child process environment inheritance allowlisting.
   - Machine-enforces `AGENT_EXECUTION_FINISHED` vs `TASK_VERIFIED` via dual outcomes (`executionOutcome` vs `verificationOutcome`).
   - Standardizes deterministic single-retry semantics (`MAX_AUTOMATIC_TRANSIENT_RETRIES = 1`).
   - Outlines phased delivery roadmap (AUTO-02 through AUTO-10).

2. **Index Routing (`docs/INDEX.md`):**
   - Routes future agents to the automation specification.

3. **Task Contract Record (`tasks/AUTO_02_ORCHESTRATOR_SPEC.md`):**
   - This document.

---

## 4. Non-Goals (Enforced Boundaries)

- **Zero Code Implementation:** No process supervisor, adapter code, or CLI tools implemented in AUTO-02/AUTO-02R.
- **Zero Application Modifications:** No edits to `customer-app/`, `owner-app/`, `admin-app/`, or `backend/`.
- **Zero Infrastructure Changes:** No Supabase schema, migration, or Cloudflare Worker edits.
- **Zero Framework Installs:** No installations of Caveman, Repomix, Spec Kit, gstack, Superpowers, or BMAD.
- **Zero Financial Spending:** No paid API tokens, credits, or subscriptions top-ups.
- **Zero Git Pollution:** Active Phase 5 worktree (`phase5/customer-c2-discovery`) remains completely untouched by AUTO-02/AUTO-02R.
- **Governance File Preservation:** `docs/BRAIN_SYNC_PROTOCOL.md` is **not** modified; held for post-spec Bridge review.

---

## 5. Verification & Acceptance Criteria

- [x] Canonical specification authored with complete TypeScript interface definitions (zero `any`, zero `TBD`).
- [x] Canonical ADR numbering restored (ADR-AUTO-001 through ADR-AUTO-008); runtime proposal tagged as ADR-AUTO-009 (Proposed).
- [x] Canonical worktree lock identity derived from `canonicalGitCommonDir` and `canonicalWorktreeRealpath`.
- [x] Race-safe stale lock recovery protocol specified with unique `lockInstanceId`.
- [x] Explicit CURRENT_TASK comparator defined (`actualBranch === EXPECTED_BRANCH`).
- [x] Security defaults updated: `RAW_PROVIDER_LOGGING = DISABLED_BY_DEFAULT`, prompt exposure reduced, environment allowlisted.
- [x] Dual outcomes (`executionOutcome`, `verificationOutcome`) machine-enforce verification boundary.
- [x] Deterministic single-retry policy specified (`MAX_AUTOMATIC_TRANSIENT_RETRIES = 1`).
- [x] Type verification script compiles cleanly with `0 errors`.
- [x] Active Phase 5 worktree verified unchanged (`UNCHANGED_WITH_PREEXISTING_UNTRACKED_STATE`).

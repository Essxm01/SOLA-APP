# Task Contract: AUTO-02 — Neutral Orchestrator Architecture & Agent Adapter Contract

**TASK_ID:** `AUTO-02`  
**ROADMAP_PHASE:** `TOOLING_AUTOMATION`  
**STAGE:** `SPECIFICATION_COMPLETE`  
**BASE_MAIN_SHA:** `04a611eecd587414f2d2e5de1179600259e4a1ca`  
**BRANCH:** `tooling/auto-02-orchestrator-spec`  
**CANONICAL_SPECIFICATION:** [`docs/automation/KONFRM_AUTO_ORCHESTRATOR_SPEC.md`](../docs/automation/KONFRM_AUTO_ORCHESTRATOR_SPEC.md)  
**GOVERNING_AUTHORITY:** Founder + ChatGPT Strategic Brain  

---

## 1. Objective

Define the implementation-ready technical specification, common adapter interfaces, locking protocols, state machine, and failure handling for the **Neutral KONFRM AUTO ORCHESTRATOR**.

This task establishes the formal contracts required before any orchestrator process code or adapter implementation is written.

---

## 2. Canonical Reference

Per KONFRM documentation deduplication rules, all architectural details, TypeScript interface definitions, state machine transition tables, and Architecture Decision Records reside exclusively in the canonical specification:

👉 **[`docs/automation/KONFRM_AUTO_ORCHESTRATOR_SPEC.md`](../docs/automation/KONFRM_AUTO_ORCHESTRATOR_SPEC.md)**

---

## 3. Scope & Deliverables

1. **Canonical Architecture Specification:**
   - Authored at [`docs/automation/KONFRM_AUTO_ORCHESTRATOR_SPEC.md`](../docs/automation/KONFRM_AUTO_ORCHESTRATOR_SPEC.md).
   - Covers all 13 modular orchestrator subsystems.
   - Formalizes the `Option B` runtime decision (Dependency-Free Node.js ESM).
   - Establishes the 5-stage dynamic agent discovery precedence.
   - Defines complete TypeScript contracts for `AgentAdapter`, `AgentTask`, `AgentResult`, `AgentCapabilities`, and `QuotaSnapshot`.
   - Formulates the worktree-aware external locking model in `%LOCALAPPDATA%\KONFRM\orchestrator\locks\`.
   - Formulates the deterministic finite state machine (9 lifecycle states, 7 terminal failure states).
   - Incorporates ADR-AUTO-001 through ADR-AUTO-008.
   - Formulates the fail-closed resolution for `AUTO_GAP_001` (`PREFLIGHT_BLOCKED_CONTEXT_MISMATCH`).
   - Outlines the phased delivery sequence (AUTO-02 through AUTO-10).

2. **Index Routing:**
   - Updated [`docs/INDEX.md`](../docs/INDEX.md) to route future agents to the automation specification.

3. **Task Contract Record:**
   - This document (`tasks/AUTO_02_ORCHESTRATOR_SPEC.md`).

---

## 4. Non-Goals (Enforced Boundaries)

- **Zero Code Implementation:** No process supervisor, adapter code, or CLI tools implemented in AUTO-02.
- **Zero Application Modifications:** No edits to `customer-app/`, `owner-app/`, `admin-app/`, or `backend/`.
- **Zero Infrastructure Changes:** No Supabase schema, migration, or Cloudflare Worker edits.
- **Zero Framework Installs:** No installations of Caveman, Repomix, Spec Kit, gstack, Superpowers, or BMAD.
- **Zero Financial Spending:** No paid API tokens, credits, or subscriptions top-ups.
- **Zero Git Pollution:** Active Phase 5 worktree (`phase5/customer-c2-discovery`) remains completely untouched.
- **Governance File Preservation:** `docs/BRAIN_SYNC_PROTOCOL.md` is **not** modified during AUTO-02; held for post-spec Bridge review.

---

## 5. Verification & Acceptance Criteria

- [x] Canonical specification authored with complete TypeScript interface definitions (zero `any`, zero `TBD`).
- [x] External worktree-aware lock semantics fully documented with atomic acquisition (`wx`) and PID start-time validation.
- [x] Quota confidence model explicitly incorporates `PROGRAMMATIC_QUOTA_ACCESS = NOT_FOUND` and `UNKNOWN` default.
- [x] Process security model classified as `MEDIUM` with prompt stdin transport and log redaction requirements.
- [x] `AUTO_GAP_001` documented with fail-closed preflight semantics (`PREFLIGHT_BLOCKED_CONTEXT_MISMATCH`).
- [x] ADR-AUTO-001 through ADR-AUTO-008 fully articulated.
- [x] Clean Git working tree on `tooling/auto-02-orchestrator-spec` with zero application code changes.

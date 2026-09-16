# Task Contract: AUTO-02 / AUTO-02R / AUTO-02R2 — Neutral Orchestrator Architecture & Agent Adapter Contract

**TASK_ID:** `AUTO-02R2`
**ROADMAP_PHASE:** `TOOLING_AUTOMATION`
**STAGE:** `FINAL_BRIDGE_ARCHITECTURE_HARDENING`
**BASE_MAIN_SHA:** `04a611eecd587414f2d2e5de1179600259e4a1ca`
**STARTING_HEAD_SHA:** `35d6bc870524e8ab310371513ee50fef852a8d9b`
**BRANCH:** `tooling/auto-02-orchestrator-spec`
**CANONICAL_SPECIFICATION:** [`docs/automation/KONFRM_AUTO_ORCHESTRATOR_SPEC.md`](../docs/automation/KONFRM_AUTO_ORCHESTRATOR_SPEC.md)
**GOVERNING_AUTHORITY:** Founder + ChatGPT Strategic Brain

---

## 1. Objective

Define the implementation-ready technical specification, common adapter interfaces, locking protocols, state machine, and failure handling for the **Neutral KONFRM AUTO ORCHESTRATOR**.

This task contract covers:
1. Baseline specification pass (`AUTO-02`)
2. Initial Bridge architecture revision pass (`AUTO-02R`)
3. Final Bridge architecture hardening pass (`AUTO-02R2`) resolving findings C13 through C28 prior to any AUTO-03 supervisor implementation.

---

## 2. Canonical Reference

Per KONFRM documentation deduplication rules, all architectural details, TypeScript interface definitions, state machine transition tables, and Architecture Decision Records reside exclusively in the canonical specification:

👉 **[`docs/automation/KONFRM_AUTO_ORCHESTRATOR_SPEC.md`](../docs/automation/KONFRM_AUTO_ORCHESTRATOR_SPEC.md)**

---

## 3. Scope & Deliverables

1. **Canonical Architecture Specification (`docs/automation/KONFRM_AUTO_ORCHESTRATOR_SPEC.md` v1.2.0):**
   - Covers all 13 modular orchestrator subsystems.
   - Restores and hardens canonical ADRs (ADR-AUTO-001 through ADR-AUTO-008).
   - **ADR-AUTO-002 (GUI Last Resort):** Explicitly specifies `V1: GUI_AUTOMATION = DISABLED`; native interfaces (CLI, SDK, IPC, wrapper) have priority; GUI automation is a genuine last resort requiring explicit Founder approval and a dedicated ADR.
   - **ADR-AUTO-009 (Orchestrator Runtime):** Updated to reflect Node.js lifecycle realities (Node 20 and 25 are EOL; Node 22 and 24 are supported LTS; preferred is Node 24.x LTS); preflight rejects EOL Node in production; status remains `PROPOSED_PENDING_FOUNDER_APPROVAL`.
   - **C13 (Lock Lifetime):** For `WRITE` tasks, the writer lock is acquired before mutation and held continuously across `RUNNING` -> `COLLECTING` -> `VERIFYING` until the terminal result and evidence snapshot are finalized.
   - **C14 (Non-Destructive Mutation Handling):** On forbidden file mutation, the orchestrator freezes the worktree, retains the lock, captures exact Git diff/status, transitions to `FORBIDDEN_MUTATION_BLOCKED`, and strictly forbids destructive auto-reverts (`git restore`, `git reset`, `git clean`).
   - **C15 (Mutation-Aware Retry & Fallback):** Mandatory `POST_FAILURE_MUTATION_CHECK`. A single transient retry is permitted only if proven zero mutation occurred; any mutation or unknown state transitions to `PARTIAL_MUTATION_BLOCKED` with no automatic retry or fallback.
   - **C16 (Antigravity Invocation):** Adheres strictly to verified local capabilities (`-p`, `--output-format json`, `--add-dir`, `--conversation`, `--continue`). Distinguishes verified provider transport from desired transport via `AntigravityCapabilityProfile`.
   - **C17 (Z Code app-server Reclassification):** Classified as `FUTURE_CAPABILITY_CANDIDATE`. V1 fallback relies solely on bundled CLI rediscovery or transitions to `CAPABILITY_MISSING`.
   - **C18 (Windows Process Cancellation):** Provider/platform-neutral cancellation contract with `CancellationMethod` enum. On Windows, uses graceful provider mechanisms if verified, standard termination, or descendant process-tree termination via `taskkill.exe /T /F /PID <pid>`.
   - **C19 (Null Exit Code):** `exitCode: number | null` across `AgentResult` and `AgentRunStatus` to accurately model killed or signal-terminated processes.
   - **C20 (Optional Raw Log Path):** In `AgentRun`: `eventLogPath: string`, `rawLogPath: string | null` when raw logging is disabled.
   - **C21 (Writer Lock Invariant):** Preflight strictly validates that `mode === "WRITE"` requires and enforces `requiresWriterLock: true`.
   - **C24 (Windows OS Helpers):** Zero third-party npm packages, with explicit permission for the orchestrator to invoke trusted built-in OS utilities (`icacls.exe`, `taskkill.exe`, PowerShell, `git.exe`) with sanitized arguments.
   - **C25 (Git Common Dir Resolution):** Canonical discovery via `git -C <worktree> rev-parse --path-format=absolute --git-common-dir`, resolved via `path.resolve(worktreeRoot, rawDir)` and `fs.realpathSync.native()`.
   - **C26 (Full Lock Hash):** Worktree lock key uses the full 64-character lowercase SHA-256 hex digest of `canonicalGitCommonDir + "\n" + canonicalWorktreeRealpath`.
   - **C27 (Prompt Persistence):** Run descriptors (`run_<runId>.json`) record prompt metadata (`promptSource`, `promptSha256`, `promptByteLength`) rather than serializing the full prompt body by default.
   - **C28 (Partial Run Recovery):** Supervisor freezes worktree and preserves forensic evidence on partial write failure; automatic destructive cleanup is strictly prohibited.

2. **Index Routing (`docs/INDEX.md`):**
   - Routes future agents to the automation specification.

3. **Task Contract Record (`tasks/AUTO_02_ORCHESTRATOR_SPEC.md`):**
   - This document.

---

## 4. Non-Goals (Enforced Boundaries)

- **Zero Code Implementation:** No process supervisor, adapter code, or CLI tools implemented in AUTO-02 / AUTO-02R / AUTO-02R2.
- **Zero Node Installation/Upgrade:** Host Node runtime is not modified during AUTO-02R2; ADR-AUTO-009 remains `PROPOSED_PENDING_FOUNDER_APPROVAL`.
- **Zero Application Modifications:** No edits to `customer-app/`, `owner-app/`, `admin-app/`, or `backend/`.
- **Zero Infrastructure Changes:** No Supabase schema, migration, or Cloudflare Worker edits.
- **Zero Framework Installs:** No installations of Caveman, Repomix, Spec Kit, gstack, Superpowers, or BMAD.
- **Zero Financial Spending:** No paid API tokens, credits, or subscriptions top-ups.
- **Zero Git Pollution:** Active Phase 5 worktree (`phase5/customer-c2-discovery`) remains completely untouched by AUTO-02 / AUTO-02R / AUTO-02R2.
- **Governance File Preservation:** `docs/BRAIN_SYNC_PROTOCOL.md` is **not** modified; held for post-spec Bridge review.

---

## 5. Verification & Acceptance Criteria

- [x] Canonical specification authored with complete TypeScript interface definitions (zero `any`, zero `TBD`).
- [x] Canonical ADR numbering restored (ADR-AUTO-001 through ADR-AUTO-008); ADR-AUTO-009 updated for Node EOL lifecycle and tagged `PROPOSED_PENDING_FOUNDER_APPROVAL`.
- [x] ADR-AUTO-002 specifies `V1: GUI_AUTOMATION = DISABLED` as genuine last resort requiring Founder approval and dedicated ADR.
- [x] C13 lock lifetime invariant implemented: held through `RUNNING` -> `COLLECTING` -> `VERIFYING` until terminal snapshot.
- [x] C14 non-destructive mutation handling specified: worktree frozen, evidence captured, no auto `git restore`/`git clean`.
- [x] C15 mutation-aware retry policy specified: `POST_FAILURE_MUTATION_CHECK` allows 1 retry only on proven zero mutation; any mutation yields `PARTIAL_MUTATION_BLOCKED`.
- [x] C16 Antigravity invocation adheres to verified CLI capabilities (`-p`, `--output-format json`, `--add-dir`, `--conversation`, `--continue`).
- [x] C17 Z Code `app-server` reclassified as `FUTURE_CAPABILITY_CANDIDATE`.
- [x] C18 Windows cancellation semantics modeled via `CancellationMethod` enum and `taskkill.exe /T /F`.
- [x] C19 `exitCode: number | null` specified across result interfaces.
- [x] C20 `rawLogPath: string | null` specified in `AgentRun`.
- [x] C21 Preflight rejects `mode === "WRITE"` with `requiresWriterLock: false`.
- [x] C24 Zero npm dependencies with explicit allowance of trusted OS utilities (`icacls.exe`, `taskkill.exe`, PowerShell, `git.exe`).
- [x] C25 Canonical Git common dir resolution specified via `git -C <worktree> rev-parse --path-format=absolute --git-common-dir` with `path.resolve(worktreeRoot, rawDir)`.
- [x] C26 Full 64-character SHA-256 lock key specified.
- [x] C27 Run descriptors store prompt metadata (`promptSha256`, `promptByteLength`), omitting full prompt bodies by default.
- [x] C28 Supervisor freezes worktree and preserves evidence on partial write failure; no destructive auto-clean.
- [x] Type verification script compiles cleanly with `0 errors`.
- [x] Active Phase 5 worktree verified unchanged (`UNCHANGED_WITH_PREEXISTING_UNTRACKED_STATE`).

# Task Contract: AUTO-03 — Core Process Supervisor, Lock Engine & Mock Execution Harness

**TASK_ID:** `AUTO-03`
**ROADMAP_PHASE:** `TOOLING_AUTOMATION`
**STAGE:** `CORE_SUPERVISOR_IMPLEMENTATION`
**EXPECTED_BRANCH:** `tooling/auto-03-core-supervisor`
**BASE_SHA:** `dadf93c944ea5f2611da88b6f97974a938386209`
**CANONICAL_SPEC:** [`docs/automation/KONFRM_AUTO_ORCHESTRATOR_SPEC.md`](../docs/automation/KONFRM_AUTO_ORCHESTRATOR_SPEC.md)
**GOVERNING_AUTHORITY:** Founder + ChatGPT Strategic Brain
**RUNTIME:** `Dependency-Free Node.js ESM`
**PREFERRED_NODE:** `24.x LTS`
**REAL_AGENTS_ALLOWED:** `NO`
**PAID_API_ALLOWED:** `NO`

---

## 1. Objective

Implement the provider-neutral foundation of the **KONFRM AUTO ORCHESTRATOR**:
- Runtime policy evaluation and EOL guard
- Isolated runtime state path resolution
- Canonical worktree identity calculation (SHA-256)
- Atomic external single-writer lock engine with stale lock recovery
- Git mutation snapshotting and non-destructive failure classification
- Secure run descriptor and evidence metadata storage (zero raw prompt persistence)
- Process supervisor with structured argv execution and Windows process tree cancellation
- Mock agent fixture and adapter for deterministic laboratory execution
- Core runner managing the complete execution lifecycle with lock held through verification
- Comprehensive automated test suite using `node:test` and `node:assert/strict`

---

## 2. Canonical Specification Reference

All implementations adhere strictly to:
👉 **[`docs/automation/KONFRM_AUTO_ORCHESTRATOR_SPEC.md`](../docs/automation/KONFRM_AUTO_ORCHESTRATOR_SPEC.md)**

---

## 3. Scope & Deliverables

1. **Local Runtime Configuration:**
   - `orchestrator/.nvmrc` (declaring Node `24`)

2. **Core Modules (`orchestrator/src/`):**
   - `runtime-policy.mjs`: Node LTS version assessment and real-agent fail-closed guard
   - `runtime-paths.mjs`: Safe path resolution for state hierarchy (locks, runs, events, logs)
   - `worktree-identity.mjs`: Deterministic 64-char SHA-256 worktree lock key computation
   - `lock-manager.mjs`: Atomic `wx` locking, heartbeat, owner verification, and quarantine recovery
   - `mutation-snapshot.mjs`: Pre/post Git status/diff capture and mutation classification
   - `run-store.mjs`: Run descriptor persistence with prompt metadata (SHA-256, length) only
   - `process-supervisor.mjs`: Structured argv child process management and Windows tree termination
   - `mock-adapter.mjs`: Provider-neutral adapter for test fixtures
   - `core-runner.mjs`: Supervised execution workflow holding write lock through verification

3. **Deterministic Mock Fixture (`orchestrator/fixtures/`):**
   - `mock-agent.mjs`: CLI-driven test agent supporting success, failure, hang, and mutation scenarios

4. **Automated Test Suite (`orchestrator/test/`):**
   - `runtime-policy.test.mjs`
   - `runtime-paths.test.mjs`
   - `worktree-identity.test.mjs`
   - `lock-manager.test.mjs`
   - `mutation-snapshot.test.mjs`
   - `run-store.test.mjs`
   - `process-supervisor.test.mjs`
   - `core-runner.test.mjs`

---

## 4. Enforced Boundaries & Non-Goals

- **Zero Real Agent Invocation:** No Codex, Antigravity (`agy`), or Z Code (`zcode`) executions.
- **Zero Paid API Usage:** Zero model quota or financial spend.
- **Zero Third-Party Runtime NPM Dependencies:** Node standard library only.
- **Zero Application Modifications:** Product directories (`customer-app/`, `owner-app/`, `admin-app/`, `backend/`) remain untouched.
- **Zero Phase 5 Mutation:** Active Phase 5 worktree remains completely untouched (`UNCHANGED_WITH_PREEXISTING_UNTRACKED_STATE`).
- **No Destructive Git Repairs:** No `git restore`, `git reset`, or `git clean` executed by orchestrator on failure.

---

## 5. Acceptance Criteria

- [ ] All 10 required modules and fixtures implemented with clean Node syntax (`node --check`).
- [ ] Complete test suite passes via `node --test`.
- [ ] Strict TDD followed with recorded RED and GREEN evidence.
- [ ] Lock lifetime verified held continuously through `RUNNING` -> `COLLECTING` -> `VERIFYING`.
- [ ] Non-destructive mutation handling verified: forbidden mutations freeze worktree and retain evidence.
- [ ] Partial write failure verified: transitions to `PARTIAL_MUTATION_BLOCKED` with no retry/fallback.
- [ ] Zero-mutation failure verified: permits single transient retry.
- [ ] Raw prompt verified absent from serialized run descriptors.
- [ ] Active Phase 5 worktree verified identical before and after.

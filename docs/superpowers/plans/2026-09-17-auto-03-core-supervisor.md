# AUTO-03 Core Supervisor Implementation Plan

> **For agentic workers:** Execute this plan task-by-task using strict TDD. Do not run real AI agents. Do not modify KONFRM product code.

**Goal:** Build and verify the provider-neutral core process supervisor, writer lock engine, runtime policy, mutation detection, and mock execution harness for KONFRM AUTO ORCHESTRATOR.

**Architecture:** Dependency-free Node.js ESM modules with Node built-in test runner and OS/Git helpers invoked through structured argument arrays. All integration tests use temporary synthetic repositories and mock child processes.

**Tech Stack:** Node.js ESM, node:test, node:assert, node:child_process, node:fs, node:path, node:crypto, Git CLI, Windows built-in utilities where required.

**Spec:** docs/automation/KONFRM_AUTO_ORCHESTRATOR_SPEC.md

---

## Task Breakdown & Strict TDD Mapping

### Phase 1: Foundation & Path Resolution

#### Task 1: Runtime Policy Module
- **Target File:** `orchestrator/src/runtime-policy.mjs`
- **Test File:** `orchestrator/test/runtime-policy.test.mjs`
- **Specification:** ADR-AUTO-009 & Section 12. Pure evaluation API assessing Node runtime versions.
- **Behaviors to Verify:**
  - `RUNTIME-01`: Node 24.x assessed as `SUPPORTED_LTS`
  - `RUNTIME-02`: Node 22.x assessed as `SUPPORTED_LTS`
  - `RUNTIME-03`: Node 25.x assessed as `EOL_UNSUPPORTED_FOR_REAL_AGENTS`
  - `RUNTIME-04`: Node 20.x assessed as `EOL_UNSUPPORTED_FOR_REAL_AGENTS`
  - `RUNTIME-05`: Unknown / unparsable version assessed as `UNKNOWN_FAIL_CLOSED`
  - `assertRuntimeAllowsRealAgentExecution()` throws `PREFLIGHT_BLOCKED_EOL_RUNTIME` for EOL or unknown runtimes, passes for supported LTS.
- **TDD Steps:**
  1. Write failing tests in `orchestrator/test/runtime-policy.test.mjs`.
  2. Execute `node --test orchestrator/test/runtime-policy.test.mjs` (RED).
  3. Implement minimal logic in `orchestrator/src/runtime-policy.mjs` (GREEN).
  4. Refactor if needed and re-run tests.

#### Task 2: Runtime Paths Module
- **Target File:** `orchestrator/src/runtime-paths.mjs`
- **Test File:** `orchestrator/test/runtime-paths.test.mjs`
- **Specification:** Section 13 & Section 20. State directory resolution with isolation support.
- **Behaviors to Verify:**
  - Production default resolves under `%LOCALAPPDATA%\KONFRM\orchestrator\`.
  - All subdirectories resolved: `config`, `locks`, `locks/quarantine`, `runs`, `events`, `logs`, `capabilities`, `cache`.
  - Injected root allows tests to run completely inside temporary isolated directories without touching `%LOCALAPPDATA%`.
  - Directory initialization utility `ensureRuntimeDirectories(root)` creates all required folders.
- **TDD Steps:**
  1. Write failing tests in `orchestrator/test/runtime-paths.test.mjs`.
  2. Execute `node --test orchestrator/test/runtime-paths.test.mjs` (RED).
  3. Implement `orchestrator/src/runtime-paths.mjs` (GREEN).
  4. Refactor and verify.

---

### Phase 2: Worktree Identity & Atomic Lock Engine

#### Task 3: Worktree Identity Module
- **Target File:** `orchestrator/src/worktree-identity.mjs`
- **Test File:** `orchestrator/test/worktree-identity.test.mjs`
- **Specification:** Section 13.1, C25, C26.
- **Behaviors to Verify:**
  - Resolves `canonicalWorktreeRealpath` via `fs.realpathSync.native(path.resolve(worktreeRoot))`.
  - Invokes `git -C <worktreeRoot> rev-parse --path-format=absolute --git-common-dir` using structured arguments (`execFile`, `shell: false`).
  - Resolves `canonicalGitCommonDir` via `path.resolve(worktreeRoot, rawDir)` and `fs.realpathSync.native()`.
  - Builds `LOCK_ID_INPUT = canonicalGitCommonDir + "\n" + canonicalWorktreeRealpath`.
  - Computes full 64-character lowercase SHA-256 hex digest for `lockKey`.
  - Resolves lock file path `lock_<lockKey>.json`.
- **TDD Steps:**
  1. Write failing tests in `orchestrator/test/worktree-identity.test.mjs` targeting a temporary synthetic git worktree.
  2. Execute `node --test orchestrator/test/worktree-identity.test.mjs` (RED).
  3. Implement `orchestrator/src/worktree-identity.mjs` (GREEN).
  4. Refactor and verify.

#### Task 4: Writer Lock Engine
- **Target File:** `orchestrator/src/lock-manager.mjs`
- **Test File:** `orchestrator/test/lock-manager.test.mjs`
- **Specification:** Section 13, Section 15, Section 16, C4, C5, C13, C26.
- **Behaviors to Verify:**
  - `LOCK-01`: First writer acquires exclusive lock using atomic `wx` flag with unique random `lockInstanceId`.
  - `LOCK-02`: Second writer receives lock contention (`contention: true`, `acquired: false`) while lock is held.
  - `LOCK-03`: Owner-only release: release verifies `lockInstanceId` before unlink; cannot release another process's lock.
  - `LOCK-04`: Dead lock recovered: if lock owner process is confirmed dead, atomic rename to quarantine folder succeeds and lock is safely reacquired.
  - `LOCK-05`: Race-changed lock not reclaimed: if lock metadata changes between stale check and reclaim, reclaim aborts (`RECLAIM_ABORTED_LOCK_CHANGED`) without deleting newer lock.
  - `LOCK-06`: Heartbeat refresh updates `heartbeatAt` without replacing `lockInstanceId`.
- **TDD Steps:**
  1. Write failing tests in `orchestrator/test/lock-manager.test.mjs`.
  2. Execute `node --test orchestrator/test/lock-manager.test.mjs` (RED).
  3. Implement `orchestrator/src/lock-manager.mjs` (GREEN).
  4. Refactor and verify.

---

### Phase 3: Forensic State, Mutation Snapshots & Run Metadata

#### Task 5: Mutation Snapshot Module
- **Target File:** `orchestrator/src/mutation-snapshot.mjs`
- **Test File:** `orchestrator/test/mutation-snapshot.test.mjs`
- **Specification:** Section 17, C14, C15, C28.
- **Behaviors to Verify:**
  - `GIT-01`: Captures Git snapshot (`branch`, `HEAD`, tracked status, untracked status, changed files) using `git status --porcelain=v1 -uall` and `git diff`.
  - `GIT-02`: Classifies `ZERO_MUTATION` when worktree before and after are identical.
  - `GIT-03`: Classifies `MUTATED` when tracked or untracked changes exist, listing all changed paths.
  - Classifies `UNKNOWN` if Git execution errors or baseline cannot be determined.
  - Non-destructive: Strictly never runs `git restore`, `git reset`, or `git clean`.
- **TDD Steps:**
  1. Write failing tests in `orchestrator/test/mutation-snapshot.test.mjs` using synthetic temp Git repos.
  2. Execute `node --test orchestrator/test/mutation-snapshot.test.mjs` (RED).
  3. Implement `orchestrator/src/mutation-snapshot.mjs` (GREEN).
  4. Refactor and verify.

#### Task 6: Run Store Module
- **Target File:** `orchestrator/src/run-store.mjs`
- **Test File:** `orchestrator/test/run-store.test.mjs`
- **Specification:** Section 18, Section 19.4, C20, C27.
- **Behaviors to Verify:**
  - `RUN-01`: Serializes run descriptor `runs/run_<runId>.json` recording metadata only: `runId`, `taskId`, `agent`, `mode`, `promptSource`, `promptSha256`, `promptByteLength`, `worktreeRoot`, `startedAt`, `state`.
  - Raw prompt text passed into descriptor creation is hashed and strictly discarded from serialized representation.
  - `RUN-02`: Raw logging defaults to disabled (`rawLogPath: null`, `rawLogSha256: null`).
  - Layer 1 audit event writer saves sanitized audit events under `events/event_<runId>.json`.
- **TDD Steps:**
  1. Write failing tests in `orchestrator/test/run-store.test.mjs`.
  2. Execute `node --test orchestrator/test/run-store.test.mjs` (RED).
  3. Implement `orchestrator/src/run-store.mjs` (GREEN).
  4. Refactor and verify.

---

### Phase 4: Process Supervision & Laboratory Test Fixture

#### Task 7: Process Supervisor Module
- **Target File:** `orchestrator/src/process-supervisor.mjs`
- **Test File:** `orchestrator/test/process-supervisor.test.mjs`
- **Specification:** Section 19, Section 20, C18, C19.
- **Behaviors to Verify:**
  - `PROC-01`: Spawns child process with `shell: false`, structured argv, cwd control.
  - Captures stdout and stderr in bounded memory buffers.
  - `PROC-02`: Captures non-zero exit codes accurately.
  - `PROC-03`: Handles process hangs via timeout abort; executes process termination.
  - `PROC-04`: Supports `exitCode: number | null` when killed.
  - On Windows, uses graceful request first, falling back to process tree termination via `taskkill.exe /T /F /PID <pid>` invoked via `execFile` with structured arguments.
  - Records `CancellationMethod` in cancellation result.
- **TDD Steps:**
  1. Write failing tests in `orchestrator/test/process-supervisor.test.mjs`.
  2. Execute `node --test orchestrator/test/process-supervisor.test.mjs` (RED).
  3. Implement `orchestrator/src/process-supervisor.mjs` (GREEN).
  4. Refactor and verify.

#### Task 8: Mock Agent Fixture & Adapter
- **Fixture File:** `orchestrator/fixtures/mock-agent.mjs`
- **Adapter File:** `orchestrator/src/mock-adapter.mjs`
- **Specification:** Section 21 & Section 22.
- **Behaviors to Verify:**
  - `mock-agent.mjs` parses `--scenario` (`success`, `fail`, `hang`, `write-allowed`, `write-forbidden`, `write-then-fail`, `write-then-hang`, `malformed-output`), `--worktree`, `--target`, `--delay-ms`.
  - Outputs deterministic JSON stdout.
  - Zero external dependencies, no real AI invocation.
  - `mock-adapter.mjs` implements `startTask`, `status`, `cancel`, `collectResult` against `mock-agent.mjs`.
- **TDD Steps:**
  1. Create fixture and write unit test for adapter.
  2. Verify scenarios execute deterministically.

---

### Phase 5: Core Runner & Safety Integration Tests

#### Task 9: Core Runner Module
- **Target File:** `orchestrator/src/core-runner.mjs`
- **Test File:** `orchestrator/test/core-runner.test.mjs`
- **Specification:** Section 23 through Section 32, C13, C14, C15, C21, C28.
- **Behaviors to Verify:**
  - Pre-run Git snapshot captured.
  - Preflight validates `mode === "WRITE"` enforces `requiresWriterLock: true`.
  - Writer lock acquired prior to execution.
  - Run descriptor initialized without raw prompt.
  - Process supervised through mock adapter.
  - Post-run Git snapshot captured and mutation classified.
  - Results collected while writer lock is retained.
  - Independent verification gate executed while writer lock is retained.
  - Terminal result and evidence snapshot finalized.
  - Writer lock released only after terminal evidence snapshot is written.
- **Critical Safety Integration Tests:**
  - `CORE-01`: Success scenario reaches verified completion (`executionOutcome: PROCESS_COMPLETED`, `verificationOutcome: VERIFIED_PASSED`, `status: SUCCESS`).
  - `CORE-02` (Forbidden Mutation): Mock writes to forbidden file. Detected as forbidden mutation. Status becomes `FORBIDDEN_MUTATION_BLOCKED`. Forbidden file remains modified in worktree (no auto-clean). No retry, no fallback.
  - `CORE-03` (Partial Mutation): Mock writes file then fails or hangs. Post-failure check classifies `MUTATED`. Status becomes `PARTIAL_MUTATION_BLOCKED`. Automatic retry and fallback are disabled. File preserved.
  - `CORE-04` (Zero-Mutation Retry): Mock fails transiently with zero file mutation. Classified as `ZERO_MUTATION`. Eligible for single retry (`retryEligible: true`), capped at `MAX_AUTOMATIC_TRANSIENT_RETRIES = 1`.
  - `CORE-05` (Mandatory Lock-Lifetime Integration Test):
    1. Writer A acquires worktree lock.
    2. Mock writer A finishes execution (`AGENT_EXECUTION_FINISHED`).
    3. Verification gate pauses.
    4. During verification, Writer B attempts lock acquisition.
    5. Writer B receives lock contention (`contention: true`).
    6. Verification gate finishes (`TASK_VERIFIED`).
    7. Terminal evidence written.
    8. Writer A lock released.
    9. Writer B can then acquire.
- **TDD Steps:**
  1. Write failing integration tests in `orchestrator/test/core-runner.test.mjs`.
  2. Execute `node --test orchestrator/test/core-runner.test.mjs` (RED).
  3. Implement `orchestrator/src/core-runner.mjs` (GREEN).
  4. Refactor and verify.

---

## Verification & Acceptance Gate
1. Syntax check across all modules: `node --check <file>` for every `.mjs`.
2. Full test suite execution: `node --test orchestrator/test/*.test.mjs`.
3. Check whitespace: `git diff --check`.
4. Phase 5 worktree regression verification.
## AUTO-03R Safety Hardening Addendum

### Task 10: Preflight Validation Engine (C29, C45)
- **Target File:** `orchestrator/src/preflight-validator.mjs`
- **Test File:** `orchestrator/test/preflight-validator.test.mjs`
- **Specification:** Section 12, C6, C21, C23, C29, C45.
- **Behaviors to Verify:**
  - `PREFLIGHT-01`: Valid task contract with matching branch, matching HEAD, and matching adapter passes validation.
  - `PREFLIGHT-02`: Branch mismatch between worktree and `expectedBranch` throws `PREFLIGHT_BLOCKED_CONTEXT_MISMATCH`.
  - `PREFLIGHT-03`: HEAD mismatch throws `PREFLIGHT_BLOCKED_HEAD_MISMATCH`.
  - `PREFLIGHT-04`: Missing metadata (`TASK_ID`, `EXPECTED_BRANCH`, `BASE_SHA`, `STAGE`) throws `PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT`.
  - `PREFLIGHT-05`: Task agent and adapter agent mismatch throws `PREFLIGHT_BLOCKED_ADAPTER_MISMATCH`.
  - Enforces `mode === "WRITE"` requires `requiresWriterLock: true` (`PREFLIGHT_BLOCKED_INVALID_TASK_CONTRACT`).
  - Enforces Node runtime check for real agents (`PREFLIGHT_BLOCKED_EOL_RUNTIME`).

### Task 11: Content-Sensitive Mutation Detection & Immutability (C30, C31, C34, C46)
- **Target File:** `orchestrator/src/mutation-snapshot.mjs`
- **Test File:** `orchestrator/test/mutation-snapshot.test.mjs`
- **Specification:** Section 17, C14, C15, C28, C30, C31, C34, C46.
- **Behaviors to Verify:**
  - Computes content fingerprints for tracked unstaged changes (`git diff --binary`), staged changes (`git diff --cached --binary`), and untracked files (relative path + SHA-256 of file contents).
  - `MUT-05`: Pre-existing dirty tracked file changed again detected as `MUTATED`.
  - `MUT-06`: Pre-existing untracked file changed content detected as `MUTATED`.
  - `MUT-07`: Staged content changed detected as `MUTATED`.
  - `MUT-08`: Unknown snapshot or Git error fails closed with `UNKNOWN`.
  - `READONLY-01`: Clean READ_ONLY and REVIEW executions succeed without mutation.
  - `READONLY-02`: Any tracked file mutation during READ_ONLY or REVIEW immediately yields `READ_ONLY_MUTATION_BLOCKED` (`retryEligible: false`, `fallbackEligible: false`, file preserved).
  - `READONLY-03`: Any untracked file mutation during READ_ONLY or REVIEW yields `READ_ONLY_MUTATION_BLOCKED`.
  - `CORE-11`: Any unexpected change to branch or HEAD yields `CONTEXT_MISMATCH` (fail closed, no retry).

### Task 12: Write Boundaries & Allowed Paths Enforcement (C33)
- **Target File:** `orchestrator/src/boundary-validator.mjs` (or integrated in core-runner)
- **Test File:** `orchestrator/test/boundary-validator.test.mjs`
- **Specification:** Section 9, C33.
- **Behaviors to Verify:**
  - Canonical path normalization (slashes, casing on Windows).
  - Rejects directory traversal (`../`).
  - Directory scopes strictly match children (e.g. `customer-app/src/` allows `customer-app/src/a.ts`, but rejects prefix collision `customer-app/src2/a.ts`).
  - `BOUNDARY-01`: Mutation outside `allowedWritePaths` transitions to `FORBIDDEN_MUTATION_BLOCKED`.
  - `BOUNDARY-02`: Directory child path is allowed when parent dir is in `allowedWritePaths`.
  - `BOUNDARY-03`: Prefix collision path is blocked.
  - `BOUNDARY-04`: Path traversal `../` escape is blocked.
  - Empty `allowedWritePaths` for WRITE mode fails closed unless unrestricted sandbox flag is declared.

### Task 13: Lock Engine Hardening: Baseline Sequencing, Real Process StartTime, and True Race Safety (C32, C38, C39)
- **Target File:** `orchestrator/src/lock-manager.mjs`, `orchestrator/src/core-runner.mjs`
- **Test File:** `orchestrator/test/lock-manager.test.mjs`
- **Specification:** Section 13, C32, C38, C39.
- **Behaviors to Verify:**
  - C32: For WRITE tasks, writer lock acquisition precedes execution baseline snapshot capture.
  - `LOCK-07`: Real process creation time (`ownerStartTime`) retrieved via structured OS query or injectable provider; stored in lock metadata.
  - `LOCK-08`: PID recycled with mismatched `ownerStartTime` is classified as dead owner and reclaimable.
  - `LOCK-09`: Active PID with matching `ownerStartTime` is classified as live owner and not reclaimable.
  - `LOCK-10`: True reclaim race simulation: Injectable hook simulates another process acquiring a new lock instance between stale re-read and rename. Reclaim aborts (`RECLAIM_ABORTED_LOCK_CHANGED`) without deleting the new lock.

### Task 14: Process Supervisor Hardening: Async Termination, Tree Handling, Environment Isolation (C40, C41, C42)
- **Target File:** `orchestrator/src/process-supervisor.mjs`
- **Test File:** `orchestrator/test/process-supervisor.test.mjs`
- **Specification:** Section 19, C18, C40, C41, C42.
- **Behaviors to Verify:**
  - `PROC-05`: `buildSafeChildEnvironment()` allows only whitelisted system variables (`PATH`, `SYSTEMROOT`, `TEMP`, `USERPROFILE`, etc.); arbitrary parent environment secrets (`KONFRM_TEST_SECRET_SHOULD_NOT_INHERIT`) are not inherited.
  - `PROC-06`: Termination helper is async, awaits command completion, verifies process disappearance, and handles failures deterministically.
  - `PROC-07`: Parent and child process tree cancellation: mock subprocess spawning a child confirms both parent and child processes are terminated on cancellation or timeout.

### Task 15: Run Store & Audit Redaction Hardening (C43, C44)
- **Target File:** `orchestrator/src/run-store.mjs`
- **Test File:** `orchestrator/test/run-store.test.mjs`
- **Specification:** Section 19.2, 19.4, C43, C44.
- **Behaviors to Verify:**
  - `RUN-04`: Layer 1 audit event writer recursively sanitizes strings, redacting Bearer tokens, JWT patterns, API keys, passwords, and secrets before persistence.
  - `RUN-05`: `runId` and `taskId` validated against safe identifier regex `^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`; path traversal attempts (`../`, `..\`, absolute paths, slashes) are rejected.

### Task 16: Core Runner Terminal Finalization & Safety Contracts (C35, C36, C37, C46)
- **Target File:** `orchestrator/src/core-runner.mjs`
- **Test File:** `orchestrator/test/core-runner.test.mjs`
- **Specification:** Section 22, 23, C13, C35, C36, C37, C46.
- **Behaviors to Verify:**
  - `CORE-07`: Verification is mandatory; WRITE mode without verifier yields `VERIFICATION_CONFIGURATION_MISSING` (fails closed, no implicit success).
  - `CORE-08`: Exception during adapter start captures post-failure snapshot, finalizes terminal failure evidence, and only then releases lock.
  - `CORE-09`: Exception during result collection captures post-failure snapshot, finalizes terminal failure evidence, and only then releases lock.
  - `CORE-10`: Malformed output combined with mutation (`!= ZERO_MUTATION`) yields `PARTIAL_MUTATION_BLOCKED` with no retry or fallback.
  - `CORE-12`: Lock is never released before terminal evidence snapshot is written. If evidence persistence fails, `EVIDENCE_FINALIZATION_FAILED` is surfaced.

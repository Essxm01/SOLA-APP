# Neutral KONFRM AUTO ORCHESTRATOR Architecture & Agent Adapter Specification

**Document Version:** 1.0.0  
**Status:** CANONICAL SPECIFICATION — IMPLEMENTATION READY  
**Classification:** Internal Tooling & Governance Architecture  
**Task ID:** `AUTO-02`  
**Target Repository:** KONFRM / SOLA  

---

## 1. Executive Summary & Approved Operating Model

This specification defines the canonical, implementation-ready technical architecture, adapter contracts, locking protocols, process supervision, and failure semantics for the **Neutral KONFRM AUTO ORCHESTRATOR**.

In accordance with explicit Founder approval, the governing architecture of the KONFRM project follows a strictly tiered hierarchy where no single AI coding agent acts as both player and referee:

```text
                     ┌────────────────────────────────────────┐
                     │                FOUNDER                 │
                     │  - Ultimate Product / Business Truth   │
                     │  - Approves Roadmap, Scope & Overrides │
                     └───────────────────┬────────────────────┘
                                         │
                                         ▼
                     ┌────────────────────────────────────────┐
                     │         ChatGPT KONFRM Project         │
                     │       (Strategic Brain / Architect)    │
                     │  - Strategic reasoning & synthesis     │
                     │  - Dispatches tasks & reviews reports  │
                     │  - Enforces macro roadmap & invariants │
                     └───────────────────┬────────────────────┘
                                         │ Ingestion / Dispatch
                                         ▼
                     ┌────────────────────────────────────────┐
                     │       Durable Repository Memory        │
                     │  - AGENTS.md, docs/, tasks/            │
                     │  - KONFRM_MASTER_RULES.md              │
                     │  - Quality Gates & Task Contracts      │
                     └───────────────────┬────────────────────┘
                                         │
                                         ▼
                     ┌────────────────────────────────────────┐
                     │     Neutral KONFRM AUTO ORCHESTRATOR   │
                     │  - Discovers local CLI runtimes        │
                     │  - Enforces Single-Writer Lock         │
                     │  - Supervises execution & normalizes   │
                     │  - Runs independent verification gates │
                     └───────────────────┬────────────────────┘
                                         │
                        ┌────────────────┼────────────────┐
                        ▼                ▼                ▼
              ┌──────────────────┐ ┌───────────┐ ┌──────────────────┐
              │   Antigravity    │ │  Z Code   │ │      Codex       │
              │ (Execution Engine│ │ (Execution│ │ (Scarce High-Risk│
              │  & Fast Worker)  │ │   Engine) │ │  Reviewer Only)  │
              └──────────────────┘ └───────────┘ └──────────────────┘
```

### Core Operating Tenets

1. **Neutral Hub Principle:** The orchestrator is an external, objective coordination process. It does not embody prompt persona or vendor bias. It communicates with all agents strictly through standard process I/O and normalized contracts.
2. **Specialized Agent Roles:**
   - **Antigravity** and **Z Code** are primary execution engines tasked with day-to-day implementation, refactoring, and test writing.
   - **Codex** is a scarce, high-value independent reviewer reserved for security audits, financial calculation verification, architectural invariant checks, and final pre-merge reviews. Codex is **never** consumed as a default execution worker or background supervisor.
3. **Zero Financial Drift:** Under no circumstance does the orchestrator trigger paid API requests, automatic credit top-ups, token purchases, or subscription upgrades. When quota or turn limits are reached, the system halts or switches providers within local policy.
4. **Quality Gates Over Green CI:** A green build, successful test run, or provider "DONE" message is never accepted as completion proof. The orchestrator enforces independent verification gates before marking any task complete.
5. **Fail-Closed Default:** Any ambiguity in context, branch mismatch, lock contention, or unrecognized schema failure immediately transitions the system to a fail-closed terminal state requiring human escalation.

---

## 2. AUTO-01 Ground Truth Baseline

The local interface reality audit conducted in `AUTO-01` verified the physical presence and headless capabilities of the three agents on the host environment:

| Attribute | Codex | Antigravity | Z Code |
| :--- | :--- | :--- | :--- |
| **Installed Generation** | `0.152.0` | `agy 1.1.27` | `0.16.5` |
| **Host Binary / Runtime** | `codex.exe` | `agy.exe` | Bundled Node script (`zcode.cjs`) |
| **Classification** | `NATIVE_HEADLESS` | `NATIVE_HEADLESS` | `NATIVE_CLI_WITH_LIMITATIONS` |
| **CLI Non-Interactive Mode** | `VERIFIED` (`codex exec`) | `VERIFIED` (`agy -p`) | `VERIFIED` (`node zcode.cjs -p`) |
| **Prompt Transport** | CLI arg, stdin, file | CLI arg, stdin | CLI arg, prompt option |
| **Output Interception** | stdout, stderr, JSON/JSONL | stdout, stderr, JSON | stdout, stderr, JSON |
| **Structured Output Schema** | `VERIFIED` (`--output-schema`) | `PARTIAL` (JSON wrapper) | `PARTIAL` (JSON wrapper) |
| **Workspace Targeting** | `VERIFIED` (`--cd`) | `VERIFIED` (`--add-dir`, cwd) | `VERIFIED` (cwd) |
| **Session Continuation** | `VERIFIED` (session ID) | `VERIFIED` (conversation ID) | `VERIFIED` (session resume) |
| **Process Cancellation** | `VERIFIED` (SIGINT/SIGKILL) | `VERIFIED` (SIGINT/SIGKILL) | `VERIFIED` (SIGINT/SIGKILL) |
| **Authentication Source** | ChatGPT Subscription | Google Account Session | Z.AI OAuth Subscription |
| **Programmatic Quota API**| `NOT_FOUND` | `NOT_FOUND` | `NOT_FOUND` |

---

## 3. AUTO-01 Baseline Corrections & Ground Rules

The AUTO-02 architecture explicitly incorporates four critical corrections to findings from AUTO-01:

### 3.1 Quota Telemetry Reality: `NOT_FOUND` vs `UNSUPPORTED`
- **Rule:** The orchestrator must record `PROGRAMMATIC_QUOTA_ACCESS = NOT_FOUND` rather than `UNSUPPORTED` for all three agents. No vendor CLI currently provides an explicit command declaring quota queries impossible; rather, no machine-readable interface was discovered.
- **Quota Confidence Model:** All quota telemetry is modeled with strict confidence tagging:
  ```typescript
  export type QuotaConfidence = "EXACT" | "ESTIMATED" | "UNKNOWN";
  ```
- **Initial State:** The initial state for all agents is `UNKNOWN`. The orchestrator must not encode unverified assumptions regarding rolling windows (e.g. 5-hour, 3-hour), monthly reset dates, or per-model quotas without direct machine-readable evidence.

### 3.2 Security Posture: Explicit `MEDIUM` with Process Hardening
- **Rule:** Global security posture is classified as `ORCHESTRATOR_SECURITY_POSTURE = MEDIUM` (correcting AUTO-01's tentative `LOW`). Spawning child processes and recording evidence introduces attack surfaces:
  1. *Argument Leakage:* Prompts containing sensitive tokens or user data exposed in OS process listings (`Get-Process`, Task Manager).
  2. *Log Persistence:* Unbounded stdout/stderr logs capturing tokens or credentials written to disk.
  3. *Environment Inheritance:* Child processes inheriting parent process environment variables containing production secrets.
- **Mandatory Mitigations:** Prompts must be passed via stdin or temporary ACL-restricted files; environment blocks passed to agents must be strictly allowlisted; raw logs must be scrubbed before persistence.

### 3.3 Locking: Worktree-Aware External Lock (Never `.git/konfrm_writer.lock`)
- **Rule:** The orchestrator must not rely on `.git/konfrm_writer.lock` or repository-tracked files for mutual exclusion. Git worktrees represent `.git` as a plain text file referencing the common git directory, and repository-internal locks risk uncommitted file pollution.
- **Canonical Root:** All orchestrator lock files must reside in an external directory rooted at:
  ```text
  %LOCALAPPDATA%\KONFRM\orchestrator\locks\
  ```

### 3.4 Preflight Reality: Fail Closed on `AUTO_GAP_001`
- **Observed Gap:** On branch `phase5/customer-c2-discovery` (HEAD `d0591bc3`), `tasks/CURRENT_TASK.md` still points to Phase 3/4 handoff (`PHASE_3_TO_PHASE_4_HANDOFF`).
- **Orchestrator Contract:** When `branch identity != CURRENT_TASK identity`, the orchestrator preflight must immediately **FAIL CLOSED** with error `PREFLIGHT_BLOCKED_CONTEXT_MISMATCH`. No write agent may start. The orchestrator must never guess or auto-repair task assignments.

---

## 4. Core Technical Architecture & 13 Modular Subsystems

The Neutral KONFRM Orchestrator is organized into 13 decoupled, single-responsibility subsystems. Each subsystem exposes an explicit, strongly typed contract:

```text
orchestrator/
│
├── 1. discovery              # Dynamic discovery of local agent runtimes and CLI paths
├── 2. task-contract-loader   # Ingestion and schema validation of tasks/CURRENT_TASK.md
├── 3. preflight-validator    # Git, worktree, branch, and environment health checks
├── 4. capability-registry    # Capability discovery, caching, and version verification
├── 5. context-router         # Token-conserving L1-L4 context assembly (docs/CONTEXT_ROUTER.md)
├── 6. agent-selector         # Task routing, risk-based assignment, and fallback policy
├── 7. quota-budget-manager   # Turn limits, execution timeouts, and rate-limit cooldowns
├── 8. worktree-lock-manager  # Atomic, worktree-aware single-writer mutual exclusion
├── 9. process-supervisor     # Child process spawning, stdin piping, timeout & cancellation
├── 10. adapters/             # Provider-specific CLI command and stream wrappers
│   ├── codex-adapter
│   ├── antigravity-adapter
│   └── zcode-adapter
├── 11. result-normalizer     # Translation of provider outputs into canonical AgentResult
├── 12. verification-gate     # Independent test execution, Git diff checks, and Quality Gates
└── 13. evidence-event-log    # Two-layer redacted logging and structured audit trail
```

---

## 5. Runtime Technology Decision

### 5.1 Technology Evaluation

| Consideration | Option A: TypeScript via Repo Toolchain | Option B: Dependency-Free Node.js ESM | Option C: PowerShell Native Scripts |
| :--- | :--- | :--- | :--- |
| **Runtime Overhead** | Requires transpilation build step (`tsc`, `vite`, `tsx`) | Zero build step; executes natively on Node.js 20+ | Windows-only; fragile across POSIX or WSL |
| **Dependencies** | Requires devDependencies in package.json | **Zero additional dependencies** | Native to Windows; shell parsing quirks |
| **Stream & Process I/O** | Robust Node.js `child_process` & `stream` APIs | **Robust native Node.js `node:child_process` & `node:fs`** | Complex stdout/stderr piping & JSON escaping |
| **Type Safety** | Static compile-time checking | Supported via TypeScript `.d.ts` declarations & JSDoc | None |
| **Z Code Compatibility** | Requires Node runtime | Native Node runtime matches bundled `zcode.cjs` | Requires bridging to Node anyway |

### 5.2 Decision: Option B — Dependency-Free Node.js ESM (ADR-AUTO-002)
- **Selected Architecture:** The orchestrator core is implemented as pure, dependency-free Node.js ESM modules (`.mjs` or `"type": "module"` `.js`), accompanied by canonical TypeScript declaration files (`.d.ts`) to ensure strict compile-time verification.
- **Rationale:**
  1. *Zero Dependency Footprint:* The orchestrator must run in clean CI environments and separate git worktrees without requiring `npm install` in the orchestrator directory.
  2. *Native Platform Capabilities:* Modern Node.js provides native `node:child_process`, `node:fs/promises`, `node:crypto`, `node:path`, and native JSON parsing with zero external packages.
  3. *Immediate Execution:* No compile or bundle step is required before launching supervision or diagnostic tasks.
  4. *YAGNI Compliance:* Introducing third-party orchestration frameworks (LangChain, AutoGen, CrewAI) violates the core simplicity invariant of KONFRM.

---

## 6. Agent Discovery Precedence & Contract

Executable paths must **never** be hard-coded into repository tracking. The discovery engine executes a deterministic 5-stage search precedence:

```text
Stage 1: Explicit Local User Override (Config / Environment)
   ↓ (not found)
Stage 2: PATH Environment Resolution (Get-Command / where.exe)
   ↓ (not found)
Stage 3: Known Vendor Installation Roots (Filesystem Probing)
   ↓ (not found)
Stage 4: Executable Capability Validation Probe (--version / --help)
   ↓ (failed / missing)
Stage 5: Status = NOT_FOUND
```

### Discovery Precedence Rules

1. **User Overrides:** Checked first at `%LOCALAPPDATA%\KONFRM\orchestrator\config\overrides.json` or through environment variables:
   - `KONFRM_CODEX_PATH`
   - `KONFRM_ANTIGRAVITY_PATH`
   - `KONFRM_ZCODE_PATH`
2. **PATH Search:** Scans standard system and user `PATH` directories using native path resolution.
3. **Vendor Root Heuristics:**
   - *Codex:* `%USERPROFILE%\.codex\.sandbox-bin\codex.exe`, `%LOCALAPPDATA%\Programs\Codex\bin\codex.exe`
   - *Antigravity:* `%LOCALAPPDATA%\agy\bin\agy.exe`, `%APPDATA%\npm\agy.cmd`
   - *Z Code:* Probes `%LOCALAPPDATA%\Programs\ZCode\resources\glm\zcode.cjs`, `%PROGRAMFILES%\ZCode\resources\glm\zcode.cjs`, and dynamic glob searches across `%LOCALAPPDATA%\Programs\ZCode\**\zcode.cjs`.
4. **Capability Probe:** A discovered binary must execute `<binary> --version` within 3000ms and exit with code 0 to be marked `AVAILABLE`.
5. **Fail-Closed Isolation:** Absolute user paths discovered during runtime are written strictly to `%LOCALAPPDATA%\KONFRM\orchestrator\cache\installations.json` and are **never** committed to Git.

---

## 7. Version and Capability Detection Contract

Capabilities are dynamically probed and recorded using a multi-state evidence classification:

```typescript
export type CapabilityState =
  | "VERIFIED"     // Proven by direct local command execution and exit code 0
  | "PARTIAL"      // Capability partially supported with documented limitations
  | "NOT_FOUND"    // Binary or interface missing on host
  | "UNSUPPORTED"  // CLI explicitly rejects command or capability flag
  | "UNKNOWN";     // Cannot be determined without executing billable or mutating work
```

The orchestrator must never collapse `UNKNOWN` or `PARTIAL` into a binary boolean where task safety or context boundaries are at stake.

---

## 8. Common Agent Adapter Contract

Every agent adapter (Codex, Antigravity, Z Code, and future testing mocks) must implement the canonical TypeScript interface `AgentAdapter`:

```typescript
/**
 * Canonical Agent Adapter Interface
 * File: orchestrator/contracts/adapter.d.ts
 */

export type CapabilityState =
  | "VERIFIED"
  | "PARTIAL"
  | "NOT_FOUND"
  | "UNSUPPORTED"
  | "UNKNOWN";

export type QuotaConfidence = "EXACT" | "ESTIMATED" | "UNKNOWN";

export interface AgentInstallation {
  readonly agent: "codex" | "antigravity" | "zcode" | "mock";
  readonly status: "AVAILABLE" | "NOT_FOUND" | "DISABLED" | "INCOMPATIBLE";
  readonly resolvedPath: string | null;
  readonly discoverySource: "OVERRIDE" | "PATH" | "VENDOR_ROOT" | "MANUAL";
  readonly version: string | null;
  readonly lastVerifiedAt: string; // ISO 8601
}

export interface AgentCapabilities {
  readonly agent: "codex" | "antigravity" | "zcode" | "mock";
  readonly nonInteractiveCLI: CapabilityState;
  readonly stdinTransport: CapabilityState;
  readonly temporaryFileTransport: CapabilityState;
  readonly jsonStructuredOutput: CapabilityState;
  readonly workspaceTargeting: CapabilityState;
  readonly sessionContinuation: CapabilityState;
  readonly processCancellation: CapabilityState;
  readonly schemaEnforcement: CapabilityState;
  readonly maxTurnsLimit: CapabilityState;
  readonly programmaticQuotaTelemetry: CapabilityState;
}

export interface QuotaSnapshot {
  readonly agent: "codex" | "antigravity" | "zcode";
  readonly timestamp: string; // ISO 8601
  readonly confidence: QuotaConfidence;
  readonly remainingTurns: number | null;
  readonly remainingBudgetUsd: number | null;
  readonly resetAt: string | null; // ISO 8601
  readonly rateLimitStatus: "OK" | "APPROACHING_LIMIT" | "RATE_LIMITED" | "UNKNOWN";
  readonly rawTelemetry: Record<string, unknown> | null;
}

export interface AgentRun {
  readonly runId: string;
  readonly taskId: string;
  readonly agent: "codex" | "antigravity" | "zcode" | "mock";
  readonly pid: number;
  readonly startedAt: string; // ISO 8601
  readonly worktreeRoot: string;
  readonly logFilePath: string;
}

export type RunPhase =
  | "INITIALIZING"
  | "SPAWNING"
  | "EXECUTING"
  | "STREAMING_OUTPUT"
  | "DRAINING"
  | "TERMINATING"
  | "EXITED";

export interface AgentRunStatus {
  readonly runId: string;
  readonly phase: RunPhase;
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly durationMs: number;
  readonly memoryUsageRssBytes: number | null;
  readonly lastHeartbeatAt: string; // ISO 8601
}

export interface CancelResult {
  readonly runId: string;
  readonly success: boolean;
  readonly signalSent: "SIGINT" | "SIGTERM" | "SIGKILL";
  readonly terminatedGracefully: boolean;
  readonly cancelledAt: string; // ISO 8601
}

export interface AgentAdapter {
  readonly agentName: "codex" | "antigravity" | "zcode" | "mock";

  /**
   * Discovers local installation, resolves executable path, and verifies version.
   */
  detect(): Promise<AgentInstallation>;

  /**
   * Probes and returns verified agent capabilities.
   */
  capabilities(): Promise<AgentCapabilities>;

  /**
   * Retrieves quota snapshot if available; returns UNKNOWN confidence otherwise.
   */
  usage(): Promise<QuotaSnapshot | null>;

  /**
   * Spawns non-interactive agent child process under supervisor isolation.
   */
  startTask(task: AgentTask): Promise<AgentRun>;

  /**
   * Polls live process status and heartbeat telemetry.
   */
  status(runId: string): Promise<AgentRunStatus>;

  /**
   * Issues escalating cancellation signals (SIGINT -> SIGTERM -> SIGKILL).
   */
  cancel(runId: string): Promise<CancelResult>;

  /**
   * Collects, normalizes, and validates the final agent execution result.
   */
  collectResult(runId: string): Promise<AgentResult>;
}
```

---

## 9. AgentTask Specification

The `AgentTask` object encapsulates all execution parameters, safety boundaries, file write rules, and context requirements passed to an adapter:

```typescript
export type TaskMode = "READ_ONLY" | "WRITE" | "REVIEW";
export type TaskRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AgentTask {
  // Identity & Routing
  readonly taskId: string;
  readonly agent: "codex" | "antigravity" | "zcode";
  readonly mode: TaskMode;
  readonly riskLevel: TaskRiskLevel;

  // Git & Worktree Scoping
  readonly repositoryRoot: string;
  readonly worktreeRoot: string;
  readonly branch: string;
  readonly baseSha: string;
  readonly expectedHeadSha: string;
  readonly requiresWriterLock: boolean;

  // Prompt & Instruction Payload
  readonly prompt: string;
  readonly promptSource: "TASK_CONTRACT" | "SUPERVISOR_RETRY" | "REVIEW_DISPATCH";
  readonly promptTransport: "STDIN" | "TEMPORARY_FILE" | "CLI_ARGUMENT";

  // Context Layering (docs/CONTEXT_ROUTER.md)
  readonly contextFiles: readonly string[];
  readonly allowedWritePaths: readonly string[];
  readonly forbiddenWritePaths: readonly string[];

  // Resource & Execution Constraints
  readonly timeoutMs: number;
  readonly maxTurns?: number;
  readonly modelPreference?: string;
  readonly reasoningPreference?: "LOW" | "MEDIUM" | "HIGH";

  // Validation & Output Schema
  readonly structuredOutputSchema?: Record<string, unknown>;
}
```

---

## 10. AgentResult Specification

The `AgentResult` represents the normalized post-execution artifact collected by the orchestrator. Raw, unbounded logs are stripped and linked via file references:

```typescript
export type ResultStatus =
  | "SUCCESS"
  | "FAILED"
  | "BLOCKED"
  | "TIMED_OUT"
  | "CANCELLED"
  | "QUOTA_EXHAUSTED"
  | "FORBIDDEN_MUTATION_DETECTED"
  | "MALFORMED_OUTPUT";

export interface AgentResult {
  // Run Metadata
  readonly taskId: string;
  readonly agent: "codex" | "antigravity" | "zcode" | "mock";
  readonly agentVersion: string;
  readonly runId: string;
  readonly status: ResultStatus;

  // Temporal Metrics
  readonly startedAt: string; // ISO 8601
  readonly finishedAt: string; // ISO 8601
  readonly durationMs: number;
  readonly exitCode: number;

  // Process Output Summaries (Max 4KB each)
  readonly stdoutSummary: string;
  readonly stderrSummary: string;
  readonly structuredResult: Record<string, unknown> | null;

  // Git State Delta
  readonly branchBefore: string;
  readonly branchAfter: string;
  readonly headBefore: string;
  readonly headAfter: string;
  readonly filesChanged: readonly string[];

  // Verification & Quality Gate Findings
  readonly testsPassed: boolean | null;
  readonly verificationSummary: string;
  readonly liveEvidence: string | null;
  readonly openGaps: readonly string[];
  readonly founderDecisionRequired: string | null;

  // Audit References
  readonly rawLogPath: string;
  readonly rawLogSha256: string;
}
```

---

## 11. Process State Machine & Deterministic Transitions

The orchestrator operates as a strictly deterministic finite state machine (FSM). Ambiguous states such as `DONE` or `WORKING` are prohibited:

```text
                  ┌─────────┐
                  │ CREATED │
                  └────┬────┘
                       │ Task Ingested
                       ▼
               ┌───────────────┐
               │  DISCOVERING  │
               └───────┬───────┘
                       │ Agent Runtimes Found
                       ▼
               ┌───────────────┐        Context Mismatch
               │   PREFLIGHT   ├─────────────────────────────┐
               └───────┬───────┘                             │
                       │ Preflight PASSED                    ▼
                       ▼                       ┌───────────────────────────┐
               ┌───────────────┐               │     TERMINAL FAILURES:    │
               │     READY     │               │ - CONTEXT_MISMATCH        │
               └───────┬───────┘               │ - BLOCKED                 │
                       │ Request Lock          │ - CAPABILITY_MISSING      │
                       ▼                       │ - QUOTA_BLOCKED           │
              ┌─────────────────┐  Contention  │ - TIMED_OUT               │
              │ WAITING_FOR_LOCK├─────────────►│ - CANCELLED               │
              └────────┬────────┘              │ - FAILED                  │
                       │ Lock Acquired         └─────────────▲─────────────┘
                       ▼                                     │
               ┌───────────────┐       Timeout / Crash /     │
               │    RUNNING    ├───────Rate Limit / Error────┤
               └───────┬───────┘                             │
                       │ Process Exited 0                    │
                       ▼                                     │
               ┌───────────────┐       Schema Invalid /      │
               │  COLLECTING   ├───────Parse Failure─────────┤
               └───────┬───────┘                             │
                       │ Normalized                          │
                       ▼                                     │
               ┌───────────────┐       Quality Gate /        │
               │   VERIFYING   ├───────Test Failure──────────┘
               └───────┬───────┘
                       │ Verification PASSED
                       ▼
               ┌───────────────┐
               │   COMPLETED   │
               └───────────────┘
```

### State Machine Transition Table

| Current State | Event / Trigger | Target State | Invariant Actions |
| :--- | :--- | :--- | :--- |
| `CREATED` | Task contract ingested | `DISCOVERING` | Validate contract schema; parse `taskId`, `agent`, `mode`. |
| `DISCOVERING` | Agent runtime resolved | `PREFLIGHT` | Verify binary presence and probe `--version`. |
| `DISCOVERING` | Agent not found | `CAPABILITY_MISSING` | **FAIL CLOSED**. Human escalation required. |
| `PREFLIGHT` | Git / context checks pass | `READY` | Verify clean worktree, branch matching, authority docs. |
| `PREFLIGHT` | Branch / task mismatch | `CONTEXT_MISMATCH` | **FAIL CLOSED** (`PREFLIGHT_BLOCKED_CONTEXT_MISMATCH`). |
| `READY` | Lock requested | `WAITING_FOR_LOCK` | Compute worktree lock key. |
| `WAITING_FOR_LOCK` | Exclusive lock acquired | `RUNNING` | Create lock file with `wx` flag; record owner PID. |
| `WAITING_FOR_LOCK` | Lock contention timeout | `BLOCKED` | Do not overwrite active lock. Report active owner PID. |
| `RUNNING` | Execution exceeds timeout | `TIMED_OUT` | Issue escalating SIGINT -> SIGTERM -> SIGKILL; release lock. |
| `RUNNING` | Rate limit response | `QUOTA_BLOCKED` | Terminate process; record cooldown; release lock. |
| `RUNNING` | Non-zero exit code | `FAILED` | Capture stderr; release lock; no unhandled loop. |
| `RUNNING` | Exit code 0 | `COLLECTING` | Capture stdout/stderr streams; release writer lock. |
| `COLLECTING` | Result parse success | `VERIFYING` | Validate JSON schema; check changed file boundaries. |
| `COLLECTING` | Malformed output | `FAILED` | Mark `MALFORMED_OUTPUT`; retain raw logs. |
| `VERIFYING` | Quality gates pass | `COMPLETED` | Independent test run passes; no forbidden mutations. |
| `VERIFYING` | Test / gate fails | `FAILED` | Record gate failure evidence; halt execution. |

---

## 12. Preflight Validation Contract & Fail-Closed Semantics

Before any execution agent process is launched, the preflight validator executes 10 non-negotiable checks. If any check fails, execution immediately halts without mutating the filesystem:

1. **Repository & Worktree Existence:** Verify repository root and worktree root exist on the local filesystem.
2. **Branch Identity Integrity:** Verify `git rev-parse --abbrev-ref HEAD` matches the target task contract branch.
3. **Baseline Ancestry Verification:** If `expectedHeadSha` is specified, verify `git rev-parse HEAD` matches exactly.
4. **Task Contract Presence:** Verify `tasks/CURRENT_TASK.md` exists and is readable.
5. **Branch / Task Identity Consistency (AUTO_GAP_001 Rule):**
   - The orchestrator extracts `TASK_ID` and `ROADMAP_PHASE` from `tasks/CURRENT_TASK.md`.
   - It verifies that the active branch name contains or corresponds to the active task ID.
   - If a mismatch is detected (e.g., active branch is `phase5/customer-c2-discovery` but `tasks/CURRENT_TASK.md` references `PHASE_3_TO_PHASE_4_HANDOFF`), preflight transitions to `CONTEXT_MISMATCH` with diagnostic `PREFLIGHT_BLOCKED_CONTEXT_MISMATCH`.
6. **Mandatory Universal Core Presence:** Confirm all 6 core documents exist: `AGENTS.md`, `docs/INDEX.md`, `docs/CURRENT_STATE.md`, `tasks/CURRENT_TASK.md`, `docs/codex/KONFRM_MASTER_RULES.md`, and the active task contract.
7. **Agent Installation Health:** Confirm the selected agent binary exists, is executable, and its version satisfies compatibility boundaries.
8. **Lock Availability:** Confirm no active, live-process lock exists for the targeted worktree.
9. **Working Directory Hygiene:** If the task mode is `WRITE`, verify no uncommitted changes exist in tracked files outside the task scope.
10. **Zero Unresolved Founder Blocks:** Confirm `tasks/CURRENT_TASK.md` does not contain an active, unresolved `FOUNDER_DECISION_REQUIRED` block for the targeted feature.

---

## 13. Worktree-Aware External Single-Writer Lock Contract

### 13.1 Lock File Path & Key Derivation
Locks are strictly external to the Git repository to prevent worktree `.git` reference conflicts and accidental dirty commits:
```text
Lock Root: %LOCALAPPDATA%\KONFRM\orchestrator\locks\
Lock File: %LOCALAPPDATA%\KONFRM\orchestrator\locks\lock_<WORKTREE_HASH>.json
```
The `WORKTREE_HASH` is derived deterministically:
```text
WORKTREE_HASH = SHA256(ToLowerCase(NormalizePath(worktreeRoot)))[0..16]
```

### 13.2 Atomic Acquisition Protocol
In Node.js, atomic file creation is achieved using `node:fs` open flags:
```javascript
import fs from 'node:fs';

function acquireLock(lockPath, lockMetadata) {
  try {
    // 'wx' flag: Open for writing, fails if path exists (O_CREAT | O_EXCL)
    const fd = fs.openSync(lockPath, 'wx');
    fs.writeFileSync(fd, JSON.stringify(lockMetadata, null, 2), 'utf8');
    fs.closeSync(fd);
    return { acquired: true, lockMetadata };
  } catch (err) {
    if (err.code === 'EEXIST') {
      return { acquired: false, contention: true };
    }
    throw err;
  }
}
```

### 13.3 Lock Metadata Schema
```typescript
export interface WorktreeLockMetadata {
  readonly lockKey: string;
  readonly worktreePath: string;
  readonly repositoryRoot: string;
  readonly branch: string;
  readonly taskId: string;
  readonly agent: "codex" | "antigravity" | "zcode" | "mock";
  readonly ownerPid: number;
  readonly ownerStartTime: string; // ISO 8601 process creation time
  readonly acquiredAt: string;     // ISO 8601
  readonly heartbeatAt: string;    // ISO 8601
  readonly leaseDurationMs: number;// Default: 300,000 (5 minutes)
}
```

### 13.4 Stale Lock Detection & Crash Recovery
- **Rule:** A lock is **never** deleted purely because its elapsed time exceeds a threshold.
- **Liveness Proof Requirement:** To break or claim an existing lock file, the orchestrator must prove through the OS process subsystem that:
  1. The PID recorded in `ownerPid` no longer exists on the operating system; **OR**
  2. The process running at `ownerPid` has a creation timestamp that differs from `ownerStartTime` (PID recycling detected).
- On Windows, this is validated using native process query tools (`Get-Process -Id <pid>` verifying `StartTime`).
- If the owner process is confirmed dead, the stale lock is quarantined to `%LOCALAPPDATA%\KONFRM\orchestrator\locks\quarantine\` with audit reason `OWNER_PROCESS_TERMINATED`, and a fresh lock is acquired.

---

## 14. Parallelism & Concurrency Governance

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PARALLELISM MATRIX                              │
├────────────────────────────┬─────────────────────────────┬─────────────┤
│ Scenario                   │ Policy                      │ Allowed?    │
├────────────────────────────┼─────────────────────────────┼─────────────┤
│ Single Worktree: 2 Writers │ Concurrent mutation forbidden│ NO          │
│ Single Worktree: Write+Rev │ Concurrent review forbidden │ NO          │
│ Two Isolated Worktrees     │ Read-only tasks concurrent  │ YES         │
│ Two Isolated Worktrees     │ Independent writers         │ YES (with   │
│                            │                             │ diff locks) │
│ Codex Supervised Execution │ Codex idling as supervisor  │ NO          │
└────────────────────────────┴─────────────────────────────┴─────────────┘
```

### Core Invariants

1. **One Write Agent Per Worktree:** Exactly one write agent process may hold the writer lock for a worktree at any given moment.
2. **Reviewer Isolation:** A review agent (such as Codex) must never run against a mutable worktree while an execution agent is actively writing. Reviewers run only against static commits, tagged revisions, or dedicated read-only worktrees.
3. **Codex Preservation Policy:** Codex tokens and subscription quotas are treated as scarce, mission-critical assets. Codex is invoked only when a task is marked `TaskMode = "REVIEW"` or explicitly requires high-risk architectural / financial audit.

---

## 15. Provider-Specific Adapter Specifications

### 15.1 Codex Adapter Specification
- **Binary Discovery:** Scans `%USERPROFILE%\.codex\.sandbox-bin\codex.exe` and PATH.
- **Invocation Command:**
  ```text
  codex exec --cd <worktreePath> --sandbox <mode> --output-schema <schemaFile> [flags]
  ```
- **Execution Flags:**
  - Non-interactive batch execution.
  - `--sandbox read-only` for Review tasks.
  - `--sandbox workspace-write` for Write tasks.
- **Prompt Transport:** Stdin piping preferred over command-line string arguments to prevent process table inspection.
- **Stream Capture:** Captures JSON/JSONL output from stdout; captures diagnostic telemetry from stderr.
- **Cancellation:** Dispatches `SIGINT` (Ctrl+C equivalent), waits 5000ms for graceful teardown, escalates to `SIGKILL` on timeout.

### 15.2 Antigravity Adapter Specification
- **Binary Discovery:** Scans `%LOCALAPPDATA%\agy\bin\agy.exe` and PATH.
- **Invocation Command:**
  ```text
  agy --prompt-file <restrictedTempFile> --add-dir <worktreePath> --json
  ```
- **Permission Governance:** The dangerous flag `--dangerously-skip-permissions` is **forbidden** by default. Sandboxing and permission elevation are governed strictly by the preflight task policy.
- **Session Support:** Preserves `conversation_id` for multi-step task continuation where authorized.
- **Cancellation:** Dispatches `SIGINT` to child process handle.

### 15.3 Z Code Adapter Specification
- **Dynamic Path Discovery:**
  - Bundled runtime asset is located dynamically via `%LOCALAPPDATA%\Programs\ZCode\resources\glm\zcode.cjs`.
  - Node runner fallback:
    ```text
    node.exe "%LOCALAPPDATA%\Programs\ZCode\resources\glm\zcode.cjs" [flags]
    ```
- **Version Compatibility Probe:** Before launching, runs `node zcode.cjs --version`. If the interface changes or the script is relocated following a Z Code desktop update, the adapter triggers dynamic rediscovery.
- **Turn Limiting:** Passes `--max-turns <n>` where supported to prevent runaway turn loops.
- **Fail-Closed Fallback Chain:**
  1. Primary: Direct bundled CLI execution (`node zcode.cjs`).
  2. Secondary: If app-server mode is active locally, query local IPC port.
  3. Terminal: If neither is reachable, transition to `CAPABILITY_MISSING`. Do not attempt desktop UI mouse automation.

---

## 16. Quota, Budget, and Provider Health Model

### 16.1 Quota Confidence States
Because no machine-readable quota API exists locally for any agent:
- `QuotaConfidence` is permanently tagged `UNKNOWN` at initial launch.
- The orchestrator tracks deterministic, local surrogate budgets rather than guessing remote balance:

```typescript
export interface LocalTaskBudget {
  readonly maxDurationMs: number;       // Default: 600,000 (10 mins)
  readonly maxTurnsAllowed: number;     // Default: 15 turns
  readonly maxProcessRetries: number;   // Default: 1 retry for transient failure
  readonly maxDiskMutationBytes: number;// Default: 50 MB
}
```

### 16.2 Provider Health States

```typescript
export type ProviderHealthState =
  | "AVAILABLE"          // Responsive, exit codes clean
  | "BUSY"               // Currently executing an active run
  | "COOLDOWN"           // Temporary rate-limit backoff window active
  | "RATE_LIMITED"       // Provider emitted rate-limit or quota error
  | "AUTH_EXPIRED"       // Provider returned auth / login failure
  | "CAPABILITY_CHANGED" // CLI flags or output format mismatched
  | "UNAVAILABLE"        // Binary missing or crashing on launch
  | "UNKNOWN";           // Untested in current session
```

### 16.3 Rate-Limit Response & Cooldown Protocol
When a provider CLI returns a response indicating rate limiting (e.g. HTTP 429, "rate limit reached", "quota exceeded"):
1. The provider is marked `RATE_LIMITED`.
2. A local cooldown timer is initiated (default: 15 minutes exponential backoff, capped at 60 minutes).
3. The orchestrator transitions the run to `QUOTA_BLOCKED`.
4. The orchestrator checks if a secondary fallback agent is eligible for the task (e.g., switching from Antigravity to Z Code for a low-risk write task).
5. **Strict Constraint:** Codex is **never** used as a fallback execution worker when Antigravity/Z Code are rate-limited.
6. Under no circumstances does the orchestrator prompt for, or execute, credit top-ups.

---

## 17. Routing Boundary & Agent Selection Interface

`AUTO-02` defines the structural interface that future intelligent routing layers (`AUTO-06`) consume:

```typescript
export interface RoutingRequest {
  readonly taskId: string;
  readonly mode: TaskMode;
  readonly riskLevel: TaskRiskLevel;
  readonly domain: "BACKEND" | "DATABASE" | "FRONTEND_UI" | "SECURITY" | "FINANCE" | "TOOLING";
  readonly estimatedComplexity: "LOW" | "MEDIUM" | "HIGH";
  readonly candidateAgents: readonly ("codex" | "antigravity" | "zcode")[];
  readonly providerHealth: Record<string, ProviderHealthState>;
}

export interface RoutingDecision {
  readonly selectedPrimaryAgent: "codex" | "antigravity" | "zcode";
  readonly fallbackAgent: "codex" | "antigravity" | "zcode" | null;
  readonly independentReviewerRequired: boolean;
  readonly designatedReviewer: "codex" | null;
  readonly routingRationale: string;
}

export interface AgentSelector {
  select(request: RoutingRequest): RoutingDecision;
}
```

### Hard-Coded Governance Invariants in Routing

- If `domain === "FINANCE" || domain === "SECURITY" || riskLevel === "CRITICAL"`, `independentReviewerRequired` **MUST** be `true` and `designatedReviewer` **MUST** be `codex`.
- If `mode === "WRITE"`, `selectedPrimaryAgent` **MUST NOT** be `codex` unless explicitly authorized by Founder override. Primary writers must be `antigravity` or `zcode`.

---

## 18. Context Efficiency Extension Points

The orchestrator defines explicit, modular extension points for supporting tooling without implementing or installing them prematurely:

| Tool / Framework | Intended Architectural Role | Orchestrator Extension Hook | Status in AUTO-02 |
| :--- | :--- | :--- | :--- |
| **Caveman** | Prompt & context compression; markdown minification | `contextRouter.preProcessContext()` | Extension point defined; uninstalled |
| **Repomix** | Token-efficient codebase packaging & file bundling | `contextRouter.packRepositorySlice()` | Extension point defined; uninstalled |
| **Spec Kit** | Specification ingestion and task requirement parsing | `taskContractLoader.parseSpecification()` | Extension point defined; uninstalled |
| **Superpowers** | TDD enforcement, disciplined debugging, systematic review | `verificationGate.preFlightQualityAudit()` | Active in repo; integration hook defined |
| **gstack** | Targeted QA review & investigation skills | `verificationGate.runInvestigativeReview()` | Extension point defined; uninstalled |
| **Matt Pocock Skills** | Specialized TypeScript & typing verification routines | `verificationGate.runTypeCheckGate()` | Extension point defined; uninstalled |
| **BMAD Method** | Bounded multi-agent review patterns | `agentSelector.buildReviewGraph()` | Selected patterns only; no framework |

**Non-Negotiable Authority Boundary:** No external framework or tool may supersede `KONFRM_MASTER_RULES.md`, `BRAIN_SYNC_PROTOCOL.md`, or the Founder-approved Quality Gates.

---

## 19. Prompt Transport Security & Two-Layer Logging Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   TWO-LAYER LOGGING ARCHITECTURE                       │
├────────────────────────────────────────────────────────────────────────┤
│ LAYER 1: NORMALIZED AUDIT EVENTS (Shared / Git-Eligible Summaries)     │
│ Path: %LOCALAPPDATA%\KONFRM\orchestrator\events\event_<runId>.json     │
│ Content: Redacted, bounded (<64KB), task metadata, SHA delta, status. │
│ Rules: ZERO secrets; ZERO prompt bodies; ZERO raw stack dumps.        │
├────────────────────────────────────────────────────────────────────────┤
│ LAYER 2: RAW PROVIDER ARTIFACTS (Local-Only / Ephemeral)              │
│ Path: %LOCALAPPDATA%\KONFRM\orchestrator\logs\run_<runId>\             │
│ Content: Complete raw stdout, stderr, process telemetry, crash dumps.   │
│ Rules: Never committed to Git; 7-day retention; user-ACL restricted.  │
└────────────────────────────────────────────────────────────────────────┘
```

### 19.1 Prompt Transport Security
To eliminate sensitive prompt text from appearing in OS process monitor tools (`Get-Process`, `wmic process`):
- **Transport Preference Order:**
  1. *Standard Input (stdin):* Direct stream piping from orchestrator to agent child process.
  2. *Restricted Temporary File:* Written to `%TEMP%\konfrm_prompts\prompt_<runId>.tmp` with Windows DACL restricted exclusively to the current user SID, then deleted immediately upon agent startup.
  3. *Command Line Argument:* Permitted only for short non-sensitive arguments or boolean flags; **never** for full prompts.

### 19.2 Sanitization & Redaction Engine
Before writing any event to Layer 1 or displaying stdout summaries:
- Regular expression patterns redact known credential signatures:
  - Supabase JWTs: `eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+` -> `[REDACTED_JWT]`
  - Bearer tokens: `Bearer\s+[A-Za-z0-9_\-\.]+` -> `Bearer [REDACTED_TOKEN]`
  - Cloudflare / API Keys: `(key|secret|token|password)\s*[:=]\s*['"][^'"]+['"]` -> `$1: "[REDACTED]"`

---

## 20. Local Runtime State Hierarchy

All machine-specific configuration, caches, logs, and lock files are strictly isolated outside the Git repository:

```text
%LOCALAPPDATA%\KONFRM\orchestrator\
│
├── config/
│   ├── orchestrator.json       # Local orchestrator defaults (timeouts, retention)
│   └── overrides.json          # Optional local agent binary path overrides
│
├── locks/
│   ├── lock_<WORKTREE_HASH>.json   # Active single-writer lock files
│   └── quarantine/                 # Terminated or broken locks preserved for audit
│
├── runs/
│   └── run_<runId>.json        # Serialized AgentRun execution descriptor
│
├── events/
│   └── event_<runId>.json      # Layer 1 sanitized audit events
│
├── logs/
│   └── run_<runId>/
│       ├── stdout.log          # Layer 2 raw standard output
│       ├── stderr.log          # Layer 2 raw standard error
│       └── process_meta.json   # PID, CPU, memory, and exit code records
│
├── capabilities/
│   └── <agent>_capabilities.json # Cached verified capabilities probe results
│
└── cache/
    └── installations.json      # Discovered local binary paths and versions
```

---

## 21. Minimal Configuration Contract

Configuration files contain **zero** secrets. Missing config files default safely:

```json
{
  "$schema": "./schemas/orchestrator-config.json",
  "version": "1.0.0",
  "execution": {
    "defaultTimeoutMs": 600000,
    "maxProcessRetries": 1,
    "lockLeaseDurationMs": 300000,
    "heartbeatIntervalMs": 10000
  },
  "logging": {
    "retentionDays": 7,
    "maxLogSizeBytes": 10485760,
    "redactSensitiveKeys": true
  },
  "agentOverrides": {
    "codexPath": null,
    "antigravityPath": null,
    "zcodePath": null
  }
}
```

### Precedence Order
`Task Contract Parameters` → `User Environment Variables` → `overrides.json` → `orchestrator.json` → `Safe Internal Defaults`.

---

## 22. Failure Handling & Conservative Retry Matrix

The orchestrator adheres to a strict anti-looping retry philosophy. Business ambiguity, branch mismatches, and schema violations must **never** be retried automatically:

| Scenario / Failure Trigger | Terminal / Intermediate State | Automatic Action | Retry Allowed? | Fallback Allowed? | Escalation Condition |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Agent binary disappears** | `CAPABILITY_MISSING` | Invalidate cache; run dynamic discovery | No | Yes (to eligible peer) | Agent missing after rediscovery |
| **Agent version incompatible** | `CAPABILITY_MISSING` | Log version mismatch; halt execution | No | Yes | Version outside supported range |
| **JSON output malformed** | `FAILED` | Capture raw output; release lock | No | No | Malformed JSON on non-zero exit |
| **Authentication expired** | `BLOCKED` | Mark provider `AUTH_EXPIRED`; halt | No | No | Requires manual user login |
| **Quota / Rate Limit reached** | `QUOTA_BLOCKED` | Initiate provider cooldown timer | No | Yes (if task permits) | Rate limit across all agents |
| **Agent process hangs / timeout**| `TIMED_OUT` | Issue escalating SIGINT->SIGKILL | Yes (1x transient) | Yes | Hangs on second attempt |
| **Non-zero exit (syntax/compile)**| `FAILED` | Collect stderr; report failure | No | No | Code defect must be diagnosed |
| **Forbidden file mutated** | `BLOCKED` | Revert worktree changes via Git | No | No | Security violation; escalate |
| **Branch changed unexpectedly** | `CONTEXT_MISMATCH` | Abort run; release lock | No | No | Worktree altered during execution |
| **HEAD changed during execution**| `CONTEXT_MISMATCH` | Abort run; capture git reflog | No | No | Concurrent commit detected |
| **Writer lock disappears/altered**| `BLOCKED` | Kill agent immediately via SIGKILL | No | No | Mutual exclusion compromised |
| **Process crash (SIGSEGV/OOM)** | `FAILED` | Capture OS crash code; release lock | Yes (1x transient) | Yes | Second crash triggers escalation |
| **FOUNDER_DECISION_REQUIRED** | `BLOCKED` | Preserve worktree; halt execution | No | No | Human decision required |

---

## 23. Verification Boundary (`AGENT_FINISHED` vs `TASK_VERIFIED`)

A fundamental flaw of naive automation is treating the agent's exit code or self-reported success as task completion. The KONFRM Orchestrator enforces a strict verification boundary:

```text
                  ┌──────────────────────────────┐
                  │    Agent Process Exits 0     │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │  Status: AGENT_FINISHED      │
                  │  (Candidate Result Collected)│
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │ Independent Verification Gate│
                  │ - Git diff validation        │
                  │ - Forbidden path check       │
                  │ - TypeScript compilation     │
                  │ - Unit / Integration tests   │
                  │ - Schema & migration checks  │
                  └──────────────┬───────────────┘
                                 │
                   ┌─────────────┴─────────────┐
                   │                           │
                   ▼ PASSED                    ▼ FAILED
        ┌───────────────────┐         ┌───────────────────┐
        │ Status: COMPLETED │         │  Status: FAILED   │
        │ (TASK_VERIFIED)   │         │ (Verification Gate│
        └───────────────────┘         │  Check Failed)    │
                                      └───────────────────┘
```

1. **Candidate State:** When an agent finishes with exit code 0, its state is recorded as `AGENT_FINISHED`. The task is **not** closed.
2. **Independent Test Execution:** The orchestrator independently spawns project verification scripts (`npm run check`, `npm run test`, `git diff --check`) in the worktree.
3. **Task Verification:** Only when all independent checks succeed without regression or forbidden file edits is the run promoted to `COMPLETED` (`TASK_VERIFIED`).

---

## 24. Architecture Decision Records (ADRs)

### ADR-AUTO-001: Neutral Orchestrator Hub
- **Context:** Deciding whether Codex, Antigravity, or Z Code should host the master coordination logic.
- **Decision:** Adopt an independent, neutral orchestration process.
- **Consequences:** Eliminates vendor lock-in; enables objective evaluation; preserves Codex for scarce high-value review.

### ADR-AUTO-002: Dependency-Free Node.js ESM Runtime
- **Context:** Selecting the implementation technology for the orchestrator supervisor.
- **Decision:** Use native Node.js ESM with zero third-party dependencies, supported by TypeScript declaration contracts.
- **Consequences:** Runs immediately without build steps or `npm install`; aligns with existing Node toolchain; cross-platform.

### ADR-AUTO-003: External Worktree-Aware Writer Lock
- **Context:** Preventing concurrent writers across Git worktrees without relying on `.git/konfrm_writer.lock`.
- **Decision:** Store locks in `%LOCALAPPDATA%\KONFRM\orchestrator\locks\` keyed by normalized worktree path hash, using atomic creation (`wx`) and PID start-time validation.
- **Consequences:** Safe across Git worktrees; resilient against stale locks; does not pollute repository git status.

### ADR-AUTO-004: Dynamic Agent Discovery Precedence
- **Context:** Avoiding machine-specific hard-coded binary paths across different developer workstations.
- **Decision:** Implement 5-stage discovery: Override -> PATH -> Vendor Roots -> Probe -> NOT_FOUND.
- **Consequences:** Portable across environments; tolerates auto-updates of desktop applications; keeps local paths out of Git.

### ADR-AUTO-005: Unknown Quota Is Not Zero Quota
- **Context:** AUTO-01 found no local programmatic quota query APIs for Codex, Antigravity, or Z Code.
- **Decision:** Model quota confidence as `type QuotaConfidence = "EXACT" | "ESTIMATED" | "UNKNOWN"`, defaulting to `UNKNOWN`, and manage turns and timeouts locally.
- **Consequences:** Prevents false assumptions about reset windows; avoids premature blocking while protecting against infinite loops.

### ADR-AUTO-006: Provider-Neutral Normalized Result Contract
- **Context:** Each provider CLI outputs distinct JSON or text formats.
- **Decision:** Normalize all executions into a standard `AgentResult` object with bounded summaries and external log links.
- **Consequences:** Enables uniform downstream reporting, verification, and audit logging regardless of which agent executed.

### ADR-AUTO-007: Local Runtime State Isolated Outside Git
- **Context:** Managing run logs, caches, lock files, and capability probes without dirtying the Git worktree.
- **Decision:** Root all local runtime state in `%LOCALAPPDATA%\KONFRM\orchestrator\`.
- **Consequences:** Zero Git pollution; clean repository status; centralized log retention and rotation.

### ADR-AUTO-008: Zero Paid API Spend & No Automatic Credit Purchases
- **Context:** Managing subscription boundaries and credit cards.
- **Decision:** The orchestrator is strictly prohibited from triggering paid API calls or credit purchases upon quota exhaustion.
- **Consequences:** Absolute financial safety; rate limits halt execution or route to available subscription quotas within policy.

---

## 25. AUTO_GAP_001 Analysis & Resolution Strategy

### Observed Reality
During the post-AUTO-01 audit, an inspection of active branch `phase5/customer-c2-discovery` (HEAD `d0591bc3f3657cf0ee466606bfb91f3bd681e8e0`) revealed:
- `tasks/CURRENT_TASK.md` remains populated with:
  ```text
  TASK_ID: PHASE_3_TO_PHASE_4_HANDOFF
  ROADMAP_PHASE: PHASE_4_ENTRY
  ```
- The branch name and code represent Phase 5 Customer C2 discovery work, while the tracked task contract represents the Phase 3/4 handoff.

### Architectural Impact on Automation
- Autonomous agents rely on `tasks/CURRENT_TASK.md` as their primary execution boundary, objective contract, and non-goal specification.
- A mismatch between branch identity and task contract creates a catastrophic failure mode where an agent on a Phase 5 branch may attempt to execute Phase 4 entry gates, or vice-versa.

### Fail-Closed Orchestrator Rule
- The preflight validator enforces `branchTaskIdentityMatch`:
  ```javascript
  if (!isBranchTaskConsistent(branchName, taskContract)) {
    return {
      status: "CONTEXT_MISMATCH",
      diagnostic: "PREFLIGHT_BLOCKED_CONTEXT_MISMATCH",
      error: `Branch '${branchName}' does not match CURRENT_TASK.md ID '${taskContract.taskId}'`
    };
  }
  ```
- **Action for AUTO-02:** Do **not** modify `phase5/customer-c2-discovery` or its `tasks/CURRENT_TASK.md`.
- **Recommendation:** Schedule a dedicated, isolated repository governance task (`GOV-TASK-ALIGNMENT`) to align the task pointer on `phase5/customer-c2-discovery` under Founder review.

---

## 26. Explicit Non-Goals for AUTO-02

To maintain absolute architectural focus and safety, the following activities are strictly out of scope for AUTO-02:
1. Writing implementation code or creating executable orchestrator scripts.
2. Spawning live agents against the KONFRM codebase.
3. Modifying application code in `customer-app`, `owner-app`, `admin-app`, or `backend`.
4. Modifying Supabase schema, migrations, or Cloudflare Worker configurations.
5. Installing external frameworks (Caveman, Repomix, Spec Kit, gstack, BMAD, Pocock skills).
6. Scraping private web dashboards or browser cookies for quota telemetry.
7. Modifying `docs/BRAIN_SYNC_PROTOCOL.md`.
8. Touching or altering the active Phase 5 worktree.

---

## 27. Staged Future Delivery Sequence (AUTO-02 through AUTO-10)

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   ORCHESTRATOR DELIVERY ROADMAP                        │
├─────────┬──────────────────────────────────┬───────────────────────────┤
│ Stage   │ Name                             │ Core Deliverables         │
├─────────┼──────────────────────────────────┼───────────────────────────┤
│ AUTO-02 │ Architecture & Adapter Contracts │ Canonical spec & types    │
│         │ (CURRENT)                        │ (Zero code implementation)│
├─────────┼──────────────────────────────────┼───────────────────────────┤
│ AUTO-03 │ Core Process Supervisor & Lock   │ Dependency-free supervisor│
│         │ Engine Implementation            │ Mock adapter test harness │
│         │                                  │ External lock manager     │
├─────────┼──────────────────────────────────┼───────────────────────────┤
│ AUTO-04 │ Real Read-Only Adapter           │ Codex, Antigravity, ZCode │
│         │ Integration                      │ read-only execution probes│
│         │                                  │ Diagnostic telemetry      │
├─────────┼──────────────────────────────────┼───────────────────────────┤
│ AUTO-05 │ Single-Agent Write Sandbox       │ Worktree-isolated writes  │
│         │                                  │ File boundary enforcer    │
│         │                                  │ Rollback on failure       │
├─────────┼──────────────────────────────────┼───────────────────────────┤
│ AUTO-06 │ Routing, Fallback & Budget       │ Risk-based agent selector │
│         │ Governance                       │ Rate-limit cooldown logic │
│         │                                  │ Local turn/time budgets   │
├─────────┼──────────────────────────────────┼───────────────────────────┤
│ AUTO-07 │ Context Efficiency Tooling Hooks │ Caveman/Repomix hooks     │
│         │                                  │ Token-optimized packs     │
├─────────┼──────────────────────────────────┼───────────────────────────┤
│ AUTO-08 │ Quality Gate & Review Automation │ Independent Codex review  │
│         │                                  │ Automated gate checks     │
├─────────┼──────────────────────────────────┼───────────────────────────┤
│ AUTO-09 │ End-to-End Autonomous Dry Run    │ Full synthetic task cycle │
│         │                                  │ In isolated worktree      │
├─────────┼──────────────────────────────────┼───────────────────────────┤
│ AUTO-10 │ Controlled Production Pilot      │ Real bounded KONFRM task  │
│         │                                  │ Under Founder oversight   │
└─────────┴──────────────────────────────────┴───────────────────────────┘
```

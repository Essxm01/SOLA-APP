# Neutral KONFRM AUTO ORCHESTRATOR Architecture & Agent Adapter Specification

**Document Version:** 1.2.0
**Status:** CANONICAL SPECIFICATION — FINAL HARDENING (AUTO-02R2)
**Classification:** Internal Tooling & Governance Architecture
**Task ID:** `AUTO-02R2`
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
                     │  - Enforces Worktree-Aware Lock        │
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
| **Structured Output Schema** | `VERIFIED` (`--output-schema`) | `PARTIAL` (`--json-schema`) | `PARTIAL` (JSON wrapper) |
| **Workspace Targeting** | `VERIFIED` (`--cd`) | `VERIFIED` (`--add-dir`, cwd) | `VERIFIED` (cwd) |
| **Session Continuation** | `VERIFIED` (session ID) | `VERIFIED` (conversation ID) | `VERIFIED` (session resume) |
| **Process Cancellation** | `VERIFIED` (OS process termination) | `VERIFIED` (OS process termination) | `VERIFIED` (OS process termination) |
| **Authentication Source** | ChatGPT Subscription | Google Account Session | Z.AI OAuth Subscription |
| **Programmatic Quota API**| `NOT_FOUND` | `NOT_FOUND` | `NOT_FOUND` |

---

## 3. AUTO-01 Baseline Corrections & Ground Rules

The orchestrator architecture incorporates critical corrections to findings from AUTO-01:

### 3.1 Quota Telemetry Reality: `NOT_FOUND` vs `UNSUPPORTED`
- **Rule:** The orchestrator records `PROGRAMMATIC_QUOTA_ACCESS = NOT_FOUND` rather than `UNSUPPORTED` for all three agents. Currently observed quota presentation across all three providers is GUI/Web-oriented; no documented machine-readable command was discovered locally.
- **Strict Prohibition:** Under no circumstances may the orchestrator scrape web interfaces, extract browser cookies, reverse-engineer authenticated endpoints, or purchase credits.
- **Quota Confidence Model:** All quota telemetry is modeled with strict confidence tagging:
  ```typescript
  export type QuotaConfidence = "EXACT" | "ESTIMATED" | "UNKNOWN";
  ```
- **Initial State:** The initial state for all agents is `UNKNOWN`. The orchestrator must not encode unverified assumptions regarding rolling windows, monthly reset dates, or per-model quotas without direct machine-readable evidence.

### 3.2 Security Posture: Explicit `MEDIUM` with Process Hardening
- **Rule:** Global security posture is classified as `ORCHESTRATOR_SECURITY_POSTURE = MEDIUM`. Spawning child processes introduces real security considerations:
  1. *Argument Leakage:* Prompts containing sensitive tokens or user data can be visible in OS process listings (`Get-Process`, Task Manager).
  2. *Log Persistence:* Unbounded stdout/stderr logs capturing tokens or credentials written to disk.
  3. *Environment Inheritance:* Child processes inheriting parent process environment variables containing production secrets.
- **Mandatory Mitigations:** Prompts are transported via stdin piping or user-ACL-restricted temporary files to significantly **REDUCE** process argument exposure (though not claimed universally eliminated due to vendor differences). Environment blocks passed to child processes are allowlisted; raw logs are disabled by default (`RAW_PROVIDER_LOGGING = false`).

### 3.3 Locking: Worktree-Aware External Lock (Never `.git/konfrm_writer.lock`)
- **Rule:** The orchestrator must not rely on `.git/konfrm_writer.lock` or repository-tracked files for mutual exclusion. Git worktrees represent `.git` as a plain text file referencing the common git directory, and repository-internal locks risk uncommitted file pollution.
- **Canonical Root:** All orchestrator lock files must reside in an external directory rooted at:
  ```text
  %LOCALAPPDATA%\KONFRM\orchestrator\locks\
  ```

### 3.4 Preflight Reality: Fail Closed on `AUTO_GAP_001`
- **Observed Gap:** On branch `phase5/customer-c2-discovery` (HEAD `d0591bc3`), `tasks/CURRENT_TASK.md` still points to Phase 3/4 handoff (`PHASE_3_TO_PHASE_4_HANDOFF`).
- **Orchestrator Contract:** Preflight enforces explicit metadata comparison. If required task/branch metadata is missing, preflight transitions to `PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT`. If metadata exists but conflicts (`actualBranch !== EXPECTED_BRANCH`), preflight immediately **FAILS CLOSED** with diagnostic `PREFLIGHT_BLOCKED_CONTEXT_MISMATCH`. No write agent may start.

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

## 5. Runtime Technology Decision & Versioning

### 5.1 Technology Evaluation

| Consideration | Option A: TypeScript via Repo Toolchain | Option B: Dependency-Free Node.js ESM | Option C: PowerShell Native Scripts |
| :--- | :--- | :--- | :--- |
| **Runtime Overhead** | Requires transpilation build step (`tsc`, `vite`, `tsx`) | Zero build step; executes natively on modern Node.js LTS | Windows-only; fragile across POSIX or WSL |
| **Dependencies** | Requires devDependencies in package.json | **Zero additional npm dependencies** | Native to Windows; shell parsing quirks |
| **Stream & Process I/O** | Robust Node.js `child_process` & `stream` APIs | **Robust native Node.js `node:child_process` & `node:fs`** | Complex stdout/stderr piping & JSON escaping |
| **Type Safety** | Static compile-time checking | Supported via TypeScript `.d.ts` declarations & JSDoc | None |
| **Z Code Compatibility** | Requires Node runtime | Native Node runtime matches bundled `zcode.cjs` | Requires bridging to Node anyway |

### 5.2 Runtime Versioning & EOL Governance (Correction C23)
The specification strictly decouples host observations from production runtime requirements:
- `CURRENT_LOCAL_VERSION`: Node.js `v25.6.0` was observed on the local machine during the AUTO-01 audit. Node 25 is an odd-numbered, non-LTS release that reached End-of-Life (EOL). It is **not** an approved long-term runtime.
- `PREFERRED_RUNTIME`: **Node.js 24.x LTS**.
- `SUPPORTED_INITIAL_RUNTIME`: Currently-supported active LTS releases (Node.js 22.x LTS and Node.js 24.x LTS) verified by AUTO-03 compatibility tests.
- `EOL_RUNTIME_POLICY`: The orchestrator preflight must **FAIL CLOSED** for production or real-agent execution on End-of-Life Node releases (including Node 20 and Node 25). Simplistic numeric comparisons like `node >= 20` are prohibited because they mistakenly accept EOL releases.
- **Constraint:** Node.js must not be installed or upgraded during AUTO-02R2. Environment remediation occurs after explicit Founder approval.

### 5.3 Windows OS Helpers Policy (Correction C24)
"Dependency-Free Node.js ESM" means **zero third-party npm runtime dependencies**. It does not require Node standard libraries to re-implement low-level operating system security primitives.
- The orchestrator may invoke trusted, built-in Windows OS utilities:
  - `icacls.exe` (Windows DACL management for user-only private directories)
  - `taskkill.exe` (reliable Windows process tree termination `/T /F`)
  - `PowerShell.exe` (process start-time and PID validation)
  - `git.exe` (repository and worktree inspection)
- **Safety Invariants for OS Helpers:**
  1. Fixed executable paths rooted in `%SystemRoot%\System32\` or verified PATH.
  2. Structured argument vectors (`execFile` / `spawn`) with zero shell interpolation of untrusted text.
  3. Strict exit code and stderr checking.
  4. Zero secret tokens or passwords passed in command-line arguments.

### 5.4 Proposed Runtime Decision: Option B — Dependency-Free Node.js ESM (ADR-AUTO-009)
- **Status:** `PROPOSED_PENDING_FOUNDER_APPROVAL`
- **Proposal:** Implement the orchestrator core as pure, dependency-free Node.js ESM modules, supported by canonical TypeScript declaration files (`.d.ts`). Final architectural adoption remains subject to explicit Founder review.

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

export type CancellationMethod =
  | "PROVIDER_GRACEFUL"
  | "STDIN_INTERRUPT"
  | "PROCESS_TERMINATE"
  | "WINDOWS_PROCESS_TREE_TERMINATE"
  | "TIMEOUT_ABORT";

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
  readonly eventLogPath: string;
  readonly rawLogPath: string | null;
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
  readonly methodUsed: CancellationMethod;
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
   * Issues platform-aware cancellation (provider-graceful -> process tree terminate).
   */
  cancel(runId: string): Promise<CancelResult>;

  /**
   * Collects, normalizes, and validates the final agent execution result.
   */
  collectResult(runId: string): Promise<AgentResult>;
}
```

---

## 9. AgentTask Specification & Writer Lock Invariant (Correction C21)

The `AgentTask` object encapsulates all execution parameters, safety boundaries, file write rules, and context requirements passed to an adapter.

### Lock Requirement Invariant (Correction C21)
- **Rule:** If `mode === "WRITE"`, the writer lock is **MANDATORY**.
- A task cannot declare `mode: "WRITE"` and `requiresWriterLock: false`. The preflight validator enforces this invariant and rejects any contradictory task contract with diagnostic `PREFLIGHT_BLOCKED_INVALID_TASK_CONTRACT`.

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
  readonly requiresWriterLock: boolean; // Must be true when mode === "WRITE"

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

## 10. AgentResult Specification & Machine-Enforced Verification Boundary (Correction C10, C19, C20)

The `AgentResult` represents the normalized post-execution artifact collected by the orchestrator.
1. `executionOutcome` tracks child process behavior.
2. `verificationOutcome` tracks independent quality gate verification.
3. `exitCode` is typed as `number | null` because terminated processes on Windows/Node yield `null`.
4. `rawLogPath` is typed as `string | null` because raw logs are disabled by default.

```typescript
export type ResultStatus =
  | "SUCCESS"
  | "FAILED"
  | "BLOCKED"
  | "TIMED_OUT"
  | "CANCELLED"
  | "QUOTA_EXHAUSTED"
  | "FORBIDDEN_MUTATION_DETECTED"
  | "PARTIAL_MUTATION_BLOCKED"
  | "MALFORMED_OUTPUT";

export type ExecutionOutcome =
  | "PROCESS_COMPLETED"
  | "PROCESS_FAILED"
  | "TIMED_OUT"
  | "CANCELLED"
  | "RATE_LIMITED";

export type VerificationOutcome =
  | "VERIFIED_PASSED"
  | "VERIFICATION_FAILED"
  | "VERIFICATION_SKIPPED_READONLY"
  | "PENDING_VERIFICATION";

export interface AgentResult {
  // Run Metadata
  readonly taskId: string;
  readonly agent: "codex" | "antigravity" | "zcode" | "mock";
  readonly agentVersion: string;
  readonly runId: string;
  readonly status: ResultStatus;

  // Machine-Enforced Dual Outcomes
  readonly executionOutcome: ExecutionOutcome;
  readonly verificationOutcome: VerificationOutcome;

  // Temporal Metrics
  readonly startedAt: string; // ISO 8601
  readonly finishedAt: string; // ISO 8601
  readonly durationMs: number;
  readonly exitCode: number | null; // null if terminated via signal/taskkill

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

  // Audit References (Normalized Layer 1 Only by default)
  readonly eventLogPath: string;
  readonly rawLogPath: string | null;
  readonly rawLogSha256: string | null;
}
```

---

## 11. Process State Machine & Extended Lock Lifetime (Correction C13)

### 11.1 Lock Lifetime Invariant (Correction C13)
For every `WRITE` task:
```text
WRITER_LOCK_LIFETIME =
before agent mutation begins
THROUGH
RUNNING (process execution)
THROUGH
COLLECTING (output capture & git delta check)
THROUGH
VERIFYING (forbidden-path check & independent tests)
UNTIL
terminal outcome and evidence snapshot are securely finalized
```
The lock is **never** released upon process exit. It is retained continuously through collection and verification to prevent a race where a second writer alters the worktree before verification finishes.

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
               ┌───────────────┐        Metadata Missing or Mismatch
               │   PREFLIGHT   ├──────────────────────────────────────┐
               └───────┬───────┘                                      │
                       │ Preflight PASSED                             ▼
                       ▼                        ┌──────────────────────────────────────────┐
               ┌───────────────┐                │            TERMINAL FAILURES:            │
               │     READY     │                │ - CONTEXT_METADATA_INSUFFICIENT          │
               └───────┬───────┘                │ - CONTEXT_MISMATCH                       │
                       │ Request Lock           │ - BLOCKED                                │
                       ▼                        │ - FORBIDDEN_MUTATION_BLOCKED             │
              ┌─────────────────┐  Contention   │ - PARTIAL_MUTATION_BLOCKED               │
              │ WAITING_FOR_LOCK├──────────────►│ - CAPABILITY_MISSING                     │
              └────────┬────────┘               │ - QUOTA_BLOCKED                          │
                       │ Lock Acquired          │ - TIMED_OUT                              │
                       ▼                        │ - CANCELLED                              │
               ┌───────────────┐                │ - FAILED                                 │
               │    RUNNING    │                └────────────────────▲─────────────────────┘
               │ (Holds Lock)  ├────────Failure / Timeout / Crash────┤
               └───────┬───────┘                                     │
                       │ Process Exits                               │
                       │ (AGENT_EXECUTION_FINISHED)                  │
                       ▼                                             │
               ┌───────────────┐        Parse Failure /              │
               │  COLLECTING   ├────────Forbidden Mutation───────────┤
               │ (Holds Lock)  │                                     │
               └───────┬───────┘                                     │
                       │ Normalized                                  │
                       ▼                                             │
               ┌───────────────┐        Quality Gate /               │
               │   VERIFYING   ├────────Test Failure─────────────────┘
               │ (Holds Lock)  │
               └───────┬───────┘
                       │ Verification PASSED (TASK_VERIFIED)
                       ▼
               ┌───────────────┐
               │   COMPLETED   │
               │(Release Lock) │
               └───────────────┘
```

### 11.2 State Machine Transition Table

| Current State | Event / Trigger | Target State | Invariant Actions |
| :--- | :--- | :--- | :--- |
| `CREATED` | Task contract ingested | `DISCOVERING` | Validate contract schema; parse `taskId`, `agent`, `mode`. |
| `DISCOVERING` | Agent runtime resolved | `PREFLIGHT` | Verify binary presence and probe version capabilities. |
| `DISCOVERING` | Agent not found | `CAPABILITY_MISSING` | **FAIL CLOSED**. Human escalation required. |
| `PREFLIGHT` | Preflight checks pass | `READY` | Verify clean worktree, branch matching, authority docs. |
| `PREFLIGHT` | Branch metadata missing | `CONTEXT_METADATA_INSUFFICIENT` | **FAIL CLOSED** (`PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT`). |
| `PREFLIGHT` | Branch metadata mismatch | `CONTEXT_MISMATCH` | **FAIL CLOSED** (`PREFLIGHT_BLOCKED_CONTEXT_MISMATCH`). |
| `PREFLIGHT` | WRITE task has lock=false| `FAILED` | **FAIL CLOSED** (`PREFLIGHT_BLOCKED_INVALID_TASK_CONTRACT`). |
| `READY` | Lock requested | `WAITING_FOR_LOCK` | Compute canonical worktree lock key. |
| `WAITING_FOR_LOCK` | Exclusive lock acquired | `RUNNING` | Create lock file with `wx` flag; record owner PID and `lockInstanceId`. |
| `WAITING_FOR_LOCK` | Lock contention timeout | `BLOCKED` | Do not overwrite active lock. Report active owner PID and instance ID. |
| `RUNNING` | Execution exceeds timeout | `TIMED_OUT` | Execute Windows tree termination; retain lock; run mutation check; finalize evidence; release lock. |
| `RUNNING` | Rate limit response | `QUOTA_BLOCKED` | Terminate process; enter provider `COOLDOWN`; run mutation check; finalize evidence; release lock. |
| `RUNNING` | Non-zero exit code | `FAILED` | Capture stderr; run mutation check; finalize evidence; release lock. |
| `RUNNING` | Exit code 0 | `COLLECTING` | Process finished (`AGENT_EXECUTION_FINISHED`). **RETAIN LOCK**. |
| `COLLECTING` | Result parse success | `VERIFYING` | Validate JSON schema; check changed file boundaries; **RETAIN LOCK**. |
| `COLLECTING` | Forbidden path mutated | `FORBIDDEN_MUTATION_BLOCKED`| Freeze worktree; capture diff; **RETAIN LOCK** until snapshot finalized; release lock; no retry. |
| `COLLECTING` | Malformed output | `FAILED` | Mark `MALFORMED_OUTPUT`; finalize evidence; release lock. |
| `VERIFYING` | Quality gates pass | `COMPLETED` | Independent test run passes (`TASK_VERIFIED`). Finalize evidence snapshot; **RELEASE LOCK**. |
| `VERIFYING` | Test / gate fails | `FAILED` | Record gate failure evidence; finalize evidence snapshot; **RELEASE LOCK**. |

---

## 12. Preflight Validation Contract & Explicit Metadata Comparator (Correction C6, C21, C23)

Before any execution agent process is launched, the preflight validator executes 11 non-negotiable checks:

1. **Repository & Worktree Existence:** Verify repository root and worktree root exist on the local filesystem.
2. **Branch Identity Integrity:** Verify `git rev-parse --abbrev-ref HEAD` matches the target task contract branch.
3. **Baseline Ancestry Verification:** If `expectedHeadSha` is specified, verify `git rev-parse HEAD` matches exactly.
4. **Task Contract Presence:** Verify `tasks/CURRENT_TASK.md` exists and is readable.
5. **Branch / Task Identity Consistency (Explicit Metadata Comparator):**
   - Requires explicit metadata fields in `tasks/CURRENT_TASK.md`: `TASK_ID`, `EXPECTED_BRANCH`, `BASE_SHA`, `STAGE`.
   - Strictly validates `actualBranch === taskContract.EXPECTED_BRANCH`.
   - If metadata missing: `PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT`.
   - If metadata conflicts: `PREFLIGHT_BLOCKED_CONTEXT_MISMATCH`.
6. **Task Mode & Lock Invariant (Correction C21):**
   - If `task.mode === "WRITE"`, verify `task.requiresWriterLock === true`. If false, fail preflight with `PREFLIGHT_BLOCKED_INVALID_TASK_CONTRACT`.
7. **Runtime Version Compatibility (Correction C23):**
   - Verify Node.js is not an EOL release. If executing on EOL Node (e.g. Node 20 or Node 25), fail preflight with `PREFLIGHT_BLOCKED_EOL_RUNTIME`.
8. **Mandatory Universal Core Presence:** Confirm all 6 core documents exist: `AGENTS.md`, `docs/INDEX.md`, `docs/CURRENT_STATE.md`, `tasks/CURRENT_TASK.md`, `docs/codex/KONFRM_MASTER_RULES.md`, and the active task contract.
9. **Agent Installation Health:** Confirm the selected agent binary exists, is executable, and its version satisfies compatibility boundaries.
10. **Lock Availability:** Confirm no active, live-process lock exists for the targeted worktree.
11. **Working Directory Hygiene:** If the task mode is `WRITE`, verify no uncommitted changes exist in tracked files outside the task scope.

---

## 13. Worktree-Aware External Single-Writer Lock Contract

### 13.1 Canonical Worktree Lock Identity (Correction C4, C25, C26)
Locks reside strictly outside the Git repository in `%LOCALAPPDATA%\KONFRM\orchestrator\locks\`.
To guarantee robust identity resolution resilient against Windows path aliases, symlinks, 8.3 short names, and casing variations:

1. Resolve the canonical realpath of the worktree root:
   ```text
   CANONICAL_WORKTREE_REALPATH = fs.realpathSync.native(path.resolve(worktreeRoot))
   ```
2. Resolve the canonical realpath of the shared git common directory without depending on process CWD (Correction C25):
   ```text
   RAW_COMMON_DIR = execSync('git -C "<worktreeRoot>" rev-parse --path-format=absolute --git-common-dir', { encoding: 'utf8' }).trim()
   RESOLVED_COMMON_DIR = path.isAbsolute(RAW_COMMON_DIR) ? RAW_COMMON_DIR : path.resolve(worktreeRoot, RAW_COMMON_DIR)
   CANONICAL_GIT_COMMON_DIR = fs.realpathSync.native(RESOLVED_COMMON_DIR)
   ```
3. Normalize Windows casing and directory separators (uppercase drive letter, forward slashes).
4. Construct the canonical identity input:
   ```text
   LOCK_ID_INPUT = canonicalGitCommonDir + "\n" + canonicalWorktreeRealpath
   ```
5. Derive the deterministic lock key using the **full 64-character lowercase SHA-256 hex digest** (Correction C26):
   ```text
   LOCK_KEY = crypto.createHash('sha256').update(LOCK_ID_INPUT, 'utf8').digest('hex')
   LOCK_FILE = %LOCALAPPDATA%\KONFRM\orchestrator\locks\lock_<LOCK_KEY>.json
   ```
- **Invariant:** The branch name is **never** part of the lock identity. The worktree remains locked to the writer even if the branch changes unexpectedly during execution.

### 13.2 Atomic Acquisition Protocol
```javascript
import fs from 'node:fs';
import crypto from 'node:crypto';

function acquireLock(lockPath, lockMetadata) {
  try {
    const lockInstanceId = crypto.randomUUID();
    const payload = { ...lockMetadata, lockInstanceId };
    // 'wx' flag: Open for writing, fails if path exists (O_CREAT | O_EXCL)
    const fd = fs.openSync(lockPath, 'wx');
    fs.writeFileSync(fd, JSON.stringify(payload, null, 2), 'utf8');
    fs.closeSync(fd);
    return { acquired: true, lockMetadata: payload };
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
  readonly lockKey: string; // Full 64-char SHA-256 hex digest
  readonly lockInstanceId: string; // Unique random UUID generated per acquisition
  readonly worktreePath: string;
  readonly canonicalWorktreeRealpath: string;
  readonly canonicalGitCommonDir: string;
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

### 13.4 Race-Safe Stale Lock Recovery (Correction C5)
- **Rule:** A lock is **never** deleted purely because its elapsed time exceeds a threshold.
- **Race-Safe Protocol:**
  1. *Read Snapshot:* Read current lock metadata and record its `lockInstanceId` and `ownerPid`.
  2. *Liveness Proof:* Query OS (`Get-Process -Id <pid>`). Prove that PID no longer exists or process creation `StartTime` differs from `ownerStartTime` (PID recycling detected).
  3. *Pre-Reclaim Re-Read:* Re-read the lock file from disk. Verify that `lockInstanceId` still matches the observed dead instance.
  4. *Atomic Removal:* Execute an atomic filesystem rename moving the verified stale lock to `%LOCALAPPDATA%\KONFRM\orchestrator\locks\quarantine\lock_<LOCK_KEY>_<lockInstanceId>.json`. If the rename fails (another process won race), abort takeover immediately.
  5. *Exclusive Re-Acquisition:* Attempt standard atomic acquisition (`wx` flag) to create the new lock file with a fresh `lockInstanceId`.
  6. *Winner Confirmation:* Only the process that successfully creates the new file proceeds to execution.

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
- **Prompt Transport:** Standard input (stdin) piping preferred to reduce process table exposure.
- **Stream Capture:** Captures JSON/JSONL output from stdout; captures diagnostic telemetry from stderr.
- **Cancellation (Correction C18):** On Windows, issues process tree termination via `taskkill.exe /T /F /PID <pid>` after provider graceful timeout expires.

### 15.2 Antigravity Adapter Specification (Correction C16)
- **Binary Discovery:** Scans `%LOCALAPPDATA%\agy\bin\agy.exe` and PATH.
- **Verified Capabilities Only:** The adapter uses only CLI flags established and verified during AUTO-01 auditing:
  - `-p / --print` (prints response to stdout non-interactively)
  - `--input-format text` (or `stream-json` if probed)
  - `--output-format json` (structured output wrapper)
  - `--json-schema <schemaFile>` (schema constraints)
  - `--add-dir <worktreePath>` (directory targeting)
  - `--conversation <id>` / `--continue` (session continuation)
- **Forbidden Unverified Flags:** Flags not present in `--help` (such as hypothetical `--prompt-file` or `--json`) are **strictly prohibited**.
- **Transport Profile:** If stdin streaming is not verified for the installed version, prompt is passed via verified `-p "<prompt>"` invocation or piped stdin using verified `--input-format text`.
- **Permission Governance:** The dangerous flag `--dangerously-skip-permissions` is **forbidden** by default.
- **Cancellation:** Uses Windows process tree termination (`taskkill.exe /T /F /PID <pid>`).

### 15.3 Z Code Adapter Specification (Correction C17)
- **Dynamic Path Discovery:**
  - Bundled runtime asset is located dynamically via `%LOCALAPPDATA%\Programs\ZCode\resources\glm\zcode.cjs`.
  - Node runner fallback:
    ```text
    node.exe "%LOCALAPPDATA%\Programs\ZCode\resources\glm\zcode.cjs" [flags]
    ```
- **Version Compatibility Probe:** Runs `node zcode.cjs --version` before each run. If the interface changes following a desktop update, triggers dynamic rediscovery.
- **Turn Limiting:** Passes `--max-turns <n>` where supported to prevent runaway turn loops.
- **app-server Status (Correction C17):** `app-server` mode is designated a **`FUTURE_CAPABILITY_CANDIDATE`**. V1 does not use or guess undocumented IPC ports.
- **V1 Fallback Chain:**
  1. Primary: Direct bundled CLI execution (`node zcode.cjs`).
  2. Fallback: Path rediscovery across known install roots if binary moved.
  3. Terminal: If unavailable/incompatible, transition to `CAPABILITY_MISSING`.

---

## 16. Quota, Budget, and Provider Health Model

### 16.1 Quota Confidence States & Prohibitions (Correction C12)
Because no machine-readable quota API exists locally for any agent:
- `QuotaConfidence` is permanently tagged `UNKNOWN` at initial launch.
- Currently observed quota presentation is GUI/Web-oriented; this is documented as `PROGRAMMATIC_QUOTA_ACCESS = NOT_FOUND`, not `UNSUPPORTED`.
- The orchestrator is strictly prohibited from scraping web cookies or reverse-engineering private endpoints.
- Local surrogate budgets govern execution deterministically:

```typescript
export interface LocalTaskBudget {
  readonly maxDurationMs: number;       // Default: 600,000 (10 mins)
  readonly maxTurnsAllowed: number;     // Default: 15 turns
  readonly maxProcessRetries: number;   // MAX_AUTOMATIC_TRANSIENT_RETRIES = 1
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

### 16.3 Mutation-Aware Retry & Cooldown Protocol (Correction C11, C15, C28)
- **Invariant:** `MAX_AUTOMATIC_TRANSIENT_RETRIES = 1`.
- **Mandatory `POST_FAILURE_MUTATION_CHECK` (Correction C15):**
  Whenever a task fails, times out, or receives a rate-limit error, the supervisor inspects the worktree against its pre-run snapshot (branch, HEAD, git status porcelain):
  1. *READ_ONLY Task:* May execute 1 transient retry or route to eligible fallback agent.
  2. *WRITE Task with PROVEN ZERO MUTATION:* If and only if the worktree is proven bit-for-bit unchanged from its pre-run snapshot, 1 transient retry or fallback may proceed.
  3. *WRITE Task with ANY or UNKNOWN Mutation:* **NO AUTOMATIC RETRY. NO AUTOMATIC FALLBACK.** The orchestrator transitions immediately to `PARTIAL_MUTATION_BLOCKED`, freezes the worktree, retains the writer lock until evidence snapshot is saved, and requires human intervention.
- **Rate-Limit Cooldown:** On rate-limit response, the provider enters `COOLDOWN` (default 15 minutes). No busy loops, no credit purchases.

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

| Tool / Framework | Intended Architectural Role | Orchestrator Extension Hook | Status in AUTO-02R2 |
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

## 19. Prompt Transport, Logging & Environment Security

### 19.1 Prompt Transport Security (Correction C8)
To significantly **REDUCE** (not universally eliminate) prompt exposure in operating system process monitor listings (`Get-Process`, Task Manager):
- **Transport Preference Order:**
  1. *Standard Input (stdin):* Direct stream piping from orchestrator to agent child process.
  2. *Supported Structured IPC:* Local socket or domain IPC where available.
  3. *Restricted Temporary Prompt File:* Stored in the orchestrator private runtime directory under `%LOCALAPPDATA%\KONFRM\orchestrator\runs\<RUN_ID>\prompt_<RUN_ID>.tmp` with Windows DACL restricted exclusively to the current user SID. Must be deleted immediately once no longer needed.
  4. *Command Line Argument:* Permitted only if no safer method is supported by the provider.

### 19.2 Two-Layer Logging Architecture (Correction C7)
```text
┌────────────────────────────────────────────────────────────────────────┐
│                   TWO-LAYER LOGGING ARCHITECTURE                       │
├────────────────────────────────────────────────────────────────────────┤
│ LAYER 1: NORMALIZED AUDIT EVENTS (Shared / Git-Eligible Summaries)     │
│ Path: %LOCALAPPDATA%\KONFRM\orchestrator\events\event_<runId>.json     │
│ Content: Redacted, bounded (<64KB), task metadata, SHA delta, status. │
│ Rules: ALWAYS ENABLED. Zero secrets; zero prompt bodies.               │
├────────────────────────────────────────────────────────────────────────┤
│ LAYER 2: RAW PROVIDER ARTIFACTS (Local-Only / Ephemeral)              │
│ Status: DISABLED BY DEFAULT (RAW_PROVIDER_LOGGING = false)            │
│ Enabled: ONLY during controlled debugging runs via explicit flag.     │
│ Content: Complete raw stdout/stderr logs, process telemetry.          │
│ Rules: Never committed to Git; user-ACL restricted; bounded retention.│
└────────────────────────────────────────────────────────────────────────┘
```
- **Sanitization & Redaction Engine:** Always active. Regex patterns scrub Supabase JWTs (`[REDACTED_JWT]`), Bearer tokens (`[REDACTED_TOKEN]`), and API key signatures before any event is saved to Layer 1.

### 19.3 Child Process Environment Inheritance & Isolation (Correction C9)
- **Rule:** The orchestrator must not blindly inject new secrets into child processes.
- **Provider Authentication:** Uses each provider's existing authenticated local mechanism (ChatGPT subscription, Google account session, Z.AI OAuth).
- **Environment Allowlist:** The supervisor constructs a minimal environment block containing essential system variables (`PATH`, `SYSTEMROOT`, `TEMP`, `USERPROFILE`, `HOMEDRIVE`, `HOMEPATH`, `APPDATA`, `LOCALAPPDATA`, and provider config directories).
- **Prohibitions:** Full environment listings must never be written to logs. Application secrets from `.env` files are never copied into task prompts or child process environment blocks.

### 19.4 Run Descriptor Security (Correction C27)
- Persistent run descriptors (`runs/run_<runId>.json`) **MUST NOT** serialize raw prompt bodies by default.
- Descriptors record prompt metadata only: `promptSource`, `promptSha256`, `promptByteLength`, and temporary file paths while active. Full prompt bodies are never persisted in normalized metadata.

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
│   ├── lock_<LOCK_KEY>.json    # Active single-writer lock files (64-char hex key)
│   └── quarantine/             # Stale or reclaimed locks preserved for audit
│
├── runs/
│   └── run_<runId>.json        # Run descriptor (stores prompt metadata, NOT full prompt)
│
├── events/
│   └── event_<runId>.json      # Layer 1 sanitized audit events
│
├── logs/                       # Present only when raw logging is explicitly enabled
│   └── run_<runId>/
│       ├── stdout.log          # Raw standard output
│       ├── stderr.log          # Raw standard error
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
  "version": "1.2.0",
  "execution": {
    "defaultTimeoutMs": 600000,
    "maxProcessRetries": 1,
    "lockLeaseDurationMs": 300000,
    "heartbeatIntervalMs": 10000,
    "cooldownDurationMs": 900000
  },
  "logging": {
    "enableRawProviderLogging": false,
    "debugLogRetentionDays": 3,
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

## 22. Failure Handling & Conservative Non-Destructive Matrix (Correction C14, C15, C18, C28)

The orchestrator is an execution supervisor, not a destructive cleaner. It **NEVER** runs automatic destructive Git repairs (`git restore`, `git reset`, `git clean`) after a write failure. Any uncertain write mutation halts execution and requires human intervention:

| Scenario / Failure Trigger | Terminal / Intermediate State | Automatic Action | Retry Allowed? | Fallback Allowed? | Escalation Condition |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Agent binary disappears** | `CAPABILITY_MISSING` | Invalidate cache; run dynamic discovery | No | Yes (to eligible peer) | Agent missing after rediscovery |
| **Agent version incompatible** | `CAPABILITY_MISSING` | Log version mismatch; halt execution | No | Yes | Version outside supported range |
| **JSON output malformed** | `FAILED` | Capture raw output; run mutation check; release lock | No | No | Malformed JSON on non-zero exit |
| **Authentication expired** | `BLOCKED` | Mark provider `AUTH_EXPIRED`; halt | No | No | Requires manual user login |
| **Quota / Rate Limit reached** | `QUOTA_BLOCKED` | Enter provider `COOLDOWN`; run mutation check | No | Yes (if zero mutation) | Rate limit across all agents |
| **Agent process hangs / timeout**| `TIMED_OUT` | Execute Windows tree termination; mutation check | Yes (zero mutation only) | Yes (zero mutation only) | Hangs on second attempt or any mutation |
| **Non-zero exit (syntax/compile)**| `FAILED` | Collect stderr; mutation check; report failure | No | No | Code defect must be diagnosed |
| **Forbidden file mutated** | `FORBIDDEN_MUTATION_BLOCKED` | Stop process; retain lock; capture evidence; freeze | **NO AUTO-REVERT** | No | Security violation; manual recovery |
| **Partial write failure / crash** | `PARTIAL_MUTATION_BLOCKED` | Stop process; retain lock; capture evidence; freeze | **NO RETRY** | **NO FALLBACK** | Worktree partially mutated |
| **Branch metadata missing** | `CONTEXT_METADATA_INSUFFICIENT` | Abort preflight; release lock | No | No | Missing EXPECTED_BRANCH in contract |
| **Branch metadata mismatch** | `CONTEXT_MISMATCH` | Abort preflight; release lock | No | No | actualBranch !== EXPECTED_BRANCH |
| **HEAD changed during execution**| `CONTEXT_MISMATCH` | Abort run; capture git reflog | No | No | Concurrent commit detected |
| **Writer lock disappears/altered**| `BLOCKED` | Terminate process tree immediately | No | No | Mutual exclusion compromised |
| **Process crash (SIGSEGV/OOM)** | `FAILED` | Capture OS crash code; mutation check | Yes (zero mutation only) | Yes (zero mutation only) | Crash with partial mutation blocked |
| **FOUNDER_DECISION_REQUIRED** | `BLOCKED` | Preserve worktree; halt execution | No | No | Human decision required |

---

## 23. Verification Boundary (`AGENT_EXECUTION_FINISHED` vs `TASK_VERIFIED`)

A fundamental flaw of naive automation is treating the agent's exit code or self-reported success as task completion. The KONFRM Orchestrator enforces a strict verification boundary:

```text
                  ┌──────────────────────────────┐
                  │    Agent Process Exits 0     │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │ Status: AGENT_EXECUTION_     │
                  │         FINISHED             │
                  │ executionOutcome:            │
                  │   PROCESS_COMPLETED          │
                  │ verificationOutcome:         │
                  │   PENDING_VERIFICATION       │
                  │ (Holds Writer Lock)          │
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
                  │ (Executes Under Writer Lock) │
                  └──────────────┬───────────────┘
                                 │
                   ┌─────────────┴─────────────┐
                   │                           │
                   ▼ PASSED                    ▼ FAILED
        ┌───────────────────┐         ┌───────────────────┐
        │ Status: COMPLETED │         │  Status: FAILED   │
        │ verificationOutcome:        │ verificationOutcome:│
        │   VERIFIED_PASSED │         │   VERIFICATION_   │
        │ (TASK_VERIFIED)   │         │   FAILED          │
        │ (Release Lock)    │         │ (Release Lock)    │
        └───────────────────┘         └───────────────────┘
```

1. **Execution Outcome:** When an agent finishes with exit code 0, its execution outcome is recorded as `PROCESS_COMPLETED`. The task is **not** complete.
2. **Lock Retained Through Verification:** The writer lock is held continuously through verification to isolate the candidate worktree from concurrent writes.
3. **Independent Test Execution:** The orchestrator independently executes project verification scripts (`npm run check`, `npm run test`, `git diff --check`) in the worktree under the existing lock.
4. **Verification Outcome:** Only when all independent checks succeed without regression or forbidden file edits is the verification outcome marked `VERIFIED_PASSED`, the run promoted to `COMPLETED` (`TASK_VERIFIED`), and the lock released.

---

## 24. Architecture Decision Records (ADRs)

### ADR-AUTO-001: Neutral Orchestrator Hub
- **Context:** Deciding whether Codex, Antigravity, or Z Code should host the master coordination logic.
- **Decision:** Adopt an independent, neutral orchestration process.
- **Consequences:** Eliminates vendor lock-in; enables objective evaluation; preserves Codex for scarce high-value review.

### ADR-AUTO-002: CLI-First / GUI Last Resort (Correction C22)
- **Context:** Determining how the orchestrator interacts with local AI coding agents.
- **Decision:** Prioritize headless CLI process invocation and standard I/O streams. In V1, GUI automation is disabled (`V1: GUI_AUTOMATION = DISABLED`). GUI automation is recognized as a genuine LAST RESORT if all safe native mechanisms fail, but requires explicit Founder approval and a dedicated ADR before enablement.
- **Consequences:** Deterministic, scriptable process lifecycle; avoids window scraping while leaving an approved architectural pathway if native interfaces are permanently blocked.

### ADR-AUTO-003: External Worktree-Aware Writer Lock
- **Context:** Preventing concurrent writers across Git worktrees without relying on `.git/konfrm_writer.lock`.
- **Decision:** Store locks in `%LOCALAPPDATA%\KONFRM\orchestrator\locks\` keyed by `canonicalGitCommonDir + "\n" + canonicalWorktreeRealpath`, using atomic creation (`wx`), PID start-time validation, and full 64-char SHA-256 hash.
- **Consequences:** Safe across Git worktrees; resilient against stale locks; zero Git status pollution.

### ADR-AUTO-004: Dynamic Agent Discovery Precedence
- **Context:** Avoiding machine-specific hard-coded binary paths across different developer workstations.
- **Decision:** Implement 5-stage discovery: Override → PATH → Vendor Roots → Capability Probe → `NOT_FOUND`.
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
- **Context:** Managing subscription boundaries and financial risk.
- **Decision:** The orchestrator is strictly prohibited from triggering paid API calls or credit purchases upon quota exhaustion.
- **Consequences:** Absolute financial safety; rate limits halt execution or route to available subscription quotas within policy.

### ADR-AUTO-009: Orchestrator Runtime (Correction C1, C23)
- **Status:** `PROPOSED_PENDING_FOUNDER_APPROVAL`
- **Proposal:** Dependency-Free Node.js ESM.
- **Preferred Runtime:** Node.js 24.x LTS.
- **Supported Initial Runtime:** Active Node.js LTS releases (Node 22.x LTS and Node 24.x LTS) verified by AUTO-03 compatibility tests.
- **EOL Runtime Policy:** Fail preflight for production/real-agent orchestrator operation on EOL Node releases (including Node 20 and Node 25).
- **Consequences:** Runs immediately on modern supported Node LTS without extra npm dependencies or compile steps. Awaits explicit Founder approval before AUTO-03.

---

## 25. AUTO_GAP_001 Analysis & Resolution Strategy (Correction C6)

### Observed Reality
During post-AUTO-01 auditing, inspection of active branch `phase5/customer-c2-discovery` (HEAD `d0591bc3f3657cf0ee466606bfb91f3bd681e8e0`) revealed:
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
- The preflight validator enforces explicit metadata comparison:
  ```javascript
  if (!taskContract.EXPECTED_BRANCH || !taskContract.TASK_ID) {
    return {
      status: "CONTEXT_METADATA_INSUFFICIENT",
      diagnostic: "PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT",
      error: "tasks/CURRENT_TASK.md lacks required EXPECTED_BRANCH or TASK_ID metadata"
    };
  }
  if (actualBranch !== taskContract.EXPECTED_BRANCH) {
    return {
      status: "CONTEXT_MISMATCH",
      diagnostic: "PREFLIGHT_BLOCKED_CONTEXT_MISMATCH",
      error: `Active branch '${actualBranch}' does not match EXPECTED_BRANCH '${taskContract.EXPECTED_BRANCH}'`
    };
  }
  ```
- **Action for AUTO-02R2:** Do **not** modify `phase5/customer-c2-discovery` or its `tasks/CURRENT_TASK.md`.
- **Recommendation:** Schedule a dedicated, isolated repository governance task (`GOV-TASK-ALIGNMENT`) to align the task pointer on `phase5/customer-c2-discovery` under Founder review.

---

## 26. Explicit Non-Goals for AUTO-02R2

To maintain absolute architectural focus and safety, the following activities are strictly out of scope:
1. Writing implementation code or creating executable orchestrator scripts.
2. Spawning live agents against the KONFRM codebase.
3. Installing or upgrading Node.js versions on the host machine.
4. Modifying application code in `customer-app`, `owner-app`, `admin-app`, or `backend`.
5. Modifying Supabase schema, migrations, or Cloudflare Worker configurations.
6. Installing external frameworks (Caveman, Repomix, Spec Kit, gstack, BMAD, Pocock skills).
7. Scraping private web dashboards or browser cookies for quota telemetry.
8. Modifying `docs/BRAIN_SYNC_PROTOCOL.md`.
9. Touching or altering the active Phase 5 worktree.

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

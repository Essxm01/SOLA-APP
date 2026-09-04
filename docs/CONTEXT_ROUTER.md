# KONFRM Quota-Aware Context Router

**Status:** CANDIDATE — BRIDGE REVIEW IN PROGRESS
**Founder Direction:** APPROVED
**Document Version:** PENDING FINAL APPROVAL
**Date:** 2026-09-04
**Authority:** Operational Governance — Context Management & Token Conservation

---

## 1. Context Conservation Principle

To operate efficiently within existing subscription quotas (particularly for Z Code Lite and resource-constrained agents), agents must **never** load the entire documentation repository at once. Context loading must be strictly layered, selective, and branch-aware.

```
┌────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: MANDATORY UNIVERSAL CORE                                      │
│ Qualitative Load: LOW                                                  │
│ Load on NEW TASK / SESSION / CONTEXT RESET; refresh for closure.       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: TASK-SPECIFIC DOMAIN CONTEXT                                  │
│ Qualitative Load: MEDIUM                                               │
│ Load ONLY the single domain touched by the task.                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: RISK-BASED VERIFICATION CONTEXT                               │
│ Qualitative Load: MEDIUM                                               │
│ Load ONLY when touching security, financial, or pre-closure review.    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LAYER 4: PHASE TRANSITION & STRATEGIC PLANNING CONTEXT                 │
│ Qualitative Load: HIGH                                                 │
│ Load ONLY when selecting next phase or executing macro closure.        │
│ NEVER load during routine micro-task implementation.                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Layer 1: Mandatory Universal Core (LOW Load)

Every agent must load this core sequence in exact order:
- **Once at the beginning of a NEW TASK, NEW SESSION, or CONTEXT RESET.**
- **Again if a relevant dynamic authority materially changed.**
- **As a focused refresh of required dynamic/closure authorities before final task closure.**

Do **NOT** reload all six core documents on every tool call, subagent call, reasoning round, `/goal` round, or retry inside the same uninterrupted task. Within an active task context, reuse already verified context unless concrete evidence indicates it has become stale.

### Exact Mandatory Core Sequence:

1. **`AGENTS.md`** — Universal engineering laws, safety bounds, single-writer rule, fail-closed principles.
2. **`docs/INDEX.md`** — Master document router and authority definitions.
3. **`docs/CURRENT_STATE.md`** — Current branch baseline, implemented areas, and known technical debt.
4. **`tasks/CURRENT_TASK.md`** — Active task lock, branch pointer, and execution boundary.
5. **`docs/codex/KONFRM_MASTER_RULES.md`** — The 16 non-negotiable master rules (MR-01 through MR-16).
6. **Active Task Contract** (e.g. `tasks/P2_3_OWNER_API_CONTRACT.md` or `tasks/BS_02_BRAIN_SYNCHRONIZATION.md`) — The specific approved contract defining objective, tests, and non-goals.

*Preflight Branch Check:* The agent must check the local Git branch and verify that `tasks/CURRENT_TASK.md` matches the branch's assigned `TASK_ID` and records an authentic `BASE_MAIN_SHA`.

---

## 3. Layer 2: Task-Specific Domain Context (MEDIUM Load)

After loading the Universal Core, load **only** the single domain relevant to the active task:

### A. Database / Persistence / Migrations / RPCs
- Load: `docs/DATABASE.md`
- Load: Applicable migration files in `backend/database/migrations/`
- Load: `docs/ARCHITECTURE.md` *only* if the boundary between Worker REST and direct Supabase changes.

### B. Backend API / Workers / Routing / Contracts
- Load: `docs/ARCHITECTURE.md`
- Load: Applicable TypeScript contract files in `backend/server/src/contracts/`
- Load: Target route handlers in `backend/server/src/`

### C. Booking / Availability / Financial / Wallet / Escrow
- Load: `docs/BUSINESS_RULES.md`
- Load: `docs/codex/KONFRM_CROSS_APP_MATRIX.md` (if state crosses Customer, Owner, and Admin)
- Note: Financial formulas (MR-13: 20% deposit commission, first-night deposit, 0% remaining commission) are governed here.

### D. Frontend / Mobile Apps / UI / UX
- Load: `DESIGN_SYSTEM/GOVERNANCE.md` (Design tokens, Cairo typography, RTL, button/touch targets)
- Load: `docs/codex/KONFRM_UI_QA_PROTOCOL.md` (Playwright visual and interactive standards)
- Load: Role-specific guidance in `DESIGN_SYSTEM/` as needed. Skip all backend/database docs.

### E. External Integrations (Payments / SMS / Cloudflare / Storage)
- Load: `docs/INTEGRATIONS.md`
- Load: Environment configuration templates (`.env.example`)
- Never attempt live networking without explicit authorization.

---

## 4. Layer 3: Risk-Based Context (MEDIUM Load)

Load these documents **only** when a task touches critical security, financial reconciliation, or is preparing for closure/review:

- **`docs/codex/KONFRM_QUALITY_GATES.md`** — Loaded during pre-review verification to check syntax, unit, integration, and security gates.
- **`docs/codex/KONFRM_DECISION_CONFLICTS.md`** — Loaded when a source contradiction or specification ambiguity is encountered.
- **`docs/DECISIONS.md`** — Loaded when questioning an intentional architectural pattern (ADR-001 through ADR-009).
- **`docs/codex/P1_1_SCHEMA_RLS_BASELINE_REPORT.md`** — Loaded when auditing RPC permissions, RLS policies, or public role grants.

---

## 5. Layer 4: Phase Transition & Strategic Context (HIGH Load)

These files are large and strategic. They must **never** be loaded during everyday task implementation. Load them **only** during macro roadmap transitions, cross-phase sequencing, or high-level architecture reviews:

- **`KONFRM_EXECUTION_DEPENDENCY_ORDER.md`** — Used for selecting the next task or understanding graph prerequisites.
- **`KONFRM_MASTER_PROJECT_CONTEXT.md`** — Used when clarifying foundational market logic, product vision, or Arabic business terminology.
- **`docs/BRAIN_SYNC_PROTOCOL.md`** — Used when ingesting new strategic decisions from ChatGPT or formatting handoff envelopes.
- **`docs/codex/KONFRM_FOUNDER_OPERATING_CONTEXT.md`** — Used when aligning on Founder communication style and delegation rules.
- **`docs/codex/KONFRM_COMPLETION_MATRIX.md`** & **`docs/codex/KONFRM_EXECUTION_MAP.md`** — Used to inspect overall cross-app slice readiness.

---

## 6. Anti-Patterns to Avoid

1. **The "Load Everything" Anti-Pattern:** Reading all 20+ markdown files on a simple UI fix or unit test task. This exhausts token limits, dilutes critical instructions, and causes model confusion.
2. **The "Silent Assumption" Anti-Pattern:** Guessing a business rule or financial split because `BUSINESS_RULES.md` wasn't loaded. If the task touches money, loading `BUSINESS_RULES.md` is mandatory.
3. **The "Out-of-Order Core" Anti-Pattern:** Reading task files before understanding `AGENTS.md` and `KONFRM_MASTER_RULES.md`.

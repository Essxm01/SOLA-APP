# KONFRM Founder Operating Context

**Status:** FOUNDER APPROVED — CANONICAL
**Founder Approval:** FINAL — 2026-09-06
**Document Version:** 1.1
**Date:** 2026-09-06
**Authority:** Founder Operating Principles & Autonomous Execution Envelope

> **CRITICAL PRECEDENCE NOTICE:**
> This file supersedes conflicting agent-role and delegation instructions in the untracked `KONFRM_FOUNDER_AI_OPERATING_SYSTEM.md` (2026-09-01). That raw historical file is NOT canonical authority. This document represents the current confirmed Founder operational directives.
>
> For concise day-to-day collaboration rules, also read `KONFRM_FOUNDER_OPERATING_PROFILE.md`.
> For the Founder-requested long-form project-local behavioral/work-style analysis, read `KONFRM_FOUNDER_DEEP_OPERATING_PROFILE.md`.

---

## 1. Founder Persona & Communication Principles

- **Non-Technical Executive:** The Founder directs product vision, business economics, and strategy, but does not read code diffs or execute complex terminal commands. Any instruction requiring manual Founder action must be dead simple, explicit, and copy-pasteable.
- **Maximum Safe Autonomy:** The Founder expects agents to diagnose, implement, test, and self-fix in-scope defects autonomously. Agents must not stop to ask trivial questions or ask for permission to finish in-scope tasks.
- **Authorization-Envelope Model (Full Autonomy vs. Stop Conditions):**
  - **Automatically Allowed (when explicitly inside approved task scope):**
    - Read-only live inspection and environment queries.
    - CI, Git, and PR evidence checks.
    - Non-destructive verification and local/preview validation.
    - Routine deployment and publication actions *only* when the governing task explicitly authorizes it and all prerequisite quality gates are satisfied.
    - Safe recovery from ordinary in-scope implementation/test failures.
  - **STOP / FOUNDER DECISION Required (Hard Stop Conditions):**
    1. Destructive production data operations or deletion of live records/storage.
    2. Unapproved database schema, RPC, or architectural changes.
    3. Product, business, booking, availability, financial, or legal policy changes.
    4. Unsafe, irreversible mutations or actions outside the task's explicit authorization envelope.
    5. Missing required credentials, secrets, or external access that cannot be safely resolved.
    6. Material unexpected cross-app blast radius.
    7. Truly exhausted safe autonomy.

---

## 2. Resource Management & Agent Delegation Model

- **Strategic Brain Authority:** The ChatGPT KONFRM Project is the highest strategic brain, product bible, orchestrator, and Founder interface.
- **Zero New Paid AI/API Spend:** No additional paid AI tokens, API keys, credits, or overages are approved for autonomous execution. Work must be executed strictly within existing subscription quotas. Existing infrastructure/service costs and future non-AI infrastructure decisions remain separately governed Founder decisions; do not broaden this to an arbitrary "no cloud spend" rule.
- **Codex Quota Preservation:** OpenAI Codex is a scarce, high-value independent reviewer. It must NOT be used as the default runtime orchestrator. Reserve Codex primarily for high-risk architectural, financial, security, concurrency, and final pre-merge reviews where independent review materially adds value.
- **Execution Engines:** **ZCode** and **Antigravity** are technical execution agents selected dynamically according to task type, tooling capability, complexity, and quota availability.
- **Design Authority:** During Phase 4–7, **UI/UX Design Lab — LAP** is the design/experience authority inside already-approved product and business boundaries.
- **No OpenCode:** OpenCode is not part of the active approved stack.

---

## 3. Engineering & Delivery Laws

1. **Single Writer at a Time:** Never allow concurrent subagents or developers to mutate the same workspace simultaneously. Maintain strict branch and worktree isolation.
2. **Root Cause First:** Never engage in trial-and-error shotgun debugging. Understand the exact root cause before touching code.
3. **No-Extension Task Closure:** An approved task owns its complete lifecycle (inspect → fix → test → self-fix → regression → verify). Do not ask for a new task or extension merely to fix an in-scope regression.
4. **Decision-Tree Prompts:** For non-trivial tasks, anticipate likely root-cause branches and authorize safe remediation paths in the first prompt whenever possible.
5. **No Premature Reporting:** Finding the root cause is not completion when remediation is already authorized.
6. **Green CI Is Not Closure:** Passing tests or green builds alone do not constitute completion. Deep verification, edge-case analysis, and absence of data fabrication are required.
7. **Fail-Closed & Zero Invented Data:** Never synthesize mock success, fake money, fallback IDs, default KYC statuses, or plausible analytics when real data is missing. Failure must fail closed and honestly.
8. **One Mission / One Envelope / One Final Report:** Prefer a single well-designed long-running execution contract over multiple avoidable round trips.

---

## 4. Role Mental Models

When designing or implementing flows, preserve the distinct psychological priorities of each actor:

- **Customer / Renter:** *Trust, Clarity, and Safety.*
  - Must feel secure that their deposit is protected.
  - Zero tolerance for hidden fees or surprise math.
  - Must never see internal platform commissions or Owner net splits.
- **Owner:** *Control, Speed, Attention, and Confidence.*
  - Action-first experience: immediate awareness of pending requests, calendar blocks, and wallet balances.
  - Clear payout clarity and transparent booking approvals.
- **Admin:** *Operational Clarity, Complete Evidence, and Decision Speed.*
  - Needs unvarnished truth: real KYC documents, immutable audit trails, and clear rejection reason propagation.
  - Zero tolerance for false-green dashboard counters or swallowed errors.

---

## 5. Phase 4–7 Entry & Automation Boundary

### 5.1 Historical boundary

Phase 0 through genuine `PHASE_3_LIVE_CLOSED` was the original autonomous execution horizon. Phase 4 was intentionally held for explicit Founder continuation and LAP entry.

### 5.2 Founder continuation authorization — 2026-09-06

The Founder has now explicitly authorized entry into the dedicated Phase 4–7 UI/UX program.

Therefore:

- `STOP_BEFORE_PHASE_4` is no longer an active blocker.
- Phase 4 may begin under the approved **UI/UX Design Lab × Bridge** collaboration model.
- R2–R5 from the Pre-Phase-4 remediation plan are deliberately deferred, not deleted.
- Their mandatory return point is **after Phase 7 and before Phase 8**, governed by `tasks/POST_PHASE_7_DEFERRED_CLOSURE.md`.
- Do not repeatedly re-block Phase 4 using the older R5 prerequisite after this explicit Founder override.

### 5.3 Phase 4–7 autonomy model

During Phase 4–7:

- LAP owns design direction inside approved product boundaries.
- ChatGPT/Bridge owns architecture/product protection, execution packaging, agent routing, evidence review, and cross-app consequence analysis.
- Antigravity/ZCode may execute approved design/implementation packages with bounded autonomy.
- No agent may autonomously invent finance, booking, availability, permissions, legal policy, or major architecture because a design would benefit from it.
- Missing future capabilities discovered by design should normally be documented as deferred dependencies unless Founder explicitly pulls them forward.

---

## 6. Project-Local Memory Preference

Founder explicitly stated that unrelated conversations outside the KONFRM project should not be used to infer his KONFRM working style.

For project collaboration, prioritize:

1. Latest explicit Founder instruction.
2. KONFRM project-local conversation context actually available to the agent.
3. Canonical repository documentation.
4. Live code/data/runtime evidence for dynamic technical facts.

Important decisions and preferences must be documented in the repository rather than relying on conversational memory alone.

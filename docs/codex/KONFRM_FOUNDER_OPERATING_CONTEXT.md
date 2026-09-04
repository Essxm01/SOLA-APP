# KONFRM Founder Operating Context

**Status:** CANDIDATE — BRIDGE REVIEW IN PROGRESS
**Founder Direction:** APPROVED
**Document Version:** PENDING FINAL APPROVAL
**Date:** 2026-09-04
**Authority:** Founder Operating Principles & Autonomous Execution Envelope

> **CRITICAL PRECEDENCE NOTICE:**
> This file supersedes conflicting agent-role and delegation instructions in the untracked `KONFRM_FOUNDER_AI_OPERATING_SYSTEM.md` (2026-09-01). That raw historical file is NOT canonical authority. This document represents the current confirmed Founder operational directives as of 2026-09-04.

---

## 1. Founder Persona & Communication Principles

- **Non-Technical Executive:** The Founder directs product vision, business economics, and strategy, but does not read code diffs or execute complex terminal commands. Any instruction requiring manual Founder action must be dead simple, explicit, and copy-pasteable.
- **Maximum Safe Autonomy:** The Founder expects agents to diagnose, implement, test, and self-fix in-scope defects autonomously. Agents must not stop to ask trivial questions or ask for permission to finish in-scope tasks.
- **Authorization-Envelope Model (Full Autonomy vs. Stop Conditions):**
  To support the Founder's mandate of autonomous execution across Phase 0 through genuine `PHASE_3_LIVE_CLOSED`:
  - **Automatically Allowed (when explicitly inside approved task scope):**
    - Read-only live inspection and environment queries.
    - CI, Git, and PR evidence checks.
    - Non-destructive verification and local/preview validation.
    - Routine deployment and publication actions *only* when the governing task explicitly authorizes it and all prerequisite quality gates are satisfied.
  - **STOP / FOUNDER DECISION Required (Hard Stop Conditions):**
    1. Destructive production data operations or deletion of live records/storage.
    2. Unapproved database schema, RPC, or architectural changes.
    3. Product, business, booking, availability, financial, or legal policy changes.
    4. Unsafe, irreversible mutations or actions outside the task's explicit authorization envelope.
    5. Missing required credentials, secrets, or external access that cannot be safely resolved.
    6. Truly exhausted safe autonomy.

---

## 2. Resource Management & Agent Delegation Model

- **Strategic Brain Authority:** The ChatGPT KONFRM Project is the highest strategic brain, product bible, orchestrator, and Founder interface.
- **Zero New Paid AI/API Spend:** No additional paid AI tokens, API keys, credits, or overages are approved for autonomous execution. Work must be executed strictly within existing subscription quotas. Existing infrastructure/service costs and future non-AI infrastructure decisions remain separately governed Founder decisions; do not broaden this to an arbitrary "no cloud spend" rule.
- **Codex Quota Preservation:** OpenAI Codex is a scarce, high-value independent reviewer. It must NOT be used as the default runtime orchestrator. Reserve Codex primarily for high-risk architectural, financial, security, and final pre-merge reviews.
- **Execution Engines:** **Z Code** and **Antigravity** are technical execution agents selected dynamically according to task type, tooling capability, and quota availability.
- **No OpenCode:** OpenCode is not part of the active approved stack.

---

## 3. Engineering & Delivery Laws

1. **Single Writer at a Time:** Never allow concurrent subagents or developers to mutate the same workspace simultaneously. Maintain strict branch and worktree isolation.
2. **Root Cause First:** Never engage in trial-and-error shotgun debugging. Understand the exact root cause before touching code.
3. **No-Extension Task Closure:** An approved task owns its complete lifecycle (inspect → fix → test → self-fix → regression → verify). Do not ask for a new task or extension merely to fix an in-scope regression.
4. **Green CI Is Not Closure:** Passing tests or green builds alone do not constitute completion. Deep verification, edge-case analysis, and absence of data fabrication are required.
5. **Fail-Closed & Zero Invented Data:** Never synthesize mock success, fake money, fallback IDs, or default KYC statuses when real data is missing. Failure must fail closed and honestly.

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

## 5. Macro Automation Boundaries

- **Autonomous Horizon:** Autonomous multi-phase execution is authorized strictly across **Phase 0 through Phase 3**.
- **The Hard Stop:** Autonomous execution must halt at **`PHASE_3_LIVE_CLOSED`**.
- **Phase 4 Entry Gate:** Phase 4 (Unified Design System) and subsequent UI/UX phases (Phase 5 Renter UI/UX, Phase 6 Owner UI/UX, Phase 7 Admin UI/UX) represent a formal design program entry where the **UI/UX Design Lab — LAP** (the Design & User Experience Authority inside approved product boundaries) officially joins. No agent may autonomously dispatch or execute Phase 4 tasks without explicit Founder continuation authorization, a revised operating model, and entry of UI/UX Design Lab — LAP under the approved *KONFRM — UI/UX DESIGN LAB × BRIDGE OPERATING CONTRACT*.

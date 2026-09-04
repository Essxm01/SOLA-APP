# KONFRM Brain Synchronization Protocol

**Status:** CANDIDATE — BRIDGE REVIEW IN PROGRESS
**Founder Direction:** APPROVED
**Document Version:** PENDING FINAL APPROVAL
**Date:** 2026-09-04
**Authority:** Governance Master — Interface between Strategic Brain & Repository Memory

---

## 1. Strategic Brain Model

KONFRM operates on a two-tier knowledge hierarchy designed to prevent split authority while enabling maximum safe execution autonomy:

```
                  ┌────────────────────────────────────────┐
                  │                FOUNDER                 │
                  │   - Final Product/Business/Arch/Scope  │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │         ChatGPT KONFRM Project         │
                  │    (Strategic Brain / Orchestrator)    │
                  │  - Contextual strategic reasoning      │
                  │  - Founder conversational interface    │
                  │  - Product & technical orchestration   │
                  │  - Reviews agent results & reports     │
                  │  - Compiles Founder policy decisions   │
                  └───────────────────┬────────────────────┘
                                      │ Ingestion /
                                      │ Dispatch
                                      ▼
                  ┌────────────────────────────────────────┐
                  │       Durable Repository Memory        │
                  │  - Machine & coding-agent-readable     │
                  │  - Executable contracts & constraints  │
                  │  - Published & candidate realities     │
                  │  - Quality gates & verification rules  │
                  └───────────────────┬────────────────────┘
                                      │
                         ┌────────────┴────────────┐
                         ▼                         ▼
         ┌───────────────────────────────┐ ┌──────────────────────┐
         │     Z Code / Antigravity      │ │        Codex         │
         │ (Technical Execution Agents)  │ │ (Scarce Independent  │
         │ - Selected by task/quota      │ │   High-Risk Review)  │
         └───────────────────────────────┘ └──────────────────────┘
```

1. **The Founder:**
   - The final Product, Business, Financial, Architecture, and priority authority.
   - All strategic policies, commercial models, and macro sequencing originate with the Founder.
2. **ChatGPT KONFRM Project (The Strategic Brain / Orchestrator):**
   - Serves as the strategic brain, product and technical orchestrator, and interactive Founder interface.
   - Holds the macro context, Founder story, strategic market posture, and conversational evolution.
   - Analyzes, recommends, reconciles, and compiles Founder decisions into durable repository truth.
   - Must NOT independently invent a new Product, Business, Financial, Legal, Booking, Availability, or major Architecture policy.
   - Does NOT manage low-level line-by-line syntax or local ephemeral file state.
3. **The Repository (Durable Shared Execution Memory):**
   - Translates strategic intent into machine-readable, unambiguous, fail-closed contracts, tests, and schemas.
   - Must NOT compete with ChatGPT as an independent product authority.
   - Contains all currently approved durable rules, known open decisions, stop conditions, and execution constraints necessary for safe autonomous work.
   - If a required policy remains unresolved: `FOUNDER_DECISION_REQUIRED`. Never invent the missing rule simply to keep automation running.
4. **Execution Agents:**
   - Execute strictly under repository authorities; they may never invent business, booking, financial, availability, or UX policy.

---

## 2. Decision Ingestion Rule

When the Founder makes a final execution-impacting decision in the ChatGPT Project, it must not remain stranded in conversational chat memory. It must be routed into its canonical repository owner without creating multi-file duplication bloat:

| Decision Domain | Canonical Repository Destination | Rule |
| :--- | :--- | :--- |
| **Business / Marketplace / Invariant** | `docs/BUSINESS_RULES.md` (and `docs/codex/KONFRM_MASTER_RULES.md` if universal) | Ingest formulas, fees, lifecycle states. Never duplicate in ad-hoc docs. |
| **Architectural / Infrastructure** | `docs/DECISIONS.md` / `docs/ARCHITECTURE.md` | Create new ADR entry (ADR-XXX) with context, decision, consequences. |
| **Active Task / Branch Baseline** | `docs/CURRENT_STATE.md` / `tasks/CURRENT_TASK.md` | Record current baseline without overclaiming unverified live states. |
| **Source Conflict / Evidence Gap** | `docs/codex/KONFRM_DECISION_CONFLICTS.md` | Add entry to conflict ledger (DC-XX); preserve original sources. |
| **Roadmap / Dependency Order** | `KONFRM_EXECUTION_DEPENDENCY_ORDER.md` | Record sequence clarifications without renumbering Phase 0–22. |
| **Agent Roles / Operating Governance**| `AGENTS.md` / `docs/BRAIN_SYNC_PROTOCOL.md` | Record agent routing, safety bounds, and execution constraints. |

---

## 3. Conversation Knowledge Compilation

Conversational transcripts must never be dumped wholesale into the repository. When distilling knowledge from ChatGPT into repository memory, apply strict compilation filters:

- **COMPILE**: Current approved decisions, durable architectural lessons, fail-closed patterns, confirmed edge-case rules, and explicit open questions.
- **DISCARD**: Abandoned brainstorming, temporary thought experiments, speculative future monetization, informal banter, and unapproved suggestions.
- **MARK**: When a previous decision is superseded by a newer Founder directive, mark it as `SUPERSEDED` with the date/context rather than silently rewriting historical records.

---

## 4. Authority Precedence

When evaluating truth or resolving contradictions, all agents and review systems must adhere strictly to the project's governing precedence:

1. **Latest explicit Founder decision** (in active task contract or dated instruction)
2. **Newer approved execution override**
3. **Confirmed Master rule** (`docs/codex/KONFRM_MASTER_RULES.md`)
4. **Approved Product, UX, Architecture, or Design specification**
5. **Genuinely verified live behavior as implementation evidence** (never assumed product intent)
6. **Current code and migrations as implementation and persistence reality**
7. **Mocks, constants, comments, legacy plans, defaults, and old TODOs**

*Rule Zero:* The presence of a value in code or mocks (e.g. `24h`, `5000`, `15%`) does NOT make it a business rule.

---

## 5. Branch-Aware Truth & Freshness

Repository truth is distributed across Git branches by design. A difference between branches is normal candidate development, not knowledge corruption:

- **`main` Branch:**
  - The published, shared repository baseline.
  - Documents on `main` reflect only merged, verified, and published capabilities.
- **Feature / Validation / Tooling Branches:**
  - Isolated candidate states relative to a recorded `BASE_MAIN_SHA`.
  - `tasks/CURRENT_TASK.md` and candidate docs record in-progress candidate state.
  - A candidate revision must never masquerade as published `main` state.
  - **Evidence-Based Status Semantics:**
    - `PUBLISHED`: Requires actual publication / merge evidence for the referenced baseline.
    - `LIVE_VERIFIED`: Requires exact deployed revision + actual live scenario/behavior evidence. It is evidence-based, not branch-name-based. (A candidate revision may possess live verification evidence if an authorized, exact deployment revision was actually tested, but it still must not claim to be the published `main` baseline).
    - `CLOSED`: Requires satisfying the governing task's complete closure gates.
    - `CANDIDATE`: An active or completed candidate revision pending integration or publication.

---

## 6. Current Agent Operating Override — 2026-09-04

The following operational directives supersede all older agent-role descriptions (including raw sections in older Founder OS notes):

1. **Strategic Brain:** ChatGPT KONFRM Project is the highest strategic brain, orchestrator, and Founder interface.
2. **Executive Control:** The Founder is the ultimate authority.
3. **Execution Engines:** **Z Code** and **Antigravity** are technical execution agents, selected according to task complexity, tool capability, and active subscription quota.
4. **Independent Reviewer:** **Codex** is a scarce, high-value independent reviewer reserved primarily for high-risk, security, financial, and final pre-merge reviews. Codex is NOT the default runtime orchestrator.
5. **No OpenCode:** OpenCode is not part of the approved stack.
6. **No Paid API Spend:** No additional paid AI/API/token/credit/overage spending is approved for autonomous execution. Agents must operate strictly within existing subscription quotas. Quota exhaustion must never trigger automated credits or paid overages.
7. **Quota vs. Roadmap:** Quota limitations dictate execution pacing, but never alter the Product Roadmap or Quality Gates.
8. **Autonomous Scope Hard Stop:** Autonomous execution across Phase 0 through Phase 3 is authorized only up to **`PHASE_3_LIVE_CLOSED`**.
9. **Phase 4 Boundary Gate:** Phase 4 (Unified Design System) and subsequent UI/UX phases represent a formal design program entry where the **UI/UX Design Lab — LAP** (the Design & User Experience Authority inside approved product boundaries) officially joins. Phase 4 and beyond requires a formal Founder continuation authorization, a revised operating model, and entry of UI/UX Design Lab — LAP under the approved *KONFRM — UI/UX DESIGN LAB × BRIDGE OPERATING CONTRACT*.

---

## 7. Closure Principle

In the KONFRM engineering system:

- **Green Build / Green CI alone is NOT closure.**
- An agent's self-assertion that a task is done is NOT closure.
- Closure requires meeting the exact, verifiable criteria set out in `docs/codex/KONFRM_QUALITY_GATES.md` (syntax, unit tests, integration tests, security boundaries, adversarial review, and explicit regression verification).
- When a task touches live systems, closure requires verified live proof against a specific deployment revision.

---

## 8. Report Handshake Envelope

All execution agents completing a task must return their findings to ChatGPT and the repository using this standardized report envelope:

```markdown
### TASK_HANDSHAKE_ENVELOPE
- **TASK_ID**: [e.g. P2.3, BS-02]
- **BRANCH**: [e.g. implementation/p2-3-owner-api-contract]
- **BASE_SHA**: [Commit SHA on main from which branch was cut]
- **START_SHA**: [Initial commit of the task run]
- **FINAL_SHA**: [Final candidate commit produced]
- **RESULT**: [READY_FOR_BRIDGE_REVIEW | BLOCKED]
- **ROOT_CAUSE**: [Summary of core issue or mandate addressed]
- **FILES_CHANGED**: [List of created or modified file paths]
- **TESTS**: [Evidence of newly added / passing unit & integration tests]
- **REGRESSION**: [Full test suite regression execution results]
- **REVIEW_FINDINGS**: [Adversarial, privacy, and architectural review check]
- **LIVE_EVIDENCE**: [Specific deployment revision tested, or NONE]
- **OPEN_GAPS**: [Any known technical debt or deferred items]
- **FOUNDER_DECISION_REQUIRED**: [Explicitly NONE, or exact decision question]
- **NEXT_RECOMMENDED_ACTION**: [Precise next step for the orchestrator]
```

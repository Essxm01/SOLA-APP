# KONFRM — Execution Dependency Order Clarification

**Status:** Founder Approved
**Date:** 2026-09-03
**Purpose:** Clarify how the fixed PHASE 0–22 roadmap is executed according to real product dependencies, without renumbering, deleting, replacing, or rewriting the existing roadmap.

---

# 1. Core Decision

The existing KONFRM macro roadmap:

`PHASE 0 → PHASE 22`

remains preserved exactly as the project's fixed Product / Delivery Roadmap.

This document does **not** replace:

- `خطة عمل التطبيق.txt`
- `KONFRM_MASTER_PROJECT_CONTEXT.md`
- `KONFRM_MASTER_RULES.md`
- existing Business Rules
- approved Product decisions
- existing Design / UX decisions
- Quality Gates
- UI QA Protocol
- historical phase records

Instead, this document adds an **Execution Dependency Layer** above the existing roadmap.

The roadmap should no longer be interpreted as a strict waterfall where:

> Phase N must always be fully closed before any work related to Phase N+1 can be considered.

The correct operating model is:

> **Fixed Macro Phase IDs + Dependency-Driven Execution**

The PHASE numbers preserve product organization and history.

Actual execution order must respect:

- technical dependencies
- product dependencies
- business invariants
- security prerequisites
- cross-app dependencies
- testability
- regression risk
- live-verification requirements

This is consistent with the existing rule that detailed execution boundaries should be derived from dependency, risk, and acceptance criteria rather than arbitrary task order.

---

# 2. The Roadmap Is a Dependency Graph, Not a Simple Queue

From now on, KONFRM should be understood as:

> **A dependency graph with fixed Macro Phase IDs.**

Not:

> **A queue of numbers that must always execute sequentially.**

A later phase may provide a prerequisite needed earlier.

When that happens:

- do not renumber the roadmap;
- do not silently move the whole phase;
- do not rewrite historical documents;
- execute only the required prerequisite;
- record why it moved forward;
- preserve the final full audit/consolidation phase in its original location.

This principle already matches KONFRM governance: newer explicit execution decisions may clarify implementation sequencing without erasing the original product roadmap.

---

# 3. Confirmed Core Sequence Before Design

The following order remains strongly sequential and should not be changed without a major new dependency:

## PHASE 0 — Baseline / Reality / Access Stabilization

Purpose:

Understand and stabilize the actual project before expanding it.

Must establish:

- current runtime reality;
- authentication access;
- environment correctness;
- deployment connectivity;
- major blockers.

---

## PHASE 1 — Database Backbone

Purpose:

Create and harden canonical persistence.

Core truths such as:

- identity;
- properties;
- media;
- availability;
- bookings;
- financial summaries;
- wallet/ledger

must have a real shared persistence model before higher layers rely on them.

---

## PHASE 2 — Backend Contracts

Purpose:

Expose the canonical system truth through explicit server contracts.

Frontends should:

> request and display truth.

The server/database should:

> own and enforce truth.

Phase 2 must not blindly implement every historical frontend interface.

Existing legacy/mock contracts are implementation evidence only and do not become Product Requirements automatically.

---

## PHASE 3 — Owner → Admin → Renter Vertical Slice

Purpose:

Prove that KONFRM is one connected system.

Required proof:

`Owner action → canonical backend/database → Admin consequence → Customer consequence`

The same entity must propagate across the three roles without:

- fake state;
- duplicate local truth;
- refresh hacks;
- fabricated data.

Only after this shared vertical slice is genuinely proven should the major UI/UX program begin.

---

# 4. PHASE 4–7 Remain the Dedicated UI/UX Program

The official Design Program remains:

- PHASE 4 — Unified Design System
- PHASE 5 — Renter UI/UX
- PHASE 6 — Owner UI/UX
- PHASE 7 — Admin UI/UX

These phases are led through the approved:

**UI/UX Design Lab × Bridge Operating Contract.**

Nothing in this execution clarification removes or replaces their role.

However:

> Design work must only design around capabilities that actually exist or are explicitly approved.

A future functional capability must not be pulled forward merely because a UX review discovers that it would be useful.

Missing future capabilities should be recorded as:

`Deferred Opportunity — Roadmap Phase X`

unless Founder explicitly changes the roadmap.

---

# 5. Core Functional Sequence After the UI/UX Program

The preferred functional dependency order remains:

## PHASE 8 — Booking Cross-App Integration

Must prove:

`Renter request`
→ `Owner receives same request`
→ `Owner approve/reject`
→ `Customer sees resulting state`

This is the foundation for transactional product behavior.

---

## PHASE 9 — Notifications

Notifications should follow real business events.

Examples:

- Booking requested.
- Owner approved.
- Owner rejected.
- Property approved.
- Property rejected.

Do not build a generic notification engine before the underlying events are trustworthy.

---

## PHASE 10 — Payment Prototype

Payment depends on the booking lifecycle.

Non-negotiable rule:

`PENDING_OWNER_APPROVAL`
→ Owner approval
→ `APPROVED_PENDING_PAYMENT`
→ payment
→ `CONFIRMED`

Payment must never become available before Owner approval.

The current finance rules remain unchanged:

- Deposit = actual first-night price.
- KONFRM commission = 20% of deposit only.
- Owner net deposit = 80%.
- Remaining balance = total - deposit.
- No commission on remaining balance.
- Customer never sees the internal finance split.

---

## PHASE 11 — Wallet / Payout

Full Wallet and Payout flows belong after real transactional money state exists.

Wallet/Payout must derive from canonical financial events.

They must never manufacture money from:

- property prices;
- frontend calculations;
- hardcoded balances;
- demo constants.

Infrastructure created earlier for canonical wallet/ledger persistence does not mean the full Phase 11 feature is considered complete early.

Foundation and feature completion are separate concepts.

---

## PHASE 12 — Chat

Chat follows established booking context.

Its position after the primary transaction chain is intentional.

Existing historical messaging routes do not mean the full Phase 12 product has been completed.

Chat remains:

> in-app only.

No ordinary UX may expose renter/owner phone numbers or external contact details.

---

## PHASE 13 — Cancellation / Disputes / Reviews

This phase correctly follows Booking + Payment + Wallet + communication context.

It must not invent unresolved policy.

Any unresolved:

- refund matrix;
- payment expiry;
- remaining-balance method;
- cancellation financial consequence

requires Founder decision before implementation.

Reviews remain eligible only after:

`COMPLETED`.

---

# 6. Security Is Continuous — PHASE 14 Is the Final Consolidated Security Pass

PHASE 14 must **not** be interpreted as:

> “Security starts here.”

Security is a continuous Quality Gate from the beginning of the project.

Whenever relevant, every earlier task must already review:

- authentication;
- authorization;
- ownership;
- IDOR;
- privacy;
- RPC privileges;
- RLS;
- Storage boundaries;
- financial leakage;
- secret handling;
- cross-account isolation.

Therefore:

## PHASE 14 means:

> **System-wide Security & Privacy Consolidation / Audit**

It exists to inspect the completed attack surface across the integrated prototype.

A security prerequisite may be pulled forward before Phase 14 when necessary.

Doing so does not mean Phase 14 is removed or completed early.

---

# 7. Edge Cases Are Continuous — PHASE 17 Is the Final Cross-System Failure Matrix

PHASE 17 must **not** be interpreted as:

> “We ignore failures until Phase 17.”

Every implementation task must already consider applicable failure modes such as:

- API failure;
- DB failure;
- stale state;
- unauthorized access;
- conflict;
- retries;
- double submission;
- race conditions;
- unavailable dates;
- state transition conflicts;
- network failure.

The mandatory project loop remains:

`Detect → Diagnose → Fix → Retest → Reinspect`

for in-scope defects.

Therefore:

## PHASE 17 means:

> **Final integrated Edge-Case & Failure-State Matrix**

It is where the full product is attacked systematically after most functionality is available.

---

# 8. Live Verification Is Continuous — PHASE 20 Is the Final Whole-System Release Verification

PHASE 20 must **not** be interpreted as:

> “We do not test Live until Phase 20.”

For every deployment-sensitive task:

> actual affected Live behavior must be verified at the time of publication.

CI/build success alone is insufficient.

Therefore:

## PHASE 20 means:

> **Final integrated deployment/revision verification for the completed prototype**

It verifies the final chain:

`GitHub`
→ `CI`
→ `Cloudflare Worker`
→ `Cloudflare Pages`
→ `Supabase`
→ `actual real user scenarios`

---

# 9. Important Execution-Order Correction — PHASE 18 Realistic Test Data

The original macro roadmap keeps:

`PHASE 18 — Realistic Test Data`

and its ID must remain unchanged.

However, its **execution dependency** must be clarified.

A realistic marketplace dataset is required before the final closure of:

- PHASE 15 — Visual Consistency Audit;
- PHASE 16 — Role UX Audit;
- PHASE 17 — Edge Cases & Failure States;
- PHASE 19 — End-to-End Testing.

Reason:

A nearly empty prototype cannot expose many real product problems.

Realistic data may reveal issues such as:

- cards breaking with long Arabic content;
- owner dashboards becoming overloaded;
- Admin queues becoming difficult to scan;
- wallet/ledger density problems;
- unusable filtering;
- information hierarchy failure;
- unrealistic Empty-state assumptions;
- cross-role state propagation problems.

Therefore the preferred execution precedence is:

`PHASE 18 realistic dataset preparation`
→ before final closure of
`PHASE 17 / 15 / 16`
→ then
`PHASE 19`.

This does **not** renumber any phase.

---

# 10. Two Levels of Test Data

KONFRM should use two separate concepts.

## A. Controlled Test Lane — Early

Required before the major UI/UX program.

Includes dedicated:

- Test Customer.
- Test Owner.
- Test Admin.
- Test properties.
- Test bookings.
- Test availability/state combinations.

Purpose:

Allow Design Lab / GPT Work / Bridge / engineering QA to exercise real user journeys safely.

Rule:

> **Test identities — Real product behavior.**

---

## B. Realistic Marketplace Dataset — PHASE 18

A larger dataset used for late-stage product validation.

May include:

- multiple Customers;
- multiple Owners;
- several properties per Owner;
- published/pending/rejected properties;
- multiple booking states;
- calendar blocks;
- notifications where implemented;
- wallet/ledger records;
- realistic Arabic text/images.

Purpose:

Test the product under realistic information density and state diversity.

---

# 11. Preferred Late-Stage Execution Precedence

Without changing original PHASE IDs, the preferred dependency order after transactional feature completion is:

`PHASE 14`
**Full Security & Privacy Consolidation**

↓

`PHASE 18`
**Realistic Marketplace Dataset**

↓

`PHASE 17`
**Full Edge / Failure Matrix**

↓

`PHASE 15`
**Final Visual Consistency Audit**

↓

`PHASE 16`
**Final Role UX Audit**

↓

`PHASE 19`
**Full End-to-End Scenario Testing**

↓

`PHASE 20`
**Final Live Revision Verification**

↓

`PHASE 21`
**Demo Polish**

↓

`PHASE 22`
**Final Product Blueprint / Handoff**

Important:

This is **execution precedence**, not roadmap renumbering.

---

# 12. PHASE 15 and PHASE 16 Are Final Audits, Not the First Time UX Is Reviewed

UI/UX quality must be reviewed whenever user-facing behavior changes.

Therefore:

- Phase 4–7 = major design and UX construction program.
- Every later visible task = proportional UI/UX QA.
- Phase 15 = final cross-product visual consistency audit.
- Phase 16 = final role-based UX audit.

They are final consolidation passes, not delayed UX responsibility.

---

# 13. Dependency Pull-Forward Rule

A task from a later macro phase may be executed early **only if it is a genuine prerequisite**.

Conditions:

1. The dependency is evidenced.
2. Only the required subset is pulled forward.
3. The whole future phase is not silently declared complete.
4. No unresolved Product/Business rule is invented.
5. The reason is recorded.
6. Regression impact is evaluated.
7. The original Macro Phase remains preserved for its full later audit/completion.

Example:

A security hardening task required by an early DB/API boundary may execute before Phase 14.

This means:

> Security prerequisite completed early.

It does **not** mean:

> PHASE 14 completed.

---

# 14. Future-Feature Protection Rule

The reverse rule is equally important.

An early task must not implement an entire later feature simply because:

- an old frontend interface expects it;
- legacy code contains a route;
- a mock already exists;
- UI would look better with it;
- a future feature appears convenient.

Examples:

During Phase 2 Owner contracts:

- do not build the full Notification Engine from Phase 9;
- do not build the full Payout system from Phase 11;
- do not complete Chat because historical endpoints exist;
- do not invent Dispute policies from Phase 13.

Instead:

- preserve truthful boundaries;
- eliminate or isolate fake behavior when it affects current product truth;
- defer full feature completion to its approved roadmap phase.

---

# 15. Foundation vs Feature Completion

A capability may have infrastructure before its official feature phase.

Examples:

- wallet tables/ledger may exist before Phase 11;
- message persistence may exist before Phase 12;
- notifications storage may exist before Phase 9.

This does not automatically mean the feature phase is complete.

Always distinguish:

**Foundation**
from
**Contract**
from
**Integrated Feature**
from
**UX Completion**
from
**Final Audit**

This distinction prevents double work while preserving roadmap integrity.

---

# 16. Closure Rule

A phase or task is not complete merely because code was written.

Relevant closure evidence may include:

- correct implementation;
- focused tests;
- regression tests;
- cross-role propagation;
- exact-head CI;
- independent review where risk warrants it;
- UI/UX QA where user-facing;
- exact Live scenario verification;
- updated current-state evidence.

Green CI alone is never sufficient.

---

# 17. Current Canonical Mental Model

The operating model from now on is:

```text
FIXED KONFRM PHASE 0–22 ROADMAP
                │
                ▼
       DEPENDENCY ANALYSIS
                │
                ├── prerequisites
                ├── risk
                ├── business rules
                ├── cross-app impact
                ├── testability
                └── live verification
                │
                ▼
      EXECUTION ORDER FOR TASK
                │
                ▼
            IMPLEMENT
                │
                ▼
       REGRESSION + REVIEW
                │
                ▼
        LIVE VERIFY IF NEEDED
                │
                ▼
             CLOSED
```

---

# 18. Final Founder Decision

The official KONFRM macro roadmap remains intact.

The approved interpretation is:

> **PHASE IDs define the Product Roadmap. Dependencies define the actual execution order.**

Do not renumber or rewrite the roadmap merely to satisfy dependency order.

Do not blindly execute by numerical order when it would create rework or violate a prerequisite.

The preferred high-level dependency sequence is:

```text
PHASE 0
Baseline / Reality

↓

PHASE 1
Database Backbone

↓

PHASE 2
Backend Contracts

↓

PHASE 3
Owner → Admin → Renter Vertical Slice

↓

PHASE 4–7
UI/UX Design Program

↓

PHASE 8
Booking Cross-App

↓

PHASE 9
Notifications

↓

PHASE 10
Payment

↓

PHASE 11
Wallet / Payout

↓

PHASE 12
Chat

↓

PHASE 13
Cancellation / Disputes / Reviews

↓

PHASE 14
Full Security & Privacy Consolidation

↓

PHASE 18
Realistic Marketplace Dataset

↓

PHASE 17
Full Edge / Failure Matrix

↓

PHASE 15
Final Visual Consistency Audit

↓

PHASE 16
Final Role UX Audit

↓

PHASE 19
End-to-End Scenarios

↓

PHASE 20
Final Live Revision Verification

↓

PHASE 21
Demo Polish

↓

PHASE 22
Product Blueprint / Handoff
```

With the permanent cross-cutting rule:

```text
Security
+
Failure handling
+
Regression
+
UI/UX QA
+
Live verification
```

are **continuous disciplines throughout the project**, while their later numbered phases remain the final full-system consolidation passes.

---

# 19. Non-Negotiable Preservation Rule

This clarification is additive.

It must never be used to:

- delete historical roadmap decisions;
- silently rewrite old phase documents;
- erase previous implementation history;
- change Business Rules;
- change financial logic;
- move future features forward without dependency evidence.

When a new contradiction is discovered:

> add a new decision/conflict record.

Do not silently rewrite history.

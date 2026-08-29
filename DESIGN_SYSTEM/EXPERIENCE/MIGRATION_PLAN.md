# Historical controlled UX migration recommendation — superseded for sequencing

> This 2026-08-23 recommendation is preserved to explain earlier migration order. It is not the current execution authority: Phase Zero established the subordinate PHASE 0–22 execution map in [`../../docs/codex/KONFRM_EXECUTION_MAP.md`](../../docs/codex/KONFRM_EXECUTION_MAP.md), where P0.1 is the recommended next phase. Do not treat the “first migration slice” below as active work.

No phase starts before Phase 0 approval. Each implemented slice must name user job, current pain, target UX, applicable design/experience contracts, business rules that cannot change, Founder acceptance steps and legacy exceptions removed.

| Phase | Slice | Why now | Guardrails |
|---|---|---|---|
| 0 | Founder review of `DECISIONS.json` / Arabic review pack | Separates product decisions from implementation defaults. | No UI change. |
| 1 | Admin validated entry + truthful overview state | Audit P0: stale local Admin shell and failed requests can look like authenticated/zero/stable operations. | Do not change Admin permissions, review rules or backend API. |
| 2 | Customer canonical property/payment-history failure states | Audit P0: failed reads can look like no properties/no payments. | Do not alter booking/payment math or Customer visibility rules. |
| 3 | Owner operational entry and Home action hierarchy | Founder-raised Splash concern plus Owner’s highest-frequency operational job. | Preserve Owner identity boundary, booking lifecycle and wallet math. |
| 4 | Customer property-to-booking journey composition | Discovery, dates, quote and request are the core Customer path. | Preserve canonical availability/quote/booking APIs and payment states. |
| 5 | Admin queues and review context | Apply desktop operational patterns after entry/state truthfulness is fixed. | Preserve FIFO property review, approvals, auditability and role permissions. |

The **recommended first migration slice** is Phase 1: Admin validated entry + truthful overview. It removes the highest-severity experience risk without redesigning queues or changing business logic. Owner Home/Splash remains the first role-composition slice after that correctness work.

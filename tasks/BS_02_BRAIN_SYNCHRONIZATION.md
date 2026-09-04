# BS-02 — Brain Synchronization: Durable Brain Layer Implementation

TASK_ID: BS-02
TASK_TYPE: TOOLING_GOVERNANCE
ROADMAP_PHASE: NONE
PRODUCT_SCOPE_CHANGE: NONE
EXECUTOR: Antigravity
BRANCH: tooling/brain-sync-bs02
BASE_MAIN_SHA: baecc9f7f9c16aafa1954ddf7aa6e3cead5c757a
REVIEW_GATE: Bridge Review / Founder Review

## Objective

Implement the durable repository brain synchronization layer. Establish canonical, machine-readable, and coding-agent-readable shared memory for autonomous execution across Phase 0 through Phase 3, without competing with the ChatGPT KONFRM Project as a product authority and without mutating product code or live systems.

## Allowed Files

- `KONFRM_EXECUTION_DEPENDENCY_ORDER.md` (exact tracked copy of Founder-approved source)
- `docs/BRAIN_SYNC_PROTOCOL.md` (bi-directional sync interface, ingestion rules, agent overrides)
- `docs/CONTEXT_ROUTER.md` (selective, quota-aware context loading matrix)
- `docs/codex/KONFRM_FOUNDER_OPERATING_CONTEXT.md` (durable Founder execution principles)
- `AGENTS.md` (branch-aware preflight, router links)
- `docs/INDEX.md` (routing entries for new documents)
- `docs/CURRENT_STATE.md` (reconcile stale Favorites note, record branch reality)
- `docs/codex/KONFRM_CURRENT_REALITY.md` (update stale routing header)
- `docs/codex/KONFRM_EXECUTION_MAP.md` (update stale header, link dependency order)
- `docs/codex/KONFRM_COMPLETION_MATRIX.md` (reconcile status cells and header)
- `docs/codex/KONFRM_RESCUE_BACKLOG.md` (reconcile RB-09 according to repository evidence)
- `tasks/CURRENT_TASK.md` (point to active BS-02 tooling task in isolated worktree)
- `tasks/BS_02_BRAIN_SYNCHRONIZATION.md` (this task contract)

## Forbidden Product Changes

- Absolutely NO changes to application code: `backend/`, `customer-app/`, `owner-app/`, `admin-app/`.
- Absolutely NO changes to migrations: `backend/database/migrations/*.sql`.
- Absolutely NO changes to dependencies, package configs, or lockfiles.
- Absolutely NO mutations to live environments (Supabase, Cloudflare, Storage).
- Absolutely NO changes to business rules, financial formulas, booking lifecycles, or UX flows.
- Absolutely NO merge to `main` and NO modification of active candidate branch `implementation/p2-3-owner-api-contract` or PR #14.

## Acceptance Criteria

1. ChatGPT Project remains explicitly highest strategic/contextual brain.
2. Repository becomes durable shared memory, not competing Product authority.
3. Current Founder execution policy is represented accurately (ChatGPT = Strategic Brain, Codex = scarce reviewer, Z Code/Antigravity = executors, no paid API, hard stop at `PHASE_3_LIVE_CLOSED`).
4. Raw old `KONFRM_FOUNDER_AI_OPERATING_SYSTEM.md` is NOT blindly promoted to current canonical authority.
5. `KONFRM_EXECUTION_DEPENDENCY_ORDER.md` is durably tracked and identical to approved source.
6. Mandatory context core includes `docs/INDEX.md` and follows exact sequence.
7. Branch-aware freshness is explicit.
8. Quota-aware selective context routing exists.
9. No product/business/financial rule changed (zero 15%/25%/75% legacy values).
10. Stale dynamic docs are factually reconciled without overclaiming live verification.
11. P2.3 remains candidate/open.
12. No product code or live environment changed.
13. Phase 4 cannot be autonomously entered without explicit Founder continuation authorization and LAP entry.

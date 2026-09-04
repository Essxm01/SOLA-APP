# KONFRM repository guide for coding agents

## Identity and map

KONFRM / كونفرم is a three-role vacation-rental product: Customer discovery and booking, Owner operations, and Admin review. Visible product branding is KONFRM; legacy `SOLA` names remain in infrastructure.

- Frontends: `customer-app/`, `owner-app/`, `admin-app/` (React 19, TypeScript, Vite)
- Backend: `backend/server/` (Node/TypeScript; also a Cloudflare Worker entry)
- Database and migrations: `backend/database/migrations/` (Supabase PostgreSQL is canonical)
- Design and experience authority: `DESIGN_SYSTEM/`
- Repository memory: `docs/`
- Active task contract: `tasks/CURRENT_TASK.md`
- Context router: `docs/CONTEXT_ROUTER.md`
- Brain sync protocol: `docs/BRAIN_SYNC_PROTOCOL.md`

## Mandatory context refresh before every execution task

Before implementing any approved task, read the mandatory core sequence in exact order:
1. This file (`AGENTS.md`)
2. `docs/INDEX.md`
3. `docs/CURRENT_STATE.md`
4. `tasks/CURRENT_TASK.md`
5. `docs/codex/KONFRM_MASTER_RULES.md`
6. Active task contract (when one exists)

Then use `docs/CONTEXT_ROUTER.md` to load only the selective domain authorities matching the task. Do not load all documentation files at once; preserve token quotas for execution and verification.

For substantial or cross-system work, also review `docs/codex/KONFRM_FOUNDER_OPERATING_CONTEXT.md` and the applicable current-reality, conflict, completion-matrix, rescue-backlog, and quality-gate documents named by the index.

Before editing, establish the objective, governing authorities, affected systems, non-negotiable rules, open decisions, evidence to verify, and explicit non-goals. Historical material, old code, mocks, constants, and prior behavior never silently override that current context.

Use this recovery prompt in a fresh session:

> Onboard yourself to this repository. Read AGENTS.md, docs/INDEX.md, docs/CURRENT_STATE.md, tasks/CURRENT_TASK.md, and docs/codex/KONFRM_MASTER_RULES.md. Follow docs/CONTEXT_ROUTER.md to selectively inspect only the code and additional documentation relevant to the active task. Do not modify anything until you understand the current task and affected architecture.

## Branch-aware preflight

Before trusting dynamic markdown or selecting work, perform a branch-aware reality check:

1. **Identify Branch & HEAD:** Run `git rev-parse --abbrev-ref HEAD` and `git rev-parse HEAD`.
2. **Identify Published Baseline:** Run `git rev-parse origin/main`.
3. **Verify Candidate Ancestry:** If on a feature, validation, or tooling branch, verify that the `BASE_MAIN_SHA` recorded in `tasks/CURRENT_TASK.md` is an ancestor of the branch. Verify that `tasks/CURRENT_TASK.md` reflects this branch's assigned `TASK_ID`.
4. **Distinguish Published Baseline from Candidate Reality:**
   - Files on `main` represent the shared published baseline.
   - Files on a feature branch represent isolated candidate state.
   - Candidate state must NEVER be claimed as `CLOSED`, `PUBLISHED`, or `LIVE_VERIFIED` on `main` until it passes all verification gates and is formally merged.
   - Branch divergence is normal Git lifecycle behavior, not knowledge corruption.

## Source-of-truth hierarchy

Use the governing precedence in `docs/codex/KONFRM_MASTER_RULES.md` and `docs/BRAIN_SYNC_PROTOCOL.md`:
1. Latest explicit Founder decision
2. Newer approved execution override
3. Confirmed rule in Master Project Context / Master Rules
4. Approved product, UX, architecture, or design specification
5. Verified live behavior as implementation evidence
6. Current code and migrations as implementation/persistence reality
7. Mocks, constants, comments, legacy plans, defaults, and old TODOs

Code and migrations remain implementation and persistence truth; a mismatch with product intent is a conflict to investigate, not a silent decision.

If sources conflict, investigate; do not silently choose or invent a rule. Mark unresolved facts as uncertain in `docs/codex/KONFRM_DECISION_CONFLICTS.md`.

## Working rules

- Make minimal, targeted changes; preserve unrelated work and backward compatibility unless the task explicitly changes it.
- Execute one approved task/phase at a time. Do not invent business, financial, legal, trust, identity, booking, or marketplace rules; record an unresolved decision instead.
- Follow existing architecture and patterns. Do not add dependencies, migrations, or platform changes without a demonstrated need.
- Supabase PostgreSQL is the source of truth. A persistence failure must fail honestly; never fabricate business success or fallback production data.
- Inspect migrations before schema work. The Cloudflare Worker uses a narrow SQL-to-Supabase REST compatibility adapter; preserve strict query matching and test the deployed path when touching it.
- Preserve authorization boundaries and canonical server-derived identity/ownership. Never accept client-provided ownership as authority.
- Never expose, commit, log, or document secrets. Use environment-variable names only.
- Run focused validation proportionate to the change, then complete functional, UI/UX, and adversarial self-review. A build or CI result alone is not proof of production behavior; deployment-sensitive work needs live evidence.
- Respect `DESIGN_SYSTEM/` for UI work. Apps consume it; no app is a design authority.
- An approved task owns its full safe in-scope lifecycle: inspect → diagnose → implement/fix → test → self-fix → retest → regression → context re-check → quality-gate review → closure. Do not require an extension or follow-up merely to finish an in-scope defect.
- Stop early only for an unresolved Founder/Product decision, unavailable required access, an approval-required destructive/live mutation, an explicitly unauthorized architecture/business/financial change, or an external dependency that cannot safely be resolved. Report the exact blocker, attempts, why safe autonomy is exhausted, and the minimum Founder action.

## Documentation ownership

`docs/INDEX.md` is the router. Keep a fact in its authoritative domain rather than copying it:

- product scope/terms → `docs/PROJECT.md`
- technical structure/deployment → `docs/ARCHITECTURE.md`
- persistence/schema → `docs/DATABASE.md`
- behavior invariants → `docs/BUSINESS_RULES.md`
- design routing → `docs/DESIGN_SYSTEM.md` and `DESIGN_SYSTEM/`
- external services/configuration constraints → `docs/INTEGRATIONS.md`
- durable rationale → `docs/DECISIONS.md`
- current handoff state → `docs/CURRENT_STATE.md`
- one active delivery contract → `tasks/CURRENT_TASK.md`
- strategic brain sync protocol → `docs/BRAIN_SYNC_PROTOCOL.md`
- quota-aware context loading → `docs/CONTEXT_ROUTER.md`
- founder operational directives → `docs/codex/KONFRM_FOUNDER_OPERATING_CONTEXT.md`
- macro dependency graph order → `KONFRM_EXECUTION_DEPENDENCY_ORDER.md`
- operating rules, evidence classification, dependency map, completion matrix, and rescue backlog → `docs/codex/`

## Repository Memory Maintenance

Before finishing significant work, update memory only when it materially changed:

- Architecture changed? Update `docs/ARCHITECTURE.md`.
- Database model or persistence rule changed? Update `docs/DATABASE.md`.
- Business invariant changed? Update `docs/BUSINESS_RULES.md`.
- UI/design convention changed? Update `docs/DESIGN_SYSTEM.md` or the authoritative `DESIGN_SYSTEM/` files.
- Integration changed? Update `docs/INTEGRATIONS.md`.
- Important architectural/product decision made? Append or update `docs/DECISIONS.md`.
- Overall implemented state, debt, or next work materially changed? Update `docs/CURRENT_STATE.md`.

When a task ends, mark `tasks/CURRENT_TASK.md` complete, update only applicable permanent memory, then replace it for the next task. Do not update documentation merely to create noise; Git preserves implementation history.

For a material execution phase, also update the applicable `docs/codex/` reality, matrix, rescue-backlog, and execution-map entries with evidence. Do not alter historical source documents to hide a conflict; log the conflict and its authority instead.

Immediately before closure, re-read the active task, Master Rules, relevant domain authority, and applicable Quality Gates; resolve any divergence, retest, and format the final result using the standard handshake envelope defined in `docs/BRAIN_SYNC_PROTOCOL.md`.

## Git practice

Do not rewrite existing history. Prefer concise conventional commits such as `feat(bookings): add renter cancellation flow`, `fix(payments): prevent duplicate payment release`, or `docs(brain): establish KONFRM durable synchronization layer`. Add a short body when the rationale would otherwise be lost.

# KONFRM repository guide for coding agents

## Identity and map

KONFRM / كونفرم is a three-role vacation-rental product: Customer discovery and booking, Owner operations, and Admin review. Visible product branding is KONFRM; legacy `SOLA` names remain in infrastructure.

- Frontends: `customer-app/`, `owner-app/`, `admin-app/` (React 19, TypeScript, Vite)
- Backend: `backend/server/` (Node/TypeScript; also a Cloudflare Worker entry)
- Database and migrations: `backend/database/migrations/` (Supabase PostgreSQL is canonical)
- Design and experience authority: `DESIGN_SYSTEM/`
- Repository memory: `docs/`
- Active task contract: `tasks/CURRENT_TASK.md`

## Start every task selectively

1. Read this file, `docs/INDEX.md`, `docs/CURRENT_STATE.md`, and `tasks/CURRENT_TASK.md`.
2. Read only the domain documents the index identifies for the active task.
3. Inspect the affected code, migrations, configuration, tests, and relevant Git history before editing.
4. Do not modify anything until the task and affected architecture are understood.

Use this recovery prompt in a fresh session:

> Onboard yourself to this repository. Read AGENTS.md, docs/INDEX.md, docs/CURRENT_STATE.md, and tasks/CURRENT_TASK.md. Then inspect only the code and additional documentation relevant to the active task. Do not modify anything until you understand the current task and affected architecture.

## Source-of-truth hierarchy

1. Current code and database migrations (and the live canonical system when a task explicitly authorizes verification)
2. Explicit repository documentation
3. The current task specification
4. Git history
5. Conversation context

If sources conflict, investigate; do not silently choose or invent a rule. Mark unresolved facts as uncertain.

## Working rules

- Make minimal, targeted changes; preserve unrelated work and backward compatibility unless the task explicitly changes it.
- Follow existing architecture and patterns. Do not add dependencies, migrations, or platform changes without a demonstrated need.
- Supabase PostgreSQL is the source of truth. A persistence failure must fail honestly; never fabricate business success or fallback production data.
- Inspect migrations before schema work. The Cloudflare Worker uses a narrow SQL-to-Supabase REST compatibility adapter; preserve strict query matching and test the deployed path when touching it.
- Preserve authorization boundaries and canonical server-derived identity/ownership. Never accept client-provided ownership as authority.
- Never expose, commit, log, or document secrets. Use environment-variable names only.
- Run focused validation proportionate to the change. A build or CI result alone is not proof of production behavior.
- Respect `DESIGN_SYSTEM/` for UI work. Apps consume it; no app is a design authority.

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

## Git practice

Do not rewrite existing history. Prefer concise conventional commits such as `feat(bookings): add renter cancellation flow`, `fix(payments): prevent duplicate payment release`, or `docs(memory): establish repository knowledge architecture`. Add a short body when the rationale would otherwise be lost.

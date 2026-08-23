# Repository knowledge index

Read selectively. The default fresh-session sequence is `../AGENTS.md` → this index → `CURRENT_STATE.md` → `../tasks/CURRENT_TASK.md`; then load only the documents below that match the task.

| Document | Read when | Usually skip when |
| --- | --- | --- |
| [PROJECT.md](./PROJECT.md) | Product scope, roles, terminology, or functional boundaries matter | The task is a contained implementation detail already understood |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Changing module boundaries, app/backend flow, auth, deployment, or cross-system behavior | A local UI copy or isolated unit-test change |
| [DATABASE.md](./DATABASE.md) | Changing schema, SQL, RLS/security, migrations, RPCs, or canonical persistence | No data model or persistence is involved |
| [BUSINESS_RULES.md](./BUSINESS_RULES.md) | A task affects statuses, permissions, booking, payments, wallet, property lifecycle, or customer-visible behavior | Pure tooling or documentation work |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Implementing or reviewing UI, UX, components, accessibility, RTL, or responsive behavior | Backend-only changes |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Touching Supabase, storage, payment mode, Workers, Pages, CI, or environment configuration | Local code without external-service impact |
| [DECISIONS.md](./DECISIONS.md) | Questioning an intentional architectural choice or considering reversal/migration | The choice is not relevant to the task |
| [CURRENT_STATE.md](./CURRENT_STATE.md) | Onboarding, handoff, current debt, implemented areas, or likely next work | Never skip during a fresh-session recovery |

## Other authorities

- [`../DESIGN_SYSTEM/`](../DESIGN_SYSTEM/) is the detailed visual and product-experience authority; read its router before UI work.
- [`../backend/database/migrations/`](../backend/database/migrations/) is migration history and is the technical source for database changes.
- [`../tasks/CURRENT_TASK.md`](../tasks/CURRENT_TASK.md) is the one active execution contract, not permanent knowledge.

## Historical/reference material

`../implementation_plan.md`, `../SOLA_EXECUTION_TASKS.md`, app-level implementation plans/readmes, and `../backend/docs/` may explain prior intent, but are not current authority. Use them only to reconstruct history and verify against code, migrations, current docs, and Git.

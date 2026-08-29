# Repository knowledge index

Read selectively. Before implementing any approved task, the mandatory core sequence is `../AGENTS.md` → this index → `CURRENT_STATE.md` → `../tasks/CURRENT_TASK.md` → `codex/KONFRM_MASTER_RULES.md`; then load only the documents below that match the task.

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

## Operating-system documents

Read these selectively after the default recovery sequence. They govern planning and evidence classification; they do not replace product, database, or design authorities.

| Document | Read when | Usually skip when |
| --- | --- | --- |
| [codex/KONFRM_MASTER_RULES.md](./codex/KONFRM_MASTER_RULES.md) | Every approved execution task; source conflicts; phase authority | Never skip before implementation; it is part of the mandatory core refresh |
| [codex/KONFRM_CURRENT_REALITY.md](./codex/KONFRM_CURRENT_REALITY.md) | Assessing whether a feature is actually verified, partial, or only historically claimed | A local change with fresh direct evidence |
| [codex/KONFRM_EXECUTION_MAP.md](./codex/KONFRM_EXECUTION_MAP.md) | Selecting or sequencing work across roadmap phases | Completing an already-approved narrow task |
| [codex/KONFRM_COMPLETION_MATRIX.md](./codex/KONFRM_COMPLETION_MATRIX.md) | Checking cross-app readiness, dependencies, or acceptance gaps | Isolated documentation-only work |
| [codex/KONFRM_RESCUE_BACKLOG.md](./codex/KONFRM_RESCUE_BACKLOG.md) | Looking for verified defects, gaps, or deferred work | When the active task already sets scope |
| [codex/KONFRM_QUALITY_GATES.md](./codex/KONFRM_QUALITY_GATES.md) | Defining validation and closure evidence | Read-only discovery with no phase closure |
| [codex/KONFRM_UI_QA_PROTOCOL.md](./codex/KONFRM_UI_QA_PROTOCOL.md) | Any visible UI/UX phase | Backend-only tasks |
| [codex/KONFRM_CROSS_APP_MATRIX.md](./codex/KONFRM_CROSS_APP_MATRIX.md) | A shared entity/state changes across roles | A single-role static presentation change |
| [codex/KONFRM_DOCUMENT_RECONCILIATION.md](./codex/KONFRM_DOCUMENT_RECONCILIATION.md) | Determining whether a repository document is current, historical, or superseded | Ordinary implementation after authority is already clear |

## Other authorities

- [`../DESIGN_SYSTEM/`](../DESIGN_SYSTEM/) is the detailed visual and product-experience authority; read its router before UI work.
- [`../backend/database/migrations/`](../backend/database/migrations/) is migration history and is the technical source for database changes.
- [`../tasks/CURRENT_TASK.md`](../tasks/CURRENT_TASK.md) is the one active execution contract, not permanent knowledge.

## Historical/reference material

`../implementation_plan.md`, `../SOLA_EXECUTION_TASKS.md`, app-level implementation plans/readmes, and `../backend/docs/` may explain prior intent, but are not current authority. Use them only to reconstruct history and verify against code, migrations, current docs, and Git. The root Product Context, Arabic PHASE 0–22 roadmap, and mobile UX guide are preserved source documents; their authority and conflicts are routed by `codex/KONFRM_MASTER_RULES.md`.

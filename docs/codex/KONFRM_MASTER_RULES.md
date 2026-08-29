# KONFRM master operating rules

**Purpose:** concise execution governance for Codex. Product source documents remain preserved evidence; this file routes authority and does not rewrite them.

## Mandatory context refresh gate

Before implementing **every approved execution task**, re-establish the mandatory core context:

1. `AGENTS.md`.
2. `docs/INDEX.md`.
3. `docs/CURRENT_STATE.md`.
4. `tasks/CURRENT_TASK.md`.
5. This file.

For substantial or cross-system work, also review the applicable `KONFRM_CURRENT_REALITY.md`, `KONFRM_DECISION_CONFLICTS.md`, `KONFRM_COMPLETION_MATRIX.md`, `KONFRM_RESCUE_BACKLOG.md`, and `KONFRM_QUALITY_GATES.md`. Then use the Index to selectively load only the relevant business, database, architecture, integration, design, decision, UI-QA, and cross-app authorities.

Before touching implementation, record or establish: objective; governing authorities; affected systems/apps; non-negotiable rules; open decisions; evidence to verify; and explicit non-goals. Historical documents, old code, mocks, constants, and previous behavior never silently override this current governing context.

## Additional source reading before major work

1. Root `KONFRM_CODEX_MASTER_OPERATING_PROMPT.md`.
2. Root `KONFRM_MASTER_PROJECT_CONTEXT.md`.
3. Root `خطة عمل التطبيق.txt` for the PHASE 0–22 macro roadmap.
4. Root `mobile-app-ui-design-gpt-project.md` for general mobile UX guidance.
5. `AGENTS.md`, `docs/INDEX.md`, `docs/CURRENT_STATE.md`, and `tasks/CURRENT_TASK.md`.

Then load only task-relevant architecture, database, business, design, integration, code, migration, CI, and Git evidence.

## Authority and evidence

Resolve conflicts in this order:

1. Latest explicit Founder decision in the active task/thread or dated decision record.
2. Explicit newer execution override.
3. Confirmed rule in the Master Project Context.
4. Approved product, UX, architecture, or design specification.
5. Genuinely verified live behavior, as implementation evidence—not product intent.
6. Current code and migrations, as implementation/persistence reality.
7. Mocks, constants, comments, legacy plans, defaults, and old TODOs.

Never silently “fix” a specification to match code. Record the issue in `KONFRM_DECISION_CONFLICTS.md`; use `Needs Founder decision` when the higher authority is absent.

## Confirmed rule register

| ID | Rule | Classification | Source / section | Latest override | Affected systems |
| --- | --- | --- | --- | --- | --- |
| MR-01 | Visible product identity is KONFRM/كونفرم; legacy SOLA infrastructure names may remain. | Confirmed | Product Context §§2, 6; Master §5 | None found | All apps, design, docs |
| MR-02 | Customer and Owner are mobile-first; Admin is desktop operational. Same design language does not mean identical UX. | Confirmed | Product Context §§11, 13; Master §5 | Experience authority reinforces it | All apps, design |
| MR-03 | Prototype authentication must be testable without OTP/SMS blocking it; final production auth is not decided. | Prototype-only | Master §5.2; Arabic roadmap PHASE 0 | Supersedes legacy OTP plans | Backend, Customer, Owner, Admin |
| MR-04 | Cloudflare Pages/Worker is the active deployment direction; Vercel is legacy unless live evidence says otherwise. | Prototype-only | Master §5.3; Product Context §13 | None found | CI, Worker, Pages, environment docs |
| MR-05 | Light-first surface, Cairo, blue `#0059FF`, sparing yellow `#FFD700`; no standard navy, gradient, or glass product surfaces. | Confirmed | Product Context §7; Design System; Master §§5, 15 | None found | All UI/design |
| MR-06 | Do not broaden or mass-migrate the icon family without explicit Founder approval. | Open | Master §5.4 | Conflicts with Design System Lucide wording; see DC-02 | All UI/design |
| MR-07 | Supabase PostgreSQL and Storage are canonical; persistence failures must be truthful. | Confirmed | Product Context §13; AGENTS | None found | Backend, DB, storage, all apps |
| MR-08 | The Worker REST/RPC adapter is narrow and strict, not a general SQL/transaction engine. | Prototype-only | Product Context §13.10; AGENTS | None found | Backend, Worker, Supabase |
| MR-09 | Browse remains public where current rules permit; protected actions require canonical authorization and recovered context. | Confirmed | Product Context §14; Master §6 | None found | Customer, backend/auth |
| MR-10 | One human can be Customer plus optional Owner with the same UUID. Login never creates Owner capability; explicit registration may. | Confirmed | Product Context §10; Owner registration/KYC evidence | None found | Owner, Customer, backend, DB |
| MR-11 | Published/property, availability, booking, money, wallet, chat, KYC, and Admin decisions are server/canonical-data authoritative. | Confirmed | Product Context §§14–16; Master §§6,16 | None found | All systems |
| MR-12 | Booking: 2–30 nights; pending does not block dates; approved-pending-payment and confirmed do; availability fails closed. | Confirmed | Product Context §14; Master §6 | None found | Customer, Owner, backend, DB |
| MR-13 | Deposit is first-night amount; commission is 20% of deposit; owner net is 80%; no remaining-balance commission; never pay before Owner approval; Customer cannot see internal split. | Confirmed | Product Context §§9,14; Master §§6,17 | None found | Customer, Owner, Admin, backend, DB |
| MR-14 | Owner KYC is National ID front/back plus live face, private storage, and Admin review; no biometric/liveness claim. | Prototype-only | Product Context §15; Owner KYC evidence | None found | Owner, Admin, backend, DB, storage |
| MR-15 | Cancellation/refund matrix, payment deadlines, and remaining-balance method remain undecided where not explicitly specified. | Open | Product Context §§14, 19 | None found | Booking, payment, wallet, Admin |
| MR-16 | Current prototype accounting: Owner net electronic deposit moves Pending → Available 24h after check-in; minimum payout is 500 EGP; actual provider payout fee is borne by Owner. | Confirmed (prototype; production revalidation required) | Product Context BR-F12–BR-F14 and §23.4 | Production legal/operational/provider validation remains required; it does not erase the prototype rule. | Owner, Admin, backend, DB, wallet/payout |

## Source register

| Source | Use | Authority note |
| --- | --- | --- |
| `KONFRM_CODEX_MASTER_OPERATING_PROMPT.md` | Execution governance, Phase Zero checklist, guardrails | Governing operating manual |
| `KONFRM_MASTER_PROJECT_CONTEXT.md` | Confirmed product rules and product-level architecture | Product context; conflicts routed through this file/register |
| `خطة عمل التطبيق.txt` | Exact PHASE 0–22 macro roadmap | Macro structure must be preserved |
| `mobile-app-ui-design-gpt-project.md` | General mobile quality guidance | Cannot override KONFRM-specific decisions |
| `DESIGN_SYSTEM/` and `docs/` | Detailed established design/repository-memory authority | Read selectively; preserve original sources |
| Code, migrations, CI, and Git | Implementation and historical evidence | Not automatic product intent or live proof |

## Execution discipline

- Preserve PHASE 0–22 in the Arabic roadmap exactly. Derive detailed execution phases from dependency/risk/acceptance boundaries; never target an arbitrary count.
- One execution phase must be independently shippable, deeply verifiable, and not a trivial button-only edit or oversized multi-system rewrite.
- Complete intent, implementation, data/API, cross-app, UI/UX, RTL, failure, test, regression, security/privacy, live-evidence, and reporting gates when applicable.
- Complete the master prompt’s functional, UI/UX, and adversarial three-pass review before closure.
- Update reality, matrix, map, and backlog only when evidence materially changes. Git stores history; these files store current operational truth.
- **No-extension task closure:** an approved task owns inspection, diagnosis, implementation/fix, testing, self-fix, retest, regression, context re-check, quality-gate review, and closure. A discovered safe in-scope defect remains in the same task; do not require a continuation or mini-phase merely to finish it.
- Stop before closure only for an unresolved Founder/Product decision, unavailable required external access, approval-required destructive/live mutation, explicitly unauthorized architecture/business/financial change, or an external dependency that cannot safely be resolved. The blocker report must state the exact blocker, attempted safe actions, why they failed, and the minimum Founder action.
- **Closure context re-check:** immediately before declaring complete, re-read the active task, this file, relevant domain authority, and applicable Quality Gates; resolve divergence, retest, then report concise Context Compliance Evidence.

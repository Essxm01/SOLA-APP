# KONFRM documentation reconciliation register

**Audit date:** 2026-08-29  
**Repository baseline:** `6de6f92` before this uncommitted reconciliation pass  
**Scope:** the baseline inventory contained 79 repository-authored Markdown files (excluding dependency/build/vendor trees), plus `خطة عمل التطبيق.txt` and current non-Markdown governance sources explicitly routed below. This register is the one new Markdown file created by the pass, so the post-reconciliation count is 80.

This is a routing and staleness register, not another product specification. It tells a fresh agent which documents are current, historical evidence, machine-owned, or decision-blocked. Source precedence remains [KONFRM_MASTER_RULES.md](./KONFRM_MASTER_RULES.md).

## Authority classes

| Class | Meaning | Treatment |
| --- | --- | --- |
| A — Preserved foundational source | Founder-supplied/approved context, macro roadmap, or general guide | Preserve wording; route conflicts rather than rewriting history. |
| B — Current governing/routing | Agent operating and repository navigation documents | Must reflect current governing precedence. |
| C — Current domain authority | Current architecture, persistence, business, integration, or design contracts | Safely reconcile when a higher authority is explicit. |
| D — Current state/task | Current handoff and one active/pre-execution contract | Must state actual current sequencing, never historic completion as proof. |
| E — Historical/reference | Earlier plans, audits, walkthroughs, or superseded specs | Preserve as evidence; label/rout when their wording could mislead. |
| F — Generated/machine-owned | Output or machine-readable contract | Do not hand-edit unless its documented generator/source is intentionally changed. |

## Complete document inventory

### A — Preserved foundational sources

- `KONFRM_CODEX_MASTER_OPERATING_PROMPT.md` — Founder-supplied operating system; governing execution source.
- `KONFRM_MASTER_PROJECT_CONTEXT.md` — Founder-supplied Product Context; confirmed product-rule source dated 2026-08-19.
- `خطة عمل التطبيق.txt` — Founder-supplied PHASE 0–22 macro roadmap; preserved non-Markdown source.
- `mobile-app-ui-design-gpt-project.md` — general mobile UX guide; lower authority than KONFRM-specific decisions.

### B / D — Current governing, routing, and state documents

- `AGENTS.md` — concise agent operating guide.
- `README.md` — repository landing/routing page.
- `docs/INDEX.md` — selective-context router.
- `docs/CURRENT_STATE.md` — current handoff state.
- `tasks/CURRENT_TASK.md` — current/pre-execution task contract.
- `admin-app/docs/README.md` and `customer-app/docs/README.md` — narrow app-boundary routers; they defer implementation state to central current documentation.
- `docs/codex/KONFRM_MASTER_RULES.md` — extracted governing implementation rules.
- `docs/codex/KONFRM_DECISION_CONFLICTS.md` — conflict register.
- `docs/codex/KONFRM_CURRENT_REALITY.md` — evidence classification.
- `docs/codex/KONFRM_EXECUTION_MAP.md` — subordinate PHASE 0–22 execution map.
- `docs/codex/KONFRM_COMPLETION_MATRIX.md` — slice-level acceptance inventory.
- `docs/codex/KONFRM_RESCUE_BACKLOG.md` — evidence-backed defects/deferred work.
- `docs/codex/KONFRM_QUALITY_GATES.md` — reusable closure gates.
- `docs/codex/KONFRM_UI_QA_PROTOCOL.md` — visible-flow QA protocol.
- `docs/codex/KONFRM_CROSS_APP_MATRIX.md` — cross-role events and data boundaries.
- `docs/codex/KONFRM_PHASE_TEMPLATE.md` — execution-phase template.
- `docs/codex/KONFRM_PHASE_REPORT_TEMPLATE.md` — closure-report template.
- `docs/codex/KONFRM_DOCUMENT_RECONCILIATION.md` — this inventory and routing audit.

### C — Current repository domain authority

- `docs/PROJECT.md` — product terms and scope.
- `docs/ARCHITECTURE.md` — verified technical structure/deployment boundaries.
- `docs/DATABASE.md` — persistence model and retained-migration/RLS limits.
- `docs/BUSINESS_RULES.md` — current implementation invariants and explicit open rules.
- `docs/DESIGN_SYSTEM.md` — router into detailed design authority.
- `docs/INTEGRATIONS.md` — service/configuration constraints with variable names only.
- `docs/DECISIONS.md` — durable architecture decision memory.

### C — Current Design System authority

- `DESIGN_SYSTEM/README.md`, `DESIGN_SYSTEM/GOVERNANCE.md`, `DESIGN_SYSTEM/CHANGELOG.md` — visual governance/versioning.
- `DESIGN_SYSTEM/FOUNDER_EXPERIENCE_REVIEW_AR.md` — Founder-readable review/decision evidence.
- `DESIGN_SYSTEM/LEGACY_DRIFT.md` — active legacy-drift backlog, not permission for new drift.
- `DESIGN_SYSTEM/COMPONENTS/alerts.md`, `DESIGN_SYSTEM/COMPONENTS/badges.md`, `DESIGN_SYSTEM/COMPONENTS/bottom-sheets.md`, `DESIGN_SYSTEM/COMPONENTS/buttons.md`, `DESIGN_SYSTEM/COMPONENTS/cards.md`, `DESIGN_SYSTEM/COMPONENTS/forms.md`, `DESIGN_SYSTEM/COMPONENTS/inputs.md`, `DESIGN_SYSTEM/COMPONENTS/modals.md`, `DESIGN_SYSTEM/COMPONENTS/navigation.md`, `DESIGN_SYSTEM/COMPONENTS/states.md` — current component contracts.
- `DESIGN_SYSTEM/GUIDELINES/accessibility.md`, `DESIGN_SYSTEM/GUIDELINES/financial-display.md`, `DESIGN_SYSTEM/GUIDELINES/responsive.md`, `DESIGN_SYSTEM/GUIDELINES/roles.md`, `DESIGN_SYSTEM/GUIDELINES/rtl.md`, `DESIGN_SYSTEM/GUIDELINES/typography.md`, `DESIGN_SYSTEM/GUIDELINES/usage-rules.md` — current foundation rules.
- `DESIGN_SYSTEM/IMPLEMENTATION/mobile.md`, `DESIGN_SYSTEM/IMPLEMENTATION/token-mapping.md`, `DESIGN_SYSTEM/IMPLEMENTATION/web.md` — current consumption/shell contracts.
- `DESIGN_SYSTEM/EXPERIENCE/README.md`, `DESIGN_SYSTEM/EXPERIENCE/GOVERNANCE.md`, `DESIGN_SYSTEM/EXPERIENCE/SHARED_PRINCIPLES.md`, `DESIGN_SYSTEM/EXPERIENCE/CUSTOMER_EXPERIENCE.md`, `DESIGN_SYSTEM/EXPERIENCE/OWNER_EXPERIENCE.md`, `DESIGN_SYSTEM/EXPERIENCE/ADMIN_EXPERIENCE.md`, `DESIGN_SYSTEM/EXPERIENCE/ENTRY_AND_BOOTSTRAP.md`, `DESIGN_SYSTEM/EXPERIENCE/NAVIGATION.md`, `DESIGN_SYSTEM/EXPERIENCE/INFORMATION_ARCHITECTURE.md`, `DESIGN_SYSTEM/EXPERIENCE/ACTION_HIERARCHY.md`, `DESIGN_SYSTEM/EXPERIENCE/FORMS_AND_CONTROLS.md`, `DESIGN_SYSTEM/EXPERIENCE/DATA_VISIBILITY.md`, `DESIGN_SYSTEM/EXPERIENCE/CONTENT_AND_MICROCOPY.md`, `DESIGN_SYSTEM/EXPERIENCE/SCREEN_STATES.md`, `DESIGN_SYSTEM/EXPERIENCE/TARGET_EXPERIENCE_ARCHITECTURE.md` — current product-experience authority, subject to Founder decision statuses.
- `DESIGN_SYSTEM/REFERENCES/MOBILE_UI_REFERENCES.md` — reference evidence, not a design authority.

### E — Historical/reference material preserved intact

- `SOLA_EXECUTION_TASKS.md` — historical task board; OTP/SOLA/live-claim content is not current authority.
- `implementation_plan.md` — historical zero-mock/design plan.
- `owner-app/docs/implementation_plan.md` — historical three-app plan.
- `admin-app/implementation_plan.md` and `admin-app/walkthrough.md` — historical disputes-flow material.
- `backend/docs/PHASE_7_MASTER_SPECIFICATION.md` — historical backend blueprint; its “official/source-of-truth” wording is superseded for current work.
- `DESIGN_SYSTEM/AUDIT_REPORT.md` — explicitly historical/superseded implementation evidence.
- `DESIGN_SYSTEM/EXPERIENCE/CURRENT_STATE_AUDIT.md`, `DESIGN_SYSTEM/EXPERIENCE/CURRENT_SCREEN_INVENTORY.md`, `DESIGN_SYSTEM/EXPERIENCE/MIGRATION_PLAN.md` — dated 2026-08-23 snapshots/recommendations, now explicitly routed as historical evidence.

### F — Machine-owned/non-Markdown authority explicitly reviewed

- `DESIGN_SYSTEM/TOKENS/*.json` — canonical token source; token generator is `scripts/generate-design-tokens.mjs`.
- `DESIGN_SYSTEM/generated/*` — generated token output; do not hand-edit.
- `DESIGN_SYSTEM/LEGACY_EXCEPTIONS.json` — anti-drift baseline owned by `scripts/check-design-system.mjs` review flow.
- `DESIGN_SYSTEM/EXPERIENCE/DECISIONS.json` and `role-visibility.json` — machine-readable experience authority; decisions are limited by their explicit approval status.

## Reconciliation findings and treatment

| ID | Subject / affected documents | Classification | Treatment completed or reason retained |
| --- | --- | --- | --- |
| DR-01 | Founder-first precedence versus older code-first routing | Duplicate authority | `AGENTS.md` and current docs defer to Master Rules; original historical sources preserved. |
| DR-02 | Lucide described as approved foundation in current design docs | Clear stale current guidance | Current Design System/component/RTL routing now calls it existing implementation evidence, not a Founder-approved project-wide migration mandate. |
| DR-03 | Wallet release/minimum/fee described as missing/undefined | Clear stale current guidance | Current Business Rules and governance now state confirmed prototype accounting; production revalidation remains explicitly separate. |
| DR-04 | Current Business Rules claimed Owner registration/KYC absent | Clear stale current guidance | Corrected to describe explicit registration and KYC implementation; no verification approval is implied. |
| DR-05 | Historical Experience audits/recommendations read as present runtime state | Historical but routing-dangerous evidence | Added dated historical-snapshot/superseded-routing notices; retained all original audit content. |
| DR-06 | Experience README version `2.1.1` conflicted with Design System `2.1.2` | Clear stale current guidance | Updated the Experience router to `2.1.2`. |
| DR-07 | `tasks/CURRENT_TASK.md` claimed Owner Bookings active while execution map selected P0.1 | Clear stale current guidance | Marked reconciliation complete/awaiting review; P0.1 is recommended next only. |
| DR-08 | App documentation boundaries used visible SOLA name and “feature pending” | Clear stale current guidance | Updated narrow boundary routers to KONFRM and routed current status to central docs. |
| DR-09 | Architecture/integrations omitted private KYC storage distinction | Current-domain omission | Added private `owner-verification`/temporary-access clarification. |
| DR-10 | Historical OTP, Antigravity, Vercel, CASH_ON_ARRIVAL, and legacy live-success claims | Historical but valid evidence | Preserved; Master Rules, Index, and Conflict Register supersede/reroute them. |
| DR-11 | Full RLS baseline, deployment revision, and live status cannot be inferred from repository | Ambiguous / insufficient evidence | Remains explicitly unverified; requires future read-only evidence, not doc invention. |
| DR-12 | Cancellation/refund matrix, remaining-payment method, payment deadline, notification model, and contextual Admin chat authorization | Unresolved Founder/product decision | Kept open and routed to Execution Map/Conflict Register. |
| DR-13 | Current Design System “wins” wording could appear to outrank newer Founder/Product direction | Duplicate authority | Clarified that the Design System governs settled visual/product-experience contracts but defers to governing Founder-first precedence. |
| DR-14 | Retained `.env.example` material includes a legacy Vercel backend URL | Historical configuration reference / ambiguous live state | Marked examples non-authoritative; target deployment/API URL requires explicit current task plus read-only infrastructure evidence. |
| DR-15 | 30 `file:///.../YALLAH MASYAF/...` links in preserved plans/specifications no longer resolve in this checkout | Historical reference defect | Recorded as non-current historical evidence. They are intentionally not rewritten because doing so would alter historical plans and their stale paths are not used by current routing. |

## Current routing result

1. Founder/current approved intent → Master Rules and current decision records.
2. Current domain authority → relevant `docs/` file or `DESIGN_SYSTEM/` source.
3. Current implementation/acceptance reality → Current Reality, Completion Matrix, and code/migrations.
4. Historical/reference materials → preserved evidence only, never default implementation instructions.

No current document may claim that a commit, build, CI result, or old report is live proof without exact applicable evidence.

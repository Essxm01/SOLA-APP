# P1.3 — Property & Media Persistence Integrity

**Parent macro phase:** PHASE 1 — Database Backbone
**Status:** Open — same-task PR review remediation in progress on `validation/p1-3-rc`; do not merge or publish
**Approved baseline:** `92dc3916afe7a8e7d15620efee31afa58e826870`

## Objective

Verify and harden canonical property, lifecycle, image/media, Owner, Admin, and Customer boundaries without changing product policy or mutating live data.

## Governing context

- `docs/codex/KONFRM_MASTER_RULES.md`
- `docs/codex/P1_1_SCHEMA_RLS_BASELINE_REPORT.md`
- `docs/codex/P1_2_IDENTITY_SESSION_PERSISTENCE_REPORT.md`
- `docs/DATABASE.md`, `docs/ARCHITECTURE.md`, `docs/INTEGRATIONS.md`, `docs/BUSINESS_RULES.md`
- Approved P1.2 execution contract (2026-08-30)

## Requirements

- Preserve server-derived ownership and the same-UUID Owner identity architecture.
- Remove fake property/media success and in-memory fallbacks from the touched runtime paths.
- Enforce canonical property lifecycle writes, public eligibility, upload-intent binding, committed-image deletion, and Admin review transitions.
- Add focused behavioral and Worker REST-adapter coverage; document live read-only evidence and unresolved schema/product conflicts.

## Constraints

- Temporary validation-branch force-push and pull-request CI are allowed; do not push `main`, merge, deploy, apply migration `024`, or mutate live Supabase/Storage/data/sessions.
- Read-only live metadata only; no PII, object keys, tokens/hashes, or business payload reads.
- Do not alter booking, payment, wallet, availability, Owner registration/KYC, RLS, Storage bucket configuration, or product lifecycle policy.

## Acceptance and validation

Follow the approved P1.3 acceptance matrix and three-pass functional/product/adversarial review. Run focused property/media behavior, Worker-adapter, atomic-media, Admin rejected-state, and relevant identity/security regressions; then affected application typechecks/builds, design-system validation, and diff/whitespace/link checks. Final closure requires green PR CI on the exact final head and a fresh clean Codex review.

## Documentation impact

Update P1.3 evidence, current state, database/architecture/integration guidance, completion matrix, rescue backlog, and execution map only where the verified current reality changed. A separate explicit approval is required for any publication or live schema/data operation.

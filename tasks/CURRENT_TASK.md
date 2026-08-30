# P1.2 — Identity / Session Persistence Integrity

**Parent macro phase:** PHASE 1 — Database Backbone
**Status:** Complete — corrected local release candidate pending Founder Round 2 review
**Approved baseline:** `5decd03f59f3bd3039e12e00caf234f28def5201`

## Objective

Align Customer/Owner session persistence with the canonical same-UUID identity model and make refresh/revocation fail closed. Prepare, but do not apply, the narrow live-schema migration required for that alignment.

## Governing context

- `docs/codex/KONFRM_MASTER_RULES.md`
- `docs/codex/P1_1_SCHEMA_RLS_BASELINE_REPORT.md`
- `docs/codex/P14_1_AUTHORIZATION_REMEDIATION_REPORT.md`
- `docs/DATABASE.md`, `docs/ARCHITECTURE.md`, `docs/INTEGRATIONS.md`, `docs/BUSINESS_RULES.md`
- Approved P1.2 execution contract (2026-08-30)

## Requirements

- Preserve `users.id` as the human identity and `owners.id` as its optional same-UUID capability.
- Keep prototype login OTP-free; Owner login must never create an Owner capability.
- Add staged migrations `022` (expand/compatibility) and `023` (finalize/enforce) for evidence-backed `user_sessions` alignment; do not rewrite/apply `015` or create OTP infrastructure.
- Persist every active Customer/Owner refresh token canonically; refresh/revocation must fail honestly when persistence is unavailable or inconsistent.
- Validate exact Worker REST adapter operations and add behavioral tests.
- Reconcile P14.1's verified live closure into dynamic repository memory.

## Constraints

- Local release candidate only: no push, deploy, CI/configuration change, or live Supabase migration/data/session mutation.
- Read-only live metadata only; no PII, token/hash, or business payload reads.
- Do not alter Admin identity architecture, RLS, Storage, booking/property/payment/wallet rules, or historical migration ledgers.

## Acceptance and validation

Follow the approved P1.2 62-item matrix and three-pass functional/product/adversarial review. Run focused backend identity/session, Worker-adapter, P0.2, Owner identity/registration, Admin and Customer/Owner bootstrap regressions; Node 22 typecheck; migration contract validation; diff/whitespace/link checks.

## Documentation impact

Evidence-backed current-state, database/integration, and `docs/codex/` operational records are updated. Round 2 may publish the approved commit and apply migration 022 only with explicit Founder approval.

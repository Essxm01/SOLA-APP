# P14.1 — RLS / authorization / privacy remediation

**Parent macro phase:** PHASE 14
**Status:** Complete — local release candidate pending Founder review
**Approved baseline:** `d7462f13eb8783a2d5422f574ec11a451d69b9d9`

## Objective

Prepare a minimal, auditable migration that restores the intended service-role-only execution boundary for the four critical payment and Owner registration/KYC `SECURITY DEFINER` RPCs. Review and safely harden the related RLS event-trigger function and dispute-evidence trigger search path where evidence permits.

## Governing context

- `docs/codex/KONFRM_MASTER_RULES.md`
- `docs/codex/P1_1_SCHEMA_RLS_BASELINE_REPORT.md`
- `docs/DATABASE.md`, `docs/ARCHITECTURE.md`, `docs/INTEGRATIONS.md`, and `docs/BUSINESS_RULES.md`
- DC-13 in `docs/codex/KONFRM_DECISION_CONFLICTS.md`
- Retained migrations `009`, `019`, and `020`

## Requirements

- Diagnose the live ACL divergence with read-only metadata only.
- Add the next unique, narrow migration without rewriting 019/020 or changing function business logic.
- Proposed critical-RPC ACL: no execute for `PUBLIC`, `anon`, or `authenticated`; execute retained for `service_role` and administrative owner access.
- Preserve the backend `/api/v1` → service-role Supabase boundary, RLS model, payment semantics, KYC semantics, and same-UUID identity rule.
- Add proportionate repeatable privilege-contract evidence and run focused regressions.
- Update current operating-state records and create the P14.1 report.

## Constraints

- Local release candidate only: no live migration/ACL/RLS/storage/data change, deployment, push, or CI/configuration change.
- Do not invoke mutating payment, registration, or KYC RPCs against live Supabase.
- Do not invent RLS policies, alter broad table grants, repair historical migration-ledger gaps, or start P1.2/P14.2/P14.3.

## Acceptance criteria

- The 38-item P14.1 acceptance matrix is recorded with evidence.
- The final local commit is clean, scoped, and ready for Founder review.
- Documentation explicitly distinguishes repository readiness from the still-open live security gap.

## Validation

- Static migration/ACL contract checks and focused backend auth/identity/KYC/payment/Worker tests.
- Backend Node 22 typecheck; relevant dispute-trigger regression if metadata is changed.
- Whitespace/link/security checks and three-pass closure review.

## Documentation impact

Update only the relevant task, current-state, database, and `docs/codex/` reality/matrix/backlog/map/conflict/report records.

## Closure

The repository remediation is complete and locally validated. Publication, live migration 021 application, and post-application ACL verification require a separate explicit Founder approval. Do not start P1.2, P14.2, or P14.3.

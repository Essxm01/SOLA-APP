# P0.1 — Baseline, CI, deployment, and access reality

**Parent macro phase:** PHASE 0
**Status:** Complete — P0.1 baseline evidence and local runtime remediation recorded; do not start P0.2 without a new approved contract.

## Why this phase exists / objective

Establish the trustworthy current technical baseline for KONFRM from repository, local-runtime, CI, and safe read-only external evidence. Classify every external fact rather than treating configuration, a build, or an old delivery report as live proof.

## Exact in-scope flows

- Verify Git baseline, working tree, package/toolchain state, scripts, environment templates, and deployment configuration without printing secrets.
- Diagnose and, only when unambiguous and local, repair the broken standard npm command path.
- Establish local build/check/test/dev-runtime baselines for Customer, Owner, Admin, and backend; identify API target/mock/auth behavior.
- Inspect GitHub Actions workflow and accessible recent runs, public non-mutating HTTP routes, Cloudflare/Vercel references, and Supabase metadata only through authorized read-only access.
- Produce the P0.1 cross-system configuration and acceptance matrices; update current evidence/reality documentation.

## Affected roles and systems

Customer App, Owner App, Admin App, backend Worker/Node entry, GitHub Actions, Cloudflare Pages/Worker, Supabase PostgreSQL/Storage, and legacy Vercel references.

## Authority and current evidence

- `AGENTS.md`, `docs/INDEX.md`, `docs/codex/KONFRM_MASTER_RULES.md`
- `docs/codex/KONFRM_CURRENT_REALITY.md`, `KONFRM_EXECUTION_MAP.md`, `KONFRM_COMPLETION_MATRIX.md`, `KONFRM_RESCUE_BACKLOG.md`, `KONFRM_QUALITY_GATES.md`
- `docs/ARCHITECTURE.md`, `docs/INTEGRATIONS.md`, `docs/DATABASE.md`
- `KONFRM_CODEX_MASTER_OPERATING_PROMPT.md` P0.1 contract and `docs/codex/KONFRM_PHASE_TEMPLATE.md`

## Explicit non-goals

No P0.2 or later phase; no product feature/design/business-rule work; no database/schema/RLS/storage/data mutation; no deployment, push, commit, dependency upgrade, secret rotation, or Cloudflare/Supabase/Vercel configuration mutation.

## Product, financial, privacy, and safety guardrails

Prototype access must remain testable without OTP/SMS blocking it. Preserve canonical identity/authorization boundaries, never print or expose secrets, and make only non-destructive HTTP/read-only infrastructure checks. Configuration is not live proof.

## Exact acceptance matrix

Record PASS / FAIL / BLOCKED / ACCESS_UNAVAILABLE with evidence for all 30 P0.1 items in the approved phase contract: Git/toolchain; each local app/backend and routing/auth baseline; CI/runs/limitations; Pages/Worker; live routing; Supabase/schema/storage/RLS limits; Vercel classification; cross-system matrix; secret safety; self-fix; and documentation updates.

## Failure, conflict, and edge cases

Record inaccessible Cloudflare/Supabase/GitHub evidence as `ACCESS_UNAVAILABLE`; do not invent live status. A local toolchain repair must be unambiguous and non-destructive. Stop for Founder direction before any live-infrastructure, database, auth-architecture, dependency, or product-rule mutation.

## Applicable quality gates

Functional/technical, operational/product, and adversarial reviews from `KONFRM_QUALITY_GATES.md`; only relevant tests/builds; exact deployment evidence when accessible.

## Verification and evidence plan

Inspect config/scripts and run actual safe local commands; exercise minimal non-mutating runtime paths; query public GitHub REST and HTTP endpoints where access permits; use authenticated read-only Cloudflare/Supabase tooling only if available; maintain a cross-system evidence matrix.

## Test and regression plan

Run baseline checks/builds/tests that the discovered toolchain supports. Diagnose any command failure to root cause rather than misclassifying it as a product failure. Do not run mutation-heavy tests against live systems.

## Self-fix loop

Detect → diagnose root cause → fix only an unambiguous in-scope local/repository baseline defect → retest → reinspect. Otherwise record the exact blocker.

## Documentation impact

Updated `docs/CURRENT_STATE.md` and applicable P0.1 evidence/matrix/backlog documents. P0.2 remains next only; do not start it without approval. See `docs/codex/P0_1_BASELINE_REPORT.md` for the completed evidence and remaining access-limited facts.

## Stop / Founder-decision conditions

Stop before live configuration/data/schema/RLS changes, destructive cleanup, production-auth redesign, major dependency upgrades, or unresolved product/financial decisions. Do not commit, push, deploy, or begin P0.2.

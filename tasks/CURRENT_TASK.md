# P1.1 — Live Schema / RLS Baseline Inventory & Repository Reconciliation

**Parent macro phase:** PHASE 1
**Status:** Complete — local release candidate; publication is a separate Founder approval gate
**Approved baseline:** `6d37b4589fca47fe56b294c4c12292b44a2db138`

## Objective

Establish an evidence-backed, metadata-only baseline for the live Supabase schema, RLS, grants, public RPCs, storage configuration, and migration ledger; reconcile it with retained repository migrations and persistence code.

## Governing context

- `docs/codex/KONFRM_MASTER_RULES.md`
- `docs/DATABASE.md`, `docs/ARCHITECTURE.md`, and `docs/INTEGRATIONS.md`
- Retained migrations `backend/database/migrations/008_*.sql` through `020_*.sql`
- The active P1.1 execution contract and connected Supabase metadata evidence

## Requirements

- Inventory repository and live metadata without reading business rows or private objects.
- Reconcile every retained migration with the live `schema_migrations` ledger and observed effect.
- Document public tables, constraints, indexes, triggers, RLS/policies/grants, relevant functions, and Storage buckets/policies.
- Determine the actual frontend → backend → service-role database boundary and identify any contradiction between repository grant intent and live metadata.
- Record all drift using the approved taxonomy; create the P1.1 evidence report and update current-reality, completion, rescue-backlog, execution-map, database, and current-state records.

## Constraints

- SELECT/metadata inspection only. No migrations, DDL, DML, RPC invocation, grants/revokes, storage operations, deploy, push, CI/config/dependency/runtime changes, or P1.2 work.
- Do not record names, phones, emails, tokens, document URLs/object keys, or business-row payloads.
- Do not treat RLS enabled/no policy or a security-advisor warning as conclusive without privilege and architecture evidence.
- Finish with one local-only commit: `chore(db): close P1.1 schema and RLS baseline`.

## Acceptance evidence

The active P1.1 contract’s 48-item matrix, three-pass review, complete migration reconciliation, and no-mutation proof are required. A confirmed security finding is documented and routed to an existing planned phase; it is not remediated in P1.1.

## Closure

P1.1 inventory is complete. The approved next recommendation is P14.1 remediation planning because live anonymous/authenticated execution of critical SECURITY DEFINER RPCs contradicts retained migration intent. Do not begin that work or publish this release candidate without a separate approval.

## Documentation impact

Update only evidence/governance records required by the inventory, including `docs/codex/P1_1_SCHEMA_RLS_BASELINE_REPORT.md`. Replace this contract with the next approved task only after P1.1 closure.

# P14.1 — authorization remediation report

**Status:** Local release candidate prepared; live application is pending Founder approval.
**Baseline:** `d7462f13eb8783a2d5422f574ec11a451d69b9d9` (`main` = `origin/main` before this local work).
**Evidence date:** 2026-08-30.
**Privacy:** repository inspection and live read-only catalog metadata only; no business rows, private objects, secrets, or mutating RPCs were accessed.

## Boundary and result

KONFRM applications call `/api/v1`; the backend authorizes the request and invokes Supabase with the service-role secret through the Worker’s strict REST/RPC adapter. Ordinary `anon` and `authenticated` database roles must not call server-only mutating payment or Owner-registration/KYC functions directly.

### LIVE_PRE_REMEDIATION_STATE

Read-only `pg_proc`, `information_schema.routine_privileges`, `has_function_privilege`, `pg_default_acl`, trigger, and event-trigger inspection confirmed all four critical functions are `SECURITY DEFINER`, use `search_path=public`, and are executable by `anon`, `authenticated`, and `service_role`:

- `konfrm_complete_deposit_payment(uuid,uuid,uuid)`
- `konfrm_register_owner(text,text)`
- `konfrm_submit_owner_kyc(uuid,jsonb)`
- `konfrm_review_owner_kyc(uuid,text,text)`

Their explicit ACLs match the `postgres` default function ACL for `public`: `postgres`, `anon`, `authenticated`, and `service_role` all have `EXECUTE`. `rls_auto_enable()` is also `SECURITY DEFINER`, uses `search_path=pg_catalog`, is installed as the `ensure_rls` DDL event-trigger handler, and has the same ordinary-role access. `prevent_dispute_evidence_mutation()` is a non-definer trigger function for `trg_prevent_evidence_mutation` on `dispute_evidence`; it had no fixed search path.

The retained 019/020 SQL explicitly revokes `PUBLIC` and grants only `service_role`, so the observed configuration is DC-13. The metadata proves that PostgreSQL default function privileges are compatible with the unsafe live ACLs. It cannot prove the exact later action that restored them: the retained/application migration provenance is incomplete. That uncertainty does not change the required explicit remediation.

### REPOSITORY_FIX_READY

[`021_harden_critical_rpc_privileges.sql`](../../backend/database/migrations/021_harden_critical_rpc_privileges.sql) is a narrow, transactional migration that:

1. Explicitly revokes the four critical function ACLs from `PUBLIC`, `anon`, and `authenticated`.
2. Explicitly grants `EXECUTE` back only to `service_role` for those four application RPCs.
3. Revokes direct execution of `rls_auto_enable()` from ordinary roles and `service_role`; its event-trigger execution remains owner-managed and needs no API grant.
4. Pins `prevent_dispute_evidence_mutation()` to `pg_catalog`. Its body only raises the existing immutable-evidence exception, so this changes lookup metadata rather than append-only behavior.
5. Records only migration 021 in the application ledger, idempotently. It does not alter historic ledger gaps.

The migration does not change function bodies, table RLS, policies, broad table grants, storage, business data, payment/KYC logic, financial calculations, or same-UUID identity behavior. It intentionally does **not** change global default privileges: the present default ACL is part of the drift cause, but globally changing it could break intentionally public RPCs and requires a separately scoped architecture decision.

`backend/server/src/security/criticalRpcPrivilegeContract.ts` supplies a pure evaluator and a `SELECT`-only live-audit query that considers both explicit and implicit `PUBLIC` execute privileges. Its focused test checks secure and unsafe metadata fixtures and verifies the migration covers the four signatures without introducing a default-privilege or RLS-policy change.

### LIVE_MUTATION_PENDING_FOUNDER_APPROVAL

This report and migration do **not** close the live gap. A subsequent explicit Founder approval must authorize: publish the exact release-candidate commit, apply only migration 021 to live Supabase, then run the read-only ACL query again. The expected post-application contract is:

| Principal | Four critical mutating RPCs |
| --- | --- |
| `PUBLIC` | no `EXECUTE` |
| `anon` | no `EXECUTE` |
| `authenticated` | no `EXECUTE` |
| `service_role` | `EXECUTE` |
| function owner (`postgres`) | normal administrative ownership retained |

## Repository call-path evidence

- `dbRepository.ts` invokes the four RPCs through `queryDb`.
- `dbClient.ts` maps each call to the corresponding Supabase REST `/rpc/...` endpoint with `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`.
- `paymentService.ts` invokes only the payment-finalization RPC for canonical completion.
- Static search found no Customer, Owner, or Admin direct Supabase client or environment use; they call `/api/v1`.

## Adversarial review

1. Proposed ACL denies `PUBLIC`, `anon`, and `authenticated` execution of every critical mutator.
2. `service_role` is explicitly preserved for each application RPC, so the backend path remains available.
3. No frontend Supabase dependency, RLS weakening, private-KYC exposure, product/financial rule, or identity-model change was introduced.
4. The existing `ensure_rls` event trigger remains configured; only its unnecessary direct API execution is removed.
5. The dispute trigger still raises its existing exception for `UPDATE`/`DELETE`; only its function lookup path is fixed.
6. A future `CREATE OR REPLACE FUNCTION` or direct grant can re-open this boundary because live default privileges remain broad. The migration’s explicit revokes and the reusable ACL evaluator are the proportionate guard; global default-privilege hardening is explicitly deferred for a separately authorized decision.

## Acceptance matrix

| # | Result | Evidence |
| --- | --- | --- |
| 01–04 | PASS | Approved baseline, mandatory context, P1.1 publication state, and DC-13 were re-established. |
| 05–08 | PASS | Live read-only ACL/config metadata reconfirmed signatures, `SECURITY DEFINER`, and role execution. |
| 09–13 | PASS | 019/020 intent, service-role Worker path, absence of frontend Supabase mutation path, prefix 021, and historic-file preservation verified. |
| 14–17 | PASS (proposed) | Migration explicitly revokes `PUBLIC`/`anon`/`authenticated` and grants the four RPCs to `service_role`. |
| 18–21 | PASS | `rls_auto_enable` is event-trigger-only and hardened; dispute trigger use/body support safe `pg_catalog` path hardening. |
| 22–28 | PASS | No RLS policy/table/data/business/payment/KYC/identity change is included. |
| 29–31 | PASS | Portable Node 22 ran the focused ACL-contract, signed-token access, Owner identity, Owner KYC/registration, and payment/Worker-RPC tests; backend `tsc --noEmit` passed. |
| 32–35 | PASS | Scoped final diff, `git diff --check`, touched-Markdown relative-link, and design-system checks passed; documentation and functional/product/adversarial reviews completed. |
| 36 | PASS | No known safe in-scope repository defect remains after validation. |
| 37 | PASS | No live Supabase/database mutation occurred. |
| 38 | PASS at closure | One clean local release-candidate commit is required; no push. |

## Closure classification

- **Repository:** `REPOSITORY_FIX_READY` after the local release-candidate validation/commit.
- **Live configuration:** `LIVE_PRE_REMEDIATION_STATE` remains a critical security gap.
- **Next gate:** `LIVE_MUTATION_PENDING_FOUNDER_APPROVAL`.

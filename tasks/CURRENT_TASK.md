# P0.2 — Prototype authentication and access blocker audit

**Parent macro phase:** PHASE 0
**Status:** Complete — local release candidate; publication is a separate Founder approval gate.
**Approved baseline:** `5cb7b421328004bc56e6b4eff99e79c601fead5d` (`main` = `origin/main` at start)

## Objective

Produce executable, cross-role evidence that current prototype authentication and server-side access boundaries work for Customer, Owner, Admin, and representative protected backend routes. Repair any safe P0.2 defect found; do not redesign production authentication.

## Affected systems and current implementation paths

- **Customer:** `customer-app/src/App.tsx`, `CustomerAuthModal.tsx`; prototype login at `/api/v1/auth/prototype-login`, browser persistence under `sola_customer_*`.
- **Owner:** `owner-app/src/context/AuthContext.tsx`, `owner-app/src/App.tsx`, Owner login/registration entry; canonical Owner profile validation gates `AppProvider`, browser persistence under `sola_*`.
- **Admin:** `admin-app/src/App.tsx`, `utils/adminTruthfulState.ts`, `AdminLogin.tsx`; `/api/v1/admin/auth/login` plus `/api/v1/admin/auth/session` validation gates the shell.
- **Backend:** `backend/server/src/services/authService.ts`, `middleware/auth.ts`, `controllers/authController.ts`, `app.ts`; signed JWTs, refresh/session records, role checks, and canonical subject-derived ownership.

## Governing rules and non-negotiables

- Prototype Customer/Owner/Admin access must not be blocked by OTP/SMS; retained OTP/SMS code is audited as legacy unless reachable from the active path.
- `users` is canonical human identity; `owners` is an optional same-UUID capability. Owner login never creates that capability.
- A validated canonical Owner is required before the Owner `AppProvider` mounts; account-scoped Owner state must clear on logout or identity change.
- Public Customer browsing remains public where the route contract permits it. Protected actions require canonical auth and role/ownership authorization; client IDs are never authority.
- Auth/network/database failure must remain truthful; it must not become a valid shell, anonymous success, zero/empty business state, or a fabricated token.
- No secrets/tokens/credentials in source or reports. No database/RLS/migration/data, infrastructure/CI, dependency, deployment, push, or live-user mutation.

## Evidence required

The approved P0.2 45-item matrix: architecture and OTP classification; anonymous, valid, stale, wrong-role, logout, failure, and cross-account cases; representative backend authorization; focused executable regression tests; typechecks/builds; security/privacy; documentation and three-pass closure review.

## Explicit non-goals

No final production auth design, SMS provider, mandatory OTP, identity-model redesign, KYC/booking/payment/wallet/property changes, UI redesign, schema/RLS changes, CI/deployment/configuration changes, publish/deploy, or P1.1 work.

## Current evidence and open decisions

- Current prototype login is OTP-free in Customer and Owner active UI paths; legacy request/verify OTP endpoints and Owner OTP screen require reachability classification.
- Final production authentication remains an explicit product/security decision.
- Retained migrations do not prove complete RLS history; P0.2 does not alter schema/RLS. See `docs/codex/KONFRM_DECISION_CONFLICTS.md` DC-04/DC-06.

## Relevant authorities

`AGENTS.md`, `docs/INDEX.md`, `docs/CURRENT_STATE.md`, `docs/codex/KONFRM_MASTER_RULES.md`, current reality/conflicts/matrix/rescue/quality/execution-map documents, `docs/BUSINESS_RULES.md`, `docs/ARCHITECTURE.md`, `docs/INTEGRATIONS.md`, and the P0.2 execution contract.

## Validation and closure

Use only mock/isolated focused tests after confirming their safety. Run backend checks with Node 22 and proportionate Customer/Owner/Admin checks. Apply functional, product/UI, and adversarial review; update the P0.2 report, reality, matrix, rescue backlog, execution map, and current state from evidence. Finish with one local release-candidate commit only; do not push or deploy.

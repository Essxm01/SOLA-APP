# P2.3 — Owner API Contract

**State:** READY_FOR_IMPLEMENTATION_AFTER_PLAN_HANDOFF
**Roadmap:** Phase 2 / P2.3 Owner APIs
**Base SHA:** `baecc9f7f9c16aafa1954ddf7aa6e3cead5c757a`
**Spec:** `docs/superpowers/specs/2026-09-04-p2-3-owner-api-contract-design.md`
**Plan:** `docs/superpowers/plans/2026-09-04-p2-3-owner-api-contract.md`
**Approved approach:** Owner Core Contract Hardening + Truthful Client Alignment

## Objective

Harden the currently required Owner core API/client boundary so Profile, Properties/Media, Calendar/manual blocks, Booking requests/decisions, booking financial reads, and Wallet/Ledger use canonical server/database truth and fail truthfully.

Do not build full future engines from historical Owner interfaces.

## Read First

1. `AGENTS.md`
2. `docs/codex/KONFRM_MASTER_RULES.md`
3. `docs/codex/KONFRM_QUALITY_GATES.md`
4. `KONFRM_MASTER_PROJECT_CONTEXT.md`
5. `خطة عمل التطبيق.txt`
6. this task contract
7. the P2.3 spec and plan above
8. only then task-relevant code/tests.

Known operational note: `docs/CURRENT_STATE.md` and `tasks/CURRENT_TASK.md` lag the latest published P2.2/hotfix reality at this base. Do not treat their stale phase label as authority over this explicit task contract. Reconcile operational docs only when implementation evidence changes them.

## Core Scope

- Owner profile/capability truth.
- Owner property contract and existing P1.3 media boundary.
- Owner calendar/manual availability block contract.
- Owner booking list/detail as actually required, approve/reject.
- Canonical persisted Owner booking financial summary read.
- Canonical Owner wallet/ledger reads.
- Minimal Owner client alignment needed to avoid fake/empty success on P2.3 core.
- Retire/isolate fake-success payout behavior without implementing Phase 11.
- If retained/used, make Owner notification read DB failure truthful without building Phase 9.
- Focused tests + regression protection.

## Explicitly Deferred

Do not implement full:

- Notifications engine — Phase 9.
- Payout engine/provider/methods — Phase 11.
- Chat — Phase 12.
- Cancellation/modification/disputes/reviews — Phase 13.
- Analytics.
- global error-contract redesign — P2.6.
- Owner UI/UX redesign — Phase 6.

Historical frontend interface methods do not become requirements merely by existing.

## Non-Negotiable Product Rules

### Identity / authorization

- authenticated Owner identity = verified JWT `sub`;
- role must be `ROLE_OWNER`;
- same human may also have Customer capability, but an Owner token does not authorize Customer protected routes and vice versa;
- no client-supplied Owner id may override authorization;
- foreign Owner IDOR must fail.

### Property

- property is canonical source of truth;
- public only `PUBLISHED + VERIFIED`;
- Owner cannot self-publish/self-verify;
- property rejection remains existing composite state;
- `address` remains a string and empty string is valid product state;
- protected-booking integrity must not be weakened;
- P1.3 media atomicity/storage rules remain intact.

### Availability

- 2–30 nights;
- `PENDING_OWNER_APPROVAL` does not block;
- `APPROVED_PENDING_PAYMENT` blocks;
- `CONFIRMED` blocks;
- Quote is not a hold;
- booking/approval revalidation remains server authoritative;
- failures fail closed;
- manual-block vs booking conflict/race protections remain intact.

### Booking

- request begins `PENDING_OWNER_APPROVAL`;
- Owner approve -> `APPROVED_PENDING_PAYMENT`;
- Owner reject -> `REJECTED`;
- Owner approval never directly -> `CONFIRMED`;
- no payment before Owner approval.

### Finance

- deposit = actual first-night price;
- commission = 20% of deposit only;
- Owner net deposit = 80% of deposit;
- remaining = total - deposit;
- 0% commission on remaining;
- server/persisted booking financial summary is authoritative;
- never use hardcoded/reconstructed plausible money;
- Customer privacy boundary from P2.2 remains intact.

### Wallet

- use canonical P1.6 wallet/immutable ledger;
- DB error != zero balance;
- Pending / Available / Held / ReservedForPayout stay distinct;
- no new wallet mutation semantics in P2.3.

## Known Defects to Prove RED Before Fix

At base SHA:

1. `GET /api/v1/owner/profile` masks `ownerDb.getById` failure as 404.
2. `GET /api/v1/owner/bookings/:id/financials` uses hardcoded `1500` total and `500` first-night inputs.
3. `POST /api/v1/owner/payouts` can return synthetic success using hardcoded balance/fee and fabricated id.
4. Owner notifications can fall back from DB failure to in-memory success.
5. Owner service interfaces contain routes broader than current backend truth; do not implement them blindly.
6. P2.3 core frontend errors must not be caught into genuine-looking empty/zero state.

## Database Boundary

Default: **NO MIGRATION**.

If a new migration/RPC/transaction/schema change appears necessary:

`STOP -> report exact persistence gap -> return to Bridge/Founder architecture gate.`

Do not author/apply it under this contract.

## Worker Boundary

- exact/narrow matcher only if required;
- no general SQL engine;
- preserve non-OK/malformed fail-closed semantics;
- do not replace transaction authority with sequential Worker calls.

## TDD / Self-Fix

For changed behavior:

`RED failing test -> verify failure reason -> minimal GREEN -> run focused test -> run adjacent regressions.`

For any in-scope defect:

`Detect -> root cause -> fix -> retest -> reinspect.`

Do not create extension tasks for an in-scope defect unless a genuine stop condition applies.

## Mandatory Regression Surface

Backend focused/regression includes as applicable:

- `test:owner-identity-01`
- `test:owner-registration-kyc-01`
- `test:owner-property-wizard-01`
- `test:p13-property-persistence`
- `test:p13-property-media`
- `test:p13-worker-adapter`
- `test:p13-atomic-media`
- `test:p1-4-availability`
- `test:p1-4-worker-availability`
- `test:p1-5-atomic-booking`
- `test:p1-6-wallet-ledger`
- `test:p2-1-public-api`
- `test:p2-2-renter-api`
- new `test:p2-3-owner-api`
- backend `check`.

Owner frontend:

- relevant focused tests for changed contract/state helpers;
- `test:bookings`
- `test:properties`
- `test:property-wizard`
- `test:wallet`
- `test:home` if bootstrap/home state changes;
- `check` / `build`.

Cross-role must remain working:

- Owner create/edit/submit -> Admin review/publish -> Customer Explore/Search/Detail/Favorites.
- Customer booking request -> same Owner approve -> Customer sees `APPROVED_PENDING_PAYMENT`.
- Customer booking request -> same Owner reject -> Customer sees `REJECTED`.

## Single Writer / Agent Routing

Default implementation writer: **Antigravity**.

Escalate instead of improvising if the necessary fix requires:

- SQL/RPC/migration;
- new transaction/concurrency semantics;
- booking lifecycle change;
- wallet/payout mutation logic;
- another complex architectural change.

Such work goes back to Bridge for possible ZCode routing.

Codex is reserved for final exact-SHA semantic/adversarial review when the candidate is ready.

## Hard Boundaries

NO:

- roadmap change;
- Business Rule change;
- financial formula change;
- availability policy change;
- KYC policy change;
- refund/payment-expiry invention;
- full future-feature implementation;
- mass refactor;
- database migration without new approval;
- Supabase/Storage live mutation;
- merge/main push/deploy without publication authorization.

## Candidate Report Format

Return:

```text
RESULT:
START_SHA:
FINAL_SHA:
BASE_SHA:
CHANGED_PATHS:

ROOT_CAUSES_FIXED:

AUTOMATED_GATES:

SEMANTIC_GATES:
- identity/authz
- property/media
- availability
- booking lifecycle
- finance truth/privacy
- wallet
- deferred-feature isolation
- Worker strictness
- cross-role regression

LIVE_MUTATIONS:
NONE

UNRESOLVED:
NONE | exact blocker

NEXT_GATE:
```

Do not claim the task CLOSED. The candidate still requires exact-head review/CI/publication/live verification according to Bridge orchestration.

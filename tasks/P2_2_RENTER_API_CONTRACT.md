# P2.2 — Renter API Contract Implementation Handoff

TASK_ID: P2.2_RENTER_API_CONTRACT
STAGE: IMPLEMENTING
EXECUTOR: Antigravity
RISK_CLASS: Architectural / authenticated identity + privacy + persistence
LIVE_MUTATION: FORBIDDEN
SINGLE_WRITER: REQUIRED

## Exact repository state

Repository: `Essxm01/SOLA-APP`

Base main SHA:
`198a00ea39083932012f54144f93fb7516204024`

Candidate branch:
`validation/p2-2-rc`

Starting candidate SHA:
`3038f3d4cf05947e7c4868ecceebe9c199a07751`

Approved design:
`docs/superpowers/specs/2026-09-03-p2-2-renter-api-contract-design.md`

Approved implementation plan:
`docs/superpowers/plans/2026-09-03-p2-2-renter-api-contract.md`

Both design and plan are part of the starting candidate history. Implement the plan; do not rewrite the approved product design.

## Workspace / writer discipline

Work only on `validation/p2-2-rc`.

Before editing:
1. `git fetch origin`.
2. Verify `origin/main` equals the exact base SHA above.
3. Verify `origin/validation/p2-2-rc` equals the exact starting candidate SHA above.
4. Read the approved spec and plan from the exact starting candidate SHA.
5. Detect whether the environment is already isolated. If already in a linked worktree, use it. If a native worktree/isolation feature exists, prefer it. If manual `git worktree` is required, first verify the worktree directory is gitignored.
6. Run the baseline checks required by the plan before changing code. If the baseline is already failing in an in-scope suite, STOP and report instead of attributing it to P2.2.

Single Writer means one process/agent may modify the candidate branch. Parallel helpers may scout/read only; they must not write or commit.

## Approved scope

P2.2 implements only:
- canonical fail-closed Customer Profile GET/PATCH behavior;
- truthful Account Summary failure semantics;
- explicit Customer-safe booking create/list/detail DTO boundaries;
- booking IDOR protection/regression tests;
- Migration `028_customer_favorites.sql`;
- canonical `customer_favorites` persistence;
- one approved atomic add RPC: `public.konfrm_add_customer_favorite(UUID, UUID)`;
- narrow `favoriteDb` repository operations;
- exact/collision-safe Worker/PostgREST support for Favorite list/add/remove;
- protected Customer Favorites GET/POST/DELETE routes;
- minimal Customer App integration replacing local Favorite authority;
- truthful Customer Profile/Account/Favorites states;
- focused P2.2 CI coverage.

Explicitly out of scope:
- Customer Notifications/unread model (P9.1);
- Payment changes (P10);
- Chat changes (P12);
- Owner or Admin API/UI changes;
- booking lifecycle changes;
- availability rule changes;
- deposit/commission/Owner-net formulas;
- wallet/ledger/payout behavior;
- KYC;
- cancellations/disputes/reviews;
- Customer visual redesign;
- generic controller/OpenAPI/error-contract refactor;
- generic arbitrary-SQL Worker capability.

## Product / security invariants

- Customer identity is only verified `ROLE_CUSTOMER` JWT `sub`.
- Never accept client-supplied Customer identity as authority.
- Same human may also be Owner; an Owner token does not authorize protected Customer routes.
- Customer-visible finance is only total + deposit + remaining + `EGP`.
- Never expose commission, Owner net, wallet, ledger, payout/provider internals or Owner contact data.
- Preserve P1.4 availability semantics exactly.
- Preserve P1.5/P1.6 booking/finance persistence semantics exactly.
- Booking creation remains atomic through migration 026 / `konfrm_create_booking_request`; no sequential fallback.
- No payment before Owner approval.
- Canonical DB/adapter failure must never become credible empty/zero success.
- No broad object spread from internal booking rows into Customer responses.

## Approved Favorites DB contract

Migration:
`backend/database/migrations/028_customer_favorites.sql`

Table:
`public.customer_favorites(customer_id, property_id, created_at)`

Required:
- FK `customer_id -> users(id) ON DELETE CASCADE`;
- FK `property_id -> properties(id) ON DELETE CASCADE`;
- composite primary key `(customer_id, property_id)`;
- deterministic Customer/newest ordering index if per plan;
- RLS enabled;
- no direct anon/authenticated application policy;
- revoke direct table privileges from `PUBLIC`, `anon`, `authenticated`;
- grant only required `SELECT`, `INSERT`, `DELETE` table privileges to `service_role`;
- register `028_customer_favorites.sql` in `schema_migrations`.

Approved add RPC only:
`public.konfrm_add_customer_favorite(UUID, UUID)`

RPC requirements:
- `SECURITY INVOKER`;
- `SET search_path = public, pg_temp`;
- atomic publication eligibility + insert in PostgreSQL;
- target must be `deleted_at IS NULL`, `status='PUBLISHED'`, `verification_status='VERIFIED'`;
- duplicate add idempotent and preserves original `created_at`;
- 1 row = saved/already saved;
- 0 rows = target missing/non-public/ineligible;
- >1 or malformed row = fail closed;
- revoke execute from `PUBLIC`, `anon`, `authenticated`;
- grant execute to `service_role` only;
- no `SECURITY DEFINER`;
- no check-then-insert two-call fallback.

## Required implementation paths

Expected implementation delta from the starting candidate SHA is limited to:

Create:
- `backend/database/migrations/028_customer_favorites.sql`
- `backend/server/src/contracts/customerRenter.ts`
- `backend/server/src/tests/p22RenterApiContract.test.ts`
- `customer-app/src/utils/customerFavorites.ts`

Modify:
- `backend/server/src/app.ts`
- `backend/server/src/services/dbRepository.ts`
- `backend/server/src/services/dbClient.ts`
- `backend/package.json`
- `customer-app/src/App.tsx`
- `customer-app/src/utils/customerTruthfulState.test.ts`
- `.github/workflows/ci-validation.yml`

Touch only if demonstrably required for type compatibility:
- `customer-app/src/components/BookingDetailModal.tsx`

Any Owner/Admin/payment/chat/wallet/KYC/unrelated migration path is a STOP condition unless a strictly necessary regression fixture is proven and explicitly called out in the report.

## Execution order — TDD required

Follow the approved plan in order. Each task must have RED evidence before its production change and GREEN evidence after it.

1. Authenticated Customer DTO boundary.
2. Profile + Account Summary fail-closed behavior.
3. Customer booking create/list/detail privacy + IDOR hardening.
4. Migration 028 + atomic Favorites RPC.
5. `favoriteDb` + exact Worker/PostgREST list/add/remove support.
6. Protected Favorites routes using P2.1 public property/media boundary.
7. Customer canonical Favorites + truthful profile/account states.
8. CI wiring + full release-candidate deterministic gate.

Do not collapse these into a broad refactor.

## Key fail-closed requirements

Profile:
- canonical `userDb.getById(jwt.sub)` only;
- no phone fallback;
- no `dbUsersStore` fallback;
- DB failure -> error;
- canonical null profile fields remain null in Customer App; no stale localStorage resurrection.

Account Summary:
- genuine zero bookings may return zeros;
- DB/financial failure must return error, never zeros;
- malformed numeric values fail closed.

Bookings:
- create/list/detail responses are explicit Customer DTOs;
- no `ownerId`, Owner contact, internal `customerId` if not needed, guest phone, `financialSummary`, commission, Owner net, wallet/ledger/payout/provider internals;
- required numeric/string values are semantically validated before response;
- Customer A cannot read Customer B booking;
- create path must keep migration-026 atomic persistence unchanged.

Favorites:
- list/add/remove always scoped by JWT Customer identity;
- client never chooses `customerId`;
- add uses only `SELECT * FROM konfrm_add_customer_favorite($1, $2)`;
- Worker matcher must recognize that exact function call with exactly two placeholders;
- list/remove SQL matchers must be exact and collision-tested;
- remove includes both Customer and property filters;
- remove 0-row result is legitimate idempotent success;
- list DB/media/malformed failure is error, not `[]`;
- a saved property becoming non-public is hidden from visible Favorites but the Favorite row is not auto-deleted;
- newly saving a non-public property is rejected safely;
- Customer Favorites tab must render canonical server-returned favorite properties, not filter the current Explore collection;
- signed-out Favorites is unauthorized/auth-required, not a credible successful empty collection;
- guest Favorite intent is stored separately from booking intent and completed canonically after auth;
- failed Favorite write must not remain visually saved.

## Worker adapter requirements

The deployed Worker uses narrow SQL-shape routing. Preserve that architecture.

Required new support only:
- exact Favorite list SQL -> narrow PostgREST SELECT;
- exact Favorite remove SQL -> scoped PostgREST DELETE with `Prefer: return=representation`;
- exact add RPC -> `/rest/v1/rpc/konfrm_add_customer_favorite`.

For every branch:
- strict HTTP failure handling;
- strict JSON type/cardinality validation;
- malformed HTTP 200 fails closed;
- collision tests prove similar/comments/wrapped SQL do not match;
- no generic `includes('customer_favorites')` branch;
- no arbitrary SQL execution fallback.

## Required local gates

At minimum, before push:

```text
npm --prefix backend run check
npm --prefix backend run test:p2-2-renter-api
npm --prefix backend run test:p12-identity-session
npm --prefix backend run test:p1-4-availability
npm --prefix backend run test:p1-4-worker-availability
npm --prefix backend run test:p1-5-atomic-booking
npm --prefix backend run test:p1-6-wallet-ledger
npm --prefix backend run test:p2-1-public-api
npm --prefix backend run test:p13-worker-adapter
npm --prefix customer-app run test:truthful-state
npm --prefix customer-app run build
git diff --check
```

Also run every RED/GREEN command specified task-by-task in the approved plan.

## CI / Git rules

- Add `npm run test:p2-2-renter-api` to Backend CI only as specified by the plan.
- Do not modify the known main-push deployment behavior in this product task.
- Commit in focused task-sized commits.
- Do not force-push.
- Push only `validation/p2-2-rc`.
- Open at most one PR from `validation/p2-2-rc` to `main` if repository auth supports it. If PR creation is unavailable, do not improvise; report `PR: NONE` and ChatGPT will create it.
- Wait for exact-head PR CI if a PR exists.
- PR CI must not deploy the Worker.

## Live mutation prohibition

Do NOT:
- apply Migration 028 to live Supabase;
- create/drop/alter live tables/functions;
- insert/delete/update live Favorite rows;
- mutate Storage;
- deploy Worker or Pages manually;
- merge PR to main;
- push directly to main.

Migration 028 is repository candidate only until explicit Founder Publication approval.

## Stop conditions

STOP and return `P2_2_IMPLEMENTATION_BLOCKED` if any of these become necessary:
- change unified identity architecture;
- `SECURITY DEFINER` Favorites RPC;
- direct frontend Supabase access;
- direct anon/authenticated Favorite table policy;
- a second new RPC;
- arbitrary SQL Worker capability;
- change booking lifecycle or finance/availability rules;
- redefine booking snapshot semantics;
- implement Customer Notifications/Payment/Chat work;
- change Owner/Admin product behavior;
- create another migration beyond 028;
- existing live/repository object named `customer_favorites` conflicts materially with the approved migration assumptions;
- baseline or required regression suite is failing before the corresponding P2.2 change and cannot be attributed safely;
- any production mutation/deploy is required to continue.

Do not solve a stop condition by broadening scope.

## Required final report

Return exactly this structure:

```text
RESULT: P2_2_IMPLEMENTATION_CANDIDATE_READY | P2_2_IMPLEMENTATION_BLOCKED
START_SHA: 3038f3d4cf05947e7c4868ecceebe9c199a07751
FINAL_SHA: <exact candidate head>
BASE_SHA: 198a00ea39083932012f54144f93fb7516204024
PR: <number/url or NONE>

CHANGED_PATHS:
- <exact path>

TASK_DISPOSITION:
- TASK_1_CUSTOMER_DTO_BOUNDARY: PASS|FAIL
- TASK_2_PROFILE_ACCOUNT_FAIL_CLOSED: PASS|FAIL
- TASK_3_BOOKING_PRIVACY_IDOR: PASS|FAIL
- TASK_4_MIGRATION_028_RPC: PASS|FAIL
- TASK_5_FAVORITE_DB_WORKER: PASS|FAIL
- TASK_6_FAVORITES_ROUTES: PASS|FAIL
- TASK_7_CUSTOMER_CANONICAL_FAVORITES: PASS|FAIL
- TASK_8_CI_RELEASE_GATE: PASS|FAIL

RED_EVIDENCE:
- <test/expected failure for each production task>

AUTOMATED_GATES:
- <exact command>: PASS|FAIL

SEMANTIC_GATES:
- PROFILE_CANONICAL_FAIL_CLOSED: PASS|FAIL
- PROFILE_NULL_CACHE_TRUTHFUL: PASS|FAIL
- ACCOUNT_ERROR_NOT_ZERO: PASS|FAIL
- BOOKING_CUSTOMER_DTO_PRIVACY: PASS|FAIL
- BOOKING_IDOR: PASS|FAIL
- BOOKING_ATOMIC_PATH_PRESERVED: PASS|FAIL
- FAVORITES_RPC_ATOMIC: PASS|FAIL
- FAVORITES_RPC_SECURITY_INVOKER: PASS|FAIL
- FAVORITES_RPC_SERVICE_ROLE_ONLY: PASS|FAIL
- FAVORITES_CUSTOMER_SCOPE: PASS|FAIL
- FAVORITES_ADD_IDEMPOTENT: PASS|FAIL
- FAVORITES_REMOVE_IDEMPOTENT: PASS|FAIL
- FAVORITES_NONPUBLIC_HIDDEN_INTENT_RETAINED: PASS|FAIL
- WORKER_MATCHERS_EXACT: PASS|FAIL
- WORKER_MALFORMED_RESPONSE_FAIL_CLOSED: PASS|FAIL
- CUSTOMER_FAVORITES_CANONICAL: PASS|FAIL
- CUSTOMER_GUEST_INTENT_RESTORED: PASS|FAIL
- CUSTOMER_WRITE_FAILURE_TRUTHFUL: PASS|FAIL
- NOTIFICATIONS_PAYMENT_CHAT_UNCHANGED: PASS|FAIL

PR_CI:
- RUN_ID: <id or NONE>
- HEAD_SHA: <sha or NONE>
- STATUS: <status or NONE>
- CONCLUSION: <conclusion or NONE>
- WORKER_DEPLOY_STEP: SKIPPED|NOT_AVAILABLE

LIVE_MUTATIONS: NONE
DEPLOYMENT: NONE
MERGE: NONE
UNRESOLVED:
- NONE | <specific blocker>
```

Do not call P2.2 CLOSED, CLEAN, publication-ready, or live-verified. ChatGPT will independently inspect the exact SHA/diff/tests/migration/Worker/Customer behavior before Codex is used.
# P2.1 — Public API Contract Execution

TASK_ID: P2.1
PHASE: 2 — Backend Contracts
RISK_CLASS: ARCHITECTURAL_PUBLIC_CONTRACT_PRIVACY
EXECUTOR: Antigravity
CANDIDATE_BRANCH: validation/p2-1-rc
STARTING_CANDIDATE_SHA: c3b6aadaf1c685327106c2b132fbd6d9890f258a
BASE_MAIN_SHA: 317b7c3071fdd167b3419e8fd1b7f96d08ba6427
SPEC_SHA: c3b6aadaf1c685327106c2b132fbd6d9890f258a
LIVE_MUTATION: FORBIDDEN
MERGE: FORBIDDEN
DEPLOY: FORBIDDEN

## Approved authorities

Read before editing:

1. `AGENTS.md`
2. `docs/INDEX.md`
3. `docs/CURRENT_STATE.md`
4. `tasks/CURRENT_TASK.md`
5. `docs/codex/KONFRM_MASTER_RULES.md`
6. `docs/superpowers/specs/2026-09-03-p2-1-public-api-contract-design.md`
7. `docs/superpowers/plans/2026-09-03-p2-1-public-api-contract.md`
8. affected code/tests only after the above context is loaded.

The Founder approved the P2.1 design and written spec. Execute the implementation plan; do not redesign it.

## Objective

Harden the existing public Customer API contract without changing URLs or business rules:

- server-authoritative Explore/Search for approved filters only;
- dedicated public property list/detail reads;
- explicit public DTO allowlists;
- no Owner contact/private/admin/internal-finance leakage;
- canonical active property media only, deterministic existing ordering, fail-closed;
- preserve P1.4 availability semantics;
- preserve P1.5/P1.6 quote/finance semantics;
- Customer App sends search intent to backend instead of using local-authoritative filtering;
- no visual redesign.

## Execution discipline

Use an isolated workspace/worktree if your environment supports it. Detect existing isolation first. Do not modify the Founder's current working tree unnecessarily.

Follow the approved plan task-by-task with TDD:

1. write focused failing test;
2. prove expected failure;
3. implement minimum approved behavior;
4. rerun focused tests;
5. commit the independently testable task;
6. continue to the next task.

One writer only on `validation/p2-1-rc` during implementation.

Do not use `git credential fill`, print tokens, inspect secrets, or extract credentials. Use the environment's existing safe GitHub authentication only.

## Hard product/architecture boundaries

Do not:

- create `/api/v1/public/*`;
- add a database migration, schema change, index, dependency, or new media endpoint;
- modify property publication rules;
- expose Owner phone/email/id, KYC, account status, admin review metadata, storage keys/upload intents, booking/customer private data, commission, Owner net, payout, wallet or ledger internals;
- alter 2–30 night rules;
- alter blocking statuses;
- alter deposit/commission/remaining calculations;
- alter booking lifecycle or payment timing;
- introduce client-authoritative fallback search if server search fails;
- redesign Customer UI;
- modify Owner/Admin UI;
- deploy, merge, apply migrations, mutate Supabase/Storage, or push directly to `main`;
- force-push.

Stop and report if any approved requirement appears to require one of those changes.

## Public API contract

Keep these public routes:

- `GET /api/v1/customer/properties/search`
- `GET /api/v1/customer/properties/:id`
- `GET /api/v1/customer/properties/:id/availability`
- `POST /api/v1/customer/bookings/calculate`

Approved Search query params only:

- `destination`
- `unitType`
- `guests`
- `maxPrice`

No query params = Explore feed.

Invalid `guests` or `maxPrice` must return truthful 400, never silently degrade to Explore.

## Mandatory known-risk adversarial checks

Before final report, explicitly prove:

1. public search/detail responses use explicit allowlists, not raw object spreading;
2. public details do not use `getDetailForAdmin()`;
3. Owner phone/email/private/admin fields cannot leak even if a mocked source row contains them;
4. public list/detail repository SQL selects only approved public source fields;
5. Worker adapter matching for canonical public list/detail SQL is collision-safe;
6. generic property matchers cannot intercept the public detail query and bypass publication filters;
7. comments/wrappers/altered SELECT/missing predicates/wrong placeholder do not enter the public adapter;
8. malformed PostgREST HTTP 200 responses fail closed;
9. detail cardinality is zero or one and returned id matches requested id;
10. media read failure returns error, not fake zero-image success;
11. unpublished/unverified/deleted/missing public details collapse to non-enumerating not-found behavior;
12. availability remains public, fail-closed, 2–30 nights, with canonical blocking statuses unchanged;
13. public quote contains only Customer-safe keys and ignores client financial fields;
14. Customer search controls issue backend requests; there is no authoritative local fallback on backend failure;
15. dates are not silently added as a P2.1 Search API filter;
16. no migration/live mutation/deploy/merge occurred.

## Expected changed paths

Expected/approved scope includes:

- `docs/superpowers/specs/2026-09-03-p2-1-public-api-contract-design.md` (already seeded)
- `docs/superpowers/plans/2026-09-03-p2-1-public-api-contract.md` (already seeded)
- `backend/server/src/contracts/publicProperty.ts` (new)
- `backend/server/src/tests/p21PublicApiContract.test.ts` (new)
- `backend/server/src/services/dbRepository.ts`
- `backend/server/src/services/dbClient.ts`
- `backend/server/src/app.ts`
- `backend/server/src/tests/p13WorkerAdapter.test.ts`
- `backend/package.json`
- `customer-app/src/utils/publicPropertySearch.ts` (new)
- `customer-app/src/utils/customerTruthfulState.test.ts`
- `customer-app/src/App.tsx`
- `customer-app/src/components/PropertyCard.tsx`
- `.github/workflows/ci-validation.yml`
- `docs/ARCHITECTURE.md`
- `docs/CURRENT_STATE.md`
- `tasks/CURRENT_TASK.md`

If another path is required for an in-scope defect, explain why before changing it. Do not broaden silently.

## Deterministic validation gate

Run all of these before reporting completion:

```bash
npm --prefix backend run check
npm --prefix backend run test:p2-1-public-api
npm --prefix backend run test:p13-property-persistence
npm --prefix backend run test:p13-property-media
npm --prefix backend run test:p13-worker-adapter
npm --prefix backend run test:p13-atomic-media
npm --prefix backend run test:p1-4-availability
npm --prefix backend run test:p1-4-worker-availability
npm --prefix backend run test:p1-4-migration
npm --prefix backend run test:p1-5-atomic-booking
npm --prefix backend run test:p1-6-wallet-ledger
npm --prefix backend run test:booking-01
npm --prefix backend run test:booking-01-1
npm --prefix customer-app run test:truthful-state
npm --prefix customer-app run build
git diff --check
```

Do not substitute “build passed” for the focused tests.

## Git/PR gate

- Work only on `validation/p2-1-rc`.
- Preserve a fast-forward history from the starting candidate SHA.
- Prefer the task-level commits in the plan; do not squash/rewrite history during implementation.
- Push the candidate branch after local gates pass.
- Open one PR to `main` if no P2.1 PR already exists.
- Record exact PR head/base.
- Wait for exact-head PR CI.
- Worker production deployment must be skipped on PR event.
- Do not merge.

## Final report format

Return exactly one closure-candidate report containing:

```text
RESULT: P2_1_IMPLEMENTATION_CANDIDATE_READY | BLOCKED
BASE_MAIN_SHA:
STARTING_CANDIDATE_SHA:
FINAL_CANDIDATE_SHA:
PR:
EXACT_CHANGED_PATHS:
TASK_COMMITS:
PUBLIC_SEARCH_CONTRACT:
PUBLIC_DETAIL_PRIVACY_PROOF:
WORKER_MATCHER_PROOF:
AVAILABILITY_REGRESSION:
QUOTE_REGRESSION:
CUSTOMER_INTEGRATION_PROOF:
AUTOMATED_GATES:
PR_CI:
LIVE_MUTATIONS: NONE
DEPLOYMENT: NONE
MERGE: NONE
UNRESOLVED:
```

Do not call the task CLOSED. ChatGPT will independently verify the report and decide whether the candidate is ready for final Codex review.

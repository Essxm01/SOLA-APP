# P2.3 Owner API Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the currently required Owner core API/client boundary so Owner Profile, Properties/Media, Calendar, Booking decisions/financial reads, and Wallet/Ledger use canonical truth, while retiring fake-success finance behavior and preserving later roadmap phases.

**Architecture:** Keep the existing `/api/v1/owner/*` routes and Phase 1 persistence boundaries. Add one focused Owner contract/DTO module, harden existing handlers and exact Worker mappings only where needed, and align the current Owner HTTP client without implementing historical future-domain interfaces. Default to no migration; any new SQL/RPC/schema requirement is a stop condition.

**Tech Stack:** TypeScript 6, Node 22 backend, React 19/Vite 8 Owner App, PostgreSQL/Supabase, Cloudflare Worker/PostgREST adapter, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-04-p2-3-owner-api-contract-design.md`

## Global Constraints

- Base from exact `main` SHA `baecc9f7f9c16aafa1954ddf7aa6e3cead5c757a`.
- One active implementation writer.
- TDD: prove each changed behavior RED before production change, then GREEN.
- Owner identity is verified JWT `sub`; protected Owner role is `ROLE_OWNER`.
- `address: ''` remains a valid canonical property state.
- Booking approval is only `PENDING_OWNER_APPROVAL -> APPROVED_PENDING_PAYMENT`; rejection -> `REJECTED`; approval never confirms payment.
- `PENDING_OWNER_APPROVAL` does not block; `APPROVED_PENDING_PAYMENT` and `CONFIRMED` do.
- Deposit = actual first-night price; commission = 20% of deposit only; Owner net = 80%; remaining = total - deposit; no remaining commission.
- Do not expose Owner-internal finance through Customer contracts.
- Preserve P1.3 media atomicity, P1.4 availability, P1.5 booking atomicity/concurrency, P1.6 wallet/ledger.
- No migration/RPC/schema change under this plan. If one becomes necessary, STOP.
- Full Notifications/Payout/Chat/Disputes/Analytics remain in their later roadmap phases.
- No `main` push, merge, deploy, Supabase/Storage mutation during implementation candidate construction.

---

## File Structure / Intended Responsibility

### Create

- `backend/server/src/contracts/ownerCore.ts`
  - explicit Owner-facing DTO validation/mapping helpers;
  - no DB access and no product state transitions.

- `backend/server/src/tests/p23OwnerApiContract.test.ts`
  - focused contract/security/truthfulness tests for P2.3.

### Modify as needed by the tasks below

- `backend/server/src/app.ts`
  - existing Owner route handlers only.

- `backend/server/src/services/dbClient.ts`
  - only exact Worker/PostgREST mappings required by an already-approved P2.3 repository query.

- `backend/server/src/services/dbRepository.ts`
  - reuse existing canonical repository methods; modify only if a missing read helper can be satisfied without schema/transaction changes.

- `backend/package.json`
  - add `test:p2-3-owner-api`.

- `owner-app/src/services/http/HttpRepository.ts`
  - align current core HTTP calls/response normalization; do not implement future missing endpoints.

- `owner-app/src/services/contracts/index.ts`
  - narrow/remove misleading core-facing signatures only when current app use requires it; preserve mock compatibility where not harmful.

- `owner-app/src/context/AuthContext.tsx`
  - only if canonical Owner profile mapping/error semantics require adjustment.

- `owner-app/src/context/AppContext.tsx`
  - only for P2.3 core truth/error handling and fake payout isolation.

- `owner-app/src/utils/ownerIdentity.ts`
  - canonical Owner profile normalization if required.

- focused Owner utility tests if a pure adapter/state helper is changed.

- `docs/CURRENT_STATE.md`, `tasks/CURRENT_TASK.md`
  - update only at the final evidence/documentation task, never ahead of implementation reality.

---

### Task 1: Owner Contract Foundation + Truthful Profile

**Files:**
- Create: `backend/server/src/contracts/ownerCore.ts`
- Create: `backend/server/src/tests/p23OwnerApiContract.test.ts`
- Modify: `backend/server/src/app.ts`
- Modify: `backend/package.json`
- Modify if needed: `owner-app/src/services/http/HttpRepository.ts`
- Modify if needed: `owner-app/src/utils/ownerIdentity.ts`
- Test if changed: `owner-app/src/utils/ownerIdentity.test.ts`

**Interfaces:**
- Consumes: `ownerDb.getById(ownerId)` canonical row shape from `dbRepository.ts`.
- Produces: explicit `OwnerProfileDto` validation/mapping used by GET/PUT Owner profile handlers.

- [ ] **Step 1: Add the focused test script before implementation**

Add to `backend/package.json`:

```json
"test:p2-3-owner-api": "npx tsx server/src/tests/p23OwnerApiContract.test.ts"
```

- [ ] **Step 2: Write RED profile failure/auth tests**

In `p23OwnerApiContract.test.ts`, monkey-patch only the repository methods needed by the test and restore them in `finally`.

Required cases:

```ts
(ownerDb as any).getById = async () => {
  throw new Error('database unavailable');
};
const failed = await app.handleHttpRequest('GET', '/api/v1/owner/profile', ownerHeaders(ownerA));
assert.equal(failed.statusCode, 500);
assert.equal((failed.body as any).error.code, 'OWNER_PROFILE_QUERY_FAILED');
```

Also assert:

```ts
(ownerDb as any).getById = async () => null;
const missing = await app.handleHttpRequest('GET', '/api/v1/owner/profile', ownerHeaders(ownerA));
assert.equal(missing.statusCode, 404);
```

and Customer-role access to `/api/v1/owner/profile` remains `403`.

Run:

```bash
npm --prefix backend run test:p2-3-owner-api
```

Expected: the DB-failure test fails against the base because the route currently converts it to 404.

- [ ] **Step 3: Create explicit Owner profile contract helpers**

In `ownerCore.ts`, define the backend wire DTO from the actual canonical Owner row fields, not the historical Owner UI model:

```ts
export interface OwnerProfileDto {
  id: string;
  phoneNumber: string;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  status: string;
  verificationStatus: string;
  ownerOnboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

Implement a strict mapper that rejects malformed required values instead of coercing them:

```ts
export function toOwnerProfileDto(raw: unknown): OwnerProfileDto {
  const row = raw as Record<string, unknown>;
  if (!row || typeof row !== 'object') throw new Error('MALFORMED_OWNER_PROFILE');
  if (typeof row.id !== 'string' || typeof row.phoneNumber !== 'string') {
    throw new Error('MALFORMED_OWNER_PROFILE');
  }
  if (typeof row.createdAt !== 'string' || typeof row.updatedAt !== 'string') {
    throw new Error('MALFORMED_OWNER_PROFILE');
  }
  if (typeof row.status !== 'string' || typeof row.verificationStatus !== 'string') {
    throw new Error('MALFORMED_OWNER_PROFILE');
  }
  return {
    id: row.id,
    phoneNumber: row.phoneNumber,
    fullName: row.fullName === null || typeof row.fullName === 'string' ? row.fullName : null,
    email: row.email === null || typeof row.email === 'string' ? row.email : null,
    avatarUrl: row.avatarUrl === null || typeof row.avatarUrl === 'string' ? row.avatarUrl : null,
    status: row.status,
    verificationStatus: row.verificationStatus,
    ownerOnboardingCompletedAt: row.ownerOnboardingCompletedAt === null || typeof row.ownerOnboardingCompletedAt === 'string' ? row.ownerOnboardingCompletedAt : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
```

If current DB rows omit nullable keys rather than returning `null`, adjust only the nullable checks; do not weaken required identity/status/timestamp validation.

- [ ] **Step 4: Harden GET/PUT profile handlers**

Replace `.catch(() => null)` query masking with an explicit try/catch:

```ts
let owner: unknown;
try {
  owner = await ownerDb.getById(ownerId);
} catch {
  return {
    statusCode: 500,
    body: { success: false, error: { code: 'OWNER_PROFILE_QUERY_FAILED', message: 'تعذر تحميل بيانات حساب المالك.' }, timestamp },
  };
}
```

Only genuine `null` becomes not-found. Map successful GET/PUT results through `toOwnerProfileDto` and treat malformed canonical rows as 500.

- [ ] **Step 5: Normalize the HTTP DTO at the Owner client boundary if required**

Do not cast an incompatible backend DTO directly to the historical `Owner` UI model. If the current UI still needs `name/phone/avatar`, add an explicit adapter in the Owner HTTP/identity boundary using the canonical fields:

```ts
const toOwnerViewModel = (dto: OwnerProfileDto): Owner => ({
  id: dto.id,
  name: dto.fullName || '',
  phone: dto.phoneNumber,
  avatar: dto.avatarUrl || '',
  verificationStatus: dto.verificationStatus as Owner['verificationStatus'],
  verificationBadgeText: '',
  ownerOnboardingCompletedAt: dto.ownerOnboardingCompletedAt,
  createdAt: dto.createdAt,
});
```

Do not invent a new badge claim. If current UI derives badge copy elsewhere, keep that derivation; otherwise empty presentation copy is safer than a false verification claim until Phase 6 refines UX.

- [ ] **Step 6: Run focused + existing identity/KYC tests**

```bash
npm --prefix backend run test:p2-3-owner-api
npm --prefix backend run test:owner-identity-01
npm --prefix backend run test:owner-registration-kyc-01
npm --prefix backend run test:auth-p02
npm --prefix backend run check
npm --prefix owner-app run check
```

Expected: PASS.

- [ ] **Step 7: Commit the independently testable profile contract**

```bash
git add backend/server/src/contracts/ownerCore.ts backend/server/src/tests/p23OwnerApiContract.test.ts backend/server/src/app.ts backend/package.json owner-app/src/services/http/HttpRepository.ts owner-app/src/utils/ownerIdentity.ts owner-app/src/utils/ownerIdentity.test.ts
git commit -m "fix(p2-3): harden owner profile contract"
```

Stage only files that actually changed.

---

### Task 2: Owner Property / Media Truth and Public Compatibility

**Files:**
- Modify: `backend/server/src/contracts/ownerCore.ts`
- Modify: `backend/server/src/tests/p23OwnerApiContract.test.ts`
- Modify if needed: `backend/server/src/app.ts`
- Modify if needed: `owner-app/src/services/http/HttpRepository.ts`
- Existing regression tests: `p13PropertyPersistence.test.ts`, `p13PropertyMedia.test.ts`, `p13AtomicMediaContract.test.ts`, `p21PublicApiContract.test.ts`, `p22RenterApiContract.test.ts`

**Interfaces:**
- Consumes: `propertyDb.getByOwnerId`, create/update/submit/media methods.
- Produces: strict Owner property response mapping compatible with existing public-property semantics.

- [ ] **Step 1: Add RED/guard tests for Owner property query truthfulness**

Add cases to `p23OwnerApiContract.test.ts`:

```ts
(propertyDb as any).getByOwnerId = async () => {
  throw new Error('database unavailable');
};
const failed = await app.handleHttpRequest('GET', '/api/v1/owner/properties', ownerHeaders(ownerA));
assert.equal(failed.statusCode, 500);
assert.equal((failed.body as any).error.code, 'OWNER_PROPERTIES_QUERY_FAILED');
```

Add a canonical property with `address: ''` and assert the Owner response preserves `''` instead of rejecting it.

Add foreign-owner update/media access assertion if the focused suite does not already cover the exact route touched.

Run `test:p2-3-owner-api`; any already-correct guard may pass immediately and therefore needs no production-code change.

- [ ] **Step 2: Add/extend strict Owner property mapping only where current handlers spread broad rows**

Use an allowlist mapper in `ownerCore.ts`. Preserve `address` as:

```ts
if (typeof row.address !== 'string') throw new Error('MALFORMED_OWNER_PROPERTY');
const address = row.address.trim(); // empty is valid
```

Do not require non-empty address. Validate required IDs/status/capacity/price fields; do not default malformed money/capacity to zero.

- [ ] **Step 3: Keep property lifecycle/media implementation unchanged unless a failing P2.3 test proves a contract defect**

Do not rewrite P1.3 media flows. Any changes in `app.ts` must be response/error-boundary changes only.

- [ ] **Step 4: Run property/media/public regressions**

```bash
npm --prefix backend run test:p2-3-owner-api
npm --prefix backend run test:owner-property-wizard-01
npm --prefix backend run test:p13-property-persistence
npm --prefix backend run test:p13-property-media
npm --prefix backend run test:p13-atomic-media
npm --prefix backend run test:p13-worker-adapter
npm --prefix backend run test:p2-1-public-api
npm --prefix backend run test:p2-2-renter-api
npm --prefix owner-app run test:properties
npm --prefix owner-app run test:property-wizard
npm --prefix owner-app run build
```

Expected: PASS, including empty-address Customer regressions.

- [ ] **Step 5: Commit property/media contract hardening**

```bash
git add backend/server/src/contracts/ownerCore.ts backend/server/src/tests/p23OwnerApiContract.test.ts backend/server/src/app.ts owner-app/src/services/http/HttpRepository.ts
git commit -m "fix(p2-3): align owner property contracts"
```

---

### Task 3: Calendar / Availability Regression Lock

**Files:**
- Modify: `backend/server/src/tests/p23OwnerApiContract.test.ts`
- Modify production files only if a new focused test proves a current defect.

**Interfaces:**
- Consumes: current `GET /api/v1/owner/calendar/:propertyId`, `POST /api/v1/owner/calendar/toggle-block`, P1.4/P1.5 availability boundaries.
- Produces: regression proof only unless a bounded defect is found.

- [ ] **Step 1: Add P2.3 ownership/fail-closed calendar assertions**

Cover:

```ts
// foreign Owner calendar access is rejected
// manual block overlapping a protected booking remains 409
// a query failure is not reported as AVAILABLE/empty success
```

Do not add nightly-price/batch-pricing routes in this task.

- [ ] **Step 2: Run focused tests and confirm whether production code needs any change**

```bash
npm --prefix backend run test:p2-3-owner-api
npm --prefix backend run test:p1-4-availability
npm --prefix backend run test:p1-4-worker-availability
npm --prefix backend run test:p1-5-atomic-booking
```

If all new behavior already passes, make no production change. The test itself is the regression lock.

- [ ] **Step 3: If a bounded in-scope defect is proven, apply only the minimal fix and rerun the same four commands**

No new persistence architecture is allowed. If a fix needs a migration/RPC/transaction, STOP instead.

- [ ] **Step 4: Commit the calendar regression lock/minimal fix**

```bash
git add backend/server/src/tests/p23OwnerApiContract.test.ts backend/server/src/app.ts backend/server/src/services/dbClient.ts backend/server/src/services/dbRepository.ts
git commit -m "test(p2-3): lock owner availability contract"
```

Stage only changed files.

---

### Task 4: Owner Booking DTOs + Canonical Financial Summary

**Files:**
- Modify: `backend/server/src/contracts/ownerCore.ts`
- Modify: `backend/server/src/tests/p23OwnerApiContract.test.ts`
- Modify: `backend/server/src/app.ts`
- Modify if required for Worker: `backend/server/src/services/dbClient.ts`
- Reuse: `bookingDb.getFinancialSummary(bookingId)` in `dbRepository.ts`
- Modify if needed: `owner-app/src/services/http/HttpRepository.ts`
- Existing regression: `p15BookingAtomicPersistence.test.ts`, `p22RenterApiContract.test.ts`, `ownerBookings.test.ts`

**Interfaces:**
- Consumes: `bookingDb.getByOwnerId`, `bookingDb.getById`, `bookingDb.updateStatusForOwner`, `bookingDb.getFinancialSummary`.
- Produces: explicit Owner booking DTO + Owner financial DTO from persisted booking snapshot.

- [ ] **Step 1: Write RED financial hardcoding test**

Stub a booking owned by `ownerA` and a persisted summary with distinctive values, e.g. total `9300`, deposit `2400`, commission `480`, Owner net `1920`, remaining `6900`.

```ts
(bookingDb as any).getById = async () => ({
  id: bookingId,
  ownerId: ownerA,
  status: 'PENDING_OWNER_APPROVAL',
});
(bookingDb as any).getFinancialSummary = async () => ({
  bookingId,
  totalBookingValue: 9300,
  depositAmount: 2400,
  solaCommissionAmount: 480,
  ownerNetDepositAmount: 1920,
  remainingBalance: 6900,
  commissionOnRemainingBalance: 0,
  createdAt: '2026-09-04T00:00:00.000Z',
});
const res = await app.handleHttpRequest('GET', `/api/v1/owner/bookings/${bookingId}/financials`, ownerHeaders(ownerA));
assert.equal((res.body as any).data.totalBookingValue, 9300);
assert.equal((res.body as any).data.depositAmount, 2400);
```

Expected RED against base: current endpoint returns values based on hardcoded `1500/500`.

Also test foreign Owner -> 403, DB summary failure -> 500, missing summary -> 500/explicit canonical error.

- [ ] **Step 2: Add strict Owner booking/finance mappers**

In `ownerCore.ts`, create allowlisted DTO functions. At minimum Owner booking list items must validate IDs, dates, nights, guest count, status, and required display/property data rather than spreading arbitrary hydrated rows.

For financials, map only persisted summary fields:

```ts
export interface OwnerBookingFinancialDto {
  bookingId: string;
  totalBookingValue: number;
  depositAmount: number;
  solaCommissionAmount: number;
  ownerNetDepositAmount: number;
  remainingBalance: number;
  commissionOnRemainingBalance: number;
  currency: 'EGP';
}
```

Reject missing/non-finite/negative money; require `commissionOnRemainingBalance === 0` under the current rule.

- [ ] **Step 3: Replace hardcoded financial endpoint with canonical reads**

Handler order:

```ts
const booking = await bookingDb.getById(bookingId); // catch query error separately
if (!booking) return BOOKING_NOT_FOUND;
if (booking.ownerId !== ownerId) return BOOKING_NOT_OWNED;
const summary = await bookingDb.getFinancialSummary(bookingId); // catch -> 500
if (!summary) return BOOKING_FINANCIAL_SUMMARY_MISSING;
return toOwnerBookingFinancialDto(summary);
```

Do not call `calculateBookingFinancials` in this read endpoint.

- [ ] **Step 4: Add exact Worker mapping for the existing `bookingDb.getFinancialSummary` query if missing**

In `dbClient.ts`, match the normalized query specifically enough that it cannot collide with financial-summary inserts/RPCs. Map it to a PostgREST read equivalent to:

```text
/rest/v1/booking_financial_summaries?select=booking_id,total_booking_value,deposit_amount,sola_commission_amount,owner_net_deposit_amount,remaining_balance,commission_on_remaining_balance,created_at&booking_id=eq.<id>&limit=1
```

Use the actual column aliases/response normalization conventions already used by the adapter. Non-OK/malformed responses must throw; zero rows returns a genuine missing summary.

- [ ] **Step 5: Lock Owner booking list/decision privacy and lifecycle**

Add tests asserting:

```ts
approve.status === 'APPROVED_PENDING_PAYMENT'
reject.status === 'REJECTED'
```

and Owner booking list does not return unrelated private Customer account data or Customer-inappropriate internal objects. Do not alter the already-correct approval state machine unless a focused test proves a defect.

- [ ] **Step 6: Run booking/finance regressions**

```bash
npm --prefix backend run test:p2-3-owner-api
npm --prefix backend run test:p1-4-availability
npm --prefix backend run test:p1-5-atomic-booking
npm --prefix backend run test:p1-6-wallet-ledger
npm --prefix backend run test:p2-2-renter-api
npm --prefix backend run test:p13-worker-adapter
npm --prefix owner-app run test:bookings
npm --prefix backend run check
```

Expected: PASS.

- [ ] **Step 7: Commit canonical booking finance/DTO work**

```bash
git add backend/server/src/contracts/ownerCore.ts backend/server/src/tests/p23OwnerApiContract.test.ts backend/server/src/app.ts backend/server/src/services/dbClient.ts owner-app/src/services/http/HttpRepository.ts
git commit -m "fix(p2-3): make owner booking finance canonical"
```

---

### Task 5: Wallet Truth + Retire Fake Payout Success + Core Client Error Semantics

**Files:**
- Modify: `backend/server/src/tests/p23OwnerApiContract.test.ts`
- Modify: `backend/server/src/app.ts`
- Modify if needed: `owner-app/src/context/AppContext.tsx`
- Modify if needed: `owner-app/src/services/http/HttpRepository.ts`
- Modify if a pure helper is introduced: `owner-app/src/utils/ownerWallet.ts`
- Test: `owner-app/src/utils/ownerWallet.test.ts`

**Interfaces:**
- Consumes: P1.6 `walletDb.getOwnerWalletSummary`, `walletDb.getOwnerLedger`.
- Produces: truthful wallet reads; payout POST can no longer return a synthetic financial success.

- [ ] **Step 1: Add wallet failure and fake-payout RED tests**

Wallet query error must remain error:

```ts
(walletDb as any).getOwnerWalletSummary = async () => {
  throw new Error('database unavailable');
};
const wallet = await app.handleHttpRequest('GET', '/api/v1/owner/wallet', ownerHeaders(ownerA));
assert.equal(wallet.statusCode, 500);
```

Payout must no longer return synthetic 201:

```ts
const payout = await app.handleHttpRequest(
  'POST',
  '/api/v1/owner/payouts',
  { ...ownerHeaders(ownerA), 'idempotency-key': 'p23-test-key' },
  { amount: 1000, payoutMethodId: 'test-method' },
);
assert.notEqual(payout.statusCode, 201);
assert.equal((payout.body as any).error.code, 'PAYOUT_NOT_AVAILABLE_IN_CURRENT_PROTOTYPE');
```

Expected RED on the payout case against base.

- [ ] **Step 2: Retire only the fake payout success path**

Replace the hardcoded-balance/fee success implementation with an explicit feature-unavailable response, e.g.:

```ts
return {
  statusCode: 501,
  body: {
    success: false,
    error: {
      code: 'PAYOUT_NOT_AVAILABLE_IN_CURRENT_PROTOTYPE',
      message: 'طلبات السحب ستتاح بعد تفعيل مسار السحب المالي المعتمد.',
    },
    timestamp,
  },
};
```

Do not build payout persistence/provider methods in P2.3.

The current Owner UI already handles rejected payout submission as an error path; verify it does not open the success sheet when the HTTP call rejects.

- [ ] **Step 3: Verify wallet DTO/value semantics without changing wallet accounting**

Add malformed/non-finite wallet assertions if not already covered. Do not recompute wallet values or change P1.6 ledger transitions.

- [ ] **Step 4: Prevent P2.3 core failures from becoming plausible empty/zero state in the Owner client**

Inspect the exact `AppContext.tsx` core calls. For Profile, Properties, Bookings, Wallet/Ledger, do not use `.catch(() => [])` / `.catch(() => null)` to fabricate canonical success.

Use settled/error state only where needed to let unrelated deferred domains fail independently. A valid pattern is:

```ts
const [propertiesResult, bookingsResult] = await Promise.allSettled([
  repo.property.getProperties(),
  repo.booking.getBookings(),
]);
if (propertiesResult.status === 'rejected' || bookingsResult.status === 'rejected') {
  throw new Error('OWNER_CORE_DATA_LOAD_FAILED');
}
```

Do not make Payout/Disputes/Analytics endpoints mandatory for core Owner bootstrap.

- [ ] **Step 5: Do not expand deferred domains**

Do not implement payout methods/list/cancel, disputes, analytics, booking modifications/cancellations, or pricing routes. Leave historical unused interface methods untouched unless their current invocation creates a P2.3 core false-success; if so, stop calling that deferred method from core bootstrap instead of creating its missing backend route.

- [ ] **Step 6: Run wallet/home/build regressions**

```bash
npm --prefix backend run test:p2-3-owner-api
npm --prefix backend run test:owner-wallet-01
npm --prefix backend run test:p1-6-wallet-ledger
npm --prefix owner-app run test:wallet
npm --prefix owner-app run test:home
npm --prefix owner-app run check
npm --prefix owner-app run build
npm --prefix backend run check
```

Expected: PASS.

- [ ] **Step 7: Commit wallet/deferred-boundary work**

```bash
git add backend/server/src/tests/p23OwnerApiContract.test.ts backend/server/src/app.ts owner-app/src/context/AppContext.tsx owner-app/src/services/http/HttpRepository.ts owner-app/src/utils/ownerWallet.ts owner-app/src/utils/ownerWallet.test.ts
git commit -m "fix(p2-3): enforce truthful owner financial boundaries"
```

---

### Task 6: Adversarial Regression, Operational Docs, Candidate Handoff

**Files:**
- Modify only after evidence: `docs/CURRENT_STATE.md`
- Modify only after evidence: `tasks/CURRENT_TASK.md`
- Modify if current project convention requires: `docs/CROSS_APP_MATRIX.md` / relevant completion matrix.
- No new production behavior in this task unless a regression exposes an in-scope defect; if so, return to the owning task and fix it there.

**Interfaces:**
- Consumes: all P2.3 packages.
- Produces: one exact candidate SHA and machine-readable implementation report ready for independent review.

- [ ] **Step 1: Run the complete deterministic backend gate**

```bash
npm --prefix backend run check
npm --prefix backend run test:owner-identity-01
npm --prefix backend run test:owner-registration-kyc-01
npm --prefix backend run test:owner-property-wizard-01
npm --prefix backend run test:p13-property-persistence
npm --prefix backend run test:p13-property-media
npm --prefix backend run test:p13-worker-adapter
npm --prefix backend run test:p13-atomic-media
npm --prefix backend run test:p1-4-availability
npm --prefix backend run test:p1-4-worker-availability
npm --prefix backend run test:p1-5-atomic-booking
npm --prefix backend run test:p1-6-wallet-ledger
npm --prefix backend run test:p2-1-public-api
npm --prefix backend run test:p2-2-renter-api
npm --prefix backend run test:p2-3-owner-api
```

Every command must pass on the final candidate working tree.

- [ ] **Step 2: Run the Owner frontend gate**

```bash
npm --prefix owner-app run test:bookings
npm --prefix owner-app run test:properties
npm --prefix owner-app run test:property-wizard
npm --prefix owner-app run test:wallet
npm --prefix owner-app run test:home
npm --prefix owner-app run check
npm --prefix owner-app run build
```

Every command must pass.

- [ ] **Step 3: Run targeted adversarial static checks**

Search the final P2.3 diff/current touched surfaces and prove:

```text
no calculateBookingFinancials(1500, 500)
no mock available balance 5000 payout success
no synthetic payout id success path
no Owner profile DB catch -> null -> false 404
no new route that approves -> CONFIRMED
no new frontend-authoritative finance
no new migration
no broad Worker SQL matcher
no empty-address non-empty validator regression
```

Also run:

```bash
git diff --check
```

- [ ] **Step 4: Reconcile operational docs truthfully**

Update `docs/CURRENT_STATE.md` and `tasks/CURRENT_TASK.md` to say:

- P2.1/P2.2 are published with the Explore hotfix already live-confirmed;
- current P2.3 candidate exists but is **not closed/published** yet;
- exact candidate SHA/branch;
- no migration/live mutation;
- next gate is independent exact-SHA review + PR CI/publication gate.

Do not claim P2.3 Live before publication/live verification.

- [ ] **Step 5: Run final changed-path and branch evidence**

Capture:

```bash
git status --short
git diff --check
git diff --name-only <BASE_SHA>...HEAD
git log --oneline <BASE_SHA>..HEAD
```

Confirm no unexpected app, migration, workflow, or infrastructure path entered the task.

- [ ] **Step 6: Commit documentation reconciliation if it changed**

```bash
git add docs/CURRENT_STATE.md tasks/CURRENT_TASK.md docs/CROSS_APP_MATRIX.md
git commit -m "docs(p2-3): record owner contract candidate state"
```

Stage only existing files actually changed.

- [ ] **Step 7: Fresh final verification after the last commit**

Because a candidate claim must match its exact final SHA, rerun at minimum:

```bash
npm --prefix backend run test:p2-3-owner-api
npm --prefix backend run test:p2-2-renter-api
npm --prefix backend run test:p1-5-atomic-booking
npm --prefix backend run test:p1-6-wallet-ledger
npm --prefix backend run check
npm --prefix owner-app run test:home
npm --prefix owner-app run build
git diff --check
```

Do not reuse earlier results if the final SHA changed.

- [ ] **Step 8: Return the candidate report; do not publish**

Return exactly the contract report fields:

```text
RESULT:
START_SHA:
FINAL_SHA:
BASE_SHA:
CHANGED_PATHS:
ROOT_CAUSES_FIXED:
AUTOMATED_GATES:
SEMANTIC_GATES:
LIVE_MUTATIONS: NONE
UNRESOLVED:
NEXT_GATE: EXACT_SHA_INDEPENDENT_REVIEW
```

Do not merge, push `main`, deploy, or mutate Supabase/Storage.

---

## Self-Review Against the Spec

Before execution handoff, the plan covers:

- Profile false-404 root cause: Task 1.
- Owner property/public empty-address compatibility: Task 2.
- P1.4/P1.5 calendar/availability preservation: Task 3.
- Booking lifecycle/IDOR + persisted finance replacing hardcoded values: Task 4.
- P1.6 wallet + fake payout retirement + core frontend truthful errors: Task 5.
- Cross-role regression, exact final evidence, stale current-state docs: Task 6.
- No migration/future feature pull-forward: Global Constraints + Tasks 3/5.
- Worker strictness: Task 4 + final adversarial checks.
- Exact-SHA review/publication remains outside implementation: Task 6.

No P2.3 requirement depends on completing Notifications, Payout, Chat, Disputes, Analytics, Payment, or cancellation policy early.

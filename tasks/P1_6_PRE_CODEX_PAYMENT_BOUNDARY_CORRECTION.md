# P1.6 — Final Pre-Codex Payment Finalization Boundary Correction

TASK_ID: P1.6
MODE: TARGETED_MECHANICAL_CORRECTION
EXECUTOR: Antigravity
REPOSITORY: Essxm01/SOLA-APP
CANDIDATE_BRANCH: validation/p1-6-rc
STARTING_CANDIDATE_SHA: 91faacc0b3b92aed67d3a10233d524cb6def2c80
BASE_MAIN_SHA: 49fb158282ddc0963a29e2236d280dde82c5f197
PULL_REQUEST: #10
LIVE_MUTATION: FORBIDDEN

## Why this correction exists

The final P1.6 Pre-Codex review found one remaining known boundary-pattern defect on the existing deposit-finalization path.

`backend/server/src/services/dbClient.ts` still dispatches the mutating RPC using a broad matcher:

`lowerSql.includes('konfrm_complete_deposit_payment')`

This can reinterpret noncanonical future SQL that merely mentions the function as a real financial mutation RPC. This is the same collision class already closed for P1.5 booking creation and P1.6 wallet/ledger reads.

Additionally, the current Worker adapter accepts any HTTP-200 JSON body from the RPC. `paymentTxDb.completeDepositPayment(...)` can therefore receive a partial/malformed object, while the route currently supplies success fallbacks such as `CONFIRMED`, `SUCCEEDED`, and `EGP`. A malformed 200 response must never become credible payment/booking success.

This correction closes exactly that payment finalization boundary. Do not broaden scope.

## Fail-fast

Before editing:

1. Fetch origin.
2. Verify `origin/validation/p1-6-rc` equals exactly `91faacc0b3b92aed67d3a10233d524cb6def2c80`.
3. Verify `origin/main` still equals exactly `49fb158282ddc0963a29e2236d280dde82c5f197`.
4. Verify PR #10 head equals the starting candidate SHA and is open/unmerged.
5. Verify working tree clean.
6. Stop with `TASK_HANDOFF_MISMATCH` on any mismatch.

## Required correction A — collision-safe payment RPC matcher

The only canonical repository query is:

`SELECT * FROM konfrm_complete_deposit_payment($1, $2, $3)`

Replace the broad `includes(...)` dispatch with an exact/collision-safe normalized matcher for that one three-placeholder shape.

Requirements:

- Accept normal whitespace/case variation only.
- Require exactly three placeholders in exact `$1, $2, $3` order.
- Prefix/suffix SQL comments must NOT match.
- Wrapper/subquery SQL must NOT match.
- String literals or unrelated SQL that merely mention `konfrm_complete_deposit_payment` must NOT match.
- Wrong arity, reordered placeholders, duplicated placeholders, or extra SQL must NOT match.
- Noncanonical shapes must fall through and must not issue the payment RPC REST request.
- Keep the existing RPC endpoint/body parameter names unchanged.
- Do not create a generic SQL-over-HTTP path.

Prefer the same proven canonical matching discipline used by P1.5 `konfrm_create_booking_request` rather than inventing a permissive parser.

## Required correction B — fail closed on malformed successful RPC payload

After HTTP success, validate the canonical RPC result BEFORE returning a successful `queryDb` result.

The function in Migration 019 returns one JSONB object with these fields:

- `paymentTransactionId`
- `paymentStatus`
- `bookingId`
- `bookingStatus`
- `confirmedAt`
- `amountCents`
- `currency`
- `idempotent`

For Worker/PostgREST compatibility, it is acceptable to support either:

- a direct JSON object, or
- an array containing exactly one such object,

provided all other shapes/cardinalities fail closed.

Validate without coercion:

- payload is exactly one object; not null, primitive, empty array, or multi-row array;
- `paymentTransactionId`: non-empty string and exactly equals requested `params[0]`;
- `bookingId`: non-empty string and exactly equals requested `params[1]`;
- `paymentStatus`: exactly `SUCCEEDED`;
- `bookingStatus`: exactly `CONFIRMED`;
- `confirmedAt`: non-empty string parseable as a timestamp;
- `amountCents`: finite positive integer;
- `currency`: exactly `EGP`;
- `idempotent`: boolean;
- no `String(...)`, `Number(...)`, truthiness, or default-success coercion.

All malformed HTTP-200 response failures must throw with prefix:

`REST_PAYMENT_FINALIZATION_MALFORMED_RESPONSE`

Do not recompute any financial amount. Do not compare or invent commission/owner-net values here. Migration 019 remains authoritative.

## Required correction C — remove default success fabrication at the route boundary

Inspect the customer prototype deposit-completion route in `backend/server/src/app.ts`.

It currently uses fallbacks such as:

- `result?.bookingStatus || 'CONFIRMED'`
- `result?.paymentStatus || 'SUCCEEDED'`
- `result?.currency || 'EGP'`

After the validated boundary above, do not retain a code path that can manufacture these success values from missing result fields.

Use the validated canonical result directly, or explicitly reject malformed result state. Preserve the existing successful Customer response contract and privacy surface; do not add Owner wallet/commission/Owner-net fields.

A malformed RPC/adapter result is an internal persistence failure, not a credible business success. Preserve existing DB business-rejection mappings where applicable; if route mapping needs a dedicated malformed-response internal error, keep it narrow and deterministic.

## Required deterministic tests

Extend the existing focused P1.6/payment tests. At minimum prove:

### Matcher
1. canonical query dispatches exactly one RPC REST request;
2. comment prefix rejected;
3. comment suffix rejected;
4. wrapper/subquery rejected;
5. unrelated/string-literal mention rejected;
6. wrong arity rejected;
7. reordered placeholders rejected;
8. duplicated/wrong placeholders rejected;
9. no rejected collision case issues the payment RPC REST request.

### Malformed successful payload
10. null/primitive payload rejected;
11. empty array rejected;
12. multi-row array rejected;
13. missing required field rejected;
14. paymentTransactionId mismatch rejected;
15. bookingId mismatch rejected;
16. wrong/non-string paymentStatus rejected;
17. wrong/non-string bookingStatus rejected;
18. non-integer/string/zero/negative amountCents rejected;
19. wrong/non-string currency rejected;
20. invalid/non-string confirmedAt rejected;
21. non-boolean/missing idempotent rejected;
22. valid canonical result with `idempotent: false` succeeds;
23. valid canonical result with `idempotent: true` succeeds.

### Route
24. malformed finalization result cannot produce a successful response using default `CONFIRMED` / `SUCCEEDED` / `EGP` values;
25. valid completion preserves the existing Customer-facing response fields and does not expose internal Owner/commission/wallet data.

Update any unrealistic existing payment test stub so the RPC call returns the actual Migration-019 JSONB contract rather than a generic payment-transaction row.

## Allowed changed paths

Prefer only:

- `backend/server/src/services/dbClient.ts`
- `backend/server/src/services/paymentService.ts` only if adjacent result validation belongs there
- `backend/server/src/app.ts` only for removing default-success fabrication / truthful malformed mapping
- `backend/server/src/tests/p16WalletLedgerPersistence.test.ts`
- `backend/server/src/tests/payment01.test.ts`

Do not change any other production file unless strictly required to compile/test; explain any exception before proceeding.

## Do NOT

- modify Migration 019;
- modify Migration 027;
- change wallet/ledger persistence rules;
- change deposit/commission/Owner-net/remaining-balance formulas;
- change payment eligibility or booking state machine;
- add idempotency contracts beyond existing Migration 019 behavior;
- implement Paymob live networking;
- change payout/release/cancellation/refund logic;
- apply any migration live;
- mutate Supabase or Storage;
- deploy;
- merge;
- force-push.

## Validation matrix

Run and report:

- `npm --prefix backend run check`
- `npm --prefix backend run test:p1-6-wallet-ledger`
- `npm --prefix backend run test:payment-01`
- `npm --prefix backend run test:owner-wallet-01`
- `npm --prefix backend run test:p14-rpc-privileges`
- `npm --prefix backend run test:booking-01`
- `npm --prefix backend run test:booking-01-1`
- `npm --prefix backend run test:p1-4-availability`
- `npm --prefix backend run test:p1-4-worker-availability`
- `npm --prefix backend run test:p1-5-atomic-booking`
- `git diff --check`

Commit and push normally to `validation/p1-6-rc`; no force push. Wait for exact-head PR #10 CI and report its run number/ID/conclusion. Worker deployment must remain skipped on the PR event.

## Expected report

Return:

`P1_6_PRE_CODEX_PAYMENT_BOUNDARY_PASS`

or exact blocker.

Include:

1. starting candidate SHA;
2. final candidate SHA;
3. exact changed paths;
4. exact matcher proof;
5. exact response-validation proof;
6. route no-default-success proof;
7. tests and results;
8. exact-head PR #10 CI;
9. Migration 027 `NOT_APPLIED_LIVE`;
10. live mutation `NONE`;
11. remaining blocker.

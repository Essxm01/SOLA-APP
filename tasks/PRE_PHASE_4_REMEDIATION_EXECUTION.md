# PRE-PHASE-4 REMEDIATION EXECUTION PLAN — R1 → R5

> **For agentic workers:** execute this plan task-by-task with TDD, exact-SHA evidence, and one independently reviewable gate at a time. Do not batch unrelated remediation into a giant refactor. If an agentic execution skill is available, use the equivalent of plan execution with review checkpoints.

**Goal:** Remove every confirmed Pre-Phase-4 security/runtime/interaction blocker, strengthen the regression gates that allowed them to escape, and prove the three deployed KONFRM applications are safe to hand to Phase 4 without changing product business rules or beginning the Phase 4 redesign.

**Architecture:** Preserve the current KONFRM architecture and canonical PostgreSQL/Worker boundaries. Fix the smallest root cause for each audited defect, keep server/database truth authoritative, and add fail-closed contracts around every remediated surface. R1–R4 are isolated implementation gates; R5 is a final cross-app/live verification gate only.

**Tech Stack:** React 19, TypeScript, Vite, Node/Cloudflare Worker, PostgreSQL/Supabase, GitHub Actions, existing repository test runners.

**Spec / audit authority:**
- `tasks/PRE_PHASE_4_MASTER_AUDIT.md` at audited main `443d20df70c82469e1107f5100e610b26bc97269`
- Founder-approved remediation sequence: `R1 → R2 → R3 → R4 → R5`
- Governing product/business/security rules remain those in the repository authority chain (`AGENTS.md`, `docs/INDEX.md`, `docs/CURRENT_STATE.md`, `tasks/CURRENT_TASK.md`, `docs/codex/KONFRM_MASTER_RULES.md`).

## Global constraints

- Phase 4 MUST NOT begin until R5 passes and Bridge records the final gate.
- Do not change financial formulas, booking states, availability semantics, KYC rules, Owner capability semantics, privacy rules, or core architecture.
- Do not redesign visual UI. Foundation-level truthful states and minimal functional UI required by R3 are allowed; Phase 4 visual polish is not.
- TDD is mandatory for every code defect: RED → prove RED → minimal GREEN → regression.
- One implementation writer per branch.
- No direct production DB patch is allowed as a substitute for application code/migration/API correctness.
- Do not print, commit, paste into PRs, or expose plaintext credentials, password hashes, JWT secrets, service-role keys, PATs, Cloudflare tokens, or other secrets.
- Never reuse the previously exposed Admin password or any other credential that has appeared in tracked source, Git history, screenshots, agent output, or chat.
- Do not rotate global Customer/Owner auth secrets merely to invalidate Admin tokens unless a narrower safe Admin-only invalidation mechanism is impossible and Bridge explicitly approves the wider blast radius.
- Every remediation PR must be based on the exact current `main` at its start; report base SHA and exact head SHA.
- Every remediation PR must include only its gate scope plus its tests/docs required by that gate.
- After opening each implementation PR, STOP for Bridge exact-SHA review unless this contract explicitly says otherwise.

---

# 0. Audit corrections already resolved before implementation

These corrections are authoritative for this remediation plan and must prevent unnecessary work.

## 0.1 `P4A-DB-001` is CLOSED — do not create DB remediation for 027–029

Bridge performed live read-only Supabase verification after the ZCode audit:

- `027_wallet_ledger_append_only.sql` is present in live `schema_migrations`.
- `028_customer_favorites.sql` is present in live `schema_migrations`.
- `029_customer_favorites_acl_hardening.sql` is present in live `schema_migrations`.
- `wallet_ledger_entries` has the append-only UPDATE/DELETE guard and TRUNCATE guard live.
- `customer_favorites` live ACL reflects the service-role-only application boundary expected by migration 029.

**Do not re-apply these migrations. Do not create replacement migrations for this finding.**

## 0.2 `P4A-SEC-002` is narrowed to Admin login abuse protection

OTP already has persisted request-count and failed-attempt controls in `backend/server/src/services/authService.ts`. Do not replace or redesign OTP throttling as part of this remediation unless a new reproducible OTP defect is independently proven.

The remaining hardening gap is Admin login abuse protection.

## 0.3 Owner client contract tests are already in normal CI

`owner-app/package.json` currently includes `src/utils/ownerClientContract.test.ts` inside `npm run test:home`, and the Owner CI job runs `npm run test:home`.

Do **not** create a redundant “promote ownerClientContract into CI” task. Extend the existing contract suite to cover the repaired analytics HTTP path instead.

## 0.4 New security hardening discovered during Bridge review — JWT source fallbacks

`backend/server/src/services/jwtService.ts` currently contains hardcoded fallback signing secrets for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`, despite project integration documentation requiring secrets not to have source fallbacks.

Treat this as part of **R1 security remediation**:

- production/runtime auth must fail closed when required JWT secret bindings are unavailable;
- no known signing secret may remain in tracked source;
- tests may use explicit test-only secrets injected by the test environment, never production-like fallback constants.

Do not claim the production Worker currently uses the fallback unless binding evidence proves it. Remove the dangerous fallback regardless.

---

# R1 — EMERGENCY ADMIN AUTH SECURITY

**Gate objective:** The public Admin application must no longer expose usable credentials, backend Admin authentication must use a canonical secure credential source rather than hardcoded plaintext, old public credentials must be rejected, and auth secrets must fail closed.

**Confirmed root cause evidence:**

- `admin-app/src/components/AdminLogin.tsx` initializes Admin email/password inputs with tracked credential values.
- `backend/server/src/services/authService.ts` checks plaintext hardcoded Admin passwords and uses an in-memory pre-seeded Admin identity for login.
- `admin_users` already exists as the canonical Admin table and contains `password_hash` in schema.
- Admin refresh is currently unsupported, so Admin access-token invalidation can be handled independently from Customer/Owner refresh sessions.
- `backend/server/src/services/jwtService.ts` contains source fallback JWT signing secrets.

## R1 files / surfaces to inspect before editing

Mandatory reality check:

- `admin-app/src/components/AdminLogin.tsx`
- `admin-app/src/App.tsx`
- `backend/server/src/services/authService.ts`
- `backend/server/src/controllers/authController.ts`
- `backend/server/src/services/jwtService.ts`
- `backend/server/src/middleware/auth.ts`
- `backend/server/src/services/dbRepository.ts`
- `backend/server/src/services/dbClient.ts`
- `backend/database/schema.sql`
- `backend/database/seed_admin.sql`
- Admin-related migrations and tests
- `.env.example`, `backend/.env.example`, `backend/server/src/worker.ts`, `backend/wrangler*`
- `.github/workflows/ci-validation.yml`

Do not assume the historical seed hash is valid merely because it looks bcrypt-like. Verify live metadata safely without exposing hash material.

## R1.1 — RED tests: remove public credential exposure

- [ ] Add/extend an Admin frontend test that renders `AdminLogin` and asserts:
  - email input starts empty;
  - password input starts empty;
  - no previous production/default Admin email/password literal appears in rendered state or source fixture;
  - password remains type `password` unless an explicit user reveal control is used.
- [ ] Run the test and prove it FAILS on the current baseline.

Expected current RED reason: default values are pre-filled.

## R1.2 — RED tests: backend rejects hardcoded/legacy credentials and reads canonical Admin identity

- [ ] Add a backend Admin auth contract/security test that proves:
  - the old public password is rejected;
  - the weak legacy fallback password is rejected;
  - arbitrary wrong passwords are rejected with the existing truthful auth error contract;
  - inactive/missing Admin identities are rejected;
  - Admin identity/role is sourced from canonical Admin persistence rather than the production in-memory seed;
  - successful Admin authentication requires verification against the canonical `password_hash` using a supported secure password-hash verifier.
- [ ] Do not embed the old plaintext production password in the new test. Where a regression needs to prove a known old credential is rejected, use a redacted/constructed test fixture that does not reintroduce the literal into new source.
- [ ] Run the test and prove current baseline FAILS.

## R1.3 — Implement canonical Admin credential verification

Preferred boundary:

- add the narrowest `adminDb.getByEmail(...)` / equivalent canonical read using existing DB adapter conventions;
- return only fields required for auth (`id`, `email`, `password_hash`, `full_name`, `role`, `is_active`);
- do not expose `password_hash` outside the backend service boundary;
- use a maintained password-hash verification mechanism compatible with Cloudflare/Node and the canonical stored hash format;
- use constant-time/standard verifier behavior; never compare plaintext hashes manually;
- map the DB record into the existing `AdminRecord` response without the hash;
- remove the production login dependency on `dbAdminUsersStore`.

If the existing live `password_hash` format is invalid, placeholder, or cannot be verified safely, do not create a compatibility bypass. Continue to R1.6 secure rotation.

## R1.4 — Remove credential literals and unsafe seed behavior

- [ ] `AdminLogin` must render empty credentials.
- [ ] Remove plaintext Admin password comments/defaults from tracked production seed/docs/code where they constitute credential instructions.
- [ ] Remove acceptance of the weak legacy fallback password.
- [ ] Update old tests that authenticate with production credentials to use isolated test-only credentials/hash fixtures.
- [ ] Do not make production tests depend on the live Admin credential.

Historical Git commits cannot be erased by a normal code change. Treat old credentials as permanently exposed and rotate them; do not attempt history rewriting during this task.

## R1.5 — JWT secret fail-closed hardening

- [ ] Add RED tests proving auth service startup/signing does not silently use a tracked default when `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` are absent in production/runtime mode.
- [ ] Remove known fallback signing-secret literals from `jwtService.ts`.
- [ ] Use explicit test-only secret injection for unit/CI tests.
- [ ] Verify Worker binding flow still supplies the required secrets before JWT code is first used.
- [ ] Verify Cloudflare secret/binding **presence metadata only** where tooling permits; never print values.
- [ ] If required production bindings are absent, STOP before deploy with `R1_NEEDS_SECRET_BINDING`, rather than deploying a broken or fallback auth service.

## R1.6 — Secure Admin credential rotation gate

The old Admin credential is compromised because it is public in tracked source/history.

Required outcome:

- the canonical live Admin account receives a new strong credential hash;
- the plaintext new credential must never appear in repo, PR, CI log, agent transcript, report, or chat;
- provisioning must use a secure local/secret input path;
- the user must retain the credential through a secure local mechanism.

If the executor cannot obtain/provision a new credential without exposing plaintext in logs/chat, STOP and return exactly:

`R1_NEEDS_SECURE_ADMIN_CREDENTIAL_INPUT`

Do not fall back to the old password. Do not generate an unknown password that the Founder cannot retrieve securely.

Any DB change used solely to rotate the credential must be a controlled canonical credential update, not an ad-hoc schema patch. Schema changes require an explicit migration and must be justified; the existing `password_hash` column should normally make a schema change unnecessary.

## R1.7 — Invalidate previously issued Admin access tokens without breaking Customer/Owner sessions

Because Admin refresh is unsupported, implement the narrowest Admin-only revocation/version/cutoff mechanism needed so access tokens issued under the compromised credential are not accepted after the security deploy.

Constraints:

- do not rotate global Customer/Owner JWT secrets merely for convenience;
- do not invalidate Customer/Owner sessions unless Bridge approves that blast radius;
- old Admin access tokens must fail authorization immediately after the new security deployment, not merely after the 15-minute TTL if a narrower invalidation mechanism is feasible;
- new Admin access tokens must carry/meet the new validity marker and pass existing role isolation.

Add tests for old-vs-new Admin token behavior.

## R1.8 — Admin login abuse protection

Implement a bounded protection appropriate to the current Worker architecture. Requirements:

- repeated failed Admin logins cannot be attempted without meaningful throttling/backoff;
- do not weaken truthful `401 INVALID_ADMIN_CREDENTIALS` semantics or leak whether an email exists;
- do not use a per-isolate-only counter as the sole production control if it resets trivially across Worker isolates;
- prefer an existing Cloudflare/platform persistent/rate-limit mechanism if available and auditable, otherwise propose the narrowest persistent application mechanism.

If this requires a material new paid Cloudflare product, new architectural subsystem, or unexpected recurring cost, STOP with `R1_RATE_LIMIT_FOUNDER_DECISION_REQUIRED` before enabling it.

OTP behavior is out of scope unless a new independent OTP flaw is demonstrated.

## R1.9 — Required regression / verification

Minimum local/PR validation:

- Admin frontend security/login test(s)
- backend Admin auth/security test(s)
- auth/session role-isolation regressions
- backend typecheck
- Admin build
- entire existing critical backend CI suite

Required safe live verification after Bridge merge/deploy:

- public Admin login fields are empty;
- old public credentials return 401;
- weak legacy fallback returns 401;
- new secure credential can authenticate successfully without exposing it in evidence;
- returned token is `ROLE_ADMIN` and protected Admin read endpoint works;
- old pre-remediation Admin token fails after the invalidation boundary;
- Customer/Owner auth still works and their existing session model was not unintentionally broken;
- required JWT bindings are present and no source fallback can sign a token.

### R1 deliverable / stop

Open one isolated PR and return:

- base main SHA
- exact PR number
- exact head SHA
- changed files
- RED evidence
- GREEN evidence
- secret/credential handling statement with **no secret material**
- CI run ID/status
- any secure-input or rate-limit decision blocker
- live verification plan (do not claim live PASS before merge/deploy)

Then **STOP FOR BRIDGE REVIEW**.

---

# R2 — OWNER FINANCIAL ANALYTICS CANONICAL CONTRACT

**Gate objective:** Pressing `التحليلات المالية` must load a real canonical analytics screen without runtime error, fabricated metrics, stale mock assumptions, or success-shaped missing-route fallback.

**Confirmed root cause:**

- `owner-app/src/services/http/HttpRepository.ts` calls `/owner/analytics?timeRange=...`.
- the current backend has no matching Owner analytics route.
- the generic unmatched Owner fallback returns a success-shaped 200 object.
- `AnalyticsFoundationView` trusts the typed result and dereferences `financialSummary.totalBookingsCount`, causing the Founder-observed runtime crash.
- existing mock repository implements the full analytics shape, which hid the HTTP contract gap.

## R2.1 — Reality check before implementation

Read:

- `owner-app/src/components/analytics/AnalyticsFoundationView.tsx`
- `owner-app/src/utils/exportEngine.ts`
- `owner-app/src/context/AppContext.tsx`
- `owner-app/src/services/http/HttpRepository.ts`
- `owner-app/src/services/mockRepository.ts`
- `owner-app/src/types/index.ts`
- `owner-app/src/utils/ownerClientContract.test.ts`
- Owner analytics specification references in `backend/docs/PHASE_7_MASTER_SPECIFICATION.md`
- current booking/property/wallet canonical repository methods and persisted financial summary contracts

Create a derivation matrix for every field currently rendered/exported by the analytics view:

`field → canonical source → formula/semantic → empty-state meaning → error behavior`.

Do not copy mock numbers/formulas into production unless each field can be derived truthfully from canonical persisted data and existing approved semantics.

## R2.2 — RED backend route/DTO tests

Add a dedicated owner analytics route contract test that proves:

- `ROLE_OWNER` required;
- Owner identity comes from JWT and cannot be replaced by client ID;
- supported `timeRange` values are validated;
- response shape is explicit and allowlisted;
- each financial metric is derived from persisted canonical booking financial/status data, never client reconstruction;
- genuine empty analytics returns semantically valid zero/empty values where zero is true, not on DB error;
- DB/read failure returns a truthful error, never a zero analytics success;
- no Customer/Admin token can invoke Owner analytics;
- route exists in both Node/Worker-supported path behavior.

Prove RED because the route is absent.

## R2.3 — RED Owner HTTP client validation tests

Extend the existing `ownerClientContract.test.ts` (already in CI) to prove:

- full valid analytics DTO is accepted;
- missing `financialSummary` is rejected/fails closed;
- missing required nested numeric fields is rejected;
- malformed/non-finite/negative fields are rejected where negative is invalid;
- backend 404/5xx renders explicit error/retry state, never crashes;
- stale mock shape cannot silently satisfy the HTTP client.

## R2.4 — Implement minimal canonical analytics API

Preferred structure:

- create a narrow backend DTO/contract module if it reduces duplication and allows runtime validation;
- add only the repository aggregation methods needed for the current screen;
- add `GET /api/v1/owner/analytics?timeRange=...` under strict ROLE_OWNER handling;
- derive from canonical owner-scoped properties/bookings/financial summaries and current server rules;
- do not expose Customer private data in analytics;
- do not invent future Phase 6/7 analytics product scope beyond what the current visible screen already requires.

If a currently displayed metric cannot be truthfully derived from available canonical data, represent it as explicitly unavailable and adjust the current UI to a truthful unavailable state; do not fabricate a plausible number.

## R2.5 — Eliminate success-shaped unknown Owner route behavior

The generic Owner fallback enabled this crash class.

After inventorying all current Owner client routes and proving each intended route has a real handler, change unmatched `/api/v1/owner/*` behavior to truthful `404` (or the repository-standard explicit unsupported error), not `200 success`.

Add regression:

- unknown Owner route → non-2xx truthful error;
- all current legitimate Owner endpoints still match before fallback.

Do not break intentionally deferred actions; if a visible deferred feature relies on the fallback, classify/fix that affordance truthfully rather than preserving fake success.

## R2.6 — UI/export safety

- `AnalyticsFoundationView` must validate/guard the canonical DTO before rendering.
- Loading, empty, unavailable, and error states must be distinct.
- CSV/PDF exports must use the same validated canonical analytics object and must not be callable while data is invalid/unavailable.
- no catch-and-ignore that converts analytics failure into fake metrics.

## R2.7 — Required validation

Minimum:

- backend owner analytics contract tests
- existing P2.3 Owner API regression
- Worker adapter/backend regression as affected
- Owner `npm run test:home`
- Owner build
- exact-head CI

Post-merge live verification:

- existing Owner session opens Wallet → `التحليلات المالية`;
- no Runtime Render Error;
- displayed metrics match canonical API payload;
- empty/no-booking state is truthful if applicable;
- time-range changes do not crash;
- CSV/PDF action either works from valid data or is truthfully unavailable according to current scope;
- unknown Owner route returns truthful non-2xx.

### R2 deliverable / stop

One isolated PR; report exact base/head/PR/tests/CI and STOP FOR BRIDGE REVIEW.

---

# R3 — ADMIN NOTIFICATION BELL MUST BE A REAL ACTION

**Gate objective:** The visible Admin notification bell must produce an observable, truthful notification experience instead of a dead/misleading click.

**Bridge reality check:** the backend already has `GET /api/v1/admin/notifications`. Therefore the default direction is to wire the current bell to the existing canonical notification read path; do not invent a new notification subsystem and do not simply hide a working backend capability.

Current limitation: if no mutation endpoint exists for mark-as-read, do not invent one during R3. A read-only notification panel is sufficient to make the current bell truthful.

## R3.1 — RED Admin interaction tests

Add a focused Admin shell/notification interaction test that proves:

- bell is visibly actionable when notification read capability is available;
- activating it opens a panel/drawer/modal/list surface;
- loading state is visible;
- empty state is explicit;
- API error is explicit with retry or close behavior;
- populated response renders notification items/count truthfully;
- panel closes through visible close/back action and keyboard Escape where supported by current app conventions;
- no active-looking disabled control silently does nothing.

Prove current baseline RED.

## R3.2 — Implement minimal notification surface

Use current Admin design language; no Phase 4 redesign.

Preferred scope:

- bell button activation toggles a lightweight notifications panel/drawer;
- fetch `GET /api/v1/admin/notifications` with current Admin token;
- derive badge/count from actual response, not vestigial local state;
- show loading / empty / error / list states;
- no fabricated notifications;
- no mark-as-read mutation unless an existing approved endpoint already exists and can be safely integrated without widening scope.

If the endpoint contract itself is malformed or unsafe, STOP and report the backend defect instead of adding frontend fallback data.

## R3.3 — CI coverage

Admin CI currently runs property-review + build but not all truthful-state/interaction suites.

Update Admin CI so the new notification interaction test and existing relevant truthful-state tests execute on PRs and main pushes.

Do not add browser infrastructure if a deterministic React/component test can prove the local interaction; live browser verification remains mandatory after deploy.

## R3.4 — Live verification

After merge/deploy, using a legitimate Admin session:

- bell activation produces an observable panel;
- no page/runtime error;
- count/list matches backend response;
- empty/error states are truthful;
- no dead click;
- other Admin header/navigation controls still work.

### R3 deliverable / stop

One isolated PR; report exact base/head/PR/tests/CI and STOP FOR BRIDGE REVIEW.

---

# R4 — REGRESSION + FOUNDATION CLOSURE

**Gate objective:** Close the non-product blockers that allowed the defects to escape and reconcile governance without changing product behavior.

## R4.1 — Worker/ownership adapter regression

Add the missing narrow regression around the `getOwnershipById` SQL/REST mapping identified by audit (`P4A-TEST-001`).

Prove:

- ownership lookup returns the fields the Owner authorization path actually consumes;
- matcher changes cannot silently turn a valid Owner into 403-all due to missing selected columns;
- malformed adapter response fails closed;
- no widening of the SQL compatibility adapter.

## R4.2 — Interaction coverage closure

Verify the repaired surfaces are represented in normal CI:

- Owner analytics HTTP contract through existing `ownerClientContract.test.ts` / `test:home`;
- Admin notification interaction and truthful state in Admin CI;
- Admin login blank-field/auth security tests in Admin/backend CI;
- unknown Owner route fallback test in backend CI.

Do not duplicate suites that already run.

## R4.3 — Docs/governance reconciliation

After R1–R3 product fixes are actually merged/live verified, update the smallest authoritative docs necessary to reflect reality:

- `docs/CURRENT_STATE.md`
- `tasks/CURRENT_TASK.md`
- `docs/codex/KONFRM_CURRENT_REALITY.md`
- `docs/codex/KONFRM_COMPLETION_MATRIX.md`
- `docs/codex/KONFRM_EXECUTION_MAP.md`
- `docs/codex/KONFRM_RESCUE_BACKLOG.md` only where stale audit/task language requires it

Reconcile stale P2.3 “candidate/unmerged” wording and stale main SHAs. Do not rewrite historical reports.

If PR #14 remains open and is demonstrably superseded/merged by later main history, close it with a concise evidence-based comment; do not delete history.

## R4.4 — Security/doc scan

Re-run repository scans to prove:

- no old Admin plaintext credential remains in current tracked source;
- no JWT default signing secret remains in current tracked source;
- no new secret was introduced by remediation;
- test fixtures cannot authenticate production accidentally;
- GitHub Actions do not print secrets.

Historical exposure remains historical and is handled by rotation, not history rewriting.

### R4 deliverable / stop

Prefer one small foundation/docs PR after R1–R3 are merged. Return exact base/head/PR/tests/CI and STOP FOR BRIDGE REVIEW.

---

# R5 — FINAL THREE-APP INTERACTION + SECURITY CLOSURE

**Gate objective:** Prove the corrected current product surface is genuinely ready to enter Phase 4. This gate performs verification only; it does not begin Phase 4 and does not redesign UI.

Run R5 only after R1–R4 are merged to main and deployed where applicable.

## R5.1 — Establish exact deployment identity

Record:

- exact current main SHA;
- exact CI run and conclusion;
- Worker deployment/revision evidence tied to that main;
- Customer/Owner/Admin deployed revision evidence where accessible;
- no unreviewed remediation PR remains open for a blocker.

## R5.2 — Re-run complete current interactive-action inventory

Do not verify only the three fixed controls.

Repeat the V2 action inventory across Customer, Owner, Admin for all currently visible/reachable interactions, with browser-level telemetry where safely possible:

- runtime/page errors;
- console errors;
- unhandled rejections;
- failed network requests;
- wrong navigation;
- dead actions;
- misleading affordances;
- loading/error/empty states.

Any new ordinary-action runtime crash or confirmed active dead action reopens remediation and fails R5.

## R5.3 — Mandatory targeted security/defect probes

At minimum prove:

### Admin auth
- login fields empty;
- old exposed credential rejected;
- old weak fallback rejected;
- new secure credential succeeds without being printed;
- old pre-remediation Admin token rejected;
- new Admin token can perform allowed read-only Admin requests;
- Customer/Owner tokens cannot use Admin endpoints;
- Admin login throttling/backoff behaves as designed without revealing account existence;
- missing JWT secret configuration cannot fall back to a tracked signing key.

### Owner analytics
- Wallet → `التحليلات المالية` renders successfully;
- canonical response shape validated;
- no `totalBookingsCount`/nested undefined crash;
- time-range interactions safe;
- exports share the validated data path;
- unknown Owner route fails truthfully.

### Admin notifications
- bell opens real panel/list;
- populated/empty/error states truthful;
- no dead click;
- no fabricated count.

## R5.4 — Non-mutating production safety

Do not create/approve/archive/pay/book/upload merely to achieve interaction coverage on production.

For mutating actions:

- use static/contract/test evidence plus isolated safe QA/staging execution if available;
- mark residual verification explicitly;
- do not fabricate “live pass”.

## R5.5 — Final gate criteria

`PRE_PHASE_4_READY` requires all of:

- zero unresolved CRITICAL/HIGH security blockers;
- zero unresolved known ordinary-action runtime crashes;
- zero confirmed active dead actions;
- zero misleading active affordances for unavailable functionality;
- exact-SHA CI green with the new regression suites actually executed;
- R1 credential rotation complete without secret exposure;
- Owner analytics canonical and live-render verified;
- Admin notifications functional and live-render verified;
- R4 governance reconciliation complete;
- no unauthorized business-rule/finance/DB architecture change;
- all residual risks explicitly listed and non-blocking.

If any criterion fails, verdict is:

`PRE_PHASE_4_REMEDIATION_STILL_REQUIRED`

If all pass, verdict is:

`PRE_PHASE_4_READY`

Only after Bridge independently reviews R5 evidence may `tasks/CURRENT_TASK.md` be advanced from the Pre-Phase-4 gate to Phase 4 preparation.

---

# Mandatory execution order and autonomy

1. Execute **R1 only** first.
2. Open R1 PR and STOP for Bridge review/merge/live security validation.
3. After R1 is closed, execute R2; STOP for review.
4. After R2 is closed, execute R3; STOP for review.
5. After R3 is closed, execute R4; STOP for review.
6. After R4 is closed, execute R5 verification; do not modify product code during R5.
7. Do not begin Phase 4 automatically.

The Founder has approved this R1→R5 remediation program. Routine implementation details that remain inside this contract do not require repeated Founder approval. Stop only for:

- secure Admin credential input that cannot be handled without exposure;
- material paid/new infrastructure for rate limiting;
- a new product/business/financial/architecture decision;
- a required deviation from this plan;
- a newly discovered CRITICAL/HIGH issue whose repair would materially widen scope.

# R1 immediate return marker

The first executor response after this plan is invoked must end with exactly one of:

- `R1_PR_READY_FOR_BRIDGE_REVIEW`
- `R1_NEEDS_SECURE_ADMIN_CREDENTIAL_INPUT`
- `R1_RATE_LIMIT_FOUNDER_DECISION_REQUIRED`
- `R1_BLOCKED_BY_NEW_CRITICAL_FINDING`

Do not proceed to R2 in the same execution turn.
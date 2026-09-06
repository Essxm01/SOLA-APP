# PRE-PHASE-4 MASTER AUDIT — Phase 0 → Phase 3

**Status:** APPROVED_FOR_AUDIT  
**Approved by Founder:** 2026-09-06  
**Audit type:** Comprehensive read-only forensic audit + remediation planning  
**Primary reviewer:** ZCode  
**Scope:** Entire repository, completed Phase 0–3 work, current live architecture/evidence, security posture, code quality, data integrity, cross-app truth, CI/test evidence, documentation drift, and operational hygiene  
**Implementation authority:** NONE during this audit  
**Founder gate:** REQUIRED before any remediation changes are made

---

## 1. Objective

Before Phase 4 begins, perform the strongest practical independent audit of everything implemented, changed, verified, deployed, or relied upon from the first project task through the end of Phase 3.

The purpose is not to rubber-stamp the current state and not to reward green CI. The purpose is to determine whether KONFRM is genuinely ready to enter the dedicated Phase 4 UI/UX program without carrying hidden correctness, security, architecture, persistence, business-rule, cross-app, or maintainability defects from earlier phases.

The audit must answer:

1. Did Phase 0–3 implementation actually satisfy the governing product/business/architecture rules?
2. Are security and privacy boundaries correct and fail-closed?
3. Is canonical data really canonical across Customer, Owner, Admin, Backend, PostgreSQL, Storage, Worker, and deployed surfaces?
4. Are booking, availability, finance, identity, property, KYC, media, wallet, and Admin flows internally consistent and protected from edge cases/races?
5. Are tests meaningful and actually executed, rather than merely producing a green CI status?
6. Is the codebase safe and maintainable enough to build Phase 4 UI/UX on top of it without redesigning around broken foundations?
7. What must be fixed before Phase 4, what may be deferred, and what must not be changed because it is intentional product/architecture behavior?

Absolute software certainty is impossible. Do not claim “100% bug-free” or “100% secure.” Instead provide evidence-based confidence and explicitly state residual risk.

---

## 2. HARD AUDIT MODE — NO MUTATIONS

This task is **Stage A + Stage B only**.

### Stage A — Read-only forensic audit

You may:

- read all repository files and Git history;
- inspect PRs, commits, diffs, branches, CI workflows, logs, task reports, migrations, and current code;
- run static analysis, tests, typechecks, builds, dependency/security scanners, and local read-only probes after confirming they do not mutate live systems;
- run read-only database queries and read-only live/API requests where access exists;
- inspect deployed frontend/backend revision evidence;
- inspect public/storage objects without modifying them;
- create temporary local audit scripts or artifacts outside tracked source, provided they are removed before completion and `git status` returns clean.

You MUST NOT:

- edit product code;
- refactor or reformat source files;
- create migrations;
- change DB rows, schemas, grants, RLS, RPCs, triggers, functions, extensions, or Storage objects;
- create/delete/update production data;
- approve/reject/archive/create bookings/properties/KYC records for audit purposes;
- deploy anything;
- change Cloudflare/Supabase/GitHub configuration;
- merge or open implementation PRs;
- rotate credentials yourself;
- run historical/destructive scripts merely because they exist.

If a tool normally writes state, do not use it unless a verified dry-run/read-only mode exists.

### Stage B — Remediation plan only

After findings are complete, produce an ordered remediation plan. Do not implement it.

STOP after Stage B and await Founder/Bridge approval.

---

## 3. Mandatory onboarding and authority recovery

At the start, record:

- current branch;
- exact HEAD SHA;
- exact `origin/main` SHA;
- repository cleanliness;
- audit timestamp;
- available external access (GitHub/Supabase/Cloudflare/live URLs) without printing secrets.

Read the mandatory core in this order:

1. `AGENTS.md`
2. `docs/INDEX.md`
3. `docs/CURRENT_STATE.md`
4. `tasks/CURRENT_TASK.md`
5. `docs/codex/KONFRM_MASTER_RULES.md`
6. this contract

Because this is a cross-system audit, also read at minimum:

- `KONFRM_CODEX_MASTER_OPERATING_PROMPT.md`
- `KONFRM_MASTER_PROJECT_CONTEXT.md`
- `KONFRM_EXECUTION_DEPENDENCY_ORDER.md`
- `خطة عمل التطبيق.txt`
- `docs/PROJECT.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/BUSINESS_RULES.md`
- `docs/INTEGRATIONS.md`
- `docs/DECISIONS.md`
- `docs/CONTEXT_ROUTER.md`
- `docs/codex/KONFRM_CURRENT_REALITY.md`
- `docs/codex/KONFRM_COMPLETION_MATRIX.md`
- `docs/codex/KONFRM_EXECUTION_MAP.md`
- `docs/codex/KONFRM_RESCUE_BACKLOG.md`
- `docs/codex/KONFRM_QUALITY_GATES.md`
- `docs/codex/KONFRM_CROSS_APP_MATRIX.md`
- `docs/codex/KONFRM_DECISION_CONFLICTS.md`
- `docs/codex/KONFRM_DOCUMENT_RECONCILIATION.md`
- `docs/codex/P1_1_SCHEMA_RLS_BASELINE_REPORT.md`

Then selectively inspect all Phase 0–3 task contracts, closure reports, relevant PRs/commits, migrations, and source code required to verify claims.

Do not assume any document is current merely because it exists. Treat Git history, current code, migrations, current DB/live evidence, and higher-authority Founder decisions as separate evidence classes and reconcile conflicts explicitly.

---

## 4. Current Founder decisions that must not be silently reversed

Treat the current governing rules in `docs/codex/KONFRM_MASTER_RULES.md` as mandatory unless a newer explicit Founder decision exists.

Pay particular attention to these invariants:

- same human may be Customer + Owner; Owner capability is never automatic at login;
- KYC = National ID front + National ID back + fresh/live face image + Admin review; no fake biometric/liveness claim;
- public Property requires `PUBLISHED + VERIFIED`;
- property `address = ''` is valid and must not hide an otherwise eligible public property;
- stay length = 2–30 nights;
- `PENDING_OWNER_APPROVAL` does not block availability;
- `APPROVED_PENDING_PAYMENT` and `CONFIRMED` do block availability;
- quote is not a hold;
- booking flow is Owner approval before payment/confirmation;
- deposit = actual first-night price;
- KONFRM commission = 20% of deposit only;
- Owner net deposit = 80%; no commission on remaining balance;
- Customer must not see internal financial split;
- wallet/ledger truth is persisted canonical data, never reconstructed or defaulted to zero on DB error;
- chat remains in-app; no phone/contact leakage;
- reviews occur only after `COMPLETED` where applicable;
- Supabase PostgreSQL/Storage is canonical;
- the Worker SQL-to-REST/RPC adapter is intentionally narrow and strict;
- major Phase 4–7 redesign must not be backported into this audit as a “cleanup.”

Latest Founder data-hygiene decision: property `f817ca19-1738-4ba5-93b3-afd3dc2d9a08` (`شقة ٣٢`) is intentionally preserved. Do not classify its continued existence alone as an audit defect.

---

## 5. Phase 0–3 historical coverage ledger

Build a complete ledger of completed work from the first task through Phase 3 using the macro roadmap, execution map, Git history, task contracts, reports, PRs, migrations, and current implementation.

For every material task/subtask, record:

- task/phase ID;
- original objective;
- authoritative contract/spec;
- implementation PR/commit(s);
- affected apps/systems;
- migration/RPC impact, if any;
- test evidence;
- CI evidence;
- live evidence where required;
- current implementation status: `PROVEN`, `PARTIAL`, `STALE_EVIDENCE`, `CONFLICT`, or `NOT_VERIFIED`;
- whether a current finding invalidates any previous closure claim.

Do not treat a historical “PASS” report as current truth without checking the surviving code and relevant live/canonical state.

---

## 6. Cybersecurity audit — comprehensive

Audit the system against the relevant OWASP Web/API threat classes and actual KONFRM architecture. Evidence must be tied to exact routes/files/config/migrations where possible.

### 6.1 Authentication and sessions

Review:

- login/OTP/prototype-auth behavior;
- session creation, validation, refresh, expiry, revocation, logout, reuse, and persistence;
- JWT signing/verification, algorithm/claim validation, issuer/audience if applicable;
- token storage in all three frontends;
- session fixation/replay risks;
- role bootstrap and surface restrictions;
- prototype shortcuts that could accidentally become public production bypasses.

### 6.2 Authorization / IDOR / role isolation

For Customer, Owner, Admin, and shared-human identities verify:

- every protected route enforces role and canonical identity server-side;
- Owner cannot operate on another Owner’s property, media, booking, wallet, KYC, or availability;
- Customer cannot access another Customer’s private data;
- Admin-only actions cannot be invoked by Customer/Owner tokens;
- client-provided IDs never override canonical ownership;
- list endpoints and detail endpoints have equivalent privacy boundaries;
- authorization does not depend on hidden UI buttons.

Explicitly inspect for BOLA/IDOR and mass-assignment risk.

### 6.3 Input, injection, parser, and output safety

Review:

- SQL/REST/RPC adapter query construction and matcher collisions;
- SQL injection or unsafe dynamic filters;
- JSON/body validation;
- UUID/date/status/amount validation;
- XSS/HTML injection in user-supplied property text, messages, reviews, names, Admin rendering, and any rich-text-like surface;
- URL/open-redirect risks;
- command/path injection in maintenance scripts;
- unsafe parsing/deserialization;
- response DTO allowlists and accidental private-field leakage.

### 6.4 CORS, CSRF, browser and transport boundaries

Review:

- CORS origin/method/header policy;
- credential behavior;
- CSRF exposure if cookies or implicit credentials are used anywhere;
- security headers where controlled by the app/platform;
- mixed-content/insecure endpoint use;
- source maps/debug endpoints or internal diagnostics exposed publicly.

### 6.5 Secrets and credentials

Scan current tracked files **and Git history** for:

- API keys;
- OAuth/PAT tokens;
- Supabase service-role/anon keys where inappropriate;
- passwords/admin credentials;
- private URLs containing credentials;
- `.env`/debug/log artifacts;
- hardcoded fallback credentials or fake-token fallbacks.

Known operational history includes credentials/tokens having appeared in agent console output. Treat any still-valid exposed credential as compromised.

**Never print secret values in the report.** Report only secret type, location/evidence, whether it appears active, and required rotation/removal action using redacted fingerprints if necessary.

### 6.6 Storage / media / KYC privacy

Audit:

- public `property-media` vs private identity/KYC buckets;
- presigned upload authorization and object-key ownership;
- MIME, size, extension, object validation;
- upload intent commit integrity/idempotency;
- orphaned object/DB-record behavior;
- arbitrary object overwrite/cross-owner access;
- KYC object privacy and Admin-only access;
- whether public URLs can expose private identity evidence;
- image/media rendering failure semantics.

### 6.7 Abuse, enumeration, rate limiting, and operational exposure

Identify practical risks around:

- OTP/request endpoints;
- auth/login enumeration;
- expensive public search/detail endpoints;
- repeated booking/approval/payment actions;
- Admin endpoints;
- upload/presigned URL generation;
- brute force/replay/rate-limit absence.

Do not invent a new product policy; report gaps and recommended controls.

---

## 7. Database, migrations, RLS, RPC, and persistence audit

Review the entire retained migration chain and compare it to current live DB metadata where read access exists.

Verify:

- schema/migration drift;
- missing or historically-applied-but-untracked migrations;
- constraints, FK integrity, uniqueness, exclusion constraints, indexes;
- status/domain consistency;
- RLS enablement/policies and service-role assumptions;
- grants and RPC execute privileges;
- `SECURITY DEFINER` / `SECURITY INVOKER` correctness, search paths, and privilege boundaries;
- transaction boundaries and atomicity;
- idempotency of critical mutations;
- concurrency safeguards/advisory locks;
- DB errors fail honestly rather than becoming empty success/zero values;
- orphaned rows or impossible states;
- timestamps/defaults/null semantics;
- schema fields used differently by Node path vs Worker path.

Explicitly revisit known baseline debt documented in `P1_1_SCHEMA_RLS_BASELINE_REPORT.md`; distinguish accepted historical drift from current exploitable/functional risk.

No DB mutation is permitted during this audit.

---

## 8. Backend / Worker / API contract audit

Audit Node and Cloudflare Worker execution paths, repositories, controllers/contracts, and the narrow SQL compatibility adapter.

Verify:

- Node and Worker produce equivalent business behavior where both are supported;
- strict adapter matcher ordering cannot route a query to the wrong operation;
- DTOs/allowlists prevent field leakage;
- malformed DB/PostgREST responses fail closed;
- not-found vs forbidden vs DB-failure semantics are truthful;
- error codes/statuses are stable and meaningful;
- external service failures are not converted to fabricated success;
- routes are not duplicated with divergent authorization/business rules;
- unsafe legacy/prototype endpoints are not reachable or relied upon unexpectedly;
- API versioning/base URLs/environment resolution are consistent.

Identify dead/legacy routes and scripts, but do not remove them during Stage A/B.

---

## 9. Business-rule audit — current behavior vs authority

Independently verify current code, DB constraints, API contracts, and tests against every relevant confirmed business invariant.

### Properties

Review lifecycle, Owner ownership, submit/review/approve/reject/archive/restore semantics, `PUBLISHED + VERIFIED`, valid empty address, media linkage, public search/detail equality, and Owner/Admin/Customer propagation.

### Booking and availability

Review:

- 2–30 night validation;
- date arithmetic/timezone boundaries;
- pending non-blocking semantics;
- approved-pending-payment and confirmed blocking semantics;
- quote not creating a hold;
- manual block vs booking overlap;
- cross-table concurrency protection;
- Owner approve/reject race behavior;
- duplicate requests/idempotency;
- stale availability between quote and mutation;
- truthful conflict handling.

### Finance / payment / wallet

Review:

- first-night deposit derivation;
- 20%/80% split;
- remaining balance calculation;
- persisted/server summary authority;
- Customer privacy of internal split;
- prototype payment state transitions;
- double-finalization/idempotency;
- wallet Pending/Available movement;
- immutable ledger semantics;
- DB error not converted to zero balance;
- payout currently unavailable behavior and no fake success.

Do not redefine currently-open cancellation/refund or remaining-balance policies.

### Identity / Owner capability / KYC

Review same-UUID dual-role behavior, explicit Owner registration, Owner capability checks, KYC completeness and review lifecycle, and storage privacy.

### Messaging/privacy and other implemented domains

Review any Phase 0–3 messaging, notifications, favorites, payment history, disputes, or adjacent functionality that is present enough to create privacy/security/canonical-state risk, while distinguishing deferred roadmap functionality from defects.

---

## 10. Cross-app truth audit

For shared entities/states, compare Customer App, Owner App, Admin App, backend contracts, and database fields.

Look for:

- duplicate local truth;
- hardcoded business data;
- fake success/fallbacks;
- stale state requiring browser reload/re-auth;
- inconsistent enums/mappings;
- list/detail disagreement;
- role-specific privacy leakage;
- frontend reconstruction of server-authoritative money/status;
- cached older responses overwriting newer canonical state;
- loading/error/empty states that visually masquerade as real data.

Re-validate the Phase 3 Owner → Admin → Customer property slice at code-contract level and against available live read-only evidence. Do not create new production records during this audit.

---

## 11. Frontend and UI implementation quality before Phase 4

This is **not** a Phase 4 redesign audit. Do not score old UI for visual polish that is intentionally scheduled for Phase 4–7.

Audit only foundation-level UI risks that could contaminate Phase 4 work:

- inaccessible/broken critical flows;
- incorrect role navigation;
- impossible states;
- data truth/fallback problems;
- crashes/runtime errors;
- Arabic/RTL bugs that alter meaning or action safety;
- broken image/media handling;
- unhandled loading/error/retry states;
- dangerous disabled/enabled action logic;
- client-side business-rule duplication;
- component/state architecture that creates correctness bugs.

Separate `FOUNDATION_DEFECT` from `PHASE_4_DESIGN_DEBT`.

---

## 12. Code quality and maintainability audit

Review all app/backend code for defects and future-risk hotspots, not aesthetics.

Identify:

- duplicate implementations of the same domain rule;
- dead/unreachable code;
- stale mocks/fakes/placeholders;
- hardcoded IDs/statuses/prices/financial values;
- swallowed exceptions and empty catches;
- broad catch-and-default behavior;
- unsafe casts / weak runtime validation;
- giant multi-responsibility files/functions;
- circular/tangled dependencies;
- inconsistent naming/types/contracts;
- brittle string matching;
- race conditions and stale closures;
- uncontrolled async work;
- memory/event-listener leaks;
- code paths that differ silently between apps;
- copy/paste route/DTO drift;
- debug scripts capable of destructive live operations;
- generated/build files accidentally tracked;
- comments/TODOs that reveal unresolved correctness or security debt.

For every refactor candidate, state whether it is:

- correctness/security necessary before Phase 4;
- safe maintainability improvement but non-blocking;
- risky/unnecessary churn that should be left alone.

Do not refactor during this audit.

---

## 13. Dependency and supply-chain audit

For every Node workspace/app/backend:

- inspect `package.json` and lockfiles;
- detect unused or suspicious dependencies where evidence supports it;
- review dependency versions with known vulnerability tooling if available;
- distinguish production vs dev-only vulnerability impact;
- inspect install/build scripts for unsafe behavior;
- review GitHub Actions third-party actions/version pinning;
- inspect Node runtime/version consistency;
- identify abandoned/deprecated critical dependencies;
- flag lockfile drift or non-reproducible install risk.

Do not upgrade packages during Stage A/B.

---

## 14. Tests, CI, and evidence integrity audit

Do not equate “green” with “covered.”

For each critical domain, determine:

- what test file asserts it;
- whether the test can fail for the actual defect;
- whether it is included in the normal CI command;
- whether mocks hide Worker/DB/live incompatibility;
- whether assertions are strong enough;
- whether concurrency/error/privacy cases are covered;
- whether tests accidentally mutate production or depend on shared live QA accounts;
- whether flaky/time-sensitive tests exist;
- whether frontend build/typecheck actually runs in CI;
- whether migrations/contracts have executable regression coverage;
- whether deployment occurs from the exact reviewed SHA.

Create a `CRITICAL COVERAGE MATRIX` for at minimum:

- authentication/session;
- role/IDOR;
- Owner registration/KYC;
- property/media lifecycle;
- public visibility/search/detail;
- booking lifecycle;
- availability/concurrency;
- finance/payment finalization;
- wallet/ledger;
- Customer privacy;
- Phase 3 cross-app propagation.

Mark each `STRONG`, `PARTIAL`, or `MISSING` with evidence.

---

## 15. Live deployment and operational audit

Using read-only evidence only, inspect:

- current Worker/API health and deployed revision relationship to main;
- Customer/Owner/Admin deployed asset/revision evidence where accessible;
- environment/base-URL correctness;
- obvious stale frontend deployment mismatch;
- production error/debug exposure;
- live DB/schema alignment with repository assumptions;
- QA/test residue that creates user-facing contamination;
- archived vs active QA data;
- broken public media/object references;
- unsafe operational scripts or manual procedures.

Known recent Phase 3 media verification used a valid photographic JPEG and passed actual browser raster decode across Admin, Owner, Customer Explore, and Customer Detail; do not reopen that finding without contrary evidence.

Recent hygiene work archived confirmed QA contamination. The Founder explicitly chose to retain `شقة ٣٢` as noted above.

---

## 16. Documentation / governance consistency audit

Compare current implementation/live evidence with:

- `docs/CURRENT_STATE.md`;
- `tasks/CURRENT_TASK.md`;
- current reality/completion matrix/execution map/rescue backlog;
- architecture/database/business/integration docs;
- task contracts and closure reports.

Flag:

- stale SHAs;
- stale phase/task status;
- closed findings still documented as open;
- open risks hidden by “closed” wording;
- contradictory rules;
- historical documents masquerading as authority;
- missing evidence references.

Documentation drift is a finding, but distinguish it from product-code defects.

---

## 17. Security-specific adversarial questions

Attempt to answer, with evidence, at least the following:

1. Can a Customer token invoke any Owner/Admin mutation?
2. Can an Owner operate on another Owner’s resource by replacing an ID?
3. Can a non-Admin approve property/KYC or access protected Admin data?
4. Can private KYC objects be fetched anonymously or through guessed URLs?
5. Can a malformed DB response create a false success or fake zero/value?
6. Can a pending booking accidentally block dates?
7. Can two concurrent booking/manual-block mutations violate availability?
8. Can payment/deposit finalization run twice and double-credit state?
9. Can client-provided money/status/owner values override server truth?
10. Can Customer responses leak phone, private KYC, internal commission split, wallet, or unrelated account fields?
11. Can stale frontend requests overwrite newer canonical state?
12. Can invalid media be committed as if it were user-visible-valid, and if so is that currently a product/security issue or only test-payload validation debt?
13. Are any prototype login/fallback credentials reachable in a way that would be unacceptable for current public exposure?
14. Are any secrets present in tracked files/history or deploy logs?
15. Can a destructive historical QA/script command be run accidentally against production without an explicit guard?

Do not perform harmful exploitation against production. Use static analysis, safe negative requests, existing tests, and read-only evidence.

---

## 18. Finding format — mandatory

Every unique finding must have a stable ID such as `P4A-SEC-001`, `P4A-DB-001`, etc.

For each finding provide:

- **ID**
- **Severity:** `CRITICAL | HIGH | MEDIUM | LOW | INFO`
- **Category**
- **Pre-Phase-4 blocker:** `YES | NO | NEEDS_FOUNDER_DECISION`
- **Confidence:** `HIGH | MEDIUM | LOW`
- **Evidence:** exact file/line, route, migration, test, CI run, read-only query/live observation, or commit/PR reference
- **Observed behavior**
- **Expected governing behavior**
- **Root cause**
- **Impact / exploitability / affected roles**
- **Affected systems/apps**
- **Required remediation**
- **Risk of remediation**
- **Recommended executor:** `ZCode | Antigravity | Bridge/UI Lab | Founder decision`
- **Verification required after fix**
- **Related/duplicate findings**

Do not duplicate the same root cause across many superficial symptoms; link symptoms to one canonical finding where appropriate.

---

## 19. Severity and blocker rules

Use these definitions:

### CRITICAL

Likely exploitable auth/privacy/financial compromise, destructive integrity failure, secret exposure with meaningful active access, or a defect capable of materially corrupting canonical production state.

**Always blocks Phase 4.**

### HIGH

Major security boundary failure, canonical business-rule violation, cross-account data risk, booking/finance/concurrency defect, or systemic correctness issue with realistic impact.

**Normally blocks Phase 4.**

### MEDIUM

Real defect or maintainability/testing weakness with bounded impact, meaningful but non-immediate security hardening gap, or foundation issue likely to create Phase 4 regressions.

Block only when it affects a Phase 4 foundation or makes verification unreliable.

### LOW

Minor correctness, maintainability, observability, consistency, or hygiene issue with limited risk.

Usually non-blocking.

### INFO

Intentional limitation, accepted prototype constraint, or improvement opportunity that is not currently a defect.

Never inflate severity to force cleanup.

---

## 20. False-positive controls

Before reporting a finding:

1. verify the code path is reachable/current;
2. check for a newer Founder decision or approved override;
3. check server/database enforcement before assuming UI enforcement is the only guard;
4. distinguish prototype limitation from accidental weakness;
5. distinguish stale docs from live implementation failure;
6. reproduce logically or with a safe test when practical;
7. search existing tests/issues/reports for prior intentional rationale;
8. clearly mark uncertainty rather than inventing intent.

A code smell without demonstrated risk belongs in maintainability/refactor candidates, not automatically in HIGH/MEDIUM findings.

---

## 21. Stage B — remediation plan

After Stage A, create a single ordered remediation plan grouped as:

1. `BLOCKER / CRITICAL`
2. `HIGH — MUST FIX BEFORE PHASE 4`
3. `MEDIUM — PRE-PHASE-4 FOUNDATION`
4. `SAFE TO DEFER AFTER PHASE 4 ENTRY`
5. `CODE QUALITY / CLEANUP ONLY`
6. `NEEDS FOUNDER DECISION`
7. `DO NOT CHANGE / INTENTIONAL`

For every proposed remediation state:

- dependency order;
- recommended implementation owner;
- whether DB/migration/RPC/security-sensitive work is involved;
- likely changed paths/systems;
- required regression tests;
- live verification requirement;
- rollback/risk considerations;
- whether it can be safely batched or must be isolated.

Do not produce one giant “refactor everything” task. Separate risky semantic fixes from mechanical cleanup.

---

## 22. Required final report

Return one `PRE_PHASE_4_MASTER_AUDIT_REPORT` containing these sections in order:

1. **Audit identity** — repository, exact audited main SHA, timestamp, tool/access limitations.
2. **Executive verdict** — one of:
   - `READY_FOR_PHASE_4`
   - `READY_FOR_PHASE_4_WITH_DEFERRED_NONBLOCKERS`
   - `NOT_READY_FOR_PHASE_4`
   - `NEEDS_FOUNDER_DECISION`
3. **Residual confidence statement** — what was and was not possible to prove.
4. **Phase 0–3 coverage ledger**.
5. **Critical/High findings first**.
6. **All remaining findings table**.
7. **Cybersecurity posture summary**.
8. **Database/RLS/RPC/migration posture summary**.
9. **Business-rule compliance matrix**.
10. **Cross-app truth matrix**.
11. **Critical test/CI coverage matrix**.
12. **Live/deployment/data-hygiene findings**.
13. **Code-quality/refactor candidates** separated from defects.
14. **Documentation/governance drift**.
15. **Stage B remediation plan in dependency order**.
16. **Explicit list of areas verified clean** — do not only report problems.
17. **Open Founder decisions, if any**.
18. **Exact next gate recommendation**.

Finish with exactly one of:

- `PRE_PHASE_4_AUDIT_CLEAN`
- `PRE_PHASE_4_REMEDIATION_REQUIRED`
- `PRE_PHASE_4_FOUNDER_DECISION_REQUIRED`

Do not claim Phase 4 may begin merely because no obvious defect was found. The verdict must be evidence-based against this entire contract.

---

## 23. Mandatory stop condition

After returning Stage A findings + Stage B plan:

**STOP.**

Do not fix, commit, migrate, deploy, clean up, or reorganize anything until the Founder/Bridge explicitly approves a remediation scope.

# KONFRM — Post-Phase-7 Deferred Closure Gate

**Status:** FOUNDER APPROVED  
**Decision ID:** `FOUNDER_APPROVED_PHASE_4_EARLY_ENTRY`  
**Date:** 2026-09-06  
**Applies after:** Phase 7  
**Mandatory before:** Phase 8 implementation begins  
**Origin:** Founder consciously accepted entering the Phase 4–7 UI/UX program before completing the remaining Pre-Phase-4 remediation closure.

---

## 1. Decision

The Founder explicitly authorizes KONFRM to begin **Phase 4 immediately** without first completing R2, R3, R4, or R5 from `tasks/PRE_PHASE_4_REMEDIATION_EXECUTION.md`.

This is a deliberate sequencing override.

It does **not**:

- delete the remediation work;
- declare those tasks complete;
- weaken their acceptance criteria;
- rewrite historical audit findings;
- authorize fake UI fallbacks;
- authorize product/business-rule changes;
- authorize Phase 8 before deferred closure is revisited.

The correct interpretation is:

> Phase 4–7 may proceed now.  
> R2–R5 become mandatory deferred closure work after Phase 7 and before Phase 8.

---

## 2. Why this override exists

Founder priorities:

- Phase 3 is genuinely live closed.
- Critical R1 Admin auth/security has been remediated and Founder manually verified successful Admin login.
- The Founder wants to enter the dedicated UI/UX program without spending additional time in broad pre-design remediation/audit loops.
- Remaining known items are important, but the Founder accepts carrying them through Phase 4–7 as documented debt.

This is a **known-risk / documented-debt** decision, not an accidental omission.

---

# 3. Deferred Item R2 — Owner Financial Analytics Canonical Contract

**Status:** DEFERRED — NOT CLOSED

Known issue:

- Owner client calls `/owner/analytics?timeRange=...`.
- Canonical backend route is missing/incomplete relative to the visible screen.
- Historical success-shaped Owner fallback can mask an absent route.
- `AnalyticsFoundationView` can dereference missing `financialSummary` and crash.

Required closure after Phase 7:

- canonical `GET /api/v1/owner/analytics?timeRange=...`;
- strict ROLE_OWNER behavior;
- canonical persisted derivation;
- approved finance rules only;
- no fabricated analytics;
- truthful DB/read failure;
- runtime DTO validation;
- distinct loading / empty / unavailable / error / populated UI;
- export behavior uses valid canonical data or is truthfully unavailable;
- unknown Owner routes return truthful non-2xx rather than fake success;
- tests + CI + live Owner verification.

### Phase 4–7 constraint

Designers may redesign the analytics experience.

They must **not** treat existing fake/missing analytics behavior as truth.

If analytics data is required for a design prototype:
- use clearly identified design/sample content only inside design artifacts,
- never convert that sample into production truth,
- preserve implementation dependency for this gate.

---

# 4. Deferred Item R3 — Admin Notification Bell

**Status:** DEFERRED — NOT CLOSED

Known issue:

- backend has `GET /api/v1/admin/notifications`;
- current Admin app can fetch notification count;
- visible bell is disabled / not a complete observable action.

Required closure after Phase 7:

- actionable bell;
- truthful notification panel/drawer/modal;
- loading;
- empty;
- error/retry;
- populated list;
- count derived from canonical response;
- no fabricated notifications;
- no invented mark-read mutation if backend does not support it;
- interaction tests;
- Admin CI coverage;
- live browser verification.

### Phase 4–7 constraint

Phase 7 is allowed to design the final Admin notification UX.

If the final Phase 7 design naturally replaces the old bell implementation, R3 closure should validate the **new approved Phase 7 experience**, not reintroduce the old UI.

---

# 5. Deferred Item R4 — Regression + Foundation Closure

**Status:** DEFERRED — NOT CLOSED

Required closure after Phase 7:

## R4.1 Worker/ownership adapter regression
Prove `getOwnershipById` SQL/REST mapping returns the narrow fields Owner authorization actually consumes and fails closed on malformed response.

## R4.2 CI interaction coverage
Ensure relevant repaired surfaces are actually in normal CI without redundant suites:

- Owner analytics contract.
- Admin notification interaction.
- Admin auth security/blank-field behavior.
- unknown Owner route fallback.

## R4.3 Governance reconciliation
Update the smallest current-state/canonical docs required so they reflect post-Phase-7 reality.

Do not rewrite historical reports.

## R4.4 Security/doc scan
Prove current tracked source contains no:

- old Admin plaintext credential;
- JWT default signing secret;
- newly introduced secret;
- production-authenticating test fixture;
- workflow behavior that prints secrets.

---

# 6. Deferred Item R5 — Final Three-App Interaction + Security Closure

**Status:** DEFERRED — NOT CLOSED

R5 is the final verification gate after Phase 7 and after R2–R4 closure.

Required:

- exact current main SHA;
- exact CI;
- deployment identity;
- Customer / Owner / Admin visible journey checks;
- runtime errors;
- console errors;
- unhandled rejections;
- unexpected failed network requests;
- dead actions;
- misleading affordances;
- loading/error/empty states;
- corrected analytics;
- corrected Admin notification behavior;
- Admin auth/session sanity;
- no obvious cross-app regressions;
- security closure evidence.

R5 is verification, not a redesign phase.

---

# 7. Deferred Security Housekeeping

**Status:** DEFERRED / MUST NOT BE FORGOTTEN

A GitHub OAuth credential was exposed in prior agent transcript output.

Required after Phase 7, or earlier if security circumstances make it urgent:

- revoke/rotate the exposed credential using safe secret-handling procedures;
- verify replacement connectivity without printing secret values;
- ensure agent transcripts do not expose the replacement.

Do not reproduce the exposed token in documentation or chat.

---

# 8. Admin Password Reset UX Requirement

**Status:** PHASE 7 UX REQUIREMENT / IMPLEMENTATION DEPENDENCY TO BE CLASSIFIED

Founder-described desired journey:

1. `نسيت كلمة السر`
2. Email-entry page.
3. Reset email is sent.
4. Email contains `إعادة تعيين كلمة السر`.
5. Link opens a confirmation/identity-recognition state.
6. A clear `الرجوع لتطبيق الأدمن` action returns the user to the Admin app.
7. `إعادة تعيين كلمة السر` page:
   - new password;
   - confirm password;
   - `تغيير كلمة السر`.
8. Success state confirms the change.
9. `تسجيل الدخول مرة أخرى`.
10. Login using email + new password.

Important:

- Phase 7 should design this journey professionally.
- Do not fake email delivery or reset-token capability.
- If backend email/reset token/deep-link capability does not exist, record the functional dependency explicitly.
- The design may be approved before the underlying capability is implemented.
- Functional implementation timing must follow the roadmap/dependency decision approved by Founder.

---

# 9. Phase 4–7 Guardrails While Debt Is Deferred

During Phase 4–7:

### Allowed
- redesign visual structure;
- improve information architecture;
- define role-specific UX;
- create final screen states;
- identify missing capabilities;
- classify future capabilities/dependencies;
- remove misleading affordances when approved design replaces them.

### Not allowed merely because design wants it
- invent financial formulas;
- change booking lifecycle;
- change availability blocking rules;
- invent cancellation/refund policy;
- invent auth/permission architecture;
- invent notification engine semantics;
- fabricate backend capability;
- implement a new paid provider without Founder approval.

If a deferred defect prevents meaningful design testing:
- fix only the minimum prerequisite with explicit Bridge scope;
- do not reopen a broad pre-Phase-4 audit.

---

# 10. Mandatory Return Point

After Phase 7 is genuinely closed:

> **STOP BEFORE PHASE 8**

Then read this file and execute the deferred closure sequence.

Preferred order:

`R2 → R3 → R4 → R5`

Security housekeeping may be performed earlier when convenient/safe, but must be confirmed closed before the post-Phase-7 gate is signed off.

Only after the deferred closure is complete may the Bridge record:

`POST_PHASE_7_DEFERRED_CLOSURE_PASS`

and permit Phase 8 execution.

---

# 11. Founder Override Precedence

This decision supersedes any older statement that mechanically says:

> “Phase 4 MUST NOT begin until R5 passes.”

The underlying R2–R5 requirements remain valid; only their timing has changed.

The fixed Phase 0–22 roadmap remains unchanged.

This is execution sequencing, not roadmap renumbering.

---

# 12. Closure Checklist

After Phase 7:

- [ ] R2 Owner analytics closed and live verified.
- [ ] Unknown Owner success fallback removed/truthful.
- [ ] R3 Admin notification action closed and live verified.
- [ ] R4 ownership-adapter regression added.
- [ ] R4 relevant CI coverage confirmed.
- [ ] R4 governance docs reconciled.
- [ ] R4 current-source security scan passed.
- [ ] Exposed GitHub OAuth credential rotated/revoked and replacement verified safely.
- [ ] Phase 7 Admin password-reset design requirement recorded in final design artifacts.
- [ ] Functional password-reset dependency classified.
- [ ] R5 final three-app live smoke/security closure passed.
- [ ] No unresolved blocker remains before Phase 8.
- [ ] Bridge records `POST_PHASE_7_DEFERRED_CLOSURE_PASS`.

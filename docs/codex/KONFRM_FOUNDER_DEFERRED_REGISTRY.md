# KONFRM Founder Deferred Registry

**Purpose:** Persistent registry for Founder-deferred product, UX, auth, technical, and roadmap decisions that must be easy to resume later without relying on chat memory.

**Authority:** Founder explicit deferral decisions. This file records deferrals; it does **not** authorize implementation.

**Last updated:** 2026-09-22

## Status model

- `DEFERRED_BY_FOUNDER` — explicitly postponed by the Founder.
- `DEFERRED_TECHNICAL_GATE` — known technical acceptance work intentionally left open.
- `DEFERRED_ROADMAP` — future product/UX capability recorded for later scoping.
- `SEPARATE_FUTURE_TASK` — real work exists but must not be mixed into the current active slice.

## Active work that is NOT deferred

- **Customer Auth V2 Screen 10** — active next product/design/implementation scope.
- **Founder hands-on QA preview for Screens 08/09** — should be available before future visual acceptance gates when needed.
- **Screens 08/09 visual design** — Founder-approved / visually closed; later Auth technical gates must not reopen them for cosmetic redesign unless a real defect appears.

---

## D-001 — Screen 03 Explore redesign

**Status:** `DEFERRED_BY_FOUNDER`

Founder instruction: leave Screen 03 for now and continue the current roadmap; return to it later.

Persistent living spec location:
- Repository: `Essxm01/SOLA-APP`
- Path: `DESIGN_SYSTEM/EXPERIENCE/SCREEN_03_EXPLORE_LIVING_SPEC.md`
- Branch: `docs/screen03-explore-living-spec`
- Commit: `a8df0bce3173794876618827bacee8ffe70c3`
- PR: `#46` (historically open/unmerged when deferred)

**Return trigger:** Founder explicitly reopens Screen 03.

---

## D-002 — Customer Auth multi-provider sign-in

**Status:** `DEFERRED_BY_FOUNDER`

Potential future customer sign-in/account methods to evaluate:
- Phone
- Email
- Google
- Apple

This is intentionally postponed until after Screen 10 is completed.

**Important:** This is a future architecture/product decision, not approval to implement Google or Apple now.

**Return trigger:** Screen 10 is completed and Founder explicitly reopens customer Auth expansion.

---

## D-003 — Passwordless vs hybrid password architecture

**Status:** `DEFERRED_BY_FOUNDER`

Open future decision:
- keep Customer Auth passwordless, or
- introduce a hybrid password model.

If a password model is later approved, the scope must include the full architecture, not only UI fields:
- password storage/hash policy
- login semantics
- forgot/reset password
- password change
- brute-force protection
- relationship between OTP and password
- password confirmation
- show/hide password affordance with hidden-by-default behavior

No password implementation is authorized now.

**Return trigger:** Reopen together with D-002 after Screen 10.

---

## D-004 — Customer registration/profile enrichment

**Status:** `DEFERRED_BY_FOUNDER`

Fields discussed for later evaluation:
- profile photo/avatar
- date of birth
- gender
- username

These are not approved requirements for the current Screen 10 implementation.

The future decision must distinguish:
- data required to create/authenticate an account
- data required for booking/compliance
- optional profile-completion data

**Return trigger:** After Screen 10, during Auth/profile architecture review.

---

## D-005 — Email-only account creation

**Status:** `DEFERRED_TECHNICAL_GATE`

Current Auth V2 backend intentionally does not complete a brand-new Customer account from EMAIL-only verification.

Current runtime behavior preserves:
- `EMAIL_ACCOUNT_CREATION_DEFERRED`

Phone-based verified account creation remains the supported new-account path for the current Auth V2 slice.

**Return trigger:** Multi-provider/customer identity architecture review after Screen 10.

---

## D-006 — Real OTP delivery providers

**Status:** `DEFERRED_BY_FOUNDER`

Real production delivery integrations remain deferred.

Previously intended future providers:
- SMS: Infobip
- Email: Resend

QA/development fixed OTP remains backend-only and must never be exposed in frontend UI/source.

Production providerless/fixed OTP must fail closed.

**Return trigger:** Production Auth V2 rollout preparation.

---

## D-007 — OTP browser paste acceptance

**Status:** `DEFERRED_TECHNICAL_GATE`

Current state:
- `OTP_BROWSER_PASTE = UNVERIFIED`

This must remain visible as an Auth acceptance gate. It does not reopen the approved Screen 09 visual design.

**Return trigger:** Auth V2 QA/E2E closure before Production rollout.

---

## D-008 — Existing-account Auth V2 E2E

**Status:** `DEFERRED_TECHNICAL_GATE`

Current state:
- `EXISTING_ACCOUNT_AUTH_E2E = DEFERRED_TECHNICAL_GATE`

Must be proven in a safe non-production environment before Auth V2 is considered fully production-ready.

**Return trigger:** Auth V2 QA/E2E closure before Production rollout.

---

## D-009 — Explore notifications affordance

**Status:** `DEFERRED_ROADMAP`

Current Customer Explore contract preserves:
- Notifications deferred
- no Bell icon

Do not add a notification Bell or implied notification capability until the underlying notification model is intentionally designed and implemented.

**Return trigger:** Notifications product/architecture phase.

---

## D-010 — Search intent reset behavior

**Status:** `DEFERRED_ROADMAP`

Current state:
- `SEARCH_INTENT_RESET = DEFERRED / UNCHANGED`

Do not silently change existing reset behavior while working on unrelated Explore/Auth slices.

**Return trigger:** Explicit search-state/Explore revisit.

---

## D-011 — Auth-related security hygiene outside the current UI slice

**Status:** `SEPARATE_FUTURE_TASK`

Previously surfaced host-scanner/Mimosa findings must remain separate from Auth Screen 08/09 UI work:
- `backend/server/src/scripts/test_m03_vertical_slice.ts`
- `backend/server/src/tests/adminAuthSecurityR1.test.ts`

These findings may involve intentional test fixtures or real hygiene work and require a bounded security review.

Do not mix them into Screen 10 implementation unless a direct dependency is proven.

**Return trigger:** Dedicated security-hygiene task.

---

## D-012 — Broader product-policy items already recorded as deferred/open elsewhere

**Status:** `DEFERRED_ROADMAP`

Keep these visible for later dedicated product decisions:
- cancellation/refund matrix
- remaining-balance payment method
- disputes/reviews behavior
- canonical notification model

These are already represented in current-state/backlog documentation and are not authorized for implementation by this registry.

**Return trigger:** Their dedicated roadmap/product phases.

---

## Operating rule for future deferrals

Whenever the Founder says any equivalent of:
- “سيبها دلوقتي”
- “نرجعلها بعدين”
- “أجلها”
- “مش دلوقتي”
- “بعد ما نخلص X”

the Bridge should:
1. record the item here,
2. record the exact return trigger if known,
3. distinguish product decision vs technical gate vs future opportunity,
4. avoid silently reopening it during unrelated work,
5. update or close the entry only after a later explicit Founder decision.

This registry is the persistent return point for deferred items; chat memory is not the authority.

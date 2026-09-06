# KONFRM — Founder Operating Profile

**Status:** FOUNDER APPROVED — CANONICAL OPERATING GUIDANCE  
**Version:** 1.0  
**Date:** 2026-09-06  
**Scope:** How ChatGPT and technical/design agents should work with the Founder inside KONFRM.

> This file is the concise operational layer. For the long-form behavioral/work-style analysis, read `KONFRM_FOUNDER_DEEP_OPERATING_PROFILE.md`.

---

## 1. Founder role

The Founder owns:

- Product direction.
- Business rules.
- Financial rules.
- UX priorities.
- Roadmap trade-offs.
- Approval of architecture-affecting decisions.
- Final acceptance of material risks.

The Founder is **not** the technical operator. Do not make him read complex logs, inspect diffs, debug SQL, or perform repetitive environment diagnostics when an agent can do it.

---

## 2. Communication

Default:

- Egyptian Arabic.
- Direct and practical.
- English technical terms where clearer.
- Short by default.
- Go deep only when depth changes the decision.

When explaining technical issues:

1. Say what is visibly happening.
2. Explain the cause in simple cause/effect.
3. Explain the proposed fix.
4. Tell Founder exactly what, if anything, he must do.

Do not use jargon without practical meaning.

---

## 3. Founder feedback pattern

The Founder gives direct feedback and may say:

- “مش فاهم”
- “مش عاجبني”
- “الكلام كتير”
- “عاوزها أقصر”
- “خلينا نتخطى ده”

Treat this as normal product iteration.

Do not defend a weak prior answer. Adjust.

---

## 4. Product philosophy

The current prototype is a product-learning instrument.

Optimize for:

- real behavior,
- real persistence,
- truthful states,
- cross-role consistency,
- realistic user journeys,
- high-quality UX,
- clear handoff to a future professional implementation team.

Do not over-engineer for production unless there is a real current dependency.

Do not let prototype workarounds silently become permanent product rules.

---

## 5. Core Founder quality bar

A feature is not done merely because:

- build passes;
- CI is green;
- endpoint returns 200;
- mock data renders.

Founder standard:

> implemented + truthful + verified + role-appropriate + understandable + no obvious regression

For visible flows, live/browser evidence matters.

---

## 6. Autonomy model

The Founder wants **maximum safe autonomy**.

Preferred execution:

> Inspect → diagnose → fix → test → self-fix → retest → regression → live verify → final report

Do not split one known task into unnecessary mini-prompts.

Use bounded autonomy:

### Automatically execute
When inside approved scope:

- inspect;
- implement;
- test;
- fix test failures caused by the task;
- retest;
- deploy if explicitly authorized;
- verify.

### STOP only for
- new Product/Business decision;
- financial-rule change;
- architecture change;
- destructive live mutation outside approval;
- secret exposure risk;
- material unapproved cross-app blast radius;
- canonical-source conflict that requires Founder decision.

---

## 7. Prompt construction

Serious executor prompts should contain:

`MISSION → REALITY ANCHOR → KNOWN FACTS → SUCCESS CRITERIA → ALLOWED SCOPE → FORBIDDEN SCOPE → EXECUTION PLAN → DECISION TREE → RECOVERY LOOPS → VALIDATION → STOP CONDITIONS → EVIDENCE → RETURN FORMAT`

Important:

> Root-cause discovery is not completion when remediation is already authorized.

Predict likely branches up front.

---

## 8. Agent routing

### ChatGPT / Bridge
Use for:
- product reasoning,
- architecture,
- decision trees,
- task framing,
- evidence review,
- business/UX protection.

### Antigravity
Use for:
- long-running execution,
- repo/Git/GitHub,
- Supabase/Cloudflare,
- deployment,
- migrations,
- clear fix/test loops.

### ZCode High
Use for:
- complex implementation,
- cross-layer debugging,
- browser/runtime reasoning,
- heavy coding.

### ZCode Low
Use for:
- bounded browser QA and smoke flows.

### Codex
Use sparingly for:
- finance,
- security,
- concurrency,
- difficult architecture,
- independent high-risk review.

### LAP
Use for:
- UI/UX direction during Phase 4–7.

---

## 9. Cost / quota behavior

- Avoid unnecessary paid AI/API spend.
- Preserve Codex quota.
- Do not create multiple agent rounds when one well-designed task is enough.
- Delay paid provider integrations if product logic can be proven without them.
- Never fake financial rules merely because payment rails are deferred.

---

## 10. UI/UX role mental models

### Customer / Renter
Needs:
- trust,
- clarity,
- safety,
- clear next step,
- honest price and availability.

### Owner
Needs:
- control,
- attention management,
- action-first workflows,
- booking and wallet clarity.

### Admin
Needs:
- operational clarity,
- evidence,
- decision speed,
- truthful queues/states.

UI work must be judged by these role-specific goals.

---

## 11. What not to do

Never:

- invent Business Rules;
- treat code constants as Product Rules;
- fabricate data or success states;
- hide backend errors as zero/empty values;
- make Founder debug technical internals unnecessarily;
- call CI “live verification”;
- burn Codex quota for reassurance;
- repeat a broad audit without a concrete new reason;
- change architecture because an executor prefers a cleaner design.

---

## 12. Founder risk overrides

The Founder may consciously accept a known risk.

When he does:

1. Explain material risk once.
2. Record the explicit override.
3. Record deferred obligations.
4. Proceed within the approved boundary.
5. Do not repeatedly block on the same already-accepted issue unless new evidence materially changes it.

---

## 13. Documentation rule

Critical project knowledge belongs in the repo.

Use conversation memory as assistance, not sole authority.

Durably document:

- Founder overrides.
- Deferred work.
- Business rules.
- phase gates.
- architecture decisions.
- major working-style changes.

---

## 14. Project-local memory preference

For KONFRM collaboration:

- prioritize project-local conversation context;
- do not infer Founder working style from unrelated chats outside KONFRM;
- prefer current explicit instruction and canonical repo documentation over older summaries.

---

## 15. Current Phase 4 entry decision

Founder explicitly authorized entering Phase 4 before R2–R5 closure.

Deferred work is governed by:

`tasks/POST_PHASE_7_DEFERRED_CLOSURE.md`

Do not use the old pre-Phase-4 R5 gate to block Phase 4 after this explicit Founder override.

---

## 16. Deep profile

For detailed work-style, communication, decision, pacing, UX, research, risk, trust, and behavioral heuristics:

`docs/codex/KONFRM_FOUNDER_DEEP_OPERATING_PROFILE.md`

# KONFRM quality gates

Apply only gates relevant to the phase, but explain any skipped gate.

1. **Universal DoD / intent:** outcome and authority are traceable; no known in-scope placeholder/fake behavior remains.
2. **API and DB/data:** canonical source, validation, authorization, persistence, migration/RPC/RLS impact, and truthful failure behavior are proven.
3. **Cross-app integration:** shared entities/states propagate correctly to applicable roles.
4. **Booking/availability and finance:** whenever touched, explicitly review status, dates/quote, blocking, idempotency, deposit/commission/ledger/privacy consequences.
5. **Auth/security and storage/media:** verify role/ownership boundaries, secret handling, private-object access, MIME/size/object validation where relevant.
6. **UI/visual/mobile/Admin/RTL:** role-appropriate hierarchy, representative viewports, Arabic/RTL, accessibility, loading/empty/error/retry/disabled/conflict states.
7. **Tests/regression:** focused executable tests plus proportionate typecheck/build; adjacent high-risk flows are checked.
8. **Live verification:** for deployment-sensitive work, verify the actual affected live scenario and exact revision; build/CI alone is insufficient.
9. **Evidence/report:** capture commands/results, screenshots where UI changed, known gaps, and update the matrix/reality/backlog.

## Mandatory self-fix loop

For every in-scope defect discovered during implementation, tests, visual QA, functional review, or adversarial review:

**Detect → diagnose root cause → fix → retest → reinspect → repeat until the applicable gate passes.**

Do not mark a phase Complete merely because a known in-scope defect was documented. A finding may enter the Rescue Backlog only when it is explicitly outside the approved phase scope, blocked by a prerequisite, requires an unresolved Founder/product decision, or requires an unauthorized architecture/business-rule change. The closure report must state which condition applies and why.

## Mandatory three-pass review

- **A — Functional:** contracts, data, transitions, errors, retries, idempotency.
- **B — Product/UI:** role relevance, hierarchy, visual quality, mobile/admin layout, Arabic copy, states.
- **C — Adversarial:** authorization, stale state, cross-account leakage, fake fallback, regression, privacy.

Use `KONFRM_PHASE_TEMPLATE.md` before work and `KONFRM_PHASE_REPORT_TEMPLATE.md` at closure.

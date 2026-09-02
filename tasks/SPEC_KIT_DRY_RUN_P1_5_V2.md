# KONFRM SPEC KIT DRY RUN V2 — P1.5 PLANNING ONLY

## Purpose
Re-run the P1.5 Spec Kit planning pilot after the first dry run exposed authority and architecture-grounding defects.

This remains PLANNING ONLY. Do not implement P1.5.

## Why V1 is not accepted
The first dry run produced compact artifacts but is NOT an accepted workflow proof because:
1. It cited `MR-14` as fail-closed/error truthfulness even though `MR-14` is Owner KYC.
2. It described `MR-13` as financial snapshot immutability; `MR-13` actually defines deposit/commission/payment-before-approval/privacy rules.
3. It used a non-canonical PHASE 1 title instead of the exact roadmap title `PHASE 1 — قاعدة البيانات: العمود الفقري` from `خطة عمل التطبيق.txt`.
4. It claimed atomic booking + financial-summary persistence while planning two separate REST INSERTs and simultaneously declaring no migration/RPC impact. The Worker adapter is explicitly narrow and is not a transaction engine.
5. It reported a Spec Kit analyze PASS without clear evidence that the actual installed analyze skill was executed.

Do not patch V1 artifacts. Generate a fresh V2 feature-spec area.

## Repository / Branch
- Repository: `Essxm01/SOLA-APP`
- Branch: `pilot/spec-kit-p1-5-dry-run-v2`
- Spec Kit base SHA: `f8823af387bb92da41dbfbc9a63a0afa39094f2e`
- Current product main baseline at handoff: `fb38414d9076f89083bdc680e48e1a0b0329be06`
- P1.4 remains unpublished at this handoff; do not claim P1.5 implementation may start.

## Required ACTUAL Spec Kit workflow
Use the installed Antigravity Spec Kit skills as the workflow authority. Do not merely create similarly named markdown files from memory.

Execute stages in order:
1. Read and follow `.agents/skills/speckit-specify/SKILL.md`.
2. Read and follow `.agents/skills/speckit-plan/SKILL.md`.
3. Read and follow `.agents/skills/speckit-tasks/SKILL.md`.
4. Read and follow `.agents/skills/speckit-analyze/SKILL.md` and perform its real read-only consistency analysis.

Use the installed scripts/templates/overrides exactly as those skills direct.

In the final report, identify the exact skill path/stage used for each artifact and summarize the actual analyze findings. Do not claim `PASS`, `100%`, or zero gaps unless the analyze stage actually supports that conclusion.

## Authority validation gate — BEFORE drafting
Read only the relevant sections from:
- `AGENTS.md`
- `.specify/memory/constitution.md`
- `خطة عمل التطبيق.txt` — PHASE 1 / Tasks 1.4–1.6 only
- `docs/codex/KONFRM_MASTER_RULES.md` — confirmed rule register, especially MR-07, MR-08, MR-11, MR-12, MR-13
- `docs/codex/KONFRM_EXECUTION_MAP.md` — P1.5 row only
- `docs/BUSINESS_RULES.md` — Booking lifecycle/availability, Prototype deposit payment, Truthful state/privacy only
- `docs/DATABASE.md` — Booking/chat constraints and Worker architecture only
- `backend/server/src/services/financialEngine.ts` — `calculateBookingFinancials` only
- exact booking repository/Worker/router code only where needed

### Rule-ID correctness
Every `MR-##` used in generated artifacts MUST be verified against the rule register before citation.

Known anchors:
- MR-07 = Supabase persistence truthfulness.
- MR-08 = Worker REST/RPC adapter is narrow; not a general SQL/transaction engine.
- MR-11 = booking/money state is server/canonical-data authoritative.
- MR-12 = booking 2–30 nights, blocking states, fail-closed availability.
- MR-13 = first-night deposit, 20% commission on deposit, 80% owner net, 0% commission on remaining, no payment before Owner approval, Customer cannot see internal split.
- MR-14 = Owner KYC. Do NOT cite MR-14 for booking/error semantics.

## Canonical roadmap title
Use exactly:
`PHASE 1 — قاعدة البيانات: العمود الفقري`

Do not invent or paraphrase the macro phase title.

## P1.5 exact execution boundary
From the execution map:
- P1.5 = Booking and financial-summary persistence integrity
- Surfaces = Backend, DB, all roles
- Risk = Critical
- Verification emphasis = status / quote / idempotency tests

Do not convert `all roles` into a claim that UI changes are required. Role visibility/contract impact can exist with no UI edit.

## Financial-model grounding
Do NOT invent a formula such as `nights * price_per_night + fees = total` unless the currently authoritative quote logic proves that exact formula for the relevant baseline.

Ground finance in:
- canonical quote inputs / total-booking-value logic,
- `calculateBookingFinancials(totalBookingValueEgp, firstNightPriceEgp)`,
- MR-13.

The persistence invariant is parity with the canonical server-authoritative quote/financial engine, including:
- deposit = canonical first-night amount,
- commission = 20% of deposit,
- owner net deposit = deposit - commission,
- remaining = total - deposit,
- commission on remaining = 0.

Because P1.4 is unpublished and may affect availability/pricing inputs, avoid hardcoding a future pricing algorithm based only on pre-P1.4 main. Mark any dependency-sensitive detail as provisional until the published P1.4 baseline is known.

## Atomicity architecture gate
P1.5 requires booking + 1:1 financial summary persistence integrity.

Do NOT claim two independent PostgREST/Worker REST writes are transactionally atomic.

Investigate current repository reality for an existing booking-create transaction/RPC. If none exists:
- plan a DB-side transaction boundary, most likely a narrowly scoped RPC/function delivered through a candidate migration,
- then plan the corresponding strict Worker RPC matcher,
- keep table/schema DDL separate from function/RPC migration semantics (`no table change` does NOT mean `no migration required`).

Orchestrator read-only live evidence at handoff: no public function name containing `booking` or `financial` was found. Treat this as supporting evidence, not permanent truth; implementation must re-preflight live state before any migration.

## P1.4 predecessor handling
P1.4 is not closed/published at this handoff.
- Do not implement P1.5.
- Do not use unpublished P1.4 behavior as canonical product state.
- You MAY inspect the exact P1.4 candidate read-only only when a specific P1.5 dependency question requires it.
- The final V2 artifacts must state that they require a reality refresh/rebase after P1.4 publication before implementation dispatch.

## Artifact quality target
Generate a fresh V2 spec directory. Keep artifacts compact, but accuracy outranks line-count minimization.

### spec.md
Must include:
- exact PHASE title above,
- exact P1.5 boundary,
- verified rule references only,
- status/quote/idempotency acceptance focus,
- financial parity without invented pricing math,
- atomicity/fail-closed acceptance,
- P1.4 predecessor gate,
- no fabricated Founder decisions.

### plan.md
Must distinguish:
- existing DB tables/constraints,
- likely DB-side atomic RPC/function need,
- Worker RPC adapter need,
- existing server financial engine,
- current-vs-post-P1.4 baseline uncertainty.

Do not predeclare `N/A — no migration` unless repository evidence proves an existing transaction primitive that satisfies atomicity.

### tasks.md
Generate the minimum safe independently verifiable tasks.
Do not force a predetermined number.
Route heavy DB/RPC/backend work to ZCode; long/mechanical verification to Antigravity; Codex final candidate review gate only.

Keep execution metadata fields from the KONFRM override.
This is a dry run, so:
- TASK_HANDOFF_SHA = DRY_RUN_NOT_DISPATCHED
- WRITER = NONE — PLANNING DRY RUN
- LIVE_MUTATION_AUTHORIZED = NO

## V2 analyze gate
Run the actual installed `speckit-analyze` skill after spec/plan/tasks generation.

At minimum, analysis must explicitly check:
- authority-reference correctness,
- requirements ↔ plan ↔ task coverage,
- atomicity architecture consistency,
- P1.4 predecessor treatment,
- finance-rule consistency,
- no task for an untouched surface,
- no implementation/live mutation.

If analyze finds defects, correct the artifacts and rerun analyze once.

## Forbidden
- NO application/backend/database implementation edits
- NO migration creation/application
- NO Supabase mutation
- NO Cloudflare mutation/deploy
- NO CI workflow edits
- NO main / PR #5 / PR #6 edits
- NO ZCode or Codex execution
- NO P1.5 implementation

## Required final report
Return compact:
`KONFRM SPEC KIT P1.5 DRY RUN V2 REPORT`

Include:
- starting SHA
- final artifact SHA
- generated directory and 3 artifact paths
- exact Spec Kit skill stages used
- artifact line counts
- task count + executor routing
- verified MR references used
- exact canonical PHASE title used
- atomicity design conclusion
- whether migration/RPC is likely required and why
- finance-parity statement
- P1.4 predecessor/reality-refresh treatment
- actual speckit-analyze findings and rerun result if applicable
- changed paths
- git diff --check
- LIVE MUTATION: NONE
- verdict: `SPEC_KIT_DRY_RUN_V2_PASS` or `SPEC_KIT_DRY_RUN_V2_NEEDS_REFINEMENT`

No raw successful logs.
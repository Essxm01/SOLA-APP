# P2.1 — Codex Blocker Correction 01

Mode: BOUNDED_CORRECTION / SINGLE_WRITER / TDD

Repository: Essxm01/SOLA-APP

Base main SHA: 317b7c3071fdd167b3419e8fd1b7f96d08ba6427
Starting candidate SHA: 0bd948448be508a75cc381da2cb3a6724fd4ac8b
Candidate branch: validation/p2-1-rc
Pull Request: #11

Final Codex review found one Important blocker in propertyDb.searchPublic(): the public unitType filter currently prefers propertyType over unitType. This is incorrect because the request parameter is unitType and repository evidence contains records where unitType and propertyType differ, including CHALET versus SUMMER_HOUSE.

Required correction:
1. Make the unitType filter compare only against the canonical validated p.unitType field.
2. Preserve case-insensitive matching.
3. Add a focused regression test in backend/server/src/tests/p21PublicApiContract.test.ts with unitType CHALET and propertyType SUMMER_HOUSE. Filtering by CHALET must include the property.
4. Add or retain a negative assertion that filtering by SUMMER_HOUSE must not match merely because propertyType is SUMMER_HOUSE.

TDD requirement:
- Add the regression test first and show that it fails against the starting candidate behavior.
- Make the minimal production fix.
- Re-run the focused test and all deterministic gates below.

Expected changed paths only:
- backend/server/src/services/dbRepository.ts
- backend/server/src/tests/p21PublicApiContract.test.ts

If another path is required, stop and report before changing it.

Forbidden:
- No Customer App changes.
- No Worker adapter changes.
- No DTO changes.
- No migrations or schema changes.
- No finance, booking, availability, publication, media, or privacy rule changes.
- No dependency changes.
- No live Supabase or Storage mutation.
- No deploy.
- No merge.
- No push to main.
- No force-push.

Deterministic validation:
- npm --prefix backend run check
- npm --prefix backend run test:p2-1-public-api
- npm --prefix backend run test:p13-property-persistence
- npm --prefix backend run test:p13-worker-adapter
- npm --prefix backend run test:p1-4-availability
- npm --prefix backend run test:p1-5-atomic-booking
- npm --prefix backend run test:p1-6-wallet-ledger
- git diff --check

Push only to validation/p2-1-rc, keep PR #11, and wait for exact-head PR CI.

Required report:
RESULT: P2_1_CODEX_BLOCKER_CORRECTION_PASS or P2_1_CODEX_BLOCKER_CORRECTION_BLOCKED
Then include STARTING_CANDIDATE_SHA, FINAL_CANDIDATE_SHA, BASE_MAIN_SHA, PR, EXACT_CHANGED_PATHS, RED_TEST_EVIDENCE, FIX_SUMMARY, EXACT_LOCAL_TEST_RESULTS, PR_CI run ID/head/status/conclusion/jobs, LIVE_MUTATIONS, DEPLOYMENT, MERGE, UNRESOLVED.

Do not call P2.1 closed and do not claim publication readiness. Any production-code SHA change requires a final exact-SHA semantic re-review.
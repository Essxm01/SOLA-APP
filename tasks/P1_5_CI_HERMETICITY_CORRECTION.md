# P1.5 — CI Hermeticity Correction

TASK_ID: P1.5-CI-HERMETICITY-CORRECTION
EXECUTOR: Antigravity
CANDIDATE_BRANCH: validation/p1-5-rc
CURRENT_CANDIDATE_SHA: 25b351939697968de6dc3258e32cebcbf073a2a6
BASE_MAIN_SHA: 477ef6a1b274e98a7b757f0b0b77ea8815cee741
PR: #9
LIVE_MUTATION: FORBIDDEN

## Verified Failure
GitHub Actions PR run #162 / `33708471933` failed only in `Validate Backend API` while running `test:p1-5-atomic-booking`.
Exact failure:
- file: `backend/server/src/tests/p15BookingAtomicPersistence.test.ts`
- line at failing candidate: 228
- expected route status 201, actual 500.

Independent diagnosis:
The route calls `getUnifiedUnavailableBlocks(propertyId)`, which reads BOTH:
- `bookingDb.getBlocksByPropertyId(propertyId)`
- `propertyAvailabilityDb.getByPropertyId(propertyId)`

The P1.5 route-behavior test stubs the booking side but does NOT stub the property-availability side. Therefore the test accidentally depends on external DB/config state. Existing P1.4 tests correctly stub both sides. This is a test-hermeticity defect, not evidence of a P1.5 transaction-design failure.

## Required Correction
Make the smallest possible test-only correction in `backend/server/src/tests/p15BookingAtomicPersistence.test.ts`:
1. Import `propertyAvailabilityDb` from `dbRepository`.
2. In the route-behavior test's `originals`, retain the original `propertyAvailabilityDb.getByPropertyId` function.
3. Stub `propertyAvailabilityDb.getByPropertyId` to return `[]` for this isolated route-success/failure test.
4. Restore the original function in `finally`.

Do NOT change production implementation, migration 026, financial rules, app route semantics, dbClient matcher, dbRepository transaction boundary, or P1.4 behavior unless the exact rerun proves another independent defect.

## Validation
Run:
- `npm --prefix backend run check`
- `npm --prefix backend run test:p1-5-atomic-booking`
- `npm --prefix backend run test:p1-4-availability`
- `npm --prefix backend run test:p1-4-worker-availability`
- `npm --prefix backend run test:p1-4-migration`
- `npm --prefix backend run test:booking-01`
- `npm --prefix backend run test:booking-01-1`
- `git diff --check`

Commit exactly the minimal correction to `validation/p1-5-rc` and push. Do not force-push. Do not merge.
Then wait for PR #9 exact-head CI and report the new exact candidate SHA and CI run/result.

## Prohibited
- No Supabase mutation.
- No Migration 026 application.
- No Cloudflare deploy.
- No main merge.
- No product/business/finance changes.
- No unrelated cleanup/refactor.
- Do not expose credentials.

## Success Output
`P1_5_CI_HERMETICITY_CORRECTION_PASS`
with:
- starting candidate SHA;
- final corrected candidate SHA;
- exact changed paths;
- local validation results;
- PR #9 exact-head CI run and required check results;
- Migration 026 = NOT APPLIED LIVE;
- live mutation = NONE.
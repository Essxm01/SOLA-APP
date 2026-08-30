# P1.3 — Property & media persistence integrity

**Status:** Open — same-task PR review remediation
**Published baseline:** `92dc3916afe7a8e7d15620efee31afa58e826870`
**Validation branch:** `validation/p1-3-rc` → `main`, PR #1 (unmerged)
**Closure boundary:** no main publication, merge, deployment, migration application, Storage mutation, or production data mutation.

## Verified baseline and retained rules

- The read-only P1.3 inventory observed 25 properties, 15 active property-image records, 23 upload intents, and no observed owner/image or owner/intent mismatch. Eight pending intents were expired. This is evidence, not permission to reuse expired intents.
- `property-media` is public property media. Owner identity evidence remains in the distinct private `owner-verification` bucket.
- A property rejection is schema-valid `status=DRAFT` plus `verification_status=REJECTED`; `properties.status=REJECTED` is not valid.
- Customer visibility requires `PUBLISHED` plus `VERIFIED`; Owner and Admin persistence must remain owner/role scoped.

## Earlier candidate defects and current remediation

The earlier P1.3 candidate was not approved for publication. Review found that the generic Worker PATCH matcher did not interpret owner lifecycle `COALESCE` assignments, and that image creation plus upload-intent completion used two non-atomic writes.

The in-progress corrected candidate now:

- adds an exact Worker adapter branch for owner-scoped lifecycle writes: submit → `PENDING_REVIEW/PENDING_VERIFICATION`, archive → `ARCHIVED` with verification preserved, restore → `DRAFT/UNVERIFIED`; REST failure and zero returned rows fail honestly;
- prepares (but does **not** apply) migration `024_atomic_property_media_commit.sql`, with a narrow `SECURITY INVOKER` `konfrm_commit_property_media` RPC, fixed search path, explicit service-role-only execute privilege, and a partial unique index enforcing one active image per upload intent;
- makes Worker media commit invoke that RPC rather than compose an image INSERT and upload-intent PATCH;
- makes replay return the canonical image, while wrong owner/property/object, expired intent, and RPC failure return no claimed success;
- fixes rejected-property metrics and filters to `DRAFT + REJECTED verification`; the Admin queue represents pending and rejected outcomes, while the review guard still refuses a rejected draft until the Owner resubmits;
- removes property-image read `catch(() => [])` fallback from canonical repository paths and returns scoped errors for Admin/Customer media reads;
- makes an already soft-deleted image record available only to its Owner for repeatable public-object cleanup. This is retryable cleanup, not a claim that Supabase Storage deletion and database soft-delete are one transaction.

## Required live rollout preflight

Migration 024 is local/PR only. Before a separate Founder-approved rollout, perform a read-only duplicate-active-image-per-upload-intent aggregate. Apply the additive migration first only if compatible, verify the old Worker remains healthy, then publish the Worker that calls the RPC and verify the deployed atomic path. Do not apply the migration or create/delete any property media during P1.3 validation.

## Test evidence and validation status

The final candidate must execute these isolated suites in PR CI before closure:

- `test:p13-property-persistence` — create/ownership/lifecycle, schema-valid rejection, Admin representation, and resubmission.
- `test:p13-property-media` — presign/owner/object/expiry/commit/replay and retryable storage-cleanup failure behavior.
- `test:p13-worker-adapter` — real `queryDb` Worker REST/RPC adapter with mocked fetch, including exact lifecycle PATCH filters/payload, zero/failure truthfulness, public eligibility, rejected metric, RPC invocation, and truthful image reads.
- `test:p13-atomic-media` — isolated atomic/replay/concurrent/failure contract plus migration security/structure checks.

The restricted local Codex runner still cannot start `tsx` because Windows user-profile resolution fails before any test loads (`uv_os_get_passwd` / `ENOMEM`), including under the portable Node 22 runtime. Backend TypeScript checking succeeds. GitHub pull-request CI is the independent execution authority for these safe, mocked tests; deployment remains skipped for PR events.

## Final remote-validation evidence policy

The exact final GitHub Actions run number/ID and final head SHA belong in the external P1.3 closure/publication report and PR metadata after CI completes. This durable document must not claim final validation for a superseded candidate SHA.

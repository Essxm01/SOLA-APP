# P1.3 — Property & media persistence integrity

**Status:** Cloud implementation ready for handoff — unpublished, unapplied, and awaiting separate remote validation
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

## Final Cloud remediation evidence

- The CI #135 test defect now inspects parsed URL query parameters, so `status=eq.REJECTED` is rejected without falsely matching the canonical `verification_status=eq.REJECTED` parameter.
- Owner lifecycle PATCHes require exactly one returned row; zero rows, multiple rows, and HTTP failure all fail explicitly.
- Migration `024` now follows the repository transaction/ledger convention. Its RPC locks the upload intent first as the serialization point, validates its binding, then locks and validates the active image. Replay succeeds only for the consistent pair `COMMITTED intent + matching ACTIVE image`; every contradictory half-state fails with `MEDIA_COMMIT_INCONSISTENT` and is not repaired automatically.
- Property rejection is represented across Owner and Admin surfaces as `DRAFT + REJECTED verification`; the legacy property-only `REJECTED` status was removed from the Owner property type and focused derivation tests distinguish rejected drafts from ordinary drafts.
- No live schema, data, Storage, property, media, or upload-intent mutation was performed. Migration `024` remains unapplied.

## Future rollout compatibility analysis

- **S0 — old Worker + current schema:** unchanged current behavior; it retains the known non-atomic two-write risk.
- **S1 — old Worker + migration 024:** additive RPC availability is compatible, but the partial unique index can reject an old-Worker duplicate ACTIVE insert that previously could persist. This is safer persistence failure, not evidence that migration-first is universally risk-free; preflight must prove no existing duplicate-active group before application.
- **S2-invalid — new Worker + no migration 024:** media commit RPC calls fail; this sequence is prohibited.
- **S3 — new Worker + migration 024:** intended atomic path, subject to separate live verification.

The future Round-2 order is: read-only duplicate-active preflight aggregates → apply `024` → verify RPC/index/ACL/application ledger → verify old Worker health → verify persistence aggregates → publish/deploy the new Worker → verify Worker behavior → post-deploy persistence aggregates. This report does not authorize or claim execution of that sequence.

## Required live rollout preflight

Migration 024 is local/PR only. Before a separate Founder-approved rollout, perform a read-only duplicate-active-image-per-upload-intent aggregate. Apply the additive migration first only if compatible, verify the old Worker remains healthy, then publish the Worker that calls the RPC and verify the deployed atomic path. Do not apply the migration or create/delete any property media during P1.3 validation.

## Test evidence and validation status

The final candidate must execute these isolated suites in PR CI before closure:

- `test:p13-property-persistence` — create/ownership/lifecycle, schema-valid rejection, Admin representation, and resubmission.
- `test:p13-property-media` — presign/owner/object/expiry/commit/replay and retryable storage-cleanup failure behavior.
- `test:p13-worker-adapter` — real `queryDb` Worker REST/RPC adapter with mocked fetch, including exact lifecycle PATCH filters/payload, zero/failure truthfulness, public eligibility, rejected metric, RPC invocation, and truthful image reads.
- `test:p13-atomic-media` — isolated atomic/replay/concurrent/failure contract plus migration security/structure checks.

The Cloud runner executed the focused mocked suites, Owner/Admin derivation tests, affected typechecks/builds, and design validation successfully. GitHub pull-request CI on the final handoff SHA remains separate evidence and was deliberately not queried in this run; deployment remains unauthorized.

## Final remote-validation evidence policy

The exact final GitHub Actions run number/ID and final head SHA belong in the external P1.3 closure/publication report and PR metadata after CI completes. This durable document must not claim final validation for a superseded candidate SHA.

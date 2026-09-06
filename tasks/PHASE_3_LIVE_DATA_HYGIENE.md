# PHASE 3 — Live QA Data Hygiene Gate

**Status:** APPROVED_FOR_EXECUTION  
**Scope:** Live-data hygiene only; no product code changes  
**Authoritative main at creation:** `8911fe4edc5b7a46d33ff6992f90d39ee2b55a01`

## Why this gate exists

Phase 3 functional and media verification passed, but the Founder opened the live Admin app and found 13 old properties still sitting in `PENDING_REVIEW / PENDING_VERIFICATION`. A read-only live audit confirmed these records exist in production and several are clearly historical QA/development artifacts.

This gate exists to clean confirmed QA residue safely without guessing that every suspicious-looking record is disposable.

## Known live pending-review records

Audit these exact property IDs:

1. `f817ca19-1738-4ba5-93b3-afd3dc2d9a08` — `شقة ٣٢`
2. `dd08cff4-5194-41bc-bb3a-aceadcc2ff77` — `شاليه اختبار دائم DB`
3. `4ce81136-ca42-436d-9d01-4c43479ab10f` — `شاليه تتبع خطأ DB`
4. `623c6802-e8e4-40a9-a994-c404ede9e67a` — `شاليه اختبار راوتر مباشر`
5. `35d88b97-1a08-405d-b573-edecb2ccb25d` — `شالية مراسي فاخر مطل على البحر 8816`
6. `90e4e6f0-0a81-4193-8e0e-cb0ef1bd3951` — `شالية مراسي فاخر مطل على البحر 1238`
7. `4599d933-cb44-47dc-9eb2-81d288524cc9` — `شالية مراسي فاخر مطل على البحر 6002`
8. `4384dfbd-b82e-4875-be21-14ad28a4bfe2` — `شالية مراسي فاخر مطل على البحر 7913`
9. `f9c62cc9-403b-4e47-9d90-4c76e37b0275` — `شالية مراسي فاخر مطل على البحر 1113`
10. `a5b8834b-f70c-4fda-ab4b-cd8a87ea3553` — `ببببببب`
11. `c9aa5184-bc05-426b-ae7d-0757fbaf2ff6` — `اااااا`
12. `c2d91050-f76a-46f0-8a3f-eafafd20e95b` — `عصام`
13. `128f07db-a5b8-4613-bc99-88aa12e1e164` — `احمد زي الحاج احمد`

The read-only dependency audit already found, across these 13 records:
- `0` bookings
- `0` customer favorites
- `0` property availability rows
- `0` property verification documents
- `11` property image rows
- `11` upload intents

These counts reduce cleanup risk but are not by themselves permission to mutate a record.

## Required execution order

### 1. Provenance audit first

For each of the 13 exact property IDs, classify it as one of:

- `CONFIRMED_QA`
- `AMBIGUOUS`
- `PRESERVE`

Use concrete evidence, not title appearance alone. Acceptable evidence includes:
- matching repo QA scripts/tests/fixtures;
- synthetic or known QA owner identities created for automated verification;
- timestamp correlation with known test runs;
- deterministic generated titles/IDs from scripts;
- prior verification reports or execution logs that identify the artifact.

For every classification, record the evidence source.

### 2. Mutation boundary

Automatically mutate **only `CONFIRMED_QA`** records.

- Archive through the standard Owner API only.
- No direct SQL `UPDATE`/`DELETE`.
- No manual database patch.
- No Admin approval/rejection merely to remove queue clutter.
- No storage-object deletion in this gate.
- Do not mutate `AMBIGUOUS` or `PRESERVE` records.
- If a confirmed QA record cannot be archived through its legitimate Owner/API path, stop on that record and report the exact blocker rather than bypassing authorization.
- Never print access tokens, passwords, OTP secrets, service-role keys, or other credentials in logs/reports.

### 3. Post-cleanup verification

After archiving all safely confirmed QA records, verify live:

- Admin pending-review queue contains none of the archived IDs.
- Customer public search contains none of the archived IDs.
- Owner property lists report each archived QA record as `ARCHIVED` where accessible.
- No previously archived Phase 2.3 / Phase 3 closure artifacts are restored or otherwise mutated.
- No production-looking or ambiguous property was changed.

### 4. Visual/live sanity pass

Open/inspect the live surfaces after cleanup:

- Admin property review queue.
- Owner properties surface for the QA Owner where applicable.
- Customer Explore.

The goal is to prove QA residue is not visibly polluting active operational surfaces. This is verification, not a UI redesign task.

## Media closure evidence already passed

The final targeted Phase 3 media verification passed with a valid `800x600`, 36,243-byte JPEG rendered successfully in:

- Admin Review Detail
- Owner Published View
- Customer Explore
- Customer Detail

The disposable media-verification property `758ab048-e91d-4e27-b8f8-8c7185f81ddd` was archived through the standard Owner API after verification.

Do not repeat this media test unless new evidence requires it.

## Explicit non-goals

Do not change:

- application code;
- database schema/migrations/RPCs;
- business rules;
- Owner/Admin/Customer authorization behavior;
- storage architecture;
- Phase 4 UI/UX work.

Do not delete historical archived QA rows or storage objects as part of this gate. Archival and active-surface cleanliness are sufficient.

## Final acceptance

This gate passes only when:

1. all 13 records have evidence-backed provenance classifications;
2. every `CONFIRMED_QA` record that is safely archivable has been archived through standard APIs;
3. no `AMBIGUOUS`/`PRESERVE` record was mutated;
4. Admin pending queue no longer shows confirmed-QA residue;
5. Customer public search contains no active QA residue from this set;
6. final visual/live sanity pass is clean;
7. there are no unexplained active Phase 3 QA properties.

If ambiguous records remain, return them for Founder decision instead of guessing.

## Return format

Return one concise report containing:

- current main SHA;
- a 13-row classification table: property ID, title, classification, evidence;
- IDs actually archived;
- IDs preserved/ambiguous;
- per-ID archive API result for mutated records;
- Admin queue post-cleanup count + remaining IDs;
- Customer public-search result;
- Owner verification where applicable;
- visual sanity result for Admin / Owner / Customer;
- confirmation of zero code/DB-patch/schema/storage-deletion changes;
- final verdict: `PHASE_3_DATA_HYGIENE_PASS` or `PHASE_3_DATA_HYGIENE_NEEDS_FOUNDER_DECISION` or `PHASE_3_DATA_HYGIENE_FAIL`.

# P2.1 — Public API Contract

TASK_ID: P2.1
STAGE: IMPLEMENTATION_COMPLETE_VERIFIED
EXECUTOR: Antigravity
BRANCH: validation/p2-1-rc
BASE_MAIN_SHA: 317b7c3071fdd167b3419e8fd1b7f96d08ba6427
STARTING_CANDIDATE_SHA: c3b6aadaf1c685327106c2b132fbd6d9890f258a
REVIEW_CONTRACT_SHA: 34788d7aeb1b877227b2c5763cdb06bf1b60e91d
TASK_CONTRACT: tasks/P2_1_PUBLIC_API_CONTRACT.md

## Current routing

P1.6 is CLOSED on `main` at `317b7c3071fdd167b3419e8fd1b7f96d08ba6427`.
P2.1 implementation is complete on `validation/p2-1-rc`.

Core outcomes:
- Dedicated public property search and detail routes (`GET /api/v1/customer/properties/search`, `GET /api/v1/customer/properties/:id`).
- Dedicated repository read queries (`propertyDb.searchPublic`, `propertyDb.getPublicById`) enforce `deleted_at IS NULL AND status = 'PUBLISHED' AND verification_status = 'VERIFIED'`.
- Explicit privacy-safe DTO allowlists (`toPublicPropertySearchItem`, `toPublicPropertyDetail`) in `backend/server/src/contracts/publicProperty.ts`.
- Zero leakage of Owner contact/private/admin/internal-finance fields.
- Collision-safe Cloudflare Worker query matching with fail-closed PostgREST payload validations.
- Server-authoritative search integration in Customer App (`buildPublicPropertySearchPath`).
- Availability and quote route invariants preserved with zero PII/finance leakage.

## Hard boundaries preserved

- No migrations/schema/indexes/dependencies added.
- No `/api/v1/public/*` created.
- No media endpoints created.
- No changes to booking, availability, quote, or publication business rules.
- No deployment, merge, or live database mutations performed.

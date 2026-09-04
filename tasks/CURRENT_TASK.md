# P2.3 — Owner API Contract

TASK_ID: P2.3
ROADMAP_PHASE: PHASE_2
STAGE: IMPLEMENTATION_CANDIDATE_COMPLETE
EXECUTOR: Antigravity
BRANCH: implementation/p2-3-owner-api-contract
PR: #14
BASE_MAIN_SHA: baecc9f7f9c16aafa1954ddf7aa6e3cead5c757a
STARTING_CANDIDATE_SHA: b16bf297386775aa42d0e5104ec9745a85e9b303
RECONCILED_MAIN_SHA: 0dcc613755e5cb3db046fdbfd5d4bba374ffa42f
TASK_CONTRACT: tasks/P2_3_OWNER_API_CONTRACT.md

## Current routing

P2.3 implementation candidate is complete on `implementation/p2-3-owner-api-contract`.
Candidate is reconciled with canonical Brain main (`0dcc613755e5cb3db046fdbfd5d4bba374ffa42f`) and is awaiting verification, exact-head review, and Bridge publication gates (not claimed closed/published).

Core outcomes:
- Dedicated Owner profile, property, and booking financial DTO allowlists in `backend/server/src/contracts/ownerCore.ts`.
- Profile queries fail closed on DB errors (500 `OWNER_PROFILE_QUERY_FAILED`) instead of swallowing to 404.
- Property contract preserves `address: ''` as valid product state and handles canonical price fallback (`pricePerNight` / `basePricePerNight`).
- Calendar and manual block endpoints locked with strict foreign owner IDOR rejection (403), active booking conflict rejection (409 `DATE_OVERLAP`), and fail-closed calendar outage handling (500).
- Booking financial summary reads canonical persisted values from `bookingDb.getFinancialSummary` with owner authorization checks, eliminating hardcoded `1500` / `500` financials.
- Booking list items sanitized to protect customer private account data.
- Retired fake payout success (HTTP 501 `PAYOUT_NOT_AVAILABLE_IN_CURRENT_PROTOTYPE`) eliminating fabricated IDs and mock 5000 EGP balance assumptions.
- Fail-closed notification reads (500 `OWNER_NOTIFICATIONS_QUERY_FAILED`) eliminating in-memory fallback.

## Hard boundaries preserved

- Zero product code changes in governance/tooling reconciliation.
- No migrations/schema/indexes/dependencies added.
- No changes to booking, availability, or finance business rules.
- No deployment, main merge, or live database/storage mutations performed.
- Following P2.3 closure, subsequent work executes according to `KONFRM_EXECUTION_DEPENDENCY_ORDER.md` leading directly to Phase 3 (Owner → Admin → Renter Vertical Slice).

# P1.4 — Availability Persistence and Blocking Integrity Candidate

TASK_ID: P1.4-CANDIDATE
STAGE: REVIEW_CANDIDATE
BRANCH: validation/p1-4-refresh
BASE_MAIN_SHA: ee38f2e90ee4d25fc237929f9756a42e89a22b4b
HISTORICAL_CANDIDATE_SHA: 67601a1364192f502186da3bd10e9c2fd5eadb54
LIVE_MUTATION: FORBIDDEN
MIGRATION_025: CANDIDATE_ONLY_NOT_APPLIED
MIGRATION_024: LIVE_VERIFIED (P1.3 closed on main)

## Objective
Refreshed P1.4 candidate based on current `main` (`ee38f2e90ee4d25fc237929f9756a42e89a22b4b`). Carries the availability persistence and blocking integrity implementation and tests from historical candidate `67601a1` with updated operational current-state documentation.

## Preserved Invariants
- Stay length: 2–30 nights.
- `PENDING_OWNER_APPROVAL` does NOT block dates.
- `APPROVED_PENDING_PAYMENT` blocks dates.
- `CONFIRMED` blocks dates.
- Quote is not a hold.
- Booking creation revalidates availability.
- Canonical availability read/DB failure must fail closed; never manufacture empty availability/success.
- No payment before Owner approval.

## Migration 025
File: `backend/database/migrations/025_availability_blocking_integrity.sql`
Status: Repository candidate only. NOT APPLIED LIVE. Requires explicit Founder rollout gate before live application.

## Validation Suite
Run at minimum:
- `npm --prefix backend run check`
- `npm --prefix backend run test:booking-01`
- `npm --prefix backend run test:booking-01-1`
- `npm --prefix backend run test:p1-4-availability`
- `npm --prefix backend run test:p1-4-worker-availability`
- `npm --prefix backend run test:p1-4-migration`
- `npm --prefix backend run test:p13-worker-adapter`
- `git diff --check`

# P1.5 — Booking + Financial Summary Persistence Integrity

TASK_ID: P1.5
STAGE: HEAVY_IMPLEMENTATION
EXECUTOR: ZCode
BRANCH: validation/p1-5-rc
BASE_MAIN_SHA: 477ef6a1b274e98a7b757f0b0b77ea8815cee741
P1_4_STATUS: CLOSED_LIVE_VERIFIED
MIGRATION_025: LIVE_APPLIED_VERIFIED
LIVE_MUTATION: FORBIDDEN_FOR_P1_5

## Current routing

P1.4 is closed and live-verified at `main` `477ef6a1b274e98a7b757f0b0b77ea8815cee741`. Migration 025 is applied live and its booking/manual-availability guards are verified present and enabled.

The active dependency-ordered boundary is now **P1.5 — Booking + Financial Summary Persistence Integrity**.

Read and execute:
`tasks/P1_5_BOOKING_FINANCIAL_PERSISTENCE.md`

## Core problem

Current booking creation persists the booking and `booking_financial_summaries` in separate database operations and compensates a summary failure by trying to delete the new pending booking. P1.5 must replace this with a true single PostgreSQL transaction boundary while preserving availability, lifecycle, financial, and security invariants.

## Hard boundaries

- Do not reopen P1.4.
- Do not apply any P1.5 migration live.
- Do not merge to `main`.
- Do not deploy Cloudflare.
- Do not change financial formulas or cancellation/payment/wallet policy.
- Do not start P1.6 until P1.5 is closed.
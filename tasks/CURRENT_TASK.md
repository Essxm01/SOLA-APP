# P1.6 — Wallet + Immutable Ledger Persistence Integrity

TASK_ID: P1.6
STAGE: HEAVY_IMPLEMENTATION_OR_PRESERVE_VERIFY
EXECUTOR: ZCode
BRANCH: validation/p1-6-rc
BASE_MAIN_SHA: 49fb158282ddc0963a29e2236d280dde82c5f197
P1_5_STATUS: CLOSED_LIVE_VERIFIED
MIGRATION_026: LIVE_APPLIED_VERIFIED
LIVE_MUTATION: FORBIDDEN_FOR_P1_6_CANDIDATE

## Current routing

P1.5 is CLOSED and live-verified at `main` `49fb158282ddc0963a29e2236d280dde82c5f197`.
Migration `026_atomic_booking_request_creation.sql` is applied live. Main CI Run #166 (`33711969665`) succeeded and deployed Worker version `5378c632-715f-45db-bfda-f62973e4c7ee`.

The active dependency-ordered boundary is now **P1.6 — Wallet + Immutable Ledger Persistence Integrity**.

Read and execute:
`tasks/P1_6_WALLET_LEDGER_PERSISTENCE.md`

## Authority note

`docs/CURRENT_STATE.md` inherited from the P1.5 candidate still contains stale wording that says P1.5 is active / Migration 026 is unapplied. That wording is superseded by the exact publication evidence above and must be reconciled in the P1.6 candidate. Do not reopen P1.5.

## Hard boundaries

- Do not reopen P1.1–P1.5.
- Do not apply any new P1.6 migration live.
- Do not merge to `main`.
- Do not deploy Cloudflare.
- Do not mutate live Supabase/Storage.
- Do not change booking, payment, commission, payout, cancellation, or release timing rules.
- Do not implement the Phase 11 payout flow or 24h pending-to-available release in P1.6.
- Do not broaden into Phase 14 RLS/security remediation; report unrelated observations separately.

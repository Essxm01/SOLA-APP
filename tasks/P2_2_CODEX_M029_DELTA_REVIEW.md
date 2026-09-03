# P2.2 Codex Migration 029 Delta Review

## Purpose
Review only the live-discovered ACL hardening delta added after the previously reviewed P2.2 candidate.

## Exact refs
- Base main: `198a00ea39083932012f54144f93fb7516204024`
- Previously Codex-reviewed P2.2 head: `b9ae4fd2d3c4da82609946bd3be1fadc31391fe9`
- New candidate: `510016fb45c393782e5c5fcd73d45050251a7e01`
- PR: `#12`
- Exact-head CI: Run `#179`, ID `33789927165`, SUCCESS; Worker deploy skipped.

## Live state
- Founder approved P2.2 publication and then explicitly approved Migration 029.
- Migration 028 is already applied on Supabase Production.
- Publication is paused before merge/deploy.
- Live verification found Supabase default table privileges gave `service_role` broader table ACL than the approved `SELECT, INSERT, DELETE` contract.
- Migration 029 is not yet applied live.

## Review scope
Review ONLY `b9ae4fd2d3c4da82609946bd3be1fadc31391fe9 -> 510016fb45c393782e5c5fcd73d45050251a7e01`.

Expected changed paths only:
1. `backend/database/migrations/029_customer_favorites_acl_hardening.sql`
2. `backend/server/src/tests/p22RenterApiContract.test.ts`

## Required semantic checks
Confirm Migration 029:
- starts/ends transactionally;
- performs `REVOKE ALL ON TABLE public.customer_favorites FROM service_role`;
- then grants exactly `SELECT, INSERT, DELETE` on that table to `service_role`;
- grants no `UPDATE`, `TRUNCATE`, `REFERENCES`, `TRIGGER`, `MAINTAIN`, or `ALL`;
- records `029_customer_favorites_acl_hardening.sql` in `public.schema_migrations` idempotently;
- changes no RLS, RPC, function ACL, table shape, indexes, FKs, application code, Worker behavior, product rules, or finance/booking logic;
- leaves Migration 028 unchanged.

Confirm tests materially protect the above and do not weaken prior P2.2/P1.5/P2.1 coverage.

## Review rules
- READ ONLY.
- Do not edit, commit, push, merge, deploy, or mutate Supabase.
- Do not re-review the full P2.2 diff unless this delta creates a new interaction requiring it.
- Critical or Important findings block publication.

If there are no Critical or Important blockers, end exactly:
`READY_FOR_M029_LIVE_APPLY`

If blocked, end exactly:
`P2_2_M029_CODEX_DELTA_BLOCKED`

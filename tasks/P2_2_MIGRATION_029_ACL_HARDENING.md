# P2.2 — Migration 029 ACL Hardening

## Status
Founder-approved bounded correction after live verification of Migration 028.

## Repository state to preserve
- Base main: `198a00ea39083932012f54144f93fb7516204024`
- Candidate before this correction: `b9ae4fd2d3c4da82609946bd3be1fadc31391fe9`
- PR: #12, open and unmerged
- Migration 028 is already applied on Production.
- `customer_favorites` currently has 0 rows.
- No merge/deploy has occurred.

## Verified live defect
Supabase default table privileges expanded `service_role` privileges on newly created `public.customer_favorites` beyond the approved contract. Effective live ACL currently includes privileges beyond `SELECT, INSERT, DELETE`.

The approved P2.2 contract requires `service_role` table access to be limited to exactly the application needs: `SELECT, INSERT, DELETE`. Migration 028 itself must not be edited because it is already applied live.

## Required implementation
Create exactly one new migration:

`backend/database/migrations/029_customer_favorites_acl_hardening.sql`

Required semantics:

```sql
BEGIN;

REVOKE ALL ON TABLE public.customer_favorites FROM service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.customer_favorites TO service_role;

INSERT INTO public.schema_migrations (version)
VALUES ('029_customer_favorites_acl_hardening.sql')
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

Equivalent whitespace/formatting is fine. Do not add other DDL/DML.

## Required regression test
Modify only:

`backend/server/src/tests/p22RenterApiContract.test.ts`

Add a static cumulative migration contract test that proves:
- migration 029 exists;
- it executes `REVOKE ALL ON TABLE public.customer_favorites FROM service_role`;
- the revoke appears before the replacement grant;
- the only replacement table grant to `service_role` in migration 029 is `SELECT, INSERT, DELETE`;
- migration 029 does not grant `UPDATE`, `TRUNCATE`, `REFERENCES`, `TRIGGER`, `MAINTAIN`, or `ALL` to `service_role`;
- migration 029 records `029_customer_favorites_acl_hardening.sql` in `public.schema_migrations`;
- migration 028 remains unchanged.

Use strict RED -> GREEN evidence.

## Allowed changed paths
Exactly:
- `backend/database/migrations/029_customer_favorites_acl_hardening.sql`
- `backend/server/src/tests/p22RenterApiContract.test.ts`

Any other changed path is a STOP condition.

## Forbidden
Do not:
- edit Migration 028;
- change application/Worker/Customer code;
- change business rules;
- change RLS, RPC function body, RPC ACL, indexes, FKs, or table shape;
- apply Migration 029 live;
- mutate Supabase/Storage;
- merge PR #12;
- deploy;
- push to main;
- force-push;
- open another PR.

Push only to `validation/p2-2-rc`.

## Required validation
Run fresh:

```text
npm --prefix backend run check
npm --prefix backend run test:p2-2-renter-api
npm --prefix backend run test:p1-5-atomic-booking
npm --prefix backend run test:p2-1-public-api
git diff --check
```

If repository-standard full gates are cheap/available, also run them, but do not modify unrelated files to satisfy them.

## Required report
Return exactly:

```text
RESULT:
START_SHA:
FINAL_SHA:
BASE_SHA:
CHANGED_PATHS:
RED_EVIDENCE:
CORRECTION_DISPOSITION:
- M029_EXISTS:
- M029_REVOKE_BEFORE_GRANT:
- M029_SERVICE_ROLE_EXACT_TABLE_ACL:
- M029_SCHEMA_MIGRATION_RECORDED:
- MIGRATION_028_UNCHANGED:
AUTOMATED_GATES:
LIVE_MUTATIONS: NONE
DEPLOYMENT: NONE
MERGE: NONE
UNRESOLVED:
```

Do not call P2.2 closed, final, publication-ready, or live-verified.
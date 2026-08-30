# P1.2 — Identity / Session Persistence Integrity

**Status:** LOCAL_FIX_READY — corrected staged release candidate pending Founder Round 2 approval.
**Baseline:** `5decd03f59f3bd3039e12e00caf234f28def5201`
**Round-1 rule:** no live user, Owner, session, schema, deployment, or business-data mutation.

## REPOSITORY_OBSERVED

- `users.id` is the canonical human identity; `owners.id` is an optional capability using the same UUID.
- Active Customer and established-Owner prototype login issue refresh tokens through `/api/v1/auth/prototype-login`. Explicit Owner registration is separate and may add the Owner capability. Admin is a separate `admin_users` prototype domain.
- The old refresh path accepted a signed Customer/Owner refresh token when the persistent lookup missed or failed by falling back to memory/claims. Revocation swallowed database failure. The Worker adapter stored canonical session metadata inside `device_info`, not the repository columns.
- Prototype login remains OTP-free. Migration `015` is historical and includes inactive OTP infrastructure; it is not applied or rewritten.

## LIVE_PRE_REMEDIATION_STATE

Read-only Supabase evidence, project `zrbmbjgcsowfqklmxbyn`, 2026-08-30:

- `user_sessions` has only `id`, non-null `owner_id`, `refresh_token_hash`, device/IP metadata, revoke/expiry, and creation time. It lacks `user_id`, `surface`, `role`, and `updated_at`.
- Aggregate-only evidence: 192 rows, 13 active/unrevoked rows, no duplicate refresh-hash groups, and zero Owners without a matching user.
- The owner FK and same-UUID model support an evidence-backed legacy mapping: `user_id = owner_id`, `surface = OWNER`, `role = ROLE_OWNER`. No default may classify these legacy rows as Customer.

## LOCAL_FIX_READY

The first release candidate was intentionally not published: its one-step migration made the old Worker unable to create sessions, while the new Worker could not write the old schema. No live action occurred.

The corrected strategy is staged:

1. [`022_identity_session_persistence_integrity.sql`](../../backend/database/migrations/022_identity_session_persistence_integrity.sql) expands the schema, backfills existing Owner sessions, makes `owner_id` nullable, and uses a narrow `user_sessions` compatibility trigger to translate the old Worker's packed `device_info` session envelope during deployment.
2. Deploy the compatible Worker, which writes canonical columns directly.
3. [`023_finalize_identity_session_persistence.sql`](../../backend/database/migrations/023_finalize_identity_session_persistence.sql) verifies every row, then enforces final nullability/check/unique constraints and removes the temporary trigger.

This keeps Old Worker + expanded schema, New Worker + expanded schema, and New Worker + final schema operational. Historical migration 015 remains untouched and only the applied stage writes its own ledger row.

The backend now:

- stores a SHA-256 digest for every **new** refresh token; it never stores a new raw-token prefix;
- uses an old-format hash only as a temporary lookup compatibility path for safely preserved legacy sessions;
- requires a canonical persistent session on refresh and rejects missing, revoked, expired, subject-mismatched, role-mismatched, invalid, or absent-Owner sessions;
- rejects unsupported Admin refresh rather than creating a common fail-open path;
- surfaces database persistence/revocation failure honestly;
- persists the pure-Customer Owner-onboarding refresh token as `surface=OWNER`, `role=ROLE_CUSTOMER`, `owner_id=NULL` without creating an Owner;
- makes the Worker adapter write/read the actual canonical session fields with strict request matching.

## P14.1 RECONCILIATION

P14.1 is **CLOSED + PUBLISHED + LIVE VERIFIED**: commit `5decd03f59f3bd3039e12e00caf234f28def5201`, GitHub Actions run #131 / `33306475702`, Worker deployment success, and migration 021 applied. The four critical RPCs have `anon=false`, `authenticated=false`, and `service_role=true`; `rls_auto_enable` ordinary-role execution is closed. This resolves DC-13/RB-02's operational state. RLS-no-policy and `btree_gist` observations remain out of scope.

## LIVE_MUTATION_PENDING_FOUNDER_APPROVAL

Do not apply migration 022/023 or publish this corrected local release candidate until the Founder authorizes Round 2. The live `user_sessions` schema remains unchanged. No existing session was deleted, revoked, or inspected as a token/hash/PII record.

## DEFERRED_SECURITY_HARDENING

The old refresh-hash format is retained solely for live-session transition lookup. P1.2 does not rotate secrets or force-invalidate the 13 active legacy sessions. Final token/key-rotation policy and retirement of the legacy lookup belong to P14.3 after the preserved sessions expire or a Founder-approved invalidation plan exists.

## Validation evidence

- `p12IdentitySessionPersistence.test.ts`: Customer/Owner persistence, memory-independent refresh, missing/revoked/session subject-role rejection, pure-Customer Owner onboarding, and raw-prefix absence.
- `p12SessionWorkerMigrationContract.test.ts`: migration backfill/no-OTP contract and strict Worker session insert/revoke mapping.
- Backend Node 22 typecheck passed after both focused suites.

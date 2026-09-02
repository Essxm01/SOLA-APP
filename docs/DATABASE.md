# Database and persistence model

## Authority and verified baseline

Supabase PostgreSQL is KONFRM's canonical persistence store. The live baseline was read-only inventoried on 2026-08-30 against project `zrbmbjgcsowfqklmxbyn` (PostgreSQL 17); detailed evidence is in [P1.1 schema/RLS report](./codex/P1_1_SCHEMA_RLS_BASELINE_REPORT.md). Application memory, mocks, and API fallbacks must never manufacture production success.

The retained repository migration history begins at `backend/database/migrations/008_*.sql`. Migrations `021_harden_critical_rpc_privileges.sql`, `022_identity_session_persistence_integrity.sql`, and `023_finalize_identity_session_persistence.sql` are part of the P14.1/P1.2 published and live-verified baseline (`5decd03f…` / `92dc3916…`). Migration `024_atomic_property_media_commit.sql` is present in the P1.3 code merged at `fb38414…`; this repository fact does not establish whether it was applied live. Verify the application ledger through a separately authorized read-only check before relying on its RPC/index. This is **not** a complete historical baseline: `000_schema_baseline` exists only in the live application ledger, and several retained effects exist without a corresponding application-ledger record. Do not infer missing history, RLS policies, or intended grants from filenames alone.

## Canonical domains

| Domain | Canonical live entities | Important model rule |
| --- | --- | --- |
| Identity | `users`, `owners`, `user_sessions`, `otp_challenges`, `admin_users`, `audit_logs` | `owners.id` is a restrictive FK to `users.id`: an Owner is an optional same-UUID capability, not a second human identity. |
| Supply/media | `properties`, `property_availability`, `property_images`, `upload_intents`, `property_verification_documents` | Property image/object and upload-intent identifiers are unique; public property media remains separate from identity evidence. P1.3 merged atomic image/intent RPC migration `024`; live application remains unverified and requires a separate read-only preflight/ledger check plus approved rollout before reliance. |
| Booking/chat | `bookings`, financial summaries/snapshots, conversations/messages | The live exclusion constraint blocks overlapping `APPROVED_PENDING_PAYMENT` or `CONFIRMED` stays only. |
| Money | payment transactions, owner wallets/ledger, payout methods/requests | Payment, upload, payout, and ledger identifiers carry uniqueness/idempotency protections. |
| KYC/operations | owner verification documents, notifications, disputes/evidence/holds, refund saga/attempts | KYC supports front, back, and live-face types; dispute evidence has an append-only trigger. |

## Verified persistence constraints

- `users.phone_number` and `owners.phone_number` are unique; the Owner extension is linked to the human UUID.
- Bookings enforce check-out after check-in, positive nights/guests, unique booking number, and the active-stay exclusion described above.
- A financial summary is one-to-one with its booking; monetary amounts have non-negative checks.
- Payment transaction, upload intent, payout request, refund saga/attempt, and wallet-ledger idempotency keys have unique constraints.
- `owner_wallets` is keyed by `owner_id`; it holds non-negative available, pending, held, and reserved balances. Wallet/ledger reads must not be reconstructed from property price.
- Owner KYC evidence uses a private bucket and metadata rows; do not place sensitive images in `property-media` or persist public KYC URLs.

## Access architecture and current security finding

The apps call `/api/v1`; repository search found no frontend direct Supabase client. The backend/Worker uses `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` through `dbClient.ts`'s narrow REST/RPC adapter. All inventoried public application tables have RLS enabled, are not FORCE RLS, have no policy, and currently have broad table privileges. With RLS and no policies, ordinary `anon`/`authenticated` direct table access is denied; service-role access bypasses RLS for the backend path.

P14.1 closed the critical RPC grant mismatch live on 2026-08-30: migration `021_harden_critical_rpc_privileges.sql` grants the four application `SECURITY DEFINER` RPCs only to `service_role`, closes direct ordinary-role `rls_auto_enable` execution, and pins the dispute-evidence trigger function's `search_path`. Read [P14.1 report](./codex/P14_1_AUTHORIZATION_REMEDIATION_REPORT.md) for exact evidence. The broader RLS-no-policy model remains an open architecture/security concern.

## Storage baseline

| Bucket | Visibility | Observed limits | Intended use |
| --- | --- | --- | --- |
| `property-media` | Public | 10 MiB; JPEG/PNG/WEBP/PDF | Property media only |
| `owner-verification` | Private | No bucket-level MIME/size limit observed | Owner identity evidence only |

No `public` or `storage` policies were observed in the P1.1 metadata snapshot. Object-level access is therefore an explicit P14.2 verification/remediation concern; P1.1 did not inspect objects or mutate Storage.

## Migration protocol

- Use the next unique numeric prefix, narrow/idempotent SQL where safe, and never rewrite historical migration files.
- Inspect the live application ledger and observed effect before applying a migration; do not insert missing ledger records merely to make history look complete.
- The Supabase platform migration list and application-owned `public.schema_migrations` are separate ledgers.
- When a repository query is used in the Worker, validate the strict REST/RPC adapter rather than assuming arbitrary PostgreSQL compatibility.

For behavior invariants, read [BUSINESS_RULES.md](./BUSINESS_RULES.md). For live object-level access/RLS or grant work, start with the P1.1 report and P14.1—do not treat this summary as an authorization to alter production.

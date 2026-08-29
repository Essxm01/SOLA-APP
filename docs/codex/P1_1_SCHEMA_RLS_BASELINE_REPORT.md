# P1.1 — live schema / RLS baseline report

**Evidence date:** 2026-08-30
**Mode:** read-only metadata inventory
**Project:** `zrbmbjgcsowfqklmxbyn` / `SOLA-APP`
**Privacy:** no business rows, private objects, document URLs/keys, personal data, secrets, or mutating RPCs were accessed.

## Scope and evidence classes

- **REPOSITORY_OBSERVED:** retained SQL, Worker/repository code, and static client search.
- **LIVE_DB_OBSERVED:** `pg_catalog`, `information_schema`, `pg_policies`, `storage.buckets`, and the application ledger queried with `SELECT` only.
- **CONNECTED_EXTERNAL_EVIDENCE:** Supabase project/migration/advisor metadata.
- **INFERRED:** explicitly labeled architecture conclusions from the preceding evidence.
- **UNKNOWN:** not asserted without evidence.

## REPOSITORY_OBSERVED

The retained migration set is `008` through `020`. The repository has an application-owned `public.schema_migrations` convention only in migration 020; there is no retained runner that proves every historic migration was recorded. The Supabase platform migration ledger is a separate mechanism.

`dbClient.ts` first uses `SUPABASE_SECRET_KEY`/`SUPABASE_SERVICE_ROLE_KEY` and has exact Worker REST/RPC matchers for payment finalization and Owner registration/KYC. `dbRepository.ts` invokes those RPCs through that server boundary. Static search found no `createClient` or Supabase environment use in `customer-app/`, `owner-app/`, or `admin-app/`; the applications call `/api/v1`.

Migrations 019 and 020 declare SECURITY DEFINER functions with `search_path = public`, then revoke `PUBLIC` and grant `service_role` only. The repository therefore intends a server/service-role boundary for those mutations.

## LIVE_DB_OBSERVED

The project is `ACTIVE_HEALTHY`, uses PostgreSQL 17, and has 28 application tables under `public`: identity (`users`, `owners`, `user_sessions`, `admin_users`, `audit_logs`), property/media (`properties`, `property_availability`, `property_images`, `property_verification_documents`, `upload_intents`), booking/chat (`bookings`, financial summaries/snapshots, conversations/messages), money (`payment_transactions`, `owner_wallets`, `wallet_ledger_entries`, payout methods/requests), KYC/operations (`owner_verification_documents`, `notifications`, disputes/evidence/holds, refund saga/attempts), plus `schema_migrations`.

`otp_challenges` is not present in the live table inventory. Every listed live application table has RLS enabled, is not FORCE RLS, and has no `public` policy. No `storage` policy was observed either.

### Entity / column baseline

All listed entities have UUID primary keys except summary/snapshot tables keyed by `booking_id`, `owner_wallets` keyed by `owner_id`, and the string-keyed `schema_migrations`. Common timestamps/default UUIDs are server-generated. Important nullable/default behavior:

- `users`: canonical phone is non-null/unique; profile fields may be nullable; soft-delete timestamp exists.
- `owners`: same UUID as `users`, unique phone, verification status default `UNVERIFIED`, and nullable `owner_onboarding_completed_at`.
- `user_sessions`: observed live shape is legacy owner-scoped (`owner_id`, refresh hash, revoke/expiry/timestamps); the retained 015 `user_id`, `surface`, `role`, and `updated_at` effects are not present.
- `properties`: base fields required; wizard fields (`description`, region/resort, area/beds, amenities/rules) are nullable/default JSON; status is constrained to DRAFT/PENDING_REVIEW/PUBLISHED/PAUSED/ARCHIVED.
- `bookings`: owner/property/date/guest core fields are non-null; `customer_id` is nullable; status includes pending-owner-approval through completion/cancellation states.
- `booking_financial_summaries`: non-null canonical money fields and booking PK; remaining commission defaults to zero.
- `payment_transactions`: non-null booking/owner, amount, currency/method/status, merchant order, and idempotency fields; provider payload fields are nullable.
- `owner_verification_documents`: legacy URL is nullable; private storage metadata (`storage_key`, MIME, size, submission) exists; type constraint includes NATIONAL_ID_FRONT/BACK/LIVE_FACE.
- `property_images` and `upload_intents`: non-null owner/property/object metadata; size checks cap rows at 10 MiB; upload intent status/idempotency fields exist.

### Relationships and constraints

- `owners.id → users.id` is `RESTRICT`, preserving one human / optional Owner capability.
- Properties, bookings, images, upload intents, wallet/ledger, KYC, payment, chat, payout, dispute, and refund references were inventoried as explicit FKs.
- Booking has `check_out > check_in`, positive nights/guests, unique booking number, and `no_overlapping_active_bookings`: a GIST exclusion limited to `APPROVED_PENDING_PAYMENT` and `CONFIRMED`.
- `booking_financial_summaries.booking_id`, `booking_snapshots.booking_id`, and `booking_conversations.booking_id` are one-to-one unique/PK relations.
- Unique/idempotency coverage was observed for payment transaction, ledger, payout request, upload intent, refund saga/attempt, property object key, and booking conversation identifiers.
- Money balance, financial-summary, payout/refund, property, and status checks are present. Enforcement can also reside in server/RPC code; P1.1 does not imply every rule is database-only.

### Indexes / triggers

Meaningful indexes include owner/status lookups, customer booking lookup, booking conversation/message chronology, property availability `(property_id,date)`, active image ordering, upload expiry, payment lookup, KYC submission, and owner-ledger chronology. The observed `trg_prevent_evidence_mutation` blocks UPDATE/DELETE on `dispute_evidence`.

### Function and role-access matrix

| Function | SECURITY DEFINER | search_path | anon/authenticated execute | service_role execute | Classification |
| --- | --- | --- | --- | --- | --- |
| `konfrm_complete_deposit_payment(uuid,uuid,uuid)` | Yes | `public` | Yes / Yes | Yes | `SECURITY_CONFIGURATION_GAP` |
| `konfrm_register_owner(text,text)` | Yes | `public` | Yes / Yes | Yes | `SECURITY_CONFIGURATION_GAP` |
| `konfrm_submit_owner_kyc(uuid,jsonb)` | Yes | `public` | Yes / Yes | Yes | `SECURITY_CONFIGURATION_GAP` |
| `konfrm_review_owner_kyc(uuid,text,text)` | Yes | `public` | Yes / Yes | Yes | `SECURITY_CONFIGURATION_GAP` |
| `rls_auto_enable()` | Yes | `pg_catalog` | Yes / Yes | Yes | `SECURITY_CONFIGURATION_GAP` |
| `prevent_dispute_evidence_mutation()` | No | unset | Yes / Yes | Yes | `SECURITY_CONFIGURATION_GAP` (mutable path advisor warning) |

All app tables currently report broad `anon`, `authenticated`, and `service_role` table privileges. RLS with no policy denies ordinary role row access, while service role bypasses RLS. This makes the table policy state an **EXPECTED_ARCHITECTURE only for the proven server-only path**, not a general authorization proof. The public SECURITY DEFINER grants bypass that protection and are confirmed exposure, not merely an advisor hypothesis.

### Storage baseline

| Bucket | Public | limit / MIME metadata | Policy rows |
| --- | --- | --- | --- |
| `property-media` | Yes | 10 MiB; JPEG/PNG/WEBP/PDF | none observed |
| `owner-verification` | No | no bucket-level limit/MIME metadata | none observed |

Private KYC object contents and keys were not listed, downloaded, or tested.

## CONNECTED_EXTERNAL_EVIDENCE

Supabase managed migration metadata contains only platform entries for payment finalization and migration 020. The live application ledger contains `000_schema_baseline`, 008–012, 016, 019, and 020. Security Advisor independently reports all public application tables as RLS-enabled/no-policy, the mutable dispute-trigger search path, `btree_gist` in `public`, and public/signed-in execution of the five SECURITY DEFINER functions above.

## Migration reconciliation

| Repository migration | Ledger | Observed effect | Classification |
| --- | --- | --- | --- |
| `008_flow_adm_08_payout_execution.sql` | Present | payout status/formula fields and constraints present | `EXPECTED_ARCHITECTURE` |
| `009_flow_adm_09_disputes_execution.sql` | Present | refund/dispute tables, checks, append-only trigger present | `EXPECTED_ARCHITECTURE` |
| `010_flow_owner_identity_verification.sql` | Present | verification-document table/index present; later 020 extends it | `EXPECTED_ARCHITECTURE` |
| `011_property_images.sql` | Present | property-image model/keys/indexes present | `EXPECTED_ARCHITECTURE` |
| `012_property_images_remediation.sql` | Present | upload intent and image lifecycle fields/indexes present | `EXPECTED_ARCHITECTURE` |
| `013_add_payment_transactions_table.sql` | Missing | payment table/status/uniqueness/index effects present | `EFFECT_PRESENT_LEDGER_MISSING` |
| `014_unified_identity_users_schema.sql` | Missing | users/owners same-UUID FK and bookings customer reference present | `EFFECT_PRESENT_LEDGER_MISSING` |
| `015_auth_02b2_sessions_and_otp.sql` | Missing | OTP table absent; observed session shape lacks `user_id`, surface, role, updated timestamp | `REPOSITORY_AHEAD_OF_LIVE` |
| `016_additive_property_wizard_fields.sql` | Present | additive property fields present | `EXPECTED_ARCHITECTURE` |
| `017_booking_01_request_lifecycle.sql` | Missing | active-stay exclusion with the intended two statuses present | `EFFECT_PRESENT_LEDGER_MISSING` |
| `018_booking_01_1_booking_conversations.sql` | Missing | conversation/message tables and indexes present | `EFFECT_PRESENT_LEDGER_MISSING` |
| `019_konfrm_complete_deposit_payment.sql` | Present | function/effect present, but live execute grants contradict SQL intent | `SECURITY_CONFIGURATION_GAP` |
| `020_owner_registration_kyc.sql` | Present | onboarding/document fields, types, private bucket and functions present; live grants contradict SQL intent | `SECURITY_CONFIGURATION_GAP` |
| `000_schema_baseline` | Present only live | source is not retained | `HISTORICAL_BASELINE_GAP` |

## INFERRED architecture conclusion

The current application path is **client → `/api/v1` → backend authorization → service-role Supabase access**. The RLS/no-policy configuration is consistent with this model for direct table reads, but no policy or object-level guarantee was inferred beyond the metadata. Because critical mutating functions remain in exposed `public` and executable by anonymous/signed-in Supabase roles, that server boundary is not sufficient in the current live configuration.

## UNKNOWN / intentionally not asserted

- Original baseline migration contents, application-ledger writer, and why 013–018 were not ledgered.
- Whether legacy session shape is a deliberate baseline inclusion or incomplete migration 015 deployment.
- Object-level Storage authorization behavior without a safe, credentialed, non-mutating authorization test.
- Whether any external consumer uses the exposed public functions; no mutating probe was run.

## Findings and routing

1. **Critical/high: exposed SECURITY DEFINER RPCs.** Evidence: live grants to anon/authenticated contradict 019/020. Route to existing **P14.1 before P1.2**; no live remediation in P1.1.
2. **High: broad table grants plus RLS/no policies.** Direct table rows remain denied by RLS, but this is a fragile service-role-only model. Route to P14.1; inventory storage/object controls in P14.2.
3. **Medium: migration ledger/effect drift.** 013/014/017/018 effects exist without application-ledger rows; 015 is repository-ahead of the observed session/OTP schema. Route to P14.1/P1.2 only after Founder reviews whether security remediation should precede identity persistence work.
4. **Medium: mutable `prevent_dispute_evidence_mutation` search path and `btree_gist` in public.** Advisor findings are recorded; route to P14.1.

## Three-pass closure

- **A — functional/data:** table, constraint, index, trigger, migration, Worker adapter, and bucket metadata reconciled.
- **B — product/data alignment:** same-UUID identity, active booking blocking, canonical financial summary, wallet/ledger, KYC privacy, and property media boundaries were compared to current rules; no product rule was changed.
- **C — adversarial/security:** RLS, grants, public functions, search paths, Storage policy absence, and migration drift were checked without invoking any mutator.

No live database/schema/RLS/grant/storage mutation occurred.

## 48-item acceptance matrix

| Items | Result | Evidence |
| --- | --- | --- |
| 01–05 | PASS | Approved Git baseline, mandatory authorities, project identity, active health, and PostgreSQL 17 metadata recorded. |
| 06–10 | PASS | Retained 008–020 files, application-ledger semantics, live ledger, every reconciliation row, and baseline uncertainty recorded. |
| 11–16 | PASS | Application-table, column/default/nullability, PK/FK, unique/idempotency, and check inventories completed from catalog metadata. |
| 17–20 | PASS | Active-booking exclusion, meaningful indexes, business trigger, and application-function inventory observed. |
| 21–25 | PASS | SECURITY DEFINER flags, function search paths, execute privileges, critical anon/authenticated grants, and retained grant intent reconciled. |
| 26–31 | PASS | RLS/FORCE state, zero policy rows, broad table grants, no direct frontend client, and backend service-role path classified. |
| 32–36 | PASS | Both bucket metadata and zero storage-policy rows observed; private KYC/public property-media separation documented; no objects accessed. |
| 37–39 | PASS | SELECT-only evidence, no schema/grant/storage mutation, and all Advisor findings classified. |
| 40–43 | PASS | Database/architecture docs, reality/matrix/backlog/map, this report, and historical-ledger uncertainty updated. |
| 44–46 | PASS | Functional/data, product alignment, adversarial/security, and mandatory context closure passes completed. |
| 47–48 | PASS | No unresolved **inventory** defect remains. The evidence-based recommendation is existing P14.1 before P1.2, subject to Founder approval. |

## Read-only checks executed

- Supabase project, managed-migration, table, and security-advisor metadata.
- `SELECT` catalog queries for public tables/RLS/FORCE, columns, constraints, indexes, triggers, function configuration/privileges, policy rows, table privileges, bucket metadata, and application migration ledger.
- Repository migration, repository/Worker/storage code, and frontend direct-Supabase static search.

No known unresolved in-scope P1.1 inventory defect remains.

# Database and persistence model

## Authority and change protocol

Supabase PostgreSQL is the canonical source of truth. Frontend memory, mock repositories, and API fallbacks must never manufacture production business success. Read the affected repository code and migrations before any persistence change.

Migration history retained in this repository begins at `backend/database/migrations/008_*.sql` and runs through `019_konfrm_complete_deposit_payment.sql`. Earlier baseline table creation is not fully represented here; for pre-existing core-table details, inspect `dbRepository.ts` and, when authorized, the live schema. Do not infer missing constraints from names alone.

## Major canonical entities

| Domain | Confirmed tables/entities | Notes |
| --- | --- | --- |
| Identity | `users`, `owners`, `user_sessions`, `otp_challenges` | `owners` is an optional extension of the same human UUID, not a replacement identity. |
| Properties | `properties`, `property_images`, `upload_intents`, `owner_verification_documents` | Properties are owner-scoped; media persistence is canonical. |
| Booking | `bookings`, `booking_financial_summaries` | Financial summary is created for a booking and is authoritative for payment completion. |
| Conversation | `booking_conversations`, `booking_messages` | Conversation access is scoped to its booking Customer/Owner. |
| Payment/wallet | `payment_transactions`, `owner_wallets`, `wallet_ledger_entries` | Wallet/ledger reads must use their own canonical records, not property-price reconstruction. |
| Operations | `payout_requests`, `owner_payout_methods`, `disputes`, `notifications` | Operational detail is implemented in repositories/migrations; inspect it before changing workflow rules. |

## Ownership and authorization

- Protected Owner reads/writes scope to the verified `ROLE_OWNER` token subject.
- Protected Customer reads/writes scope to the verified `ROLE_CUSTOMER` token subject.
- Admin route authorization is token/session validated before operational data is shown.
- Never accept `ownerId`, `customerId`, money, or status from the client as authoritative input when canonical data can derive it.

## Important persistence constraints

- Property list queries exclude `deleted_at` rows where the repository contract requires it.
- The booking overlap exclusion constraint reserves dates only for `APPROVED_PENDING_PAYMENT` and `CONFIRMED`; pending owner review is intentionally non-blocking.
- Payment finalization uses the narrowly scoped PostgreSQL RPC `public.konfrm_complete_deposit_payment(...)`, introduced in migration `019`. It locks/validates canonical records, makes the payment and booking transition, credits pending owner balance, and inserts its ledger entry atomically/idempotently.
- Migration `019` is a security-definer function exposed only to `service_role`; do not broaden that grant without an explicit security decision.

## Migration convention

- Use the next unique numeric prefix and descriptive snake-case filename.
- Make migrations idempotent where safe and keep them narrow.
- Do not alter old migration history or create duplicate versions.
- Validate the Worker REST/RPC path as well as local TypeScript behavior when the changed repository SQL is used in the Worker.

## Security/RLS uncertainty

Repository migrations establish some database constraints and function permissions, but this repository does not contain a complete, authoritative RLS-policy inventory for every pre-existing table. Before RLS or access-policy work, inspect the live Supabase schema/policies with appropriate authorization rather than assuming their state.

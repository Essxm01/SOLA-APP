# Current Task

**Status:** In progress — OWNER-REGISTRATION-KYC-01

## Objective

Implement real explicit Owner account creation and a private three-document KYC vertical slice without altering existing booking, payment, wallet, or Owner identity rules.

## Context

The explicit registration route may create the optional `owners` extension with the same UUID as `users`; Owner login itself must never create it. New KYC is private and requires ID front, ID back, and fresh face capture. Existing Owners must not be forced through the new KYC journey.

## Requirements

- Keep Owner app state behind canonical validated Owner authentication.
- Use Supabase PostgreSQL/Storage as canonical state; do not create production test identities/documents.
- Preserve the public property-media architecture and all financial/booking behavior.

## Relevant Areas

- `owner-app/src/components/auth/`, `owner-app/src/context/AuthContext.tsx`, `owner-app/src/App.tsx`
- `backend/server/src/app.ts`, `services/authService.ts`, `services/dbRepository.ts`, `services/dbClient.ts`, `services/storageProvider.ts`
- `backend/database/migrations/020_owner_registration_kyc.sql`
- `admin-app/src/components/VerificationsQueue.tsx`

## Constraints

Follow `../AGENTS.md`, [DATABASE.md](../docs/DATABASE.md), [BUSINESS_RULES.md](../docs/BUSINESS_RULES.md), and [INTEGRATIONS.md](../docs/INTEGRATIONS.md). Preserve unrelated work and do not infer product decisions.

## Acceptance Criteria

- Registration is real and idempotent; existing Customer identity is reused.
- Login remains non-creating for Customer-only users.
- KYC package requires three valid private objects before pending review.
- Admin approval/rejection is canonical and checks package completeness.
- Existing Owner data and first-run behavior remain intact; Splash is approximately two seconds only on first-ever device use.

## Validation

Run focused backend/Owner/Admin checks and type checks, verify the migration/bucket/functions live, deploy Worker/Owner/Admin, and perform read-only live regression checks. No synthetic live identity/KYC documents.

## Documentation Impact

Update database/current-state documentation, then mark complete and replace it when the next active task begins.

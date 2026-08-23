# Current project state

**Last updated:** 2026-08-23
**Runtime-state commit reviewed:** `05e1fdbea5cbc3f6368fb587c0c428293e3c2f86` (`feat(owner): add approved first-run entry`)

## Current status

The repository contains working vertical slices for property operations, booking request/owner approval, booking-context messaging, prototype deposit confirmation, owner wallet/ledger reads, and role-specific truthfulness/auth-state hardening. Current behavior is defined by code and migrations; this is a concise handoff, not live-production proof.

## Implemented areas

- **Properties (M03):** owner draft/create, canonical image upload/media records, submission, and Admin property-review queue; owner reads use strict owner-scoped routing.
- **Bookings:** Customer request lifecycle, Owner approve/reject, availability protection, and booking-context conversation/message persistence.
- **Payments:** prototype deposit initiation/completion with canonical financial summaries and migration `019` atomic finalization RPC; no real-money Paymob flow.
- **Wallet:** Owner wallet/ledger reads use `owner_wallets` and `wallet_ledger_entries`, not property-price reconstruction.
- **Identity:** Owner app authenticates against canonical Owner capability, scopes `AppProvider` to canonical Owner identity, and clears local state before best-effort revoke.
- **Truthful states:** Admin validates sessions before shell render; Admin overview/notifications and Customer property/payment-history fetches distinguish loading, success/empty, and error.
- **Owner entry:** first-ever device flow is a short KONFRM splash then one-time Owner onboarding; it is independent of authentication and does not change Owner capability rules.
- **Governance:** `DESIGN_SYSTEM/` is independent KONFRM visual/product-experience authority (v2.1.2).

## Active architecture

- React/Vite apps call the TypeScript backend at `/api/v1`.
- Backend routes run through Node or Cloudflare Worker adapters, repositories, and a narrow Supabase REST/RPC compatibility layer.
- Supabase PostgreSQL and Storage are canonical. Payment prototype mode is explicit.

Read [ARCHITECTURE.md](./ARCHITECTURE.md), [DATABASE.md](./DATABASE.md), and [BUSINESS_RULES.md](./BUSINESS_RULES.md) only when the task touches those domains.

## Verified technical debt / known limits

- `dbClient.ts` remains a strict SQL-to-Supabase REST/RPC compatibility layer, not a general Worker transaction/query solution. Matcher collisions are a known risk.
- The repository’s retained migration history starts at 008; earlier core schema/RLS history is incomplete here.
- Real Owner account creation/KYC onboarding is not implemented; current Owner first-run leads to canonical Login only.
- Payment is intentionally `PROTOTYPE`; real Paymob credentials/networking are not implemented.
- Customer Favorites is an approved capability but persistent canonical storage is not implemented.
- Design-system legacy drift remains inventoried under `DESIGN_SYSTEM/`; the anti-drift baseline prevents new violations but does not migrate old screens.
- Cloudflare Pages project linkage/revision state is external to repository configuration and requires live verification after frontend deployment work.

## Open product/implementation decisions

- Complete cancellation/refund and remaining-balance payment policy should be confirmed before a task changes those paths.
- Any migration away from the Worker database compatibility adapter requires an explicit architecture decision.
- Approved experience recommendations not marked `APPROVED_EXISTING` in `DESIGN_SYSTEM/EXPERIENCE/DECISIONS.json` still need Founder/Product approval before implementation.

## Next likely areas (not active work)

- Dedicated Owner account-creation/KYC flow
- Canonical persistent Customer Favorites
- Controlled migrations based on the Product Experience backlog (starting with approved, high-impact slices)

Do not start any item above unless it is placed in [`../tasks/CURRENT_TASK.md`](../tasks/CURRENT_TASK.md) with a concrete contract.

# Current project state

**Last updated:** 2026-09-04
**Product code baseline before BS-02:** `origin/main` at `baecc9f7f9c16aafa1954ddf7aa6e3cead5c757a` (incorporates published P1.6, P2.1, and P2.2 work).
**Brain Sync governance:** Canonical on `main` (`0dcc613755e5cb3db046fdbfd5d4bba374ffa42f`) via PR #15; documentation and governance only, no product code changes.
**Active branch candidate:** P2.3 (Owner API Contract) candidate complete on `implementation/p2-3-owner-api-contract` (PR #14), reconciled with canonical Brain main, awaiting closure verification.

## Current status

The repository contains code and migration evidence for property operations, booking request/owner approval, booking-context messaging, prototype deposit confirmation, owner wallet/ledger reads, identity/KYC, and role-specific truthfulness hardening. This is a concise handoff, not proof that every historical delivery or external deployment is currently verified. Read `codex/KONFRM_CURRENT_REALITY.md` before selecting new work.

## Implemented areas

- **Properties (M03/P1.3):** owner draft/create, canonical image upload/media records, submission, and Admin property-review queue; P1.3 property/media persistence is closed and live-verified (migration 024 applied live). Owner reads use strict owner-scoped routing; cross-app and live-storage acceptance remain separate evidence gates.
- **Bookings:** Customer request lifecycle, Owner approve/reject, availability protection, and booking-context conversation/message persistence.
- **Payments:** prototype deposit initiation/completion with canonical financial summaries and migration `019` atomic finalization RPC; no real-money Paymob flow.
- **Wallet:** Owner wallet/ledger reads use `owner_wallets` and `wallet_ledger_entries`, not property-price reconstruction.
- **Identity/access:** P0.2 is published at `6d37b4589fca47fe56b294c4c12292b44a2db138`; P1.2 subsequently closed the canonical session-persistence migration/live verification at `92dc3916…`. See [`codex/P1_2_IDENTITY_SESSION_PERSISTENCE_REPORT.md`](./codex/P1_2_IDENTITY_SESSION_PERSISTENCE_REPORT.md).
- **Truthful states:** Admin validates sessions before shell render; Admin overview/notifications and Customer property/payment-history fetches distinguish loading, success/empty, and error.
- **Owner entry:** first-ever device flow is a short KONFRM splash then one-time Owner onboarding; it is independent of authentication and does not change Owner capability rules.
- **Owner Home:** action-first Home uses canonical pending booking requests, future confirmed bookings, property status context, and direct available/pending wallet values; it does not use dashboard financial aliases as wallet truth.
- **Owner registration/KYC:** explicit Owner registration is separate from login and preserves a Customer’s UUID when adding the Owner extension. New Owners submit National ID front, National ID back, and a fresh face image to the private `owner-verification` bucket; the package becomes pending Admin review only after all three files validate. Existing Owners are backfilled as onboarding-complete.
- **Governance:** `DESIGN_SYSTEM/` is independent KONFRM visual/product-experience authority (v2.1.2). The `docs/codex/` layer records phase authority, conflicts, evidence classification, quality gates, and sequencing without replacing source specifications.
- **Customer Favorites:** repository-implemented with migration `028_customer_favorites.sql`, migration `029_customer_favorites_acl_hardening.sql`, backend customer endpoints, and Customer client integration. Live Supabase migration application remains pending verified live proof.

## Active architecture

- React/Vite apps call the TypeScript backend at `/api/v1`.
- Backend routes run through Node or Cloudflare Worker adapters, repositories, and a narrow Supabase REST/RPC compatibility layer.
- Supabase PostgreSQL and Storage are canonical. Payment prototype mode is explicit.

Read [ARCHITECTURE.md](./ARCHITECTURE.md), [DATABASE.md](./DATABASE.md), and [BUSINESS_RULES.md](./BUSINESS_RULES.md) only when the task touches those domains per [CONTEXT_ROUTER.md](./CONTEXT_ROUTER.md).

## Verified technical debt / known limits

- `dbClient.ts` remains a strict SQL-to-Supabase REST/RPC compatibility layer, not a general Worker transaction/query solution. Matcher collisions are a known risk.
- P1.1 reconciled retained migrations with live metadata. The live application ledger omits 013/014/017/018 despite their observed effects; 015 is repository-ahead of the observed session/OTP shape; the `000_schema_baseline` source remains unavailable. See [`codex/P1_1_SCHEMA_RLS_BASELINE_REPORT.md`](./codex/P1_1_SCHEMA_RLS_BASELINE_REPORT.md).
- Live public tables have RLS enabled and no policies, with the backend using service-role access. P14.1 is closed: migration `021_harden_critical_rpc_privileges.sql` was applied read-only-verified; the four critical payment/KYC/registration RPCs are no longer executable by `anon` or `authenticated` and remain executable by `service_role`. The no-policy and `btree_gist` findings remain separate.
- Payment is intentionally `PROTOTYPE`; real Paymob credentials/networking are not implemented.
- Design-system legacy drift remains inventoried under `DESIGN_SYSTEM/`; the anti-drift baseline prevents new violations but does not migrate old screens.
- Cloudflare Pages project linkage/revision state is external to repository configuration and requires live verification after frontend deployment work.
- Local baseline runtime: Customer, Owner, and Admin retain Node 20 declarations; the backend now declares Node 22 to match CI and the installed Supabase runtime's native-WebSocket requirement. The Codex restricted filesystem context can fail while resolving the Windows user profile, but portable Node 20/22 and host Node 25 work in an authorized local process context. The user-prefix PowerShell `npm` remains inaccessible; use bundled `npm.cmd` or a process-scoped official runtime rather than treating that shell shim as the project authority.

## Open product/implementation decisions

- Complete cancellation/refund and remaining-balance payment policy should be confirmed before a task changes those paths.
- Any migration away from the Worker database compatibility adapter requires an explicit architecture decision.
- Approved experience recommendations not marked `APPROVED_EXISTING` in `DESIGN_SYSTEM/EXPERIENCE/DECISIONS.json` still need Founder/Product approval before implementation.

## Next work

1. P2.3 (Owner API Contract) candidate work is implemented on `implementation/p2-3-owner-api-contract`. Core Owner contracts enforce server-authoritative truth for Profile, Properties, Calendar availability, Booking decisions, canonical financial summaries (`bookingDb.getFinancialSummary`), and immutable wallet/ledger reads. Fake payout creation has been retired to 501, and mock/fallback behaviors are removed in favor of fail-closed DB error handling. Candidate branch is reconciled with canonical Brain main and prepared for verification and Bridge review gates.
2. Following P2.3 closure, subsequent work executes according to [KONFRM_EXECUTION_DEPENDENCY_ORDER.md](../KONFRM_EXECUTION_DEPENDENCY_ORDER.md) leading directly to Phase 3 (Owner → Admin → Renter Vertical Slice).

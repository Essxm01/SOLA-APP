# Current project state

**Last updated:** 2026-09-06  
**Authoritative main:** `9ef59f64008db16df0386ac92c5d64bfc8c73b58`  
**Phase status:** Phase 0–3 complete; Phase 3 is `LIVE_CLOSED`.  
**Publication evidence:** PR #19 merged; main CI run `34007323794` succeeded; the Phase 3 same-property Owner → Admin → Owner → Customer live trace passed on disposable QA data.

## Current status

KONFRM has completed the implementation and live verification required through Phase 3. The connected property vertical slice is proven with one canonical property flowing through Owner creation/media/submission, Admin review/approval, canonical `PUBLISHED + VERIFIED` persistence, Owner no-reload revalidation, Customer Explore visibility, and Customer canonical Detail rendering.

Phase 3 closed without database schema changes, migrations, RPC changes, booking/availability/finance-rule changes, or broad UI redesign. Phase 4 must not start automatically; it is the dedicated UI/UX program and requires the planned UI/UX Design Lab / LAP collaboration.

## Implemented areas

- **Phase 3 property vertical slice:** `LIVE_CLOSED` on main `9ef59f64008db16df0386ac92c5d64bfc8c73b58`. Owner → Admin → Renter same-entity propagation was live-verified end to end. Owner property status revalidation is property-scoped and protected against out-of-order responses. Customer Property Detail fetches the canonical public detail contract and no longer fabricates description, amenities, location, images, capacity, type, or house-rule truth.
- **P2.3 Owner API Contract:** closed, merged, deployed, and live-verified before Phase 3. Owner profile/property/calendar/booking-financial/wallet reads use canonical server truth and fail-closed behavior.
- **Properties (M03/P1.3):** owner draft/create, canonical image upload/media records, submission, Admin review queue/detail/approval, public visibility, and same-property live propagation are closed through Phase 3.
- **Bookings:** Customer request lifecycle, Owner approve/reject, availability protection, and booking-context conversation/message persistence.
- **Payments:** prototype deposit initiation/completion with canonical financial summaries and migration `019` atomic finalization RPC; no real-money Paymob flow.
- **Wallet:** Owner wallet/ledger reads use `owner_wallets` and `wallet_ledger_entries`, not property-price reconstruction.
- **Identity/access:** P0.2 is published at `6d37b4589fca47fe56b294c4c12292b44a2db138`; P1.2 closed canonical session persistence at `92dc3916…`. See [`codex/P1_2_IDENTITY_SESSION_PERSISTENCE_REPORT.md`](./codex/P1_2_IDENTITY_SESSION_PERSISTENCE_REPORT.md).
- **Truthful states:** Admin validates sessions before shell render; Owner and Customer property surfaces distinguish loading/success/error truthfully and do not use fabricated canonical property data.
- **Owner entry:** first-ever device flow is a short KONFRM splash then one-time Owner onboarding; it is independent of authentication and does not change Owner capability rules.
- **Owner Home:** action-first Home uses canonical pending booking requests, future confirmed bookings, property status context, and direct available/pending wallet values; it does not use dashboard financial aliases as wallet truth.
- **Owner registration/KYC:** explicit Owner registration is separate from login and preserves a Customer’s UUID when adding the Owner extension. New Owners submit National ID front, National ID back, and a fresh face image to the private `owner-verification` bucket; the package becomes pending Admin review only after all three files validate.
- **Governance:** `DESIGN_SYSTEM/` is independent KONFRM visual/product-experience authority. The `docs/codex/` layer records phase authority, conflicts, evidence classification, quality gates, and sequencing without replacing source specifications.
- **Customer Favorites:** repository-implemented with migrations `028_customer_favorites.sql` and `029_customer_favorites_acl_hardening.sql`, backend customer endpoints, and Customer client integration. Any remaining live migration evidence remains governed by its own task evidence.

## Active architecture

- React/Vite apps call the TypeScript backend at `/api/v1`.
- Backend routes run through Node or Cloudflare Worker adapters, repositories, and a narrow Supabase REST/RPC compatibility layer.
- Supabase PostgreSQL and Storage are canonical. Payment prototype mode is explicit.

Read [ARCHITECTURE.md](./ARCHITECTURE.md), [DATABASE.md](./DATABASE.md), and [BUSINESS_RULES.md](./BUSINESS_RULES.md) only when the task touches those domains per [CONTEXT_ROUTER.md](./CONTEXT_ROUTER.md).

## Verified technical debt / known limits

- `dbClient.ts` remains a strict SQL-to-Supabase REST/RPC compatibility layer, not a general Worker transaction/query solution. Matcher collisions are a known risk.
- P1.1 reconciled retained migrations with live metadata. The live application ledger omits 013/014/017/018 despite their observed effects; 015 is repository-ahead of the observed session/OTP shape; the `000_schema_baseline` source remains unavailable. See [`codex/P1_1_SCHEMA_RLS_BASELINE_REPORT.md`](./codex/P1_1_SCHEMA_RLS_BASELINE_REPORT.md).
- Live public tables have RLS enabled and no policies, with the backend using service-role access. P14.1 is closed: migration `021_harden_critical_rpc_privileges.sql` was applied/read-only-verified; the four critical payment/KYC/registration RPCs are no longer executable by `anon` or `authenticated` and remain executable by `service_role`.
- Payment is intentionally `PROTOTYPE`; real Paymob credentials/networking are not implemented.
- Design-system legacy drift remains inventoried under `DESIGN_SYSTEM/`; the anti-drift baseline prevents new violations but does not migrate old screens.
- Cloudflare Pages project linkage/revision state remains external to repository configuration and requires live verification after frontend deployment work.
- Local baseline runtime retains the documented Node-version caveats; use the repo/CI runtime evidence rather than shell-specific assumptions.

## Open product/implementation decisions

- Complete cancellation/refund and remaining-balance payment policy should be confirmed before a task changes those paths.
- Any migration away from the Worker database compatibility adapter requires an explicit architecture decision.
- Approved experience recommendations not marked `APPROVED_EXISTING` in `DESIGN_SYSTEM/EXPERIENCE/DECISIONS.json` still need Founder/Product approval before implementation.

## Next work

**STOP before Phase 4.**

Phase 3 is complete and live-closed. The next roadmap phase is **Phase 4 — Unified Design System / UI/UX program**, which is intentionally held until the Founder resumes with the UI/UX Design Lab / LAP collaboration. No Phase 4 implementation should begin implicitly from this state.

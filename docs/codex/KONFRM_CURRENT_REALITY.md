# KONFRM current reality assessment

> **2026-09-04 reconciliation:** Product code baseline before BS-02 is `origin/main` at `baecc9f7f9c16aafa1954ddf7aa6e3cead5c757a` (incorporates published P1.6, P2.1, and P2.2 work). The durable Brain Sync governance layer is introduced by `tooling/brain-sync-bs02` / PR #15 (documentation and governance only; no product code change). Product candidate P2.3 (Owner API Contract) remains an unmerged candidate awaiting Bridge review and closure verification on `implementation/p2-3-owner-api-contract` (PR #14). Historical validation reports remain preserved. Subsequent work sequences per `KONFRM_EXECUTION_DEPENDENCY_ORDER.md`.

**Audited repository baseline:** P0.1 began at `main`/`origin/main` `3acb94e` on 2026-08-29. This is a repository/Git/configuration assessment, not blanket live-production proof.

## Classification key

- **Implemented—repository evidence:** current code/migration and recent Git evidence exist; external behavior may still be unverified.
- **Partial / acceptance gap:** implementation evidence exists but a material contract, test, deployment, visual, or cross-app gate remains open.
- **Unverified historical claim:** documentation/report says complete without fresh repository or live evidence sufficient to certify it.
- **Deferred / decision needed:** product behavior cannot be safely inferred.

| Area | Classification | Evidence tag | Evidence and remaining proof |
| --- | --- | --- | --- |
| Three React applications / screens | Implemented—repository evidence | `CODE_OBSERVED` | `customer-app`, `owner-app`, `admin-app` are React/TypeScript/Vite applications with role-specific components and contexts. Each screen’s runtime state still needs per-slice verification. |
| Backend routes/services | Implemented—repository evidence | `CODE_OBSERVED` | TypeScript `ExpressServerApp`, route families for auth/customer/owner/admin, repositories, and Worker entry exist. Route-by-route contract/error audit remains. |
| Authentication | Implemented—local verification | `LOCAL_VERIFIED` | P0.2 signed-token route tests and role/client-state regressions cover prototype Customer/Owner/Admin access, candidate-session bootstrap, logout, and representative authorization. Exact deployed revision and complete production-auth/RLS assurance remain outside this local phase. |
| Database/schema | Partial / security prerequisite | `LIVE_DB_OBSERVED` | P1.1 read-only metadata audit reconciled 28 public app tables, constraints, and retained migrations. Baseline source history remains incomplete; 013/014/017/018 effects are present but ledger-missing and 015 is repository-ahead. |
| Storage/media | Partial / acceptance gap | `LIVE_DB_OBSERVED` | `property-media` is public with 10 MiB image/PDF metadata; `owner-verification` is private. No public/storage policies were observed; object access remains a P14.2 concern. |
| Property vertical slice | Implemented—repository evidence | `CODE_OBSERVED` / `GIT_OBSERVED` | Recent Owner wizard/property commits and review paths exist. Full current Owner→Admin→Customer propagation remains unverified. |
| Availability / booking / chat | Implemented—repository evidence | `CODE_OBSERVED` | Request lifecycle, availability paths, and booking conversations/messages appear in current code. Cancellation and complete cross-app acceptance are separate. |
| Prototype payment / wallet | Implemented—repository evidence | `CONFIG_OBSERVED` / `DB_OBSERVED` | Explicit `PAYMENT_MODE=PROTOTYPE`, finalization migration, transaction/wallet/ledger reads, and recent wallet commit exist. Current prototype rule is Pending → Available 24h after check-in, minimum payout 500 EGP, provider fee borne by Owner; final production revalidation remains open. |
| Owner registration / KYC | Implemented—repository evidence | `CODE_OBSERVED` / `DB_OBSERVED` | Explicit registration, private three-document model, and Admin review code/migration exist. Full live new-owner mutation was intentionally not proven. |
| Truthful state behavior | Partial / acceptance gap | `GIT_OBSERVED` / `CODE_OBSERVED` | Corrective Customer/Admin/Owner commits exist. Systematic fetch/error/empty-state audit remains required. |
| Design / experience governance | Implemented—repository evidence | `CODE_OBSERVED` | `DESIGN_SYSTEM/` v2.1.2, Experience documentation, tokens, and anti-drift tooling exist. Legacy drift and feature migration remain. |
| Recent Owner migrations | Partial / acceptance gap | `GIT_OBSERVED` | Home, Wallet, Properties/Wizard, and Bookings recent commits exist. Founder visual acceptance, exact Pages revision, and closure evidence are outstanding. |
| CI / Cloudflare / Vercel | Partial / acceptance gap | `VERIFIED` / `CONFIG_OBSERVED` | P0.2 published commit `6d37b4589fca47fe56b294c4c12292b44a2db138` triggered GitHub Actions run #129 (`33279518425`), including successful Worker deployment and public health. Pages revisions remain external/unverified. |
| Connected infrastructure audit | Partial / security prerequisite | `LIVE_DB_OBSERVED` | P1.1 connected Supabase metadata confirmed project health/PostgreSQL 17, table/RLS/grant/storage baseline, and a live PUBLIC-RPC grant contradiction. Cloudflare account revision metadata remains unavailable. |
| Test infrastructure / runtime errors | Partial / environment caveat | `LOCAL_VERIFIED` | Builds/checks, focused backend suites, Vite shells, and backend localhost health now execute. Backend `.nvmrc` is 22, matching CI and the installed Supabase runtime; frontend declarations remain 20. Restricted Codex filesystem execution can still fail while resolving the Windows user profile, so use a process-scoped runtime / authorized local process for local validation. |
| Mocks / hardcoded/legacy | Partial / acceptance gap | `CODE_OBSERVED` | Mock repositories and legacy comments/constants remain discoverable. They require scoped audit, not blanket deletion. |
| RLS / public RPC exposure | Partial / residual architecture concern | `LIVE_DB_OBSERVED` / `LIVE_VERIFIED` | P14.1 applied migration 021 and verified that the four critical KONFRM RPCs are no longer executable by anon/authenticated; service-role access remains. Public app tables remain RLS-enabled/no-policy and object-level Storage access remains P14.2 work. |
| Favorites, notifications, cancellation, disputes/reviews | Deferred / decision needed or incomplete | `DOC_OBSERVED` / `CODE_OBSERVED` | Customer Favorites is repository-implemented with migrations 028/029 and client/backend routes (live DB application unverified); notification model, cancellation/refund matrix, remaining-balance method, and dispute/review behavior require scoped audit/decisions. |

## What not to assume

- A Git commit, build, migration file, or old report is not live verification.
- A successful zero/empty UI is not truthful unless the request succeeded.
- Current code is not proof that an older product rule remains intended.
- No statement here certifies full RLS coverage, all external deployment configuration, or production data state.

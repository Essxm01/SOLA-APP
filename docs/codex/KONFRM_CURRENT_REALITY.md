# KONFRM current reality assessment

**Audited repository baseline:** P0.1 began at `main`/`origin/main` `3acb94e` on 2026-08-29. This is a repository/Git/configuration assessment, not blanket live-production proof.

## Classification key

- **Implemented—repository evidence:** current code/migration and recent Git evidence exist; external behavior may still be unverified.
- **Partial / acceptance gap:** implementation evidence exists but a material contract, test, deployment, visual, or cross-app gate remains open.
- **Unverified historical claim:** documentation/report says complete without fresh repository or live evidence sufficient to certify it.
- **Deferred / decision needed:** product behavior cannot be safely inferred.

| Area | Classification | Evidence tag | Evidence and remaining proof |
| --- | --- | --- |
| Three React applications / screens | Implemented—repository evidence | `CODE_OBSERVED` | `customer-app`, `owner-app`, `admin-app` are React/TypeScript/Vite applications with role-specific components and contexts. Each screen’s runtime state still needs per-slice verification. |
| Backend routes/services | Implemented—repository evidence | `CODE_OBSERVED` | TypeScript `ExpressServerApp`, route families for auth/customer/owner/admin, repositories, and Worker entry exist. Route-by-route contract/error audit remains. |
| Authentication | Partial / acceptance gap | `CODE_OBSERVED` | Canonical Owner boundary, role tokens/session code, Admin validation, and prototype login/register flows exist. Expiry/error/live behavior is not globally certified. |
| Database/schema | Partial / acceptance gap | `DB_OBSERVED` | Retained migrations `008`–`020` contain identity, property, booking, payment, wallet, and KYC evidence. Baseline schema/RLS history is incomplete. |
| Storage/media | Partial / acceptance gap | `CODE_OBSERVED` / `DB_OBSERVED` | Property media and private Owner-verification paths are implemented in code/migration. Bucket configuration/object access must be read-only verified live. |
| Property vertical slice | Implemented—repository evidence | `CODE_OBSERVED` / `GIT_OBSERVED` | Recent Owner wizard/property commits and review paths exist. Full current Owner→Admin→Customer propagation remains unverified. |
| Availability / booking / chat | Implemented—repository evidence | `CODE_OBSERVED` | Request lifecycle, availability paths, and booking conversations/messages appear in current code. Cancellation and complete cross-app acceptance are separate. |
| Prototype payment / wallet | Implemented—repository evidence | `CONFIG_OBSERVED` / `DB_OBSERVED` | Explicit `PAYMENT_MODE=PROTOTYPE`, finalization migration, transaction/wallet/ledger reads, and recent wallet commit exist. Current prototype rule is Pending → Available 24h after check-in, minimum payout 500 EGP, provider fee borne by Owner; final production revalidation remains open. |
| Owner registration / KYC | Implemented—repository evidence | `CODE_OBSERVED` / `DB_OBSERVED` | Explicit registration, private three-document model, and Admin review code/migration exist. Full live new-owner mutation was intentionally not proven. |
| Truthful state behavior | Partial / acceptance gap | `GIT_OBSERVED` / `CODE_OBSERVED` | Corrective Customer/Admin/Owner commits exist. Systematic fetch/error/empty-state audit remains required. |
| Design / experience governance | Implemented—repository evidence | `CODE_OBSERVED` | `DESIGN_SYSTEM/` v2.1.2, Experience documentation, tokens, and anti-drift tooling exist. Legacy drift and feature migration remain. |
| Recent Owner migrations | Partial / acceptance gap | `GIT_OBSERVED` | Home, Wallet, Properties/Wizard, and Bookings recent commits exist. Founder visual acceptance, exact Pages revision, and closure evidence are outstanding. |
| CI / Cloudflare / Vercel | Partial / acceptance gap | `VERIFIED` / `CONFIG_OBSERVED` | The documentation/governance-only `main` push `3acb94e9132ed9d9e9d9950916bbba3bfe806653` triggered GitHub Actions run #127; its Backend job executed the Cloudflare Worker deployment step. This is current CI/deployment evidence only, not proof of a Pages deployment or a statement that the trigger scope is intended. Public Pages URLs and Worker health resolve; Pages/Worker revision metadata and account configuration remain inaccessible. Legacy Vercel Worker health is 404. |
| Connected infrastructure audit | Partial / access-limited | `ACCESS_UNAVAILABLE` | No authenticated Cloudflare/Supabase session is available. Supabase ref is configured and unauthenticated REST returns 401; schema/RLS/buckets remain unverified. |
| Test infrastructure / runtime errors | Partial / environment caveat | `LOCAL_VERIFIED` | Builds/checks, focused backend suites, Vite shells, and backend localhost health now execute. Backend `.nvmrc` is 22, matching CI and the installed Supabase runtime; frontend declarations remain 20. Restricted Codex filesystem execution can still fail while resolving the Windows user profile, so use a process-scoped runtime/authorized local process for local validation. |
| Mocks / hardcoded/legacy | Partial / acceptance gap | `CODE_OBSERVED` | Mock repositories and legacy comments/constants remain discoverable. They require scoped audit, not blanket deletion. |
| Favorites, notifications, cancellation, disputes/reviews | Deferred / decision needed or incomplete | `DOC_OBSERVED` | Persistent Favorites is approved but not implemented; notification model, cancellation/refund matrix, remaining-balance method, and some dispute/review behavior require scoped audit/decisions. |

## What not to assume

- A Git commit, build, migration file, or old report is not live verification.
- A successful zero/empty UI is not truthful unless the request succeeded.
- Current code is not proof that an older product rule remains intended.
- No statement here certifies full RLS coverage, all external deployment configuration, or production data state.

# P0.1 — Baseline, CI, deployment, and access reality

**Status:** Complete — local baseline is verified with process-scoped official Node runtimes; privileged Cloudflare/Supabase metadata remains correctly classified as `ACCESS_UNAVAILABLE`. No commit, push, or deployment was performed by this phase.
**Starting SHA:** `3acb94e9132ed9d9e9d9950916bbba3bfe806653` on `main`, equal to `origin/main` at inspection.

## Result and outcome

Repository, local-runtime, public GitHub/HTTP, and credential-availability evidence now distinguish verified baseline facts from unavailable privileged inspection. Two stale repository routing defaults were corrected: the Admin no-env fallback and root `.env.example` now point to the current Worker rather than legacy Vercel. The backend runtime declaration now matches the Node 22 version used by CI and required by the installed Supabase runtime.

## Acceptance matrix

| # | Result | Evidence |
| --- | --- | --- |
| 1–3 | PASS | Clean `main`; HEAD and `origin/main` both `3acb94e` at start; GitHub remote is `Essxm01/SOLA-APP`. |
| 4–5 | PASS / diagnosed | The host has Node `v25.6.0`; portable official Node 20.20.2 and Node 22.23.2 runtimes were used without machine-wide changes. Both bundled `npm.cmd` and bare `npm` through process-scoped PATH work. The PowerShell user-prefix npm remains inaccessible but is not the project runtime authority. |
| 6–9 | LOCAL_VERIFIED | Customer/Owner/Admin build; Owner typecheck; backend typecheck; all three Vite dev servers returned HTTP 200. Under portable Node 20, five focused backend suites execute successfully. Node 20 cannot start the current Supabase-backed server because the installed client requires native WebSocket support; Node 22 (the CI runtime) starts the backend and its localhost health endpoint returns 200. |
| 10–12 | VERIFIED / CONFIG_OBSERVED | Local app envs use relative `/api/v1`; public Customer/Owner/Admin bundles contain the Worker API target. |
| 13–14 | CODE_OBSERVED / executable baseline | Customer/Owner prototype login and canonical Admin session validation exist; legacy OTP code remains but is not the prototype-login path. Focused Owner identity, registration/KYC, property-wizard, Admin truthful-state, and Customer truthful-state backend suites execute successfully. |
| 15–17 | VERIFIED | GitHub workflow run `33247728353` (#127) for `3acb94e` succeeded: changed-module, all three app build jobs, backend check, critical Owner tests, and Worker deploy. CI does not run Customer/Admin truthful-state tests or prove Pages release revision/live role flows. |
| 18–20 | VERIFIED (URL only) / revision ACCESS_UNAVAILABLE | Customer, Owner, Admin Pages URLs each returned HTTP 200. Public headers do not expose project/deployment/source SHA. |
| 21 | VERIFIED / revision ACCESS_UNAVAILABLE | Worker health returned 200 and CI deploy step succeeded; public response exposes no deployed source SHA/version. |
| 22 | VERIFIED | Worker health 200; CORS OPTIONS returned 204 with exact allow-origin for Customer, Owner, Admin Pages and legacy Vercel Customer origin. |
| 23–24 | ACCESS_UNAVAILABLE | Worker config names project ref `zrbmbjgcsowfqklmxbyn`; unauthenticated REST root returns 401; no Supabase access token/CLI session exists. Schema, buckets, and storage policy were not inferred. |
| 25 | PASS | Retained migration/RLS uncertainty remains explicit; migrations start at 008. |
| 26 | VERIFIED / CONFIG_OBSERVED | Vercel config/artifacts remain historical; legacy Vercel Worker health returned 404. No Vercel mutation. |
| 27 | PASS | Cross-system matrix below. |
| 28 | PASS | Only credential presence/names were inspected; no secret value recorded. |
| 29 | PASS | Two unambiguous stale Worker references were corrected and Admin build retested. The backend `.nvmrc` was aligned from 20 to 22 after comparison proved Node 20 lacks the native WebSocket capability required by the installed Supabase client, while Node 22 passes check/test/dev health. |
| 30 | PASS | Task, reality, completion, rescue, and this report updated from evidence. |

## Cross-system configuration matrix

| System | Expected | Observed | Evidence | Status / blocker |
| --- | --- | --- | --- | --- |
| Customer | Pages → Worker | public bundle contains Worker target; local relative proxy | VERIFIED / CONFIG_OBSERVED | Pages SHA unavailable |
| Owner | Pages → Worker | public bundle contains Worker target; local relative proxy | VERIFIED / CONFIG_OBSERVED | Pages SHA unavailable |
| Admin | Pages → Worker | public bundle contains Worker target; stale source fallback fixed to Worker | VERIFIED | Pages SHA unavailable |
| Backend | Worker, prototype mode | Worker health 200; `backend/wrangler.json` sets Worker name/ref and `PAYMENT_MODE=PROTOTYPE` | VERIFIED / CONFIG_OBSERVED | deployed source SHA unavailable |
| GitHub CI | build/check/test/deploy on `main` | run #127 success for start SHA | VERIFIED | no Pages deployment job |
| Cloudflare | Pages + Worker | public URLs/health work; local Wrangler unauthenticated | VERIFIED / ACCESS_UNAVAILABLE | account/project metadata unavailable |
| Supabase | canonical project/storage | configured ref responds 401 without credentials | CONFIG_OBSERVED / ACCESS_UNAVAILABLE | schema/RLS/buckets unavailable |

## Defects fixed and deferred

- Fixed: `admin-app/src/utils/api.ts` defaulted to legacy Vercel when no `VITE_API_BASE_URL`; it now defaults to the verified Worker. Root `.env.example` now matches.
- Resolved local baseline: the task runner's restricted filesystem context caused both Node 20 and Node 25 to fail while resolving the Windows user profile (`EPERM`/`uv_os_get_passwd`). The same host runtimes succeed in the authorized local process context, so this is not a Node-version-specific project defect. For backend development use Node 22, matching CI; Node 20 remains appropriate for the frontend runtime declarations.
- No known product/business/data defect was changed.

## Documentation and recommendation

P0.1 is closed. Cloudflare Pages revision and Supabase metadata still require read-only authenticated access and remain explicit `ACCESS_UNAVAILABLE` evidence gaps rather than blockers. P0.2 remains next only after Founder review and an explicit task contract.

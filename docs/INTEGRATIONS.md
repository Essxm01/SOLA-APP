# Integrations and operational configuration

Never place secrets in this document. Environment-variable names below are names only; use the deployment secret manager or local ignored `.env` files for values.

| Integration | Purpose and code boundary | Important configuration/constraint |
| --- | --- | --- |
| Supabase PostgreSQL | Canonical application data; backend repositories and the Worker adapter | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_ANON_KEY` where relevant. The Worker adapter uses REST/RPC compatibility, not arbitrary PostgreSQL. |
| Supabase Storage | Canonical public property media and private Owner KYC evidence | `OBJECT_STORAGE_PROVIDER=supabase`, `SUPABASE_STORAGE_BUCKET`, optional `STORAGE_CDN_HOST`; provider code is `backend/server/src/services/storageProvider.ts`. Owner KYC uses the private `owner-verification` bucket and authorized temporary access, never public property-media URLs. |
| Cloudflare Workers | Backend Worker runtime | `backend/wrangler.json`, `backend/server/src/worker.ts`; CI deploys with `CLOUDFLARE_API_TOKEN`. `PAYMENT_MODE=PROTOTYPE` is set in the tracked Worker vars. |
| Cloudflare Pages | Frontend hosting expected for the three apps | Build/project linkage is external to the repository; verify the actual deployment/revision after frontend changes. Do not create replacement projects casually. |
| Paymob abstraction | Future live payment boundary; current flow is prototype only | `PAYMENT_MODE`, `PAYMOB_API_KEY`, `PAYMOB_HMAC_SECRET`, `PAYMOB_INTEGRATION_ID_CARD`, `PAYMOB_IFRAME_ID`. Live mode must fail closed when real configuration/implementation is absent. |
| JWT/session service | Role-scoped access and persistence-backed Customer/Owner refresh/revoke flow | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`; never put fallback or production values in source/docs. P1.2 prepares migration `022` locally; live `user_sessions` remains legacy owner-scoped until Founder-approved application. |
| CORS | Backend origin control | `CORS_ALLOWED_ORIGINS`; Worker also applies its request-origin policy. |
| GitHub Actions | Build validation and Worker deployment on `main` | `.github/workflows/ci-validation.yml`; Node versions and deployment behavior are defined there. |

## Local/development configuration

Root and module `.env.example` files show expected variable names and non-secret defaults. They are examples, not production truth. Vite clients use `VITE_API_BASE_URL`; `VITE_USE_MOCK_REPO` is a development-mode switch and must not be used to invent runtime business success.

Some retained examples reference a legacy Vercel backend URL. That reference is neither a deployment authority nor live verification; do not copy it into a deployment decision without an explicit current task and read-only infrastructure evidence.

## Failure handling

- Supabase/database errors must be surfaced truthfully; they must not become fake empty data, zero finance, or fabricated success.
- Worker database adapter support is deliberately narrow. Add only strict handlers needed by actual repository SQL/RPC use; no generic parser or silent direct-Postgres fallback.
- Payment mode is explicit; missing live credentials do not authorize mock success in live mode.

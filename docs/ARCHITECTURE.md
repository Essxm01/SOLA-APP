# Technical architecture

## System shape

```mermaid
flowchart LR
  C[Customer App\nReact/Vite] --> API[/api/v1]
  O[Owner App\nReact/Vite] --> API
  A[Admin App\nReact/Vite] --> API
  API --> W[Node TypeScript app\nCloudflare Worker adapter]
  W --> R[dbRepository]
  R --> D[dbClient strict compatibility layer]
  D --> S[(Supabase PostgreSQL)]
  W --> ST[Supabase Storage]
```

## Applications

- `customer-app/`, `owner-app/`, and `admin-app/` are independent React 19 + TypeScript + Vite applications. Customer and Owner are mobile-first; Admin is desktop-operational.
- Each app uses its own repository/client layer to call `/api/v1`. The Vite environment provides `VITE_API_BASE_URL`; mock mode is a development option, not an authority for production success.
- The Owner app places `AppProvider` only behind validated Owner authentication and keys it by canonical `owner.id`, preventing account-scoped state from surviving identity changes.
- The Admin app validates a persisted token with `/api/v1/admin/auth/session` before rendering its operational shell. Customer discovery and payment history use explicit loading/success/error states.

## Backend

- `backend/server/src/app.ts` is the route dispatcher for `/api/v1` and is used by both the Node HTTP entry (`index.ts`) and Worker entry (`worker.ts`).
- `backend/server/src/services/dbRepository.ts` holds domain repositories. `dbClient.ts` provides the database access layer.
- The Worker path uses a deliberately narrow SQL-to-Supabase REST/RPC compatibility adapter. It is not a general SQL parser or transaction engine. Matchers must be strict: a prior `owner_id` versus `id` collision is why predicate matching must never rely on unsafe substrings.
- Authentication middleware verifies role-scoped tokens. Protected owner/customer/admin routes derive authority from the verified subject rather than request-provided owner/customer IDs.
- Public Property Discovery Contract (P2.1):
  - Dedicated public read paths (`propertyDb.searchPublic`, `propertyDb.getPublicById`) enforce publication invariants (`deleted_at IS NULL AND status = 'PUBLISHED' AND verification_status = 'VERIFIED'`).
  - Strict privacy-safe DTO mappers (`toPublicPropertySearchItem`, `toPublicPropertyDetail`) in `backend/server/src/contracts/publicProperty.ts` guarantee no Owner contact/identity details, admin review metadata, internal finances (commission, owner net), or wallet/ledger keys are ever serialized on public routes.
  - The Cloudflare Worker database adapter (`dbClient.ts`) uses exact, collision-safe SQL matching (`CANONICAL_PUBLIC_PROPERTIES_LIST_SQL`, `CANONICAL_PUBLIC_PROPERTY_DETAIL_SQL`) with explicit PostgREST `select=` projection and fail-closed response validation.
  - Customer App sends filter criteria to backend (`buildPublicPropertySearchPath`), replacing local client-authoritative filtering with server-authoritative search.

## Data and deployment boundaries

- Supabase PostgreSQL is the canonical persistent store; Supabase Storage stores public property media and private Owner KYC evidence through separate paths. Worker operations requiring database atomicity use narrow PostgreSQL RPCs rather than composing REST writes. P1.3's atomic property-media RPC (`public.konfrm_commit_property_media`, migration 024) is published at `fb38414…` and verified applied live in Supabase.
- `backend/wrangler.json` is the Worker configuration used by the GitHub Actions deployment (`workingDirectory: backend`). The root `wrangler.json` also exists; treat it as an alternate/legacy configuration until a deployment task verifies which configuration is active.
- `.github/workflows/ci-validation.yml` builds changed app areas and deploys the backend Worker on pushes to `main`. Cloudflare Pages project linkage is external to this repository and must be verified after frontend deployment work.
- Vercel configuration artifacts exist in the repository. The current source alone does not prove that Vercel is an active production deployment path.

## Validation

- Root scripts route to backend checks/tests, Owner checks/builds, and design token generation/checking.
- Each app/backend has its own package scripts. Prefer focused test suites named for the affected slice before broad builds.
- Backend tests include safeguards intended to prevent tests from targeting production data; inspect the relevant test setup before database-affecting work.

For schema and persistence detail, read [DATABASE.md](./DATABASE.md). For business transitions, read [BUSINESS_RULES.md](./BUSINESS_RULES.md). For service configuration, read [INTEGRATIONS.md](./INTEGRATIONS.md).

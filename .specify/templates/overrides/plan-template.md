# Implementation Plan: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link to spec.md]
**Macro Roadmap Phase**: [PHASE N — exact canonical title from خطة عمل التطبيق.txt]
**Execution Boundary**: [e.g. P1.5 — optional task boundary identifier]
**Status**: Draft

---

## 1. Executive Summary & Technical Approach

[Extract from spec: primary objective and architectural solution derived from codebase research]

---

## 2. Affected System Surfaces & Data Flow

<!--
  Include only impacted surfaces. Mark unimpacted surfaces as 'N/A with reason'.
-->

| System / Surface | Specific Files & Endpoints | Nature of Change |
| --- | --- | --- |
| **Frontend UI** | `customer-app/` / `owner-app/` / `admin-app/` *(or N/A)* | [Components, hooks, context] |
| **Backend Router & Logic** | `backend/server/src/app.ts`, controllers *(or N/A)* | [Routes, domain logic, validations] |
| **Database & Repositories** | `dbRepository.ts`, `backend/database/migrations/` *(or N/A)* | [Queries, models, ledger, RLS] |
| **Worker REST Compatibility** | `backend/server/src/services/dbClient.ts` *(or N/A)* | [Exact SQL-to-REST matchers] |
| **External Integrations** | Supabase Storage, Paymob, Cloudflare *(or N/A)* | [Buckets, webhooks, env vars] |

---

## 3. Constitution & Safety Gates Check

*GATE: Must pass before implementation begins.*

- [ ] **Founder Authority**: All business and financial rules verified in `docs/BUSINESS_RULES.md` and `docs/codex/KONFRM_MASTER_RULES.md`.
- [ ] **Roadmap Alignment**: Fits within current macro roadmap phase; no unauthorized phase expansion.
- [ ] **Data Integrity**: Supabase PostgreSQL is canonical persistence source of truth; errors fail closed and truthfully.
- [ ] **Worker REST Adapter**: Every modified/new SQL query has an exact, tested matcher in `dbClient.ts` (or N/A if untouched).
- [ ] **Single-Writer Safety**: Assigned exclusively to ONE implementation agent / writer at a time.
- [ ] **Context Budget**: Hot-context files identified; unnecessary bulk re-reading avoided.

---

## 4. Architecture, Schema & Adapter Compatibility

### Schema & Database Changes
- [State explicitly: "N/A — no schema changes required" OR list specific additive migration under `backend/database/migrations/`]
- [RLS policy, function privileges, and ledger impact if applicable]

### Cloudflare Worker REST Adapter Matching
- [State "N/A — no database queries touched" OR list every exact SQL query and corresponding matcher in `backend/server/src/services/dbClient.ts`]
- [Verify strict HTTP error checks (`if (!res.ok) throw ...`) rather than silent empty fallbacks]

### Authorization & Security Boundary
- [State exact JWT role requirement (`ROLE_OWNER`, `ROLE_ADMIN`, `ROLE_CUSTOMER`, or public)]
- [Verify server-derived ownership: e.g. `ownerId` from `jwt.sub`, never from client payload]

---

## 5. Backward Compatibility & Non-Goals

- **Backward Compatibility**: [How existing endpoints, clients, and database data remain functional]
- **Explicit Non-Goals**: [What this plan intentionally avoids touching or refactoring]

---

## 6. Verification & Test Strategy

### Automated Test Matrix
1. **Unit & Behavioral Suites**: `backend/server/src/tests/[test_name].test.ts`
   - Happy path validation
   - Boundary condition testing
   - Truthful error handling (4xx for validation/conflict, 5xx for DB/dependency failures)
2. **Worker REST Adapter Suite**: Verify exact query matching against mocked Supabase REST (if data layer touched)
3. **Frontend / Typecheck Verification**: `npm run check` across affected apps (if frontends touched)
4. **Formatting & Diff Check**: `git diff --check`

### Live & Manual Verification (If Applicable)
- [Read-only metadata verification steps; note that live mutations/deployments require separate approval gates]

---

## 7. Context Budget & Hot-Context Pointers

<!--
  List ONLY the essential files required for the implementation agent.
-->
- `tasks/CURRENT_TASK.md` (Active task contract)
- `docs/codex/KONFRM_MASTER_RULES.md`
- `docs/BUSINESS_RULES.md` [§ Specific section]
- [Affected implementation files]
- [Affected test files]

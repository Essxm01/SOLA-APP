# Implementation Plan: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link to spec.md]
**Macro Roadmap Phase**: [e.g. PHASE 1 — Database Backbone / PHASE 3 — Calendar & Availability]
**Status**: Draft

---

## 1. Executive Summary & Technical Approach

[Extract from spec: primary objective and architectural solution derived from codebase research]

---

## 2. Affected System Surfaces & Data Flow

| System / Surface | Specific Files & Endpoints | Nature of Change |
| --- | --- | --- |
| **Frontend UI** | `customer-app/`, `owner-app/`, `admin-app/` | [Components, hooks, context] |
| **Backend Router & Logic** | `backend/server/src/app.ts`, controllers | [Routes, domain logic, validations] |
| **Database & Repositories** | `dbRepository.ts`, `schema.sql`, migrations | [Queries, models, ledger, RLS] |
| **Worker REST Compatibility** | `backend/server/src/services/dbClient.ts` | [Exact SQL-to-REST matchers] |
| **External Integrations** | Supabase Storage, Paymob, Cloudflare | [Buckets, webhooks, env vars] |

---

## 3. Constitution & Safety Gates Check

*GATE: Must pass before implementation begins.*

- [ ] **Founder Authority**: All business and financial rules verified in `docs/BUSINESS_RULES.md` and `docs/codex/KONFRM_MASTER_RULES.md`.
- [ ] **Roadmap Alignment**: Fits within current macro roadmap phase; no unauthorized phase expansion.
- [ ] **Data Integrity**: Supabase PostgreSQL is canonical source of truth; all failure paths fail closed/honest.
- [ ] **Worker REST Adapter**: Every modified/new SQL query has an exact, tested matcher in `dbClient.ts`.
- [ ] **Single-Writer Safety**: Assigned exclusively to ONE implementation agent (e.g. ZCode).
- [ ] **Context Budget**: Hot-context files identified; unnecessary bulk re-reading avoided.

---

## 4. Architecture, Schema & Adapter Compatibility

### Schema & Database Changes
- [State explicitly: NO MIGRATION REQUIRED or list specific additive migration file]
- [RLS policy, function privileges, and ledger impact]

### Cloudflare Worker REST Adapter Matching
- [List every exact SQL string and verify corresponding matcher in `backend/server/src/services/dbClient.ts`]
- [Verify strict HTTP error checks (`if (!res.ok) throw ...`) rather than silent empty fallbacks]

### Authorization & Security Boundary
- [State exact JWT role requirement (`ROLE_OWNER`, `ROLE_ADMIN`, or public)]
- [Verify server-derived ownership: `ownerId` from `jwt.sub`, never from client payload]

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
   - Truthful failure & outage handling (HTTP 5xx, descriptive error codes)
2. **Worker REST Adapter Suite**: Verify exact query matching against mocked Supabase REST
3. **Frontend / Typecheck Verification**: `npm run check` across affected apps
4. **Formatting & Diff Check**: `git diff --check`

### Live & Manual Verification (If Applicable)
- [Read-only metadata verification steps; note that live mutations/deployments require separate approval]

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

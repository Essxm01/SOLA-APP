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

<!--
  Include ONLY verification checks relevant to genuinely touched systems.
  Do NOT default every task to full backend + Worker + frontend suites at once.
-->

### In-Scope Verification Checks
- **Unit / Behavioral Suites** *(Conditional — if backend logic touched)*: `backend/server/src/tests/[test_name].test.ts`
- **Worker REST Adapter Suite** *(Conditional — if data layer touched)*: Verify exact query matching against mocked Supabase REST
- **Frontend / Typecheck Suite** *(Conditional — if frontend touched)*: `npm run check` across affected apps
- **Formatting / Linter Check**: `git diff --check`
- **Live / Read-Only Verification** *(Conditional — if deployment-sensitive)*: Read-only metadata checks (mutations require separate approval)

### Evidence Compression Guidelines
- **Passing commands**: Record command + `PASS` + essential identifier (e.g. test name, exit 0).
- **Failures**: Capture only the relevant failing assertion/error snippet; avoid huge logs.
- **Log hygiene**: Never paste massive raw successful test logs into conversation context.
- **CI / Publication Evidence**: Record run ID, exact commit SHA, check conclusions, and deployment status.

---

## 7. Context Budget & Hot-Context Pointers

<!--
  List ONLY the essential files and specific sections required for implementation.
  - Prefer section pointers over whole-document rereads (e.g. `docs/BUSINESS_RULES.md § Booking Approval`).
  - Do NOT include generic repo-wide docs unless directly governing the task.
  - Reference scout/evidence summaries where they replace broad repository rediscovery.
-->
- `tasks/CURRENT_TASK.md` (Active task contract)
- `docs/codex/KONFRM_MASTER_RULES.md` [Specific MR-## if directly relevant]
- [Specific governing rule section in `docs/BUSINESS_RULES.md`]
- [Exact affected implementation file(s)]
- [Exact affected test file(s)]

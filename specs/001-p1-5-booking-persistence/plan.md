# Implementation Plan: P1.5 Booking & Financial Summary Persistence Integrity

**Git Branch**: `pilot/spec-kit-p1-5-dry-run` | **Spec Directory**: `specs/001-p1-5-booking-persistence/` | **Date**: 2026-09-02 | **Spec**: `specs/001-p1-5-booking-persistence/spec.md`
**Macro Roadmap Phase**: PHASE 1 — التدقيق الشامل للبنية التحتية والبيانات الأساسية (Database Backbone & Persistence Integrity)
**Execution Boundary**: P1.5 — Booking and Financial-Summary Persistence Integrity
**Status**: Reviewed planning dry run — not dispatched for implementation

---

## 1. Executive Summary & Technical Approach

Grounded in current repository state (`backend/server/src/app.ts:3110-3260`, `dbRepository.ts`, `dbClient.ts`), replace the current sequential booking write followed by financial-summary write/compensating delete with one database-transactional persistence operation. The Worker must invoke that operation through an exact narrow RPC mapping, never emulate its transaction with REST writes. Validate server-calculated financial consistency between quote calculation and the persisted summary.

---

## 2. Affected System Surfaces & Data Flow

| System / Surface | Specific Files & Endpoints | Nature of Change |
| --- | --- | --- |
| **Frontend UI** | N/A | Untouched; UI changes deferred to dedicated UX phases |
| **Backend Router & Logic** | `backend/server/src/app.ts` (`/customer/bookings`, `/calculate`) | Atomic persistence call, stay validation, truthful 4xx/5xx responses |
| **Database & Repositories** | `backend/server/src/services/dbRepository.ts` (`bookingDb`), additive database RPC/migration only if confirmed at implementation start | One transactional booking+financial operation |
| **Worker REST Compatibility** | `backend/server/src/services/dbClient.ts` | One exact RPC mapping and necessary canonical reads; no REST transaction emulation |
| **External Integrations** | N/A | Paymob, Storage, and Cloudflare bindings untouched |

---

## 3. Constitution & Safety Gates Check

*GATE: Must pass before implementation begins.*

- [ ] **Founder Authority**: Booking/availability, financial/privacy, canonical persistence, and Worker-boundary rules verified in `docs/BUSINESS_RULES.md` and `docs/codex/KONFRM_MASTER_RULES.md [MR-07, MR-08, MR-12, MR-13]`.
- [ ] **Roadmap Alignment**: Aligns with macro Phase 1 execution boundary P1.5; no out-of-scope expansion into Phase 10/11/13.
- [ ] **Predecessor Dependency**: Acknowledges P1.4 as an open predecessor dependency.
- [ ] **Data Integrity**: Supabase PostgreSQL is canonical source of truth; all failure paths fail closed with explicit error codes.
- [ ] **Transaction boundary**: `TRANSACTION_MECHANISM_TO_BE_VERIFIED_AT_IMPLEMENTATION_START`; a reported success cannot leave an orphan booking or missing summary. The Worker cannot compose the two writes through REST.
- [ ] **Worker REST Adapter**: The selected atomic RPC has one exact, tested mapping in `dbClient.ts`; any necessary reads also have exact matchers.
- [ ] **Single-Writer Safety**: Assigned exclusively to ONE implementation agent (ZCode).
- [ ] **Context Budget**: Hot-context files identified; unnecessary bulk re-reading avoided.

---

## 4. Architecture, Schema & Adapter Compatibility

### Schema & Database Changes
- `bookings` and `booking_financial_summaries` already exist, but the current runtime creates them with two independent calls and compensating deletion on failure. That is not transactionally atomic.
- **`TRANSACTION_MECHANISM_TO_BE_VERIFIED_AT_IMPLEMENTATION_START`**: before code changes, inspect the published P1.4 baseline and choose the smallest already-supported database-transactional mechanism. The expected Worker-compatible pattern is an additive PostgreSQL RPC/function that creates both rows in one transaction, plus a narrow REST/RPC mapping. Do not claim schema/migration impact is N/A until that verification is complete.

### Cloudflare Worker REST Adapter Matching
- One exact RPC invocation for the selected atomic booking-and-summary operation.
- `SELECT ... FROM bookings WHERE id = $1`
- `SELECT ... FROM booking_financial_summaries WHERE booking_id = $1`
- Strict HTTP error handling: `if (!res.ok) throw new Error(...)` without silent empty fallbacks. Two independent REST `INSERT`s are prohibited as an atomicity mechanism.

### Authorization & Security Boundary
- `customerId` derived securely from authenticated JWT claims (`jwt.sub`).
- `guestPhone` validated against caller account.

---

## 5. Backward Compatibility & Non-Goals

- **Backward Compatibility**: Existing booking query endpoints for Customer, Owner, and Admin remain fully compatible.
- **Explicit Non-Goals**: No live Paymob payment initiation, no wallet ledger mutation, no cancellation sagas.

---

## 6. Verification & Test Strategy

### In-Scope Verification Checks
- **Unit / Behavioral Suites**: inspect the published P1.4 baseline to identify the current booking suites; at least `backend/server/src/tests/booking01.test.ts` and `booking011.test.ts` are candidate existing coverage.
  - Atomic booking + financial-summary persistence through the selected database operation
  - Calculation formula verification (`price * nights + fees = total`)
  - Boundary conditions (stay limits <2 or >30 nights)
  - Fail-closed error responses on simulated DB failures (HTTP 500)
- **Worker REST Adapter Suite**: Verify exact RPC mapping against mocked Supabase REST plus necessary canonical reads; prove a failure cannot report success or leave a partial state.
- **Formatting / Linter Check**: `git diff --check`.

### Evidence Compression Guidelines
- **Passing commands**: Record command + `PASS` + test suite name.
- **Failures**: Capture only the failing assertion snippet.
- **Log hygiene**: Never paste massive raw successful test logs into context.

---

## 7. Context Budget & Hot-Context Pointers

- `tasks/CURRENT_TASK.md` (Active task contract)
- `docs/codex/KONFRM_MASTER_RULES.md [MR-07, MR-08, MR-12, MR-13]`
- `docs/BUSINESS_RULES.md [§ Booking Lifecycle & Financial Rules]`
- `backend/server/src/app.ts:3110-3260`
- `backend/server/src/services/dbRepository.ts`
- `backend/server/src/services/dbClient.ts`
- `backend/server/src/tests/booking011.test.ts`

# Implementation Plan: P1.5 Booking & Financial Summary Persistence Integrity

**Git Branch**: `pilot/spec-kit-p1-5-dry-run` | **Spec Directory**: `specs/001-p1-5-booking-persistence/` | **Date**: 2026-09-02 | **Spec**: `specs/001-p1-5-booking-persistence/spec.md`
**Macro Roadmap Phase**: PHASE 1 — التدقيق الشامل للبنية التحتية والبيانات الأساسية (Database Backbone & Persistence Integrity)
**Execution Boundary**: P1.5 — Booking and Financial-Summary Persistence Integrity
**Status**: Draft (Planning Dry Run)

---

## 1. Executive Summary & Technical Approach

Grounded in current repository state (`backend/server/src/app.ts:3030-3180`, `dbRepository.ts`, `dbClient.ts`), implement atomic creation of booking and financial summary records. Eliminate any in-memory fallback stores, enforce strict Worker REST adapter query matching, and validate mathematical consistency between quote calculation and stored financial snapshots.

---

## 2. Affected System Surfaces & Data Flow

| System / Surface | Specific Files & Endpoints | Nature of Change |
| --- | --- | --- |
| **Frontend UI** | N/A | Untouched; UI changes deferred to dedicated UX phases |
| **Backend Router & Logic** | `backend/server/src/app.ts` (`/customer/bookings`, `/calculate`) | Atomic persistence call, stay validation, truthful 4xx/5xx responses |
| **Database & Repositories** | `backend/server/src/services/dbRepository.ts` (`bookingDb`) | Atomic `createWithFinancialSummary` method, exact SQL queries |
| **Worker REST Compatibility** | `backend/server/src/services/dbClient.ts` | Matchers for `INSERT/SELECT` on `bookings` and `booking_financial_summaries` |
| **External Integrations** | N/A | Paymob, Storage, and Cloudflare bindings untouched |

---

## 3. Constitution & Safety Gates Check

*GATE: Must pass before implementation begins.*

- [ ] **Founder Authority**: All booking rules verified in `docs/BUSINESS_RULES.md § Booking Lifecycle` and `docs/codex/KONFRM_MASTER_RULES.md [MR-12, MR-13]`.
- [ ] **Roadmap Alignment**: Aligns with macro Phase 1 execution boundary P1.5; no out-of-scope expansion into Phase 10/11/13.
- [ ] **Predecessor Dependency**: Acknowledges P1.4 as an open predecessor dependency.
- [ ] **Data Integrity**: Supabase PostgreSQL is canonical source of truth; all failure paths fail closed with explicit error codes.
- [ ] **Worker REST Adapter**: Every modified/new SQL query has an exact, tested matcher in `dbClient.ts`.
- [ ] **Single-Writer Safety**: Assigned exclusively to ONE implementation agent (ZCode).
- [ ] **Context Budget**: Hot-context files identified; unnecessary bulk re-reading avoided.

---

## 4. Architecture, Schema & Adapter Compatibility

### Schema & Database Changes
- **N/A — no schema DDL changes required**: The tables `bookings` and `booking_financial_summaries` already exist in the baseline PostgreSQL schema with appropriate foreign keys and unique constraints (`docs/DATABASE.md`).

### Cloudflare Worker REST Adapter Matching
- `INSERT INTO bookings (...) VALUES (...) RETURNING ...`
- `INSERT INTO booking_financial_summaries (...) VALUES (...) RETURNING ...`
- `SELECT ... FROM bookings WHERE id = $1`
- `SELECT ... FROM booking_financial_summaries WHERE booking_id = $1`
- Strict HTTP error handling: `if (!res.ok) throw new Error(...)` without silent empty fallbacks.

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
- **Unit / Behavioral Suites**: `backend/server/src/tests/booking01.test.ts`, `backend/server/src/tests/booking011.test.ts`
  - Atomic booking + financial summary persistence
  - Calculation formula verification (`price * nights + fees = total`)
  - Boundary conditions (stay limits <2 or >30 nights)
  - Fail-closed error responses on simulated DB failures (HTTP 500)
- **Worker REST Adapter Suite**: Verify exact query matching against mocked Supabase REST for all booking queries.
- **Formatting / Linter Check**: `git diff --check`.

### Evidence Compression Guidelines
- **Passing commands**: Record command + `PASS` + test suite name.
- **Failures**: Capture only the failing assertion snippet.
- **Log hygiene**: Never paste massive raw successful test logs into context.

---

## 7. Context Budget & Hot-Context Pointers

- `tasks/CURRENT_TASK.md` (Active task contract)
- `docs/codex/KONFRM_MASTER_RULES.md [MR-12, MR-13]`
- `docs/BUSINESS_RULES.md [§ Booking Lifecycle & Financial Rules]`
- `backend/server/src/app.ts:3030-3180`
- `backend/server/src/services/dbRepository.ts`
- `backend/server/src/services/dbClient.ts`
- `backend/server/src/tests/booking011.test.ts`

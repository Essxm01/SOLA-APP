# Feature Specification: P1.5 Booking & Financial Summary Persistence Integrity

**Git Branch**: `pilot/spec-kit-p1-5-dry-run`
**Spec Directory**: `specs/001-p1-5-booking-persistence/`
**Created**: 2026-09-02
**Status**: Draft (Planning Dry Run)
**Macro Roadmap Phase**: PHASE 1 — التدقيق الشامل للبنية التحتية والبيانات الأساسية (Database Backbone & Persistence Integrity)
**Execution Boundary**: P1.5 — Booking and Financial-Summary Persistence Integrity
**Affected Role(s)**: BACKEND_ONLY (Read visibility across Customer, Owner, Admin APIs)

---

## 1. Executive Summary & Purpose

Ensure atomic, truthful, and fail-closed persistence of `bookings` and corresponding 1-to-1 `booking_financial_summaries` records across booking creation, price calculation, and Owner approval workflows in PostgreSQL and Cloudflare Worker REST compatibility layers.

---

## 2. Governing Authorities & References

- **Business Invariants**: `docs/BUSINESS_RULES.md` [§ Booking Lifecycle Rules, Pricing & Deposit Invariants]
- **Master Rules**: `docs/codex/KONFRM_MASTER_RULES.md` [MR-12: Stay bounds & availability; MR-13: Financial snapshot immutability; MR-14: Fail-closed honesty]
- **Architecture & Database**: `docs/DATABASE.md` [§ Booking/chat, Verified persistence constraints]
- **Execution Map**: `docs/codex/KONFRM_EXECUTION_MAP.md` [§ P1.5]

---

## 3. Scope & Non-Goals

### In Scope
- Atomic/transactional insertion of `bookings` and `booking_financial_summaries` on booking request.
- Mathematical and financial parity between quote calculation (`/calculate`) and persisted summary snapshot.
- Server-side validation of stay length limits (2–30 nights) and check-out > check-in.
- Worker REST adapter (`dbClient.ts`) query matching and strict HTTP error propagation for all booking/financial SQL.

### Explicit Non-Goals
- Payment gateway (Paymob) integration or webhook handling (deferred to Phase 10 / P10.1–P10.2).
- Wallet ledger release or payout processing (deferred to Phase 11 / P11.1–P11.3).
- Cancellation and refund saga execution (deferred to Phase 13 / P13.1–P13.2).
- Frontend UI alterations (Customer/Owner UI changes are handled in dedicated UX phases).

---

## 4. System Impact Summary

| Layer | Affected Systems / Files | Nature of Change |
| --- | --- | --- |
| **Frontend(s)** | N/A — backend persistence boundary | No UI components or layouts modified |
| **Backend API** | `backend/server/src/app.ts` | Harden `/customer/bookings` & `/calculate` persistence and error handling |
| **Data Layer** | `dbRepository.ts`, `dbClient.ts` | Atomic booking+financial write methods, Worker REST matchers |
| **Storage / Cloudflare** | N/A | No Storage buckets or Worker bindings touched |

---

## 5. User Scenarios & Acceptance Journeys *(mandatory)*

### User Story 1 — Atomic Booking & Financial Summary Creation (Priority: P1) 🎯 MVP

When a customer submits a valid booking request for an available property, the backend must atomically persist both the booking record and its immutable financial summary snapshot without relying on memory stores.

- **Why this priority**: Foundational invariant for booking and financial integrity across the platform.
- **Target Role**: Customer / System
- **Independent Test**: Submit valid booking request to `POST /api/v1/customer/bookings`; verify PostgreSQL/REST persists matching rows in `bookings` and `booking_financial_summaries`.

#### Acceptance Scenarios
1. **Given** a published/verified property and valid dates (e.g. 3 nights), **When** customer requests booking, **Then** backend persists `bookings` (status: `PENDING_OWNER_APPROVAL`) and `booking_financial_summaries` (base rate, fees, deposit, total) with HTTP 201 response.
2. **Given** a database insertion failure during financial summary write, **When** customer requests booking, **Then** transaction rolls back cleanly and returns HTTP 500 (`BOOKING_PERSISTENCE_FAILED`), never leaving an orphan booking.

---

### Additional User Stories

#### User Story 2 — Accurate Quote Calculation & Boundary Enforcement (Priority: P2)
- **Target Role**: Customer / System
- **Independent Test**: Call `POST /api/v1/customer/bookings/calculate` with invalid stay length (<2 or >30 nights) or conflicting dates.
- **Acceptance Scenario**: **Given** stay length of 1 night, **When** customer requests calculate, **Then** backend rejects with HTTP 400 (`MIN_STAY_NOT_MET`).

---

## 6. Role-Specific UX States

*N/A — backend-only persistence integrity boundary with no direct visual components changed.*

---

## 7. Requirements *(mandatory)*

- **FR-001**: System MUST atomically persist `bookings` row and linked `booking_financial_summaries` row with exact mathematical alignment (`nights * price_per_night + fees = total`).
- **FR-002**: System MUST enforce global stay duration bounds (min 2 nights, max 30 nights) and check-out > check-in.
- **FR-003**: System MUST derive `customerId` securely from authenticated JWT claims (`jwt.sub`).
- **FR-004**: Database failures MUST fail closed with HTTP 500 (`BOOKING_PERSISTENCE_FAILED` / `CALCULATION_FAILED`), never falling back to ephemeral in-memory state.

---

## 8. Open Founder Decisions & Blockers

- **FOUNDER_DECISION_REQUIRED**: NONE on product policy.
- **Predecessor Gate**: P1.4 (`Availability persistence and blocking integrity`) is an unresolved predecessor dependency. P1.5 implementation must branch from or incorporate published P1.4 baseline.

---

## 9. Measurable Success Criteria *(mandatory)*

- **SC-001**: Deterministic automated test suite (`backend/server/src/tests/booking01.test.ts` / `booking011.test.ts`) passes covering atomic creation, calculation arithmetic, stay length enforcement, and fail-closed errors.
- **SC-002**: Worker REST adapter parity verified for all `bookings` and `booking_financial_summaries` SQL queries.
- **SC-003**: Zero orphan bookings or partial writes on simulated database failures.

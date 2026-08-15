# Implementation Plan — FLOW-ADM-09: Disputes Queue, Operational Governance & Refund Saga

Implementation plan for **`FLOW-ADM-09 — Disputes Queue, Operational Governance & Refund Saga`**, executing the approved **Master Closed Contract 🔒** across Database Schema & Migrations, Backend API Endpoints, Domain Controllers, Provider Refund Adapter, Webhook Listener, Admin UI, and Automated Test Suite.

---

## Scope & Objective

Build and execute the complete **Disputes Execution Domain**:
- **Database Schema Migration (`009_flow_adm_09_disputes_execution.sql` & `schema.sql`)**:
  - `disputes` table expansion: Add `resolution_type` (`RELEASE_TO_OWNER`, `REFUND_GUEST`, `SPLIT`), `guest_refund_amount`, `owner_released_amount`, `admin_notes`, `resolved_by_admin_id`, `escalated_at`, `admin_sla_deadline_at`, `resolved_at`.
  - `guest_refund_sagas` table: `idempotency_key VARCHAR(100) UNIQUE NOT NULL` (`REFUND_SAGA_<dispute_id>`), partial unique index `idx_active_refund_saga_per_dispute`.
  - `refund_attempts` child table: `uk_saga_attempt_number UNIQUE (saga_id, attempt_number)`, `provider_idempotency_key UNIQUE NOT NULL` (`RFD-[dispute_number]-[attempt_number]`).
  - DB check constraints & triggers: `CHECK (guest_refund_amount + owner_released_amount <= frozen_amount)`, `ON DELETE RESTRICT` on evidence FK, and `prevent_dispute_evidence_mutation` trigger for append-only evidence.
- **Backend API Endpoints (`/api/v1/admin/disputes/*`)**:
  - `GET /api/v1/admin/disputes/pending`: FIFO deterministic queue ordering.
  - `GET /api/v1/admin/disputes/:id`: Detailed dispute, evidence, SLA, and financial hold inspection.
  - `POST /api/v1/admin/disputes/:id/request-evidence`: Transition to `WAITING_FOR_MORE_EVIDENCE`.
  - `POST /api/v1/admin/disputes/:id/resolve`: Resolve dispute using unified taxonomy (`RELEASE_TO_OWNER`, `REFUND_GUEST`, `SPLIT`). Require `adminNotes.length >= 20`.
  - `POST /api/v1/admin/disputes/:id/reconcile`: Server-authoritative status query against bank gateway using active attempt idempotency key.
- **Webhook Listener (`POST /api/v1/webhooks/disputes`)**: Signed HMAC check, `FOR UPDATE` row locks, replay protection, terminal state anti-reversal.
- **Admin UI (`admin-app/`)**: Implement `DisputeDetailExecution.tsx` with resolution modals, evidence timeline, SLA timers, and navigation.
- **Automated Test Suite (`disputesExecution.test.ts`)**: 25 comprehensive test cases covering all resolution flows, split sagas, retry attempts, idempotency keys, evidence immutability, and race condition protection.

---

## Execution Phases

### Phase 1: Database Migration
#### [NEW] [`backend/database/migrations/009_flow_adm_09_disputes_execution.sql`](file:///c:/Users/Essam/OneDrive/Desktop/YALLAH%20MASYAF/backend/database/migrations/009_flow_adm_09_disputes_execution.sql)
#### [MODIFY] [`backend/database/schema.sql`](file:///c:/Users/Essam/OneDrive/Desktop/YALLAH%20MASYAF/backend/database/schema.sql)

### Phase 2: Domain Controller & API Router
#### [MODIFY] [`backend/server/src/controllers/domainControllers.ts`](file:///c:/Users/Essam/OneDrive/Desktop/YALLAH%20MASYAF/backend/server/src/controllers/domainControllers.ts)
#### [MODIFY] [`backend/server/src/app.ts`](file:///c:/Users/Essam/OneDrive/Desktop/YALLAH%20MASYAF/backend/server/src/app.ts)

### Phase 3: Admin UI Component
#### [NEW] `admin-app/src/components/DisputeDetailExecution.tsx`
#### [MODIFY] `admin-app/src/components/DisputesQueue.tsx`

### Phase 4: Automated Test Suite & Full Regression
#### [NEW] [`backend/server/src/tests/disputesExecution.test.ts`](file:///c:/Users/Essam/OneDrive/Desktop/YALLAH%20MASYAF/backend/server/src/tests/disputesExecution.test.ts)
#### [MODIFY] [`backend/server/src/tests/runTests.ts`](file:///c:/Users/Essam/OneDrive/Desktop/YALLAH%20MASYAF/backend/server/src/tests/runTests.ts)

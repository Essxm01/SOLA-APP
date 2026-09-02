# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`
**Created**: [DATE]
**Status**: Draft
**Macro Roadmap Phase**: [e.g. PHASE 1 — Database Backbone / PHASE 3 — Calendar & Availability]
**Affected Role(s)**: [CUSTOMER | OWNER | ADMIN | BACKEND_ONLY]

---

## 1. Executive Summary & Purpose

[Describe the user-facing and business outcome delivered by this feature. What problem does this solve for the user and platform?]

---

## 2. Governing Authorities & References

<!--
  DO NOT copy entire catalogs of business rules. Reference exact document paths and sections.
-->
- **Business Invariants**: `docs/BUSINESS_RULES.md` [§ Section name / Rule ID]
- **Master Rules**: `docs/codex/KONFRM_MASTER_RULES.md` [MR-##]
- **Architecture / Database**: `docs/ARCHITECTURE.md`, `docs/DATABASE.md`
- **Design System Authority**: `DESIGN_SYSTEM/` [Design tokens / Component reference]
- **Durable Decisions**: `docs/DECISIONS.md` [DEC-## if applicable]

---

## 3. Scope & Non-Goals

### In Scope
- [Explicit boundary item 1]
- [Explicit boundary item 2]

### Explicit Non-Goals
- [What this feature explicitly does NOT touch or change, e.g. "Do not alter pricing/commission calculations"]
- [Out of scope systems or future phases]

---

## 4. System Impact Summary

| Layer | Affected Systems / Files | Nature of Change |
| --- | --- | --- |
| **Frontend(s)** | `customer-app/`, `owner-app/`, `admin-app/` | [UI flows, forms, modals] |
| **Backend API** | `backend/server/src/app.ts`, controllers | [Endpoints, validations, error codes] |
| **Data Layer** | `backend/database/`, `dbRepository.ts`, `dbClient.ts` | [Queries, REST matchers, tables] |
| **Storage / Cloudflare** | Storage buckets, Worker routes | [Upload intents, bindings, environment] |

---

## 5. User Scenarios & Prioritized Acceptance Journeys *(mandatory)*

<!--
  User stories MUST be prioritized (P1 = critical MVP, P2 = secondary, P3 = edge/enhancement).
  Each user story must be INDEPENDENTLY TESTABLE.
-->

### User Story 1 — [Core Journey Title] (Priority: P1) 🎯 MVP

[Plain language description of the primary user journey]

- **Why this priority**: [Business/user justification]
- **Target Role**: [Customer | Owner | Admin]
- **Independent Test**: [Exact procedure to verify this journey independently]

#### Acceptance Scenarios
1. **Given** [initial state], **When** [action taken], **Then** [expected truthful outcome]
2. **Given** [boundary/error state], **When** [action taken], **Then** [fail-closed honest error response]

---

### User Story 2 — [Secondary Journey Title] (Priority: P2)

[Plain language description of secondary journey]

- **Why this priority**: [Justification]
- **Target Role**: [Customer | Owner | Admin]
- **Independent Test**: [Verification procedure]

#### Acceptance Scenarios
1. **Given** [initial state], **When** [action taken], **Then** [expected outcome]

---

### User Story 3 — [Edge / Recovery Journey Title] (Priority: P3)

[Plain language description of edge or recovery journey]

- **Why this priority**: [Justification]
- **Independent Test**: [Verification procedure]

#### Acceptance Scenarios
1. **Given** [initial state], **When** [action taken], **Then** [expected outcome]

---

## 6. Role-Specific UX States *(required when UI is affected)*

| State | Customer App | Owner App | Admin App |
| --- | --- | --- | --- |
| **1. Ideal / Loaded** | [Active view content] | [Active dashboard/controls] | [Console tables/queues] |
| **2. Empty** | [Helpful empty guidance] | [Add unit/listing CTA] | [Empty queue indicator] |
| **3. Loading / Skeleton**| [Pulsing card skeleton] | [Table shimmer] | [Centered spinner/skeleton]|
| **4. Error + Retry** | [Arabic error banner + retry] | [Retry button + error code]| [Error alert with context] |
| **5. Partial / Auth** | [Guest login prompt] | [KYC/Role blocked state] | [Session expired modal] |

---

## 7. Functional Requirements *(mandatory)*

- **FR-001**: [Specific capability, e.g. "System MUST enforce 2-30 night stay length limits globally"]
- **FR-002**: [Specific capability, e.g. "Owner calendar unblock MUST reject dates with active bookings"]
- **FR-003**: [Data requirement, e.g. "Persistence failures MUST return HTTP 500 with descriptive error codes"]
- **FR-004**: [Authorization requirement, e.g. "Route MUST verify JWT role and derive ownerId from token subject"]

---

## 8. Open Founder Decisions & Blockers

<!--
  NEVER guess answers to ambiguous business, legal, financial, or architectural rules.
  Record unresolved questions here; mark as FOUNDER_DECISION_REQUIRED.
-->
- [NONE / Exact decision question required from Founder/Orchestrator before implementation]

---

## 9. Measurable Success Criteria

- **SC-001**: [e.g. 100% automated regression test coverage for all happy and error paths]
- **SC-002**: [e.g. Zero silent fallbacks or fake success on database query errors]
- **SC-003**: [e.g. Zero breaking schema changes; all Worker REST adapter queries tested]

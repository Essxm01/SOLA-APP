# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`
**Created**: [DATE]
**Status**: Draft
**Macro Roadmap Phase**: [PHASE N — exact canonical title from خطة عمل التطبيق.txt]
**Execution Boundary**: [e.g. P1.5 — optional task boundary identifier]
**Affected Role(s)**: [CUSTOMER | OWNER | ADMIN | BACKEND_ONLY | CROSS_ROLE]

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
- [What this feature explicitly does NOT touch or change]
- [Out-of-scope systems or future roadmap phases]

---

## 4. System Impact Summary

<!--
  Include only impacted systems/layers. Omit or mark N/A for untouched surfaces.
-->

| Layer | Affected Systems / Files | Nature of Change |
| --- | --- | --- |
| **Frontend(s)** | `customer-app/` / `owner-app/` / `admin-app/` *(or N/A)* | [UI flows, components, modals] |
| **Backend API** | `backend/server/src/app.ts`, controllers *(or N/A)* | [Endpoints, validations, error codes] |
| **Data Layer** | Migrations, `dbRepository.ts`, `dbClient.ts` *(or N/A)* | [Queries, REST matchers, tables] |
| **Storage / Cloudflare** | Storage buckets, Worker bindings *(or N/A)* | [Upload intents, bindings, env vars] |

---

## 5. User Scenarios & Acceptance Journeys *(mandatory)*

<!--
  Generate one or more prioritized, independently testable acceptance journeys as needed.
  Do NOT force artificial secondary/tertiary stories if the feature is a single cohesive increment.
-->

### User Story 1 — [Core Journey Title] (Priority: P1) 🎯 MVP

[Plain language description of the primary user journey / core capability]

- **Why this priority**: [Business/user justification]
- **Target Role**: [Customer | Owner | Admin | System]
- **Independent Test**: [Exact procedure to verify this journey independently]

#### Acceptance Scenarios
1. **Given** [initial state], **When** [action taken], **Then** [expected truthful outcome]
2. **Given** [boundary/error state], **When** [action taken], **Then** [appropriate fail-closed error response (4xx for validation/conflict, 5xx for system/DB failure)]

---

### Additional User Stories *(Optional — include only if feature contains distinct secondary journeys)*

#### User Story 2 — [Secondary Journey Title] (Priority: P2)
- **Independent Test**: [Verification procedure]
- **Acceptance Scenario**: **Given** [state], **When** [action], **Then** [outcome]

---

## 6. Role-Specific UX States *(Include if UI is affected; otherwise mark 'N/A — backend-only')*

<!--
  When UI is affected, specify truthful handling across the 5 standard states.
-->

| State | Customer App | Owner App | Admin App |
| --- | --- | --- | --- |
| **1. Ideal / Loaded** | [Active view content] | [Active dashboard/controls] | [Console tables/queues] |
| **2. Empty** | [Helpful empty guidance] | [Add unit/listing CTA] | [Empty queue indicator] |
| **3. Loading / Skeleton**| [Pulsing skeleton] | [Table shimmer] | [Centered spinner/skeleton]|
| **4. Error + Retry** | [Arabic error banner + retry] | [Retry button + error code]| [Error alert with context] |
| **5. Partial / Auth** | [Guest login prompt] | [KYC/Role blocked state] | [Session expired modal] |

*If no UI impact: "N/A — backend-only / infrastructure task with no user-facing visual changes."*

---

## 7. Functional Requirements *(mandatory)*

- **FR-001**: [Specific capability / rule]
- **FR-002**: [Specific capability / rule]
- **FR-003**: [Truthful error handling: 4xx for domain/validation conflicts, 5xx for database/dependency failures]
- **FR-004**: [Authorization: derive roles and identities server-side from JWT claims]

---

## 8. Open Founder Decisions & Blockers

<!--
  NEVER guess answers to ambiguous business, legal, financial, or architectural rules.
  Record unresolved questions here; mark as FOUNDER_DECISION_REQUIRED.
-->
- [NONE / Exact decision question required from Founder/Orchestrator before implementation]

---

## 9. Measurable Success Criteria

- **SC-001**: [Deterministic automated test verification for all in-scope acceptance and failure paths]
- **SC-002**: [Zero silent fallbacks or fake success on database query errors]
- **SC-003**: [Worker REST adapter parity verified for every touched SQL query]

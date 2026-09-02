# KONFRM Spec Kit Constitution

## Core Principles

### I. Founder & Product Authority (NON-NEGOTIABLE)
All agents operate under the strict authority hierarchy defined in `AGENTS.md` and `docs/codex/KONFRM_MASTER_RULES.md`:
1. Latest explicit Founder decision in active task/thread or dated decision record (`docs/DECISIONS.md`).
2. Explicit newer execution override in `tasks/CURRENT_TASK.md`.
3. Confirmed product rules in `KONFRM_MASTER_PROJECT_CONTEXT.md` and `docs/BUSINESS_RULES.md`.
4. Approved specification and design authority (`DESIGN_SYSTEM/`).
5. Genuinely verified live evidence.
6. Current code and database migrations (`backend/database/migrations/`).
7. Mocks, constants, legacy comments, and defaults.

Agents must never invent, assume, or silently modify product, pricing, booking, deposit, commission, payout, cancellation/refund, identity, role, or architecture rules. Any unresolved ambiguity or conflicting requirement must stop immediately and be flagged for Founder/orchestrator decision.

### II. Immutable Roadmap & Bounded Delivery
- The PHASE 0–22 macro roadmap (`خطة عمل التطبيق.txt` and `docs/codex/KONFRM_EXECUTION_MAP.md`) is immutable and governing.
- Execution proceeds strictly one approved, bounded task at a time.
- No agent may expand scope, unilaterally begin future phases, or introduce out-of-scope refactoring.

### III. Specification Before Implementation
- Before source code or migrations are modified, the active task must establish:
  - Exact objective and desired user/business outcome.
  - Authoritative document and section references.
  - Affected systems, frontends, backend routes, and database tables.
  - Non-negotiable domain rules and explicit non-goals.
  - Test and verification strategy.
- Progressive disclosure and hot context pointers must be used to keep context lean and prevent hallucination.

### IV. Multi-Agent Orchestration & Role Discipline
The Spec Kit workflow enforces dedicated agent roles to maximize throughput, quality, and quota efficiency:
- **ChatGPT**: Product & Technical Orchestrator; issues specifications, reviews evidence, decides open design choices, and coordinates execution phases.
- **Antigravity (`agy`)**: Primary lightweight executor, scout, broad codebase tracer, mechanical bootstrapper, test/regression verifier, and CI/evidence collector.
- **ZCode (`zcode`)**: Primary heavy implementation engineer for complex backend logic, SQL queries, database migrations, multi-file refactors, and deep debugging.
- **Codex (`codex`)**: Scarce final review authority and publication gatekeeper; invoked only on final exact candidate heads, never as a routine exploratory implementer.
- **Single-Writer Rule**: Only one active repository writer operates on a branch or worktree at any given time. Parallelism is permitted solely for read-only scouting or isolated checks.

### V. Business & Data Integrity
- Supabase PostgreSQL is the sole persistence source of truth (`docs/DATABASE.md`).
- The Cloudflare Worker SQL-to-Supabase REST compatibility layer (`backend/server/src/services/dbClient.ts`) is narrow and strict; all touched queries must have exact REST mappings and be tested.
- Persistence failures must fail honestly and fail closed (HTTP 5xx with descriptive error codes); database outages must never masquerade as 404, 403, empty arrays, zero metrics, or synthetic success.
- Cross-app and data-layer side effects (Customer, Owner, Admin, Worker, Database) must be analyzed prior to modifying shared models or endpoints.

### VI. Evidence-Based Verification Before Closure
- Passing local builds or CI alone does not constitute proof of feature completion.
- Task closure requires:
  1. Full compliance with the governing task contract.
  2. Targeted unit and behavioral tests exercising happy, boundary, and failure paths.
  3. Non-regression proof across related subsystems.
  4. Exact Git SHA, branch, and CI workflow run evidence.
  5. Live read-only verification where deployment-sensitive behavior is involved.
- An agent's self-assertion is evidence to be evaluated, not self-authorizing closure.

### VII. Live Mutation & Publication Boundaries
- Database migrations, production Cloudflare Worker deployments, live Supabase/Storage mutations, and `main` branch merges require explicit Founder authorization and phase-specific approval gates.
- Exact reviewed and verified Git commit SHAs must be preserved through publication (e.g. via lease-protected validation pushes).

### VIII. Role-Specific UX Quality & Design Integrity
- Customer, Owner, and Admin frontends represent distinct operational roles and must adhere to the design language in `DESIGN_SYSTEM/`:
  - Blue `#0059FF`, sparing yellow `#FFD700`, neutral slate `#F5F7FA`, Arabic-first RTL layout, Cairo typography.
  - Mobile-first UX for Customer and Owner; desktop operational console for Admin.
- Every user-facing view must truthfully handle and present the five standard UI states: Ideal/Loaded, Empty, Loading/Skeleton, Error with Retry, and Partial/Unauthorized.

### IX. Quota & Context Efficiency
- Avoid repetitive, bulk re-reading of large historical repository documents.
- Use fresh task sessions with targeted hot-context files, compressed scout summaries, and focused error snippets.
- Prioritize deterministic local scripts and targeted tests before invoking expensive model passes.

## Governance

This Constitution serves as an operational execution standard below the existing KONFRM authority hierarchy. It does not supersede or alter Founder directives, Master Rules (`docs/codex/KONFRM_MASTER_RULES.md`), Business Invariants (`docs/BUSINESS_RULES.md`), or Architectural Decisions (`docs/DECISIONS.md`).

Any amendment to this constitution requires an explicit Founder-authorized task contract.

**Version**: 1.0.0 | **Ratified**: 2026-09-02 | **Last Amended**: 2026-09-02

# P2.3 — Owner API Contract (External Active Candidate)

TASK_ID: P2.3
ROADMAP_PHASE: PHASE_2
ROUTING_STATE: EXTERNAL_CANDIDATE_OPEN
CANDIDATE_BRANCH: implementation/p2-3-owner-api-contract
PR: #14
BASE_MAIN_SHA: baecc9f7f9c16aafa1954ddf7aa6e3cead5c757a
CURRENT_HEAD_AT_LAST_SYNC: 6eec3203116a63402a91cb88e103feaa45a1fcf1
CANONICAL_TASK_STATE: read tasks/CURRENT_TASK.md and task contract from the candidate branch

## Routing rules & branch-aware reality

- **Candidate branch owns implementation state:** The `implementation/p2-3-owner-api-contract` branch owns the canonical task contract, executor designation, and detailed step-by-step progress.
- **Main routing role:** This file on `main` acts strictly as an execution router to the external candidate branch; it must not duplicate or override branch-local task metadata.
- **Informational head SHA:** `CURRENT_HEAD_AT_LAST_SYNC` records the verified candidate commit at the time this router was synchronized. It is informational and may advance during active candidate iterations. Before taking action, agents must refresh GitHub and branch reality (`git rev-parse origin/implementation/p2-3-owner-api-contract`).
- **Unpublished candidate boundary:** P2.3 is an external, unmerged candidate. It must **NOT** be treated as `CLOSED`, `PUBLISHED`, or `LIVE_VERIFIED` on `main` until PR #14 passes all closure gates, review, and is formally merged into `main`.
- **No execution of unmerged code:** Code on `main` reflects only merged baseline behavior and must not execute candidate P2.3 code as though it is already merged.
- **Governance layer status:** The durable Brain Sync governance layer (tooling task BS-02 / PR #15) is completed upon merge and is no longer an active implementation task.

## Hard boundaries preserved

- Zero product code changes in governance/tooling merges.
- No database migrations, schemas, or RPCs touched without explicit phase authorization.
- No unapproved live mutations to Supabase, Cloudflare, or Storage.
- No changes to business, booking, availability, or financial formulas.
- Following P2.3 closure, subsequent work executes according to `KONFRM_EXECUTION_DEPENDENCY_ORDER.md` leading directly to Phase 3 (Owner → Admin → Renter Vertical Slice).

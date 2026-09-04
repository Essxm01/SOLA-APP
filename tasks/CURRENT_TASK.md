# P2.3 — Owner API Contract (Active Candidate)

TASK_ID: P2.3
ROADMAP_PHASE: PHASE_2
STAGE: CANDIDATE_REVIEW_IN_PROGRESS
EXECUTOR: Antigravity / Codex
BRANCH: implementation/p2-3-owner-api-contract (PR #14)
BASE_MAIN_SHA: baecc9f7f9c16aafa1954ddf7aa6e3cead5c757a
STARTING_CANDIDATE_SHA: 9d6109ccd6045f9364b957702583860e475abf43
LATEST_CANDIDATE_SHA: 6eec3203116a63402a91cb88e103feaa45a1fcf1
TASK_CONTRACT: tasks/P2_3_OWNER_API_CONTRACT.md (branch-local to implementation/p2-3-owner-api-contract)

## Current routing

The durable Brain Sync governance layer (tooling task BS-02) is complete and no longer active after merge.

Product execution is currently locked to **P2.3 (Owner API Contract)**, which is undergoing Bridge review and closure verification on isolated branch `implementation/p2-3-owner-api-contract` (PR #14).

### Main-merge safety & branch-aware reality:
- **`main` published baseline:** `baecc9f7f9c16aafa1954ddf7aa6e3cead5c757a`.
- **P2.3 status:** Candidate only. P2.3 must **NOT** be called `CLOSED`, `PUBLISHED`, or `LIVE_VERIFIED` on `main` until PR #14 passes all closure gates, review, and is formally merged into `main`.
- **Branch-local contract:** The exact P2.3 task contract (`tasks/P2_3_OWNER_API_CONTRACT.md`) resides locally on branch `implementation/p2-3-owner-api-contract` and is not tracked on `main`.
- **No execution of unmerged code:** Code on `main` reflects only merged baseline behavior and must not execute candidate P2.3 code as though it is already merged.

## Hard boundaries preserved

- Zero product code changes in governance/tooling merges.
- No database migrations, schemas, or RPCs touched without explicit phase authorization.
- No unapproved live mutations to Supabase, Cloudflare, or Storage.
- No changes to business, booking, availability, or financial formulas.
- Following P2.3 closure, subsequent work executes according to `KONFRM_EXECUTION_DEPENDENCY_ORDER.md` leading directly to Phase 3 (Owner → Admin → Renter Vertical Slice).

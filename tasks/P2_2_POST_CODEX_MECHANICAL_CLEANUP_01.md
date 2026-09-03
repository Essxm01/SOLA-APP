# P2.2 — Post-Codex Mechanical Cleanup 01

## Purpose

Resolve the single verified Minor finding from the exact-head Codex final review: `git diff --check` reports whitespace errors in the P2.2 candidate. This is a mechanical cleanup only. No semantic, runtime, schema, API, UI, test-logic, business-rule, or architecture changes are authorized.

## Exact state

- Repository: `Essxm01/SOLA-APP`
- Base main SHA: `198a00ea39083932012f54144f93fb7516204024`
- Candidate branch: `validation/p2-2-rc`
- Starting candidate SHA: `f711d0cbbcc5654cb77e91e000c7c7aedb9ed3f9`
- PR: `#12`
- Exact-head CI before cleanup: Run `#177`, ID `33785956671`, SUCCESS; Worker deploy skipped.
- Codex final review: no Critical/Important findings; one Minor whitespace finding.

## Required procedure

1. Fetch origin and verify exact SHAs. Stop on mismatch.
2. On an isolated workspace for `validation/p2-2-rc`, run exactly:
   `git diff --check 198a00ea39083932012f54144f93fb7516204024...HEAD`
3. Record every reported path/line as RED evidence.
4. Fix only the whitespace errors reported by that command:
   - trailing spaces/tabs;
   - whitespace-only blank lines;
   - extra blank lines at EOF if reported.
5. Do not reword docs, reorder imports, format unrelated code, change comments, alter SQL, change test assertions, or touch logic.
6. Run the same `git diff --check` again and require zero output / exit 0.
7. Run focused safety checks:
   - `npm --prefix backend run check`
   - `npm --prefix backend run test:p2-2-renter-api`
   - `npm --prefix customer-app run test:truthful-state`
   - `npm --prefix customer-app run build`
8. Verify the delta from `f711d0c...` to final SHA contains whitespace-only changes. No token/content change other than whitespace is allowed.
9. Commit once with message: `chore(p2-2): clear diff-check whitespace`
10. Push only `validation/p2-2-rc`.

## Stop conditions

Stop and report instead of editing if:
- `origin/main` moved from the exact base;
- candidate head differs from the exact starting SHA before your work;
- PR #12 is merged/closed unexpectedly;
- `git diff --check` reports an issue that would require semantic content change;
- any non-whitespace change appears necessary;
- any live migration/deploy/Supabase/Storage/main mutation is proposed.

## Prohibited

- no PR creation (PR #12 already exists)
- no merge
- no deploy
- no Migration 028 application
- no Supabase/Storage mutation
- no push to main
- no force-push
- no semantic code or documentation edits
- no dependency/CI changes

## Required report

Return exactly:

```text
RESULT: P2_2_POST_CODEX_MECHANICAL_CLEANUP_01_PASS | P2_2_POST_CODEX_MECHANICAL_CLEANUP_01_BLOCKED
START_SHA: f711d0cbbcc5654cb77e91e000c7c7aedb9ed3f9
FINAL_SHA: <sha>
BASE_SHA: 198a00ea39083932012f54144f93fb7516204024
PR: 12
RED_DIFF_CHECK:
- <path:line: message>
CHANGED_PATHS:
- <path>
DELTA_CLASSIFICATION: WHITESPACE_ONLY | NOT_WHITESPACE_ONLY
AUTOMATED_GATES:
- git diff --check 198a00ea39083932012f54144f93fb7516204024...HEAD: PASS|FAIL
- npm --prefix backend run check: PASS|FAIL
- npm --prefix backend run test:p2-2-renter-api: PASS|FAIL
- npm --prefix customer-app run test:truthful-state: PASS|FAIL
- npm --prefix customer-app run build: PASS|FAIL
LIVE_MUTATIONS: NONE
DEPLOYMENT: NONE
MERGE: NONE
UNRESOLVED:
- NONE | <blocker>
```

Do not call P2.2 closed or publication-ready. A new exact-head CI and Codex delta rereview are required after this SHA change.
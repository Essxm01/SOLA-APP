# KONFRM Spec Kit Pilot — Setup Contract

TASK_ID: SPEC-KIT-PILOT-SETUP-01
STAGE: INSTALL_AND_INITIALIZE
EXECUTOR: ANTIGRAVITY
WRITER: ANTIGRAVITY_ONLY
BRANCH: infra/spec-kit-pilot
BASE_MAIN_SHA: fb38414d9076f89083bdc680e48e1a0b0329be06
LIVE_MUTATION: FORBIDDEN
CODEX: FORBIDDEN
ZCODE: FORBIDDEN

## Objective
Install the official GitHub Spec Kit toolkit in the KONFRM repository on an isolated branch, initialize the Antigravity integration only, inspect exactly what it adds, and stop before any KONFRM-specific customization or adoption decision.

This task MUST NOT touch PR #5, `validation/p1-4-rc`, `main`, Supabase, Cloudflare, Storage, business rules, product logic, or application code.

## Official source
Use only the official upstream project:
`https://github.com/github/spec-kit`

Pin the initial installation to release:
`v1.0.3`

Do not install from forks.

## Safety / Git gate
Before doing anything:
1. Fetch origin.
2. Verify `origin/main == fb38414d9076f89083bdc680e48e1a0b0329be06`.
3. Verify `origin/infra/spec-kit-pilot` contains the exact handoff SHA supplied in the launcher.
4. Switch only to `infra/spec-kit-pilot`.
5. Confirm the worktree is clean apart from any explicitly known unrelated local-only file; do not touch unrelated files.
6. Do not checkout or modify `validation/p1-4-rc`.

If any mismatch exists, STOP with `SPEC_KIT_HANDOFF_MISMATCH`.

## Step A — prerequisite inspection
Read only what is needed. Check:
- Windows environment.
- Python version; Spec Kit requires Python 3.11+.
- `uv` availability.
- whether `specify` is already installed and its version.
- whether `.specify/` already exists.
- whether Spec Kit-managed Antigravity integration files already exist.

Do not install or upgrade unrelated tooling.

If Python 3.11+ is missing, STOP and report `PYTHON_PREREQUISITE_MISSING`.

If `uv` is missing, prefer a user-level official `uv` installation. Do not change system-wide package managers or require administrator rights. If that cannot be done safely, STOP and report exactly what is missing.

## Step B — install official Specify CLI
Use the official persistent source install pinned to v1.0.3:

`uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.0.3`

If an older/different `specify-cli` already exists, do not silently overwrite it. Inspect and report first; upgrade/reinstall only if it is clearly safe and scoped to this user-level tool.

Verify:
- `specify version`
- `specify integration list`

Record the actual installed version and confirm the `agy`, `zcode`, and `codex` integrations are listed. Do not initialize zcode/codex yet.

## Step C — initialize Spec Kit in this existing repository
Initialize only the Antigravity integration in the CURRENT repository.

Because this is an existing non-empty Windows project, use the official current-directory initialization with PowerShell scripts and an explicit integration. Before using `--force`, inspect for any existing Spec Kit-managed files that could be overwritten.

Expected command shape:
`specify init --here --force --integration agy --script ps`

Use `--ignore-agent-tools` only if the CLI refuses initialization solely because it cannot detect Antigravity while Antigravity itself is clearly the active executor. Do not use it for other failures.

Do not add the git extension, presets, bundles, community extensions, workflows, zcode integration, or codex integration in this task.

## Step D — inspect generated repository diff
After initialization:
1. Run `git status --short`.
2. List all newly added/modified paths.
3. Verify application source, backend source, migrations, CI workflows, product docs, business rules, and P1.4 files were not changed by Spec Kit initialization.
4. Inspect the generated `.specify/` structure and Antigravity integration structure only enough to confirm they are normal Spec Kit infrastructure.
5. Do not edit generated templates yet.

Expected categories include Spec Kit infrastructure such as `.specify/` plus Antigravity skill/integration files. Exact paths must come from the installed version; do not invent them.

If initialization modifies unrelated existing project files, STOP without committing and report `UNEXPECTED_SPEC_KIT_OVERWRITE` with exact paths.

## Step E — local verification
Run read-only verification appropriate to Spec Kit itself, including:
- `specify version`
- `specify integration list`
- if available in this release, `specify integration status`
- `git diff --check`

Do not run the entire KONFRM build/test matrix for this infrastructure-only bootstrap unless generated files unexpectedly touch build inputs.

## Step F — commit / push gate
If and only if the generated diff is clean and infrastructure-only:
1. Commit all intended Spec Kit bootstrap files plus this setup contract as one logical setup commit on `infra/spec-kit-pilot`.
2. Do not squash or rewrite `main` history.
3. Push only `infra/spec-kit-pilot`.
4. Do NOT open or merge a PR yet unless explicitly instructed later.

Suggested final commit message:
`chore(spec-kit): bootstrap isolated KONFRM pilot`

## Forbidden
- no edits to application/backend business logic
- no database migration
- no live Supabase/Storage/Cloudflare changes
- no deployment
- no push to main
- no merge
- no PR #5 edits
- no Spec Kit constitution yet
- no Spec Kit feature/spec generation yet
- no zcode/codex integration yet
- no presets/extensions/bundles/workflows yet
- no roadmap/business-rule changes

## Stop gate
Return a compact report only after either safe bootstrap completion or a precise blocker.

Required report:

`KONFRM SPEC KIT SETUP REPORT`

Include:
- verified branch + starting handoff SHA
- Python version
- uv status/version
- specify version/source pin
- integrations detected (`agy`, `zcode`, `codex`)
- exact init command used
- generated/modified path summary
- unexpected overwrite check
- verification results
- final commit SHA if committed
- pushed branch state
- live mutation: NONE
- final status: `SPEC_KIT_BOOTSTRAP_READY_FOR_REVIEW` or `BLOCKED_<reason>`

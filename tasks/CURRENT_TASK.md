# Current Task

**Status:** In progress — returning Owner bootstrap follow-up

## Objective

Remove the two consecutive technical loading pages shown to returning Owners on hard refresh, without weakening canonical Owner validation or changing the accepted Owner Home.

## Context

The existing Owner Home visual migration remains the target visual language. A candidate session must render only a neutral, data-free launch shell until canonical Owner validation succeeds; Home then owns its layout-matching data skeleton.

## Requirements

- Never treat a stored token/localStorage identity as authenticated.
- Keep `AppProvider key={owner.id}` below the validated canonical Owner boundary.
- Do not show the full-screen `جاري التحقق من الحساب…` or `جاري تحميل بيانات حساب المالك…` pages on normal returning launch.
- Keep first-run Splash/onboarding, Login, logout, and KYC routing unchanged.

## Relevant Areas

- `owner-app/src/App.tsx`, `owner-app/src/components/ui/LoadingSkeleton.tsx`
- `owner-app/src/components/layout/BottomNavigation.tsx`, `owner-app/src/utils/ownerBootstrap.ts`
- `DESIGN_SYSTEM/EXPERIENCE/OWNER_EXPERIENCE.md`

## Constraints

Follow `../AGENTS.md`, [DESIGN_SYSTEM.md](../docs/DESIGN_SYSTEM.md), and [BUSINESS_RULES.md](../docs/BUSINESS_RULES.md). No backend/database/migration changes; no production writes.

## Acceptance Criteria

- Returning authenticated hard refresh presents neutral launch shell → Home skeleton → canonical Home.
- Invalid session presents neutral launch shell → Login, with no personal-data flash.
- Owner build and focused tests pass; Pages deployment and repeated live hard-refresh review complete.

## Validation

Run Owner focused tests, typecheck/build, design check, then verify repeated hard refreshes of a valid live Owner session. No production mutation.

## Documentation Impact

Update `docs/CURRENT_STATE.md` only if the completed bootstrap behavior materially changes the handoff state.

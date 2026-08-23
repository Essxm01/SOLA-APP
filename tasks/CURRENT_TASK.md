# Current Task

**Status:** In progress — OWNER-HOME-01

## Objective

Migrate the Owner Home and header to the approved action-first KONFRM experience without altering Owner navigation, identity, booking, property, payment, or wallet business rules.

## Context

The Home must answer what needs action now, then show relevant booking context, compact property health, and canonical available/pending wallet balances. Failed wallet reads must never look like zero.

## Requirements

- Derive attention from `PENDING_OWNER_APPROVAL` bookings only.
- Derive upcoming context from future `CONFIRMED` check-ins only.
- Use `OwnerWallet.availableBalance` and `pendingBalance` directly; do not use legacy metrics aliases.
- Remove fake promotion, fake renter-avatar, and legacy visible SOLA Home copy.

## Relevant Areas

- `owner-app/src/components/dashboard/`, `owner-app/src/components/layout/HeaderBar.tsx`
- `owner-app/src/context/AppContext.tsx`, `owner-app/src/utils/ownerHome.ts`
- `DESIGN_SYSTEM/EXPERIENCE/OWNER_EXPERIENCE.md`

## Constraints

Follow `../AGENTS.md`, [DESIGN_SYSTEM.md](../docs/DESIGN_SYSTEM.md), and [BUSINESS_RULES.md](../docs/BUSINESS_RULES.md). No backend/database/migration changes; no production writes.

## Acceptance Criteria

- Action-first hierarchy, truthful empty/error/loading states, compact canonical data.
- No dark finance hero, fake metrics/actions/data, or raw legacy branding in touched Home/Header surfaces.
- Owner build and focused derivation tests pass; Pages deployment and read-only live review complete.

## Validation

Run Owner focused tests, typecheck/build, design check, then verify the deployed Owner Pages Home with existing canonical Owner data. No production mutation.

## Documentation Impact

Update `docs/CURRENT_STATE.md` if the visible Home migration materially changes the handoff state, then mark this task complete.

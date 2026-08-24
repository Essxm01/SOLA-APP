# Current Task

**Status:** In progress — Owner Bookings UX and truthful-state migration

## Objective

Rebuild the Owner Bookings screen around truthful requests, active bookings, and history without changing booking, payment, cancellation, or chat business rules.

## Context

The accepted Owner Home is the visual baseline. Current Bookings incorrectly groups approved/unpaid and expired entries as new requests, exposes legacy financial language, and closes action sheets after a failed write.

## Requirements

- Keep `PENDING_OWNER_APPROVAL` as the only request-decision state.
- Present `APPROVED_PENDING_PAYMENT` and future/current `CONFIRMED` bookings as active; past confirmed and inactive outcomes as history.
- Use canonical booking/financial data; never fabricate financial values, remaining-balance method, guest identity, or booking success.
- Failed booking/cancellation writes must keep the confirmation sheet open with a retryable error.

## Relevant Areas

- `owner-app/src/components/bookings/BookingsFoundationView.tsx`
- `owner-app/src/utils/ownerBookings.ts`, `owner-app/src/context/AppContext.tsx`
- Owner booking repository/API contracts and `DESIGN_SYSTEM/EXPERIENCE/OWNER_EXPERIENCE.md`

## Constraints

Follow `../AGENTS.md`, [DESIGN_SYSTEM.md](../docs/DESIGN_SYSTEM.md), and [BUSINESS_RULES.md](../docs/BUSINESS_RULES.md). No backend/database/migration changes; no production writes or real booking decisions.

## Acceptance Criteria

- Three clear Arabic segments: الطلبات / الحجوزات / السجل.
- Human Arabic dates/statuses and no visible legacy SOLA or technical financial claims in Bookings.
- Owner build/focused tests pass; live read-only review and Founder visual screenshot handoff complete.

## Validation

Run Owner Bookings/Home/identity focused tests, typecheck/build, and design check; verify live read-only booking rendering at mobile widths. No production mutation.

## Documentation Impact

Update `docs/CURRENT_STATE.md` only if the completed booking UX materially changes the handoff state.

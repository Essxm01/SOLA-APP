# Legacy UI drift inventory

Static inventory created for Design System v2.0.0. This is a migration backlog, **not** a permission to preserve or repeat these patterns. Counts are anti-drift scanner findings; a gradient utility can register both as a dark-surface utility and a decorative-gradient finding.

| Area | P0 | P1 | P2 | Total |
|---|---:|---:|---:|---:|
| Customer | 12 | 1 | 201 | 214 |
| Owner | 35 | 4 | 259 | 298 |
| Admin | 5 | 1 | 136 | 142 |
| **Total** | **52** | **6** | **596** | **654** |

Severity: **P0** violates an approved brand foundation; **P1** is a major cross-screen inconsistency; **P2** is a migration cleanup item. Counts are frozen in [`LEGACY_EXCEPTIONS.json`](./LEGACY_EXCEPTIONS.json) so newly added occurrences fail `npm run design:check`.

## GLOBAL

- **P0:** Prior documentation promoted Owner-derived SOLA design authority and dark/glass headers. Superseded by v2.0.0; application implementations remain to be migrated.
- **P1:** Each app has its own local UI component set and status mapping. Component contracts now exist centrally, but implementations remain duplicated.
- **P1:** Three global app stylesheets and the Owner export engine contain direct `font-family` declarations. Cairo must be verified/normalized during app migration, not copied into another local font system.
- **P2:** 596 raw-hex occurrences across app source bypass a semantic token source. They are baselined until each affected slice adopts generated tokens.

## CUSTOMER

- **P0 — 12 findings:** dark `bg-slate-900`/`bg-slate-950` surfaces in booking detail/success, search, authentication, profile/support/wallet modals, property detail/card and the main booking surface.
- **P1 — 1 finding:** direct global font-family declaration in `src/index.css`.
- **P2 — 201 findings:** raw hex use and locally assembled control/status styling across discovery, booking, profile and support components.

## OWNER

- **P0 — 35 findings:** navy dashboard/wallet/profile/property/booking surfaces and dark blue/slate gradients. The Wallet and dashboard-style blocks are priority candidates for a later controlled migration; this task does not change them.
- **P1 — 4 findings:** direct font-family declarations in `src/index.css` and the export engine; duplicated local Button, Card, Badge, BottomSheet, Input and mobile-shell implementations.
- **P2 — 259 findings:** raw hex values, locally varied rounded/text utility values and per-screen status/UI styling.

## ADMIN

- **P0 — 5 findings:** dark slate/blue surfaces in queue/review UI.
- **P1 — 1 finding:** direct global font-family declaration in `src/index.css`; separate `ui/` Button, Card, Input, Modal, Badge and state-view implementations.
- **P2 — 136 findings:** raw hex colours and local component style duplication.

## Recommended next migration slice

Migrate **Owner Wallet presentation only** first: it has a focused, data-correct canonical financial read path and the most concentrated rejected dark-surface pattern. Consume generated tokens and central Card/Status/State contracts; do not change financial logic. Then move to Owner dashboard/property shell, Customer booking/payment, and Admin property review in controlled slices.

# KONFRM Design System Governance

**Current version:** `2.1.0`
**Status:** active governance contract; approved foundations and explicitly labelled implementation defaults are distinct.

## Authority model

`DESIGN_SYSTEM/` governs Customer, Owner and Admin. No app is a visual or product-experience authority, including Owner. A production screen cannot promote its own one-off colour, component, typography, radius, shadow, gradient, navigation or interaction pattern into the global system.

When code and the design system disagree, the design system wins. A genuinely new requirement follows: **propose → central approval → central documentation/token → version → app consumption**. Never reverse this order.

## Founder/Product authority

Product-level visual decisions are Founder/Product decisions. Coding agents may implement approved tokens and variants, identify drift, and recommend additions. They may not independently:

- create brand colours or global component styles;
- change Cairo or introduce another primary UI family;
- promote a one-off screen treatment into the system;
- introduce a new radius or shadow family, decorative gradients, or new role-UX principles.

The v2 approved foundations are listed in [`README.md`](./README.md). Exact component dimensions and neutral tones marked as implementation defaults are technical defaults, not retrospective Founder approval; changes to them follow this governance process.

## Versioning

- **PATCH** — clarification, documentation correction, or nonvisual generation/check fix.
- **MINOR** — approved new token/component variant or formal cross-role experience governance layer.
- **MAJOR** — brand or foundational visual architecture change.

Version `2.0.0` is a major change because authority moved from an Owner-derived SOLA extraction to independent KONFRM governance. Version `2.1.0` adds formal role-specific experience governance without changing the visual foundations. Releases are recorded in [`CHANGELOG.md`](./CHANGELOG.md).

## Enforcement

Run `npm run design:generate` after modifying canonical tokens, then `npm run design:check`. The check validates tokens and flags new raw hexes, forbidden dark-surface utility patterns and font-family declarations outside the committed legacy baseline. The baseline is debt inventory, not permission for new drift. Remove exceptions as screens migrate.

## Review checklist

- Is the addition needed by more than one screen or role?
- Does a token/component already solve it?
- Are RTL, loading, empty, error, disabled, selected and focus states specified?
- Is Customer financial privacy preserved?
- Does it stay light-first and avoid navy slabs, decorative gradients and glow?
- Is the version bump and changelog entry appropriate?

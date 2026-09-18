# KONFRM Design System Governance

**Current version:** 2.2.0
**Status:** active governance contract; approved foundations and explicitly labelled implementation defaults are distinct.

## Authority model

DESIGN_SYSTEM/ governs Customer, Owner and Admin. No app is a visual or product-experience authority, including Owner. A production screen cannot promote its own one-off colour, component, typography, radius, shadow, gradient, navigation or interaction pattern into the global system.

Within an approved visual/product-experience contract, when code and the design system disagree, the design system wins. A newer explicit Founder/Product decision and the KONFRM governing source-precedence rule take priority over this directory; reconcile that decision centrally before app implementation. A genuinely new requirement follows: **propose → central approval → central documentation/token → version → app consumption**. Never reverse this order.

## Founder/Product authority

Product-level visual decisions are Founder/Product decisions. Coding agents may implement approved tokens and variants, identify drift, and recommend additions. They may not independently:

- create brand colours or global component styles;
- change Cairo or introduce another primary UI family;
- promote a one-off screen treatment into the system;
- introduce a new radius or shadow family, decorative gradients, or new role-UX principles.

The v2 approved foundations are listed in README.md. Exact component dimensions and neutral tones marked as implementation defaults are technical defaults, not retrospective Founder approval; changes to them follow this governance process.

Existing apps commonly use Lucide React. This is implementation evidence, not a new Founder-approved icon-family mandate; retain consistency in a touched surface and do not start a project-wide icon migration without explicit approval.

## Versioning

- **PATCH** — clarification, documentation correction, or nonvisual generation/check fix.
- **MINOR** — approved new token/component variant or formal cross-role experience governance layer.
- **MAJOR** — brand or foundational visual architecture change.

Version 2.0.0 is a major change because authority moved from an Owner-derived SOLA extraction to independent KONFRM governance. Version 2.1.0 adds formal role-specific experience governance without changing the visual foundations. Versions 2.1.1 and 2.1.2 are Founder decision-state patches only; they change no runtime behavior or visual foundation. Version 2.2.0 adds the Founder-authorized Design Lab vision and current Customer Phase 5 UX contracts without changing runtime business logic or canonical tokens. Releases are recorded in CHANGELOG.md.

## Enforcement

Run npm run design:generate after modifying canonical tokens, then npm run design:check. The check validates tokens and flags new raw hexes, forbidden dark-surface utility patterns and font-family declarations outside the committed legacy baseline. The baseline is debt inventory, not permission for new drift. Remove exceptions as screens migrate.

## Review checklist

- Is the addition needed by more than one screen or role?
- Does a token/component already solve it?
- Are RTL, loading, empty, error, disabled, selected and focus states specified?
- Is Customer financial privacy preserved?
- Does it stay light-first and avoid navy slabs, decorative gradients and glow?
- Is the version bump and changelog entry appropriate?

## Design Lab guidance and preservation

The UI/UX Design Lab is the design-authority layer for the Phase 4–7 program inside the boundaries above. Founder-authorized Design Lab guidance is documented centrally rather than being copied ad hoc into application code.

The current cross-role design vision lives in DESIGN_LAB_VISION.md. Customer screen architecture lives in EXPERIENCE/CUSTOMER_PHASE5_MASTER_UX.md.

Design documentation is additive: do not erase historical audit, legacy drift, previous decision or implementation evidence simply because a newer design direction exists. New guidance supersedes older guidance only where explicitly stated. Business, finance, booking, permission, privacy, database and architecture changes still require their own authority.

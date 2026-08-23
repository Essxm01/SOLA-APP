# Experience governance

Applications consume this experience system; no app is an experience authority. Current screens are evidence of reality, not automatic target design.

## One product family, three role-specific experiences

ONE KONFRM Design System governs Customer, Owner and Admin. They share the brand, tokens, typography, spacing, component behavior, status semantics, accessibility and loading/error/empty principles.

**Consistency does not mean identical experience.** Information hierarchy, navigation, density, page composition, control prominence, contextual actions, visible data and workflow emphasis adapt to each role's job. The applications should visibly belong to one KONFRM product family without becoming copies of one another.

## Approval boundary

Only established project rules are `APPROVED_EXISTING`. New navigation changes, entry behavior, screen priorities and interaction patterns remain `RECOMMENDED` or `NEEDS_FOUNDER_DECISION` until Founder review. Approved decisions are recorded in `DECISIONS.json`; they define future implementation direction and never alter business rules by themselves.

## Required sequence

1. Audit the current user job and canonical state constraints.
2. Use the information-architecture template and role visibility matrix.
3. Identify one clear primary action and relevant secondary actions.
4. Specify loading, empty, error, offline, disabled and success states.
5. Record a decision and version documentation when a reusable rule changes.
6. Implement one controlled slice only after approval.

No experience change may expose a capability that backend/state rules do not support, turn a failure into an empty state, or make an internal concept prominent to the wrong role.

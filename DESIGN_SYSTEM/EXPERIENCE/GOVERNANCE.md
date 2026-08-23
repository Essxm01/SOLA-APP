# Experience governance

Applications consume this experience system; no app is an experience authority. Current screens are evidence of reality, not automatic target design.

## Approval boundary

Only established project rules are `APPROVED_EXISTING`. Navigation changes, exact entry behavior, screen priorities and new interaction patterns are `RECOMMENDED` or `NEEDS_FOUNDER_DECISION` until Founder review. Recommendations never alter business rules.

## Required sequence

1. Audit the current user job and canonical state constraints.
2. Use the information-architecture template and role visibility matrix.
3. Identify one clear primary action and relevant secondary actions.
4. Specify loading, empty, error, offline, disabled and success states.
5. Record a decision and version documentation when a reusable rule changes.
6. Implement one controlled slice only after approval.

No experience change may expose a capability that backend/state rules do not support, turn a failure into an empty state, or make an internal concept prominent to the wrong role.

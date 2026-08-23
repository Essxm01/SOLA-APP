# Role data-visibility matrix

`VISIBLE` = normally useful on the role’s primary screen; `SUMMARY` = aggregate/limited view; `CONTEXTUAL` = shown only in an applicable detail/decision; `HIDDEN` = not a product experience for that role. This describes presentation, not a change to backend authorization.

| Domain | Customer | Owner | Admin | Reason / guardrail |
|---|---|---|---|---|
| Property | VISIBLE | VISIBLE | CONTEXTUAL | Customer sees decision-ready listing/detail; Owner manages own property; Admin reviews when queued. |
| Booking | VISIBLE | VISIBLE | SUMMARY | Customer/Owner see their relevant booking details; Admin sees operational context. |
| Payment | VISIBLE | SUMMARY | CONTEXTUAL | Customer sees payable/paid status and own amounts; Owner sees relevant entitlement, not payment-provider internals. |
| Finance | CONTEXTUAL | VISIBLE | CONTEXTUAL | Customer sees total/deposit/remaining only; owner net/payout distinctions are Owner/Admin-only. |
| Owner wallet | HIDDEN | VISIBLE | CONTEXTUAL | Never expose Owner wallet to Customer. |
| Payout | HIDDEN | VISIBLE | VISIBLE | Owner sees own eligibility/requests; Admin processes eligible operations. |
| Identity | SUMMARY | VISIBLE | CONTEXTUAL | Customer sees own account; Owner sees own verification; Admin reviews only where needed. |
| Chat | CONTEXTUAL | CONTEXTUAL | HIDDEN | Customer/Owner conversation follows eligible booking context; Admin visibility needs a specific policy if later required. |
| Disputes | CONTEXTUAL | CONTEXTUAL | VISIBLE | Show only when role has a relevant dispute; Admin owns queue/review. |
| Audit | HIDDEN | HIDDEN | CONTEXTUAL | Technical/audit evidence belongs in an Admin investigation, not Customer/Owner routine UI. |

**Needs Product Decision:** whether and when Admin should have conversation-content access; no new permission is inferred here.

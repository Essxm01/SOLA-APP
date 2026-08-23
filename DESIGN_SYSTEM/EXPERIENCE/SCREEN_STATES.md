# Role-aware screen states

Every major data screen needs an intentional state model.

| State | Customer | Owner | Admin |
|---|---|---|---|
| Loading | Preserve discovery/booking structure and show progress for real quote/availability work. | Preserve account boundary; show current-account shell/skeleton, never prior Owner data. | Keep queue/table structure with scoped loading, not a decorative launch screen. |
| Empty | Explain absence and offer discovery/recovery action. | Explain operational absence and offer only a valid action (for example, add first property). | Explain no queued work distinctly from a failed query. |
| Error | State what could not load and offer retry without hiding booking truth. | State which current Owner data failed; retain no cross-account stale data. | State queue/overview failure and do not render credible zero metrics. |
| Offline | Preserve entered intent when safe; explain limitation. | Protect in-progress work and communicate stale/current-data risk. | Clearly flag inability to load operational state. |
| Disabled | Explain why a booking/payment action is unavailable when useful. | Explain status/payout eligibility where useful. | Explain missing selection/permission/precondition. |
| Success | Confirm canonical booking/payment outcome. | Confirm completed operational task and refresh canonical data. | Confirm decision outcome with queue refresh/audit context. |

Error must never look like an empty list, zero balance, zero metric or “all systems stable.”

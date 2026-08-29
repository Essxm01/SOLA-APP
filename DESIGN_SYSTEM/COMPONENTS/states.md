# Universal state model

Every data-driven screen consciously supports: **Loading, Empty, Error, Offline, Disabled, Selected and Success**.

| State | Contract |
|---|---|
| Loading | Preserve structure with Skeleton where content shape is known; do not show stale prior-account data as current. |
| Empty | Explain the genuine absence of canonical data and offer a relevant next action where possible. |
| Error | Explain what failed and offer retry/recovery. **An error must never masquerade as Empty.** |
| Offline | State connectivity limitation and protect unsaved actions. |
| Disabled | Explain unavailable action when the reason is not obvious. |
| Selected | Pair selected surface/border with text or control semantics. |
| Success | Confirm canonical completed state; refresh server-authoritative data where required. |

Skeleton, EmptyState, ErrorState and LoadingState use light surfaces, readable Cairo text, a relevant existing-system icon when helpful, and no decorative illustration requirement.

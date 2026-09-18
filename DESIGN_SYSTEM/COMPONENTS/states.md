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

## Extended product-state completeness

In addition to the baseline states above, important transactional surfaces should explicitly consider where applicable: **Loaded, Submission, Conflict, Unauthorized, Partial and Stale**.

- **Submission:** prevent duplicate action while preserving context.
- **Conflict:** explain the concrete changed truth and provide the next valid action.
- **Unauthorized:** distinguish missing/expired authorization from empty/error business data.
- **Partial:** make clear what loaded and what did not when partial display is safe.
- **Stale:** do not present stale transactional truth as newly verified state.

Required actions and durable errors must not rely only on a transient toast.

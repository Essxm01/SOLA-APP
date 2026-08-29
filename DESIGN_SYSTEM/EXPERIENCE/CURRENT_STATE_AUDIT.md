# Current product experience audit

**Scope:** current production entry screens were observed on 2026-08-23 and the Customer, Owner and Admin source structure was audited. This is a structural UX audit, not a claim of complete accessibility or live endpoint verification.

> **Historical audit snapshot:** subsequent repository work addressed parts of the listed P0/P1 findings. Preserve this document as evidence of why migration slices were created; use [`../../docs/codex/KONFRM_CURRENT_REALITY.md`](../../docs/codex/KONFRM_CURRENT_REALITY.md), [`../../docs/codex/KONFRM_COMPLETION_MATRIX.md`](../../docs/codex/KONFRM_COMPLETION_MATRIX.md), and current code to determine whether a finding remains active.

## Summary

| App | P0 | P1 | P2 | P3 | Primary concern |
|---|---:|---:|---:|---:|---|
| Customer | 2 | 3 | 3 | 2 | Some failed canonical reads can present as credible empty financial/property content. |
| Owner | 0 | 4 | 5 | 3 | Manual decorative entry gate and operational hierarchy compete with the “what needs action?” job. |
| Admin | 2 | 4 | 3 | 2 | Local session/quiet overview failures can render stale or zero-looking operational UI. |
| **Total** | **4** | **11** | **11** | **7** | **33** |

## P0 — misleading state or unsafe experience signal

| ID | App | Evidence | Impact | Future migration direction |
|---|---|---|---|---|
| C-01 | Customer | `App.tsx` property search clears `properties`/`filteredProperties` on a non-success response rather than setting error. | A server failure can look like “no matching properties.” | Preserve error versus genuine empty state. |
| C-02 | Customer | `CustomerWalletModal.tsx` clears payments on non-success/catch. | Payment history failure can look like an honest empty history. | Add an explicit financial-data error/retry state. |
| A-01 | Admin | `App.tsx` renders an authenticated shell from local `sola_admin_user` before canonical validation. | A stale local session can display authenticated Admin context. | Establish validated entry/auth bootstrap before operational shell. |
| A-02 | Admin | overview/notification requests catch quietly; overview renders `0` fallback metrics and “stable” copy. | Failed operational reads can look like genuine zero queues/system health. | Scope error/loading state to overview and notifications. |

## P1 — major flow or role mismatch

| ID | App | Evidence | Impact | Future migration direction |
|---|---|---|---|---|
| C-03 | Customer | Favorites are local component state only. | A saved-looking favorite can disappear on reload, weakening trust. | Confirm product capability and either persist or communicate scope. |
| C-04 | Customer | Profile/account summary restoration catches silently. | Stale account presentation can remain without an honest recovery cue. | Use scoped account loading/error states. |
| C-05 | Customer | Explore, account and booking paths are assembled in one large `App.tsx`. | Journey-level state/priority is difficult to keep coherent as flows grow. | Migrate by journey boundaries, not a wholesale rewrite. |
| O-01 | Owner | `OwnerSessionContent` always begins with manual `SplashScreen` after valid auth. | A decorative gate delays the operational task without bootstrap value. | Apply Founder-reviewed entry policy. |
| O-02 | Owner | Local intro completion is separate from authorization and appears after Splash. | Valid Owner entry contains two non-task gates before work. | Keep intro optional/contextual, not on every operational return. |
| O-03 | Owner | `AppContext` still quietly falls back to empty arrays for notifications/disputes/payout metadata. | Operational failure can be mistaken for no work in these domains. | Give each canonical domain explicit error ownership. |
| O-04 | Owner | Home renders ActionCards/QuickActions before bookings/property summary. | Action-required work can compete with dashboard/analytics-style content. | Reorder Home around current action queue. |
| A-03 | Admin | Login pre-fills prototype credentials. | It blurs real authentication expectations in the operational product. | Founder/product decision on prototype disclosure and secure default. |
| A-04 | Admin | Several queue/detail files contain client fallback `'admin_token_valid'`. | UI can attempt a protected action with a noncanonical token and then fail ambiguously. | Remove UI-level token fallback in a scoped auth migration. |
| A-05 | Admin | Notification button has no action in `App.tsx`. | The control advertises a destination that does not exist. | Hide/disable with explanation or implement a real notification destination. |
| A-06 | Admin | Overview is a metric dashboard before queues. | Decision work can require an extra navigation step. | Keep overview as a routing summary only if it points to actionable queues. |

## P2/P3 — usability, hierarchy and polish backlog

- Customer: tiny bottom-navigation labels and dense property-detail blocks; secondary favorite/share affordances can compete with booking context; modal-heavy flow composition.
- Owner: finance view exposes “ledger/audit/analytics” language too prominently; five persistent tabs compete at small width; calendar/profile/disputes return-path clarity must be verified; dark financial slab remains visual legacy; repeated local component variants.
- Admin: dense overview metric cards duplicate queue counts; compact controls need systematic keyboard/target review; current footer/header still use legacy SOLA terminology; visual drift is separately tracked in `LEGACY_DRIFT.md`.

## Positive evidence to retain

- Customer property detail has real availability/quote loading, retry and disabled booking CTA states.
- Owner auth gate correctly waits for canonical Owner authentication before mounting account-scoped data.
- Owner Wallet has canonical financial error/retry handling and unavailable payout state.
- Admin property review includes search, filter and oldest/newest sort; the property review route handles expired-session callback.

## Evidence limits

Observed entry screens show the current public Customer discovery state, Owner branded entry and an already-authenticated Admin shell. Authenticated role journeys were inspected structurally from source; they need controlled later acceptance testing during each migration slice. No business data was changed for this audit.

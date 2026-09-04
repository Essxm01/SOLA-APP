# KONFRM rescue backlog

> **RB-02 / DC-13 update (2026-08-30):** P14.1's critical RPC privilege finding is resolved live. Retain the broader no-policy RLS and storage-object authorization work as separately routed security debt; do not reopen the resolved critical RPC grant issue.

Only evidence-backed, deferred, or decision-blocked items belong here. This backlog does not authorize implementation.

| ID | Severity / type | Role / surface | Evidence | Blocks roadmap? | Recommended phase |
| --- | --- | --- | --- | --- | --- |
| RB-01 | Critical / Deployment | All deployed apps/Worker | Pages linkage and active Worker revision are external; repository config alone cannot certify deployment. | Yes—live claims | P0.1 / PHASE 20 |
| RB-02 | Critical / Security + Data | Supabase schema/RLS | P1.1 confirmed live RLS/no-policy tables and public anon/authenticated execution of critical SECURITY DEFINER payment/KYC/registration RPCs; retained 019/020 intend service-role-only. P14.1 prepared local migration 021, but the live ACL gap remains until Founder-approved application and verification. Historical baseline source remains unavailable. | Yes—apply/verify P14.1 before P1.2 | P14.1 / PHASE 14 |
| RB-03 | Critical / Integration + Finance | Customer, Owner, Admin, backend | Booking/payment/wallet are high-risk and historical claims are not acceptance proof. | Yes—financial closure | P8.4, P10.2, P11.1 |
| RB-04 | High / Tech Debt | Worker DB adapter | Strict matcher is documented; general query/transaction assumptions are unsafe. | No—unless touched | P2.5 |
| RB-05 | High / UI | All apps/design | Icon authority conflicts with current Design System wording. | Yes—icon migration only | P4.2 |
| RB-06 | High / UX + Deployment | Recent Owner slices | Recent UI commits lack fresh visual/founder and exact Pages evidence. | No—unless closure claimed | P6.1 onward / PHASE 20 |
| RB-07 | High / Data + UX | Notifications/messages | No confirmed canonical unread/notification model; fake counts are forbidden. | No | P9.1 |
| RB-08 | High / Product rule | Booking/cancellation/disputes | Cancellation/refund, deadline, and remaining-payment details are unresolved; current payout release/minimum/fee rules are not part of this uncertainty. | Yes—those open flows | P8.5 / P13.1 |
| RB-09 | Medium / Functional | Customer favorites | Resolved in repository baseline via migrations 028/029 and customer endpoints (live DB verification pending). | No | Resolved (P2.2) |
| RB-10 | Medium / Data | Test fixtures | Roadmap’s realistic data task risks unsafe production mutation. | No | P18.1 |
| RB-11 | Medium / UX + UI | All role audits | Audit inventories predate recent migration commits. | No | P15.1 / P16.1 |
| RB-12 | Medium / Local tooling ergonomics | Local PowerShell/Codex runner | The user-prefix PowerShell npm shim remains inaccessible; restricted Codex filesystem execution can fail while resolving the Windows user profile. Portable Node 20/22 runtimes and an authorized local process provide a non-destructive workaround; backend requires Node 22, matching CI. | No—P0.1 baseline is complete | Maintenance only if developer experience requires it |

## Resolved by P0.2 (not backlog items)

- Patterned non-production JWT strings and matching Admin detail-screen fallback tokens were removed. Persisted Customer/Owner tokens now remain unauthenticated candidates until canonical validation or an explicit retryable failure state. See `P0_2_AUTH_ACCESS_REPORT.md`.

## Resolved by repository evidence (not active backlog items)

- **RB-09 (Customer Favorites):** Repository schema, migrations (`028_customer_favorites.sql`, `029_customer_favorites_acl_hardening.sql`), backend endpoints, and Customer client integration are implemented in repository baseline. Live Supabase database verification remains pending live rollout evidence.

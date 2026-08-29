# KONFRM rescue backlog

Only evidence-backed, deferred, or decision-blocked items belong here. This backlog does not authorize implementation.

| ID | Severity / type | Role / surface | Evidence | Blocks roadmap? | Recommended phase |
| --- | --- | --- | --- | --- | --- |
| RB-01 | Critical / Deployment | All deployed apps/Worker | Pages linkage and active Worker revision are external; repository config alone cannot certify deployment. | Yes—live claims | P0.1 / PHASE 20 |
| RB-02 | Critical / Security + Data | Supabase schema/RLS | Migration history begins at 008; full baseline/RLS history unavailable. | Yes—security/schema assurance | P1.1 / PHASE 14 |
| RB-03 | Critical / Integration + Finance | Customer, Owner, Admin, backend | Booking/payment/wallet are high-risk and historical claims are not acceptance proof. | Yes—financial closure | P8.4, P10.2, P11.1 |
| RB-04 | High / Tech Debt | Worker DB adapter | Strict matcher is documented; general query/transaction assumptions are unsafe. | No—unless touched | P2.3 |
| RB-05 | High / UI | All apps/design | Icon authority conflicts with current Design System wording. | Yes—icon migration only | P4.2 |
| RB-06 | High / UX + Deployment | Recent Owner slices | Recent UI commits lack fresh visual/founder and exact Pages evidence. | No—unless closure claimed | P6.1 onward / PHASE 20 |
| RB-07 | High / Data + UX | Notifications/messages | No confirmed canonical unread/notification model; fake counts are forbidden. | No | P9.1 |
| RB-08 | High / Product rule | Booking/cancellation/disputes | Cancellation/refund, deadline, and remaining-payment details are unresolved; current payout release/minimum/fee rules are not part of this uncertainty. | Yes—those open flows | P8.5 / P13.1 |
| RB-09 | Medium / Functional | Customer favorites | Persistent favorites is approved but unavailable. | No | P5.4 |
| RB-10 | Medium / Data | Test fixtures | Roadmap’s realistic data task risks unsafe production mutation. | No | P18.1 |
| RB-11 | Medium / UX + UI | All role audits | Audit inventories predate recent migration commits. | No | P15.1 / P16.1 |

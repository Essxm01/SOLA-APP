# KONFRM cross-app entity matrix

| Entity / state | Customer | Owner | Admin | Canonical / privacy rule |
| --- | --- | --- | --- | --- |
| Human identity | Own profile/actions | Same UUID may gain Owner extension | Operational role only | Server-verified roles; no client-owned identity authority |
| Owner capability / KYC | Not visible | Registration, status, own private submission | Contextual review | Private documents; no public URLs; review is auditable |
| Property | Published eligible inventory only | Own creation/edit/status | Review decision | Owner-scoped write/read; public only eligible published state |
| Availability | Calendar/quote decision | Manage own property availability | Operational visibility as needed | Server-authoritative; fail closed on uncertainty |
| Booking | Request, payment, own status/chat | Own requests/active/history decisions | Contextual operational oversight | Canonical state machine; pending does not block, approved-pending-payment/confirmed do |
| Payment / financial summary | Total/deposit/remaining only | Owner-relevant entitlement/wallet | Operations context | Customer never sees commission/Owner net; server amounts authoritative |
| Wallet / payout | Hidden | Own balances/ledger/payout eligibility | Payout processing | Immutable canonical ledger; no fake zero after failures |
| Conversation | Booking participants | Booking participants | Only approved operational context, not general browsing | No contacts exposed; contextual minimum necessary access |
| Notifications | Relevant account state | Relevant account state | Operational signal | Never display failed fetch as no notifications |

When a phase changes any row, identify every impacted role and prove that unauthorized roles cannot see protected data.

## Event verification map

| Event | Source and persistence | Consumers / expected state | Verification path |
| --- | --- | --- | --- |
| Owner creates/submits property | Owner route → canonical property/media records | Admin sees reviewable submission; Customer sees it only after eligible publication | Owner create/draft/media → Admin review → Customer public list |
| Owner edits property | Owner route → same canonical property | Visibility/review implication is dictated by current backend state contract, never inferred in UI | Status/media regression plus current enum/route inspection |
| Customer requests booking | Customer route → canonical booking/financial summary | Owner sees pending decision; Admin sees contextual operational state | Customer request → Owner pending list → status/ownership test |
| Owner approves/rejects booking | Owner route → canonical booking status | Customer receives canonical status; availability reflects only blocking statuses | Decision → Customer detail/list → availability conflict test |
| Customer completes prototype deposit | Customer route/RPC → payment transaction, booking confirmation, wallet/ledger | Owner sees confirmed booking and canonical wallet; Admin sees operational record where supported | Idempotency + amount/privacy + cross-role read verification |
| Owner submits KYC / Admin reviews | Owner private storage/RPC → document records/Owner status | Admin accesses authorized temporary private evidence; Owner gets canonical status | Private access denial/approval/rejection and status propagation tests |
| Owner changes availability | Owner route → canonical availability state | Customer calendar and quote reflect authoritative state; Admin has operational visibility only where supported | Owner change → Customer calendar/quote; fail-closed/error regression |
| Property verification/publication changes | Admin decision → canonical property status | Owner sees truthful review/status; Customer only sees eligible published property | Admin review → Owner status → Customer public eligibility test |
| Payout request/process/release | Owner/Admin route → wallet reservation/ledger/payout state | Owner sees canonical eligibility/state; Admin sees auditable queue; Customer sees none | Current 500 EGP/release/provider-fee rule; ledger/reservation/authorization test |
| Notification fetch/delivery | Canonical notification model is not yet established | Each role must not see failed fetch as zero/unread-free | Blocked pending P9.1 decision/model; no invented behavior |
| Cancellation/refund | Policy and canonical contract not yet complete | Customer/Owner/Admin effects cannot be safely asserted | Blocked pending Founder/product decisions in P8.5/P13.1 |
| Review after completed stay | Completion/review eligibility contract needs audit | Customer/Owner/Admin visibility and moderation remain unverified | Blocked pending P13.3 contract evidence |

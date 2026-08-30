# KONFRM completion matrix

> **P1.2 status (2026-08-30):** Round-1 repository remediation is local-ready; live schema application is intentionally pending Founder approval. P14.1 is no longer pending: it is live verified at `5decd03f59f3bd3039e12e00caf234f28def5201`.

This is a current acceptance map, not a changelog. “Repository evidence” does not mean live accepted. A row can be **verified** only with concrete applicable functional, data/API, cross-app, failure-state, regression, security/privacy, visual, and live evidence.

| Domain | Execution map | Classification | Customer | Owner | Admin | Backend / DB / Storage | Evidence gap / next gate |
| --- | --- | --- | --- | --- | --- | --- |
| Identity and session | P0.2, P1.2, P2.2, P14.3 | Implemented—published/local verification | Candidate-token bootstrap/public/protected behavior tested | Canonical Owner gate, clear-on-logout, and failure distinction tested | Validated session/shell truthfulness tested | P0.2 published at `6d37b458…`; signed JWT role gates and representative subject authority tested | P14.1 must remediate confirmed public SECURITY DEFINER exposure before P1.2 |
| Property | P1.3, P3.1–P3.3 | Implemented but unverified | Discovery/property detail code exists | Wizard, local/canonical draft and media code have recent commits | Review queue code exists | Property/media persistence and storage contracts exist | Verify current cross-app publication/rejection/media behavior |
| Availability | P1.4, P6.4, P8.2 | Partial | Consumer calendar/quote code exists | Owner calendar controls exist | Operational visibility needs audit | Booking/availability models exist | Fail-closed and competing-request acceptance matrix |
| Booking | P1.5, P8.1–P8.5 | Implemented but unverified | Request/detail/payment CTA code exists | Home/Bookings migration work exists | Operational review visibility needs audit | Lifecycle, financial summary, conversations exist | Full status propagation and failure/retry acceptance |
| Payment | P10.1–P10.2 | Implemented but unverified | Prototype customer completion code exists | Confirmed booking/wallet view exists | Monitoring/review needs audit | Atomic finalization RPC, transactions, prototype mode | Live-safe acceptance; no real-money capability claimed |
| Wallet / payout | P11.1–P11.4 | Partial | Internal split is hidden | Canonical wallet ledger reads exist | Payout queue/code needs audit | Wallet/ledger persistence exists | Current release/minimum/fee rule and cross-role integrity verification |
| KYC | P6.7, P7.3, P14.2 | Implemented but unverified | N/A | Registration, status, own private submission | Review/access path exists | KYC migration/storage/RPC paths exist | Controlled end-to-end non-production test and RLS/storage audit |
| Chat / notifications | P9.1–P9.2, P12.1–P12.2 | Partial | Booking chat exists | Messages surface exists | Contextual access rule approved but implementation undecided | Conversation persistence exists | Canonical unread/notification model and Admin visibility authorization |
| Design / UX | P4, P15, P16 | Partial | Partial migration | Partial migration | Partial migration | Tokens/governance exist | Icon authority, screenshot QA, legacy exception reduction |
| Delivery / quality | P0.1, P19, P20 | Partial | P0.1 local runtime baseline, public Pages URLs/Worker health, and GitHub CI run #127 verified | Pages revision metadata unavailable | Pages revision metadata unavailable | CI run #127 deployed Worker successfully; backend local baseline uses Node 22 | Authenticated Cloudflare/Supabase inspection, exact revisions, and later rollout evidence |

## Detailed acceptance inventory

This inventory prevents a later phase from rebuilding a slice merely because it has not yet been live-accepted. It is an evidence register, not screen-level certification.

| Slice / flow | Execution phase | Classification | Repository evidence | Missing acceptance evidence | Cross-app dependency | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| Customer app shell/public browsing | P0.2, P5.1 | Implemented but unverified | React/Vite app, public property/search code | Returning/bootstrap and public/error behavior | Published property eligibility | Preserve; verify |
| Customer Explore/search/filter empty states | P2.1, P5.1, P17.1 | Partial | Truthful-state corrective commits/components | Canonical success-empty vs failed-load runtime proof | Public API contract | Verify; repair only if evidence fails |
| Customer property detail/calendar/quote | P5.2 | Implemented but unverified | Detail, calendar, guest/quote components | Date/guest/price/failure visual and API evidence | Availability/quote source | Preserve; verify |
| Customer booking request/detail/status | P5.3, P8.1 | Implemented but unverified | Booking components/routes and lifecycle code | Cross-role status and retry/failure acceptance | Owner decision, Admin context | Preserve; verify |
| Customer prototype payment UI | P5.3, P10.1 | Implemented but unverified | Payment CTA/sheet and API flow code | Canonical amount/privacy/completion evidence | Booking, wallet, Admin | Preserve; verify |
| Customer Favorites | P5.4 | Not started | Approved capability documented | Canonical persistence/auth design and tests | Identity/backend/DB | Complete; never fake locally |
| Customer account/history/payment history | P2.1, P5.3, P17.1 | Partial | Account/history components, payment-state fix evidence | Unauthorized/error/empty semantics | Customer auth/payment contract | Verify; repair only if evidence fails |
| Owner entry, Login, first run | P0.2, P4.4, P6.1 | Implemented but unverified | Owner auth gate/first-run/KONFRM entry commits | Exact first-run/session/live acceptance | Canonical Owner auth | Preserve; verify |
| Owner Home action-first surface | P6.1 | Implemented but unverified | Recent Home/header/action commits | Founder visual and real-data acceptance | Bookings/properties/wallet | Preserve; verify |
| Owner Property Hub/details | P6.2 | Implemented but unverified | Recent property UX commits/components | Mobile lifecycle/status/empty/error QA | Property persistence/Admin review | Preserve; verify |
| Owner property wizard/drafts/media | P3.1, P6.2 | Implemented but unverified | Six-step wizard, draft/image commits | Create/edit isolation, media delete/submit cross-role evidence | Storage/Admin publication | Preserve; verify |
| Owner calendar/availability | P6.4, P8.2 | Partial | Calendar screen/code exists | Blocking/status/date regression acceptance | Customer quote/booking | Verify; complete if gap proven |
| Owner Bookings requests/active/history | P6.5, P8.1 | Partial | Current task plus recent Bookings commit | Segmentation/write-failure/live visual evidence | Customer status/availability | Verify; repair/complete only if evidence requires |
| Owner Wallet | P11.1, P6.6 | Implemented but unverified | Canonical wallet/ledger read and redesign commits | Current balances/error/payout eligibility live-safe evidence | Payment/ledger/Admin payout | Preserve; verify |
| Owner Profile/registration/KYC | P1.2, P6.7, P7.3 | Implemented but unverified | Registration/KYC routes, migration 020, private-storage code | Controlled complete package/Admin review/privacy proof | Admin queue/Storage | Preserve; verify |
| Owner chat/messages | P12.1 | Implemented but unverified | Booking conversation components/routes | Participant/error/notification behavior | Customer conversation | Preserve; verify |
| Admin validated entry/overview | P0.2, P7.1 | Implemented but unverified | Admin truthful-session/overview corrective code | Expired/network/zero/failure desktop acceptance | Admin auth/backend | Preserve; verify |
| Admin Owner verification queue | P7.3 | Partial | Queue/review/private-access code | Complete-package, reason, signed-access and audit proof | Owner KYC/Storage | Verify; repair only if evidence fails |
| Admin property review queue | P3.2, P7.4 | Implemented but unverified | Review queue/components/routes | Reason/status propagation and desktop QA | Owner property/Customer visibility | Preserve; verify |
| Admin payout queue | P7.5, P11.2 | Partial | Queue/code references exist | Current payout-rule, reservation, provider-fee, audit evidence | Owner wallet/ledger | Verify; complete only within current rule |
| Admin disputes/reviews | P7.6, P13.2–P13.3 | Blocked | Legacy/current components may exist | Approved cancellation/dispute/review contracts | Booking/payment/completed stay | Preserve evidence; await decision |
| Public/customer API contract | P2.1 | Partial | Backend route surface and Customer repositories | Exact success/error/ownership contract inventory | Customer surfaces | Verify; repair only if evidence fails |
| Owner/Admin API contract | P2.2–P2.3 | Partial | Authenticated route families/repositories | Role/ownership/error inventory | Owner/Admin surfaces | Verify; repair only if evidence fails |
| Worker REST/RPC compatibility | P2.4 | Partial | `dbClient` strict matcher and Worker config | Touched-operation coverage/matcher collision tests | Every Worker-backed flow | Repair only when scoped evidence fails |
| DB baseline/RLS | P1.1, P14.1 | Repository remediation ready; live remediation pending | N/A | N/A | N/A | P1.1 published at `d7462f13…`; P14.1 migration 021 and ACL-contract test prepared | Founder-approved live application and post-migration ACL verification are required before P1.2 |
| Property media/private KYC storage | P1.3, P14.2 | Implemented but unverified | Public property-media/private owner-verification code and migration evidence | Bucket policy/object access live verification | Owner/Admin/Customer | Preserve; verify |
| Booking/payment/wallet integrity | P1.5–P1.6, P8.1–P8.4, P10.1, P11.1 | Implemented but unverified | Migrations/RPCs/financial summaries/ledger code | Cross-app idempotency/amount/availability/privacy evidence | All roles | Preserve; verify |
| Payout release / minimum / fee | P11.2–P11.4 | Partial | Current Product Context confirms 24h release, 500 EGP minimum, Owner actual fee | Current implementation, scheduling, provider/audit proof; final production revalidation | Owner/Admin/wallet | Verify/complete current prototype rule; defer production revalidation |
| Chat / notifications | P9.1–P9.2, P12.1–P12.2 | Partial | Conversation persistence exists; no confirmed unread model | Canonical notification/read model and contextual Admin access | Customer/Owner/Admin | Preserve chat; decision/complete notification model |
| Design tokens / component contracts | P4.1 | Implemented but unverified | `DESIGN_SYSTEM/`, generated tokens, anti-drift check | Current adoption/legacy migration evidence | All UI | Preserve; verify |
| Design icon/motion/entry authority | P4.2–P4.4 | Partial / blocked | Existing guidance and entry migrations | Founder icon decision; separate motion/entry verification | All UI | Do not mass-rebuild |
| CI / Worker deployment | P0.1, P20.1 | Implemented but unverified | GitHub workflow configuration | Exact remote run, Worker revision and health proof | Deployment | Verify |
| Pages deployments | P0.1, P20.1 | Unverified historical claim | App build config exists; linkage external | Exact Owner/Customer/Admin deployed revisions | Visible role surfaces | Verify |

## Classification rule

Use only: `Verified and preserve`, `Implemented but unverified`, `Partial`, `Broken`, `Mock/fake`, `Blocked`, `Not started`, or `Superseded`. Move a row only after evidence is recorded in the applicable phase closure report and current-reality file.

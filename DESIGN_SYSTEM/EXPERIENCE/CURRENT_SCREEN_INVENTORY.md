# Historical screen inventory — 2026-08-23 snapshot

> This inventory predates later Owner, Customer, and Admin slices. It remains useful implementation evidence, but it is not a current acceptance register. Current sequencing and status live in [`../../docs/codex/KONFRM_EXECUTION_MAP.md`](../../docs/codex/KONFRM_EXECUTION_MAP.md) and [`../../docs/codex/KONFRM_COMPLETION_MATRIX.md`](../../docs/codex/KONFRM_COMPLETION_MATRIX.md).

| App | Screen / entry | User job | Primary action | Key data | Current state support | Known UX issue | Target direction | Priority |
|---|---|---|---|---|---|---|---|---|
| Customer | Explore tab | Discover a stay | Search/open property | Published properties, destination, nightly price | Loading/empty/error | Non-success search can become empty | Discovery-first, honest failure | P0 |
| Customer | Property detail | Evaluate/date-select | Continue booking | Images, availability, quote, deposit/remaining | Availability/quote loading/error/disabled | Dense detail and small auxiliary controls | Decision-first progressive disclosure | P1 |
| Customer | Booking review sheet | Confirm request | Send booking request | Dates, canonical quote | Submit loading/error | Contextual flow is good; retain server authority | Preserve, simplify review | P2 |
| Customer | Booking detail/payment | Follow booking/pay deposit/chat | State-specific payment/chat | Booking, payment, messages | Detail/payment loading/error | Must remain state-driven | Clear progress and reassurance | P1 |
| Customer | Favorites | Return to saved options | Open property | Local favorite list | Empty | Not canonical/persistent today | Needs capability decision | P1 |
| Customer | Trips/Bookings | Track stays | Open booking | Customer bookings | Loading/error/empty | Keep errors distinct from no stays | Trip-focused | P1 |
| Customer | Account/edit/support/wallet sheets | Manage own account | Edit/get help | Profile, summary, payments | Mixed; wallet can empty-on-failure | Modal accumulation | Contextual, honest recovery | P1 |
| Customer | Auth modal | Authenticate for protected action | Sign in | Phone/profile | Form error/loading | Preserve interrupted booking intent | Contextual auth return | P2 |
| Owner | Auth restoration/Login | Enter valid Owner account | Sign in | Canonical profile | Auth loading/error | Brand terminology and legacy presentation | Validated operational entry | P1 |
| Owner | Splash/intro | Brand/intro | Continue/skip | None | No bootstrap dependency | Manual decorative gate | Founder-reviewed entry policy | P1 |
| Owner | Home | See what needs action | Open relevant task | Metrics, requests, messages, property summary | Loading/error/empty | Action queue is not clearly first | Action-first Home | P1 |
| Owner | Bookings | Respond/manage bookings | Approve/reject/detail | Canonical bookings/financial summary | Local handling | Decision actions should dominate contextually | Operational queue | P1 |
| Owner | Properties/list/detail/wizard | Manage units | Add/edit/submit | Properties, images, statuses | Loading/error/empty | Rich flow with many contextual sheets | Property operations hierarchy | P1 |
| Owner | Messages | Respond to eligible guest chat | Open/send message | Conversations/messages | Error handling | Preserve booking context | Contextual communication | P2 |
| Owner | Wallet | Understand money/request payout | Request eligible payout | Wallet/ledger/payouts | Wallet error/retry/disabled | Technical/analytics terminology competes | Plain business-money language | P1 |
| Owner | Calendar/Profile/Disputes/notifications | Supporting operations | Context-specific | Availability, identity, disputes, alerts | Mixed | Return path/top-level frequency needs audit | Contextual destinations | P2 |
| Admin | Login | Authenticate Admin | Sign in | Admin identity | Loading/error | Prototype prefilled credentials | Honest operational login | P1 |
| Admin | Overview | Route to urgent work | Open queue | Queue counts | Quiet failure/zero fallback | Can look stable/empty on failure | Actionable routing summary | P0 |
| Admin | Verification queue/detail | Review Owner identity | Approve/reject | Pending verification evidence | Loading/error/empty | Canonical auth fallback strings remain | Review queue pattern | P1 |
| Admin | Property review queue/detail | Decide property review | Approve/reject | Property, images, status | Search/filter/sort/error | Retain FIFO and context | Fast queue decision | P1 |
| Admin | Payout queue/detail | Process eligible payout | Approve/reject | Payout, controlled PII | Loading/error | Auth/error handling consistency | Financial operations context | P1 |
| Admin | Disputes queue/detail | Resolve dispute | Resolve/reconcile | Dispute facts | Loading/error | Needs auditability-first context | Investigation workflow | P2 |

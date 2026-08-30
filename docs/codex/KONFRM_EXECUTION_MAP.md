# KONFRM execution map

`خطة عمل التطبيق.txt` supplies the immutable PHASE 0–22 macro roadmap. The **75** detailed execution boundaries below were derived from current repository evidence, dependency boundaries, risk, and independent acceptance scope—not from a target quota. The Phase Zero hardening review split mixed property/availability, booking/financial, role-shell, and E2E boundaries where they require different acceptance evidence; future phases change only when new evidence creates a real dependency or acceptance boundary.

**Status key:** `Preserve/verify` = implementation evidence exists but closure is unverified; `Partial` = material gap remains; `Deferred` = decision/prerequisite missing; `Planned` = no completion evidence yet.

| ID | Parent / outcome | Surfaces | Dependencies | Risk | Status / verification |
| --- | --- | --- | --- | --- | --- |
| P0.1 | **PHASE 0** — baseline, CI, deployment, and access reality | Repo, CI, Worker, Pages | None | Critical | Complete; local/GitHub/public-HTTP evidence recorded, privileged metadata remains `ACCESS_UNAVAILABLE` |
| P0.2 | Prototype auth/access blocker audit | Customer, Owner, Admin, backend | P0.1 | High | Complete local release candidate; signed-token/role/bootstrap/error evidence in `P0_2_AUTH_ACCESS_REPORT.md`, publication intentionally pending |
| P1.1 | **PHASE 1** — schema/RLS baseline inventory | DB, Supabase | P0.1 | Critical | Closed + published at `d7462f13…`; Actions #130 / `33305295499` and Worker health succeeded |
| P1.2 | Identity/session persistence integrity | Backend, DB, all roles | P1.1 | Critical | Preserve/verify; ownership/session tests |
| P1.3 | Property and media persistence integrity | Owner, Admin, Customer, DB/storage | P1.1 | Critical | Preserve/verify; cross-app/media tests |
| P1.4 | Availability persistence and blocking integrity | Customer, Owner, backend, DB | P1.1 | Critical | Preserve/verify; date/blocking tests |
| P1.5 | Booking and financial-summary persistence integrity | Backend, DB, all roles | P1.1 | Critical | Preserve/verify; status/quote/idempotency tests |
| P1.6 | Wallet and immutable-ledger persistence integrity | Backend, DB, Owner/Admin | P1.1 | Critical | Preserve/verify; balance/ledger/privacy tests |
| P2.1 | **PHASE 2** — public/customer contract audit and error truthfulness | Customer, backend | P1.2–P1.6 | High | Partial; route contract/failure tests |
| P2.2 | Owner contract and authorization audit | Owner, backend | P1.2–P1.6 | High | Partial; role/ownership tests |
| P2.3 | Admin contract and authorization audit | Admin, backend | P1.2–P1.6 | High | Partial; role/ownership tests |
| P2.4 | Worker REST/RPC adapter contract hardening | Backend, Worker, Supabase | P2.1–P2.3 | High | Partial; exact-query/matcher regression tests |
| P3.1 | **PHASE 3** — Owner property create/draft/media preserve-and-verify | Owner, backend, DB/storage | P1.3, P2.2 | High | Preserve/verify; wizard/media evidence |
| P3.2 | Admin property review and reason propagation | Admin, Owner, backend, DB | P3.1 | High | Preserve/verify; review/rejection tests |
| P3.3 | Customer published-property eligibility/visibility | Customer, backend, DB | P3.2 | High | Preserve/verify; public eligibility live-safe proof |
| P4.1 | **PHASE 4** — token/component/RTL governance reconciliation | Design System, all apps | P0.1 | Medium | Preserve/verify; token/check validation |
| P4.2 | Icon authority decision and migration boundary | Design System, all apps | P4.1, DC-02 | Medium | Deferred; Founder decision before migration |
| P4.3 | Motion contract and reduced-motion quality gate | Design System, all apps | P4.1 | Low | Planned; design/interaction evidence |
| P4.4 | Entry/startup behavior authority and consistency | Customer, Owner, Admin | P4.1 | Medium | Partial; first-run and technical bootstrap remain distinct |
| P5.1 | **PHASE 5** — Customer discovery/search truthful state and mobile UX | Customer, backend | P2.1, P3.3, P4.1 | High | Partial; real-empty/error/filter QA |
| P5.2 | Customer property detail, availability, and quote decision UX | Customer, backend | P5.1, P1.4 | High | Partial; dates/guests/quote/failure QA |
| P5.3 | Customer booking journey/status/payment entry UX | Customer, backend | P5.2, P8.1 | High | Partial; canonical status/privacy QA |
| P5.4 | Persistent Customer Favorites vertical slice | Customer, backend, DB | P1.2, P2.1 | Medium | Deferred; approved capability, no local-only state |
| P6.1 | **PHASE 6** — Owner Home evidence-led closure | Owner | P0.2, P4.1 | Medium | Partial; action-first/data/visual acceptance |
| P6.2 | Owner property hub and details lifecycle UX | Owner, backend | P3.1, P4.1 | High | Partial; mobile status/empty/error QA |
| P6.3 | Owner property wizard, draft, and media lifecycle UX | Owner, backend, storage | P3.1, P6.2 | High | Partial; create/edit/media/submit QA |
| P6.4 | Owner calendar/availability operational UX | Owner, backend | P1.4, P6.2 | High | Planned; fail-closed/date regression QA |
| P6.5 | Owner booking requests/active/history UX | Owner, backend | P8.1, P4.1 | High | Partial; correct grouping/write-failure UX |
| P6.6 | Owner wallet/payout operational UX | Owner, backend | P1.6, P4.1 | High | Partial; finance/error/eligibility QA |
| P6.7 | Owner profile, registration, and KYC operational UX | Owner, backend, storage | P1.2, P4.1 | High | Partial; KYC privacy and visual QA |
| P7.1 | **PHASE 7** — Admin shell/session truthfulness | Admin, backend | P0.2, P2.3, P4.1 | High | Preserve/verify; session/entry QA |
| P7.2 | Admin overview/notification truthfulness | Admin, backend | P7.1, P2.3 | High | Preserve/verify; zero/error/retry QA |
| P7.3 | Admin Owner-verification queue/private evidence review | Admin, backend, DB/storage | P1.2, P6.7 | Critical | Partial; private document/review tests |
| P7.4 | Admin property review queue and feedback UX | Admin, backend, DB | P3.2, P4.1 | High | Partial; decision/reason/audit QA |
| P7.5 | Admin payout queue and accounting operations audit | Admin, backend, DB | P1.6, P11.1 | High | Partial; current payout rule verification, not policy invention |
| P7.6 | Admin dispute queue/review operations audit | Admin, backend, DB | DC-08, P13.1 | High | Deferred; cancellation/dispute policy prerequisite |
| P7.7 | Admin auditability/search/filter operational pass | Admin, backend | P7.1–P7.6 | Medium | Planned; desktop QA |
| P8.1 | **PHASE 8** — request → Owner decision propagation | Customer, Owner, Admin, backend, DB | P1.5, P2.1–P2.3 | Critical | Preserve/verify; status/ownership/retry tests |
| P8.2 | Availability blocking and competing-request integrity | Customer, Owner, backend, DB | P8.1 | Critical | Partial; date/status conflict tests |
| P8.3 | Approved-pending-payment → confirmed propagation | Customer, Owner, Admin, backend, DB | P8.1, P10.1 | Critical | Preserve/verify; cross-app acceptance |
| P8.4 | Booking lifecycle technical failure/recovery integrity | All roles, backend, DB | P8.1–P8.3 | Critical | Partial; retries, conflicts, idempotency, and truthful errors |
| P8.5 | Cancellation policy boundary and contract | All roles, backend, DB | P8.1–P8.4, DC-08 | Critical | Deferred; Founder decision required |
| P9.1 | **PHASE 9** — notification data model/authorization decision | All roles, backend, DB | P1.2, P2.2 | High | Deferred; no fake unread state |
| P9.2 | Notification delivery/UI truthful states | All roles | P9.1 | Medium | Planned; error/empty/permission QA |
| P10.1 | **PHASE 10** — prototype deposit initiation/completion preserve-and-verify | Customer, Owner, backend, DB | P1.4, P8.1 | Critical | Preserve/verify; idempotency/amount/privacy tests |
| P10.2 | Live-payment boundary and webhook failure closure | Backend, Admin | P10.1, DC-08 | Critical | Deferred; no real Paymob networking without approval |
| P11.1 | **PHASE 11** — wallet/ledger canonical read and balance visibility | Owner, Admin, backend, DB | P1.6, P10.1 | Critical | Preserve/verify; ledger/balance/error tests |
| P11.2 | Payout eligibility, queue, and audit integrity | Owner, Admin, backend, DB | P11.1, P7.4 | Critical | Partial; apply current 500 EGP/provider-fee rule without invention |
| P11.3 | Pending-to-available release accounting integrity | Backend, DB, Owner | P11.2 | Critical | Partial; current 24h-after-check-in rule requires implementation/verification evidence |
| P11.4 | Final-production payout legal/operational revalidation | Product, backend, Admin | P11.2–P11.3 | High | Deferred; does not block current prototype accounting |
| P12.1 | **PHASE 12** — booking conversation authorization/state integrity | Customer, Owner, backend, DB | P8.1 | High | Preserve/verify; participant/access/error tests |
| P12.2 | Read/unread and Admin contextual access decision | Customer, Owner, Admin, backend, DB | P9.1, DC-08 | High | Deferred; no unrestricted Admin browsing |
| P13.1 | **PHASE 13** — cancellation/refund policy decision and contract | All roles, backend, DB | DC-08 | Critical | Deferred; Founder decision required |
| P13.2 | Dispute lifecycle and operational UX | All roles, backend, DB | P13.1, P7.5 | High | Deferred; policy and audit prerequisites |
| P13.3 | Completed-stay review eligibility and reputation flow | Customer, Owner, Admin, backend, DB | P13.1 | High | Deferred; completion/review contract audit required |
| P14.1 | **PHASE 14** — RLS/authorization/privacy remediation plan | Backend, DB/storage, all roles | P1.1 | Critical | Local release candidate prepared: migration 021 restores service-role-only critical RPC ACL intent; live application/verification remains Founder-gated |
| P14.2 | Sensitive storage/media access verification | Owner, Admin, backend, storage | P14.1 | Critical | Partial; bucket/access checks |
| P14.3 | Auth/session/secret/config security pass | All apps, backend, CI | P14.1 | High | Planned; static + controlled live checks |
| P15.1 | **PHASE 15** — refresh visual drift inventory from current screens | All apps, Design System | P4.1, P5–P7 evidence | Medium | Partial; screenshot/static audit |
| P15.2 | Prioritized cross-app visual migration slices | All apps, Design System | P15.1, P4.2 as applicable | Medium | Planned; no wholesale redesign |
| P16.1 | **PHASE 16** — refresh role UX audit and IA gaps | All roles, Experience authority | P5–P7 evidence | High | Partial; audit current reality |
| P16.2 | Approved high-value role UX migrations | All roles | P16.1 | Medium | Planned; slice by role/job |
| P17.1 | **PHASE 17** — error/empty/loading/disabled state matrix | All apps, backend | P2.1–P2.2 | High | Partial; prevent false empty/zero |
| P17.2 | Retry/conflict/idempotency user-recovery pass | All apps, backend, DB | P17.1, P8–P12 | High | Planned; focused regression tests |
| P17.3 | Offline/slow-network behavior audit | Customer, Owner, Admin | P17.1 | Medium | Planned; controlled simulation |
| P18.1 | **PHASE 18** — controlled fixture/test-data governance | DB, storage, tests | P1.1, P14.1 | High | Deferred; no production mutation |
| P19.1 | **PHASE 19** — supply/property cross-role E2E | Owner, Admin, Customer, backend, DB | P3, P14.1, P18.1 | Critical | Planned; isolated fixture E2E |
| P19.2 | Booking and availability E2E | Customer, Owner, Admin, backend, DB | P8, P18.1 | Critical | Planned; state/blocking evidence |
| P19.3 | Payment, wallet, and payout E2E | Customer, Owner, Admin, backend, DB | P10, P11, P18.1 | Critical | Planned; financial safety evidence |
| P19.4 | Failure and recovery E2E scenarios | All roles, backend, DB/storage | P17, P18.1 | Critical | Planned; retry/conflict/truthful-state proof |
| P19.5 | Authorization/privacy E2E scenarios | All roles, backend, DB/storage | P14, P18.1 | Critical | Planned; unauthorized/private-data proof |
| P20.1 | **PHASE 20** — release/revision deployment verification | CI, Worker, Pages | Relevant feature phases | Critical | Partial; exact SHA and live route/UI proof |
| P20.2 | Read-only production smoke matrix | All roles, Worker, Supabase | P20.1 | Critical | Planned; no business-data mutation |
| P21.1 | **PHASE 21** — demo polish and acceptance package | All apps | P15–P20 | Medium | Deferred; only after core gates |
| P22.1 | **PHASE 22** — final product blueprint/handoff | Docs, architecture, product | All applicable phases | Medium | Deferred; evidence-led closure |

## Next recommended execution phase

**P14.1 publication and live application gate.** P1.1 is closed + published and P14.1 has a local release candidate. Founder approval must cover publishing the exact commit, applying migration 021 live, and read-only post-application ACL verification before P1.2. No live remediation is implied by repository readiness.

# Owner experience contract

Owner is an operational business user. Their central question is: **“ما الذي يحتاج مني تصرفًا الآن؟”**

## Job order

1. Respond to decision-ready booking requests.
2. Manage current/upcoming bookings and guest messages.
3. Maintain properties, availability and pricing.
4. Understand pending/available money and request a payout when eligible.
5. Maintain account and verification status.

## Home target philosophy — RECOMMENDED / FOUNDER REVIEW

Home answers, in order: (1) what waits for action, (2) upcoming/current booking context, (3) property health, (4) meaningful financial position, and (5) messages/alerts. Analytics supports those answers; it is not the page’s primary job. Avoid generic metric-card walls, tiny dense grids, finance-terminal language and dark dashboards.

## Owner financial language

Show owner-relevant booking/deposit/pending/available/payout state in business language. Map technical ledger values such as `DEPOSIT_HELD_IN_ESCROW` to “صافي عربون حجز مؤكد” where appropriate. Do not require an Owner to understand provider, database or ledger implementation terminology.

## Current navigation evidence

Top-level mobile tabs are Home, Bookings, Wallet, Properties and Messages. Calendar, Profile and Disputes are contextual destinations. This is role-appropriate in principle, but future migration must verify that every contextual destination has a clear return path and only surfaces when relevant.

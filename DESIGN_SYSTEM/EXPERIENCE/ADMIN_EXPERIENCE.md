# Admin experience contract

Admin is a desktop operational/review user. Their central question is: **“ما الذي يحتاج قرارًا أو مراجعة الآن؟”**

## Jobs and approved density

Review property submissions and Owner verification; monitor bookings/payments; process eligible operations; handle disputes; search/filter/investigate; preserve an audit trail. Tables, queues, filters, search, detail side panels and pagination are appropriate where they improve decision speed.

Admin remains KONFRM: Cairo, light-first surfaces, central statuses, shared component semantics and clear action hierarchy. Desktop density does not create a second brand, mobile-card imitation or decorative dashboard.

## Current navigation evidence

Top-level desktop destinations are Overview, Owner Verification, Property Review, Payout Requests and Disputes. Property/payout/dispute details are selected contextual views. The notification button presently has no visible destination/action in `App.tsx`; do not retain an inert control in a future migration.

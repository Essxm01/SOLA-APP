# Business invariants

Only rules verified in current code/migrations or active repository governance appear here. Unknown policy is explicitly not a license to invent it.

## Identity and access

- `users` represents a human identity; `owners` is an optional extension with the same UUID.
- A pure Customer does not gain Owner capability merely by entering the Owner app. Owner authentication requires a canonical Owner record and validated owner session.
- Account-scoped Owner state must be destroyed on logout/identity change. A typed phone number or browser session alone is not canonical identity.
- Route ownership is derived from verified token subject and role, not from frontend-provided IDs.

## Property lifecycle

- Owner property work is canonical: draft/create, real storage image upload, and submission are persisted rather than fabricated in UI state.
- Property visibility and review status are role-scoped. Do not approve/reject or mutate real Founder properties during automated/live acceptance unless a task explicitly authorizes it.
- Canonical property fetch failure must show an error; it must not become a zero-property state.

## Booking lifecycle and availability

- Booking requests begin pending Owner review. Owner approval transitions an eligible request to `APPROVED_PENDING_PAYMENT`; rejection is a separate decision.
- Inventory is blocked for `APPROVED_PENDING_PAYMENT` and `CONFIRMED`, not for `PENDING_OWNER_APPROVAL`.
- Owner approval is required before deposit payment. A confirmed booking must not create another payment.
- Booking conversations are tied to booking context and remain role-scoped; do not expose cross-owner/customer content.
- The repository defines global booking-night bounds of 2–30 nights. Quotes are not inventory holds; creation and availability checks must revalidate and fail closed on uncertainty.
- **Confirmed cancellation exception:** Owner fault requires a full deposit refund and zero platform commission. The wider renter cancellation/refund matrix remains unresolved and must not be invented.

## Prototype deposit payment

- Current Worker configuration explicitly uses `PAYMENT_MODE=PROTOTYPE`. This mode records a canonical prototype/test payment and never collects card credentials or calls a real-money Paymob flow.
- `PAYMENT_MODE=LIVE` must fail closed when a real Paymob implementation/configuration is unavailable; it must not silently use the mock gateway.
- Payment initiation derives Customer, Owner, booking status, deposit amount, and currency from canonical booking and `booking_financial_summaries` records.
- Completion must be atomic/idempotent through the payment RPC. It changes a valid `APPROVED_PENDING_PAYMENT` booking to `CONFIRMED`, persists `confirmed_at`, and does not recompute or overwrite the financial summary.

## Owner wallet and ledger

- Owner balances come from `owner_wallets`; financial activity comes from immutable `wallet_ledger_entries`. Do not reconstruct them from booking/property nightly prices.
- On confirmed prototype deposit completion, only the canonical owner net deposit is credited to **pending** balance once; available balance is not increased by that step.
- **Confirmed prototype accounting rule:** Owner net electronic deposit moves from Pending to Available 24 hours after check-in. The payment-completion path does not itself perform that later release.
- The minimum payout is 500 EGP; actual payout-provider fee is borne by the Owner. Payout action must not be made eligible solely because pending funds exist. Production legal/provider/operational validation remains required, but these prototype rules are not undefined.
- Financial request failure is an error, never a credible zero wallet or empty ledger.

## Truthful state and privacy

- **Error is not empty:** failed canonical reads must show a scoped error/retry state, not an honest-looking empty list, zero metric, or zero balance.
- A true empty/zero presentation requires a successful canonical response.
- Customers may see booking-relevant total, deposit, remaining amount, dates, and state; do not expose KONFRM commission, Owner net, wallet, payout, or admin internals.
- Chat is in-app and booking-contextual; do not expose phone/contact details. Reviews are eligible only after a completed stay.
- UI actions must be contextual to canonical lifecycle state; do not show valid-looking actions for unsupported/invalid states.

## Needs product confirmation

- Full renter cancellation/refund matrix, remaining-balance payment method, and payment/request-expiry deadlines are not safely derivable as complete product rules from the current memory documents.
- Production treatment of payout providers, legal/compliance, and release-clock verification remains open; it does not override the confirmed prototype accounting rule above.

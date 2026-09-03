# P2.2 Live Explore Hotfix — Codex Delta Review

## Mode
READ-ONLY / DELTA ONLY / REGRESSION REVIEW

## Base
`3b7e895b8fbfd25149d02091d7710e7545d67a74`

## Candidate
`f027c156936e08d07066f8371190354599b0ee15`

## PR
#13

## Exact PR CI
Run #181 / `33797616950` — SUCCESS

## Proven live regression
Production contains valid PUBLISHED + VERIFIED properties whose detailed `address` is the empty string. The Owner flow explicitly treats detailed address as optional. The current public Customer DTO rejects empty address and therefore fails the entire Explore collection.

## Product invariant
Detailed address remains optional. Do not fabricate or backfill address data. Public location presentation may truthfully fall back to `resortName`, then `region`, then the existing generic coastal label.

## Review only this delta
Expected changed paths exactly:
- `backend/server/src/contracts/publicProperty.ts`
- `backend/server/src/tests/p21PublicApiContract.test.ts`
- `customer-app/src/components/BookingReviewSheet.tsx`
- `customer-app/src/components/PropertyCard.tsx`
- `customer-app/src/components/PropertyDetailModal.tsx`
- `customer-app/src/utils/customerFavorites.ts`
- `customer-app/src/utils/customerTruthfulState.test.ts`

Verify:
1. Public property `address` remains required to be a string, but `''` / whitespace-only strings normalize to `''` and are valid.
2. Non-string address still fails closed.
3. No resort/region value is substituted into the canonical `address` DTO field.
4. Public Search and Detail stay otherwise as strict as before.
5. Customer Favorites validation has the same address semantics and does not weaken other fields.
6. UI fallback is presentation-only and ordered: address -> resortName -> region -> `الساحل الشمالي`.
7. No DB, Worker SQL matcher, Favorites RPC, booking, finance, auth, Owner/Admin, Payment, Chat, or Notifications behavior changed.
8. Regression tests materially cover the live failure mode and malformed-address rejection.
9. No new regression risk is introduced to Property Detail, Favorites, or Booking Review.

Critical or Important findings block publication.

If clean, end exactly:
`READY_FOR_LIVE_EXPLORE_HOTFIX_PUBLICATION_REVIEW`

If blocked, end exactly:
`P2_2_LIVE_EXPLORE_HOTFIX_CODEX_BLOCKED`

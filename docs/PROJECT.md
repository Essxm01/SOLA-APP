# KONFRM product context

## Purpose

KONFRM / كونفرم is an Arabic-first vacation-rental product. It connects Customers seeking accommodation with Owners managing rental properties, while Admin users operate review and oversight workflows.

## Roles

- **Customer:** discover eligible published properties, assess dates and pricing, request bookings, pay an approved prototype deposit, and communicate in booking context.
- **Owner:** manage properties, respond to booking requests, communicate with guests, see canonical wallet/ledger information, and maintain owner identity/verification information.
- **Admin:** review operational queues such as property submissions, verification, payouts, and disputes.

## Core domains

- Property discovery, owner property drafting/submission, images, and Admin review
- Booking request, Owner decision, availability blocking, and booking-context communication
- Prototype deposit payment, booking confirmation, owner wallet entitlement, and ledger records
- Owner identity/verification, Customer identity, sessions, and role-scoped data access
- Payout and dispute operational domains where implemented

## Terms

- **Canonical:** persisted, server-authoritative data; not browser mock/fallback state.
- **User:** a human identity in `users`.
- **Owner capability:** an optional `owners` extension sharing the same UUID as the user; a Customer is not automatically an Owner.
- **Deposit:** the booking financial summary’s upfront amount; payment rules are in [BUSINESS_RULES.md](./BUSINESS_RULES.md).
- **Visible identity:** KONFRM. Existing infrastructure identifiers may still say `SOLA` and are not a product rename request.

## Boundaries

This repository contains Customer, Owner, Admin, backend, Supabase migration, and Cloudflare Worker code. It does not document or implement real-money Paymob processing in the current prototype; see [INTEGRATIONS.md](./INTEGRATIONS.md).

# Customer Email-First Auth — Implementation Progress

- Scope: QA-first only; no Production mutation.
- RED #1: Auth V2 email-first contract failed because migration 032 did not exist.
- Migration 032 added: Customer `users.phone_number` nullable boundary + service-role-only atomic email registration RPC.
- RED #2: focused backend contract advanced to the legacy `EMAIL_ONLY_ACCOUNT_CREATION_NOT_ENABLED` guard.
- Backend service now has a method-aware completion path; PHONE behavior remains unchanged and EMAIL uses the migration-032 atomic registration boundary.
- Next gate: repository CI must expose and then close the remaining legacy deferred-email HTTP/client contracts before any QA migration is applied.

# Customer Email-First Auth — Implementation Progress

- Scope: QA-first only; no Production mutation.
- RED #1: Auth V2 email-first contract failed because migration 032 did not exist.
- Migration 032 added: Customer `users.phone_number` nullable boundary + service-role-only atomic email registration RPC.
- RED #2: focused backend contract advanced to the legacy `EMAIL_ONLY_ACCOUNT_CREATION_NOT_ENABLED` guard.
- Backend service now has a method-aware completion path; PHONE behavior remains unchanged and EMAIL uses the migration-032 atomic registration boundary.
- Legacy backend deferred-email HTTP/domain tests have been converted to the new email-first contract.
- Customer profile DTO now supports `phoneNumber = null` without weakening Owner phone requirements.
- Customer Auth client, Screen 09, Screen 10, and App handoff now treat PHONE and EMAIL as equal verified account-creation identifiers.
- Next gate: full repository CI must be green before any QA migration is applied.

# Customer Email-First / Multi-Identifier Auth Specification

## Goal
A KONFRM Customer account represents one human user with one or more verified identifiers. PHONE and EMAIL are equal account-creation and login methods. A Customer may exist with only a verified email, only a verified phone, or both. The same verified identifier must never belong to two users.

## Product rules
- New EMAIL CREATE_ACCOUNT: issue OTP, verify OTP, continue to Screen 10, collect full name only, create the Customer, create verified EMAIL identifier, issue canonical session, then resume the original Auth origin exactly like PHONE creation.
- New PHONE CREATE_ACCOUNT remains the current Screen 08 -> 09 -> 10 flow.
- Existing verified EMAIL or PHONE always authenticates the existing canonical user even if the entry intent was CREATE_ACCOUNT.
- LOGIN with a verified-but-unregistered EMAIL or PHONE returns a missing-account outcome after OTP; the UI may offer explicit account creation without sending another OTP, using the verified continuation.
- Screen 10 supports PHONE and EMAIL handoffs. It displays a subtle masked verified identifier matching the method. It never asks for the second identifier.
- Adding a second identifier from Account is a separate follow-up feature and is not implemented in this task. The backend/data model must remain compatible with it.
- Never auto-merge two existing users. If a future identifier-link flow finds the identifier already belongs to another user, linking must fail closed.
- Never move an identifier from one user to another implicitly.
- Account deletion/removal of identifiers is out of scope.

## Data-model rules
- `public.users.phone_number` becomes nullable so Customer email-only accounts are possible.
- Existing Owner flows still require phone numbers at their own service/repository boundary; this migration does not make Owner phone optional.
- `public.user_identifiers` remains the canonical login-identifier mapping. Existing unique `(identifier_type, normalized_value)` enforcement remains authoritative.
- For new email-only Customers, `users.email` stores the normalized verified email, `users.phone_number` is NULL, and `phone_verified_at` is NULL.
- For new phone-only Customers, current behavior remains: `users.phone_number` stores the verified phone, `phone_verified_at` is set, and `users.email` may be NULL.
- Canonical Customer API DTOs must allow `phoneNumber: null` and `phoneVerifiedAt: null`.

## Security rules
- No account-existence disclosure before OTP verification.
- Continuation tokens remain purpose-bound, short-lived, memory-only, and single-use.
- Account creation consumes the verified challenge atomically before mutation.
- A registration race where the identifier becomes registered before completion must return/authenticate the existing canonical user, not create a duplicate.
- No fake placeholder phone numbers.
- QA fixed OTP remains QA-only. Production fixed OTP remains forbidden.

## Routing rules
- Welcome Create Account -> successful registration -> Explore.
- Protected Booking -> preserved Booking Review only; never auto-submit.
- Protected Favorite -> scoped resume only when existing permission/handoff matches.
- Other existing origins keep current behavior.

## UI rules
- Screen 08 keeps PHONE and EMAIL methods.
- PHONE Customer policy remains 010 / 012 / 015 and fixed visible `+20` segment.
- EMAIL uses the existing email field and validation.
- Screen 09 OTP behavior remains the same except new-email CREATE_ACCOUNT proceeds to Screen 10 rather than the deferred-email dead end.
- Screen 10 keeps the already-approved shell, copy, one full-name field, CTA rhythm, retry behavior, and no extra onboarding fields.
- Screen 10 may show the verified identifier subtly: masked local phone for PHONE, masked email for EMAIL.

## Scope / safety
- QA first only. Do not apply the nullable-phone migration to Production without explicit Founder approval.
- Do not merge to `main` in this task.
- No Owner/Admin product redesign.
- No booking business-rule changes.
- No Screen 03 changes.

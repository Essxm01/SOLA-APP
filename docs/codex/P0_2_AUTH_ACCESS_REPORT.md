# P0.2 — Prototype authentication and access report

**Status:** Complete local release candidate (not published)  
**Evidence date:** 2026-08-30  
**Baseline:** `5cb7b421328004bc56e6b4eff99e79c601fead5d`

## Architecture verified

- Customer browsing is public for the explicit discovery routes. Protected Customer data/actions require `ROLE_CUSTOMER`; Customer prototype login is `/auth/prototype-login` and persists only after canonical profile validation.
- Owner prototype login uses the same human identity but requires an existing canonical `owners` extension. `AppProvider` is keyed to the canonical Owner ID and does not mount before profile validation.
- Admin login is separate; the persisted candidate token is validated through `/admin/auth/session` before the Admin shell renders.
- Backend verifies signed JWTs, applies role gates before Owner/Admin routes, and derives account/ownership from `jwt.sub`.

## P0.2 self-fixes

1. Removed the non-production JWT pattern fallback that accepted strings such as `admin_token_valid`. All access tokens now require a valid signature.
2. Removed the matching Admin detail-screen placeholder token fallbacks.
3. Made Customer persisted tokens candidates until `/customer/profile` validates them; a restoration outage now remains an explicit retryable account state rather than a credible authenticated view.
4. Made Owner bootstrap distinguish rejected sessions (clear to Login) from transport/server failure (truthful retry state); `HttpRepository` preserves HTTP status for that classification.
5. Made active prototype session issuance fail if canonical `user_sessions` persistence fails.

## OTP/SMS classification

| Finding | Classification | Conclusion |
| --- | --- | --- |
| Customer and Owner active login screens | `ACTIVE_PROTOTYPE_PATH` | Use `/auth/prototype-login`; no OTP/SMS step blocks access. |
| `/auth/request-otp`, `/auth/verify-otp`, `smsProvider`, Owner `OTPVerificationScreen` | `LEGACY_INACTIVE` | Retained but not imported by the active Owner entry path or Customer modal. |
| Historical OTP tests/specifications | `LEGACY_INACTIVE` | Historical evidence only; DC-04/current P0.2 override governs prototype access. |

## Acceptance matrix

| Items | Result | Evidence |
| --- | --- | --- |
| 01–07 | PASS | Baseline, mandatory authorities, role paths, backend gates, and OTP inventory inspected. |
| 08–10 | PASS | Active Customer/Owner prototype screens call `prototype-login`; Admin has email/password session flow, not OTP. |
| 11–15 | PASS | Public discovery route is not role-gated; protected Customer route rejects missing token; candidate-session restoration and logout are covered by code and focused state tests. |
| 16–20 | PASS | Owner identity test plus bootstrap helper prove canonical gate, pure-Customer denial, isolation, logout clearing, and outage/rejected-session distinction. |
| 21–25 | PASS | Admin truthful-state backend/client tests prove validated session, wrong-role rejection, no pre-validation shell, and logout cleanup. |
| 26–30 | PASS | New signed-token route test covers missing, invalid, wrong-role, correct-role, and `jwt.sub` ownership authority. |
| 31–33 | PASS | Customer/Owner/Admin failure states are explicit; patterned JWT and Admin UI fake-token fallbacks removed. |
| 34–38 | PASS | Focused suites, backend Node 22 check, and all three frontend production builds pass (Admin has no separate `check` script). |
| 39 | N/A | No visual authentication redesign; only scoped truthful error presentation was added and build/design checks cover it. |
| 40–45 | PASS | No secrets added; identity regression passed; this evidence/report and matrix/reality updates completed; closure review recorded below. |

## Tests and checks

- `prototypeAuthAccessP02.test.ts` passed: public discovery, missing/wrong/correct roles, signed tokens, and canonical Customer subject.
- Existing Owner Identity, Admin truthful-state, Customer truthful-state, Owner bootstrap, and focused auth suites executed successfully where they provide output; backend Node 22 `tsc --noEmit` passed.
- Customer, Owner, and Admin production builds passed. Admin has no `check` script; its TypeScript build is the applicable check.
- Design-system check passed after replacing the new raw primary hex with the central token.

## Scope and limitations

No database/RLS/storage/live-user change, deployment, or publication occurred. P0.2 does not certify the retained incomplete migration/RLS history, final production authentication, or exact deployed frontend revisions. Those remain routed to P1.1/P14.1/P20.1.

## Three-pass closure review

- **Functional:** prototype login/session candidates, refresh failure, logout, role gates, and public/protected route distinctions reviewed and tested.
- **Product/UI:** Customer and Owner failure presentation remains Arabic, role-scoped, and does not fabricate successful access; no unrelated UI redesign.
- **Adversarial:** missing, invalid, patterned, wrong-role, and client-identity scenarios were exercised. No new token/secret exposure was introduced.

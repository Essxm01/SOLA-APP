# Entry and bootstrap policy

## Current reality (audited 2026-08-23)

| App | Current entry | Authentication/bootstrap reality | Finding |
|---|---|---|---|
| Customer | Direct Explore shell and property request | Guest discovery is available immediately; authenticated profile/bookings restore in the background. No full-screen Splash. | The primary property request has a visible loading state, but non-success responses set an empty array rather than an error. |
| Owner | Auth restoration → Login or valid Owner session → manual branded Splash → optional local intro carousel → app data loading | Auth restoration is real. `SplashScreen` is shown after a valid Owner session and waits for a manual “الدخول للتطبيق”; it has no bootstrap dependency or fixed timer. | It is a decorative/manual gate, not a real loading requirement; it repeats on app remount. |
| Admin | Local `sola_admin_user` determines Login vs shell | No full-screen Splash. Authenticated shell renders immediately and overview/notifications fetch after render. | Overview failures are quiet and leave zero/stable-looking content; local session is not validated before shell render. |

## APPROVED EXISTING — first-run entry policy (`UX-ENTRY-01`)

KONFRM branded Splash is a **first-ever product experience only** for Customer and Owner. It appears exactly once, is very short (approximately 1–2 seconds), completes automatically, and is never a manually clickable gate.

It is **not** a bootstrap/loading state, session-validation screen, authentication gate or normal-launch experience. Technical loading remains separate and must communicate real pending work without an artificial branded delay.

### Customer

First ever run: **Splash → one-time Customer onboarding → public Explore/Home**. Onboarding is approximately three concise Arabic-first swipeable screens (four only when justified), includes progress and Skip, and must not force Login/Create Account. Public discovery remains available; authentication is requested only for an existing protected action and must preserve the Customer’s action context.

Returning Customer: **no Splash and no onboarding**. Open directly into the product/Explore while restoring any valid session through the normal lifecycle.

### Owner

First ever run: **Splash → one-time Owner onboarding → Login/Create Account → existing Owner onboarding/verification when required → Owner Home**. Owner onboarding is approximately three concise swipeable screens (four only when justified), includes progress and Skip, and explains operational Owner value rather than generic marketing.

Returning Owner: with a valid Owner session, open Owner Home directly; without one, open Login/Create Account directly. Logout does not reset first-run completion. Existing canonical Owner identity and capability rules remain authoritative.

### Admin

Admin does not use the Customer/Owner first-run Splash or onboarding model. Entry remains **validated Login/Session → operational workspace**, with real bootstrap/loading states only where work is pending. See `UX-ENTRY-02` and `ADMIN-TRUTHFUL-STATE-01`.

This records policy only; it does not change existing Splash/onboarding code.

# Entry and bootstrap policy

## Current reality (audited 2026-08-23)

| App | Current entry | Authentication/bootstrap reality | Finding |
|---|---|---|---|
| Customer | Direct Explore shell and property request | Guest discovery is available immediately; authenticated profile/bookings restore in the background. No full-screen Splash. | The primary property request has a visible loading state, but non-success responses set an empty array rather than an error. |
| Owner | Auth restoration → Login or valid Owner session → manual branded Splash → optional local intro carousel → app data loading | Auth restoration is real. `SplashScreen` is shown after a valid Owner session and waits for a manual “الدخول للتطبيق”; it has no bootstrap dependency or fixed timer. | It is a decorative/manual gate, not a real loading requirement; it repeats on app remount. |
| Admin | Local `sola_admin_user` determines Login vs shell | No full-screen Splash. Authenticated shell renders immediately and overview/notifications fetch after render. | Overview failures are quiet and leave zero/stable-looking content; local session is not validated before shell render. |

## RECOMMENDED / FOUNDER REVIEW — entry policy

- Customer/Owner may show a short branded launch state only while a real session or required bootstrap is pending.
- It must have no artificial delay and must transition immediately once the shell/data can render.
- Admin normally uses Login or the operational shell with scoped skeleton/loading; no decorative full-screen Splash.
- A failed validation renders an honest recovery/login state, never old account content or credible zeros.

This is a recommendation, not a change to existing Splash code. See `UX-ENTRY-01` and `UX-ENTRY-02`.

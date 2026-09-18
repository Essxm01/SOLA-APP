# Tabs, SegmentedControl, BottomNavigation and Header

- **Tabs:** switch peer views; active state uses `brand.primary`/selected surface, visible focus and an accessible relationship to the panel.
- **SegmentedControl:** compact mutually exclusive filter or mode control; selected state has text and surface/border distinction.
- **BottomNavigation:** Customer/Owner mobile navigation only; existing app icon plus label; 48px touch targets and safe-bottom space. Customer navigation features exactly 4 top-level tabs: استكشف (`Compass`), المفضلة (`Heart`), حجوزاتي (`CalendarDays`), and الحساب (`UserRound`). All tab icons use a unified `strokeWidth={2.2}`. Active state is rendered strictly as Blue icon + Blue label (`#0059FF`) with no background bubble, pill, circle, or surface fill. Inactive state is slate-400.
- **Header:** light `surface.primary` or canvas-adjacent surface, page context, limited actions, and no standard dark/navy app-header variant. On Customer Screen 03 Explore (Browse-first / Auth-late), the header is brand-only (KONFRM logo/wordmark only, 32px with alt="KONFRM"), omitting direct login/account shortcuts to keep the discovery canvas pure. Authentication and account management remain fully accessible via the persistent "الحساب" bottom-navigation tab and protected action interception (e.g., guest favorite tap or booking request submission).

Use an appropriate control rather than inventing a screen-specific filter or navigation pattern. Directional icons follow RTL behaviour.

## Navigation grammar

Use a full page for a meaningful destination or full entity; a BottomSheet for a short contextual task; a Dialog for short confirmation/high-stakes acknowledgement; and inline expansion for secondary detail that belongs to the current entity.

Back represents hierarchy. Close/X dismisses a temporary layer.

Customer top-level navigation remains Explore / Favorites / Bookings / Account unless a newer Founder decision changes it. Contextual capabilities such as booking chat do not automatically deserve a permanent bottom-navigation tab.

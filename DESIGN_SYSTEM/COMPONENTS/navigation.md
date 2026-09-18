# Tabs, SegmentedControl, BottomNavigation and Header

- **Tabs:** switch peer views; active state uses `brand.primary`/selected surface, visible focus and an accessible relationship to the panel.
- **SegmentedControl:** compact mutually exclusive filter or mode control; selected state has text and surface/border distinction.
- **BottomNavigation:** Customer/Owner mobile navigation only; existing app icon plus label; 44px targets and safe-bottom space. Do not infer a new global icon-family mandate from this contract.
- **Header:** light `surface.primary` or canvas-adjacent surface, page context, limited actions, and no standard dark/navy app-header variant.

Use an appropriate control rather than inventing a screen-specific filter or navigation pattern. Directional icons follow RTL behaviour.

## Navigation grammar

Use a full page for a meaningful destination or full entity; a BottomSheet for a short contextual task; a Dialog for short confirmation/high-stakes acknowledgement; and inline expansion for secondary detail that belongs to the current entity.

Back represents hierarchy. Close/X dismisses a temporary layer.

Customer top-level navigation remains Explore / Favorites / Bookings / Account unless a newer Founder decision changes it. Contextual capabilities such as booking chat do not automatically deserve a permanent bottom-navigation tab.

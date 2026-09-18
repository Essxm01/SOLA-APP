# Mobile shell contract

Customer and Owner are mobile-first, with a baseline viewport of `375px`.

- At desktop browser widths, authenticated mobile-app content may be centered and constrained to a maximum width of approximately `430px`.
- At mobile widths, the shell uses the natural viewport width.
- No fake phone frame, notch, simulator or fullscreen mode switch.
- Header, content area, sticky action region and bottom navigation reserve safe bottom padding.
- Bottom sheets originate from the viewport bottom, use the shared bottom-sheet radius/padding, and preserve an accessible close path.
- Interactive targets are at least `44 × 44px`.

This is a structural contract; it does not require mobile cards in desktop Admin.

## Current mobile implementation acceptance

Customer/Owner implementation should reserve safe space for both fixed bottom navigation and state-aware sticky decision bars. A fixed element may not cover the last actionable content.

For frequent touch controls prefer 48×48px, and for decision-primary CTA prefer approximately 52–56px height.

Current Customer/Owner visual QA uses 360×800, 390×844 and 430×932. Physical-device Founder review, when designated, is stronger visual/touch evidence than headless screenshots alone.

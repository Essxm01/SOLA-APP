# Mobile shell contract

Customer and Owner are mobile-first, with a baseline viewport of `375px`.

- At desktop browser widths, authenticated mobile-app content may be centered and constrained to a maximum width of approximately `430px`.
- At mobile widths, the shell uses the natural viewport width.
- No fake phone frame, notch, simulator or fullscreen mode switch.
- Header, content area, sticky action region and bottom navigation reserve safe bottom padding.
- Bottom sheets originate from the viewport bottom, use the shared bottom-sheet radius/padding, and preserve an accessible close path.
- Interactive targets are at least `44 × 44px`.

This is a structural contract; it does not require mobile cards in desktop Admin.

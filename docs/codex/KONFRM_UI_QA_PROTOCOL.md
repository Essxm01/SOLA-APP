# KONFRM UI QA protocol

Use this for every visible phase; code inspection alone is insufficient.

## Viewports

- Customer/Owner: inspect `360×800`, `390×844`, and `430×932`; confirm sticky actions and bottom navigation do not obscure content.
- Admin: inspect `1280px` and `1440px` desktop widths; check useful operational density.

## Required checks

- Light-first KONFRM foundations, Cairo, semantic tokens, no unapproved navy/gradient/glass surface.
- Arabic/RTL ordering, dates, prices, mixed numerals, labels/icons, chevrons, form alignment.
- No clipping, overflow, accidental two-line actions, unsafe touch target, hidden fixed content, fake image/avatar/metric/status, or raw enum.
- Exercise loading, success, genuine empty, error/retry, disabled, submission, and conflict states where applicable.
- Capture final screenshots for the affected flow and record viewport, state, route/context, and revision in the phase report.
- For a redesign, also capture the comparable pre-change state or describe the intentional before/after difference so visual regression is reviewable.

## Mandatory interaction evidence

For every affected visible flow, exercise the applicable buttons, links, navigation, primary CTA, inputs/forms, validation, loading/error/retry/conflict paths, disabled/enabled transitions, back navigation, scroll, sticky/fixed elements, bottom-navigation overlap, keyboard/input obstruction, and destructive/confirmation actions.

A screenshot is visual evidence only, not functional acceptance. Exercise every affected primary CTA unless it would require an unsafe action; record the exact reason and the safest alternative evidence when it cannot be exercised.

Do not use the mobile UX guide to override KONFRM-specific product/design authority; it is general quality guidance.

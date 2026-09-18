# Button and IconButton

All buttons use Cairo, `radius.control`, a visible focus ring and a minimum `44px` height/target on mobile.

| Variant | Purpose | Surface |
|---|---|---|
| Primary | one main action in a decision area | `brand.primary` with inverse text |
| Secondary | lower-priority non-destructive action | `surface.secondary` with primary text |
| Outline | alternative or cancel action | transparent/primary surface with default border |
| Ghost | tertiary action | transparent, neutral hover only |
| Destructive | irreversible confirmed action | `semantic.danger` only |

Yellow is never the normal primary CTA. All variants specify default, hover, pressed, focus, disabled and loading states. Loading disables repeat submission while retaining an accessible label. Button labels use `typography.button`; icon-and-label buttons use `space.inlineGap` and RTL-leading icon order.

`IconButton` is an icon-only Button: 44px target, visible focus, and an `aria-label`/tooltip. In surfaces already using Lucide, use the existing icon consistently; this does not approve a project-wide icon-library migration. It may not use an emoji as its action icon.

## Mobile decision-button refinement

For frequent Customer/Owner mobile controls, prefer a 48px touch area even though 44px remains the minimum. Decision-primary sticky CTAs should normally land around 52–56px in height.

A disabled primary action should not hide a recoverable failure. When retry is the valid next step, the recovery action may replace the disabled CTA until canonical state is restored.

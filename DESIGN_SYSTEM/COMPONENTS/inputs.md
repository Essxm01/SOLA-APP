# Input, Textarea, Select and Search

Controls use `surface.primary`, `border.default`, `radius.control`, Cairo `label/body` roles and a 44px minimum touch target.

- **Input:** label, value, helper text and field-associated error are separate semantic elements.
- **Textarea:** same contract; grows vertically without removing the label or error association.
- **Select:** exposes current choice and keyboard focus; no custom visual variant per screen.
- **Search:** is an Input with a labelled search affordance and clear action when content exists.

States are default, hover where appropriate, focus, filled, disabled, read-only, validation error and loading. Error uses text/icon plus semantic color; colour alone is insufficient. Direction-sensitive phone, ID and numeric input follows the RTL guideline.

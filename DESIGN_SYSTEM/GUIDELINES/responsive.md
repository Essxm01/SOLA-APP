# Responsive rules

| Mode | Meaningful transition |
|---|---|
| Mobile (375–430px) | Customer/Owner natural viewport shell, bottom navigation and touch-first controls. |
| Tablet (768px+) | Expand supporting layout only where comprehension improves; retain mobile priorities for Customer/Owner. |
| Desktop Admin (1024px+) | Admin may use tables, filters and review panels for decision speed. |

Breakpoints describe product structure, not arbitrary Tailwind defaults. Customer/Owner desktop browsers may center an approximately 430px shell; do not create a fake device frame.

## Customer/Owner mobile acceptance matrix

Current Customer/Owner design QA should explicitly include:

- 360×800
- 390×844
- 430×932

Check sticky actions, bottom navigation, long Arabic, image crops, calendars, numeric values, sheets/dialogs, safe areas and horizontal overflow at each width.

Emulator/headless evidence is supporting evidence. When the Founder designates a real device for acceptance, physical-device feel and touch ergonomics are the strongest final visual evidence.

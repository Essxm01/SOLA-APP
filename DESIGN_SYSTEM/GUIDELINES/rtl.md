# Arabic and RTL

- Default product direction is `dir="rtl"`; text alignment follows content direction.
- Label icons appear before their label in document order (RTL-leading visual edge).
- Back/previous points right in RTL; next/forward points left. Use direction-aware icons from the existing surface without implying a project-wide icon-family decision.
- Phone numbers, technical IDs and unbroken Latin strings use `dir="ltr"` with isolation so their characters do not reverse.
- Customer-facing money uses `1,600 ج.م` consistently. Dates and numbers preserve their intended reading order.
- Do not concatenate Arabic and English fragments in a way that produces accidental reversal; isolate IDs, amounts and phone values.

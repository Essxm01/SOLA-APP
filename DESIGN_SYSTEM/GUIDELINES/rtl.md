# 🇸🇦 SOLA Guidelines — Arabic / RTL UX Rules

> **Core Rule**: SOLA Ecosystem is **Arabic-First** and **RTL-Native** across all applications (Owner App, Renter App, Admin Portal).

---

## 1. Document Direction & Alignment
- Always set `<html lang="ar" dir="rtl">` or `<div dir="rtl">` on application wrappers.
- Text alignment defaults to `text-right` (`text-align: right`).
- Text flex alignment: `justify-start` places content on the right edge of container.

---

## 2. Icon Positioning & Directionality
- Icons associated with labels precede the text in document order (appear to the right of text in RTL).
- Directional arrows (Back, Next, Chevron) must be flipped for RTL:
  - **Back / Previous**: `ArrowRight` (points right, indicating going back in RTL).
  - **Next / Forward**: `ArrowLeft` or `ChevronLeft` (points left, indicating advancing in RTL).
  - **External Link**: `ArrowUpRight`.

---

## 3. Mixed Content & Technical Identifiers
- Egyptian Phone Numbers: Force `dir="ltr"` on input container with `text-left` and `+20` prefix on LTR edge.
- Financial Amounts: Render as `12,500 ج.م` with `font-mono` for numbers.
- Identifiers / Codes / IBANs: Force `font-mono` and `dir-ltr` where exact character order is critical.

# 📱 SOLA Guidelines — Responsive Design Architecture

---

## 1. Application Adaptation Matrix

| Application | Target Viewport | Navigation Model | Layout Density |
| :--- | :--- | :--- | :--- |
| **Owner App** | Mobile First (390-410px simulated) / Responsive Web | Bottom Navigation + Mobile Sheets | Compact Mobile Cards |
| **Renter App** | Native Mobile iOS/Android (375-430px) | Bottom Tab Bar + Top App Bar | Touch-Optimized Cards |
| **Admin Portal** | Desktop Web (1280px - 1440px) | Dark Glass Top Bar + Sub-Tabs | High Information Density / Tables |

---

## 2. Shared Principles Across All Viewports
- **Same Color Tokens**: `#0059FF` (Blue), `#FFD700` (Gold), `#F5F7FA` (Bg).
- **Same Card Geometry**: `rounded-2xl`, `border border-slate-200/80`.
- **Same Status System**: Semantic badge colors and chips.
- **Same Typography**: Cairo Arabic font hierarchy.

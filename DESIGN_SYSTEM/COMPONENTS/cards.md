# 🃏 SOLA Component Specification — Cards

> **Source of Truth**: `owner-app/src/components/ui/Card.tsx`

---

## Standard Card Anatomy
- **Background**: `#FFFFFF` (`bg-white`)
- **Border**: `1px solid rgba(226, 232, 240, 0.8)` (`border border-slate-200/80`)
- **Border Radius**: `16px` (`rounded-2xl`)
- **Padding**: `16px` (`p-4` or `p-6`)
- **Shadow**: `shadow-sm` (`box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05)`)
- **Hover Effect (`hoverEffect = true`)**: `hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200`

---

## Card Variants

### 1. Glass Panel Card (`glass-panel`)
- **Background**: `rgba(255, 255, 255, 0.85)`
- **Backdrop Filter**: `blur(12px)`
- **Border**: `1px solid rgba(255, 255, 255, 0.3)`

### 2. KPI Summary Card
- **Border**: Accent border on start edge (`border-l-4 border-l-[#0059FF]`, `border-l-amber-500`, `border-l-emerald-500`, or `border-l-rose-500`)
- **Icon Container**: `p-2.5 rounded-xl` with semantic background tint.

# 🧭 SOLA Component Specification — Navigation Systems

> **Source of Truth**: `owner-app/src/components/layout/*` & `admin-app/src/App.tsx`

---

## 1. Mobile Navigation Bar (Bottom Navigation)
- **Position**: Sticky at screen bottom (`fixed bottom-0 left-0 right-0 z-40`)
- **Surface**: `bg-white/95 backdrop-blur-md border-t border-slate-200`
- **Item State**:
  - Active: `text-[#0059FF] font-extrabold`
  - Inactive: `text-slate-500 font-semibold`
- **Icon Size**: `w-5 h-5`

---

## 2. Desktop Web Navigation Bar (Admin Workspace Nav)
- **Master Header**: Dark Glass (`glass-dark`, `bg-slate-900/95`, `backdrop-blur-md`)
- **Sub-Bar Navigation**: White background (`bg-white border-b border-slate-200`)
- **Tab Buttons**:
  - Active: `bg-[#0059FF] text-white shadow-xs rounded-xl font-extrabold px-4 py-2.5 text-xs`
  - Inactive: `text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-extrabold px-4 py-2.5 text-xs`

# 🔔 SOLA Component Specification — Alerts & Toasts

> **Source of Truth**: `owner-app/src/components/ui/Toast.tsx`

---

## 1. Banner Alert Component
- **Success Alert**: `bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl p-4 text-xs font-bold flex justify-between items-center shadow-xs`
- **Error Alert**: `bg-rose-50 border border-rose-300 text-rose-900 rounded-2xl p-4 text-xs font-bold flex justify-between items-center shadow-xs`
- **Warning Alert**: `bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl p-4 text-xs font-bold flex justify-between items-center shadow-xs`

---

## 2. Floating Toast Notification
- **Position**: `fixed bottom-20 left-1/2 -translate-x-1/2 z-50`
- **Container**: `px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2 text-xs font-bold animate-fade-in`

# 🪟 SOLA Component Specification — Modals & Dialogs

> **Source of Truth**: `admin-app/src/components/DisputeDetailExecution.tsx` & `PayoutDetailExecution.tsx`

---

## Anatomy & Architecture
1. **Backdrop Overlay**: `fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in`
2. **Modal Card**: `sola-card max-w-lg w-full p-6 shadow-2xl space-y-4 rounded-2xl bg-white border border-slate-200`
3. **Header**: `flex justify-between items-center border-b border-slate-100 pb-3`
   - Title: `text-base font-black text-slate-900`
   - Close Control: `text-slate-400 hover:text-slate-600 font-bold`
4. **Body Content**: Form fields, option selects, warning callouts.
5. **Action Footer**: `flex justify-end gap-3 pt-2`
   - Cancel Button: `px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs`
   - Confirm Button: `sola-btn-primary px-5 py-2 text-xs`

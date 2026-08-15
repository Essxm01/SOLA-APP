# ⌛ SOLA Component Specification — Loading, Empty & Error States

> **Source of Truth**: `owner-app/src/components/ui/LoadingSkeleton.tsx` & `EmptyState.tsx`

---

## 1. Skeleton Loading States
- **Box**: `animate-pulse bg-slate-200 rounded-xl`
- **Dashboard Skeleton**: Standard grid header skeleton + 4 metric box skeletons.

---

## 2. Empty States
- **Container**: `p-16 text-center text-slate-500 font-bold text-sm`
- **Icon Box**: `w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3`
- **Title**: `font-extrabold text-slate-800 text-sm mb-1`
- **Subtext**: `text-xs text-slate-500`

---

## 3. Error States
- **Container**: `p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2`
- **Title**: `font-bold text-rose-900 text-sm`
- **Action**: Secondary retry button `px-4 py-2 bg-white border border-rose-300 text-rose-800 rounded-xl font-bold text-xs`.

# 📱 SOLA Component Specification — Bottom Sheets

> **Source of Truth**: `owner-app/src/components/ui/BottomSheet.tsx`

---

## Anatomy & Architecture
1. **Backdrop Overlay**: `fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in`
2. **Sheet Container**: `relative w-full max-w-lg bg-white rounded-t-3xl p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto animate-fade-in border-t border-slate-200`
3. **Handle Indicator**: `w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4`
4. **Header Bar**: `flex items-center justify-between pb-4 mb-4 border-b border-slate-100`
   - Title: `text-lg font-bold text-slate-900`
   - Close Button: `w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200`
5. **Body**: Scrollable children container.

---

## Behavior Rules
- Locks `document.body.style.overflow = 'hidden'` when open.
- Restores `document.body.style.overflow = 'unset'` on unmount.
- Mobile-native touch targets and smooth fade-in animation.

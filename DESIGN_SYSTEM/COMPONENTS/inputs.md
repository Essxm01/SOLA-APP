# 📝 SOLA Component Specification — Inputs & Phone Controls

> **Source of Truth**: `owner-app/src/components/ui/Input.tsx`

---

## Standard Input Anatomy
1. **Container**: `w-full flex flex-col gap-1.5 text-right`
2. **Label**: `text-sm font-semibold text-slate-800`
3. **Input Element**: `w-full py-3 text-slate-900 bg-white border border-slate-200 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:border-[#0059FF] focus:ring-blue-100 placeholder:text-slate-400 text-sm px-4`
4. **Prefix Icon (Optional)**: `absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400` (causes `pr-11 pl-4`)
5. **Error Text**: `text-xs font-medium text-rose-600` (triggers `border-rose-400 focus:border-rose-500 focus:ring-rose-200`)
6. **Helper Text**: `text-xs text-slate-500`

---

## Special Control: Egyptian Phone Input (`PhoneInput`)
- **Container**: `flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden`
- **Country Prefix Badge**: `flex items-center gap-1.5 px-3 py-3 bg-slate-50 border-l border-slate-200 text-slate-700 font-medium text-sm select-none dir-ltr`
  - Flag: `🇪🇬`
  - Code: `+20` (`font-bold text-slate-900`)
- **Phone Input Field**: `type="tel" dir="ltr" placeholder="100 123 4567" maxLength={11}`
  - Typography: `font-mono tracking-wide text-left`

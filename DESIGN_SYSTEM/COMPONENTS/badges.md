# 🛡️ SOLA Component Specification — Badges & Status Chips

> **Source of Truth**: `owner-app/src/components/ui/Badge.tsx` & `constants/theme.ts`

---

## 1. Property / Payout / Booking Status Chip
- **Anatomy**: `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border transition-colors`
- **Dot Indicator**: `<span className="w-1.5 h-1.5 rounded-full bg-current" />`

---

## 2. Status Mapping Table

| Status Group | Status Code | Background | Text Color | Border Color | Label (Arabic) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Payout** | `PENDING` | `bg-amber-50` | `text-amber-900` | `border-amber-300` | قيد الطلب |
| **Payout** | `PROCESSING` | `bg-blue-50` | `text-[#0059FF]` | `border-blue-300` | قيد التحويل البنكي |
| **Payout** | `COMPLETED` | `bg-emerald-50` | `text-emerald-900` | `border-emerald-300` | تم التحويل بنجاح ✅ |
| **Payout** | `REJECTED` | `bg-rose-50` | `text-rose-900` | `border-rose-300` | مرفوض وإعادة الرصيد |
| **Dispute** | `OPENED` / `ESCALATED` | `bg-amber-50` | `text-amber-900` | `border-amber-300` | مصعد للإدارة |
| **Dispute** | `RESOLVING_PENDING_GATEWAY` | `bg-blue-50` | `text-[#0059FF]` | `border-blue-300` | معالجة الاسترداد |
| **Dispute** | `RESOLVED` | `bg-emerald-50` | `text-emerald-900` | `border-emerald-300` | تم حسم النزاع رسمياً ✅ |
| **Verification** | `VERIFIED` | `bg-emerald-100` | `text-emerald-900` | `border-emerald-300` | موثق رسمياً ✓ |

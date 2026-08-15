# 🔘 SOLA Component Specification — Buttons

> **Source of Truth**: `owner-app/src/components/ui/Button.tsx`

---

## Component Anatomy
1. **Container**: `inline-flex items-center justify-center font-semibold transition-all duration-200`
2. **Icon Element**: `shrink-0` (Lucide React icon with `w-4 h-4` or size appropriate)
3. **Text Label**: `<span>` tag with Cairo typography
4. **Loading Spinner**: `<Loader2 className="w-4 h-4 animate-spin shrink-0" />`

---

## Variants & Specifications

### 1. Primary Button (`primary`)
- **Background**: `#0059FF` (`bg-[#0059FF]`)
- **Hover**: `#0046CC` (`hover:bg-[#0046CC]`)
- **Text Color**: `#FFFFFF` (`text-white`)
- **Shadow**: `shadow-md shadow-blue-500/20`
- **Focus Ring**: `focus:ring-[#0059FF]`
- **Active State**: `active:scale-[0.98]`
- **Usage**: Main call to action on screen (Save, Confirm, Submit, Approve).

### 2. Secondary Button (`secondary`)
- **Background**: `#FFD700` (`bg-[#FFD700]`)
- **Hover**: `#E6C200` (`hover:bg-[#E6C200]`)
- **Text Color**: `#0F172A` (`text-slate-900`)
- **Shadow**: `shadow-md shadow-yellow-500/20`
- **Focus Ring**: `focus:ring-[#FFD700]`
- **Usage**: Secondary actions, highlight choices.

### 3. Outline Button (`outline`)
- **Background**: `#FFFFFF` (`bg-white`)
- **Border**: `2px solid #CBD5E1` (`border-2 border-slate-300 hover:border-slate-400`)
- **Text Color**: `#1E293B` (`text-slate-800`)
- **Focus Ring**: `focus:ring-slate-400`
- **Usage**: Neutral secondary options, cancel actions.

### 4. Ghost Button (`ghost`)
- **Background**: `transparent` (`hover:bg-slate-100`)
- **Text Color**: `#334155` (`text-slate-700`)
- **Focus Ring**: `focus:ring-slate-300`
- **Usage**: Tertiary actions, icon-only buttons, close controls.

### 5. Danger Button (`danger`)
- **Background**: `#E11D48` (`bg-rose-600 hover:bg-rose-700`)
- **Text Color**: `#FFFFFF` (`text-white`)
- **Shadow**: `shadow-md shadow-rose-500/20`
- **Focus Ring**: `focus:ring-rose-600`
- **Usage**: Destructive actions (Reject Payout, Delete Property, Cancel Booking).

---

## Sizes & Dimensions

| Size | Padding | Font Size | Border Radius | Icon Gap |
| :--- | :--- | :--- | :--- | :--- |
| **`sm`** | `px-3 py-1.5` | `text-xs` (12px) | `rounded-lg` (8px) | `gap-1.5` (6px) |
| **`md`** | `px-4 py-2.5` | `text-sm` (14px) | `rounded-xl` (12px) | `gap-2` (8px) |
| **`lg`** | `px-6 py-3.5` | `text-base` (16px) | `rounded-xl` (12px) | `gap-2.5` (10px) |

---

## States
- **Disabled**: `disabled:opacity-50 disabled:cursor-not-allowed`
- **Loading**: Replaces icon/content with `<Loader2 className="animate-spin" />` while disabling interaction.
- **RTL Behavior**: Icon precedes text in document order (right side of text in RTL).

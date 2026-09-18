/**
 * SOLA Customer App — GuestSelector
 * Clean row stepper for guest capacity selection.
 *
 * Rules:
 * - Clean row (no card soup).
 * - Right: "عدد الضيوف", "الحد الأقصى X".
 * - Left: "−   N   +".
 * - Minus/Plus: 48x48 hit targets.
 * - Value: ~16px/700 font.
 * - Minimum: 1.
 * - Maximum: canonical maxGuests.
 * - At max: disable Plus.
 * - Do NOT show amber warning merely because Customer reached max capacity.
 */

import React from 'react';
import { Minus, Plus } from 'lucide-react';

export interface GuestSelectorProps {
  guests: number;
  maxGuests: number;
  onChange: (next: number) => void;
}

export const GuestSelector: React.FC<GuestSelectorProps> = ({ guests, maxGuests, onChange }) => {
  const decrement = () => {
    if (guests <= 1) return;
    onChange(guests - 1);
  };

  const increment = () => {
    if (guests >= maxGuests) return;
    onChange(guests + 1);
  };

  return (
    <div className="flex items-center justify-between py-3 px-1 border-t border-slate-100">
      {/* Right side: labels */}
      <div className="text-right">
        <span className="text-sm font-bold text-slate-900 block">عدد الضيوف</span>
        <span className="text-xs text-slate-500 font-medium">الحد الأقصى {maxGuests}</span>
      </div>

      {/* Left side: Stepper Controls */}
      <div className="flex items-center gap-2.5" dir="ltr">
        <button
          type="button"
          onClick={decrement}
          disabled={guests <= 1}
          className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full border border-slate-300 text-slate-700 flex items-center justify-center hover:bg-slate-50 active:scale-95 disabled:border-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed transition-all"
          aria-label="تقليل عدد الضيوف"
        >
          <Minus className="w-4 h-4" />
        </button>

        <span className="w-8 text-center text-base font-bold text-slate-900 select-none">
          {guests}
        </span>

        <button
          type="button"
          onClick={increment}
          disabled={guests >= maxGuests}
          className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full border border-slate-300 text-slate-700 flex items-center justify-center hover:bg-slate-50 active:scale-95 disabled:border-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed transition-all"
          aria-label="زيادة عدد الضيوف"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

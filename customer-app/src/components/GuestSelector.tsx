/**
 * SOLA Customer App — GuestSelector
 * Mobile-first stepper with Arabic validation messages.
 *
 * Rules:
 * - Min 1 guest always.
 * - Max is property.maxGuests (passed as prop).
 * - Shows Arabic error if user attempts to exceed max.
 * - Stateless: controlled by parent.
 */

import React, { useState } from 'react';
import { Users, Minus, Plus } from 'lucide-react';

export interface GuestSelectorProps {
  guests: number;
  maxGuests: number;
  onChange: (next: number) => void;
}

export const GuestSelector: React.FC<GuestSelectorProps> = ({ guests, maxGuests, onChange }) => {
  const [showMaxWarning, setShowMaxWarning] = useState(false);

  const decrement = () => {
    if (guests <= 1) return;
    setShowMaxWarning(false);
    onChange(guests - 1);
  };

  const increment = () => {
    if (guests >= maxGuests) {
      setShowMaxWarning(true);
      return;
    }
    setShowMaxWarning(false);
    onChange(guests + 1);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
        {/* Label */}
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#0059FF]" />
          <span className="text-xs font-black text-slate-800">
            {guests} {guests === 1 ? 'فرد' : 'أفراد'}
          </span>
          <span className="text-[10px] font-bold text-slate-400">
            (الحد الأقصى {maxGuests})
          </span>
        </div>

        {/* Stepper Controls */}
        <div className="flex items-center gap-3" dir="ltr">
          <button
            onClick={decrement}
            disabled={guests <= 1}
            className={`w-8 h-8 flex items-center justify-center rounded-full border transition-all ${
              guests <= 1
                ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100 active:scale-95'
            }`}
            aria-label="تقليل عدد الأفراد"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <span className="w-6 text-center text-sm font-black text-slate-900">{guests}</span>

          <button
            onClick={increment}
            disabled={guests >= maxGuests}
            className={`w-8 h-8 flex items-center justify-center rounded-full border transition-all ${
              guests >= maxGuests
                ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                : 'border-[#0059FF] text-[#0059FF] hover:bg-blue-50 active:scale-95'
            }`}
            aria-label="زيادة عدد الأفراد"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Max guests warning */}
      {showMaxWarning && (
        <p className="text-[11px] font-bold text-rose-600 text-right px-1 animate-fade-in">
          هذه الوحدة لا تستوعب أكثر من {maxGuests} {maxGuests === 1 ? 'فرد' : 'أفراد'}
        </p>
      )}
    </div>
  );
};

import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

// KONFRM Customer Explore search entry — Screen 03 (Phase 5 / C2).
//
// The compact entry opens the DEDICATED Search & Refine surface (Screen 04);
// the old in-place sheet with hardcoded default dates was replaced. Date
// intent summary only appears once the user has set dates in Search & Refine.

import { type SearchIntent, formatArabicStayRange } from '../utils/searchIntent';

export interface SearchFilterState {
  destination: string;
  checkIn: string;
  checkOut: string;
  totalGuests: number;
  unitType: string;
  maxPrice: number;
}

interface CoastalSearchBarProps {
  onOpenSearch: () => void;
  activeDestination: string;
  onSelectDestinationChip: (dest: string) => void;
  intent: SearchIntent;
}

const popularDestinations = ['الكل', 'مراسي', 'رأس الحكمة', 'سيدي عبد الرحمن', 'هاسيندا', 'الساحل الشمالي'];

export const CoastalSearchBar: React.FC<CoastalSearchBarProps> = ({
  onOpenSearch,
  activeDestination,
  onSelectDestinationChip,
  intent,
}) => {

  return (
    <div className="w-full space-y-4 my-2">
      {/* Mobile Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">هتصيف فين؟ 🏖️</h1>
          <p className="text-xs text-slate-500 font-bold">اكتشف إقامتك المناسبة على الساحل بأسعار واضحة وتأكيد يبدأ بموافقة المالك</p>
        </div>
      </div>

      {/* Compact Mobile Search Card → opens Screen 04 */}
      <button
        onClick={onOpenSearch}
        className="w-full bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3 text-right hover:border-blue-300 active:scale-[0.99] transition-all"
        aria-label="افتح البحث والتفاصيل"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-[#0059FF] rounded-xl flex items-center justify-center shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 block">
              {intent.destination.trim() !== '' ? `بحثك: ${intent.destination.trim()}` : 'بحث عن وجهة، تواريخ، أو عدد أفراد'}
            </span>
            <span className="text-[10px] text-slate-400 font-bold">
              {intent.checkIn !== '' && intent.checkOut !== ''
                ? formatArabicStayRange(intent.checkIn, intent.checkOut)
                : 'أضف تواريخ لبحثك — اختياري'}{' '}
                • {intent.totalGuests} أفراد
            </span>
          </div>
        </div>
        <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center shrink-0">
          <SlidersHorizontal className="w-4 h-4" />
        </div>
      </button>

      {/* Coastal Destination Chips — live server-side destination filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
        {popularDestinations.map((dest) => {
          const isActive = activeDestination === dest;
          return (
            <button
              key={dest}
              onClick={() => onSelectDestinationChip(dest)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap min-h-[44px] flex items-center justify-center ${
                isActive
                  ? 'bg-[#0059FF] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {dest}
            </button>
          );
        })}
      </div>
    </div>
  );
};

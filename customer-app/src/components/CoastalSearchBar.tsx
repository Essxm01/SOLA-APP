import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { type SearchIntent, formatArabicStayRange, formatArabicGuests } from '../utils/searchIntent';

// KONFRM Customer Explore search entry — Screen 03 (Phase 5 / C2 / LAB visual remediation).
//
// Pure search entry surface opening the dedicated Search & Refine surface (Screen 04).
// 60-64px height, radius 16px, quiet border, subtle shadow, hit target is entire container.
// Default: "إلى أين تريد الذهاب؟" / "الوجهة · التواريخ · الضيوف"
// Active intent: Truthful destination summary / dates + guests.

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
  activeDestination?: string;
  onSelectDestinationChip?: (dest: string) => void;
  intent: SearchIntent;
}

export const CoastalSearchBar: React.FC<CoastalSearchBarProps> = ({
  onOpenSearch,
  intent,
}) => {
  const destTitle = React.useMemo(() => {
    if (intent.destinations && intent.destinations.length > 1) {
      // Truthful multi-destination summary — never promote one destination
      // as the main intent when several are actually selected.
      return `${intent.destinations.length} وجهات محددة`;
    }
    if (intent.destinations && intent.destinations.length === 1) {
      return intent.destinations[0];
    }
    if (intent.destination && intent.destination.trim() !== '') {
      return intent.destination.trim();
    }
    return null;
  }, [intent.destinations, intent.destination]);

  const hasDates = Boolean(intent.checkIn && intent.checkOut);
  const hasActiveIntent = Boolean(destTitle || hasDates || intent.totalGuests > 1);

  const mainCopy = destTitle || 'إلى أين تريد الذهاب؟';

  // Secondary line is derived from ACTUAL state only: real dates when set,
  // real guests summary; never inserts missing values as selected state.
  const secondaryCopy = React.useMemo(() => {
    if (!hasActiveIntent) {
      return 'الوجهة · التواريخ · الضيوف';
    }
    const parts: string[] = [];
    if (hasDates) {
      parts.push(formatArabicStayRange(intent.checkIn, intent.checkOut));
    }
    parts.push(formatArabicGuests(intent.totalGuests || 1));
    return parts.join(' · ');
  }, [hasActiveIntent, hasDates, intent.checkIn, intent.checkOut, intent.totalGuests]);

  return (
    <div className="w-full">
      {/* Search Entry Surface (60-64px height, radius 16px, hit target is entire container) */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="w-full min-h-[62px] bg-white px-3.5 py-2.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 text-right hover:border-slate-300 hover:shadow-sm active:scale-[0.99] transition-all cursor-pointer"
        aria-label="افتح البحث والتفاصيل"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 bg-blue-50 text-[#0059FF] rounded-xl flex items-center justify-center shrink-0">
            <Search className="w-5 h-5 text-[#0059FF]" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-bold text-slate-900 block truncate">
              {mainCopy}
            </span>
            <span className="text-xs text-slate-400 font-medium block truncate mt-0.5">
              {secondaryCopy}
            </span>
          </div>
        </div>
        <div className="w-9 h-9 bg-slate-100/80 text-slate-600 rounded-xl flex items-center justify-center shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-slate-600" />
        </div>
      </button>
    </div>
  );
};

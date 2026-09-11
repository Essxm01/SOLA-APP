import React from 'react';
import { ArrowRight, MapPin, Calendar, Users, Home, Search, X } from 'lucide-react';
import { PropertyCard, CustomerPropertyItem } from './PropertyCard';
import { LoadingStateView, EmptyStateView, ErrorStateView } from './StateViews';
import {
  type SearchIntent,
  getPropertyTypeLabel,
  formatArabicStayRange,
} from '../utils/searchIntent';

// KONFRM Customer Search Results — Screen 05 (Phase 5 / C2).
//
// Intent summary + canonical public results. Dates shown ONLY as selected
// search intent — the public API does not date-filter availability, so no
// "متاح في تواريخك" claim is ever made.

export type ResultsLoadState = 'LOADING' | 'LOADED' | 'EMPTY' | 'ERROR';

export interface SearchResultsScreenProps {
  intent: SearchIntent;
  items: CustomerPropertyItem[];
  loadState: ResultsLoadState;
  errorMessage: string | null;
  favoritesActionError?: string | null;
  onDismissFavoritesError?: () => void;
  onRetry: () => void;
  onEditSearch: () => void;
  onBackToExplore: () => void;
  onSelectProperty: (id: string) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
}

const intentChips = (intent: SearchIntent): Array<{ icon: 'pin' | 'cal' | 'users' | 'home' | 'price'; text: string }> => {
  const chips: Array<{ icon: 'pin' | 'cal' | 'users' | 'home' | 'price'; text: string }> = [];

  const dests = Array.isArray(intent.destinations) && intent.destinations.length > 0
    ? intent.destinations
    : (intent.destination && intent.destination.trim() !== '' ? [intent.destination.trim()] : []);
  if (dests.length === 1) {
    chips.push({ icon: 'pin', text: dests[0] });
  } else if (dests.length > 1) {
    chips.push({ icon: 'pin', text: `${dests[0]} + ${dests.length - 1}` });
  }

  if (intent.checkIn !== '' && intent.checkOut !== '') {
    chips.push({ icon: 'cal', text: `بحثك: ${formatArabicStayRange(intent.checkIn, intent.checkOut)}` });
  }
  if (intent.totalGuests > 1) {
    chips.push({ icon: 'users', text: `${intent.totalGuests} أفراد` });
  }

  const types = Array.isArray(intent.unitTypes) && intent.unitTypes.length > 0
    ? intent.unitTypes.filter(t => t !== 'ALL')
    : (intent.unitType && intent.unitType !== 'ALL' ? [intent.unitType] : []);
  if (types.length === 1) {
    chips.push({ icon: 'home', text: getPropertyTypeLabel(types[0]) });
  } else if (types.length > 1) {
    chips.push({ icon: 'home', text: `${types.length} أنواع وحدات` });
  }

  if (intent.maxPriceTouched && intent.maxPrice > 0) {
    chips.push({ icon: 'price', text: `حتى ${intent.maxPrice.toLocaleString('ar-EG')} ج.م` });
  }
  return chips;
};

const ChipIcon: React.FC<{ icon: 'pin' | 'cal' | 'users' | 'home' | 'price' }> = ({ icon }) => {
  switch (icon) {
    case 'pin': return <MapPin className="w-3 h-3" />;
    case 'cal': return <Calendar className="w-3 h-3" />;
    case 'users': return <Users className="w-3 h-3" />;
    case 'home': return <Home className="w-3 h-3" />;
    default: return <Search className="w-3 h-3" />;
  }
};

export const SearchResultsScreen: React.FC<SearchResultsScreenProps> = ({
  intent,
  items,
  loadState,
  errorMessage,
  favoritesActionError,
  onDismissFavoritesError,
  onRetry,
  onEditSearch,
  onBackToExplore,
  onSelectProperty,
  isFavorite,
  onToggleFavorite,
}) => {
  const chips = intentChips(intent);

  return (
    <div dir="rtl" className="fixed inset-0 z-[45] bg-white overflow-y-auto">
      <div className="w-full max-w-md mx-auto pb-24">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center gap-3 z-10">
          <button
            onClick={onBackToExplore}
            aria-label="رجوع للاستكشاف"
            className="min-h-[44px] min-w-[44px] rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/40"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-extrabold text-[#0F172A]">نتائج البحث</h1>
        </div>

        <div className="px-4 pt-3">
          {/* Active intent summary (editable) */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex flex-wrap gap-1.5">
              {chips.length === 0 && (
                <span className="text-xs font-bold text-[#64748B]">كل الإقامات المنشورة</span>
              )}
              {chips.map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-[#EAF1FF] text-[#0059FF] text-[11px] font-extrabold px-2.5 py-1 rounded-full">
                  <ChipIcon icon={c.icon} />
                  {c.text}
                </span>
              ))}
            </div>
            <button
              onClick={onEditSearch}
              className="shrink-0 min-h-[44px] px-3 rounded-xl text-sm font-extrabold text-[#0059FF] hover:bg-[#EAF1FF] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/40"
            >
              تعديل
            </button>
          </div>

          {/* Immediate visible favorite failure banner */}
          {favoritesActionError && (
            <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs font-bold text-rose-700 animate-in fade-in">
              <span>{favoritesActionError}</span>
              {onDismissFavoritesError && (
                <button
                  type="button"
                  onClick={onDismissFavoritesError}
                  aria-label="إغلاق التنبيه"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center text-rose-500 hover:text-rose-700 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* States */}
          {loadState === 'LOADING' && (
            <LoadingStateView message="جاري البحث في الإقامات المنشورة..." />
          )}

          {loadState === 'ERROR' && (
            <ErrorStateView
              title="تعذر تحميل نتائج البحث"
              message={errorMessage || 'تحقق من الاتصال وحاول مرة أخرى.'}
              onRetry={onRetry}
            />
          )}

          {loadState === 'EMPTY' && (
            <EmptyStateView
              title="لا توجد نتائج مطابقة لبحثك"
              description="جرّب توسيع نطاق البحث: عدّل الوجهة أو نوع الوحدة أو عدد الأفراد أو ارفع سقف السعر."
              onReset={onEditSearch}
            />
          )}

          {loadState === 'LOADED' && items.length === 0 && (
            <EmptyStateView
              title="لا توجد نتائج مطابقة لبحثك"
              description="جرّب توسيع نطاق البحث: عدّل الوجهة أو نوع الوحدة أو عدد الأفراد أو ارفع سقف السعر."
              onReset={onEditSearch}
            />
          )}

          {loadState === 'LOADED' && items.length > 0 && (
            <>
              <div className="flex items-center justify-between my-3">
                <h2 className="text-sm font-black text-slate-900">النتائج ({items.length})</h2>
              </div>
              <div className="space-y-4 my-3">
                {items.map((prop) => (
                  <PropertyCard
                    key={prop.id}
                    property={prop}
                    onSelect={onSelectProperty}
                    isFavorite={isFavorite(prop.id)}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { ArrowRight, MapPin, Calendar, Users, Home } from 'lucide-react';

// KONFRM Customer Search & Refine — Screen 04 (Phase 5 / C2).
//
// ONE focused surface: destination + dates + guests + supported filters.
// Dates are USER SEARCH INTENT only (the public API has no server-side date
// availability filtering) — validated locally against the 2–30 night rule and
// past dates; never presented as availability truth.

import {
  validateStayRange,
  nightsBetween,
  type SearchIntent,
} from '../utils/searchIntent';

// Canonical property types — the exact set the backend accepts for property
// creation (backend/server/src/app.ts propertyTypes set): CHALET, VILLA,
// APARTMENT, STUDIO, HOTEL_ROOM, OTHER. Arabic customer labels only; no
// backend enum language is shown to the customer.
const UNIT_TYPES: Array<{ id: string; label: string }> = [
  { id: 'ALL', label: 'الكل' },
  { id: 'CHALET', label: 'شاليه' },
  { id: 'VILLA', label: 'فيلا' },
  { id: 'APARTMENT', label: 'شقة مصيفية' },
  { id: 'STUDIO', label: 'استوديو' },
  { id: 'HOTEL_ROOM', label: 'غرفة فندقية' },
  { id: 'OTHER', label: 'أخرى' },
];

const ERROR_COPY: Record<string, string> = {
  SEARCH_DATES_INCOMPLETE: 'أكمل تاريخي الوصول والمغادرة أو امسحهما معًا.',
  SEARCH_DATES_MALFORMED: 'صيغة التاريخ غير صحيحة.',
  SEARCH_DATE_PAST: 'لا يمكن اختيار تاريخ في الماضي.',
  SEARCH_DATE_ORDER_INVALID: 'تاريخ المغادرة لازم يكون بعد تاريخ الوصول.',
  SEARCH_STAY_TOO_SHORT: 'أقل مدة إقامة ليلتان.',
  SEARCH_STAY_TOO_LONG: 'أقصى مدة إقامة 30 ليلة.',
};

export interface SearchRefineScreenProps {
  initialIntent: SearchIntent;
  onApply: (intent: SearchIntent) => void;
  onClose: () => void;
}

export const SearchRefineScreen: React.FC<SearchRefineScreenProps> = ({
  initialIntent,
  onApply,
  onClose,
}) => {
  const [destination, setDestination] = useState(initialIntent.destination);
  const [checkIn, setCheckIn] = useState(initialIntent.checkIn);
  const [checkOut, setCheckOut] = useState(initialIntent.checkOut);
  const [totalGuests, setTotalGuests] = useState(initialIntent.totalGuests);
  const [unitType, setUnitType] = useState(initialIntent.unitType);
  const [maxPrice, setMaxPrice] = useState(initialIntent.maxPrice);
  const [maxPriceTouched, setMaxPriceTouched] = useState(initialIntent.maxPriceTouched);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const range = validateStayRange(checkIn, checkOut, today);
  const nights = nightsBetween(checkIn, checkOut);
  const datesValid = range.ok;
  const canApply = datesValid;

  const apply = () => {
    if (!canApply) return;
    onApply({ destination: destination.trim(), checkIn, checkOut, totalGuests, unitType, maxPrice, maxPriceTouched });
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-[75] bg-white overflow-y-auto">
      <div className="w-full max-w-md mx-auto pb-28">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center gap-3 z-10">
          <button
            onClick={onClose}
            aria-label="رجوع للاستكشاف"
            className="min-h-[44px] min-w-[44px] rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/40"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-extrabold text-[#0F172A]">ابحث عن إقامتك</h1>
        </div>

        <div className="px-4 pt-4 space-y-6">
          {/* Destination */}
          <section>
            <label htmlFor="c2-destination" className="flex items-center gap-1.5 text-[13px] font-black text-[#0F172A] mb-1.5">
              <MapPin className="w-4 h-4 text-[#0059FF]" />
              <span>الوجهة أو القرية</span>
            </label>
            <input
              id="c2-destination"
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="مثال: مراسي، رأس الحكمة، هاسيندا..."
              className="w-full min-h-[50px] p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#0059FF] focus:ring-2 focus:ring-[#0059FF]/15"
            />
          </section>

          {/* Dates */}
          <section>
            <div className="flex items-center gap-1.5 text-[13px] font-black text-[#0F172A] mb-1.5">
              <Calendar className="w-4 h-4 text-[#0059FF]" />
              <span>تواريخ الإقامة (اختياري)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="c2-checkin" className="block text-[11px] font-bold text-[#64748B] mb-1">الوصول</label>
                <input
                  id="c2-checkin"
                  type="date"
                  min={today}
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full min-h-[48px] p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#0059FF]"
                />
              </div>
              <div>
                <label htmlFor="c2-checkout" className="block text-[11px] font-bold text-[#64748B] mb-1">المغادرة</label>
                <input
                  id="c2-checkout"
                  type="date"
                  min={checkIn || today}
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full min-h-[48px] p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#0059FF]"
                />
              </div>
            </div>
            {/* Nights + validation */}
            <p className={`mt-2 text-xs font-bold ${range.ok ? 'text-[#475569]' : 'text-rose-600'}`} role={range.ok ? undefined : 'alert'}>
              {range.ok
                ? nights != null && nights > 0
                  ? `مدة الإقامة: ${nights} ${nights === 1 ? 'ليلة' : nights === 2 ? 'ليلتين' : nights <= 10 ? 'ليالٍ' : 'ليلة'}`
                  : 'بدون تواريخ — ستتصفح كل الإقامات المنشورة.'
                : ERROR_COPY[range.errorCode ?? ''] ?? 'راجع التواريخ المدخلة.'}
            </p>
          </section>

          {/* Guests stepper */}
          <section>
            <div className="flex items-center gap-1.5 text-[13px] font-black text-[#0F172A] mb-1.5">
              <Users className="w-4 h-4 text-[#0059FF]" />
              <span>عدد الأفراد</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTotalGuests((g) => Math.max(1, g - 1))}
                disabled={totalGuests <= 1}
                aria-label="تقليل عدد الأفراد"
                className="min-h-[44px] min-w-[44px] rounded-xl bg-[#F1F5F9] text-[#0F172A] text-lg font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/40"
              >
                −
              </button>
              <span className="min-w-[64px] text-center text-base font-black text-[#0F172A]" aria-live="polite">
                {totalGuests} {totalGuests === 1 ? 'فرد' : 'أفراد'}
              </span>
              <button
                onClick={() => setTotalGuests((g) => g + 1)}
                aria-label="زيادة عدد الأفراد"
                className="min-h-[44px] min-w-[44px] rounded-xl bg-[#F1F5F9] text-[#0F172A] text-lg font-black hover:bg-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/40"
              >
                +
              </button>
            </div>
          </section>

          {/* Unit type — canonical supported values */}
          <section>
            <div className="flex items-center gap-1.5 text-[13px] font-black text-[#0F172A] mb-1.5">
              <Home className="w-4 h-4 text-[#0059FF]" />
              <span>نوع الوحدة</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {UNIT_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setUnitType(t.id)}
                  aria-pressed={unitType === t.id}
                  className={`min-h-[44px] rounded-xl text-xs font-extrabold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/40 ${
                    unitType === t.id
                      ? 'bg-[#0059FF] text-white border-[#0059FF]'
                      : 'bg-white text-[#475569] border-[#E2E8F0] hover:border-[#CBD5E1]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </section>

          {/* Max price — supported filter; only applied when touched */}
          <section>
            <div className="flex justify-between text-[13px] font-black mb-1">
              <span className="text-[#0F172A]">الحد الأقصى للسعر في الليلة</span>
              <span className="text-[#0059FF]">{maxPriceTouched && maxPrice > 0 ? `${maxPrice.toLocaleString()} ج.م` : 'بدون حد'}</span>
            </div>
            <input
              type="range"
              min={1000}
              max={40000}
              step={500}
              value={maxPrice || 40000}
              onChange={(e) => { setMaxPrice(Number(e.target.value)); setMaxPriceTouched(true); }}
              aria-label="الحد الأقصى للسعر في الليلة"
              className="w-full accent-[#0059FF]"
            />
            {!maxPriceTouched && (
              <p className="text-[11px] font-bold text-[#64748B] mt-1">بدون حد أقصى — حرّك الشريط لتحديد سقف للسعر.</p>
            )}
          </section>
        </div>

        {/* Sticky apply CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="max-w-md mx-auto">
            <button
              onClick={apply}
              disabled={!canApply}
              className="w-full min-h-[54px] rounded-2xl bg-[#0059FF] text-white text-base font-extrabold
                         disabled:bg-[#CBD5E1] disabled:text-[#64748B] disabled:cursor-not-allowed
                         hover:bg-[#0046CC] transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0059FF]/25"
            >
              عرض النتائج
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { ArrowRight, MapPin, Calendar, Users, Home } from 'lucide-react';
import { MultiSelectDropdown, type MultiSelectOption } from './MultiSelectDropdown';

// KONFRM Customer Search & Refine — Screen 04 (Phase 5 / C2).
//
// ONE focused surface: destination + dates + guests + supported filters.
// Dates are USER SEARCH INTENT only (the public API has no server-side date
// availability filtering) — validated locally against the 2–30 night rule and
// past dates; never presented as availability truth.

import {
  validateStayRange,
  nightsBetween,
  formatArabicDate,
  getLocalTodayISO,
  type SearchIntent,
  type FilterMetadata,
} from '../utils/searchIntent';

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
  filterMetadata?: FilterMetadata;
  onApply: (intent: SearchIntent) => void;
  onClose: () => void;
}

export const SearchRefineScreen: React.FC<SearchRefineScreenProps> = ({
  initialIntent,
  filterMetadata,
  onApply,
  onClose,
}) => {
  const [destinations, setDestinations] = useState<string[]>(
    initialIntent.destinations && initialIntent.destinations.length > 0
      ? initialIntent.destinations
      : initialIntent.destination
      ? [initialIntent.destination]
      : []
  );
  const [unitTypes, setUnitTypes] = useState<string[]>(
    initialIntent.unitTypes && initialIntent.unitTypes.length > 0
      ? initialIntent.unitTypes.filter((t) => t !== 'ALL')
      : initialIntent.unitType && initialIntent.unitType !== 'ALL'
      ? [initialIntent.unitType]
      : []
  );
  const [checkIn, setCheckIn] = useState(initialIntent.checkIn);
  const [checkOut, setCheckOut] = useState(initialIntent.checkOut);
  const [totalGuests, setTotalGuests] = useState(initialIntent.totalGuests);
  const [maxPrice, setMaxPrice] = useState(initialIntent.maxPrice);
  const [maxPriceTouched, setMaxPriceTouched] = useState(initialIntent.maxPriceTouched);

  const today = useMemo(() => getLocalTodayISO(), []);
  const range = validateStayRange(checkIn, checkOut, today);
  const nights = nightsBetween(checkIn, checkOut);
  const datesValid = range.ok;
  const canApply = datesValid;

  const priceCeiling = filterMetadata?.priceCeiling ?? 50000;
  const sliderValue = maxPriceTouched && maxPrice > 0 ? maxPrice : priceCeiling;

  const destinationOptions: MultiSelectOption[] = useMemo(() => {
    const list = filterMetadata?.availableDestinations ?? [];
    return list.map((d) => ({ id: d, label: d }));
  }, [filterMetadata?.availableDestinations]);

  // Unit Type Options & Horizontal Chips:
  // Inventory-backed, customer-facing canonical Arabic names.
  // Order: الكل -> شقة -> استوديو -> شاليه -> فيلا -> other valid types
  const unitTypeChips = useMemo(() => {
    const list = filterMetadata?.availableUnitTypes ?? [];
    const source = list.length > 0
      ? list.map((t) => ({
          id: t.value,
          label: t.value === 'APARTMENT' ? 'شقة' : t.label,
        }))
      : [
          { id: 'APARTMENT', label: 'شقة' },
          { id: 'STUDIO', label: 'استوديو' },
          { id: 'CHALET', label: 'شاليه' },
          { id: 'VILLA', label: 'فيلا' },
        ];

    const priorityOrder = ['APARTMENT', 'STUDIO', 'CHALET', 'VILLA', 'HOTEL_ROOM', 'OTHER'];
    const sorted = [...source].sort((a, b) => {
      const idxA = priorityOrder.indexOf(a.id);
      const idxB = priorityOrder.indexOf(b.id);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    return [{ id: 'ALL', label: 'الكل' }, ...sorted];
  }, [filterMetadata?.availableUnitTypes]);

  const isAllUnitTypesSelected = unitTypes.length === 0 || unitTypes.includes('ALL');

  const handleToggleUnitType = (optId: string) => {
    if (optId === 'ALL') {
      // If "الكل" is selected, all specific selections are cleared.
      setUnitTypes([]);
      return;
    }

    // Specific option clicked
    const currentSpecific = unitTypes.filter((t) => t !== 'ALL');
    let next: string[];

    if (currentSpecific.includes(optId)) {
      // Deselect this option
      next = currentSpecific.filter((t) => t !== optId);
    } else {
      // Select this option
      next = [...currentSpecific, optId];
    }

    setUnitTypes(next);
  };

  const handleSliderChange = (newVal: number) => {
    if (newVal >= priceCeiling) {
      setMaxPrice(0);
      setMaxPriceTouched(false);
    } else {
      setMaxPrice(newVal);
      setMaxPriceTouched(true);
    }
  };

  const apply = () => {
    if (!canApply) return;
    const effectiveUnitTypes = unitTypes.filter((t) => t !== 'ALL');
    onApply({
      destination: destinations.length > 0 ? destinations[0] : '',
      destinations,
      checkIn,
      checkOut,
      totalGuests,
      unitType: effectiveUnitTypes.length > 0 ? effectiveUnitTypes[0] : 'ALL',
      unitTypes: effectiveUnitTypes,
      maxPrice,
      maxPriceTouched,
    });
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
          {/* Destination Multi-Select Dropdown — Pure Tap-to-Select, Zero Typing */}
          <section>
            <MultiSelectDropdown
              id="c2-destinations"
              label="الوجهة أو القرية"
              icon={<MapPin className="w-4 h-4 text-[#0059FF]" />}
              options={destinationOptions}
              selected={destinations}
              onChange={setDestinations}
              placeholder="اختر الوجهات..."
              emptySummary="كل الوجهات (اختياري)"
              clearLabel="مسح الوجهات"
            />
          </section>

          {/* Dates */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#0F172A]">
                <Calendar className="w-4 h-4 text-[#0059FF]" />
                <span>تواريخ الإقامة (اختياري)</span>
              </div>
              {(checkIn !== '' || checkOut !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    setCheckIn('');
                    setCheckOut('');
                  }}
                  className="min-h-[44px] px-2 text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 rounded-lg"
                >
                  مسح التواريخ
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Check-in */}
              <div>
                <label htmlFor="c2-checkin" className="block text-[11px] font-bold text-[#64748B] mb-1">
                  الوصول
                </label>
                <div className="relative w-full min-h-[50px] p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs font-bold text-[#0F172A] focus-within:border-[#0059FF] focus-within:ring-2 focus-within:ring-[#0059FF]/15">
                  <span className={checkIn ? 'text-[#0F172A]' : 'text-[#94A3B8]'}>
                    {checkIn ? formatArabicDate(checkIn) : 'اختر تاريخ'}
                  </span>
                  <input
                    id="c2-checkin"
                    type="date"
                    min={today}
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    aria-label="تاريخ الوصول"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-base"
                  />
                </div>
              </div>

              {/* Check-out */}
              <div>
                <label htmlFor="c2-checkout" className="block text-[11px] font-bold text-[#64748B] mb-1">
                  المغادرة
                </label>
                <div className="relative w-full min-h-[50px] p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs font-bold text-[#0F172A] focus-within:border-[#0059FF] focus-within:ring-2 focus-within:ring-[#0059FF]/15">
                  <span className={checkOut ? 'text-[#0F172A]' : 'text-[#94A3B8]'}>
                    {checkOut ? formatArabicDate(checkOut) : 'اختر تاريخ'}
                  </span>
                  <input
                    id="c2-checkout"
                    type="date"
                    min={checkIn || today}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    aria-label="تاريخ المغادرة"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-base"
                  />
                </div>
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
            <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#0F172A] mb-1.5">
              <Users className="w-4 h-4 text-[#0059FF]" />
              <span>عدد الأفراد</span>
            </div>
            <div className="w-full min-h-[50px] p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-[#64748B] pr-2">الحد الأدنى للسعة المطلوبة</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTotalGuests((g) => Math.max(1, g - 1))}
                  disabled={totalGuests <= 1}
                  aria-label="تقليل عدد الأفراد"
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-white border border-[#E2E8F0] text-[#0F172A] text-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/40"
                >
                  −
                </button>
                <span className="min-w-[60px] text-center text-sm font-bold text-[#0F172A]" aria-live="polite">
                  {totalGuests} {totalGuests === 1 ? 'فرد' : 'أفراد'}
                </span>
                <button
                  type="button"
                  onClick={() => setTotalGuests((g) => g + 1)}
                  aria-label="زيادة عدد الأفراد"
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-white border border-[#E2E8F0] text-[#0F172A] text-lg font-bold hover:bg-slate-50 transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/40"
                >
                  +
                </button>
              </div>
            </div>
          </section>

          {/* Unit Type — Horizontal Scrollable Multi-Select Chips */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#0F172A]">
                <Home className="w-4 h-4 text-[#0059FF]" />
                <span>نوع الوحدة</span>
              </div>
              {!isAllUnitTypesSelected && unitTypes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setUnitTypes([])}
                  className="min-h-[44px] px-2 text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 rounded-lg"
                >
                  مسح الأنواع
                </button>
              )}
            </div>

            {/* Horizontal scrollable chip row */}
            <div
              className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 -mx-1 px-1 scroll-smooth"
              style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
              role="group"
              aria-label="نوع الوحدة"
            >
              {unitTypeChips.map((chip) => {
                const isSelected = chip.id === 'ALL' ? isAllUnitTypesSelected : unitTypes.includes(chip.id);
                return (
                  <button
                    key={chip.id}
                    id={`c2-unit-type-chip-${chip.id.toLowerCase()}`}
                    type="button"
                    onClick={() => handleToggleUnitType(chip.id)}
                    aria-pressed={isSelected}
                    className={`min-h-[44px] px-4 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/40 active:scale-95 ${
                      isSelected
                        ? 'bg-[#0059FF] text-white shadow-xs border border-[#0059FF]'
                        : 'bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] hover:bg-slate-100'
                    }`}
                  >
                    <span>{chip.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Max price — Dynamic drag slider derived from public inventory ceiling */}
          <section>
            <div className="flex justify-between items-center text-[13px] font-bold mb-1.5">
              <div className="flex items-center gap-1.5 text-[#0F172A]">
                <span>الحد الأقصى للسعر في الليلة</span>
              </div>
              {maxPriceTouched && maxPrice > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setMaxPrice(0);
                    setMaxPriceTouched(false);
                  }}
                  className="min-h-[44px] px-2 text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 rounded-lg"
                >
                  إلغاء الحد (بدون حد)
                </button>
              ) : (
                <span className="text-xs font-bold text-[#64748B]">بدون حد</span>
              )}
            </div>

            <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#64748B]">السقف المحدد:</span>
                <span className="text-sm font-bold text-[#0F172A]">
                  {maxPriceTouched && maxPrice > 0
                    ? `${maxPrice.toLocaleString('ar-EG')} ج.م / ليلة`
                    : 'بدون حد أقصى'}
                </span>
              </div>

              <input
                id="c2-maxprice-slider"
                type="range"
                min={1000}
                max={priceCeiling}
                step={1000}
                value={sliderValue}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                aria-label="الحد الأقصى للسعر"
                className="w-full min-h-[44px] py-4 bg-transparent cursor-pointer accent-[#0059FF]"
              />

              <div className="flex items-center justify-between text-[11px] font-bold text-[#94A3B8]">
                <span>1,000 ج.م</span>
                <span>{priceCeiling.toLocaleString('ar-EG')} ج.م (بدون حد)</span>
              </div>
            </div>

            <p className="text-[11px] font-bold text-[#64748B] mt-1.5">
              {maxPriceTouched && maxPrice > 0
                ? `سيتم عرض الوحدات التي لا يتجاوز سعرها ${maxPrice.toLocaleString('ar-EG')} ج.م في الليلة.`
                : 'حرك المؤشر لتحديد سقف أقصى للسعر، أو اتركه في النهاية لعرض كل الأسعار.'}
            </p>
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

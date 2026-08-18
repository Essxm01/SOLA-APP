import React, { useState } from 'react';
import { Search, MapPin, Calendar, Users, SlidersHorizontal, X } from 'lucide-react';

export interface SearchFilterState {
  destination: string;
  checkIn: string;
  checkOut: string;
  totalGuests: number;
  unitType: string;
  maxPrice: number;
}

interface CoastalSearchBarProps {
  onSearch: (filters: SearchFilterState) => void;
  activeDestination: string;
  onSelectDestinationChip: (dest: string) => void;
}

export const CoastalSearchBar: React.FC<CoastalSearchBarProps> = ({
  onSearch,
  activeDestination,
  onSelectDestinationChip,
}) => {
  const [destination, setDestination] = useState<string>(activeDestination === 'الكل' ? '' : activeDestination);
  const [checkIn, setCheckIn] = useState<string>('2026-09-01');
  const [checkOut, setCheckOut] = useState<string>('2026-09-05');
  const [totalGuests, setTotalGuests] = useState<number>(4);
  const [unitType, setUnitType] = useState<string>('ALL');
  const [maxPrice, setMaxPrice] = useState<number>(25000);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);

  const popularDestinations = ['الكل', 'مراسي', 'رأس الحكمة', 'سيدي عبد الرحمن', 'هاسيندا', 'الساحل الشمالي'];

  const handleApply = () => {
    onSearch({
      destination,
      checkIn,
      checkOut,
      totalGuests,
      unitType,
      maxPrice,
    });
    setShowSearchModal(false);
  };

  const handleReset = () => {
    setDestination('');
    setCheckIn('2026-09-01');
    setCheckOut('2026-09-05');
    setTotalGuests(4);
    setUnitType('ALL');
    setMaxPrice(25000);
    onSearch({
      destination: '',
      checkIn: '2026-09-01',
      checkOut: '2026-09-05',
      totalGuests: 4,
      unitType: 'ALL',
      maxPrice: 25000,
    });
    setShowSearchModal(false);
  };

  return (
    <div className="w-full space-y-4 my-2">
      {/* Mobile Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">هتصيف فين؟ 🏖️</h1>
          <p className="text-xs text-slate-500 font-bold">احجز شاليهك المباشر في أرق شواطئ الساحل</p>
        </div>
      </div>

      {/* Compact Mobile Search Card */}
      <button
        onClick={() => setShowSearchModal(true)}
        className="w-full bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3 text-right hover:border-blue-300 active:scale-[0.99] transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-[#0059FF] rounded-xl flex items-center justify-center shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 block">
              {destination ? destination : 'بحث عن وجهة، تواريخ، أو عدد أفراد'}
            </span>
            <span className="text-[10px] text-slate-400 font-bold">
              {checkIn} ← {checkOut} • {totalGuests} أفراد
            </span>
          </div>
        </div>
        <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center shrink-0">
          <SlidersHorizontal className="w-4 h-4" />
        </div>
      </button>

      {/* Coastal Destination Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
        {popularDestinations.map((dest) => {
          const isActive = activeDestination === dest;
          return (
            <button
              key={dest}
              onClick={() => onSelectDestinationChip(dest)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
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

      {/* Mobile Search & Filter Bottom Sheet Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 border border-slate-100 shadow-2xl animate-fade-in max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">تخصيص بحث الإقامة الساحلية</h3>
              <button
                onClick={() => setShowSearchModal(false)}
                className="w-7 h-7 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Destination Input */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#0059FF]" />
                <span>الوجهة أو القرية</span>
              </label>
              <input
                type="text"
                placeholder="مثال: مراسي، رأس الحكمة، هاسيندا..."
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0059FF]"
              />
            </div>

            {/* Dates Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#0059FF]" />
                  <span>تاريخ الوصول</span>
                </label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#0059FF]" />
                  <span>تاريخ المغادرة</span>
                </label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Guests Count */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#0059FF]" />
                <span>عدد الأفراد</span>
              </label>
              <select
                value={totalGuests}
                onChange={(e) => setTotalGuests(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((g) => (
                  <option key={g} value={g}>
                    {g} {g === 1 ? 'فرد' : 'أفراد'}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit Type */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">نوع الوحدة الساحلية</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'ALL', label: 'الكل' },
                  { id: 'CHALET', label: 'شاليه' },
                  { id: 'VILLA', label: 'فيلا' },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setUnitType(type.id)}
                    className={`py-2 rounded-xl text-xs font-extrabold transition-all border ${
                      unitType === type.id
                        ? 'bg-[#0059FF] text-white border-[#0059FF]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Price Slider */}
            <div>
              <div className="flex justify-between text-xs font-black mb-1">
                <span className="text-slate-700">الحد الأقصى للسعر في الليلة</span>
                <span className="text-[#0059FF]">{maxPrice.toLocaleString()} ج.م</span>
              </div>
              <input
                type="range"
                min={2000}
                max={40000}
                step={1000}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-[#0059FF]"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleReset}
                className="px-4 py-3 text-slate-500 text-xs font-extrabold"
              >
                إعادة ضبط
              </button>
              <button
                onClick={handleApply}
                className="flex-1 py-3.5 bg-[#0059FF] text-white text-xs font-black rounded-xl shadow-md"
              >
                بحث عن إقامات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

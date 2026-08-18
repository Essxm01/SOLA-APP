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
  initialDestination?: string;
}

export const CoastalSearchBar: React.FC<CoastalSearchBarProps> = ({
  onSearch,
  initialDestination = 'الكل',
}) => {
  const [destination, setDestination] = useState<string>(initialDestination === 'الكل' ? '' : initialDestination);
  const [checkIn, setCheckIn] = useState<string>('2026-09-01');
  const [checkOut, setCheckOut] = useState<string>('2026-09-05');
  const [totalGuests, setTotalGuests] = useState<number>(4);
  const [unitType, setUnitType] = useState<string>('ALL');
  const [maxPrice, setMaxPrice] = useState<number>(20000);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState<boolean>(false);

  const handleApply = () => {
    onSearch({
      destination,
      checkIn,
      checkOut,
      totalGuests,
      unitType,
      maxPrice,
    });
  };

  const handleReset = () => {
    setDestination('');
    setCheckIn('2026-09-01');
    setCheckOut('2026-09-05');
    setTotalGuests(4);
    setUnitType('ALL');
    setMaxPrice(20000);
    onSearch({
      destination: '',
      checkIn: '2026-09-01',
      checkOut: '2026-09-05',
      totalGuests: 4,
      unitType: 'ALL',
      maxPrice: 20000,
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto my-6 px-4">
      {/* Primary Search Container */}
      <div className="bg-white rounded-3xl p-3 sm:p-4 border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-center gap-3">
        {/* Destination Field */}
        <div className="flex-1 w-full flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-200/80">
          <MapPin className="w-5 h-5 text-[#0059FF] shrink-0" />
          <div className="w-full">
            <label className="block text-[10px] font-black text-slate-400">الوجهة أو المنطقة الساحلية</label>
            <input
              type="text"
              placeholder="مثال: مراسي، رأس الحكمة، هاسيندا..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Check-In / Check-Out Dates */}
        <div className="w-full md:w-auto flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-200/80">
          <Calendar className="w-5 h-5 text-[#0059FF] shrink-0" />
          <div className="flex items-center gap-2">
            <div>
              <label className="block text-[10px] font-black text-slate-400">الوصول</label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
              />
            </div>
            <span className="text-slate-300 font-bold">←</span>
            <div>
              <label className="block text-[10px] font-black text-slate-400">المغادرة</label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Guests Count */}
        <div className="w-full md:w-36 flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-200/80">
          <Users className="w-5 h-5 text-[#0059FF] shrink-0" />
          <div className="w-full">
            <label className="block text-[10px] font-black text-slate-400">عدد الأفراد</label>
            <select
              value={totalGuests}
              onChange={(e) => setTotalGuests(Number(e.target.value))}
              className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((g) => (
                <option key={g} value={g}>
                  {g} {g === 1 ? 'فرد' : g <= 10 ? 'أفراد' : 'فرد'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full md:w-auto flex items-center gap-2">
          <button
            onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-colors shrink-0"
            title="تصفية إضافية"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
          <button
            onClick={handleApply}
            className="flex-1 md:flex-initial px-6 py-3 bg-[#0059FF] hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Search className="w-4 h-4" />
            <span>ابحث عن إقامتك</span>
          </button>
        </div>
      </div>

      {/* Advanced Filter Popup Panel */}
      {showAdvancedFilter && (
        <div className="mt-3 p-4 bg-white rounded-3xl border border-slate-200 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h4 className="text-xs font-black text-slate-900">خيارات تصفية البحث</h4>
            <button
              onClick={() => setShowAdvancedFilter(false)}
              className="text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Unit Type */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">نوع الوحدة الساحلية</label>
              <select
                value={unitType}
                onChange={(e) => setUnitType(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="ALL">جميع الأنواع (شاليه، فيلا، شقة)</option>
                <option value="CHALET">شاليه ساحلي</option>
                <option value="VILLA">فيلا خاصة</option>
                <option value="APARTMENT">شقة مصيفية</option>
              </select>
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                الحد الأقصى للسعر في الليلة ({maxPrice.toLocaleString()} ج.م)
              </label>
              <input
                type="range"
                min={1000}
                max={30000}
                step={500}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-[#0059FF] cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-slate-500 hover:text-slate-800 text-xs font-bold"
            >
              إعادة ضبط
            </button>
            <button
              onClick={() => {
                handleApply();
                setShowAdvancedFilter(false);
              }}
              className="px-5 py-2 bg-[#0059FF] text-white font-extrabold text-xs rounded-xl shadow-sm"
            >
              تطبيق الفلتر
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { useApp } from '../../context/AppContext';
import { PlusCircle, Calendar, Sparkles } from 'lucide-react';

export const QuickActions: React.FC = () => {
  const { showToast, setActiveTab, properties, openCalendarForProperty } = useApp();

  const handleAddProperty = () => {
    setActiveTab('properties');
  };

  const handleCalendar = () => {
    if (properties.length > 0) {
      openCalendarForProperty(properties[0].id);
    } else {
      setActiveTab('calendar');
    }
  };

  const handlePromo = () => {
    showToast('تم تفعيل عروض الصيف والرحلات على جميع وحداتك المقبولة! ☀️', 'success');
  };

  return (
    <div className="w-full bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs dir-rtl">
      <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
        إجراءات سريعة للمالك
      </h3>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleAddProperty}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-50/70 text-[#0059FF] hover:bg-blue-100 transition-colors border border-blue-100 group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#0059FF] text-white flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-110 transition-transform">
            <PlusCircle className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">إضافة وحدة</span>
        </button>

        <button
          onClick={handleCalendar}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-50/70 text-amber-800 hover:bg-amber-100 transition-colors border border-amber-100 group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#FFD700] text-slate-900 flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-110 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">التقويم والتوفر</span>
        </button>

        <button
          onClick={handlePromo}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 transition-colors border border-emerald-100 group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-110 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">خصم الصيف</span>
        </button>
      </div>
    </div>
  );
};

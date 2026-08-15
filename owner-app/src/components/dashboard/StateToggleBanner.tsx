import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, ToggleLeft, ToggleRight } from 'lucide-react';

export const StateToggleBanner: React.FC = () => {
  const { isEmptyDashboard, setIsEmptyDashboard } = useApp();

  return (
    <div className="w-full bg-gradient-to-r from-blue-900 to-[#0059FF] text-white rounded-2xl p-4 shadow-md dir-rtl flex items-center justify-between gap-3 my-2">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-[#FFD700] shrink-0 border border-white/20">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="text-right">
          <h4 className="text-xs font-bold text-blue-100 flex items-center gap-1">
            <span>اختبار حالات الواجهة</span>
          </h4>
          <p className="text-xs text-white/90 font-medium">
            {isEmptyDashboard
              ? 'أنت تشاهد الآن: حالة المستخدم الجديد (Empty State)'
              : 'أنت تشاهد الآن: لوحة مالك تحتوي على وحدات وحجوزات'}
          </p>
        </div>
      </div>

      <button
        onClick={() => setIsEmptyDashboard(!isEmptyDashboard)}
        className="px-3 py-2 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-yellow-300 transition-colors shrink-0 shadow-sm flex items-center gap-1.5"
      >
        {isEmptyDashboard ? (
          <>
            <ToggleLeft className="w-4 h-4 text-slate-500" />
            <span>عرض البيانات</span>
          </>
        ) : (
          <>
            <ToggleRight className="w-4 h-4 text-[#0059FF]" />
            <span>شاشة فارغة</span>
          </>
        )}
      </button>
    </div>
  );
};

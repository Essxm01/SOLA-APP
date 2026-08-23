import React from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const QuickActions: React.FC = () => {
  const { openAddPropertyWizard, properties, openCalendarForProperty, setActiveTab } = useApp();

  return (
    <section className="grid grid-cols-2 gap-3 pt-1" aria-label="اختصارات العمليات">
      {/* Primary Action: Add Property */}
      <button
        onClick={() => openAddPropertyWizard()}
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#0059FF] hover:bg-blue-700 text-white px-4 py-3 text-xs font-black shadow-xs transition-all cursor-pointer active:scale-98"
      >
        <Plus className="h-4 w-4" />
        <span>إضافة وحدة جديدة</span>
      </button>

      {/* Secondary Action: Manage Calendar */}
      <button
        onClick={() =>
          properties[0]
            ? openCalendarForProperty(properties[0].id)
            : setActiveTab('calendar')
        }
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-white hover:border-blue-300 text-slate-800 px-4 py-3 text-xs font-black shadow-xs transition-all cursor-pointer active:scale-98"
      >
        <CalendarDays className="h-4 w-4 text-[#0059FF]" />
        <span>إدارة التقويم والأسعار</span>
      </button>
    </section>
  );
};


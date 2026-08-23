import React from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const QuickActions: React.FC = () => {
  const { openAddPropertyWizard, properties, openCalendarForProperty, setActiveTab } = useApp();
  return <section className="border-t border-[var(--konfrm-border-subtle)] pt-5" aria-labelledby="owner-quick-actions">
    <h2 id="owner-quick-actions" className="sr-only">إجراءات سريعة</h2>
    <button type="button" onClick={() => openAddPropertyWizard()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--konfrm-radius-control)] bg-[var(--konfrm-color-primary)] px-4 text-[15px] font-bold text-[var(--konfrm-text-inverse)]"><Plus className="h-5 w-5" />إضافة وحدة</button>
    <button type="button" onClick={() => properties[0] ? openCalendarForProperty(properties[0].id) : setActiveTab('calendar')} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--konfrm-radius-control)] border border-[var(--konfrm-border-strong)] bg-[var(--konfrm-surface-primary)] px-4 text-[15px] font-bold text-[var(--konfrm-text-primary)]"><CalendarDays className="h-5 w-5 text-[var(--konfrm-color-primary)]" />إدارة التقويم والإتاحة</button>
  </section>;
};

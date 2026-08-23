import React from 'react';
import { CalendarDays, MessageSquare, Plus, WalletCards } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const QuickActions: React.FC = () => {
  const { openAddPropertyWizard, properties, openCalendarForProperty, setActiveTab } = useApp();
  const actions = [{ label: 'إضافة وحدة', icon: Plus, onClick: () => openAddPropertyWizard() }, { label: 'التقويم', icon: CalendarDays, onClick: () => properties[0] ? openCalendarForProperty(properties[0].id) : setActiveTab('calendar') }, { label: 'المحفظة', icon: WalletCards, onClick: () => setActiveTab('wallet') }, { label: 'الرسائل', icon: MessageSquare, onClick: () => setActiveTab('messages') }];
  return <section className="grid grid-cols-2 gap-3" aria-label="اختصارات المالك">{actions.map(({ label, icon: Icon, onClick }) => <button key={label} onClick={onClick} className="flex min-h-12 items-center gap-3 rounded-[var(--konfrm-radius-control)] border border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] px-3 text-right text-sm font-bold text-[var(--konfrm-text-primary)] hover:border-[var(--konfrm-border-focus)]"><Icon className="h-5 w-5 text-[var(--konfrm-color-primary)]" />{label}</button>)}</section>;
};

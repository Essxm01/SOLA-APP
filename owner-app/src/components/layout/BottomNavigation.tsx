import React from 'react';
import { Building2, CalendarDays, LayoutDashboard, MessageSquare, Wallet } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BottomNavigation: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();
  const tabs = [{ id: 'home', label: 'الرئيسية', icon: LayoutDashboard }, { id: 'bookings', label: 'الحجوزات', icon: CalendarDays }, { id: 'wallet', label: 'المحفظة', icon: Wallet }, { id: 'properties', label: 'الوحدات', icon: Building2 }, { id: 'messages', label: 'الرسائل', icon: MessageSquare }] as const;
  return <nav className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-[430px] border-t border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] px-1 pt-1.5 [box-shadow:var(--konfrm-shadow-overlay)]" dir="rtl" aria-label="التنقل الرئيسي"><div className="flex items-center justify-between pb-[max(8px,env(safe-area-inset-bottom))]">{tabs.map((tab) => { const Icon = tab.icon; const active = activeTab === tab.id; return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id as any)} className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--konfrm-radius-control)] text-[12px] font-bold ${active ? 'text-[var(--konfrm-color-primary)]' : 'text-[var(--konfrm-text-muted)]'}`}><Icon className={`h-5 w-5 ${active ? 'stroke-[2.25]' : 'stroke-[1.8]'}`} /><span>{tab.label}</span></button>; })}</div></nav>;
};

import React from 'react';
import { useApp } from '../../context/AppContext';
import { LayoutDashboard, CalendarDays, Building2, Wallet, MessageSquare } from 'lucide-react';

export const BottomNavigation: React.FC = () => {
  const { activeTab, setActiveTab, metrics, isEmptyDashboard } = useApp();

  const tabs = [
    {
      id: 'home',
      label: 'الرئيسية',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'bookings',
      label: 'الحجوزات',
      icon: CalendarDays,
      badge: !isEmptyDashboard && metrics.newBookingRequestsCount > 0 ? metrics.newBookingRequestsCount : null,
    },
    {
      id: 'wallet',
      label: 'المحفظة',
      icon: Wallet,
      badge: null,
    },
    {
      id: 'properties',
      label: 'الوحدات',
      icon: Building2,
      badge: !isEmptyDashboard && metrics.underReviewPropertiesCount > 0 ? metrics.underReviewPropertiesCount : null,
    },
    {
      id: 'messages',
      label: 'الرسائل',
      icon: MessageSquare,
      badge: !isEmptyDashboard && metrics.unreadMessagesCount > 0 ? metrics.unreadMessagesCount : null,
    },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/80 px-1 py-1.5 dir-rtl max-w-md mx-auto shadow-[0_-1px_3px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex-1 min-h-[48px] flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-colors cursor-pointer ${
                isActive
                  ? 'text-[#0059FF] bg-blue-50/70 font-bold'
                  : 'text-slate-500 font-medium hover:text-slate-800'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.25px]' : 'stroke-[1.75px]'}`} />
                {tab.badge !== null && (
                  <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 bg-[#0059FF] text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white ring-1 ring-blue-100">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

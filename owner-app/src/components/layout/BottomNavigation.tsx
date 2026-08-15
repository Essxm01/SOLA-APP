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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg px-2 py-2 dir-rtl max-w-md mx-auto">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-[#0059FF] font-bold bg-blue-50/80 scale-105'
                  : 'text-slate-500 font-medium hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {tab.badge !== null && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 bg-[#0059FF] text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

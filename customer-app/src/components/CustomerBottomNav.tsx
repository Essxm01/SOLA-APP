import React from 'react';
import { Compass, Heart, CalendarCheck, User } from 'lucide-react';

export type CustomerTabType = 'EXPLORE' | 'FAVORITES' | 'BOOKINGS' | 'ACCOUNT';

interface CustomerBottomNavProps {
  activeTab: CustomerTabType;
  onSelectTab: (tab: CustomerTabType) => void;
  favoritesCount?: number;
  hasActiveBooking?: boolean;
}

const TABS: Array<{
  id: CustomerTabType;
  label: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  badge?: 'FAVORITES' | 'ACTIVE_BOOKING';
}> = [
  { id: 'EXPLORE', label: 'استكشف', Icon: Compass },
  { id: 'FAVORITES', label: 'المفضلة', Icon: Heart, badge: 'FAVORITES' },
  { id: 'BOOKINGS', label: 'حجوزاتي', Icon: CalendarCheck, badge: 'ACTIVE_BOOKING' },
  { id: 'ACCOUNT', label: 'الحساب', Icon: User },
];

// Persistent Customer bottom navigation (Phase 5 / C1 hardening):
// - fixed to the viewport through long scrolls, safe-area aware;
// - white/light surface, blue active state (NO active scale animation);
// - icon + label with full accessible names and aria-current;
// - every tab is a >=48px touch target.
export const CustomerBottomNav: React.FC<CustomerBottomNavProps> = ({
  activeTab,
  onSelectTab,
  favoritesCount = 0,
  hasActiveBooking = false,
}) => {
  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-2px_12px_rgba(15,23,42,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-md mx-auto flex items-stretch justify-around px-2 pt-1.5 pb-1.5">
        {TABS.map(({ id, label, Icon, badge }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onSelectTab(id)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 min-h-[52px] min-w-[48px] flex flex-col items-center justify-center gap-1 rounded-2xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/40 ${
                isActive ? 'text-[#0059FF]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="relative leading-none" aria-hidden="true">
                <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.4 : 2} />
                {badge === 'FAVORITES' && favoritesCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-[#0059FF] text-white text-[9px] font-black min-w-4 h-4 px-0.5 rounded-full flex items-center justify-center border border-white">
                    {favoritesCount}
                  </span>
                )}
                {badge === 'ACTIVE_BOOKING' && hasActiveBooking && (
                  <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                )}
              </span>
              <span className={`text-[10px] leading-none ${isActive ? 'font-black' : 'font-bold'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

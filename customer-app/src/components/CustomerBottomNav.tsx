import React from 'react';
import { Compass, Heart, CalendarCheck, User } from 'lucide-react';

export type CustomerTabType = 'EXPLORE' | 'FAVORITES' | 'BOOKINGS' | 'ACCOUNT';

interface CustomerBottomNavProps {
  activeTab: CustomerTabType;
  onSelectTab: (tab: CustomerTabType) => void;
  favoritesCount?: number;
  hasActiveBooking?: boolean;
}

export const CustomerBottomNav: React.FC<CustomerBottomNavProps> = ({
  activeTab,
  onSelectTab,
  favoritesCount = 0,
  hasActiveBooking = false,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg py-2 px-3">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* Tab 1: Explore */}
        <button
          onClick={() => onSelectTab('EXPLORE')}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === 'EXPLORE' ? 'text-[#0059FF] font-black scale-105' : 'text-slate-400 font-bold hover:text-slate-600'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px]">استكشف</span>
        </button>

        {/* Tab 2: Favorites */}
        <button
          onClick={() => onSelectTab('FAVORITES')}
          className={`flex flex-col items-center gap-1 relative transition-all ${
            activeTab === 'FAVORITES' ? 'text-[#0059FF] font-black scale-105' : 'text-slate-400 font-bold hover:text-slate-600'
          }`}
        >
          <div className="relative">
            <Heart className="w-5 h-5" />
            {favoritesCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#0059FF] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {favoritesCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">المفضلة</span>
        </button>

        {/* Tab 3: Bookings */}
        <button
          onClick={() => onSelectTab('BOOKINGS')}
          className={`flex flex-col items-center gap-1 relative transition-all ${
            activeTab === 'BOOKINGS' ? 'text-[#0059FF] font-black scale-105' : 'text-slate-400 font-bold hover:text-slate-600'
          }`}
        >
          <div className="relative">
            <CalendarCheck className="w-5 h-5" />
            {hasActiveBooking && (
              <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
            )}
          </div>
          <span className="text-[10px]">حجوزاتي</span>
        </button>

        {/* Tab 4: Account */}
        <button
          onClick={() => onSelectTab('ACCOUNT')}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === 'ACCOUNT' ? 'text-[#0059FF] font-black scale-105' : 'text-slate-400 font-bold hover:text-slate-600'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">الحساب</span>
        </button>
      </div>
    </nav>
  );
};

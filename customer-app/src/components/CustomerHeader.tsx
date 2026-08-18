import React from 'react';
import { Compass, User, LogOut, ShieldCheck, PhoneCall } from 'lucide-react';

interface CustomerHeaderProps {
  customerPhone?: string | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  activeDestination?: string;
  onSelectDestination: (dest: string) => void;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  customerPhone,
  onOpenAuthModal,
  onLogout,
  activeDestination = 'الكل',
  onSelectDestination,
}) => {
  const destinations = ['الكل', 'مراسي', 'رأس الحكمة', 'هاسيندا', 'سيدي عبد الرحمن', 'الساحل الشمالي'];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Top Navbar Row */}
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0059FF] rounded-2xl flex items-center justify-center shadow-md shadow-blue-500/20">
              <Compass className="w-6 h-6 text-white animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white">صولا</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-[#FFD700]/20 text-[#FFD700] rounded-full border border-[#FFD700]/40">
                  إقامات موثقة ⭐️
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-bold hidden sm:block">
                حجز شاليهات وفيلات الساحل الشمالي المباشر من المالك
              </p>
            </div>
          </div>

          {/* Right Action Menu */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-emerald-400 font-extrabold bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-800/60">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ضمان صولا للإقامات الموثقة</span>
            </div>

            {customerPhone ? (
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                <div className="w-7 h-7 bg-[#0059FF]/20 text-[#0059FF] rounded-lg flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-200 dir-ltr">{customerPhone}</span>
                <button
                  onClick={onLogout}
                  title="تسجيل الخروج"
                  className="mr-1 text-slate-400 hover:text-rose-400 transition-colors p-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="px-4 py-2 bg-[#0059FF] hover:bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <PhoneCall className="w-4 h-4" />
                <span>تسجيل الدخول</span>
              </button>
            )}
          </div>
        </div>

        {/* Coastal Destinations Chips Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1 no-scrollbar scroll-smooth">
          <span className="text-xs font-black text-slate-400 whitespace-nowrap ml-2">الوجهة:</span>
          {destinations.map((dest) => {
            const isActive = activeDestination === dest;
            return (
              <button
                key={dest}
                onClick={() => onSelectDestination(dest)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0059FF] text-white shadow-sm shadow-blue-500/30'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                }`}
              >
                {dest}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

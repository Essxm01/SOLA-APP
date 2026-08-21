import React from 'react';
import { Compass, User, LogOut, PhoneCall } from 'lucide-react';

interface CustomerHeaderProps {
  customerPhone?: string | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  customerPhone,
  onOpenAuthModal,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-[#0059FF] text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg text-slate-900 tracking-tight">كونفرم</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-[#FFD700]/20 text-slate-800 rounded-full border border-[#FFD700]/50">
                KONFRM ⭐️
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold -mt-0.5">
              إقامات الساحل الشمالي الموثقة
            </p>
          </div>
        </div>

        {/* User Account / Auth Entry */}
        <div>
          {customerPhone ? (
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <div className="w-6 h-6 bg-[#0059FF]/10 text-[#0059FF] rounded-lg flex items-center justify-center font-bold">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 dir-ltr">{customerPhone.slice(-8)}</span>
              <button
                onClick={onLogout}
                title="تسجيل الخروج"
                className="text-slate-400 hover:text-rose-500 p-0.5 mr-0.5"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-3.5 py-1.5 bg-[#0059FF] hover:bg-blue-600 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>دخول</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

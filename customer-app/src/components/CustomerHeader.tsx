import React from 'react';
import { User, PhoneCall } from 'lucide-react';

interface CustomerHeaderProps {
  customerPhone?: string | null;
  activeTab?: string;
  onOpenAuthModal: () => void;
  onGoToAccount?: () => void;
  onLogout?: () => void;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  customerPhone,
  activeTab,
  onOpenAuthModal,
  onGoToAccount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        {/* Standalone Brand Logo */}
        <div className="flex items-center">
          <img src="/favicon.svg" alt="KONFRM" className="w-8 h-8 object-contain" />
        </div>

        {/* User Account / Auth Entry */}
        <div>
          {customerPhone ? (
            activeTab === 'ACCOUNT' ? null : (
              <button
                onClick={onGoToAccount}
                title="حسابي"
                aria-label="حسابي"
                className="w-11 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center justify-center transition-colors border border-slate-200"
              >
                <User className="w-5 h-5 text-slate-700" />
              </button>
            )
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="min-h-[44px] px-4 py-2 bg-[#0059FF] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
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

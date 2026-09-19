import React, { useState, useEffect, useMemo } from 'react';
import { UserRound, UserRoundPlus, PhoneCall } from 'lucide-react';

interface CustomerHeaderProps {
  customerPhone?: string | null;
  isAuthenticated?: boolean;
  customerFullName?: string | null;
  customerAvatarUrl?: string | null;
  activeTab?: string;
  showAccountAction?: boolean;
  onOpenAuthModal: () => void;
  onGoToAccount?: () => void;
  onLogout?: () => void;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  customerPhone: _customerPhone,
  isAuthenticated,
  customerFullName,
  customerAvatarUrl,
  activeTab,
  showAccountAction,
  onOpenAuthModal,
  onGoToAccount,
}) => {
  const isExplore = activeTab === 'EXPLORE';
  const isAccount = activeTab === 'ACCOUNT';
  const shouldShowAction = showAccountAction !== undefined ? showAccountAction : !isAccount;

  // Local state to gracefully handle broken avatar images
  const [avatarError, setAvatarError] = useState<boolean>(false);

  // Reset image error whenever the avatar URL prop changes
  useEffect(() => {
    setAvatarError(false);
  }, [customerAvatarUrl]);

  // Extract initials ONLY when a non-empty canonical fullName exists
  const initials = useMemo(() => {
    if (!customerFullName) return null;
    const trimmed = customerFullName.trim();
    if (!trimmed) return null;
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0].slice(0, 2);
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [customerFullName]);

  // Render authenticated identity affordance:
  // 1. canonical avatarUrl (if present and image loads)
  // 2. otherwise initials (if non-empty canonical fullName exists)
  // 3. otherwise UserRound
  const renderAuthenticatedAffordance = () => {
    if (customerAvatarUrl && !avatarError) {
      return (
        <img
          src={customerAvatarUrl}
          alt={customerFullName || 'حسابي'}
          onError={() => setAvatarError(true)}
          className="w-full h-full object-cover rounded-xl"
        />
      );
    }
    if (initials) {
      return (
        <span className="text-sm font-bold text-slate-700 select-none">
          {initials}
        </span>
      );
    }
    return <UserRound className="w-5 h-5 text-slate-700" />;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
      <div className="max-w-[430px] mx-auto px-4 py-3 flex items-center justify-between">
        {/* Standalone Brand Logo */}
        <div className="flex items-center">
          <img src="/favicon.svg" alt="KONFRM" className="w-8 h-8 object-contain" />
        </div>

        {/* User Account / Identity Affordance */}
        {shouldShowAction ? (
          <div>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={onGoToAccount}
                title="حسابي"
                aria-label="حسابي"
                className="w-11 h-11 flex items-center justify-center cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors border border-slate-200 overflow-hidden">
                  {renderAuthenticatedAffordance()}
                </div>
              </button>
            ) : isExplore ? (
              /* Guest on Explore: UserRoundPlus affordance to open Auth modal */
              <button
                type="button"
                onClick={onOpenAuthModal}
                title="تسجيل الدخول أو إنشاء حساب"
                aria-label="تسجيل الدخول أو إنشاء حساب"
                className="w-11 h-11 flex items-center justify-center cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors border border-slate-200">
                  <UserRoundPlus className="w-5 h-5 text-slate-700" />
                </div>
              </button>
            ) : (
              /* Guest on other tabs (non-Explore): standard login entry */
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="min-h-[44px] px-4 py-2 bg-[#0059FF] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>دخول</span>
              </button>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
};

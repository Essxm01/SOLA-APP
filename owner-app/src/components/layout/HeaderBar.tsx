import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { VerificationBadge } from '../ui/Badge';
import { Bell, User } from 'lucide-react';

export const HeaderBar: React.FC = () => {
  const { owner } = useAuth();
  const { metrics, setIsNotificationsOpen, isEmptyDashboard, setActiveTab } = useApp();

  const ownerDisplayName = (owner as any)?.fullName || owner?.name || 'لم يتم إضافة الاسم بعد';
  const verificationStatus = owner?.verificationStatus || 'UNVERIFIED';

  return (
    <header className="w-full bg-white border-b border-slate-200/80 px-4 py-3 sticky top-0 z-30 shadow-xs dir-rtl">
      <div className="flex items-center justify-between gap-3">
        {/* Owner Avatar and Info (Clickable ➔ Navigates to Profile) */}
        <div
          onClick={() => setActiveTab('profile')}
          className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-all"
          title="فتح تفاصيل حساب المالك"
        >
          <div className="relative">
            {owner?.avatar ? (
              <img
                src={owner.avatar}
                alt={ownerDisplayName}
                className="w-11 h-11 rounded-2xl object-cover ring-2 ring-[#0059FF]/20 shadow-xs group-hover:ring-[#0059FF]"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0059FF] font-black flex items-center justify-center text-base ring-2 ring-[#0059FF]/20 shadow-xs group-hover:ring-[#0059FF]">
                {ownerDisplayName && ownerDisplayName !== 'لم يتم إضافة الاسم بعد' ? (
                  ownerDisplayName.trim().charAt(0)
                ) : (
                  <User className="w-5 h-5 text-[#0059FF]" />
                )}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
          </div>

          <div className="flex flex-col text-right">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-extrabold text-slate-900 leading-tight group-hover:text-[#0059FF] transition-colors">
                {ownerDisplayName}
              </h1>
            </div>
            <div className="mt-0.5">
              <VerificationBadge
                status={verificationStatus}
                label={
                  verificationStatus === 'VERIFIED'
                    ? 'حساب موثق'
                    : verificationStatus === 'PENDING_VERIFICATION'
                    ? 'بانتظار مراجعة الإدارة'
                    : 'غير موثق (اضغط للتوثيق)'
                }
              />
            </div>
          </div>
        </div>

        {/* Right Actions: Standalone Brand Mark & Notifications Button */}
        <div className="flex items-center gap-2.5">
          <img src="/konfrm-mark.svg" alt="Brand Mark" className="w-7 h-7 object-contain" />
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-blue-50 hover:text-[#0059FF] transition-all border border-slate-200/80 active:scale-95"
            aria-label="الإشعارات"
          >
            <Bell className="w-5 h-5" />
            {!isEmptyDashboard && metrics.unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md animate-bounce font-mono">
                {metrics.unreadNotificationsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};


import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { VerificationBadge } from '../ui/Badge';
import { Bell, User } from 'lucide-react';

export const HeaderBar: React.FC = () => {
  const { owner } = useAuth();
  const { metrics, notifications, setIsNotificationsOpen, setActiveTab } = useApp();

  const rawName = (owner as any)?.fullName || owner?.name || 'المالك';
  // Strip any '(المالك)' suffix from display name
  const ownerDisplayName = rawName.replace(/\s*\(المالك\)\s*/g, '').trim() || 'المالك';
  const verificationStatus = owner?.verificationStatus || 'UNVERIFIED';

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-100 bg-white px-4 py-3.5 dir-rtl">
      <div className="flex items-center justify-between gap-3">
        {/* Owner Avatar and Info (Clickable ➔ Navigates to Profile) */}
        <div
          onClick={() => setActiveTab('profile')}
          className="group flex items-center gap-3 text-right cursor-pointer"
          title="فتح الملف الشخصي"
        >
          <div className="relative shrink-0">
            {owner?.avatar ? (
              <img
                src={owner.avatar}
                alt={ownerDisplayName}
                className="h-11 w-11 rounded-full object-cover border border-slate-100"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-base font-black text-[#0059FF] border border-blue-100/60">
                {ownerDisplayName && ownerDisplayName !== 'المالك' ? (
                  ownerDisplayName.charAt(0).toUpperCase()
                ) : (
                  <User className="h-5 w-5" />
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col text-right min-w-0">
            <h1 className="text-[15px] font-black leading-tight text-slate-900 group-hover:text-[#0059FF] transition-colors truncate">
              {ownerDisplayName}
            </h1>
            <div className="mt-0.5">
              <VerificationBadge
                status={verificationStatus}
                label={
                  verificationStatus === 'VERIFIED'
                    ? 'حساب موثق'
                    : verificationStatus === 'PENDING_VERIFICATION'
                    ? 'التوثيق قيد المراجعة'
                    : verificationStatus === 'REJECTED'
                    ? 'يحتاج مراجعة'
                    : 'حساب غير موثق'
                }
              />
            </div>
          </div>
        </div>

        {/* Notification Action Only (No decorative logo in operational header) */}
        <div className="flex items-center">
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-[#0059FF] transition-colors cursor-pointer border border-slate-200/70"
            aria-label="الإشعارات"
          >
            <Bell className="h-4.5 w-4.5" />
            {notifications.length > 0 && metrics.unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white ring-2 ring-white">
                {metrics.unreadNotificationsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

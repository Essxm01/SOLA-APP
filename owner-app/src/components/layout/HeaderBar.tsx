import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { VerificationBadge } from '../ui/Badge';
import { Bell, User } from 'lucide-react';

export const HeaderBar: React.FC = () => {
  const { owner } = useAuth();
  const { metrics, notifications, setIsNotificationsOpen, setActiveTab } = useApp();

  const ownerDisplayName = (owner as any)?.fullName || owner?.name || 'لم يتم إضافة الاسم بعد';
  const verificationStatus = owner?.verificationStatus || 'UNVERIFIED';

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[var(--konfrm-border-subtle)] bg-[var(--konfrm-surface-primary)] px-[var(--konfrm-space-page-x)] py-3 dir-rtl">
      <div className="flex items-center justify-between gap-3">
        {/* Owner Avatar and Info (Clickable ➔ Navigates to Profile) */}
        <div
          onClick={() => setActiveTab('profile')}
          className="group flex min-h-11 items-center gap-3 text-right"
          title="فتح تفاصيل حساب المالك"
        >
          <div className="relative">
            {owner?.avatar ? (
              <img
                src={owner.avatar}
                alt={ownerDisplayName}
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--konfrm-color-primary-soft)] text-base font-black text-[var(--konfrm-color-primary)]">
                {ownerDisplayName && ownerDisplayName !== 'لم يتم إضافة الاسم بعد' ? (
                  ownerDisplayName.trim().charAt(0)
                ) : (
                  <User className="h-5 w-5" />
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col text-right">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-extrabold leading-tight text-[var(--konfrm-text-primary)] group-hover:text-[var(--konfrm-color-primary)]">
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
                    ? 'التوثيق قيد المراجعة'
                    : verificationStatus === 'REJECTED'
                    ? 'التوثيق يحتاج مراجعة'
                    : 'حساب غير موثق'
                }
              />
            </div>
          </div>
        </div>

        {/* Brand mark and notifications are both real product actions. */}
        <div className="flex items-center gap-2.5">
          <img src="/konfrm-mark.svg" alt="KONFRM" className="h-7 w-7 object-contain" />
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative flex min-h-11 min-w-11 items-center justify-center rounded-[var(--konfrm-radius-control)] border border-[var(--konfrm-border-default)] text-[var(--konfrm-text-secondary)] hover:bg-[var(--konfrm-color-primary-soft)] hover:text-[var(--konfrm-color-primary)]"
            aria-label="الإشعارات"
          >
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && metrics.unreadNotificationsCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--konfrm-semantic-danger)] px-1 text-[10px] font-black text-[var(--konfrm-text-inverse)]">
                {metrics.unreadNotificationsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

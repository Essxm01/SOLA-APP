import React from 'react';
import { Bell, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

const verificationCopy: Record<string, string> = { VERIFIED: 'حساب موثق', PENDING_VERIFICATION: 'التوثيق قيد المراجعة', REJECTED: 'تحتاج مراجعة التوثيق', UNVERIFIED: 'حساب غير موثق' };

export const HeaderBar: React.FC = () => {
  const { owner } = useAuth();
  const { setIsNotificationsOpen, setActiveTab } = useApp();
  const rawName = (owner as any)?.fullName || owner?.name || 'المالك';
  const ownerDisplayName = rawName.replace(/\s*\(المالك\)\s*/g, '').trim() || 'المالك';
  const verificationStatus = owner?.verificationStatus || 'UNVERIFIED';
  return <header className="sticky top-0 z-30 border-b border-[var(--konfrm-border-subtle)] bg-[var(--konfrm-surface-primary)]" dir="rtl">
    <div className="mx-auto flex h-[68px] max-w-[430px] items-center justify-between px-[var(--konfrm-space-page-horizontal)]">
      <button type="button" onClick={() => setActiveTab('profile')} className="flex min-w-0 items-center gap-3 text-right" aria-label="فتح الملف الشخصي">
        {owner?.avatar ? <img src={owner.avatar} alt={ownerDisplayName} className="h-12 w-12 shrink-0 rounded-[var(--konfrm-radius-round)] object-cover" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--konfrm-radius-round)] bg-[var(--konfrm-color-primary-soft)] text-[18px] font-extrabold text-[var(--konfrm-color-primary)]">{ownerDisplayName !== 'المالك' ? ownerDisplayName.charAt(0) : <User className="h-5 w-5" />}</span>}
        <span className="min-w-0"><span className="block truncate text-[17px] font-extrabold text-[var(--konfrm-text-primary)]">{ownerDisplayName}</span><span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[var(--konfrm-text-muted)]"><i className={`h-1.5 w-1.5 rounded-[var(--konfrm-radius-round)] ${verificationStatus === 'VERIFIED' ? 'bg-emerald-600' : verificationStatus === 'PENDING_VERIFICATION' ? 'bg-amber-500' : verificationStatus === 'REJECTED' ? 'bg-rose-600' : 'bg-slate-400'}`} />{verificationCopy[verificationStatus] || verificationCopy.UNVERIFIED}</span></span>
      </button>
      <button type="button" onClick={() => setIsNotificationsOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-[var(--konfrm-radius-control)] border border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] text-[var(--konfrm-text-secondary)]" aria-label="الإشعارات"><Bell className="h-5 w-5" /></button>
    </div>
  </header>;
};

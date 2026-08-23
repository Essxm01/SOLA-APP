import React from 'react';

export const LoadingSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => <div className={`animate-pulse rounded-[var(--konfrm-radius-control)] bg-[var(--konfrm-surface-secondary)] ${className}`} />;

export const DashboardSkeleton: React.FC = () => <div className="space-y-[var(--konfrm-space-section-gap)]" aria-label="جاري تحميل الصفحة الرئيسية">
  <div className="flex items-center gap-3"><LoadingSkeleton className="h-8 w-8 rounded-[var(--konfrm-radius-round)]" /><div><LoadingSkeleton className="h-4 w-32" /><LoadingSkeleton className="mt-2 h-3 w-48" /></div></div>
  <div><LoadingSkeleton className="h-4 w-24" /><LoadingSkeleton className="mt-2 h-6 w-44" /><LoadingSkeleton className="mt-3 h-[142px] w-full rounded-[var(--konfrm-radius-elevated-card)]" /></div>
  <div><LoadingSkeleton className="h-6 w-20" /><LoadingSkeleton className="mt-3 h-[170px] w-full rounded-[var(--konfrm-radius-elevated-card)]" /></div>
  <div><LoadingSkeleton className="h-6 w-24" /><LoadingSkeleton className="mt-3 h-[178px] w-full rounded-[var(--konfrm-radius-elevated-card)]" /></div>
</div>;

// Used only while a candidate session is being canonically validated. It must
// never display persisted Owner identity or account-scoped data.
export const OwnerLaunchSkeleton: React.FC = () => <main className="min-h-screen w-full bg-[var(--konfrm-surface-canvas)] pb-28" aria-label="جاري فتح التطبيق">
  <header className="border-b border-[var(--konfrm-border-subtle)] bg-[var(--konfrm-surface-primary)]"><div className="mx-auto flex h-[68px] max-w-[430px] items-center justify-between px-[var(--konfrm-space-page-horizontal)]"><LoadingSkeleton className="h-12 w-40" /><LoadingSkeleton className="h-11 w-11" /></div></header>
  <div className="mx-auto max-w-[430px] px-[var(--konfrm-space-page-horizontal)] py-5"><DashboardSkeleton /></div>
  <nav className="fixed bottom-0 left-0 right-0 mx-auto max-w-[430px] border-t border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] px-1 pt-1.5"><div className="flex items-center justify-between pb-[max(8px,env(safe-area-inset-bottom))]">{Array.from({ length: 5 }, (_, index) => <div key={index} className="flex min-h-12 flex-1 items-center justify-center"><LoadingSkeleton className="h-5 w-8" /></div>)}</div></nav>
</main>;

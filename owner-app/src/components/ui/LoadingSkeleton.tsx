import React from 'react';

export const LoadingSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => <div className={`animate-pulse rounded-[var(--konfrm-radius-control)] bg-[var(--konfrm-surface-secondary)] ${className}`} />;

export const DashboardSkeleton: React.FC = () => <div className="space-y-[var(--konfrm-space-section-gap)]" aria-label="جاري تحميل الصفحة الرئيسية">
  <div className="flex items-center gap-3"><LoadingSkeleton className="h-8 w-8 rounded-[var(--konfrm-radius-round)]" /><div><LoadingSkeleton className="h-4 w-32" /><LoadingSkeleton className="mt-2 h-3 w-48" /></div></div>
  <div><LoadingSkeleton className="h-4 w-24" /><LoadingSkeleton className="mt-2 h-6 w-44" /><LoadingSkeleton className="mt-3 h-[142px] w-full rounded-[var(--konfrm-radius-elevated-card)]" /></div>
  <div><LoadingSkeleton className="h-6 w-20" /><LoadingSkeleton className="mt-3 h-[170px] w-full rounded-[var(--konfrm-radius-elevated-card)]" /></div>
  <div><LoadingSkeleton className="h-6 w-24" /><LoadingSkeleton className="mt-3 h-[178px] w-full rounded-[var(--konfrm-radius-elevated-card)]" /></div>
</div>;

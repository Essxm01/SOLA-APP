import React from 'react';

export const LoadingSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />;
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <LoadingSkeleton className="w-12 h-12 rounded-full" />
          <div className="flex flex-col gap-2">
            <LoadingSkeleton className="w-32 h-4" />
            <LoadingSkeleton className="w-24 h-3" />
          </div>
        </div>
        <LoadingSkeleton className="w-10 h-10 rounded-full" />
      </div>

      {/* Metrics skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <LoadingSkeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>

      {/* Bookings skeleton */}
      <div className="flex flex-col gap-3">
        <LoadingSkeleton className="w-40 h-5" />
        <LoadingSkeleton className="h-40 rounded-2xl" />
      </div>
    </div>
  );
};

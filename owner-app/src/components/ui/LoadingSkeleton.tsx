import React from 'react';

export const LoadingSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />;
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-5 w-full animate-fade-in text-right">
      {/* Needs Attention skeleton */}
      <div className="space-y-2">
        <LoadingSkeleton className="w-28 h-5 rounded-lg" />
        <LoadingSkeleton className="w-full h-14 rounded-2xl" />
      </div>

      {/* Bookings skeleton */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <LoadingSkeleton className="w-20 h-5 rounded-lg" />
          <LoadingSkeleton className="w-14 h-4 rounded-lg" />
        </div>
        <LoadingSkeleton className="w-full h-24 rounded-2xl" />
      </div>

      {/* Properties skeleton */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <LoadingSkeleton className="w-24 h-5 rounded-lg" />
          <LoadingSkeleton className="w-16 h-4 rounded-lg" />
        </div>
        <LoadingSkeleton className="w-full h-24 rounded-2xl" />
      </div>

      {/* Wallet skeleton */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <LoadingSkeleton className="w-20 h-5 rounded-lg" />
          <LoadingSkeleton className="w-14 h-4 rounded-lg" />
        </div>
        <LoadingSkeleton className="w-full h-28 rounded-2xl" />
      </div>

      {/* Actions skeleton */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <LoadingSkeleton className="h-12 rounded-2xl" />
        <LoadingSkeleton className="h-12 rounded-2xl" />
      </div>
    </div>
  );
};

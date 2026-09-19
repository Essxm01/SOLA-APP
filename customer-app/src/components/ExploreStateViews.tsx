import React from 'react';
import { Compass, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * ExploreSkeletonFeed renders 3 skeleton cards matching the exact
 * 1.4:1 aspect ratio and internal geometry of PropertyCard.
 */
export const ExploreSkeletonFeed: React.FC = () => {
  return (
    <div className="space-y-4 my-3" aria-label="جاري التحميل..." role="status">
      {[1, 2, 3].map((idx) => (
        <div
          key={idx}
          className="relative overflow-hidden flex flex-col justify-between bg-white rounded-2xl border border-slate-200/80 shadow-xs"
        >
          {/* Cover image skeleton matching aspect-[1.4/1] */}
          <div className="relative w-full aspect-[1.4/1] bg-slate-200/70 animate-pulse rounded-t-2xl">
            <div className="w-9 h-9 rounded-full bg-white/70 absolute top-2 left-2" />
          </div>

          {/* Content skeleton matching final comparison-row layout */}
          <div className="p-4 flex-1 pointer-events-none space-y-2">
            {/* Title skeleton */}
            <div className="h-4 bg-slate-200 animate-pulse rounded w-3/4" />
            {/* Location skeleton */}
            <div className="h-3 bg-slate-100 animate-pulse rounded w-1/2" />
            {/* Final comparison row: Facts RIGHT ↔ Price LEFT */}
            <div className="flex items-baseline justify-between gap-3 pt-0.5">
              <div className="h-3.5 bg-slate-100 animate-pulse rounded w-2/5" />
              <div className="h-4.5 bg-slate-200 animate-pulse rounded w-24 shrink-0" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export interface ExploreEmptyViewProps {
  title?: string;
  support?: string;
}

/**
 * ExploreEmptyView renders truthful copy when explore inventory is empty.
 * Defaults to "لسه مفيش إقامات هنا" without claiming date-unavailability.
 */
export const ExploreEmptyView: React.FC<ExploreEmptyViewProps> = ({
  title = 'لسه مفيش إقامات هنا',
  support = 'جرّب مرة تانية لاحقًا.',
}) => {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200/80 text-center shadow-xs my-4 space-y-2">
      <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-1">
        <Compass className="w-6 h-6 text-slate-300" />
      </div>
      <h3 className="text-[16px] font-extrabold text-slate-800">{title}</h3>
      <p className="text-[13px] font-medium text-slate-500">{support}</p>
    </div>
  );
};

export interface ExploreErrorViewProps {
  title?: string;
  support?: string;
  onRetry: () => void;
}

/**
 * ExploreErrorView renders truthful error message and retry button.
 */
export const ExploreErrorView: React.FC<ExploreErrorViewProps> = ({
  title = 'تعذر تحميل الإقامات',
  support = 'حاول مرة تانية.',
  onRetry,
}) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-rose-100 text-center shadow-xs my-4 space-y-3">
      <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
        <AlertCircle className="w-6 h-6 text-rose-500" />
      </div>
      <div>
        <h3 className="text-[16px] font-extrabold text-slate-800">{title}</h3>
        <p className="text-[13px] font-medium text-slate-500 mt-1">{support}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-[44px] px-5 py-2.5 bg-[#0059FF] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>إعادة المحاولة</span>
      </button>
    </div>
  );
};

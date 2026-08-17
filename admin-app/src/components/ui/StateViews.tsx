import React from 'react';
import { AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { Button } from './Button';

export const SkeletonBox: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div className={`animate-pulse bg-slate-200/80 rounded-xl ${className}`} />;
};

export const TableSkeleton: React.FC = () => {
  return (
    <div className="p-6 space-y-4">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="flex gap-4 items-center">
          <SkeletonBox className="h-10 w-1/4" />
          <SkeletonBox className="h-10 w-2/4" />
          <SkeletonBox className="h-10 w-1/4" />
        </div>
      ))}
    </div>
  );
};

export interface EmptyStateProps {
  title?: string;
  subtext?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'لا توجد بيانات متاحة حالياً',
  subtext = 'جميع الأنشطة والطلبات تم حسمها بالكامل.',
  icon,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="p-16 text-center space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
        {icon || <FileText className="w-6 h-6" />}
      </div>
      <h3 className="font-extrabold text-slate-800 text-sm">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto">{subtext}</p>
      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export interface AlertBannerProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ type, message, onClose }) => {
  const configs = {
    success: 'bg-emerald-50 border-emerald-300 text-emerald-900 icon-emerald-600',
    error: 'bg-rose-50 border-rose-300 text-rose-900 icon-rose-600',
    warning: 'bg-amber-50 border-amber-300 text-amber-900 icon-amber-600',
    info: 'bg-blue-50 border-blue-300 text-blue-900 icon-blue-600',
  };

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />;
      default:
        return <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />;
    }
  };

  return (
    <div className={`border rounded-2xl p-4 text-xs font-bold flex justify-between items-center shadow-xs ${configs[type]}`}>
      <div className="flex items-center gap-2">
        {renderIcon()}
        <span>{message}</span>
      </div>
      {onClose && (
        <button onClick={onClose} className="text-xs font-extrabold underline px-2 py-1">
          إغلاق
        </button>
      )}
    </div>
  );
};

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'فشل الاتصال بالخادم الرئيسي',
  message = 'تعذر جلب البيانات الحقيقية من الخادم. يرجى التأكد من تشغيل سيرفر الـ Backend والقاعدة الرئيسية.',
  onRetry,
}) => {
  return (
    <div className="p-12 text-center space-y-3 bg-rose-50/50 border border-rose-200 rounded-2xl">
      <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="font-extrabold text-rose-900 text-sm">{title}</h3>
      <p className="text-xs text-rose-700 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={onRetry} className="!bg-white !text-rose-900 !border-rose-300 hover:!bg-rose-100">
            إعادة المحاولة
          </Button>
        </div>
      )}
    </div>
  );
};

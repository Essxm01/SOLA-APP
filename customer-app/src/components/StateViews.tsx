import React from 'react';
import { AlertTriangle, RefreshCw, SearchX } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingStateView: React.FC<LoadingStateProps> = ({ message = 'جاري تحميل العقارات الساحلية...' }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="w-12 h-12 border-4 border-[#0059FF] border-t-transparent rounded-full animate-spin mb-4" />
    <p className="text-slate-600 font-extrabold text-sm animate-pulse">{message}</p>
  </div>
);

interface EmptyStateProps {
  title?: string;
  description?: string;
  onReset?: () => void;
}

export const EmptyStateView: React.FC<EmptyStateProps> = ({
  title = 'لم نجد وحدات تطابق بحثك',
  description = 'جرب البحث عن وجهة ساحلية أخرى أو تغيير تواريخ الإقامة لنتائج أفضل.',
  onReset,
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm my-8">
    <div className="w-16 h-16 bg-blue-50 text-[#0059FF] rounded-2xl flex items-center justify-center mb-4">
      <SearchX className="w-8 h-8" />
    </div>
    <h3 className="text-lg font-black text-slate-900 mb-2">{title}</h3>
    <p className="text-sm text-slate-500 mb-6 leading-relaxed">{description}</p>
    {onReset && (
      <button
        onClick={onReset}
        className="px-6 py-2.5 bg-[#0059FF] text-white font-extrabold text-xs rounded-xl hover:bg-blue-700 transition-all shadow-md"
      >
        إعادة عرض جميع العقارات
      </button>
    )}
  </div>
);

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry: () => void;
}

export const ErrorStateView: React.FC<ErrorStateProps> = ({
  title = 'تعذر الاتصال بالخادم',
  message = 'حدث خطأ في جلب البيانات، يرجى التأكد من اتصال الإنترنت وإعادة المحاولة.',
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto bg-rose-50 rounded-3xl border border-rose-200 shadow-sm my-8">
    <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
      <AlertTriangle className="w-8 h-8" />
    </div>
    <h3 className="text-lg font-black text-rose-950 mb-2">{title}</h3>
    <p className="text-sm text-rose-700 mb-6 leading-relaxed">{message}</p>
    <button
      onClick={onRetry}
      className="px-6 py-2.5 bg-rose-600 text-white font-extrabold text-xs rounded-xl hover:bg-rose-700 transition-all shadow-md flex items-center gap-2"
    >
      <RefreshCw className="w-4 h-4" />
      <span>إعادة المحاولة الان</span>
    </button>
  </div>
);

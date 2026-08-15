import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
  };

  const bgStyles = {
    success: 'border-emerald-200 bg-white text-slate-800',
    error: 'border-rose-200 bg-white text-slate-800',
    info: 'border-blue-200 bg-white text-slate-800',
  };

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-fade-in pointer-events-none">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl ${bgStyles[toast.type]}`}
      >
        {icons[toast.type]}
        <p className="text-sm font-semibold leading-snug">{toast.message}</p>
      </div>
    </div>
  );
};

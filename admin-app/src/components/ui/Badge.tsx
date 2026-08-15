import React from 'react';

export interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  className = '',
}) => {
  const getStatusConfig = (st: string) => {
    switch (st) {
      // Payouts
      case 'PENDING':
      case 'PENDING_ADMIN_PROCESSING':
        return {
          label: label || 'بانتظار المعالجة الإدارية',
          bg: 'bg-amber-50',
          text: 'text-amber-900',
          border: 'border-amber-300',
          dot: 'bg-amber-500',
        };
      case 'PROCESSING':
        return {
          label: label || 'قيد التحويل البنكي',
          bg: 'bg-blue-50',
          text: 'text-[#0059FF]',
          border: 'border-blue-300',
          dot: 'bg-[#0059FF]',
        };
      case 'COMPLETED':
        return {
          label: label || 'تم التحويل بنجاح ✅',
          bg: 'bg-emerald-50',
          text: 'text-emerald-900',
          border: 'border-emerald-300',
          dot: 'bg-emerald-500',
        };
      case 'REJECTED':
        return {
          label: label || 'مرفوض وإعادة الرصيد',
          bg: 'bg-rose-50',
          text: 'text-rose-900',
          border: 'border-rose-300',
          dot: 'bg-rose-500',
        };

      // Disputes
      case 'OPENED':
      case 'UNDER_OWNER_RESPONSE':
      case 'WAITING_FOR_MORE_EVIDENCE':
      case 'ESCALATED_TO_ADMIN':
        return {
          label: label || (st === 'ESCALATED_TO_ADMIN' ? 'مصعد للإدارة (Admin Review)' : 'مفتوح / بانتظار الرد'),
          bg: 'bg-amber-50',
          text: 'text-amber-900',
          border: 'border-amber-300',
          dot: 'bg-amber-500',
        };
      case 'RESOLVING_PENDING_GATEWAY':
        return {
          label: label || 'معالجة الاسترداد البنكي (Pending Gateway)',
          bg: 'bg-blue-50',
          text: 'text-[#0059FF]',
          border: 'border-blue-300',
          dot: 'bg-[#0059FF]',
        };
      case 'RESOLVED':
        return {
          label: label || 'تم حسم النزاع رسمياً ✅',
          bg: 'bg-emerald-50',
          text: 'text-emerald-900',
          border: 'border-emerald-300',
          dot: 'bg-emerald-500',
        };

      // Verifications
      case 'VERIFIED':
        return {
          label: label || 'موثق رسمياً ✓',
          bg: 'bg-emerald-100',
          text: 'text-emerald-900',
          border: 'border-emerald-300',
          dot: 'bg-emerald-600',
        };
      case 'UNVERIFIED':
      case 'NOT_VERIFIED':
        return {
          label: label || 'غير موثق',
          bg: 'bg-slate-100',
          text: 'text-slate-600',
          border: 'border-slate-300',
          dot: 'bg-slate-400',
        };

      default:
        return {
          label: label || st,
          bg: 'bg-slate-100',
          text: 'text-slate-800',
          border: 'border-slate-300',
          dot: 'bg-slate-500',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold border transition-colors ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
};

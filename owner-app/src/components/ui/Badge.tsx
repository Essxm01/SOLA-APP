import React from 'react';
import type { Property, BookingStatus, VerificationStatus } from '../../types';
import {
  PROPERTY_STATUS_CONFIG,
  BOOKING_STATUS_CONFIG,
  VERIFICATION_STATUS_CONFIG,
} from '../../constants/theme';
import { CheckCircle2, AlertCircle, Clock, XCircle } from 'lucide-react';
import { getPropertyStatusPresentation } from '../../utils/ownerProperties';

interface PropertyStatusChipProps {
  property: Property;
  className?: string;
}

export const PropertyStatusChip: React.FC<PropertyStatusChipProps> = ({
  property,
  className = '',
}) => {
  const composite = getPropertyStatusPresentation(property);
  const config = composite.label === 'تحتاج تعديلات'
    ? { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', label: composite.label }
    : PROPERTY_STATUS_CONFIG[property.status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      <span>{config.label}</span>
    </span>
  );
};

interface BookingStatusChipProps {
  status: BookingStatus;
  className?: string;
}

export const BookingStatusChip: React.FC<BookingStatusChipProps> = ({
  status,
  className = '',
}) => {
  const config = BOOKING_STATUS_CONFIG[status] || {
    label: status,
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    iconColor: '#64748B',
  };

  const renderIcon = () => {
    switch (status) {
      case 'PENDING_OWNER_APPROVAL':
        return <Clock className="w-3.5 h-3.5" />;
      case 'CONFIRMED':
      case 'OWNER_ACCEPTED':
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'REJECTED':
      case 'OWNER_REJECTED':
        return <XCircle className="w-3.5 h-3.5" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${config.bg} ${config.text} ${className}`}
    >
      {renderIcon()}
      <span>{config.label}</span>
    </span>
  );
};

interface VerificationBadgeProps {
  status: VerificationStatus;
  text?: string;
  label?: string;
  className?: string;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  status,
  text,
  label,
  className = '',
}) => {
  const config = VERIFICATION_STATUS_CONFIG[status];
  const displayText = label || text || config.label;
  const isVerified = status === 'VERIFIED';
  const isPending = status === 'PENDING_VERIFICATION';

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
        isVerified
          ? 'bg-blue-50/80 text-[#0059FF] border-blue-200/70'
          : isPending
          ? 'bg-amber-50 text-amber-700 border-amber-200/70'
          : 'bg-slate-50 text-slate-600 border-slate-200/80'
      } ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isVerified ? 'bg-[#0059FF]' : isPending ? 'bg-amber-500' : 'bg-slate-400'
        }`}
      />
      <span>{displayText}</span>
    </div>
  );
};

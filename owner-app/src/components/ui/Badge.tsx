import React from 'react';
import type { PropertyStatus, BookingStatus, VerificationStatus } from '../../types';
import {
  PROPERTY_STATUS_CONFIG,
  BOOKING_STATUS_CONFIG,
  VERIFICATION_STATUS_CONFIG,
} from '../../constants/theme';
import { ShieldCheck, CheckCircle2, AlertCircle, Clock, XCircle } from 'lucide-react';

interface PropertyStatusChipProps {
  status: PropertyStatus;
  className?: string;
}

export const PropertyStatusChip: React.FC<PropertyStatusChipProps> = ({
  status,
  className = '',
}) => {
  const config = PROPERTY_STATUS_CONFIG[status];
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

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-blue-200/80 shadow-xs ${config.bg} ${config.text} ${className}`}
    >
      <ShieldCheck className="w-4 h-4 text-[#0059FF] shrink-0" />
      <span>{displayText}</span>
    </div>
  );
};

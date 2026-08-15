import React from 'react';
import { Button } from './Button';
import { Home, Calendar, Inbox, Building2 } from 'lucide-react';

interface EmptyStateProps {
  type?: 'dashboard' | 'bookings' | 'properties' | 'messages' | 'notifications';
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'dashboard',
  title,
  description,
  actionText,
  onAction,
  icon,
}) => {
  const getDefaultIcon = () => {
    switch (type) {
      case 'properties':
        return <Building2 className="w-10 h-10 text-[#0059FF]" />;
      case 'bookings':
        return <Calendar className="w-10 h-10 text-[#0059FF]" />;
      case 'messages':
        return <Inbox className="w-10 h-10 text-[#0059FF]" />;
      default:
        return <Home className="w-10 h-10 text-[#0059FF]" />;
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm animate-fade-in my-4">
      <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4 ring-8 ring-blue-50/50">
        {icon || getDefaultIcon()}
      </div>

      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">{description}</p>

      {actionText && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  primaryActionVariant?: 'primary' | 'secondary' | 'danger';
  isPrimaryLoading?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionVariant = 'primary',
  isPrimaryLoading = false,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in dir-rtl" dir="rtl">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="text-xs space-y-4">{children}</div>

        {/* Action Footer */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onClose}>
            إلغاء
          </Button>

          {primaryActionLabel && onPrimaryAction && (
            <Button
              variant={primaryActionVariant}
              size="sm"
              onClick={onPrimaryAction}
              isLoading={isPrimaryLoading}
            >
              {primaryActionLabel}
            </Button>
          )}
        </div>

      </div>
    </div>
  );
};

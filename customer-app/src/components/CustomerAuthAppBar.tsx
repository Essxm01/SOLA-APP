import React from 'react';
import { ArrowRight } from 'lucide-react';

export interface CustomerAuthAppBarProps {
  onBack: () => void;
  ariaLabel: string;
}

/** Shared, sticky Auth V2 chrome for the Customer entry and OTP screens. */
export const CustomerAuthAppBar: React.FC<CustomerAuthAppBarProps> = ({ onBack, ariaLabel }) => (
  <header
    aria-label={ariaLabel}
    className="sticky top-0 z-20 flex w-full shrink-0 items-center justify-between border-b border-slate-100 bg-white"
    style={{ minHeight: 'calc(3.5rem + env(safe-area-inset-top, 0px))', paddingTop: 'env(safe-area-inset-top, 0px)' }}
  >
    <button
      type="button"
      onClick={onBack}
      aria-label="رجوع"
      className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sola-primary-blue)]"
    >
      <ArrowRight className="h-5 w-5" aria-hidden="true" />
    </button>
    <img src="/konfrm-mark.svg" alt="كونفرم" className="h-8 w-auto" />
    <span className="h-11 w-11" aria-hidden="true" />
  </header>
);

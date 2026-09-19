import React, { useState, useId } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  normalizeDigits,
  validateEgyptianMobilePhone,
  PHONE_VALIDATION_MESSAGES,
} from '../utils/phoneValidation';

export type Screen08AuthOrigin =
  | { type: 'DIRECT_WELCOME' }
  | { type: 'DIRECT_EXPLORE' }
  | { type: 'DIRECT_FAVORITES_TAB' }
  | { type: 'DIRECT_ACCOUNT' }
  | { type: 'PROTECTED_FAVORITE'; propertyId: string }
  | { type: 'PROTECTED_BOOKING'; context?: any };

export interface CustomerScreen08PhoneEntryProps {
  onBack: () => void;
  onSubmitPhone: (canonicalPhone: string, localPhone: string) => Promise<void> | void;
  authOrigin?: Screen08AuthOrigin | null;
  loading?: boolean;
  serviceErrorMessage?: string | null;
  onClearServiceError?: () => void;
}

export const CustomerScreen08PhoneEntry: React.FC<CustomerScreen08PhoneEntryProps> = ({
  onBack,
  onSubmitPhone,
  authOrigin,
  loading = false,
  serviceErrorMessage = null,
  onClearServiceError,
}) => {
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [isTouched, setIsTouched] = useState<boolean>(false);
  const [submitAttempted, setSubmitAttempted] = useState<boolean>(false);
  const phoneInputId = useId();

  // Validate normalized digits
  const validation = validateEgyptianMobilePhone(phoneInput);
  const normalized = normalizeDigits(phoneInput);

  // Error condition:
  // - Show error if submit was attempted while invalid
  // - Or if complete (11 digits) but invalid prefix
  // - Or if blurred (touched) and non-empty but incomplete/invalid
  const shouldShowValidationError =
    !validation.isValid &&
    ((submitAttempted && normalized.length > 0) ||
      normalized.length === 11 ||
      (isTouched && normalized.length > 0));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanDigits = normalizeDigits(rawVal);
    setPhoneInput(cleanDigits);
    if (serviceErrorMessage && onClearServiceError) {
      onClearServiceError();
    }
  };

  const handleBlur = () => {
    setIsTouched(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitAttempted(true);

    if (!validation.isValid || loading) {
      return;
    }

    onSubmitPhone(validation.canonicalE164, validation.normalizedLocal);
  };

  // Context-specific reassurance copy
  const renderReassurance = () => {
    if (!authOrigin) return null;

    if (authOrigin.type === 'PROTECTED_BOOKING') {
      return (
        <div
          data-testid="screen08-booking-reassurance"
          className="mt-4 p-3 rounded-xl bg-blue-50/80 border border-blue-100/80 flex items-start gap-2.5 text-right"
        >
          <span className="text-[#0059FF] text-base leading-none select-none">📌</span>
          <p className="text-xs font-bold text-slate-700 leading-relaxed">
            {PHONE_VALIDATION_MESSAGES.bookingReassurance}
          </p>
        </div>
      );
    }

    if (authOrigin.type === 'PROTECTED_FAVORITE') {
      return (
        <div
          data-testid="screen08-favorite-reassurance"
          className="mt-4 p-3 rounded-xl bg-blue-50/80 border border-blue-100/80 flex items-start gap-2.5 text-right"
        >
          <span className="text-[#0059FF] text-base leading-none select-none">💙</span>
          <p className="text-xs font-bold text-slate-700 leading-relaxed">
            {PHONE_VALIDATION_MESSAGES.favoriteReassurance}
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      data-testid="customer-screen08-auth-phone"
      dir="rtl"
      className="fixed inset-0 z-50 bg-white flex flex-col pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] selection:bg-blue-100"
    >
      {/* 2. Compact Auth Header (56px content height) */}
      <header className="h-14 min-h-[56px] px-4 flex items-center justify-between border-b border-slate-100/80 bg-white shrink-0">
        <div className="w-full max-w-[430px] mx-auto flex items-center justify-between">
          {/* Back control on RIGHT in RTL with >=44x44 touch target */}
          <button
            type="button"
            onClick={onBack}
            aria-label="الرجوع"
            className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-slate-700 hover:text-slate-900 active:scale-95 transition-all rounded-full hover:bg-slate-50 cursor-pointer -mr-2"
          >
            <ChevronRight className="w-6 h-6 stroke-[2.25]" />
          </button>

          {/* Calm brand mark */}
          <div className="flex items-center gap-2 select-none">
            <img src="/favicon.svg" alt="KONFRM" className="w-7 h-7 object-contain" />
            <span className="text-xs font-black text-slate-900 tracking-wider">KONFRM</span>
          </div>

          {/* Symmetrical placeholder for balance */}
          <div className="min-w-[44px] min-h-[44px] w-11 h-11 -ml-2" aria-hidden="true" />
        </div>
      </header>

      {/* 3. Main Content Container (scrollable when vertical space contracts) */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-[430px] mx-auto px-5 max-[360px]:px-4 flex flex-col">
          {/* 4. Breathing space */}
          <div className="mt-7 max-[360px]:mt-5" />

          {/* 5. Heading */}
          <h1 className="text-[22px] max-[360px]:text-xl font-extrabold text-slate-900 leading-tight">
            {PHONE_VALIDATION_MESSAGES.primaryHeading}
          </h1>

          {/* 6. Supporting copy */}
          <p className="text-sm text-slate-500 font-medium leading-relaxed mt-2">
            {PHONE_VALIDATION_MESSAGES.supportingCopy}
          </p>

          {/* 7. Optional protected-context reassurance */}
          {renderReassurance()}

          {/* 8. Breathing space */}
          <div className="mt-6 max-[360px]:mt-5" />

          {/* Phone Input Form */}
          <form onSubmit={handleSubmit} noValidate className="flex flex-col">
            {/* 9. Phone label */}
            <label
              htmlFor={phoneInputId}
              className="block text-xs font-bold text-slate-700 mb-1.5"
            >
              {PHONE_VALIDATION_MESSAGES.phoneLabel}
            </label>

            {/* 10. Phone Input Container (~54px height, 12px radius) */}
            <div
              className={`h-[54px] w-full rounded-xl border bg-slate-50/50 flex items-center px-4 transition-colors ${
                shouldShowValidationError || serviceErrorMessage
                  ? 'border-rose-300 focus-within:border-rose-500'
                  : 'border-slate-200 focus-within:border-[#0059FF]'
              }`}
            >
              {/* Local Egyptian Phone Number Input Field */}
              <input
                id={phoneInputId}
                type="tel"
                inputMode="numeric"
                dir="ltr"
                autoComplete="tel-national"
                placeholder={PHONE_VALIDATION_MESSAGES.phonePlaceholder}
                value={phoneInput}
                onChange={handleInputChange}
                onBlur={handleBlur}
                disabled={loading}
                maxLength={11}
                className="w-full h-full bg-transparent text-left font-bold text-base text-slate-900 placeholder:text-slate-400 placeholder:text-sm focus:outline-none tracking-wider"
              />
            </div>

            {/* 11. Dedicated Helper / Error Region (reserved vertical space to eliminate layout jumps) */}
            <div className="min-h-[24px] mt-1.5 flex items-center">
              {serviceErrorMessage ? (
                <p data-testid="screen08-service-error" className="text-xs font-bold text-rose-600">
                  {serviceErrorMessage}
                </p>
              ) : shouldShowValidationError ? (
                <p data-testid="screen08-validation-error" className="text-xs font-bold text-rose-600">
                  {PHONE_VALIDATION_MESSAGES.invalid}
                </p>
              ) : (
                <p className="text-xs text-slate-400 font-medium">
                  {PHONE_VALIDATION_MESSAGES.helper}
                </p>
              )}
            </div>

            {/* 12. Breathing space */}
            <div className="mt-5 max-[360px]:mt-4" />

            {/* 13. Primary CTA (~54px height, 12px radius, in document flow, NOT bottom-pinned) */}
            <button
              type="submit"
              disabled={!validation.isValid || loading}
              className={`h-[54px] w-full rounded-xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 select-none cursor-pointer ${
                validation.isValid && !loading
                  ? 'bg-[#0059FF] hover:bg-blue-600 active:scale-[0.99] text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-70'
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{PHONE_VALIDATION_MESSAGES.loadingCta}</span>
                </span>
              ) : (
                <span>{PHONE_VALIDATION_MESSAGES.primaryCta}</span>
              )}
            </button>
          </form>

          {/* 14. Remaining whitespace below task */}
          <div className="pb-10" />
        </div>
      </main>
    </div>
  );
};

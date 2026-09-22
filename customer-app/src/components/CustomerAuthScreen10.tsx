import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { CustomerAuthAppBar } from './CustomerAuthAppBar';
import {
  completeCustomerAccountRegistration,
  CustomerAuthV2Error,
  formatMaskedCustomerPhone,
  getConfiguredAuthV2BaseUrl,
  type AuthV2RegistrationResult,
} from '../utils/customerAuthV2';
import type { Screen10Handoff } from '../utils/customerAuthV2Flow';
import {
  createScreen10SubmissionGuard,
  getScreen10FailureDisposition,
  getScreen10OriginMessage,
  isValidCustomerFullName,
  normalizeCustomerFullName,
} from '../utils/customerScreen10AuthV2';

export interface CustomerAuthScreen10Props {
  handoff: Screen10Handoff;
  authV2BaseUrl?: string | null;
  onBackToScreen08: () => void;
  onCompleted: (result: AuthV2RegistrationResult) => void;
}

type Screen10State = 'ENTRY' | 'SUBMITTING' | 'RETRY_ERROR' | 'REVERIFY_REQUIRED';

function screen10ErrorMessage(error: unknown): string {
  if (!(error instanceof CustomerAuthV2Error)) return 'تعذر إنشاء الحساب. حاول مرة أخرى.';
  if (error.kind === 'INVALID_FULL_NAME') return 'أدخل اسمك الكامل.';
  if (getScreen10FailureDisposition(error.kind) === 'REVERIFY') {
    return 'انتهت خطوة التحقق. تحقق من رقم الهاتف مرة أخرى لإكمال إنشاء الحساب.';
  }
  if (error.kind === 'UNAVAILABLE' || error.kind === 'REQUEST_FAILED') {
    return 'تعذر إنشاء الحساب حاليًا. حاول مرة أخرى.';
  }
  return 'تعذر إنشاء الحساب. حاول مرة أخرى.';
}

export const CustomerAuthScreen10: React.FC<CustomerAuthScreen10Props> = ({
  handoff,
  authV2BaseUrl,
  onBackToScreen08,
  onCompleted,
}) => {
  const [fullName, setFullName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [state, setState] = useState<Screen10State>('ENTRY');
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const guardRef = useRef(createScreen10SubmissionGuard());
  const mountedRef = useRef(true);
  const baseUrl = getConfiguredAuthV2BaseUrl(authV2BaseUrl) ?? '/api/v2';

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
      guardRef.current.cancel();
    };
  }, []);

  const cleanName = normalizeCustomerFullName(fullName);
  const validName = isValidCustomerFullName(cleanName);
  const originMessage = useMemo(() => getScreen10OriginMessage(handoff.authOrigin), [handoff.authOrigin]);
  const reverifyRequired = state === 'REVERIFY_REQUIRED';
  const validationMessage = submitted && !validName ? 'أدخل اسمك الكامل.' : null;

  const returnToScreen08 = (): void => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    guardRef.current.cancel();
    onBackToScreen08();
  };

  const submit = async (): Promise<void> => {
    setSubmitted(true);
    if (!validName || state === 'SUBMITTING' || reverifyRequired) return;

    const generation = guardRef.current.begin();
    if (generation === null) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setState('SUBMITTING');
    setError(null);

    try {
      const result = await completeCustomerAccountRegistration(
        handoff.continuationToken,
        cleanName,
        { baseUrl },
        controller.signal,
      );
      if (!mountedRef.current || !guardRef.current.isCurrent(generation)) return;
      onCompleted(result);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      if (!mountedRef.current || !guardRef.current.isCurrent(generation)) return;
      setError(screen10ErrorMessage(caught));
      setState(
        caught instanceof CustomerAuthV2Error && getScreen10FailureDisposition(caught.kind) === 'REVERIFY'
          ? 'REVERIFY_REQUIRED'
          : 'RETRY_ERROR',
      );
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      if (mountedRef.current && guardRef.current.isCurrent(generation)) {
        setState((current) => current === 'SUBMITTING' ? 'ENTRY' : current);
      }
      guardRef.current.cancel();
    }
  };

  return (
    <main dir="rtl" className="fixed inset-0 z-[96] min-h-[100dvh] overflow-y-auto overflow-x-hidden bg-white text-slate-900">
      <div
        className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col px-5 pb-8"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <CustomerAuthAppBar onBack={returnToScreen08} ariaLabel="إكمال إنشاء الحساب" />

        <section className="flex flex-1 flex-col pt-10" aria-labelledby="customer-auth-screen10-title">
          <div>
            <h1 id="customer-auth-screen10-title" className="text-2xl font-black tracking-tight text-slate-950">
              أكمل إنشاء حسابك
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              أدخل اسمك الكامل للمتابعة.
            </p>

            <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <span>تم التحقق من رقم الهاتف</span>
              <span aria-hidden="true">·</span>
              <span dir="ltr" className="font-extrabold text-slate-700">
                {formatMaskedCustomerPhone(handoff.identifier)}
              </span>
            </p>

            <div className="mt-8">
              <label htmlFor="customer-auth-full-name" className="mb-2 block text-sm font-extrabold text-slate-800">
                الاسم الكامل
              </label>
              <input
                id="customer-auth-full-name"
                type="text"
                autoComplete="name"
                value={fullName}
                disabled={state === 'SUBMITTING' || reverifyRequired}
                onChange={(event) => {
                  setFullName(event.target.value);
                  setError(null);
                  if (state === 'RETRY_ERROR') setState('ENTRY');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void submit();
                  }
                }}
                placeholder="أحمد محمد"
                aria-invalid={Boolean(validationMessage || error)}
                aria-describedby="customer-auth-screen10-feedback"
                className="min-h-[54px] w-full rounded-xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-950 outline-none transition focus:border-[var(--sola-primary-blue)] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div id="customer-auth-screen10-feedback" aria-live="polite" className="min-h-14 pt-3 text-sm font-semibold leading-6">
              {validationMessage && <p className="text-rose-700">{validationMessage}</p>}
              {!validationMessage && error && <p className={reverifyRequired ? 'text-amber-700' : 'text-rose-700'}>{error}</p>}
            </div>
          </div>

          <div className="mt-auto pt-4">
            {reverifyRequired ? (
              <button
                type="button"
                onClick={returnToScreen08}
                className="flex min-h-[54px] w-full items-center justify-center rounded-xl bg-[var(--sola-primary-blue)] px-4 text-base font-extrabold text-white"
              >
                إعادة التحقق من رقم الهاتف
              </button>
            ) : (
              <button
                type="button"
                disabled={!validName || state === 'SUBMITTING'}
                onClick={() => void submit()}
                className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--sola-primary-blue)] px-4 text-base font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state === 'SUBMITTING' && <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />}
                {state === 'SUBMITTING' ? 'جارٍ إنشاء الحساب…' : 'إكمال إنشاء الحساب'}
              </button>
            )}
            {originMessage && (
              <p className="mt-5 text-center text-sm font-semibold leading-6 text-slate-500">{originMessage}</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

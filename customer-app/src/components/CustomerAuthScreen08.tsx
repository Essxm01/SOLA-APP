import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { CustomerAuthAppBar } from './CustomerAuthAppBar';
import {
  CustomerAuthV2Error,
  getAuthOriginMessage,
  getConfiguredAuthV2BaseUrl,
  isValidCustomerEmail,
  isValidEgyptianPhone,
  issueCustomerAuthChallenge,
  normalizeArabicDigits,
  normalizeCustomerEmail,
  normalizeEgyptianPhone,
  toEgyptianE164,
  type AuthChallengeIssued,
  type AuthIntent,
  type AuthMethod,
  type AuthOrigin,
} from '../utils/customerAuthV2';
import {
  createScreen08FormStateFromDraft,
  createScreen08HandoffGuard,
  createScreen08IssueGuard,
  switchScreen08Intent,
  switchScreen08Method,
  updateScreen08Identifier,
  type Screen08FormState,
} from '../utils/customerScreen08AuthV2';

export interface CustomerAuthScreen08Props {
  initialIntent?: AuthIntent;
  initialForm?: Screen08FormState;
  authOrigin: AuthOrigin;
  authV2BaseUrl?: string | null;
  onChallengeIssued: (challenge: AuthChallengeIssued) => void;
  onFormChange?: (form: Screen08FormState) => void;
  onBack?: () => void;
  onCancel?: () => void;
}

const invalidPhoneMessage = 'أدخل رقم هاتف صحيحًا.';
const invalidEmailMessage = 'أدخل بريدًا إلكترونيًا صحيحًا.';
const serviceErrorMessage = 'تعذر إرسال رمز التحقق. حاول مرة أخرى.';

function errorMessage(error: unknown): string {
  if (!(error instanceof CustomerAuthV2Error)) return serviceErrorMessage;
  if (error.kind === 'RATE_LIMIT') return 'تم تجاوز عدد المحاولات. حاول لاحقًا.';
  if (error.kind === 'OTP_DELIVERY_FAILED') return 'تعذر إرسال رمز التحقق. حاول مرة أخرى.';
  if (error.kind === 'INVALID_MOBILE') return invalidPhoneMessage;
  if (error.kind === 'INVALID_EMAIL') return invalidEmailMessage;
  if (error.kind === 'UNAVAILABLE') return 'خدمة تسجيل الدخول غير متاحة حاليًا. حاول مرة أخرى لاحقًا.';
  return serviceErrorMessage;
}

export const CustomerAuthScreen08: React.FC<CustomerAuthScreen08Props> = ({
  initialIntent = 'LOGIN',
  initialForm,
  authOrigin,
  authV2BaseUrl,
  onChallengeIssued,
  onFormChange,
  onBack,
  onCancel,
}) => {
  const [form, setForm] = useState<Screen08FormState>(() => createScreen08FormStateFromDraft(initialForm, initialIntent));
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [handoffIssued, setHandoffIssued] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const guardRef = useRef(createScreen08IssueGuard());
  const handoffGuardRef = useRef(createScreen08HandoffGuard());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
      guardRef.current.cancel();
    };
  }, []);

  const originMessage = useMemo(() => getAuthOriginMessage(authOrigin), [authOrigin]);
  const activeValue = form.method === 'PHONE' ? form.phone : form.email;
  const canonicalEmail = normalizeCustomerEmail(form.email);
  const canSubmit = form.method === 'PHONE' ? isValidEgyptianPhone(form.phone) : isValidCustomerEmail(canonicalEmail);
  const validationMessage = submitted
    ? (form.method === 'PHONE'
      ? (isValidEgyptianPhone(form.phone) ? null : invalidPhoneMessage)
      : (isValidCustomerEmail(canonicalEmail) ? null : invalidEmailMessage))
    : null;

  const invalidateIssue = (): void => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    guardRef.current.cancel();
    setLoading(false);
  };

  const leave = (): void => {
    invalidateIssue();
    if (onBack) onBack();
    else onCancel?.();
  };

  const updateForm = (next: Screen08FormState): void => {
    setForm(next);
    onFormChange?.(next);
  };

  const submit = async (): Promise<void> => {
    setSubmitted(true);
    const localPhone = normalizeEgyptianPhone(form.phone);
    const identifier = form.method === 'PHONE' ? toEgyptianE164(localPhone) : canonicalEmail;
    const valid = form.method === 'PHONE' ? isValidEgyptianPhone(localPhone) : isValidCustomerEmail(identifier);
    if (!valid || loading || handoffIssued) return;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const generation = guardRef.current.begin();
    setLoading(true);
    setError(null);

    try {
      const baseUrl = getConfiguredAuthV2BaseUrl(authV2BaseUrl);
      if (!baseUrl) throw new CustomerAuthV2Error('CONFIGURATION');
      const challenge = await issueCustomerAuthChallenge({ intent: form.intent, method: form.method, identifier, authOrigin }, { baseUrl }, controller.signal);
      if (mountedRef.current && guardRef.current.isCurrent(generation)) {
        if (handoffGuardRef.current.claim()) {
          setHandoffIssued(true);
          onChallengeIssued(challenge);
        }
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      if (mountedRef.current && guardRef.current.isCurrent(generation)) setError(errorMessage(caught));
    } finally {
      if (mountedRef.current && guardRef.current.isCurrent(generation)) {
        setLoading(false);
        controllerRef.current = null;
      }
    }
  };

  const switchIntent = (intent: AuthIntent): void => {
    invalidateIssue();
    updateForm(switchScreen08Intent(form, intent));
    setSubmitted(false);
    setError(null);
  };

  const switchMethod = (method: AuthMethod): void => {
    invalidateIssue();
    updateForm(switchScreen08Method(form, method));
    setSubmitted(false);
    setError(null);
  };

  return (
    <main dir="rtl" className="fixed inset-0 z-[90] min-h-[100dvh] overflow-y-auto overflow-x-hidden bg-white text-slate-900">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col px-5 pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))' }}>
        <CustomerAuthAppBar onBack={leave} ariaLabel="شاشة الدخول" />

        <section className="flex flex-1 flex-col pt-10" aria-labelledby="customer-auth-screen-title">
          <div>
            <h1 id="customer-auth-screen-title" className="text-2xl font-black tracking-tight text-slate-950">
              {form.intent === 'LOGIN' ? 'تسجيل الدخول' : 'إنشاء حساب'}
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              {form.intent === 'LOGIN' ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}{' '}
              <button
                type="button"
                onClick={() => switchIntent(form.intent === 'LOGIN' ? 'CREATE_ACCOUNT' : 'LOGIN')}
                className="font-extrabold text-[var(--sola-primary-blue)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sola-primary-blue)]"
              >
                {form.intent === 'LOGIN' ? 'إنشاء حساب' : 'تسجيل الدخول'}
              </button>
            </p>
          </div>

          <div className="mt-8">
            <div className="grid min-h-12 grid-cols-2 rounded-xl bg-slate-100 p-1" role="group" aria-label="طريقة التحقق">
              {(['PHONE', 'EMAIL'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  aria-pressed={form.method === method}
                  onClick={() => switchMethod(method)}
                  className={`min-h-11 rounded-xl px-3 text-sm font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sola-primary-blue)] ${form.method === method ? 'bg-white text-[var(--sola-primary-blue)] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {method === 'PHONE' ? 'رقم الهاتف' : 'البريد الإلكتروني'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <label htmlFor="customer-auth-identifier" className="mb-2 block text-sm font-extrabold text-slate-800">
              {form.method === 'PHONE' ? 'رقم الهاتف' : 'البريد الإلكتروني'}
            </label>
            <input
              id="customer-auth-identifier"
              dir="ltr"
              type={form.method === 'PHONE' ? 'tel' : 'email'}
              inputMode={form.method === 'PHONE' ? 'numeric' : 'email'}
              autoComplete={form.method === 'PHONE' ? 'tel-national' : 'email'}
              placeholder={form.method === 'PHONE' ? '01XXXXXXXXX' : 'name@example.com'}
              value={activeValue}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void submit();
                }
              }}
              onChange={(event) => {
                const value = form.method === 'PHONE'
                  ? normalizeArabicDigits(event.target.value).replace(/\D/g, '').slice(0, 11)
                  : event.target.value;
                invalidateIssue();
                updateForm(updateScreen08Identifier(form, value));
                if (error) setError(null);
              }}
              aria-invalid={Boolean(validationMessage)}
              aria-describedby={validationMessage || error ? 'customer-auth-feedback' : undefined}
              className={`min-h-[54px] w-full rounded-xl border bg-white px-4 text-left text-base font-semibold text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--sola-primary-blue)] focus:ring-2 focus:ring-[var(--sola-primary-blue-soft)] ${validationMessage || error ? 'border-rose-300' : 'border-slate-200'}`}
            />
            <div id="customer-auth-feedback" aria-live="polite" className="min-h-12 pt-2 text-sm font-semibold leading-6">
              {validationMessage && <p className="text-rose-700">{validationMessage}</p>}
              {!validationMessage && error && <p className="text-rose-700">{error}</p>}
            </div>
          </div>

          <button
            type="button"
            onClick={() => { void submit(); }}
            disabled={loading || !canSubmit}
            className="mt-2 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--sola-primary-blue)] px-4 text-base font-extrabold text-white transition-colors hover:bg-[var(--sola-primary-blue-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sola-primary-blue)] disabled:cursor-wait disabled:opacity-70"
          >
            {loading && <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />}
            {loading ? 'جارٍ إرسال الرمز…' : handoffIssued ? 'تم إرسال الرمز' : 'إرسال رمز التحقق'}
          </button>

          {originMessage && <p className="mt-5 text-center text-sm font-semibold leading-6 text-slate-500">{originMessage}</p>}
        </section>
      </div>
    </main>
  );
};

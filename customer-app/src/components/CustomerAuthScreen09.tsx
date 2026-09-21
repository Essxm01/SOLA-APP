import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { CustomerAuthAppBar } from './CustomerAuthAppBar';
import {
  cancelCustomerAuthChallenge,
  CustomerAuthV2Error,
  formatMaskedCustomerPhone,
  getAuthOriginMessage,
  getConfiguredAuthV2BaseUrl,
  type AuthChallengeIssued,
  type AuthV2VerifyResult,
  resendCustomerAuthChallenge,
  verifyCustomerAuthChallenge,
} from '../utils/customerAuthV2';
import {
  canResendScreen09Otp,
  createScreen09RequestGuard,
  formatCountdown,
  getServerTimestampRemainingMs,
  isOtpComplete,
  isScreen09OtpExpired,
  normalizeOtp,
  stateAfterScreen09OtpInput,
  stateAfterScreen09Resend,
  shouldCancelChallengeOnExit,
  type Screen09State,
} from '../utils/customerScreen09AuthV2';

export interface CustomerAuthScreen09Props {
  challenge: AuthChallengeIssued;
  authV2BaseUrl?: string | null;
  onBackToScreen08: () => void;
  onVerified: (result: AuthV2VerifyResult) => void;
  onCreateAccountFromMissing?: (result: Extract<AuthV2VerifyResult, { kind: 'LOGIN_ACCOUNT_MISSING' }>) => void;
  onContinueWithPhoneCreateAccount?: () => void;
}

const genericVerifyError = 'تعذر التحقق من الرمز. حاول مرة أخرى.';
const genericResendError = 'تعذر إعادة إرسال الرمز. حاول مرة أخرى.';

function errorMessage(error: unknown, operation: 'VERIFY' | 'RESEND'): string {
  if (!(error instanceof CustomerAuthV2Error)) return operation === 'RESEND' ? genericResendError : genericVerifyError;
  switch (error.kind) {
    case 'INVALID_OTP': return 'رمز التحقق غير صحيح. حاول مرة أخرى.';
    case 'OTP_EXPIRED': return 'انتهت صلاحية رمز التحقق.';
    case 'CHALLENGE_EXPIRED': return 'انتهت جلسة التحقق. اطلب رمزًا جديدًا.';
    case 'CHALLENGE_LOCKED_MAX_ATTEMPTS_EXCEEDED': return 'تم إيقاف جلسة التحقق بعد محاولات متعددة.';
    case 'CHALLENGE_CANCELLED': return 'تم إلغاء جلسة التحقق. اطلب رمزًا جديدًا.';
    case 'CHALLENGE_NOT_FOUND': return 'جلسة التحقق غير موجودة أو انتهت.';
    case 'CHALLENGE_ALREADY_VERIFIED': return 'تم استخدام جلسة التحقق من قبل. ابدأ جلسة جديدة.';
    case 'RESEND_COOLDOWN_ACTIVE': return 'انتظر قليلًا قبل إعادة إرسال الرمز.';
    case 'RESEND_IN_PROGRESS': return 'تجري إعادة إرسال الرمز حاليًا.';
    case 'RATE_LIMIT_EXCEEDED': case 'RATE_LIMIT': return 'تم تجاوز عدد المحاولات. حاول لاحقًا.';
    default: return operation === 'RESEND' ? genericResendError : genericVerifyError;
  }
}

export const CustomerAuthScreen09: React.FC<CustomerAuthScreen09Props> = ({
  challenge: initialChallenge,
  authV2BaseUrl,
  onBackToScreen08,
  onVerified,
  onCreateAccountFromMissing,
  onContinueWithPhoneCreateAccount,
}) => {
  const [challenge, setChallenge] = useState(initialChallenge);
  const [otp, setOtp] = useState('');
  const [state, setState] = useState<Screen09State>('OTP_ENTRY');
  const [error, setError] = useState<string | null>(null);
  const [remainingNow, setRemainingNow] = useState(() => Date.now());
  const [outcome, setOutcome] = useState<AuthV2VerifyResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const guardRef = useRef(createScreen09RequestGuard());
  const mountedRef = useRef(true);
  const controllersRef = useRef<AbortController[]>([]);
  const returnedRef = useRef(false);
  const verifiedRef = useRef(false);
  const terminalRef = useRef(false);

  const baseUrl = getConfiguredAuthV2BaseUrl(authV2BaseUrl) ?? '/api/v2';
  const resendRemaining = getServerTimestampRemainingMs(challenge.resendAvailableAt, remainingNow);
  const timestampsValid = Number.isFinite(Date.parse(challenge.resendAvailableAt)) && Number.isFinite(Date.parse(challenge.expiresAt));
  const terminal = terminalRef.current || state === 'CHALLENGE_TERMINAL' || !timestampsValid;
  const otpExpired = !terminal && (state === 'OTP_EXPIRED' || isScreen09OtpExpired(challenge, remainingNow));
  const verifyDisabled = !isOtpComplete(otp) || state === 'VERIFYING' || state === 'RESENDING' || Boolean(outcome) || terminal || otpExpired;
  const originMessage = useMemo(() => getAuthOriginMessage(challenge.authOrigin), [challenge.authOrigin]);

  useEffect(() => { terminalRef.current = terminal; }, [terminal]);

  useEffect(() => {
    const timer = window.setInterval(() => setRemainingNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllersRef.current.forEach((controller) => controller.abort());
      guardRef.current.cancel();
    };
  }, [baseUrl]);

  const returnToScreen08 = (): void => {
    if (returnedRef.current) return;
    returnedRef.current = true;
    controllersRef.current.forEach((controller) => controller.abort());
    guardRef.current.cancel();
    setOtp('');
    setError(null);
    if (shouldCancelChallengeOnExit(verifiedRef.current, terminalRef.current)) void cancelCustomerAuthChallenge(challenge, { baseUrl });
    onBackToScreen08();
  };

  const verify = async (): Promise<void> => {
    if (verifyDisabled) return;
    const generation = guardRef.current.begin('VERIFY');
    if (generation === null) return;
    const controller = new AbortController();
    controllersRef.current.push(controller);
    setState('VERIFYING');
    setError(null);
    try {
      const result = await verifyCustomerAuthChallenge(challenge, otp, { baseUrl }, controller.signal);
      if (!mountedRef.current || !guardRef.current.isCurrent(generation)) return;
      verifiedRef.current = true;
      setOutcome(result);
      setState('VERIFIED');
      onVerified(result);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      if (!mountedRef.current || !guardRef.current.isCurrent(generation)) return;
      const message = errorMessage(caught, 'VERIFY');
      setError(message);
      setOtp('');
      inputRef.current?.focus();
      setState(caught instanceof CustomerAuthV2Error && caught.kind === 'OTP_EXPIRED' ? 'OTP_EXPIRED' : caught instanceof CustomerAuthV2Error && ['CHALLENGE_EXPIRED', 'CHALLENGE_CANCELLED', 'CHALLENGE_NOT_FOUND', 'CHALLENGE_ALREADY_VERIFIED', 'CHALLENGE_LOCKED_MAX_ATTEMPTS_EXCEEDED'].includes(caught.kind) ? 'CHALLENGE_TERMINAL' : 'INCORRECT_CODE');
    } finally {
      controllersRef.current = controllersRef.current.filter((item) => item !== controller);
      if (mountedRef.current && guardRef.current.isCurrent(generation) && !outcome) setState((current) => current === 'VERIFYING' ? 'OTP_ENTRY' : current);
      guardRef.current.cancel();
    }
  };

  const resend = async (): Promise<void> => {
    if (state === 'VERIFYING' || state === 'RESENDING' || Boolean(outcome) || !canResendScreen09Otp(terminal, resendRemaining)) return;
    const generation = guardRef.current.begin('RESEND');
    if (generation === null) return;
    const controller = new AbortController();
    controllersRef.current.push(controller);
    setState('RESENDING');
    setError(null);
    try {
      const refreshed = await resendCustomerAuthChallenge(challenge, { baseUrl }, controller.signal);
      if (!mountedRef.current || !guardRef.current.isCurrent(generation)) return;
      setChallenge((current) => ({ ...current, resendAvailableAt: refreshed.resendAvailableAt, expiresAt: refreshed.expiresAt }));
      setOtp('');
      setState(stateAfterScreen09Resend);
      inputRef.current?.focus();
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      if (mountedRef.current && guardRef.current.isCurrent(generation)) {
        setError(errorMessage(caught, 'RESEND'));
        setState('RESEND_ERROR');
      }
    } finally {
      controllersRef.current = controllersRef.current.filter((item) => item !== controller);
      guardRef.current.cancel();
    }
  };

  const requestNewCode = (): void => {
    if (!terminal) return;
    returnedRef.current = true;
    controllersRef.current.forEach((controller) => controller.abort());
    guardRef.current.cancel();
    onBackToScreen08();
  };

  const missingLogin = outcome?.kind === 'LOGIN_ACCOUNT_MISSING' ? outcome : null;
  const isEmailDeferred = outcome?.kind === 'EMAIL_ACCOUNT_CREATION_DEFERRED';
  const screen10Pending = outcome?.kind === 'CREATE_ACCOUNT_NEW_PHONE';

  return (
    <main dir="rtl" className="fixed inset-0 z-[95] min-h-[100dvh] overflow-y-auto overflow-x-hidden bg-white text-slate-900">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col px-5 pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))' }}>
        <CustomerAuthAppBar onBack={returnToScreen08} ariaLabel="تأكيد رمز التحقق" />

        <section className="flex flex-1 flex-col pt-10" aria-labelledby="customer-auth-screen09-title">
          {!outcome ? (
            <>
              <h1 id="customer-auth-screen09-title" className="text-2xl font-black tracking-tight text-slate-950">تأكيد رمز التحقق</h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">أدخل رمز التحقق للمتابعة.</p>
              <p className="mt-5 text-sm font-extrabold text-slate-800" dir="ltr">{challenge.method === 'PHONE' ? formatMaskedCustomerPhone(challenge.identifier) : challenge.maskedRecipient}</p>
              <label htmlFor="customer-auth-otp" className="sr-only">رمز التحقق المكون من ستة أرقام</label>
              <input
                ref={inputRef}
                id="customer-auth-otp"
                className="sr-only"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                disabled={terminal || state === 'VERIFYING' || state === 'RESENDING'}
                onChange={(event) => { if (terminal) return; setOtp(normalizeOtp(event.target.value)); setError(null); setState(stateAfterScreen09OtpInput); }}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void verify(); } }}
                aria-invalid={Boolean(error)}
                aria-describedby="customer-auth-otp-feedback"
              />
              <button type="button" dir="ltr" disabled={terminal} onClick={() => inputRef.current?.focus()} className="mt-8 grid w-full grid-cols-6 gap-2 disabled:cursor-not-allowed" aria-label="إدخال رمز التحقق" style={{ direction: 'ltr' }}>
                {Array.from({ length: 6 }, (_, index) => <span key={index} className={`flex min-h-[56px] items-center justify-center rounded-xl border text-xl font-black ${index < otp.length ? 'border-[var(--sola-primary-blue)] text-slate-950' : 'border-slate-200 text-slate-300'}`}>{otp[index] || '•'}</span>)}
              </button>
              <div id="customer-auth-otp-feedback" aria-live="polite" className="min-h-14 pt-3 text-sm font-semibold leading-6">
                {error && <p className="text-rose-700">{error}</p>}
                {!error && !timestampsValid && <p className="text-rose-700">تعذر التحقق من صلاحية جلسة التحقق. اطلب رمزًا جديدًا.</p>}
                {!error && otpExpired && <p className="text-amber-700">انتهت صلاحية رمز التحقق.</p>}
              </div>
              <button type="button" disabled={verifyDisabled} onClick={() => void verify()} className="mt-2 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--sola-primary-blue)] px-4 text-base font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50">
                {state === 'VERIFYING' && <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />}
                {state === 'VERIFYING' ? 'جارٍ التحقق…' : 'تأكيد الرمز'}
              </button>
              <button type="button" disabled={!canResendScreen09Otp(terminal || state === 'RESENDING' || Boolean(outcome), resendRemaining)} onClick={() => void resend()} className="mt-5 min-h-11 rounded-xl px-3 text-sm font-extrabold text-[var(--sola-primary-blue)] disabled:text-slate-400">
                {state === 'RESENDING' ? 'جارٍ إعادة الإرسال…' : resendRemaining !== null && resendRemaining > 0 ? `إعادة إرسال الرمز خلال ${formatCountdown(resendRemaining)}` : 'إعادة إرسال الرمز'}
              </button>
              {terminal ? <button type="button" onClick={requestNewCode} className="mt-3 min-h-[54px] w-full rounded-xl border border-[var(--sola-primary-blue)] px-4 text-sm font-extrabold text-[var(--sola-primary-blue)]">طلب رمز جديد</button> : <button type="button" onClick={returnToScreen08} className="mt-3 min-h-11 rounded-xl px-3 text-sm font-extrabold text-slate-600">{challenge.method === 'PHONE' ? 'تغيير رقم الهاتف' : 'تغيير البريد الإلكتروني'}</button>}
              {originMessage && <p className="mt-5 text-center text-sm font-semibold leading-6 text-slate-500">{originMessage}</p>}
            </>
          ) : (
            <div aria-live="polite">
              <h1 id="customer-auth-screen09-title" className="text-2xl font-black tracking-tight text-slate-950">تم التحقق من الرمز</h1>
              {missingLogin && <><p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{missingLogin.method === 'PHONE' ? 'لا يوجد حساب مرتبط بهذا الرقم.' : 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني.'}</p>{missingLogin.method === 'PHONE' ? <button type="button" onClick={() => { onCreateAccountFromMissing?.(missingLogin); returnToScreen08(); }} className="mt-8 min-h-[54px] w-full rounded-xl bg-[var(--sola-primary-blue)] px-4 text-base font-extrabold text-white">إنشاء حساب</button> : <button type="button" onClick={onContinueWithPhoneCreateAccount} className="mt-8 min-h-[54px] w-full rounded-xl bg-[var(--sola-primary-blue)] px-4 text-base font-extrabold text-white">استخدام رقم الهاتف</button>}<button type="button" onClick={returnToScreen08} className="mt-3 min-h-11 w-full rounded-xl px-3 text-sm font-extrabold text-slate-600">استخدام رقم آخر</button></>}
              {screen10Pending && <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">تم التحقق من ملكية الرقم. أكمل بيانات الحساب في الخطوة التالية.</p>}
              {isEmailDeferred && <><p className="mt-3 text-sm font-semibold leading-7 text-slate-600">إنشاء الحساب بالبريد الإلكتروني غير متاح حاليًا.</p><button type="button" onClick={onContinueWithPhoneCreateAccount} className="mt-8 min-h-[54px] w-full rounded-xl bg-[var(--sola-primary-blue)] px-4 text-base font-extrabold text-white">استخدام رقم الهاتف</button></>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

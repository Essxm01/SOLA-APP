/**
 * Sola Vacation Rentals — Customer Screen 14 Deposit Payment
 * Location: customer-app/src/components/CustomerDepositPaymentScreen.tsx
 *
 * Master Source of Truth:
 * - LAB_SCREEN14_DEPOSIT_PAYMENT_DESIGN
 * - Dedicated full-screen mobile surface for deposit payment.
 * - Server financial authority; no client-side financial calculations.
 * - Attempt-scoped idempotency key (browser crypto.randomUUID).
 * - Two-step Prototype payment UX (initiate -> complete).
 * - Fail-closed error handling and session recovery (PROTECTED_PAYMENT).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  XCircle,
  HelpCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { getApiUrl } from '../utils/api';
import {
  CustomerPaymentService,
  CustomerPaymentUnauthorizedError,
  CustomerPaymentForbiddenError,
  CustomerPaymentNotFoundError,
  type InitiatePaymentResult,
  type PaymentStatusResult,
} from '../services/customerPaymentService';
import type { CustomerBookingDetailDto } from '../types/customerBookingDetail';
import {
  clearScreen14PrivateState,
  evaluateResumedAmountAuthority,
  getAllowedScreen14Action,
  resolveScreen14HttpErrorState,
  resolveScreen14ReconciliationState,
  resolveScreen14TypedErrorState,
} from '../utils/customerScreen14PaymentState';

export type Screen14PaymentState =
  | 'INITIAL_LOADING'
  | 'READY'
  | 'AMOUNT_CHANGED'
  | 'INITIATING'
  | 'PROTOTYPE_READY_TO_COMPLETE'
  | 'EXTERNAL_HANDOFF_READY'
  | 'CHECKING_STATUS'
  | 'PAYMENT_PENDING'
  | 'FAILED'
  | 'TRANSACTION_EXPIRED'
  | 'SUCCESS'
  | 'ALREADY_CONFIRMED'
  | 'STATE_CHANGED'
  | 'NETWORK_RECONCILIATION_REQUIRED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'ERROR';

export interface CustomerDepositPaymentScreenProps {
  bookingId: string;
  authToken: string;
  onBack: () => void;
  onPaymentSuccess: (bookingId: string) => void;
  onSessionExpired: (bookingId: string) => void;
}

function generateAttemptKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `pay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const CustomerDepositPaymentScreen: React.FC<CustomerDepositPaymentScreenProps> = ({
  bookingId,
  authToken,
  onBack,
  onPaymentSuccess,
  onSessionExpired,
}) => {
  const [booking, setBooking] = useState<CustomerBookingDetailDto | null>(null);
  const [paymentState, setPaymentState] = useState<Screen14PaymentState>('INITIAL_LOADING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active payment attempt state
  const [paymentTransactionId, setPaymentTransactionId] = useState<string | null>(null);
  const [activeDepositEgp, setActiveDepositEgp] = useState<number>(0);
  const [previousDepositEgp, setPreviousDepositEgp] = useState<number | null>(null);

  // Stable attempt-scoped idempotency key (persists across retries of the SAME attempt)
  const idempotencyKeyRef = useRef<string>(generateAttemptKey());
  const isActionLockedRef = useRef<boolean>(false);
  const freshAttemptRequestedRef = useRef<boolean>(false);
  const statusCheckSourceRef = useRef<'PENDING' | 'PROTOTYPE' | 'NETWORK' | null>(null);

  const clearPrivatePaymentState = useCallback(() => {
    const cleared = clearScreen14PrivateState();
    setBooking(cleared.booking);
    setPaymentTransactionId(cleared.paymentTransactionId);
    setActiveDepositEgp(cleared.activeDepositEgp);
    setPreviousDepositEgp(cleared.previousDepositEgp);
    setErrorMessage(cleared.errorMessage);
  }, []);

  // ---------------------------------------------------------------------------
  // Canonical Revalidation on Entry
  // ---------------------------------------------------------------------------
  const revalidateAndReconcile = useCallback(async () => {
    const allowFreshAttempt = freshAttemptRequestedRef.current;
    freshAttemptRequestedRef.current = false;
    setPaymentState('INITIAL_LOADING');
    setErrorMessage(null);

    try {
      // 1. Fetch canonical booking detail
      const res = await fetch(getApiUrl(`/customer/bookings/${bookingId}`), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 401) {
        clearPrivatePaymentState();
        setPaymentState('UNAUTHORIZED');
        return;
      }
      if (res.status === 403) {
        clearPrivatePaymentState();
        setPaymentState('FORBIDDEN');
        return;
      }
      if (res.status === 404) {
        clearPrivatePaymentState();
        setPaymentState('NOT_FOUND');
        return;
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message || 'FETCH_BOOKING_FAILED');
      }

      const canonicalBooking: CustomerBookingDetailDto = json.data;
      setBooking(canonicalBooking);
      setActiveDepositEgp(canonicalBooking.depositAmount);

      // Check status eligibility
      if (canonicalBooking.status === 'CONFIRMED') {
        setPaymentState('ALREADY_CONFIRMED');
        return;
      }
      if (canonicalBooking.status !== 'APPROVED_PENDING_PAYMENT') {
        setPaymentState('STATE_CHANGED');
        return;
      }

      // 2. Reconcile server payment status
      try {
        const paymentStatusResult: PaymentStatusResult = await CustomerPaymentService.getPaymentStatus(
          bookingId,
          authToken
        );

        if (['INITIATED', 'PENDING'].includes(paymentStatusResult.paymentStatus) && paymentStatusResult.paymentTransactionId) {
          // Resumed active attempt: must pass amount authority check before proceeding
          const authority = evaluateResumedAmountAuthority(
            canonicalBooking.depositAmount,
            paymentStatusResult.amountEgp,
          );

          if (authority.status === 'MATCHED') {
            setPaymentTransactionId(paymentStatusResult.paymentTransactionId);
            setActiveDepositEgp(authority.amountEgp);
            setPaymentState(resolveScreen14ReconciliationState(
              canonicalBooking.status,
              paymentStatusResult.paymentStatus,
              true,
              allowFreshAttempt,
            ));
            return;
          }

          if (authority.status === 'MISMATCH_REVIEW_REQUIRED') {
            // Amount mismatch between canonical booking and transaction
            // Re-fetch canonical booking to check coherence with backend update
            const freshRes = await fetch(getApiUrl(`/customer/bookings/${bookingId}`), {
              headers: { Authorization: `Bearer ${authToken}` },
            });
            const freshAccessState = resolveScreen14HttpErrorState(freshRes.status);
            if (freshAccessState) {
              clearPrivatePaymentState();
              setPaymentState(freshAccessState);
              return;
            }
            const freshJson = await freshRes.json().catch(() => ({}));
            const freshBooking: CustomerBookingDetailDto | null =
              freshRes.ok && freshJson.success && freshJson.data ? freshJson.data : null;

            if (freshBooking && freshBooking.depositAmount === paymentStatusResult.amountEgp) {
              // Server booking coherently matches the transaction amount
              if (paymentStatusResult.paymentStatus === 'INITIATED') {
                setPreviousDepositEgp(canonicalBooking.depositAmount);
                setBooking(freshBooking);
                setActiveDepositEgp(freshBooking.depositAmount);
                setPaymentTransactionId(paymentStatusResult.paymentTransactionId);
                setPaymentState('AMOUNT_CHANGED');
                return;
              } else {
                // For PENDING: Section 5 - amount acknowledgement cannot bypass PENDING state
                setBooking(freshBooking);
                setActiveDepositEgp(freshBooking.depositAmount);
                setPaymentTransactionId(paymentStatusResult.paymentTransactionId);
                setPaymentState('PAYMENT_PENDING');
                return;
              }
            }

            // Inconsistent: transaction amount does not match canonical booking even after fresh read
            if (paymentStatusResult.paymentStatus === 'PENDING') {
              setPaymentTransactionId(paymentStatusResult.paymentTransactionId);
              setPaymentState('PAYMENT_PENDING');
              return;
            }

            // For INITIATED: fail closed if inconsistent
            setErrorMessage('تعذر متابعة الدفع بسبب عدم تطابق مبالغ الحجز المعتمدة.');
            setPaymentState('ERROR');
            return;
          }

          // INCONSISTENT_FAIL_CLOSED (missing/invalid amounts)
          if (paymentStatusResult.paymentStatus === 'PENDING') {
            setPaymentTransactionId(paymentStatusResult.paymentTransactionId);
            setPaymentState('PAYMENT_PENDING');
            return;
          }
          setErrorMessage('تعذر متابعة الدفع بسبب عدم تطابق مبالغ الحجز المعتمدة.');
          setPaymentState('ERROR');
          return;
        }

        const nextState = resolveScreen14ReconciliationState(
          canonicalBooking.status,
          paymentStatusResult.paymentStatus,
          Boolean(paymentStatusResult.paymentTransactionId),
          allowFreshAttempt,
        );
        if (nextState === 'NETWORK_RECONCILIATION_REQUIRED') {
          setErrorMessage('تم تسجيل محاولة دفع، لكن لم يتأكد الحجز بعد. تحقّق من الحالة مرة أخرى.');
        }
        setPaymentState(nextState);
      } catch (statusErr: any) {
        if (statusErr instanceof CustomerPaymentUnauthorizedError) {
          clearPrivatePaymentState();
          setPaymentState('UNAUTHORIZED');
          return;
        }
        if (statusErr instanceof CustomerPaymentForbiddenError) {
          clearPrivatePaymentState();
          setPaymentState('FORBIDDEN');
          return;
        }
        if (statusErr instanceof CustomerPaymentNotFoundError) {
          clearPrivatePaymentState();
          setPaymentState('NOT_FOUND');
          return;
        }
        // If payment status lookup fails on network/500, fail safe into reconciliation required
        setPaymentState('NETWORK_RECONCILIATION_REQUIRED');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'تعذر التحقق من حالة الحجز للدفع.');
      setPaymentState('ERROR');
    }
  }, [authToken, bookingId, clearPrivatePaymentState]);

  useEffect(() => {
    void revalidateAndReconcile();
  }, [revalidateAndReconcile]);

  // ---------------------------------------------------------------------------
  // Step 1: Initiate Prototype Payment (POST /pay)
  // ---------------------------------------------------------------------------
  const handleInitiatePayment = async () => {
    if (isActionLockedRef.current || getAllowedScreen14Action(paymentState) !== 'INITIATE_PAYMENT') return;
    isActionLockedRef.current = true;
    setPaymentState('INITIATING');
    setErrorMessage(null);

    try {
      const initResult: InitiatePaymentResult = await CustomerPaymentService.initiatePayment(
        bookingId,
        idempotencyKeyRef.current,
        authToken
      );

      if (initResult.mode !== 'PROTOTYPE' || initResult.requiresExternalCheckout) {
        setErrorMessage('الدفع الخارجي غير متاح في النسخة الحالية.');
        setPaymentState('ERROR');
        return;
      }

      // Amount Authority Check: compare initiated deposit with displayed deposit
      if (booking && initResult.depositAmountEgp !== booking.depositAmount) {
        // Fetch fresh detail to reconcile
        const freshRes = await fetch(getApiUrl(`/customer/bookings/${bookingId}`), {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const freshAccessState = resolveScreen14HttpErrorState(freshRes.status);
        if (freshAccessState) {
          clearPrivatePaymentState();
          setPaymentState(freshAccessState);
          return;
        }
        const freshJson = await freshRes.json().catch(() => ({}));
        if (freshRes.ok && freshJson.success && freshJson.data && freshJson.data.depositAmount === initResult.depositAmountEgp) {
          setPreviousDepositEgp(booking.depositAmount);
          setBooking(freshJson.data);
          setActiveDepositEgp(initResult.depositAmountEgp);
          setPaymentTransactionId(initResult.paymentTransactionId);
          setPaymentState('AMOUNT_CHANGED');
          return;
        } else {
          // Canonical values inconsistent: fail closed
          setErrorMessage('تعذر متابعة الدفع بسبب عدم تطابق مبالغ الحجز المعتمدة.');
          setPaymentState('ERROR');
          return;
        }
      }

      setPaymentTransactionId(initResult.paymentTransactionId);
      setActiveDepositEgp(initResult.depositAmountEgp);
      setPaymentState('PROTOTYPE_READY_TO_COMPLETE');
    } catch (err: any) {
      if (err instanceof CustomerPaymentUnauthorizedError) {
        clearPrivatePaymentState();
        setPaymentState('UNAUTHORIZED');
        return;
      }
      if (err instanceof CustomerPaymentForbiddenError) {
        clearPrivatePaymentState();
        setPaymentState('FORBIDDEN');
        return;
      }
      if (err instanceof CustomerPaymentNotFoundError) {
        clearPrivatePaymentState();
        setPaymentState('NOT_FOUND');
        return;
      }
      if (err?.code === 'BOOKING_ALREADY_CONFIRMED') {
        setPaymentState('ALREADY_CONFIRMED');
        return;
      }
      if (err?.code === 'BOOKING_NOT_APPROVED_FOR_PAYMENT') {
        setPaymentState('STATE_CHANGED');
        return;
      }

      // Uncertain network failure: do not blindly retry initiation
      setErrorMessage(err?.message || 'تعذر التأكد من نتيجة محاولة الدفع.');
      setPaymentState('NETWORK_RECONCILIATION_REQUIRED');
    } finally {
      isActionLockedRef.current = false;
    }
  };

  // ---------------------------------------------------------------------------
  // Step 2: Complete Prototype Payment (POST /pay/prototype-complete)
  // ---------------------------------------------------------------------------
  const handleCompletePrototypePayment = async () => {
    if (!paymentTransactionId || isActionLockedRef.current || getAllowedScreen14Action(paymentState) !== 'COMPLETE_PROTOTYPE') return;
    isActionLockedRef.current = true;
    statusCheckSourceRef.current = 'PROTOTYPE';
    setPaymentState('CHECKING_STATUS');
    setErrorMessage(null);

    try {
      const completionResult = await CustomerPaymentService.completePrototypePayment(
        bookingId,
        paymentTransactionId,
        authToken
      );

      if (completionResult.bookingStatus === 'CONFIRMED' && completionResult.paymentStatus === 'SUCCEEDED') {
        setPaymentState('SUCCESS');
      } else {
        setErrorMessage('تعذر تأكيد الدفع التجريبي من الخادم.');
        setPaymentState('ERROR');
      }
    } catch (err: any) {
      if (err instanceof CustomerPaymentUnauthorizedError) {
        clearPrivatePaymentState();
        setPaymentState('UNAUTHORIZED');
        return;
      }
      if (err instanceof CustomerPaymentForbiddenError) {
        clearPrivatePaymentState();
        setPaymentState('FORBIDDEN');
        return;
      }
      if (err instanceof CustomerPaymentNotFoundError) {
        clearPrivatePaymentState();
        setPaymentState('NOT_FOUND');
        return;
      }

      // Check payment status before reporting failure
      try {
        const verifyStatus = await CustomerPaymentService.getPaymentStatus(bookingId, authToken);
        if (verifyStatus.paymentStatus === 'SUCCEEDED' && verifyStatus.bookingStatus === 'CONFIRMED') {
          setPaymentState('SUCCESS');
          return;
        }
      } catch (verifyErr: any) {
        const verificationAccessState = resolveScreen14TypedErrorState(verifyErr?.name);
        if (verificationAccessState) {
          clearPrivatePaymentState();
          setPaymentState(verificationAccessState);
          return;
        }
        // Transport/server uncertainty remains a truthful failed attempt.
      }

      setErrorMessage(err?.message || 'تعذر إتمام الدفع التجريبي. يمكنك المحاولة مرة أخرى.');
      setPaymentState('FAILED');
    } finally {
      isActionLockedRef.current = false;
      statusCheckSourceRef.current = null;
    }
  };

  // ---------------------------------------------------------------------------
  // Check Payment Status (GET /payment-status only — PENDING / Reconcile)
  // ---------------------------------------------------------------------------
  const handleCheckPaymentStatus = async () => {
    if (isActionLockedRef.current) return;
    isActionLockedRef.current = true;
    statusCheckSourceRef.current = 'PENDING';
    setPaymentState('CHECKING_STATUS');
    setErrorMessage(null);

    try {
      const paymentStatusResult: PaymentStatusResult = await CustomerPaymentService.getPaymentStatus(
        bookingId,
        authToken
      );

      // 1. Still PENDING: remains in PAYMENT_PENDING
      if (paymentStatusResult.paymentStatus === 'PENDING') {
        if (paymentStatusResult.paymentTransactionId) {
          setPaymentTransactionId(paymentStatusResult.paymentTransactionId);
        }
        setPaymentState('PAYMENT_PENDING');
        return;
      }

      // 2. INITIATED: evaluate amount authority before allowing completion
      if (paymentStatusResult.paymentStatus === 'INITIATED' && paymentStatusResult.paymentTransactionId) {
        setPaymentTransactionId(paymentStatusResult.paymentTransactionId);
        const authority = evaluateResumedAmountAuthority(
          booking?.depositAmount,
          paymentStatusResult.amountEgp
        );
        if (authority.status === 'MATCHED') {
          setActiveDepositEgp(authority.amountEgp);
          setPaymentState('PROTOTYPE_READY_TO_COMPLETE');
          return;
        }
        // Mismatch or invalid on INITIATED: revalidate full booking
        await revalidateAndReconcile();
        return;
      }

      // 3. SUCCEEDED: if booking confirmed, success; else re-read booking
      if (paymentStatusResult.paymentStatus === 'SUCCEEDED') {
        if (paymentStatusResult.bookingStatus === 'CONFIRMED' || booking?.status === 'CONFIRMED') {
          setPaymentState('SUCCESS');
          return;
        }
        await revalidateAndReconcile();
        return;
      }

      // 4. FAILED / EXPIRED / Terminal statuses
      if (paymentStatusResult.paymentStatus === 'FAILED') {
        setPaymentState('FAILED');
        return;
      }

      if (paymentStatusResult.paymentStatus === 'EXPIRED') {
        setPaymentState('TRANSACTION_EXPIRED');
        return;
      }

      if (paymentStatusResult.bookingStatus === 'CONFIRMED') {
        setPaymentState('ALREADY_CONFIRMED');
        return;
      }

      if (paymentStatusResult.bookingStatus !== 'APPROVED_PENDING_PAYMENT') {
        setPaymentState('STATE_CHANGED');
        return;
      }

      setPaymentState(resolveScreen14ReconciliationState(
        paymentStatusResult.bookingStatus,
        paymentStatusResult.paymentStatus,
        Boolean(paymentStatusResult.paymentTransactionId),
        false,
      ));
    } catch (statusErr: any) {
      if (statusErr instanceof CustomerPaymentUnauthorizedError) {
        clearPrivatePaymentState();
        setPaymentState('UNAUTHORIZED');
        return;
      }
      if (statusErr instanceof CustomerPaymentForbiddenError) {
        clearPrivatePaymentState();
        setPaymentState('FORBIDDEN');
        return;
      }
      if (statusErr instanceof CustomerPaymentNotFoundError) {
        clearPrivatePaymentState();
        setPaymentState('NOT_FOUND');
        return;
      }
      setPaymentState('NETWORK_RECONCILIATION_REQUIRED');
    } finally {
      isActionLockedRef.current = false;
      statusCheckSourceRef.current = null;
    }
  };

  // ---------------------------------------------------------------------------
  // Safe Retry with Fresh Attempt Key
  // ---------------------------------------------------------------------------
  const handleRetryWithNewAttempt = () => {
    idempotencyKeyRef.current = generateAttemptKey();
    setPaymentTransactionId(null);
    freshAttemptRequestedRef.current = true;
    void revalidateAndReconcile();
  };

  // ---------------------------------------------------------------------------
  // 401 UNAUTHORIZED / SESSION EXPIRED
  // ---------------------------------------------------------------------------
  if (paymentState === 'UNAUTHORIZED') {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--konfrm-surface-canvas)] flex flex-col" dir="rtl">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="العودة"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-slate-800">دفع العربون</h1>
          <div className="w-11 h-11" />
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-amber-50 border border-amber-200/80 rounded-3xl p-6 text-center max-w-md w-full shadow-sm">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-amber-950 mb-2">انتهت جلسة تسجيل الدخول</h2>
            <p className="text-sm text-amber-900/80 mb-6 leading-relaxed">
              سجّل الدخول مرة أخرى للمتابعة.
            </p>
            <button
              onClick={() => onSessionExpired(bookingId)}
              className="w-full h-[52px] bg-[var(--konfrm-color-primary)] hover:bg-[var(--konfrm-color-primary-hover)] text-white font-bold rounded-2xl shadow-sm transition-colors text-sm"
            >
              تسجيل الدخول مجددًا
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 403 FORBIDDEN
  // ---------------------------------------------------------------------------
  if (paymentState === 'FORBIDDEN') {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--konfrm-surface-canvas)] flex flex-col" dir="rtl">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="العودة"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-slate-800">دفع العربون</h1>
          <div className="w-11 h-11" />
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center max-w-md w-full shadow-sm">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-slate-900 mb-2">لا يمكنك الوصول إلى هذا الحجز</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              هذا الحجز غير مرتبط بالحساب الحالي.
            </p>
            <button
              onClick={onBack}
              className="w-full h-[52px] bg-[var(--konfrm-text-primary)] hover:bg-[var(--konfrm-color-primary-hover)] text-white font-bold rounded-2xl shadow-sm transition-colors text-sm"
            >
              العودة إلى حجوزاتي
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 404 NOT FOUND
  // ---------------------------------------------------------------------------
  if (paymentState === 'NOT_FOUND') {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--konfrm-surface-canvas)] flex flex-col" dir="rtl">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="العودة"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-slate-800">دفع العربون</h1>
          <div className="w-11 h-11" />
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center max-w-md w-full shadow-sm">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-slate-900 mb-2">الحجز غير متاح</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              تعذر العثور على هذا الحجز.
            </p>
            <button
              onClick={onBack}
              className="w-full h-[52px] bg-[var(--konfrm-text-primary)] hover:bg-[var(--konfrm-color-primary-hover)] text-white font-bold rounded-2xl shadow-sm transition-colors text-sm"
            >
              العودة إلى حجوزاتي
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // TRUTHFUL INITIAL / REVALIDATION ERROR
  // ---------------------------------------------------------------------------
  if (paymentState === 'ERROR') {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--konfrm-surface-canvas)] flex flex-col" dir="rtl">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="العودة"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-slate-800">دفع العربون</h1>
          <div className="w-11 h-11" />
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-rose-200 rounded-3xl p-6 text-center max-w-md w-full shadow-sm">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-slate-900 mb-2">تعذر تحميل بيانات الدفع</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              {errorMessage || 'تعذر التحقق من حالة الحجز. حاول مرة أخرى.'}
            </p>
            <button
              onClick={() => void revalidateAndReconcile()}
              className="w-full h-[52px] bg-[var(--konfrm-color-primary)] hover:bg-[var(--konfrm-color-primary-hover)] text-white font-bold rounded-2xl shadow-sm transition-colors text-sm"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // ALREADY CONFIRMED
  // ---------------------------------------------------------------------------
  if (paymentState === 'ALREADY_CONFIRMED') {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--konfrm-surface-canvas)] flex flex-col" dir="rtl">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="العودة"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-slate-800">دفع العربون</h1>
          <div className="w-11 h-11" />
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-emerald-200 rounded-3xl p-6 text-center max-w-md w-full shadow-sm">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-slate-900 mb-2">تم تأكيد الحجز بالفعل</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              لا يوجد دفع عربون آخر مطلوب لهذا الحجز.
            </p>
            <button
              onClick={onBack}
              className="w-full h-[52px] bg-[var(--konfrm-color-primary)] hover:bg-[var(--konfrm-color-primary-hover)] text-white font-bold rounded-2xl shadow-sm transition-colors text-sm"
            >
              العودة إلى تفاصيل الحجز
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STATE CHANGED (e.g. pending owner review or cancelled)
  // ---------------------------------------------------------------------------
  if (paymentState === 'STATE_CHANGED') {
    const isPendingApproval = booking?.status === 'PENDING_OWNER_APPROVAL';
    return (
      <div className="fixed inset-0 z-50 bg-[var(--konfrm-surface-canvas)] flex flex-col" dir="rtl">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="العودة"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-slate-800">دفع العربون</h1>
          <div className="w-11 h-11" />
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center max-w-md w-full shadow-sm">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-slate-900 mb-2">
              {isPendingApproval ? 'الدفع غير متاح الآن' : 'الدفع غير متاح لهذا الحجز'}
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              {isPendingApproval
                ? 'طلب الحجز ما زال قيد مراجعة المالك.'
                : 'حالة الحجز الحالية لا تسمح بدفع العربون.'}
            </p>
            <button
              onClick={onBack}
              className="w-full h-[52px] bg-[var(--konfrm-text-primary)] hover:bg-[var(--konfrm-color-primary-hover)] text-white font-bold rounded-2xl shadow-sm transition-colors text-sm"
            >
              العودة إلى تفاصيل الحجز
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // SUCCESS STATE (Restrained CheckCircle2, no confetti)
  // ---------------------------------------------------------------------------
  if (paymentState === 'SUCCESS') {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--konfrm-surface-canvas)] flex flex-col" dir="rtl">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 h-16 flex items-center justify-between">
          <div className="w-11 h-11" />
          <h1 className="text-base font-bold text-slate-800">دفع العربون</h1>
          <div className="w-11 h-11" />
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-emerald-200 rounded-3xl p-6 text-center max-w-md w-full shadow-sm">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50/50">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">تم دفع العربون</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              تم تأكيد حجزك بنجاح.
            </p>
            <button
              onClick={() => onPaymentSuccess(bookingId)}
              className="w-full h-[52px] bg-[var(--konfrm-color-primary)] hover:bg-[var(--konfrm-color-primary-hover)] text-white font-bold rounded-2xl shadow-sm transition-colors text-sm flex items-center justify-center gap-2"
            >
              <span>العودة إلى تفاصيل الحجز</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // SKELETON / INITIAL LOADING
  // ---------------------------------------------------------------------------
  if (paymentState === 'INITIAL_LOADING' || !booking) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--konfrm-surface-canvas)] flex flex-col" dir="rtl">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="العودة"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-slate-800">دفع العربون</h1>
          <div className="w-11 h-11" />
        </header>

        <div className="p-4 space-y-4 max-w-lg mx-auto w-full animate-pulse flex-1">
          <div className="h-28 bg-slate-200 rounded-3xl" />
          <div className="h-40 bg-slate-200 rounded-3xl" />
          <div className="h-32 bg-slate-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // CANONICAL PAYMENT SURFACE (READY / INITIATING / PROTOTYPE_READY_TO_COMPLETE)
  // ---------------------------------------------------------------------------
  const isInitiating = paymentState === 'INITIATING';
  const isCheckingOrCompleting = paymentState === 'CHECKING_STATUS';
  const isReadyToComplete =
    paymentState === 'PROTOTYPE_READY_TO_COMPLETE' ||
    (paymentState === 'CHECKING_STATUS' && statusCheckSourceRef.current === 'PROTOTYPE');
  const isPending =
    paymentState === 'PAYMENT_PENDING' ||
    (paymentState === 'CHECKING_STATUS' && statusCheckSourceRef.current === 'PENDING');
  const isAmountChanged = paymentState === 'AMOUNT_CHANGED';
  const isReconciliationRequired =
    paymentState === 'NETWORK_RECONCILIATION_REQUIRED' ||
    (paymentState === 'CHECKING_STATUS' && statusCheckSourceRef.current === 'NETWORK');
  const isExpired = paymentState === 'TRANSACTION_EXPIRED';
  const isFailed = paymentState === 'FAILED';

  return (
    <div className="fixed inset-0 z-50 bg-[var(--konfrm-surface-canvas)] flex flex-col overflow-y-auto" dir="rtl">
      {/* Sticky App Bar */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 h-16 flex items-center justify-between shrink-0 shadow-xs">
        <button
          onClick={onBack}
          disabled={isInitiating || isCheckingOrCompleting}
          className="w-11 h-11 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
          aria-label="العودة إلى تفاصيل الحجز"
        >
          <ArrowRight className="w-6 h-6" />
        </button>

        <h1 className="text-base font-bold text-slate-900">دفع العربون</h1>

        <div className="w-11 h-11" />
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-16 px-4 pt-4 max-w-lg mx-auto w-full space-y-4">
        {/* Booking Recognition Card */}
        <section className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs">
          <div className="text-sm text-slate-500 font-medium mb-1">
            {booking.bookingNumber} • {booking.nights} ليالٍ
          </div>
          <h2 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
            {booking.property.title}
          </h2>
        </section>

        {/* Payment Hero */}
        <section className="bg-white border border-blue-200 rounded-3xl p-5 shadow-xs text-center">
          <span className="text-sm font-bold text-slate-500 block mb-1">
            العربون المطلوب الآن
          </span>
          <div className="text-3xl font-black text-slate-900 font-mono tracking-tight my-2" dir="ltr">
            {activeDepositEgp.toLocaleString()} ج.م
          </div>
          <p className="text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
            بعد نجاح دفع العربون يصبح الحجز مؤكدًا.
          </p>
        </section>

        {/* Financial Summary */}
        <section className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-400 border-b border-slate-100 pb-2">
            تفاصيل المبلغ
          </h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center text-slate-600">
              <span>إجمالي الإقامة</span>
              <span className="font-bold text-slate-900 font-mono" dir="ltr">
                {booking.totalStay.toLocaleString()} ج.م
              </span>
            </div>

            <div className="flex justify-between items-center text-[var(--konfrm-color-primary)] font-bold p-2 bg-blue-50 rounded-xl">
              <span>العربون المطلوب الآن</span>
              <span className="font-bold font-mono" dir="ltr">
                {activeDepositEgp.toLocaleString()} ج.م
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span>المتبقي بعد دفع العربون</span>
              <span className="font-bold text-slate-900 font-mono" dir="ltr">
                {booking.remainingAmount.toLocaleString()} ج.م
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-400 pt-1 leading-relaxed">
            المبلغ المتبقي لا يتم دفعه في هذه الخطوة.
          </p>
        </section>

        {/* Prototype Notice */}
        <section className="bg-amber-50/80 border border-amber-200 rounded-3xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1 text-amber-900 text-sm font-bold">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>وضع تجريبي</span>
          </div>
          <p className="text-sm text-amber-800 leading-relaxed">
            لن يتم خصم أي أموال حقيقية في هذه النسخة.
          </p>
        </section>

        {/* Amount Changed Notice */}
        {isAmountChanged && previousDepositEgp !== null && (
          <section className="bg-blue-50 border border-blue-200 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-blue-600" />
              <span>تم تحديث مبلغ العربون</span>
            </div>
            <p className="text-sm text-blue-800 leading-relaxed">
              تغيّر مبلغ العربون قبل متابعة الدفع. راجع المبلغ الجديد قبل المتابعة.
            </p>
            <div className="text-sm space-y-1 bg-white p-3 rounded-2xl border border-blue-100">
              <div className="flex justify-between text-slate-500">
                <span>المبلغ السابق</span>
                <span className="font-mono" dir="ltr">{previousDepositEgp.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between font-bold text-[var(--konfrm-color-primary)]">
                <span>العربون المطلوب الآن</span>
                <span className="font-mono" dir="ltr">{activeDepositEgp.toLocaleString()} ج.م</span>
              </div>
            </div>
            <button
              onClick={() => setPaymentState('PROTOTYPE_READY_TO_COMPLETE')}
              className="w-full h-12 bg-[var(--konfrm-color-primary)] text-white font-bold rounded-2xl text-sm shadow-sm hover:bg-[var(--konfrm-color-primary-hover)] transition-colors"
            >
              موافق على المبلغ الجديد والمتابعة
            </button>
          </section>
        )}

        {/* Payment Pending State */}
        {isPending && (
          <section className="bg-slate-50 border border-slate-200/90 rounded-3xl p-5 shadow-xs text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">عملية الدفع قيد التحقق</h3>
            <p className="text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
              لم يتم تأكيد الدفع بعد.
              <br />
              سنُظهر النتيجة بعد التحقق من حالته.
            </p>
            <div className="pt-2">
              <button
                onClick={() => void handleCheckPaymentStatus()}
                disabled={isCheckingOrCompleting}
                className="w-full h-[52px] bg-[var(--konfrm-color-primary)] hover:bg-[var(--konfrm-color-primary-hover)] active:scale-[0.99] text-white font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60"
              >
                {isCheckingOrCompleting && statusCheckSourceRef.current === 'PENDING' ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>جارٍ التحقق من حالة الدفع…</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    <span>التحقق من حالة الدفع</span>
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* Transaction Expired State */}
        {isExpired && (
          <section className="bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-xs text-center space-y-3">
            <Clock className="w-8 h-8 text-slate-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">انتهت محاولة الدفع الحالية</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              لم يكتمل دفع العربون في هذه المحاولة.
            </p>
            <button
              onClick={handleRetryWithNewAttempt}
              className="w-full h-12 bg-[var(--konfrm-color-primary)] text-white font-bold rounded-2xl text-sm shadow-sm hover:bg-[var(--konfrm-color-primary-hover)] transition-colors"
            >
              بدء محاولة دفع جديدة
            </button>
          </section>
        )}

        {/* Payment Failed State */}
        {isFailed && (
          <section className="bg-rose-50 border border-rose-200 rounded-3xl p-5 shadow-xs text-center space-y-3">
            <XCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <h3 className="text-sm font-bold text-rose-950">تعذر إتمام الدفع</h3>
            <p className="text-sm text-rose-900/80 leading-relaxed">
              {errorMessage || 'لم يتم تأكيد دفع العربون. يمكنك المحاولة مرة أخرى بعد التحقق من حالة الحجز.'}
            </p>
            <button
              onClick={handleRetryWithNewAttempt}
              className="w-full h-12 bg-[var(--konfrm-color-primary)] text-white font-bold rounded-2xl text-sm shadow-sm hover:bg-[var(--konfrm-color-primary-hover)] transition-colors"
            >
              إعادة المحاولة
            </button>
          </section>
        )}

        {/* Uncertain Network Result State */}
        {isReconciliationRequired && (
          <section className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-xs text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
            <h3 className="text-sm font-bold text-amber-950">تعذر التأكد من نتيجة محاولة الدفع</h3>
            <p className="text-sm text-amber-900/80 leading-relaxed">
              سنراجع حالة العملية الحالية قبل بدء محاولة جديدة.
            </p>
            <button
              onClick={() => {
                statusCheckSourceRef.current = 'NETWORK';
                void revalidateAndReconcile();
              }}
              disabled={isCheckingOrCompleting}
              className="w-full h-12 bg-amber-600 text-white font-bold rounded-2xl text-sm shadow-sm hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isCheckingOrCompleting && statusCheckSourceRef.current === 'NETWORK' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جارٍ التحقق من حالة الدفع…</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>التحقق من حالة الدفع</span>
                </>
              )}
            </button>
          </section>
        )}

        {/* Step 1: Initial Prototype Initiation CTA */}
        {paymentState === 'READY' && (
          <div className="pt-2">
            <button
              onClick={() => void handleInitiatePayment()}
              disabled={isInitiating}
              className="w-full h-[52px] bg-[var(--konfrm-color-primary)] hover:bg-[var(--konfrm-color-primary-hover)] active:scale-[0.99] text-white font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60"
            >
              {isInitiating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>جارٍ بدء عملية الدفع…</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>متابعة الدفع التجريبي</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 2: Prototype Ready to Complete CTA */}
        {isReadyToComplete && (
          <div className="pt-2 space-y-3">
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 text-center text-sm text-blue-900 leading-relaxed">
              تم تجهيز محاولة الدفع التجريبية. لا توجد أموال حقيقية سيتم خصمها.
            </div>

            <button
              onClick={() => void handleCompletePrototypePayment()}
              disabled={isCheckingOrCompleting}
              className="w-full h-[52px] bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60"
            >
              {isCheckingOrCompleting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>جارٍ تأكيد الدفع التجريبي…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>تأكيد الدفع التجريبي</span>
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

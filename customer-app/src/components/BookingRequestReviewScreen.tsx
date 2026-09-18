/**
 * SOLA Customer App — Screen 07: Booking Request Review
 * Dedicated full-screen review component implementing C4_FINAL_DESIGN_SPEC.
 *
 * Core Guarantees:
 * 1. Public Review before authentication (Flow A).
 * 2. Auth interception only on protected request submission ("إرسال طلب الحجز للمالك").
 * 3. Return from Auth WITHOUT automatic submission (enters REVALIDATING state).
 * 4. Authoritative quote revalidation via server quoteFingerprint.
 * 5. Explicit Customer acceptance if price changed (QUOTE_CHANGED 409).
 * 6. Availability-conflict recovery (DATE_OVERLAP 409).
 * 7. Safe retry without duplicate booking creation (idempotency via requestId as booking UUID PK).
 * 8. Zero client-side financial calculation (strictly server-authoritative).
 * 9. Zero internal commission or owner net split shown.
 * 10. No trust badge or ratings.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowRight,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { CustomerPropertyItem } from './PropertyCard';
import { formatArabicStayRange } from '../utils/searchIntent';
import { getApiUrl } from '../utils/api';

export interface ServerPriceQuote {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  pricePerNight: number;
  totalStay: number;
  depositAmount: number;
  remainingAmount: number;
  currency: string;
  quoteFingerprint?: string;
}

export type BookingReviewUiState =
  | 'REVIEW'
  | 'REVALIDATING'
  | 'PRICE_CHANGED'
  | 'AVAILABILITY_CONFLICT'
  | 'SUBMITTING'
  | 'NETWORK_ERROR';

export interface BookingRequestReviewScreenProps {
  property: CustomerPropertyItem;
  canonicalTitle?: string;
  canonicalLocation?: string;
  canonicalImage?: string | null;
  checkIn: string;
  checkOut: string;
  guests: number;
  initialQuote: ServerPriceQuote;
  authToken?: string | null;
  onBack: () => void;
  onEditDetails: () => void;
  onRequireAuth: (context: {
    propertyId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    quoteSnapshot: ServerPriceQuote;
    quoteFingerprint: string;
    requestId: string;
  }) => void;
  onSubmitSuccess: (bookingData: any) => void;
  onAvailabilityConflict: () => void;
  restoredFromAuth?: boolean;
  existingRequestId?: string | null;
}

export function generateClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const BookingRequestReviewScreen: React.FC<BookingRequestReviewScreenProps> = ({
  property,
  canonicalTitle,
  canonicalLocation,
  canonicalImage,
  checkIn,
  checkOut,
  guests,
  initialQuote,
  authToken,
  onBack,
  onEditDetails,
  onRequireAuth,
  onSubmitSuccess,
  onAvailabilityConflict,
  restoredFromAuth = false,
  existingRequestId,
}) => {
  // Idempotency: generate or preserve requestId for the intent session
  const [requestId] = useState<string>(() => existingRequestId || generateClientRequestId());

  // Quote State
  const [currentQuote, setCurrentQuote] = useState<ServerPriceQuote>(initialQuote);
  const [previousQuote, setPreviousQuote] = useState<ServerPriceQuote | null>(null);

  // UI State Machine
  const [uiState, setUiState] = useState<BookingReviewUiState>(() =>
    restoredFromAuth ? 'REVALIDATING' : 'REVIEW'
  );
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);

  const propertyImage =
    canonicalImage !== undefined
      ? canonicalImage
      : property.images && property.images.length > 0
      ? property.images[0]
      : null;

  const resolvedTitle = canonicalTitle || property.title;
  const resolvedLocation =
    canonicalLocation ||
    property.address?.trim() ||
    property.resortName?.trim() ||
    property.region?.trim() ||
    null;

  // Revalidate Quote against server
  const revalidateQuote = useCallback(async (tokenToUse?: string | null): Promise<void> => {
    setUiState('REVALIDATING');
    setSubmitErrorMessage(null);

    const token = tokenToUse !== undefined ? tokenToUse : authToken || localStorage.getItem('sola_customer_access_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(getApiUrl('/customer/bookings/calculate'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          propertyId: property.id,
          checkIn,
          checkOut,
          guests,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success || !json.data) {
        // If availability or dates became invalid
        if (res.status === 409 || json?.error?.code === 'DATE_OVERLAP') {
          setUiState('AVAILABILITY_CONFLICT');
          return;
        }
        setSubmitErrorMessage(json?.error?.message || 'تعذر تحديث تفاصيل الطلب حالياً.');
        setUiState('NETWORK_ERROR');
        return;
      }

      const freshQuote = json.data as ServerPriceQuote;

      // Compare fresh quote against previous quote fingerprint
      const prevFingerprint = currentQuote.quoteFingerprint;
      const isPriceSame =
        freshQuote.totalStay === currentQuote.totalStay &&
        freshQuote.depositAmount === currentQuote.depositAmount &&
        freshQuote.pricePerNight === currentQuote.pricePerNight;

      if (prevFingerprint && freshQuote.quoteFingerprint && freshQuote.quoteFingerprint !== prevFingerprint) {
        setPreviousQuote(currentQuote);
        setCurrentQuote(freshQuote);
        setUiState('PRICE_CHANGED');
      } else if (!isPriceSame) {
        setPreviousQuote(currentQuote);
        setCurrentQuote(freshQuote);
        setUiState('PRICE_CHANGED');
      } else {
        setCurrentQuote(freshQuote);
        // NO AUTO-SUBMIT: return to review state, user must explicitly tap CTA
        setUiState('REVIEW');
      }
    } catch {
      setSubmitErrorMessage('تعذر الاتصال بالخادم لتحديث الطلب.');
      setUiState('NETWORK_ERROR');
    }
  }, [authToken, property.id, checkIn, checkOut, guests, currentQuote]);

  // If restored from auth, trigger revalidation once on mount
  const hasRevalidatedOnMount = useRef(false);
  useEffect(() => {
    if (restoredFromAuth && !hasRevalidatedOnMount.current) {
      hasRevalidatedOnMount.current = true;
      void revalidateQuote();
    }
  }, [restoredFromAuth, revalidateQuote]);

  // Handle Protected Submit
  const handleSubmitBooking = async () => {
    // Flow A: Public Review intercept: guest is not authenticated
    const effectiveToken = authToken || localStorage.getItem('sola_customer_access_token');
    if (!effectiveToken) {
      onRequireAuth({
        propertyId: property.id,
        checkIn,
        checkOut,
        guests,
        quoteSnapshot: currentQuote,
        quoteFingerprint: currentQuote.quoteFingerprint || '',
        requestId,
      });
      return;
    }

    setUiState('SUBMITTING');
    setSubmitErrorMessage(null);

    try {
      const res = await fetch(getApiUrl('/customer/bookings'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify({
          propertyId: property.id,
          checkIn,
          checkOut,
          guests,
          reviewedQuoteFingerprint: currentQuote.quoteFingerprint,
          requestId,
        }),
      });

      const json = await res.json();

      if (res.ok && json.success && json.data) {
        // Success or Idempotent Replay
        onSubmitSuccess(json.data);
        return;
      }

      // 409 QUOTE_CHANGED: Server pricing shifted
      if (res.status === 409 && json?.error?.code === 'QUOTE_CHANGED') {
        const freshQuote = json.data?.currentQuote;
        if (freshQuote) {
          setPreviousQuote(currentQuote);
          setCurrentQuote(freshQuote);
          setUiState('PRICE_CHANGED');
        } else {
          void revalidateQuote(effectiveToken);
        }
        return;
      }

      // 409 DATE_OVERLAP: Dates no longer available
      if (res.status === 409 && json?.error?.code === 'DATE_OVERLAP') {
        setUiState('AVAILABILITY_CONFLICT');
        return;
      }

      // Generic / Network / 500 error: retryable with SAME requestId
      setSubmitErrorMessage(json?.error?.message || 'تعذر إرسال طلب الحجز. يمكنك إعادة المحاولة بأمان.');
      setUiState('NETWORK_ERROR');
    } catch {
      // Network failure: preserve same requestId
      setSubmitErrorMessage('تعذر الاتصال بالخادم. يمكنك إعادة المحاولة بأمان.');
      setUiState('NETWORK_ERROR');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden dir-rtl select-none"
      dir="rtl"
      data-testid="booking-request-review-screen"
    >
      {/* ── TOP HEADER (56px, Single Back Button, Centered Title, NO CLOSE X) ── */}
      <header className="h-14 shrink-0 bg-white border-b border-slate-100 flex items-center justify-between px-3 pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          onClick={onBack}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center text-slate-700 hover:text-slate-900 active:scale-95 transition-all rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/40"
          aria-label="الرجوع لتفاصيل الوحدة"
          data-testid="review-back-btn"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        <h1 className="text-sm md:text-base font-bold text-slate-900 text-center flex-1 pr-1">
          مراجعة طلب الحجز
        </h1>

        {/* Balance spacer for optical centering */}
        <div className="w-12 h-12 shrink-0 pointer-events-none" aria-hidden="true" />
      </header>

      {/* ── SCROLLABLE CONTENT BODY ── */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-40 max-w-[430px] mx-auto w-full">
        {/* Intro Block */}
        <div className="space-y-1">
          <h2 className="text-lg font-black text-slate-900">
            راجع طلبك قبل الإرسال
          </h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            تأكد من الوحدة والتواريخ والسعر قبل ما تبعت الطلب للمالك.
          </p>
        </div>

        {/* Contextual State Banner: REVALIDATING */}
        {uiState === 'REVALIDATING' && (
          <div
            className="p-3 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 font-medium animate-pulse"
            data-testid="revalidating-banner"
          >
            <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
            <span>جاري تحديث تفاصيل الطلب والتحقق من الأسعار...</span>
          </div>
        )}

        {/* Contextual State Banner: PRICE_CHANGED */}
        {uiState === 'PRICE_CHANGED' && (
          <div
            className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl space-y-2 text-xs text-amber-900 shadow-xs"
            data-testid="price-changed-banner"
          >
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>تم تحديث السعر</span>
            </div>
            <p className="text-amber-900/90 text-[11px] leading-relaxed">
              حدث تغيير في أسعار الإقامة للفترة المختارة. يرجى مراجعة السعر الجديد قبل المتابعة.
            </p>
            {previousQuote && (
              <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">السعر السابق:</span>
                  <span className="text-slate-500 line-through font-bold">
                    {previousQuote.totalStay.toLocaleString()} ج.م
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-amber-800 block text-[10px] font-bold">السعر الحالي:</span>
                  <span className="text-amber-900 font-black text-sm">
                    {currentQuote.totalStay.toLocaleString()} ج.م
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contextual State Banner: AVAILABILITY_CONFLICT */}
        {uiState === 'AVAILABILITY_CONFLICT' && (
          <div
            className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl space-y-2 text-xs text-rose-900 shadow-xs"
            data-testid="availability-conflict-banner"
          >
            <div className="flex items-center gap-1.5 font-bold text-rose-950">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>التواريخ المختارة لم تعد متاحة</span>
            </div>
            <p className="text-rose-900/90 text-[11px] leading-relaxed">
              قام مستخدم آخر بحجز هذه التواريخ أو لم تعد متاحة من قبل المالك. يرجى اختيار تواريخ جديدة للمتابعة.
            </p>
          </div>
        )}

        {/* Contextual State Banner: NETWORK_ERROR */}
        {uiState === 'NETWORK_ERROR' && submitErrorMessage && (
          <div
            className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-1.5 text-xs text-rose-900"
            data-testid="network-error-banner"
          >
            <div className="flex items-center gap-1.5 font-bold text-rose-950">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>تعذر إرسال الطلب</span>
            </div>
            <p className="text-rose-800 text-[11px] leading-relaxed">
              {submitErrorMessage}
            </p>
          </div>
        )}

        {/* ── PROPERTY MEDIA ROW (88x88, radius 12-16, Title <=3 lines, Location <=2 lines, NO BADGES) ── */}
        <div className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80">
          {propertyImage ? (
            <img
              src={propertyImage}
              alt={resolvedTitle}
              className="w-[88px] h-[88px] object-cover rounded-2xl shrink-0 bg-slate-200"
            />
          ) : (
            <div className="w-[88px] h-[88px] rounded-2xl shrink-0 bg-slate-200 flex items-center justify-center text-[11px] text-slate-400 font-bold text-center p-2">
              لا توجد صورة
            </div>
          )}
          <div className="overflow-hidden flex-1 space-y-1">
            <h3 className="font-bold text-slate-900 text-xs md:text-sm line-clamp-3 leading-snug">
              {resolvedTitle}
            </h3>
            {resolvedLocation && (
              <p className="text-[11px] text-slate-500 font-medium line-clamp-2">
                {resolvedLocation}
              </p>
            )}
          </div>
        </div>

        {/* ── STAY SUMMARY (تفاصيل الإقامة) ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs md:text-sm font-bold text-slate-900">
              تفاصيل الإقامة
            </h3>
            <button
              type="button"
              onClick={onEditDetails}
              className="min-h-[44px] text-xs font-bold text-[#0059FF] hover:text-blue-700 active:scale-95 transition-all flex items-center px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/40 rounded-lg"
              data-testid="edit-details-btn"
            >
              تعديل التواريخ والضيوف
            </button>
          </div>

          <div className="grid grid-cols-2 max-[370px]:grid-cols-1 gap-2 text-xs font-bold">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#0059FF]" />
                <span>تواريخ الإقامة ({currentQuote.nights} {currentQuote.nights === 1 ? 'ليلة' : 'ليالي'})</span>
              </span>
              <div className="text-slate-900 font-bold text-[11px] text-right">
                {formatArabicStayRange(checkIn, checkOut) || `${checkIn} ← ${checkOut}`}
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#0059FF]" />
                <span>عدد الضيوف</span>
              </span>
              <div className="text-slate-900 font-bold text-[11px]">
                {guests} {guests === 1 ? 'ضيف واحد' : guests === 2 ? 'ضيفان' : `${guests} ضيوف`}
              </div>
            </div>
          </div>
        </div>

        {/* ── FINANCIAL SUMMARY (ملخص السعر - Strictly Bound to Server Quote) ── */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2.5 text-xs shadow-xs">
          <h3 className="font-bold text-slate-900 text-xs mb-1">
            ملخص السعر
          </h3>

          <div className="flex justify-between items-center text-slate-600">
            <span className="font-medium">سعر الليلة الواحدة:</span>
            <span className="font-bold text-slate-900">
              {currentQuote.pricePerNight.toLocaleString()} ج.م
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-600">
            <span className="font-medium">
              إجمالي الإقامة الكاملة ({currentQuote.nights} ليالي):
            </span>
            <span className="font-bold text-slate-900">
              {currentQuote.totalStay.toLocaleString()} ج.م
            </span>
          </div>

          <hr className="border-slate-100 my-1" />

          {/* Deposit highlighted in soft blue */}
          <div className="flex justify-between items-center bg-blue-50/80 p-3 rounded-xl border border-blue-100">
            <div>
              <div className="flex items-center gap-1 text-[#0059FF] font-bold text-xs">
                <span>العربون بعد موافقة المالك:</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                (ليلة واحدة فقط)
              </span>
            </div>
            <span className="text-base font-bold text-[#0059FF] dir-ltr">
              {currentQuote.depositAmount.toLocaleString()} ج.م
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-500 text-[11px] pt-0.5 px-0.5">
            <span className="font-medium">المبلغ المتبقي:</span>
            <span className="font-bold text-slate-700 dir-ltr">
              {currentQuote.remainingAmount.toLocaleString()} ج.م
            </span>
          </div>

          {/* Transparent Trust Microcopy */}
          <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-500 font-medium">
            <p className="flex items-center gap-1 text-slate-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0059FF] shrink-0" />
              <span>لن تدفع أي مبلغ عند إرسال الطلب.</span>
            </p>
            <p className="leading-relaxed">
              إذا وافق المالك، ستكون الخطوة التالية دفع العربون لتأكيد الحجز.
            </p>
          </div>
        </div>

        {/* ── PROCESS STEPS (بعد إرسال الطلب) ── */}
        <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-2 text-xs text-slate-800 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
            <Clock className="w-4 h-4 text-[#0059FF] shrink-0" />
            <span>بعد إرسال الطلب</span>
          </div>
          <ol className="space-y-1.5 text-[11px] text-slate-600 list-decimal list-inside pr-1 font-medium">
            <li>مراجعة المالك للطلب خلال 24 ساعة</li>
            <li>إشعار فوري عند قبول الطلب أو الرد عليه</li>
            <li>دفع العربون لتأكيد الحجز بعد موافقة المالك</li>
          </ol>
        </div>
      </main>

      {/* ── FIXED STICKY ACTION FOOTER (Safe-area Aware, Full-width 52-56px CTA) ── */}
      <footer className="sticky bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-20 shadow-lg">
        <div className="max-w-[430px] mx-auto w-full">
          {uiState === 'REVALIDATING' ? (
            <button
              type="button"
              disabled
              className="w-full h-14 min-h-[52px] bg-slate-200 text-slate-400 font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 cursor-not-allowed"
              data-testid="revalidating-btn"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري تحديث تفاصيل الطلب...</span>
            </button>
          ) : uiState === 'AVAILABILITY_CONFLICT' ? (
            <button
              type="button"
              onClick={onAvailabilityConflict}
              className="w-full h-14 min-h-[52px] bg-[#0059FF] hover:bg-blue-600 active:scale-98 text-white font-bold text-sm rounded-2xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
              data-testid="availability-conflict-btn"
            >
              <RefreshCw className="w-4 h-4" />
              <span>اختيار تواريخ جديدة</span>
            </button>
          ) : uiState === 'PRICE_CHANGED' ? (
            <button
              type="button"
              onClick={handleSubmitBooking}
              className="w-full h-14 min-h-[52px] bg-[#0059FF] hover:bg-blue-600 active:scale-98 text-white font-bold text-sm rounded-2xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
              data-testid="confirm-new-price-btn"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>موافق على السعر الجديد وإرسال الطلب</span>
            </button>
          ) : uiState === 'NETWORK_ERROR' ? (
            <button
              type="button"
              onClick={handleSubmitBooking}
              className="w-full h-14 min-h-[52px] bg-[#0059FF] hover:bg-blue-600 active:scale-98 text-white font-bold text-sm rounded-2xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
              data-testid="retry-submit-btn"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة المحاولة</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmitBooking}
              disabled={uiState === 'SUBMITTING'}
              className="w-full h-14 min-h-[52px] bg-[#0059FF] hover:bg-blue-600 active:scale-98 text-white font-bold text-sm rounded-2xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none"
              data-testid="confirm-submit-btn"
            >
              {uiState === 'SUBMITTING' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إرسال الطلب...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>إرسال طلب الحجز للمالك</span>
                </>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

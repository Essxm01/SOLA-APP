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
import {
  ServerPriceQuote,
  BookingReviewUiState,
  generateClientRequestId,
} from '../utils/customerC4ReviewState';

export { type ServerPriceQuote, type BookingReviewUiState, generateClientRequestId };

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
  onContextCaptured?: () => void;
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
  onContextCaptured,
}) => {
  // Idempotency: preserve existing requestId across auth or generate a new client UUID
  const [requestId] = useState<string>(() => existingRequestId?.trim() || generateClientRequestId());

  // Quote State
  const [currentQuote, setCurrentQuote] = useState<ServerPriceQuote>(initialQuote);
  const [previousQuote, setPreviousQuote] = useState<ServerPriceQuote | null>(null);

  // UI State Machine: starts in REVALIDATING if returning from auth, otherwise REVIEW
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

  // Revalidate Quote against server authority
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
        if (res.status === 409 || json?.error?.code === 'DATE_OVERLAP') {
          setUiState('AVAILABILITY_CONFLICT');
          return;
        }
        setSubmitErrorMessage('تفاصيل طلبك ما زالت محفوظة. تحقق من الاتصال وحاول مرة أخرى.');
        setUiState('NETWORK_ERROR');
        return;
      }

      const freshQuote = json.data as ServerPriceQuote;
      const prevFingerprint = currentQuote.quoteFingerprint;
      const isPriceSame =
        freshQuote.totalStay === currentQuote.totalStay &&
        freshQuote.depositAmount === currentQuote.depositAmount &&
        freshQuote.pricePerNight === currentQuote.pricePerNight;

      const hasFingerprintShift =
        Boolean(prevFingerprint && freshQuote.quoteFingerprint && freshQuote.quoteFingerprint !== prevFingerprint);

      if (hasFingerprintShift || !isPriceSame) {
        setPreviousQuote(currentQuote);
        setCurrentQuote(freshQuote);
        setUiState('PRICE_CHANGED');
      } else {
        setCurrentQuote(freshQuote);
        // NO AUTO-SUBMIT: return to review state, user must explicitly tap CTA
        setUiState('REVIEW');
      }
    } catch {
      setSubmitErrorMessage('تفاصيل طلبك ما زالت محفوظة. تحقق من الاتصال وحاول مرة أخرى.');
      setUiState('NETWORK_ERROR');
    }
  }, [authToken, property.id, checkIn, checkOut, guests, currentQuote]);

  // Auth return lifecycle: notify parent that context is captured and start revalidation
  const hasCapturedRef = useRef(false);
  useEffect(() => {
    if (restoredFromAuth && !hasCapturedRef.current) {
      hasCapturedRef.current = true;
      onContextCaptured?.();
      void revalidateQuote();
    }
  }, [restoredFromAuth, onContextCaptured, revalidateQuote]);

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

      // 1. Success / Idempotent Replay
      if ((res.status === 200 || res.status === 201) && json?.success && json?.data) {
        onSubmitSuccess(json.data);
        return;
      }

      // 2. 401 / 403 Session Expiry: Re-enter Auth flow preserving full review context
      if (res.status === 401 || res.status === 403) {
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

      // 3. 409 QUOTE_CHANGED: Server pricing shifted
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

      // 4. 409 DATE_OVERLAP: Dates no longer available
      if (res.status === 409 && json?.error?.code === 'DATE_OVERLAP') {
        setUiState('AVAILABILITY_CONFLICT');
        return;
      }

      // 5. 409 IDEMPOTENCY_CONFLICT: Safe non-retryable error, return to Screen 06
      if (res.status === 409 && json?.error?.code === 'IDEMPOTENCY_CONFLICT') {
        setUiState('IDEMPOTENCY_ERROR');
        return;
      }

      // 6. Generic Network / Server Error: retryable with SAME requestId
      setSubmitErrorMessage(json?.error?.message || 'تفاصيل طلبك ما زالت محفوظة. تحقق من الاتصال وحاول مرة أخرى.');
      setUiState('NETWORK_ERROR');
    } catch {
      // Network failure: preserve same requestId
      setSubmitErrorMessage('تفاصيل طلبك ما زالت محفوظة. تحقق من الاتصال وحاول مرة أخرى.');
      setUiState('NETWORK_ERROR');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden dir-rtl select-none"
      dir="rtl"
      data-testid="booking-request-review-screen"
    >
      {/* ── TOP HEADER (56px, Single Back Button, Centered 18/700 Title, NO CLOSE X) ── */}
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

        <h1 className="text-lg font-bold text-slate-900 text-center flex-1 pr-1">
          مراجعة طلب الحجز
        </h1>

        {/* Balance spacer for optical centering */}
        <div className="w-12 h-12 shrink-0 pointer-events-none" aria-hidden="true" />
      </header>

      {/* ── SCROLLABLE CONTENT BODY ── */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-40 max-w-[430px] mx-auto w-full">
        {/* Intro Block (Intro: 20–22 / 800, Body: 14 / 500) */}
        <div className="space-y-1">
          <h2 className="text-xl sm:text-[22px] font-extrabold text-slate-900">
            راجع طلبك قبل الإرسال
          </h2>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            تأكد من الوحدة والتواريخ والسعر قبل ما تبعت الطلب للمالك.
          </p>
        </div>

        {/* Contextual State Banner: REVALIDATING (Calm informational Blue, NOT Amber) */}
        {uiState === 'REVALIDATING' && (
          <div
            className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-blue-900"
            data-testid="revalidating-banner"
          >
            <Loader2 className="w-4 h-4 text-[#0059FF] animate-spin shrink-0" />
            <span>نتأكد من التوفر والسعر قبل الإرسال.</span>
          </div>
        )}

        {/* Contextual State Banner: PRICE_CHANGED (Calm Soft Blue, NOT Amber) */}
        {uiState === 'PRICE_CHANGED' && (
          <div
            className="p-4 bg-blue-50/90 border border-blue-200 rounded-2xl space-y-2.5 text-blue-950 shadow-xs"
            data-testid="price-changed-banner"
          >
            <div className="flex items-center gap-2 font-bold text-blue-950 text-base">
              <AlertCircle className="w-5 h-5 text-[#0059FF] shrink-0" />
              <span>تم تحديث السعر</span>
            </div>
            <p className="text-xs text-blue-900/90 font-medium leading-relaxed">
              السعر الحالي مختلف عن السعر الذي راجعته آخر مرة. راجع المبلغ الجديد قبل إرسال الطلب.
            </p>
            {previousQuote && (
              <div className="p-3 bg-white/90 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-xs font-bold mb-0.5">السعر السابق</span>
                  <span className="text-slate-400 line-through font-bold text-sm font-sans">
                    {previousQuote.totalStay.toLocaleString()} ج.م
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-blue-900 block text-xs font-bold mb-0.5">السعر الحالي</span>
                  <span className="text-blue-900 font-extrabold text-base font-sans">
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
            className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-rose-950 shadow-xs"
            data-testid="availability-conflict-banner"
          >
            <div className="flex items-center gap-2 font-bold text-rose-950 text-base">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>التواريخ المختارة لم تعد متاحة</span>
            </div>
            <p className="text-xs text-rose-900/90 font-medium leading-relaxed">
              اختار تواريخ جديدة علشان نحدّث السعر ونكمل طلبك.
            </p>
          </div>
        )}

        {/* Contextual State Banner: IDEMPOTENCY_ERROR (Safe non-retryable) */}
        {uiState === 'IDEMPOTENCY_ERROR' && (
          <div
            className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-amber-950 shadow-xs"
            data-testid="idempotency-error-banner"
          >
            <div className="flex items-center gap-2 font-bold text-amber-950 text-base">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>تعذر متابعة هذا الطلب</span>
            </div>
            <p className="text-xs text-amber-900/90 font-medium leading-relaxed">
              تعذر التحقق من هذا الطلب بأمان. ارجع لتفاصيل الإقامة وحاول مرة أخرى.
            </p>
          </div>
        )}

        {/* Contextual State Banner: NETWORK_ERROR */}
        {uiState === 'NETWORK_ERROR' && (
          <div
            className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-rose-950"
            data-testid="network-error-banner"
          >
            <div className="flex items-center gap-2 font-bold text-rose-950 text-base">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>تعذر إرسال الطلب</span>
            </div>
            <p className="text-xs text-rose-900 font-medium leading-relaxed">
              {submitErrorMessage || 'تفاصيل طلبك ما زالت محفوظة. تحقق من الاتصال وحاول مرة أخرى.'}
            </p>
          </div>
        )}

        {/* ── PROPERTY MEDIA ROW (Clean media row, Title 16/700 <=3 lines, Location >=12px <=2 lines, NO BADGES) ── */}
        <div className="flex items-center gap-3.5 p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100">
          {propertyImage ? (
            <img
              src={propertyImage}
              alt={resolvedTitle}
              className="w-[88px] h-[88px] object-cover rounded-2xl shrink-0 bg-slate-200"
            />
          ) : (
            <div className="w-[88px] h-[88px] rounded-2xl shrink-0 bg-slate-200 flex items-center justify-center text-xs text-slate-400 font-bold text-center p-2">
              لا توجد صورة
            </div>
          )}
          <div className="overflow-hidden flex-1 space-y-1">
            <h3 className="text-base font-bold text-slate-900 line-clamp-3 leading-snug">
              {resolvedTitle}
            </h3>
            {resolvedLocation && (
              <p className="text-xs text-slate-500 font-medium line-clamp-2">
                {resolvedLocation}
              </p>
            )}
          </div>
        </div>

        {/* ── STAY SUMMARY (تفاصيل الإقامة: ONE Coherent Inset Group, NOT Card Soup) ── */}
        <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
            <h3 className="text-lg font-bold text-slate-900">
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

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-1 border-b border-slate-200/40">
              <span className="text-[13px] font-bold text-slate-600 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#0059FF]" />
                <span>تواريخ الإقامة ({currentQuote.nights} {currentQuote.nights === 1 ? 'ليلة' : 'ليالي'})</span>
              </span>
              <span className="font-semibold text-slate-900 text-sm">
                {formatArabicStayRange(checkIn, checkOut) || `${checkIn} ← ${checkOut}`}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-[13px] font-bold text-slate-600 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#0059FF]" />
                <span>عدد الضيوف</span>
              </span>
              <span className="font-semibold text-slate-900 text-sm">
                {guests} {guests === 1 ? 'ضيف واحد' : guests === 2 ? 'ضيفان' : `${guests} ضيوف`}
              </span>
            </div>
          </div>
        </div>

        {/* ── FINANCIAL SUMMARY (ملخص السعر: Open section with quiet dividers, Total is Strongest Anchor) ── */}
        <div className="p-4 bg-white rounded-2xl border border-slate-100 space-y-3.5 shadow-xs">
          <h3 className="text-lg font-bold text-slate-900">
            ملخص السعر
          </h3>

          {/* Strongest Financial Anchor: إجمالي الإقامة (20–22 / 800) */}
          <div className="flex justify-between items-baseline pt-1 pb-2 border-b border-slate-100">
            <span className="text-sm font-bold text-slate-700">
              إجمالي الإقامة ({currentQuote.nights} {currentQuote.nights === 1 ? 'ليلة' : 'ليالي'}):
            </span>
            <span className="text-xl sm:text-[22px] font-extrabold text-slate-900 font-sans whitespace-nowrap">
              {currentQuote.totalStay.toLocaleString()} ج.م
            </span>
          </div>

          {/* Secondary breakdown: سعر الليلة الواحدة */}
          <div className="flex justify-between items-center text-sm text-slate-600">
            <span className="text-[13px] font-medium text-slate-600">سعر الليلة الواحدة:</span>
            <span className="text-sm font-bold text-slate-800 font-sans whitespace-nowrap">
              {currentQuote.pricePerNight.toLocaleString()} ج.م
            </span>
          </div>

          {/* Deposit highlighted in soft blue */}
          <div className="flex justify-between items-center bg-blue-50/80 p-3.5 rounded-xl border border-blue-100">
            <div>
              <div className="flex items-center gap-1 text-[#0059FF] font-bold text-[13px]">
                <span>العربون بعد موافقة المالك:</span>
              </div>
              <span className="text-xs text-slate-500 font-semibold block mt-0.5">
                (ليلة واحدة فقط)
              </span>
            </div>
            <span className="text-base font-bold text-[#0059FF] font-sans dir-ltr whitespace-nowrap">
              {currentQuote.depositAmount.toLocaleString()} ج.م
            </span>
          </div>

          {/* Remaining balance */}
          <div className="flex justify-between items-center text-slate-600 text-sm px-0.5">
            <span className="text-[13px] font-medium text-slate-600">المبلغ المتبقي:</span>
            <span className="text-sm font-bold text-slate-800 font-sans dir-ltr whitespace-nowrap">
              {currentQuote.remainingAmount.toLocaleString()} ج.م
            </span>
          </div>

          {/* Transparent Trust Microcopy */}
          <div className="pt-2.5 border-t border-slate-100 space-y-1 text-xs text-slate-500 font-medium">
            <p className="flex items-center gap-1.5 text-slate-700 font-semibold text-[13px]">
              <CheckCircle2 className="w-4 h-4 text-[#0059FF] shrink-0" />
              <span>لن تدفع أي مبلغ عند إرسال الطلب.</span>
            </p>
            <p className="text-xs text-slate-500 leading-relaxed pr-5">
              إذا وافق المالك، ستكون الخطوة التالية دفع العربون لتأكيد الحجز.
            </p>
          </div>
        </div>

        {/* ── PROCESS STEPS (بعد إرسال الطلب: ONE Calm Soft-Blue Grouping, EXACT LAB Process) ── */}
        <div className="p-4 bg-blue-50/60 border border-blue-100/80 rounded-2xl space-y-2.5">
          <div className="flex items-center gap-1.5 font-bold text-blue-950 text-[13px]">
            <Clock className="w-4 h-4 text-[#0059FF] shrink-0" />
            <span>بعد إرسال الطلب</span>
          </div>
          <ol className="space-y-2 text-xs text-slate-700 list-decimal list-inside pr-1 font-medium leading-relaxed">
            <li>المالك يراجع الطلب</li>
            <li>إذا وافق، يصبح دفع العربون هو الخطوة التالية</li>
            <li>بعد نجاح دفع العربون يصبح الحجز مؤكدًا</li>
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
              <span>نتأكد من التوفر والسعر...</span>
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
          ) : uiState === 'IDEMPOTENCY_ERROR' ? (
            <button
              type="button"
              onClick={onBack}
              className="w-full h-14 min-h-[52px] bg-[#0059FF] hover:bg-blue-600 active:scale-98 text-white font-bold text-sm rounded-2xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
              data-testid="idempotency-error-btn"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة لتفاصيل الإقامة</span>
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

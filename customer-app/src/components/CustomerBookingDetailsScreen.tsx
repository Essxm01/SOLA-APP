/**
 * Sola Vacation Rentals — Customer Screen 13 Booking Details / Stay Hub
 * Location: customer-app/src/components/CustomerBookingDetailsScreen.tsx
 *
 * Master Source of Truth:
 * - LAB_SCREEN13_BOOKING_DETAILS_STAY_HUB_DESIGN
 * - Dedicated full-screen mobile surface replacing legacy BookingDetailModal.
 * - Strict status authority via customerBookingPresentation.ts.
 * - Canonical detail authority via GET /api/v1/customer/bookings/:id.
 * - CHAT_UI_DEFERRED_TO_SCREEN_22 (no inline chat in Screen 13 V1).
 * - No cancellation UI until approved Product cancellation/refund policy is established.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  RefreshCw,
  Clock,
  CreditCard,
  CheckCircle2,
  XCircle,
  CircleSlash2,
  Hourglass,
  CheckCheck,
  HelpCircle,
  Calendar,
  Users,
  Moon,
  AlertTriangle,
  Info,
  MapPin,
  Building,
  ImageOff,
} from 'lucide-react';
import { getApiUrl } from '../utils/api';
import {
  getScreen13StatusPresentation,
  type BookingPresentationIconName,
} from '../utils/customerBookingPresentation';
import { getScreen13FinancePresentation } from '../utils/customerScreen13Finance';
import type { CustomerBookingDetailDto, Screen13LoadState } from '../types/customerBookingDetail';

export interface CustomerBookingDetailsScreenProps {
  bookingId: string;
  authToken: string;
  onBack: () => void;
  onNavigateToPayment: (bookingId: string) => void;
  onReconcileBooking?: (updated: CustomerBookingDetailDto) => void;
  onUnauthorizedDetected?: () => void;
  onReauthenticate?: () => void;
}

function renderStatusIcon(iconName: BookingPresentationIconName, className = 'w-5 h-5') {
  switch (iconName) {
    case 'Clock':
      return <Clock className={className} />;
    case 'CreditCard':
      return <CreditCard className={className} />;
    case 'CheckCircle2':
      return <CheckCircle2 className={className} />;
    case 'XCircle':
      return <XCircle className={className} />;
    case 'CircleSlash2':
      return <CircleSlash2 className={className} />;
    case 'Hourglass':
      return <Hourglass className={className} />;
    case 'CheckCheck':
      return <CheckCheck className={className} />;
    case 'HelpCircle':
    default:
      return <HelpCircle className={className} />;
  }
}

function formatArabicDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export const CustomerBookingDetailsScreen: React.FC<CustomerBookingDetailsScreenProps> = ({
  bookingId,
  authToken,
  onBack,
  onNavigateToPayment,
  onReconcileBooking,
  onUnauthorizedDetected,
  onReauthenticate,
}) => {
  const [booking, setBooking] = useState<CustomerBookingDetailDto | null>(null);
  const [loadState, setLoadState] = useState<Screen13LoadState>('INITIAL_LOADING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDetail = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh && booking) {
        setLoadState('REFRESHING');
      } else {
        setLoadState('INITIAL_LOADING');
      }
      setErrorMessage(null);

      try {
        const res = await fetch(getApiUrl(`/customer/bookings/${bookingId}`), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (res.status === 401) {
          // Fail closed: clear private booking state immediately
          setBooking(null);
          setLoadState('UNAUTHORIZED');
          onUnauthorizedDetected?.();
          return;
        }

        if (res.status === 403) {
          setBooking(null);
          setLoadState('FORBIDDEN');
          return;
        }

        if (res.status === 404) {
          setBooking(null);
          setLoadState('NOT_FOUND');
          return;
        }

        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error?.message || 'FETCH_BOOKING_DETAIL_FAILED');
        }

        const data: CustomerBookingDetailDto = json.data;
        setBooking(data);
        setLoadState('LOADED');
        onReconcileBooking?.(data);
      } catch (err: any) {
        if (booking && isManualRefresh) {
          // Retain prior canonical data on transient refresh failure
          setLoadState('STALE_ERROR');
        } else {
          setErrorMessage(err?.message || 'تعذر تحميل تفاصيل الحجز. حاول مرة أخرى.');
          setLoadState('ERROR');
        }
      }
    },
    [bookingId, authToken, booking, onReconcileBooking, onUnauthorizedDetected]
  );

  useEffect(() => {
    void fetchDetail(false);
  }, [bookingId, authToken]);

  // ---------------------------------------------------------------------------
  // SKELETON LOADING
  // ---------------------------------------------------------------------------
  if (loadState === 'INITIAL_LOADING') {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--konfrm-surface-canvas)] flex flex-col overflow-y-auto" dir="rtl">
        {/* Sticky App Bar Skeleton */}
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="العودة إلى حجوزاتي"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <span className="text-base font-bold text-slate-800">تفاصيل الحجز</span>
          <div className="w-11 h-11" />
        </header>

        <div className="p-4 space-y-4 max-w-lg mx-auto w-full animate-pulse">
          <div className="h-32 bg-slate-200 rounded-3xl" />
          <div className="h-44 bg-slate-200 rounded-3xl" />
          <div className="h-36 bg-slate-200 rounded-3xl" />
          <div className="h-28 bg-slate-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 401 UNAUTHORIZED / SESSION EXPIRED
  // ---------------------------------------------------------------------------
  if (loadState === 'UNAUTHORIZED') {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--konfrm-surface-canvas)] flex flex-col" dir="rtl">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="العودة إلى حجوزاتي"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <span className="text-base font-bold text-slate-800">تفاصيل الحجز</span>
          <div className="w-11 h-11" />
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-amber-50 border border-amber-200/80 rounded-3xl p-6 text-center max-w-md w-full shadow-sm">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-black text-amber-950 mb-2">انتهت جلسة تسجيل الدخول</h1>
            <p className="text-sm text-amber-900/80 mb-6 leading-relaxed">
              سجّل الدخول مرة أخرى لعرض تفاصيل هذا الحجز.
            </p>
            <button
              onClick={() => onReauthenticate?.()}
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
  if (loadState === 'FORBIDDEN') {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--konfrm-surface-canvas)] flex flex-col" dir="rtl">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="العودة إلى حجوزاتي"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <span className="text-base font-bold text-slate-800">تفاصيل الحجز</span>
          <div className="w-11 h-11" />
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center max-w-md w-full shadow-sm">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-black text-slate-900 mb-2">لا يمكنك عرض هذا الحجز</h1>
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
  if (loadState === 'NOT_FOUND') {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--konfrm-surface-canvas)] flex flex-col" dir="rtl">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="العودة إلى حجوزاتي"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <span className="text-base font-bold text-slate-800">تفاصيل الحجز</span>
          <div className="w-11 h-11" />
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center max-w-md w-full shadow-sm">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-black text-slate-900 mb-2">الحجز غير متاح</h1>
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
  // ERROR
  // ---------------------------------------------------------------------------
  if (loadState === 'ERROR' || !booking) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--konfrm-surface-canvas)] flex flex-col" dir="rtl">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="العودة إلى حجوزاتي"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <span className="text-base font-bold text-slate-800">تفاصيل الحجز</span>
          <div className="w-11 h-11" />
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center max-w-md w-full shadow-sm">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-black text-slate-900 mb-2">تعذر تحميل تفاصيل الحجز</h1>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              {errorMessage || 'حدث خطأ أثناء تحميل تفاصيل الحجز. حاول مرة أخرى.'}
            </p>
            <button
              onClick={() => void fetchDetail(false)}
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
  // CANONICAL LOADED SURFACE
  // ---------------------------------------------------------------------------
  const presentation = getScreen13StatusPresentation(booking.status);
  const finance = getScreen13FinancePresentation(booking.status);
  const isApproved = booking.status === 'APPROVED_PENDING_PAYMENT';
  const isConfirmed = booking.status === 'CONFIRMED';
  const isCancelled = booking.status.startsWith('CANCELLED');

  const propertyImage = booking.property.images?.[0];
  const propertyTitle = booking.property.title || 'الوحدة';
  const propertyLocation = booking.property.locationName || booking.property.address || booking.property.region || 'الموقع غير متاح';

  return (
    <div className="fixed inset-0 z-50 bg-[var(--konfrm-surface-canvas)] flex flex-col overflow-y-auto" dir="rtl">
      {/* 1. Sticky App Bar */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 h-16 flex items-center justify-between shrink-0 shadow-xs">
        <button
          onClick={onBack}
          className="w-11 h-11 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="العودة إلى حجوزاتي"
        >
          <ArrowRight className="w-6 h-6" />
        </button>

        <span className="text-base font-bold text-slate-900">تفاصيل الحجز</span>

        <button
          onClick={() => void fetchDetail(true)}
          disabled={loadState === 'REFRESHING'}
          className="w-11 h-11 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
          aria-label="تحديث حالة الحجز"
        >
          <RefreshCw className={`w-5 h-5 ${loadState === 'REFRESHING' ? 'animate-spin text-[var(--konfrm-color-primary)]' : ''}`} />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-16 px-4 pt-4 max-w-lg mx-auto w-full space-y-4">
        {/* Stale Data Notice Banner */}
        {loadState === 'STALE_ERROR' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3.5 flex items-start gap-2.5 text-sm font-semibold leading-relaxed">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>تعذر تحديث حالة الحجز. آخر بيانات تم تحميلها ما زالت ظاهرة.</span>
          </div>
        )}

        {/* 2. Status-first Hero */}
        <section className={`p-5 rounded-3xl border shadow-xs ${
          isApproved
            ? 'bg-blue-50/70 border-blue-200'
            : isConfirmed
            ? 'bg-emerald-50/70 border-emerald-200'
            : 'bg-white border-slate-200/80'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
              isApproved
                ? 'bg-[var(--konfrm-color-primary)] text-white'
                : isConfirmed
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}>
              {renderStatusIcon(presentation.iconName, 'w-3.5 h-3.5')}
              <span>{presentation.customerLabel}</span>
            </span>
          </div>

          <h1 className="text-xl font-black text-slate-900 mb-2 leading-tight">
            {presentation.customerLabel}
          </h1>

          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {presentation.supportingCopy}
          </p>

          {/* Screen 13 CTA: دفع العربون (only when APPROVED_PENDING_PAYMENT) */}
          {presentation.hasPaymentCta && (
            <div className="mt-5 pt-4 border-t border-blue-200/60">
              <button
                onClick={() => onNavigateToPayment(booking.id)}
                className="w-full h-[52px] bg-[var(--konfrm-color-primary)] hover:bg-[var(--konfrm-color-primary-hover)] active:scale-[0.99] text-white font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm"
              >
                <CreditCard className="w-5 h-5" />
                <span>دفع العربون</span>
              </button>
            </div>
          )}
        </section>

        {/* 3. Property Recognition */}
        <section className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs">
          <div className="flex gap-3.5 items-start">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden shrink-0 relative">
              {propertyImage ? (
                <img
                  src={propertyImage}
                  alt={propertyTitle}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <ImageOff className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug mb-1">
                {propertyTitle}
              </h2>
              <div className="flex items-center gap-1 text-slate-500 text-sm truncate mb-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{propertyLocation}</span>
              </div>
              {booking.property.unitType && (
                <div className="flex items-center gap-1 text-slate-500 text-sm">
                  <Building className="w-3.5 h-3.5 shrink-0" />
                  <span>{booking.property.unitType}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 4. Stay Details */}
        <section className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
            تفاصيل الإقامة
          </h2>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <div className="text-slate-400 font-medium mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>الوصول</span>
              </div>
              <div className="font-bold text-slate-900 leading-tight">
                {formatArabicDate(booking.checkIn)}
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <div className="text-slate-400 font-medium mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>المغادرة</span>
              </div>
              <div className="font-bold text-slate-900 leading-tight">
                {formatArabicDate(booking.checkOut)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-around py-2 border-t border-slate-100 text-sm">
            <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
              <Moon className="w-4 h-4 text-slate-400" />
              <span>{booking.nights} ليالٍ</span>
            </div>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
              <Users className="w-4 h-4 text-slate-400" />
              <span>{booking.guestsCount} ضيوف</span>
            </div>
          </div>
        </section>

        {/* 5. State-Aware Financial Summary */}
        <section className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
            تفاصيل الدفع
          </h2>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between items-center text-slate-600">
              <span>إجمالي الإقامة</span>
              <span className="font-bold text-slate-900 font-mono" dir="ltr">
                {booking.totalStay.toLocaleString()} ج.م
              </span>
            </div>

            {finance.showDeposit && (
              <div className={`flex justify-between items-center p-2.5 rounded-xl ${
                isApproved
                  ? 'bg-blue-50 text-[var(--konfrm-color-primary)] font-bold border border-blue-100'
                  : isConfirmed
                  ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-100'
                  : 'text-slate-600'
              }`}>
                <span>{finance.depositLabel}</span>
                <span className="font-bold font-mono" dir="ltr">
                  {booking.depositAmount.toLocaleString()} ج.م
                </span>
              </div>
            )}

            {finance.showRemaining && (
              <div className="flex justify-between items-center text-slate-600">
                <span>{finance.remainingLabel}</span>
                <span className="font-bold text-slate-900 font-mono" dir="ltr">
                  {booking.remainingAmount.toLocaleString()} ج.م
                </span>
              </div>
            )}

            {finance.showPendingNotice && (
              <div className="pt-2 text-center text-sm text-slate-500 font-medium">
                لا يوجد مبلغ مطلوب الآن.
              </div>
            )}
          </div>
        </section>

        {/* 6. Booking Identity */}
        <section className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs flex items-center justify-between text-sm">
          <span className="text-slate-500 font-medium">
            {isConfirmed ? 'رقم الحجز' : 'رقم الطلب'}
          </span>
          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-xl text-sm" dir="ltr">
            {booking.bookingNumber}
          </span>
        </section>

        {/* 7. Special Requests (if present) */}
        {booking.specialRequests && booking.specialRequests.trim() && (
          <section className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-2">
            <h2 className="text-sm font-black text-slate-900">طلبات خاصة</h2>
            <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-2xl leading-relaxed whitespace-pre-wrap">
              {booking.specialRequests}
            </p>
            <p className="text-sm text-slate-400">
              كما أرسلتها مع طلب الحجز.
            </p>
          </section>
        )}

        {/* 8. Cancellation Context (if cancelled) */}
        {isCancelled && (
          <section className="bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-xs space-y-2 text-sm">
            <h2 className="text-sm font-black text-slate-800">بيانات الإلغاء</h2>
            {booking.cancelledAt && (
              <div className="flex justify-between items-center text-slate-600">
                <span>تاريخ الإلغاء</span>
                <span className="font-medium">{formatArabicDate(booking.cancelledAt)}</span>
              </div>
            )}
            {booking.cancellationReason && (
              <div className="text-slate-600 pt-1">
                <span className="font-medium text-slate-700 block mb-1">سبب الإلغاء:</span>
                <p className="bg-white p-2.5 rounded-xl border border-slate-200/60 text-slate-700">
                  {booking.cancellationReason}
                </p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

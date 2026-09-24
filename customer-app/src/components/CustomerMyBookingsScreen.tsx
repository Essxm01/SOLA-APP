/**
 * KONFRM Customer App — Screen 12 My Bookings Component
 * Location: customer-app/src/components/CustomerMyBookingsScreen.tsx
 *
 * Master Authority: Customer Phase 5 Master UX (C5 Booking Management)
 *
 * Purpose:
 * - SCAN, ORIENT, UNDERSTAND STATUS, OPEN BOOKING
 * - Conditional sections: "يحتاج إجراء منك", "الحالية", "السابقة", "حجوزات أخرى"
 * - High-contrast readable typography: >=13-14px status and decision copy (no tiny text)
 * - Single large clickable cards routing to Screen 13 by booking.id
 * - Truthful empty, guest, session-expired, and stale-error states
 * - Safe handling of recent Screen 11 submissions without fake card fabrication
 */

import React from 'react';
import {
  Clock,
  CreditCard,
  CheckCircle2,
  XCircle,
  CircleSlash2,
  Hourglass,
  CheckCheck,
  HelpCircle,
  RefreshCw,
  CalendarDays,
  MapPin,
  ImageOff,
  AlertCircle,
  UserRound,
  ChevronLeft,
} from 'lucide-react';
import {
  BOOKING_SECTION_TITLES,
  BookingPresentationIconName,
  CustomerBookingRecord,
  getCustomerBookingPresentation,
  groupCustomerBookings,
} from '../utils/customerBookingPresentation';
import { formatArabicStayRange } from '../utils/searchIntent';
import { formatStayDurationAndGuests } from '../utils/customerScreen11BookingRequestSent';

export interface CustomerMyBookingsScreenProps {
  authState: 'AUTHENTICATED' | 'GUEST' | 'SESSION_EXPIRED';
  loadState:
    | 'INITIAL_LOADING'
    | 'LOADED'
    | 'EMPTY'
    | 'ERROR'
    | 'REFRESHING'
    | 'STALE_ERROR';
  bookings: CustomerBookingRecord[];
  error?: string | null;
  recentSubmission?: { id: string; bookingNumber?: string } | null;
  onOpenBooking: (bookingId: string) => void;
  onRetry: () => void;
  onRefresh: () => void;
  onExplore: () => void;
  onLogin: () => void;
}

function renderStatusIcon(iconName: BookingPresentationIconName, className = 'w-4 h-4') {
  switch (iconName) {
    case 'Clock':
      return <Clock className={className} aria-hidden="true" />;
    case 'CreditCard':
      return <CreditCard className={className} aria-hidden="true" />;
    case 'CheckCircle2':
      return <CheckCircle2 className={className} aria-hidden="true" />;
    case 'XCircle':
      return <XCircle className={className} aria-hidden="true" />;
    case 'CircleSlash2':
      return <CircleSlash2 className={className} aria-hidden="true" />;
    case 'Hourglass':
      return <Hourglass className={className} aria-hidden="true" />;
    case 'CheckCheck':
      return <CheckCheck className={className} aria-hidden="true" />;
    case 'HelpCircle':
    default:
      return <HelpCircle className={className} aria-hidden="true" />;
  }
}

export const CustomerMyBookingsScreen: React.FC<CustomerMyBookingsScreenProps> = ({
  authState,
  loadState,
  bookings,
  error,
  recentSubmission,
  onOpenBooking,
  onRetry,
  onRefresh,
  onExplore,
  onLogin,
}) => {
  const isRefreshing = loadState === 'REFRESHING';
  const isStaleError = loadState === 'STALE_ERROR';
  const isInitialLoading = loadState === 'INITIAL_LOADING';

  // Group bookings conditionally preserving canonical server order
  const grouped = React.useMemo(() => groupCustomerBookings(bookings), [bookings]);

  // Check if a recent submission is pending representation in the returned list
  const recentSubmissionMissingFromList = Boolean(
    recentSubmission && !bookings.some((b) => b.id === recentSubmission.id)
  );

  return (
    <div
      dir="rtl"
      className="w-full max-w-[430px] mx-auto px-4 pt-3 pb-28 text-slate-900"
    >
      {/* ------------------------------------------------------------------- */}
      {/* 1. Header: Title, Support Copy, and Refresh Action                   */}
      {/* ------------------------------------------------------------------- */}
      <header className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-black text-slate-950 tracking-tight leading-tight">
            حجوزاتي
          </h1>
          <p className="text-sm font-semibold text-slate-600 mt-1">
            تابع طلباتك وإقاماتك من مكان واحد.
          </p>
        </div>

        {authState === 'AUTHENTICATED' && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="تحديث الحجوزات"
            className="min-w-[44px] min-h-[44px] p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center justify-center text-slate-700 shadow-xs cursor-pointer disabled:opacity-60"
          >
            <RefreshCw
              className={`w-5 h-5 text-slate-700 ${isRefreshing ? 'animate-spin text-[#0059FF]' : ''}`}
              aria-hidden="true"
            />
          </button>
        )}
      </header>

      {/* ------------------------------------------------------------------- */}
      {/* 2. Stale Error Banner (Refresh failed, previous data retained)       */}
      {/* ------------------------------------------------------------------- */}
      {isStaleError && (
        <aside
          role="status"
          aria-live="polite"
          className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-2 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-700" aria-hidden="true" />
            <p className="text-sm font-bold leading-snug">
              تعذر تحديث الحجوزات. آخر بيانات متاحة ما زالت ظاهرة.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="text-sm font-black text-[#0059FF] underline hover:no-underline shrink-0 px-2 py-1 cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </aside>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 3. Recent Submission Informational Notice (Post-create list sync)    */}
      {/* ------------------------------------------------------------------- */}
      {recentSubmissionMissingFromList && authState === 'AUTHENTICATED' && (
        <aside
          role="status"
          aria-live="polite"
          className="mb-4 p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-950 flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-start gap-2.5">
            <Clock className="w-5 h-5 shrink-0 text-[#0059FF] mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-extrabold leading-snug text-slate-900">
                تم إرسال طلبك بنجاح، لكن لم يظهر في القائمة بعد. حدّث حجوزاتك للمحاولة مرة أخرى.
              </p>
              {recentSubmission?.bookingNumber && (
                <p className="text-xs font-bold text-slate-600 mt-0.5">
                  رقم الطلب: <span dir="ltr" className="font-mono">{recentSubmission.bookingNumber}</span>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="min-h-[40px] px-3.5 rounded-xl bg-[#0059FF] text-white text-xs font-black shadow-xs shrink-0 cursor-pointer"
          >
            تحديث
          </button>
        </aside>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 4. Guest State: Signed out                                           */}
      {/* ------------------------------------------------------------------- */}
      {authState === 'GUEST' && (
        <section
          aria-labelledby="guest-bookings-heading"
          className="bg-white rounded-3xl border border-slate-200 p-6 text-center shadow-xs my-6 space-y-4"
        >
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-[#0059FF] border border-blue-100">
            <UserRound className="w-7 h-7" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2 id="guest-bookings-heading" className="text-base font-black text-slate-950">
              سجّل الدخول لعرض حجوزاتك
            </h2>
            <p className="text-sm font-semibold text-slate-600 max-w-xs mx-auto">
              ستجد هنا طلبات الحجز والإقامات المرتبطة بحسابك.
            </p>
          </div>
          <button
            type="button"
            onClick={onLogin}
            className="min-h-[48px] w-full max-w-xs mx-auto px-6 rounded-2xl bg-[#0059FF] text-white text-sm font-black shadow-sm hover:bg-[#004cdb] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>تسجيل الدخول</span>
          </button>
        </section>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 5. Session Expired State: 401/403                                    */}
      {/* ------------------------------------------------------------------- */}
      {authState === 'SESSION_EXPIRED' && (
        <section
          aria-labelledby="session-expired-heading"
          className="bg-white rounded-3xl border border-amber-200 p-6 text-center shadow-xs my-6 space-y-4"
        >
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-700 border border-amber-200">
            <AlertCircle className="w-7 h-7" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2 id="session-expired-heading" className="text-base font-black text-slate-950">
              انتهت جلسة تسجيل الدخول
            </h2>
            <p className="text-sm font-semibold text-slate-600 max-w-xs mx-auto">
              سجّل الدخول مرة أخرى لعرض حجوزاتك.
            </p>
          </div>
          <button
            type="button"
            onClick={onLogin}
            className="min-h-[48px] w-full max-w-xs mx-auto px-6 rounded-2xl bg-[#0059FF] text-white text-sm font-black shadow-sm hover:bg-[#004cdb] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>تسجيل الدخول مجددًا</span>
          </button>
        </section>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 6. Initial Loading State: Skeletons                                  */}
      {/* ------------------------------------------------------------------- */}
      {authState === 'AUTHENTICATED' && isInitialLoading && (
        <div aria-hidden="true" className="space-y-3">
          {[1, 2, 3].map((key) => (
            <div
              key={key}
              className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs animate-pulse space-y-3"
            >
              <div className="flex gap-3">
                <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-xl bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="flex justify-between items-center gap-2">
                    <div className="h-4 bg-slate-200 rounded-md w-3/5" />
                    <div className="h-5 bg-slate-200 rounded-full w-20" />
                  </div>
                  <div className="h-3.5 bg-slate-200 rounded-md w-2/5" />
                  <div className="h-3.5 bg-slate-200 rounded-md w-4/5" />
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                <div className="h-4 bg-slate-200 rounded w-28" />
                <div className="h-4 bg-slate-200 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 7. Error State (No cached data)                                      */}
      {/* ------------------------------------------------------------------- */}
      {authState === 'AUTHENTICATED' &&
        loadState === 'ERROR' &&
        bookings.length === 0 && (
          <section
            aria-labelledby="error-heading"
            className="bg-white rounded-3xl border border-slate-200 p-6 text-center shadow-xs my-6 space-y-4"
          >
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-600 border border-rose-100">
              <AlertCircle className="w-7 h-7" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <h2 id="error-heading" className="text-base font-black text-slate-950">
                {recentSubmission
                  ? 'تم إرسال طلبك، لكن تعذر تحديث قائمة حجوزاتك. حاول مرة أخرى.'
                  : 'تعذر تحميل حجوزاتك'}
              </h2>
              <p className="text-sm font-semibold text-slate-600 max-w-xs mx-auto">
                {error || 'تحقق من الاتصال وحاول مرة أخرى.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="min-h-[44px] px-6 rounded-2xl bg-[#0059FF] text-white text-sm font-black shadow-xs hover:bg-[#004cdb] transition-colors cursor-pointer inline-flex items-center justify-center"
            >
              إعادة المحاولة
            </button>
          </section>
        )}

      {/* ------------------------------------------------------------------- */}
      {/* 8. True Empty State (Authenticated, 0 bookings, no recent marker)    */}
      {/* ------------------------------------------------------------------- */}
      {authState === 'AUTHENTICATED' &&
        !isInitialLoading &&
        loadState !== 'ERROR' &&
        bookings.length === 0 &&
        !recentSubmissionMissingFromList && (
          <section
            aria-labelledby="empty-bookings-heading"
            className="bg-slate-50/70 rounded-3xl border border-slate-200 p-8 text-center my-6 space-y-4 shadow-xs"
          >
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto text-[#0059FF] border border-slate-200 shadow-xs">
              <CalendarDays className="w-7 h-7" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <h2 id="empty-bookings-heading" className="text-base font-black text-slate-950">
                لا توجد حجوزات بعد
              </h2>
              <p className="text-sm font-medium text-slate-600 max-w-xs mx-auto">
                بعد إرسال طلب حجز، سيظهر هنا لتتابع حالته.
              </p>
            </div>
            <button
              type="button"
              onClick={onExplore}
              className="min-h-[48px] px-6 rounded-2xl bg-[#0059FF] text-white text-sm font-black shadow-sm hover:bg-[#004cdb] active:scale-[0.99] transition-all cursor-pointer inline-flex items-center justify-center"
            >
              استكشف الإقامات
            </button>
          </section>
        )}

      {/* ------------------------------------------------------------------- */}
      {/* 9. Loaded Bookings (Rendered in conditional sections)                */}
      {/* ------------------------------------------------------------------- */}
      {authState === 'AUTHENTICATED' && bookings.length > 0 && (
        <div className="space-y-6">
          {/* Section 1: يحتاج إجراء منك (APPROVED_PENDING_PAYMENT ONLY) */}
          {grouped.actionRequired.length > 0 && (
            <section
              aria-labelledby="action-required-heading"
              className="space-y-3"
            >
              <h2
                id="action-required-heading"
                className="text-base font-black text-slate-950 flex items-center gap-2"
              >
                <span>{BOOKING_SECTION_TITLES.ACTION_REQUIRED}</span>
                <span className="w-2 h-2 rounded-full bg-[#0059FF]" aria-hidden="true" />
              </h2>
              <div className="space-y-3">
                {grouped.actionRequired.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onOpenBooking={onOpenBooking}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Section 2: الحالية (PENDING_OWNER_APPROVAL, CONFIRMED) */}
          {grouped.current.length > 0 && (
            <section
              aria-labelledby="current-bookings-heading"
              className="space-y-3"
            >
              <h2
                id="current-bookings-heading"
                className="text-base font-black text-slate-950"
              >
                {BOOKING_SECTION_TITLES.CURRENT}
              </h2>
              <div className="space-y-3">
                {grouped.current.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onOpenBooking={onOpenBooking}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Section 3: السابقة (REJECTED, CANCELLED_*, EXPIRED, COMPLETED) */}
          {grouped.history.length > 0 && (
            <section
              aria-labelledby="history-bookings-heading"
              className="space-y-3 pt-2 border-t border-slate-100"
            >
              <h2
                id="history-bookings-heading"
                className="text-base font-black text-slate-700"
              >
                {BOOKING_SECTION_TITLES.HISTORY}
              </h2>
              <div className="space-y-3">
                {grouped.history.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onOpenBooking={onOpenBooking}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Section 4: حجوزات أخرى (Optional Catch-all for unknown statuses) */}
          {grouped.other.length > 0 && (
            <section
              aria-labelledby="other-bookings-heading"
              className="space-y-3 pt-2 border-t border-slate-100"
            >
              <h2
                id="other-bookings-heading"
                className="text-base font-black text-slate-700"
              >
                {BOOKING_SECTION_TITLES.OTHER}
              </h2>
              <div className="space-y-3">
                {grouped.other.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onOpenBooking={onOpenBooking}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

interface BookingCardProps {
  booking: CustomerBookingRecord;
  onOpenBooking: (bookingId: string) => void;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, onOpenBooking }) => {
  const presentation = getCustomerBookingPresentation(booking.status);
  const stayDates = formatArabicStayRange(booking.checkIn, booking.checkOut) || `${booking.checkIn} ← ${booking.checkOut}`;
  const staySummary = formatStayDurationAndGuests(booking.nights, booking.guestsCount);

  // Status badge styling per section / attention level
  const badgeStyle = React.useMemo(() => {
    switch (booking.status) {
      case 'APPROVED_PENDING_PAYMENT':
        return 'bg-blue-50 text-[#0059FF] border border-blue-200';
      case 'PENDING_OWNER_APPROVAL':
        return 'bg-slate-100 text-slate-800 border border-slate-200';
      case 'CONFIRMED':
        return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-800 border border-rose-200';
      case 'CANCELLED_BY_GUEST':
      case 'CANCELLED_BY_OWNER':
      case 'EXPIRED':
      case 'COMPLETED':
      default:
        return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  }, [booking.status]);

  const isActionRequired = presentation.section === 'ACTION_REQUIRED';

  return (
    <button
      type="button"
      onClick={() => onOpenBooking(booking.id)}
      aria-label={`${booking.propertyTitle || 'وحدة'} — ${presentation.customerLabel}`}
      className={`w-full text-right bg-white rounded-2xl border transition-all shadow-xs cursor-pointer block overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/50 ${
        isActionRequired
          ? 'border-blue-200 hover:border-[#0059FF] bg-blue-50/15'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="p-3.5 space-y-3">
        {/* Top Details & Image Row */}
        <div className="flex gap-3 items-start">
          {/* Property Image Container (88px to 96px responsive square) */}
          <div className="w-[88px] h-[88px] sm:w-[96px] sm:h-[96px] rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
            {booking.propertyImage ? (
              <img
                src={booking.propertyImage}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <ImageOff className="w-6 h-6" aria-hidden="true" />
              </div>
            )}
          </div>

          {/* Core Booking Information */}
          <div className="min-w-0 flex-1 space-y-1.5">
            {/* Title & Status Badge */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-black text-sm text-slate-950 leading-snug line-clamp-2 break-words">
                {booking.propertyTitle || 'وحدة مصيفية'}
              </h3>
              <span
                className={`text-xs font-black px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1.5 ${badgeStyle}`}
              >
                {renderStatusIcon(presentation.iconName, 'w-3.5 h-3.5 shrink-0')}
                <span>{presentation.customerLabel}</span>
              </span>
            </div>

            {/* Location (omitted when empty) */}
            {booking.locationName && (
              <p className="flex items-center gap-1 text-xs font-medium text-slate-500 truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-[#0059FF]" aria-hidden="true" />
                <span className="truncate">{booking.locationName}</span>
              </p>
            )}

            {/* Dates (formatted Arabic stay range) */}
            <p className="text-xs font-bold text-slate-800" dir="rtl">
              {stayDates}
            </p>

            {/* Duration & Guests */}
            <p className="text-xs font-medium text-slate-500">
              {staySummary}
            </p>
          </div>
        </div>

        {/* Supporting Status Meaning (when applicable) */}
        {presentation.supportingCopy && (
          <div className="pt-2 border-t border-slate-100 text-xs font-bold text-slate-600">
            {presentation.supportingCopy}
          </div>
        )}

        {/* Bottom Lifecycle Row & Screen 13 Details Affordance */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          {/* Status-specific bottom information */}
          {booking.status === 'APPROVED_PENDING_PAYMENT' && (
            <div className="space-y-0.5">
              <span className="block text-xs font-black text-[#0059FF]">
                {presentation.actionCue}
              </span>
              <span className="block text-xs font-extrabold text-slate-900">
                العربون: <strong className="text-sm font-black text-slate-950">{booking.depositAmount.toLocaleString()} ج.م</strong>
              </span>
            </div>
          )}

          {booking.status === 'PENDING_OWNER_APPROVAL' && (
            <div className="text-xs text-slate-600">
              <span>إجمالي الإقامة: </span>
              <strong className="font-extrabold text-slate-900">{booking.totalStay.toLocaleString()} ج.م</strong>
            </div>
          )}

          {booking.status === 'CONFIRMED' && (
            <div className="text-xs font-extrabold text-emerald-800">
              حجز مؤكد
            </div>
          )}

          {presentation.section === 'HISTORY' && (
            <div className="text-xs font-medium text-slate-500">
              {presentation.customerLabel}
            </div>
          )}

          {presentation.section === 'OTHER' && (
            <div className="text-xs font-medium text-slate-500">
              طلب محفوظ
            </div>
          )}

          {/* Screen 13 Details Click Affordance */}
          <div className="flex items-center gap-1 font-black text-xs text-[#0059FF] shrink-0">
            <span>عرض التفاصيل</span>
            <ChevronLeft className="w-3.5 h-3.5 text-[#0059FF]" aria-hidden="true" />
          </div>
        </div>
      </div>
    </button>
  );
};

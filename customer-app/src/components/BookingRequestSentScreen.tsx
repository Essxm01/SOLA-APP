import React from 'react';
import { Send, Clock, CalendarCheck } from 'lucide-react';
import type { CustomerBookingCreateResponseDto, BookingRequestSentState } from '../utils/customerScreen11BookingRequestSent';
import { formatStayDurationAndGuests } from '../utils/customerScreen11BookingRequestSent';
import { formatArabicStayRange } from '../utils/searchIntent';

export interface BookingRequestSentScreenProps {
  state?: BookingRequestSentState;
  booking?: CustomerBookingCreateResponseDto;
  propertyTitle?: string | null;
  onGoToBookings: () => void;
  onGoToExplore?: () => void;
  onExplore?: () => void;
}

export const BookingRequestSentScreen: React.FC<BookingRequestSentScreenProps> = ({
  state,
  booking: propBooking,
  propertyTitle: propPropertyTitle,
  onGoToBookings,
  onGoToExplore,
  onExplore,
}) => {
  const booking = state?.booking ?? propBooking;
  const propertyTitle = state?.propertyTitle ?? propPropertyTitle;
  const handleExplore = onGoToExplore ?? onExplore ?? onGoToBookings;

  if (!booking) return null;
  const formattedStayRange = formatArabicStayRange(booking.checkIn, booking.checkOut) || `${booking.checkIn} — ${booking.checkOut}`;
  const durationAndGuests = formatStayDurationAndGuests(booking.nights, booking.guestsCount);
  const cleanTitle = propertyTitle?.trim() || null;

  return (
    <main
      dir="rtl"
      className="fixed inset-0 z-50 min-h-[100dvh] overflow-y-auto overflow-x-hidden bg-white text-slate-900"
      aria-labelledby="booking-request-sent-title"
    >
      <div
        className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col justify-between px-5"
        style={{
          paddingTop: 'max(2rem, env(safe-area-inset-top, 0px))',
          paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Top Content Area */}
        <div className="flex-1">
          {/* Restrained KONFRM Brand Identity */}
          <header className="flex items-center gap-2 pb-6 pt-1">
            <img src="/konfrm-mark.svg" alt="KONFRM" className="h-6 w-auto" aria-hidden="true" />
            <span className="text-sm font-black tracking-tight text-slate-900">KONFRM</span>
          </header>

          {/* Send Acknowledgment Icon (Restrained ~52x52 container, soft blue) */}
          <div
            className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-blue-50 text-[#0059FF] shadow-xs"
            aria-hidden="true"
          >
            <Send className="h-6 w-6 text-[#0059FF] rtl:-scale-x-100" />
          </div>

          {/* Heading & Support */}
          <h1
            id="booking-request-sent-title"
            className="mt-4 text-[22px] font-black tracking-tight text-slate-950 sm:text-2xl"
          >
            تم إرسال طلب الحجز
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-600 sm:text-base">
            وصل طلبك إلى المالك للمراجعة.
          </p>

          {/* Current Status Section */}
          <div className="mt-4 flex w-fit items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-100/80 px-3.5 py-2">
            <Clock className="h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
            <span className="text-sm font-extrabold text-slate-800">
              قيد مراجعة المالك
            </span>
          </div>

          {/* Payment Reassurance */}
          <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-sm font-bold text-slate-800">
            لا يوجد أي مبلغ مطلوب الآن.
          </div>

          {/* Next Steps Section */}
          <section className="mt-6 space-y-2" aria-labelledby="next-steps-heading">
            <h2 id="next-steps-heading" className="text-sm font-black text-slate-900 sm:text-base">
              ما الخطوة التالية؟
            </h2>
            <p className="text-sm font-medium leading-relaxed text-slate-600">
              إذا وافق المالك، يصبح دفع العربون هو الخطوة التالية. بعد نجاح الدفع يصبح الحجز مؤكدًا.
            </p>
            <p className="text-sm font-semibold text-slate-500">
              يمكنك متابعة حالة طلبك من حجوزاتي.
            </p>
          </section>

          {/* Booking Summary Section */}
          <section className="mt-6 mb-4" aria-labelledby="booking-summary-heading">
            <h2 id="booking-summary-heading" className="mb-3 text-sm font-black text-slate-900 sm:text-base">
              تفاصيل الطلب
            </h2>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <dl className="divide-y divide-slate-100 text-sm">
                {cleanTitle && (
                  <div className="flex items-start justify-between gap-3 pb-2.5">
                    <dt className="shrink-0 font-bold text-slate-500 pt-0.5">الوحدة</dt>
                    <dd className="line-clamp-2 text-left font-extrabold text-slate-900 leading-snug break-words">
                      {cleanTitle}
                    </dd>
                  </div>
                )}
                <div className={`flex items-baseline justify-between gap-4 ${cleanTitle ? 'py-2.5' : 'pb-2.5'}`}>
                  <dt className="shrink-0 font-bold text-slate-500">رقم الطلب</dt>
                  <dd dir="ltr" className="select-all break-all text-left font-mono font-bold text-slate-900">
                    {booking.bookingNumber}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="shrink-0 font-bold text-slate-500">التواريخ</dt>
                  <dd className="text-left font-extrabold text-slate-900">
                    {formattedStayRange}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="shrink-0 font-bold text-slate-500">المدة والضيوف</dt>
                  <dd className="text-left font-extrabold text-slate-900">
                    {durationAndGuests}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="shrink-0 font-bold text-slate-500">إجمالي الإقامة</dt>
                  <dd className="text-left text-base font-black text-slate-950">
                    {booking.totalStay.toLocaleString()} ج.م
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 pt-2.5 text-[#0059FF]">
                  <dt className="shrink-0 font-extrabold">العربون إذا وافق المالك</dt>
                  <dd className="text-left text-base font-black">
                    {booking.depositAmount.toLocaleString()} ج.م
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </div>

        {/* Bottom Actions Area */}
        <div className="mt-6 space-y-2.5 pt-4">
          <button
            type="button"
            onClick={onGoToBookings}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0059FF] px-4 py-3.5 text-sm font-black text-white shadow-xs transition-colors hover:bg-[#0047cc] active:bg-[#003bb8] sm:text-base"
          >
            <CalendarCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>متابعة الطلب في حجوزاتي</span>
          </button>
          <button
            type="button"
            onClick={handleExplore}
            className="flex min-h-[44px] w-full items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-extrabold text-slate-600 transition-colors hover:text-slate-950 active:bg-slate-50"
          >
            <span>العودة إلى الاستكشاف</span>
          </button>
        </div>
      </div>
    </main>
  );
};

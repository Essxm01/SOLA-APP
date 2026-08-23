import React from 'react';
import { CalendarDays, UserRound, ArrowLeft, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getPendingBookingRequests, getUpcomingConfirmedBookings } from '../../utils/ownerHome';
import { formatArabicDateRange } from '../../utils/dateFormatter';

const getInitials = (name?: string) =>
  name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('') || '';

export const RecentBookingsSection: React.FC = () => {
  const { bookings, openPendingBookings, setActiveTab } = useApp();
  const pending = getPendingBookingRequests(bookings).slice(0, 2);
  const nextBooking = getUpcomingConfirmedBookings(bookings)[0];

  // If there are neither pending requests nor upcoming bookings, omit or show subtle section
  const hasBookingsContent = pending.length > 0 || !!nextBooking;

  return (
    <section className="space-y-3 text-right" aria-labelledby="owner-bookings">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 id="owner-bookings" className="text-lg font-black text-slate-900">
          الحجوزات
        </h2>
        <button
          onClick={() => setActiveTab('bookings')}
          className="text-xs font-bold text-[#0059FF] hover:text-blue-700 transition-colors cursor-pointer"
        >
          عرض الكل
        </button>
      </div>

      {/* Pending Booking Requests Preview Cards */}
      {pending.length > 0 && (
        <div className="space-y-2.5">
          {pending.map((booking) => (
            <div
              key={booking.id}
              onClick={openPendingBookings}
              className="w-full rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs hover:border-blue-300 transition-all cursor-pointer text-right"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-[#0059FF]">
                    {booking.renter?.avatar ? (
                      <img
                        src={booking.renter.avatar}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      getInitials(booking.renter?.name) || <UserRound className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-900 block truncate">
                      {booking.renter?.name || 'ضيف صولا'}
                    </span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200/60 shrink-0">
                  طلب جديد
                </span>
              </div>

              <div className="pt-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="font-bold text-xs text-slate-800 truncate">
                    {booking.propertyTitle}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span dir="rtl" className="inline-block">
                      {formatArabicDateRange(booking.checkIn, booking.checkOut)}
                    </span>
                    <span className="text-slate-400">• {booking.nights} {booking.nights === 1 ? 'ليلة' : booking.nights === 2 ? 'ليلتان' : 'ليالٍ'}</span>
                  </p>
                </div>

                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#0059FF] text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1 shrink-0"
                >
                  <span>مراجعة</span>
                  <ArrowLeft className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Next Upcoming Confirmed Booking Card */}
      {nextBooking ? (
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5 shadow-xs text-right">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#0059FF]" />
              الحجز المؤكد القادم
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/50">
              مؤكد
            </span>
          </div>

          <p className="font-black text-xs text-slate-900 truncate">
            {nextBooking.propertyTitle}
          </p>

          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>الضيف: {nextBooking.renter?.name || 'ضيف'}</span>
            <span dir="rtl" className="font-semibold text-slate-700">
              {formatArabicDateRange(nextBooking.checkIn, nextBooking.checkOut)} ({nextBooking.nights} {nextBooking.nights === 1 ? 'ليلة' : nextBooking.nights === 2 ? 'ليلتان' : 'ليالٍ'})
            </span>
          </div>
        </div>
      ) : !hasBookingsContent && (
        <div className="rounded-2xl border border-slate-200/60 bg-white p-3.5 text-center shadow-xs">
          <p className="text-xs text-slate-500 font-medium">لا توجد حجوزات قائمة أو قادمة حالياً</p>
        </div>
      )}
    </section>
  );
};


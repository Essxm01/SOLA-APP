import React from 'react';
import { CalendarDays, UserRound } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getPendingBookingRequests, getUpcomingConfirmedBookings } from '../../utils/ownerHome';

const initials = (name?: string) => name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('') || '';

export const RecentBookingsSection: React.FC = () => {
  const { bookings, openPendingBookings, setActiveTab } = useApp();
  const pending = getPendingBookingRequests(bookings).slice(0, 2);
  const nextBooking = getUpcomingConfirmedBookings(bookings)[0];

  return <section className="space-y-4 text-right" aria-labelledby="owner-bookings">
    <div className="flex items-center justify-between"><h2 id="owner-bookings" className="text-lg font-extrabold text-[var(--konfrm-text-primary)]">الحجوزات</h2><button onClick={() => setActiveTab('bookings')} className="min-h-11 text-sm font-bold text-[var(--konfrm-color-primary)]">عرض الحجوزات</button></div>
    {pending.length > 0 && <div className="space-y-3">{pending.map((booking) => <button key={booking.id} onClick={openPendingBookings} className="w-full rounded-[var(--konfrm-radius-card)] border border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] p-4 text-right"><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--konfrm-surface-secondary)] font-bold text-[var(--konfrm-text-secondary)]">{booking.renter?.avatar ? <img src={booking.renter.avatar} alt="" className="h-10 w-10 rounded-full object-cover" /> : initials(booking.renter?.name) || <UserRound className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><p className="font-bold text-[var(--konfrm-text-primary)]">{booking.renter?.name || 'ضيف'}</p><p className="mt-1 truncate text-sm text-[var(--konfrm-text-secondary)]">{booking.propertyTitle}</p></div><span className="text-sm font-bold text-[var(--konfrm-color-primary)]">مراجعة الطلب</span></div><div className="mt-3 flex items-center gap-2 text-sm text-[var(--konfrm-text-secondary)]"><CalendarDays className="h-4 w-4" />{booking.checkIn} — {booking.checkOut}<span>• {booking.nights} ليالٍ</span></div></button>)}</div>}
    {nextBooking && <div className="rounded-[var(--konfrm-radius-card)] bg-[var(--konfrm-surface-secondary)] p-4"><p className="text-sm font-bold text-[var(--konfrm-text-primary)]">الحجز القادم</p><p className="mt-2 font-bold text-[var(--konfrm-text-primary)]">{nextBooking.propertyTitle}</p><p className="mt-1 text-sm text-[var(--konfrm-text-secondary)]">{nextBooking.checkIn} — {nextBooking.checkOut}</p></div>}
  </section>;
};

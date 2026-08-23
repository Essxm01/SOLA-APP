import React from 'react';
import { ArrowLeft, CalendarDays, MapPin, UserRound } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getUpcomingConfirmedBookings } from '../../utils/ownerHome';
import { formatArabicDateRange } from '../../utils/dateFormatter';

const getInitials = (name?: string) => name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('') || '';

export const RecentBookingsSection: React.FC = () => {
  const { bookings, setActiveTab } = useApp();
  const nextBooking = getUpcomingConfirmedBookings(bookings)[0];
  if (!nextBooking) return null;

  const renterName = nextBooking.renter?.name?.trim() || 'ضيف';
  const dateRange = formatArabicDateRange(nextBooking.checkIn, nextBooking.checkOut);

  return (
    <section aria-labelledby="owner-next-booking">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold text-[var(--konfrm-text-muted)]">الحجز القادم</p>
          <h2 id="owner-next-booking" className="mt-0.5 text-[20px] font-extrabold tracking-[-0.01em] text-[var(--konfrm-text-primary)]">إقامة مؤكدة قريباً</h2>
        </div>
        <button type="button" onClick={() => setActiveTab('bookings')} className="min-h-11 text-[14px] font-bold text-[var(--konfrm-color-primary)]">عرض الكل</button>
      </div>
      <button type="button" onClick={() => setActiveTab('bookings')} className="block w-full overflow-hidden rounded-[var(--konfrm-radius-elevated-card)] border border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] text-right [box-shadow:var(--konfrm-shadow-subtle)]">
        <div className="flex gap-3 p-[var(--konfrm-space-card-padding)]">
          {nextBooking.propertyImage ? <img src={nextBooking.propertyImage} alt="" className="h-[86px] w-[86px] shrink-0 rounded-[var(--konfrm-radius-control)] object-cover" /> : <div className="flex h-[86px] w-[86px] shrink-0 items-center justify-center rounded-[var(--konfrm-radius-control)] bg-[var(--konfrm-surface-secondary)] text-[var(--konfrm-text-muted)]"><CalendarDays className="h-6 w-6" /></div>}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[16px] font-extrabold leading-6 text-[var(--konfrm-text-primary)]">{nextBooking.propertyTitle}</p>
            {nextBooking.locationName && <p className="mt-1 flex items-center gap-1 text-[13px] text-[var(--konfrm-text-muted)]"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{nextBooking.locationName}</span></p>}
            <div className="mt-3 flex items-center gap-2 text-[13px] text-[var(--konfrm-text-secondary)]">
              {nextBooking.renter?.avatar ? <img src={nextBooking.renter.avatar} alt="" className="h-6 w-6 rounded-[var(--konfrm-radius-round)] object-cover" /> : <span className="flex h-6 w-6 items-center justify-center rounded-[var(--konfrm-radius-round)] bg-[var(--konfrm-color-primary-soft)] text-[11px] font-bold text-[var(--konfrm-color-primary)]">{getInitials(renterName) || <UserRound className="h-3.5 w-3.5" />}</span>}
              <span className="truncate">{renterName}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[var(--konfrm-border-subtle)] px-[var(--konfrm-space-card-padding)] py-3">
          <span className="text-[13px] font-bold text-[var(--konfrm-text-primary)]"><bdi>{dateRange}</bdi><span className="mx-1.5 text-[var(--konfrm-border-strong)]">•</span>{nextBooking.nights} {nextBooking.nights === 1 ? 'ليلة' : nextBooking.nights === 2 ? 'ليلتان' : 'ليالٍ'}</span>
          <span className="inline-flex items-center gap-1 text-[13px] font-bold text-[var(--konfrm-color-primary)]">عرض التفاصيل <ArrowLeft className="h-3.5 w-3.5" /></span>
        </div>
      </button>
    </section>
  );
};

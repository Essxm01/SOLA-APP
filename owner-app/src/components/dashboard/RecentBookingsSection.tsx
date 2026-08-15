import React from 'react';
import { useApp } from '../../context/AppContext';
import { BookingStatusChip } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Calendar, MapPin, CheckCircle, XCircle } from 'lucide-react';

export const RecentBookingsSection: React.FC = () => {
  const { bookings, approveBooking, rejectBooking, openPendingBookings } = useApp();

  const pendingBookings = bookings.filter((b) => b.status === 'PENDING_OWNER_APPROVAL');

  if (pendingBookings.length === 0) {
    return (
      <div className="space-y-3 dir-rtl text-right">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">طلبات الحجز المعلقة</h3>
          <button
            onClick={openPendingBookings}
            className="text-xs text-[#0059FF] font-bold hover:underline"
          >
            عرض الأرشيف
          </button>
        </div>
        <EmptyState
          type="bookings"
          title="لا توجد طلبات حجز معلقة حالياً"
          description="جميع الطلبات تم البت فيها. ستظهر أي طلبات حجز جديدة فور إرسالها هنا."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 dir-rtl text-right">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">طلبات الحجز المعلقة</h3>
        <button
          onClick={openPendingBookings}
          className="text-xs text-[#0059FF] font-bold hover:underline"
        >
          عرض الكل ({pendingBookings.length})
        </button>
      </div>

      <div className="space-y-3">
        {pendingBookings.map((b) => (
          <div
            key={b.id}
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={b.renter?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                  alt={b.renter?.name || 'مستأجر'}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-100"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{b.renter?.name || 'مستأجر'}</span>
                  <span className="text-[11px] text-slate-400">طلب حجز جديد</span>
                </div>
              </div>
              <BookingStatusChip status={b.status} />
            </div>

            <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <img
                src={b.propertyImage}
                alt={b.propertyTitle}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="min-w-0 space-y-0.5 text-xs">
                <h4 className="font-bold text-slate-900 truncate">{b.propertyTitle}</h4>
                <p className="text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{b.locationName}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-700 bg-blue-50/50 p-2 rounded-xl border border-blue-100">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-[#0059FF]" />
                {b.checkIn} ➔ {b.checkOut}
              </span>
              <span className="font-mono text-[#0059FF]">{b.nights} ليالٍ</span>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={() => approveBooking(b.id)}
                icon={<CheckCircle className="w-4 h-4" />}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold py-2 text-xs"
              >
                قبول الطلب 🟢
              </Button>
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => rejectBooking(b.id)}
                icon={<XCircle className="w-4 h-4" />}
                className="text-rose-600 border-rose-200 hover:bg-rose-50 font-bold py-2 text-xs"
              >
                رفض الطلب 🔴
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

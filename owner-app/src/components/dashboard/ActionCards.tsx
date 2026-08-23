import React from 'react';
import { CheckCircle2, Clock3, ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getPendingBookingRequests } from '../../utils/ownerHome';

export const ActionCards: React.FC = () => {
  const { bookings, openPendingBookings } = useApp();
  const pendingCount = getPendingBookingRequests(bookings).length;

  return (
    <section aria-labelledby="owner-attention">
      {pendingCount > 0 ? (
        <div className="overflow-hidden rounded-[var(--konfrm-radius-elevated-card)] border border-[color:var(--konfrm-color-primary)]/20 bg-[var(--konfrm-surface-primary)] [box-shadow:var(--konfrm-shadow-subtle)]">
          <div className="flex items-stretch">
            <div className="w-1.5 shrink-0 bg-[var(--konfrm-color-primary)]" aria-hidden="true" />
            <div className="flex-1 p-[var(--konfrm-space-card-padding)]">
              <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--konfrm-radius-control)] bg-[var(--konfrm-color-primary-soft)] text-[var(--konfrm-color-primary)]">
                <Clock3 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p id="owner-attention" className="text-[13px] font-bold text-[var(--konfrm-color-primary)]">يحتاج انتباهك</p>
                <h2 className="mt-1 text-[18px] font-extrabold leading-7 text-[var(--konfrm-text-primary)]">لديك {pendingCount === 1 ? 'طلب حجز ينتظر قرارك' : pendingCount === 2 ? 'طلبان ينتظران قرارك' : `${pendingCount.toLocaleString('ar-EG')} طلبات حجز تنتظر قرارك`}</h2>
                <p className="mt-1 text-[13px] leading-5 text-[var(--konfrm-text-secondary)]">راجع التفاصيل قبل اتخاذ قرارك.</p>
              </div>
              </div>
              <button type="button" onClick={openPendingBookings} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[var(--konfrm-radius-control)] bg-[var(--konfrm-color-primary)] px-4 text-[14px] font-bold text-[var(--konfrm-text-inverse)]">
                مراجعة الطلبات
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 py-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--konfrm-radius-round)] bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <h2 id="owner-attention" className="text-[15px] font-bold text-[var(--konfrm-text-primary)]">كل شيء تحت السيطرة</h2>
            <p className="mt-0.5 text-[13px] text-[var(--konfrm-text-muted)]">لا توجد طلبات حجز تنتظر قرارك.</p>
          </div>
        </div>
      )}
    </section>
  );
};

import React from 'react';
import { CheckCircle2, Clock3, ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getPendingBookingRequests } from '../../utils/ownerHome';
import { Button } from '../ui/Button';

export const ActionCards: React.FC = () => {
  const { bookings, openPendingBookings } = useApp();
  const pendingCount = getPendingBookingRequests(bookings).length;

  return (
    <section className="space-y-3 text-right" aria-labelledby="owner-attention">
      <h2 id="owner-attention" className="text-lg font-black text-slate-900">
        يحتاج انتباهك
      </h2>

      {pendingCount > 0 ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0059FF] text-white">
                <Clock3 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-[#0059FF] block">
                  طلبات تحتاج قرارك
                </span>
                <h3 className="mt-0.5 text-sm font-black text-slate-900">
                  لديك {pendingCount === 1 ? 'طلب حجز واحد' : pendingCount === 2 ? 'طلبا حجز' : `${pendingCount.toLocaleString('ar-EG')} طلبات حجز`} بانتظار قرارك
                </h3>
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-3 border-t border-blue-100/80 flex items-center justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={openPendingBookings}
              className="bg-[#0059FF] hover:bg-blue-700 font-extrabold text-xs py-2 px-4 rounded-xl shadow-xs"
            >
              مراجعة الطلبات
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-xs">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800">لا توجد طلبات تحتاج قرارك الآن</p>
            <p className="text-[11px] text-slate-400">سنظهر هنا أي طلب حجز يتطلب اتخاذ إجراء.</p>
          </div>
        </div>
      )}
    </section>
  );
};


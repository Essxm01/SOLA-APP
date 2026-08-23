import React from 'react';
import { ArrowLeft, Clock3 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getPendingBookingRequests } from '../../utils/ownerHome';
import { Button } from '../ui/Button';

export const ActionCards: React.FC = () => {
  const { bookings, openPendingBookings } = useApp();
  const pendingCount = getPendingBookingRequests(bookings).length;

  return <section className="space-y-4 text-right" aria-labelledby="owner-attention">
    <div><h2 id="owner-attention" className="text-lg font-extrabold text-[var(--konfrm-text-primary)]">يحتاج انتباهك</h2><p className="mt-1 text-sm text-[var(--konfrm-text-secondary)]">ملخص واضح لما يحتاج منك خطوة الآن.</p></div>
    {pendingCount > 0 ? <div className="rounded-[var(--konfrm-radius-card)] border border-[var(--konfrm-border-focus)] bg-[var(--konfrm-color-primary-soft)] p-4"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--konfrm-radius-control)] bg-[var(--konfrm-color-primary)] text-white"><Clock3 className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="font-bold text-[var(--konfrm-text-primary)]">طلبات حجز تنتظر قرارك</h3><p className="mt-1 text-sm text-[var(--konfrm-text-secondary)]">لديك {pendingCount.toLocaleString('ar-EG')} طلب بانتظار المراجعة.</p><Button className="mt-4" variant="primary" size="md" onClick={openPendingBookings}>مراجعة الطلبات <ArrowLeft className="h-4 w-4" /></Button></div></div></div> : <p className="rounded-[var(--konfrm-radius-card)] bg-[var(--konfrm-surface-secondary)] px-4 py-3 text-sm text-[var(--konfrm-text-secondary)]">لا توجد طلبات تحتاج قرارك الآن.</p>}
  </section>;
};

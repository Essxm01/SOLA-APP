import React from 'react';
import { AlertCircle, ArrowLeft, Clock3 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getPendingBookingRequests, getWalletHomeState } from '../../utils/ownerHome';
import { Button } from '../ui/Button';

const money = (amount: number) => `${amount.toLocaleString('ar-EG')} ج.م`;

export const ActionCards: React.FC = () => {
  const { bookings, openPendingBookings, wallet, walletError, refreshWallet, setActiveTab } = useApp();
  const pendingCount = getPendingBookingRequests(bookings).length;
  const walletState = getWalletHomeState(wallet, walletError);

  return <section className="space-y-4 text-right" aria-labelledby="owner-attention">
    <div><h2 id="owner-attention" className="text-lg font-extrabold text-[var(--konfrm-text-primary)]">يحتاج انتباهك</h2><p className="mt-1 text-sm text-[var(--konfrm-text-secondary)]">ملخص واضح لما يحتاج منك خطوة الآن.</p></div>
    {pendingCount > 0 ? <div className="rounded-[var(--konfrm-radius-card)] border border-[var(--konfrm-border-focus)] bg-[var(--konfrm-color-primary-soft)] p-4"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--konfrm-radius-control)] bg-[var(--konfrm-color-primary)] text-white"><Clock3 className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="font-bold text-[var(--konfrm-text-primary)]">طلبات حجز تنتظر قرارك</h3><p className="mt-1 text-sm text-[var(--konfrm-text-secondary)]">لديك {pendingCount.toLocaleString('ar-EG')} طلب بانتظار المراجعة.</p><Button className="mt-4" variant="primary" size="md" onClick={openPendingBookings}>مراجعة الطلبات <ArrowLeft className="h-4 w-4" /></Button></div></div></div> : <p className="rounded-[var(--konfrm-radius-card)] bg-[var(--konfrm-surface-secondary)] px-4 py-3 text-sm text-[var(--konfrm-text-secondary)]">لا توجد طلبات تحتاج قرارك الآن.</p>}
    <section className="space-y-3 pt-2" aria-labelledby="owner-money"><div className="flex items-center justify-between"><h2 id="owner-money" className="text-lg font-extrabold text-[var(--konfrm-text-primary)]">أموالك</h2><button onClick={() => setActiveTab('wallet')} className="min-h-11 text-sm font-bold text-[var(--konfrm-color-primary)]">عرض المحفظة</button></div>
      {walletState.kind === 'error' ? <div className="flex items-center justify-between gap-3 rounded-[var(--konfrm-radius-card)] border border-[var(--konfrm-semantic-danger)] bg-[var(--konfrm-surface-primary)] p-4"><span className="flex items-center gap-2 text-sm text-[var(--konfrm-text-primary)]"><AlertCircle className="h-5 w-5 text-[var(--konfrm-semantic-danger)]" />تعذر تحميل رصيد المحفظة</span><button onClick={() => void refreshWallet()} className="min-h-11 text-sm font-bold text-[var(--konfrm-color-primary)]">إعادة المحاولة</button></div> : walletState.kind === 'ready' ? <div className="grid grid-cols-2 overflow-hidden rounded-[var(--konfrm-radius-card)] border border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)]"><div className="p-4"><p className="text-sm text-[var(--konfrm-text-secondary)]">متاح للسحب</p><p className="mt-1 text-xl font-extrabold text-[var(--konfrm-text-primary)]">{money(walletState.available)}</p></div><div className="border-r border-[var(--konfrm-border-subtle)] p-4"><p className="text-sm text-[var(--konfrm-text-secondary)]">معلق</p><p className="mt-1 text-xl font-extrabold text-[var(--konfrm-text-primary)]">{money(walletState.pending)}</p></div></div> : <div className="h-24 animate-pulse rounded-[var(--konfrm-radius-card)] bg-[var(--konfrm-surface-secondary)]" />}
    </section>
  </section>;
};

import React from 'react';
import { AlertCircle, ArrowLeft, RefreshCw, WalletCards } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getWalletHomeState } from '../../utils/ownerHome';

export const WalletSummarySection: React.FC = () => {
  const { wallet, walletError, refreshWallet, setActiveTab } = useApp();
  const state = getWalletHomeState(wallet, walletError);

  return <section aria-labelledby="owner-wallet">
    <div className="mb-3 flex items-end justify-between gap-3"><h2 id="owner-wallet" className="text-[20px] font-extrabold tracking-[-0.01em] text-[var(--konfrm-text-primary)]">المحفظة</h2><button type="button" onClick={() => setActiveTab('wallet')} className="min-h-11 text-[14px] font-bold text-[var(--konfrm-color-primary)]">عرض المحفظة</button></div>
    {state.kind === 'error' ? <div className="flex items-center justify-between gap-3 rounded-[var(--konfrm-radius-card)] border border-rose-200 bg-rose-50 p-4"><div className="flex items-center gap-2 text-[14px] font-bold text-rose-800"><AlertCircle className="h-5 w-5" />تعذر تحميل رصيد المحفظة</div><button type="button" onClick={() => void refreshWallet()} className="inline-flex min-h-11 items-center gap-1 text-[13px] font-bold text-[var(--konfrm-color-primary)]"><RefreshCw className="h-4 w-4" />إعادة المحاولة</button></div> : state.kind === 'ready' ? <button type="button" onClick={() => setActiveTab('wallet')} className="block w-full rounded-[var(--konfrm-radius-elevated-card)] border border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] p-5 text-right [box-shadow:var(--konfrm-shadow-subtle)]">
      <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-[var(--konfrm-radius-control)] bg-[var(--konfrm-color-primary-soft)] text-[var(--konfrm-color-primary)]"><WalletCards className="h-5 w-5" /></div><div><p className="text-[16px] font-extrabold text-[var(--konfrm-text-primary)]">ملخص رصيدك</p><p className="mt-0.5 text-[13px] text-[var(--konfrm-text-muted)]">تابع ما أصبح متاحاً وما يزال معلقاً.</p></div></div>
      <div className="mt-5"><p className="text-[13px] font-bold text-[var(--konfrm-text-muted)]">متاح للسحب</p><p className="mt-1 text-[28px] font-extrabold tracking-[-0.02em] text-[var(--konfrm-text-primary)]">{state.available.toLocaleString('ar-EG')} <span className="text-[16px] font-bold text-[var(--konfrm-text-secondary)]">ج.م</span></p></div>
      <div className="mt-4 flex items-center justify-between border-t border-[var(--konfrm-border-subtle)] pt-3"><span className="text-[14px] text-[var(--konfrm-text-secondary)]">معلق</span><span className="text-[16px] font-bold text-[var(--konfrm-text-primary)]">{state.pending.toLocaleString('ar-EG')} <span className="text-[13px] font-semibold text-[var(--konfrm-text-secondary)]">ج.م</span></span></div>
      <div className="mt-4 inline-flex min-h-5 items-center gap-1 text-[13px] font-bold text-[var(--konfrm-color-primary)]">عرض المحفظة <ArrowLeft className="h-3.5 w-3.5" /></div>
    </button> : <div className="h-[178px] animate-pulse rounded-[var(--konfrm-radius-elevated-card)] bg-[var(--konfrm-surface-secondary)]" />}
  </section>;
};

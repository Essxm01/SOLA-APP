import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getWalletHomeState } from '../../utils/ownerHome';

const money = (amount: number) => `${amount.toLocaleString('ar-EG')} ج.م`;

export const WalletSummarySection: React.FC = () => {
  const { wallet, walletError, refreshWallet, setActiveTab } = useApp();
  const state = getWalletHomeState(wallet, walletError);
  return <section className="space-y-3 text-right" aria-labelledby="owner-money"><div className="flex items-center justify-between"><h2 id="owner-money" className="text-lg font-extrabold text-[var(--konfrm-text-primary)]">أموالك</h2><button onClick={() => setActiveTab('wallet')} className="min-h-11 text-sm font-bold text-[var(--konfrm-color-primary)]">عرض المحفظة</button></div>{state.kind === 'error' ? <div className="flex items-center justify-between gap-3 rounded-[var(--konfrm-radius-card)] border border-[var(--konfrm-semantic-danger)] bg-[var(--konfrm-surface-primary)] p-4"><span className="flex items-center gap-2 text-sm text-[var(--konfrm-text-primary)]"><AlertCircle className="h-5 w-5 text-[var(--konfrm-semantic-danger)]" />تعذر تحميل رصيد المحفظة</span><button onClick={() => void refreshWallet()} className="min-h-11 text-sm font-bold text-[var(--konfrm-color-primary)]">إعادة المحاولة</button></div> : state.kind === 'ready' ? <div className="grid grid-cols-2 overflow-hidden rounded-[var(--konfrm-radius-card)] border border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)]"><div className="p-4"><p className="text-sm text-[var(--konfrm-text-secondary)]">متاح للسحب</p><p className="mt-1 text-xl font-extrabold text-[var(--konfrm-text-primary)]">{money(state.available)}</p></div><div className="border-r border-[var(--konfrm-border-subtle)] p-4"><p className="text-sm text-[var(--konfrm-text-secondary)]">معلق</p><p className="mt-1 text-xl font-extrabold text-[var(--konfrm-text-primary)]">{money(state.pending)}</p></div></div> : <div className="h-24 animate-pulse rounded-[var(--konfrm-radius-card)] bg-[var(--konfrm-surface-secondary)]" />}</section>;
};

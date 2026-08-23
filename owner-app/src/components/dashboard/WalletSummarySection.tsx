import React from 'react';
import { AlertCircle, Wallet, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getWalletHomeState } from '../../utils/ownerHome';

export const WalletSummarySection: React.FC = () => {
  const { wallet, walletError, refreshWallet, setActiveTab } = useApp();
  const state = getWalletHomeState(wallet, walletError);

  return (
    <section className="space-y-3 text-right" aria-labelledby="owner-money">
      {/* Section Header */}
      <div className="flex items-baseline justify-between">
        <h2 id="owner-money" className="text-lg font-black text-slate-900 tracking-tight">
          أموالك
        </h2>
        <button
          onClick={() => setActiveTab('wallet')}
          className="text-xs font-bold text-[#0059FF] hover:text-blue-700 transition-colors cursor-pointer"
        >
          عرض المحفظة
        </button>
      </div>

      {state.kind === 'error' ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-xs">
          <span className="flex items-center gap-2 text-xs font-bold text-rose-800">
            <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
            تعذر تحميل رصيد المحفظة
          </span>
          <button
            onClick={() => void refreshWallet()}
            className="text-xs font-black text-[#0059FF] hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      ) : state.kind === 'ready' ? (
        <div 
          onClick={() => setActiveTab('wallet')}
          className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
        >
          {/* Card Sub-Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#0059FF] group-hover:bg-[#0059FF] group-hover:text-white transition-colors">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-900 block">رصيد المحفظة</span>
                <span className="text-[10px] text-slate-400 font-medium">الرصيد المالي المتاح والعمليات الجارية</span>
              </div>
            </div>
            <span className="text-[10px] font-black text-[#0059FF] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100/70">
              EGP
            </span>
          </div>

          {/* Values Grid: Available (Primary) & Pending (Secondary) */}
          <div className="grid grid-cols-2 gap-4 py-1">
            {/* Primary: Available Balance */}
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-slate-500 block">
                متاح للسحب
              </span>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {state.available.toLocaleString('ar-EG')} <span className="text-xs font-bold text-slate-500">ج.م</span>
              </div>
            </div>

            {/* Secondary: Pending Balance */}
            <div className="border-r border-slate-100 pr-4 space-y-0.5">
              <span className="text-[11px] font-semibold text-slate-500 block">
                معلق
              </span>
              <div className="text-lg font-bold text-slate-600">
                {state.pending.toLocaleString('ar-EG')} <span className="text-xs font-normal text-slate-400">ج.م</span>
              </div>
            </div>
          </div>

          {/* Bottom Card Footer Link */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-[#0059FF]">
            <span>تفاصيل السحب وسجل العمليات</span>
            <span className="group-hover:translate-x-[-2px] transition-transform">←</span>
          </div>
        </div>
      ) : (
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100 border border-slate-200/60" />
      )}
    </section>
  );
};


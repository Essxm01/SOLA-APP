import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { PayoutMethodType } from '../../types';
import { Button } from '../ui/Button';
import { BottomSheet } from '../ui/BottomSheet';
import {
  MINIMUM_PAYOUT_AMOUNT,
  PAYOUT_STATUS_CONFIG,
  PAYOUT_METHOD_CONFIG,
} from '../../constants/theme';
import { AnalyticsFoundationView } from '../analytics/AnalyticsFoundationView';
import {
  Wallet,
  ArrowUpRight,
  Clock,
  Lock,
  History,
  CreditCard,
  Plus,
  Info,
} from 'lucide-react';

export const WalletFoundationView: React.FC = () => {
  const {
    wallet,
    payoutMethods,
    payoutRequests,
    walletLedger,
    createPayoutRequest,
    cancelPayoutRequestByOwner,
    addOwnerPayoutMethod,
    showToast,
  } = useApp();

  const [activeTabSection, setActiveTabSection] = useState<'overview' | 'payouts' | 'ledger' | 'analytics'>('overview');

  // BottomSheet States
  const [isPayoutSheetOpen, setIsPayoutSheetOpen] = useState(false);
  const [isAddMethodSheetOpen, setIsAddMethodSheetOpen] = useState(false);

  // Payout Form Input State
  const [payoutAmount, setPayoutAmount] = useState<number>(MINIMUM_PAYOUT_AMOUNT);
  const [selectedMethodId, setSelectedMethodId] = useState<string>((payoutMethods || [])[0]?.id || '');
  const [payoutNotes, setPayoutNotes] = useState<string>('');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  // New Method Form State
  const [newMethodType, setNewMethodType] = useState<PayoutMethodType>('INSTAPAY');
  const [newAccountTitle, setNewAccountTitle] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newBankName, setNewBankName] = useState('البنك الأهلي المصري');

  const handleRequestPayout = async () => {
    if (payoutAmount < MINIMUM_PAYOUT_AMOUNT) {
      showToast(`الحد الأدنى لطلب السحب هو ${MINIMUM_PAYOUT_AMOUNT.toLocaleString()} ج.م.`, 'error');
      return;
    }
    if (!wallet || payoutAmount > wallet.availableBalance) {
      showToast('المبلغ المطلوب يتجاوز رصيدك المتاح للسحب.', 'error');
      return;
    }
    if (!selectedMethodId) {
      showToast('يرجى اختيار وسيلة السحب.', 'error');
      return;
    }

    try {
      setIsSubmittingPayout(true);
      await createPayoutRequest({
        amount: Number(payoutAmount),
        payoutMethodId: selectedMethodId,
        notes: payoutNotes,
      });
      setIsPayoutSheetOpen(false);
      setPayoutNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const handleAddMethod = async () => {
    if (!newAccountTitle || !newAccountNumber) {
      showToast('يرجى إدخال اسم صاحب الحساب ورقم الحساب/المحفظة.', 'error');
      return;
    }

    try {
      await addOwnerPayoutMethod({
        type: newMethodType,
        accountTitle: newAccountTitle,
        accountNumberOrIban: newAccountNumber,
        bankName: newMethodType === 'BANK_TRANSFER' ? newBankName : undefined,
        isDefault: payoutMethods.length === 0,
      });
      setIsAddMethodSheetOpen(false);
      setNewAccountTitle('');
      setNewAccountNumber('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 space-y-4 dir-rtl text-right min-h-full pb-20">
      {/* Title Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-[#0059FF]" />
            <span>محفظة الأرباح والتقارير المالية</span>
          </h2>
          <p className="text-xs text-slate-500">
            متابعة مستحقاتك، طلبات السحب، الرصيد المعلق، وتدقيق العمليات المالية
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsPayoutSheetOpen(true)}
          icon={<ArrowUpRight className="w-4 h-4" />}
          className="bg-[#0059FF] font-bold text-xs py-2 px-3 shrink-0 shadow-xs"
        >
          سحب الأرباح 💸
        </Button>
      </div>

      {/* Main Balance Overview Card Stream */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-5 text-white shadow-xl space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-300">الرصيد المتاح للسحب الفوري</span>
          </div>
          <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded-full font-bold border border-amber-400/30">
            الحد الأدنى للسحب: {MINIMUM_PAYOUT_AMOUNT} ج.م
          </span>
        </div>

        <div>
          <span className="text-3xl font-black text-[#FFD700] font-mono tracking-tight block">
            {(wallet?.availableBalance ?? 0).toLocaleString()} <span className="text-base font-normal text-slate-300">ج.م</span>
          </span>
          <span className="text-[11px] text-slate-400 block pt-1">
            جاهز للتحويل الفوري إلى حسابك البنكي أو InstaPay
          </span>
        </div>

        {/* Balance Breakdown Sub-Grid */}
        <div className="grid grid-cols-3 gap-2.5 pt-2 text-xs">
          <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-xs space-y-1">
            <span className="text-[10px] text-slate-300 flex items-center gap-1 font-bold">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>معلق (التسكين)</span>
            </span>
            <span className="text-sm font-bold font-mono text-amber-300 block">
              {(wallet?.pendingBalance ?? 0).toLocaleString()} ج.م
            </span>
            <span className="text-[9px] text-slate-400 block">يتاح بعد 24س من الدخول</span>
          </div>

          <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-xs space-y-1">
            <span className="text-[10px] text-slate-300 flex items-center gap-1 font-bold">
              <ArrowUpRight className="w-3 h-3 text-blue-400" />
              <span>محجوز للسحب</span>
            </span>
            <span className="text-sm font-bold font-mono text-blue-300 block">
              {(wallet?.reservedForPayout ?? 0).toLocaleString()} ج.م
            </span>
            <span className="text-[9px] text-slate-400 block">طلبات قيد المراجعة</span>
          </div>

          <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-xs space-y-1">
            <span className="text-[10px] text-slate-300 flex items-center gap-1 font-bold">
              <Lock className="w-3 h-3 text-rose-400" />
              <span>مجمد للنزاعات</span>
            </span>
            <span className="text-sm font-bold font-mono text-rose-300 block">
              {(wallet?.heldBalance ?? 0).toLocaleString()} ج.م
            </span>
            <span className="text-[9px] text-slate-400 block">نزاع مفتوح معلق</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-slate-100 p-1 rounded-2xl flex items-center justify-between text-xs font-bold">
        <button
          onClick={() => setActiveTabSection('overview')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTabSection === 'overview' ? 'bg-white text-[#0059FF] shadow-xs' : 'text-slate-600'
          }`}
        >
          نظرة عامة
        </button>
        <button
          onClick={() => setActiveTabSection('payouts')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTabSection === 'payouts' ? 'bg-white text-[#0059FF] shadow-xs' : 'text-slate-600'
          }`}
        >
          طلبات السحب ({payoutRequests.length})
        </button>
        <button
          onClick={() => setActiveTabSection('ledger')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTabSection === 'ledger' ? 'bg-white text-[#0059FF] shadow-xs' : 'text-slate-600'
          }`}
        >
          كشف الحساب
        </button>
        <button
          onClick={() => setActiveTabSection('analytics')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTabSection === 'analytics' ? 'bg-white text-[#0059FF] shadow-xs' : 'text-slate-600'
          }`}
        >
          التحليلات 📊
        </button>
      </div>

      {/* SECTION 1: OVERVIEW */}
      {activeTabSection === 'overview' && (
        <div className="space-y-4 animate-fade-in">
          {/* Payout Methods List Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#0059FF]" />
                <span>وسائل سحب الأرباح المسجلة</span>
              </span>
              <button
                onClick={() => setIsAddMethodSheetOpen(true)}
                className="text-xs font-bold text-[#0059FF] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> إضافة حساب ➕
              </button>
            </div>

            <div className="space-y-2">
              {payoutMethods.map((method) => {
                const methodConfig = PAYOUT_METHOD_CONFIG[method.type];
                return (
                  <div
                    key={method.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{methodConfig.icon}</span>
                      <div>
                        <span className="font-bold text-slate-900 block">{method.accountTitle}</span>
                        <span className="text-[11px] text-slate-500 font-mono block">
                          {method.accountNumberOrIban}
                        </span>
                      </div>
                    </div>

                    {method.isDefault && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                        الافتراضي ✓
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operational Metrics Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] text-slate-500 font-bold block">إجمالي المسحوبات التاريخية</span>
              <span className="text-lg font-black text-slate-900 font-mono">
                {(wallet?.totalWithdrawnLifeTime ?? 0).toLocaleString()} ج.م
              </span>
              <span className="text-[10px] text-emerald-600 block font-bold">تم تحويلها بنجاح لحسابك</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] text-slate-500 font-bold block">إجمالي صافي الأرباح</span>
              <span className="text-lg font-black text-[#0059FF] font-mono">
                {(wallet?.totalEarnedLifeTime ?? 0).toLocaleString()} ج.م
              </span>
              <span className="text-[10px] text-slate-400 block">بعد خصم عمولة Sola الـ 20%</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: PAYOUT REQUESTS HISTORY */}
      {activeTabSection === 'payouts' && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">سجل طلبات سحب المستحقات المالية</span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsPayoutSheetOpen(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs py-1.5 px-3"
            >
              طلب سحب جديد
            </Button>
          </div>

          {payoutRequests.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
              لا توجد طلبات سحب سابقة مسجلة.
            </div>
          ) : (
            <div className="space-y-2.5">
              {payoutRequests.map((req) => {
                const statusCfg = PAYOUT_STATUS_CONFIG[req.status];
                return (
                  <div
                    key={req.id}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-mono text-slate-400 text-[11px]">{req.requestedAt}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                        {statusCfg.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-black text-slate-900 font-mono">
                          {req.amount.toLocaleString()} ج.م
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          الصافي بعد الرسوم: <strong className="text-slate-900 font-mono">{req.netAmount.toLocaleString()} ج.م</strong> (رسوم: {req.fee} ج.م)
                        </span>
                      </div>

                      <div className="text-left text-[11px] text-slate-600">
                        <span>{req.payoutMethod.accountTitle}</span>
                        <span className="block font-mono text-slate-400">{req.payoutMethod.type}</span>
                      </div>
                    </div>

                    {req.status === 'PENDING' && (
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={() => cancelPayoutRequestByOwner(req.id)}
                          className="text-[11px] text-rose-600 font-bold hover:underline"
                        >
                          إلغاء الطلب وتحرير المبلغ المحجوز ↩️
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: WALLET STATEMENT / LEDGER */}
      {activeTabSection === 'ledger' && (
        <div className="space-y-3 animate-fade-in">
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex items-center justify-between text-xs">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <History className="w-4 h-4" />
              <span>كشف الحساب وتدقيق المحفظة (Wallet Ledger)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Idempotence Verified</span>
          </div>

          <div className="space-y-2">
            {walletLedger.map((entry) => (
              <div
                key={entry.id}
                className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-1 text-xs"
              >
                <div className="flex items-center justify-between text-[11px] border-b border-slate-100 pb-1">
                  <span className="font-bold text-[#0059FF]">{entry.type}</span>
                  <span className="text-slate-400 font-mono">{entry.createdAt}</span>
                </div>

                <p className="text-slate-800 text-[11px] leading-relaxed">{entry.description}</p>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-slate-500 font-mono text-[10px]">Key: {entry.idempotencyKey}</span>
                  <span className="font-black text-slate-900 font-mono">{entry.amount.toLocaleString()} ج.م</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: ADVANCED PERFORMANCE ANALYTICS */}
      {activeTabSection === 'analytics' && (
        <AnalyticsFoundationView />
      )}

      {/* CREATE PAYOUT REQUEST BOTTOMSHEET */}
      <BottomSheet
        isOpen={isPayoutSheetOpen}
        onClose={() => setIsPayoutSheetOpen(false)}
        title="طلب سحب المستحقات المالية 💸"
      >
        <div className="space-y-4 dir-rtl text-right">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 leading-relaxed space-y-1 font-medium">
            <span className="font-bold block flex items-center gap-1 text-[#0059FF]">
              <Info className="w-4 h-4" /> نظام حجز الرصيد (Payout Reservation):
            </span>
            <p>
              عند تأكيد الطلب يتم آلياً حجز المبلغ المالي من <strong>الرصيد المتاح للسحب</strong> وتثبيته كـ (RESERVED_FOR_PAYOUT) لحين إتمام التحويل البنكي بواسطة Sola Admin.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-900 block">
              المبلغ المطلوب سحبه (بالجنيه المصري EGP):
            </label>
            <input
              type="number"
              min={MINIMUM_PAYOUT_AMOUNT}
              max={wallet?.availableBalance || 0}
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(Number(e.target.value))}
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-base font-black font-mono focus:outline-none focus:border-[#0059FF]"
            />
            <span className="text-[10px] text-slate-500 block">
              الحد الأدنى: {MINIMUM_PAYOUT_AMOUNT} ج.م | الرصيد المتاح حالياً: {wallet?.availableBalance.toLocaleString()} ج.م
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-900 block">اختر وسيلة السحب المفضلة:</label>
            <div className="space-y-2">
              {payoutMethods.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMethodId(m.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                    selectedMethodId === m.id
                      ? 'bg-blue-50 border-[#0059FF] ring-2 ring-blue-100 font-bold'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div>
                    <span className="block text-slate-900">{m.accountTitle}</span>
                    <span className="text-[11px] text-slate-500 font-mono">{m.accountNumberOrIban}</span>
                  </div>
                  <span className="text-xs">{PAYOUT_METHOD_CONFIG[m.type].icon}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-600">المبلغ المطلوب سحبه من الرصيد المتاح:</span>
              <span className="font-bold text-slate-900">{payoutAmount.toLocaleString()} ج.م</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>رسوم التحويل:</span>
              <span className="font-sans text-slate-700 font-bold">رسوم التحويل الفعلية حسب مزود الخدمة</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200 text-slate-900 font-bold text-sm">
              <span>المبلغ المحجوز لطلب السحب:</span>
              <span className="text-[#0059FF]">{payoutAmount.toLocaleString()} ج.م</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" size="md" fullWidth onClick={() => setIsPayoutSheetOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={handleRequestPayout}
              isLoading={isSubmittingPayout}
              className="bg-[#0059FF] font-bold"
            >
              تأكيد وحجز طلب السحب 🚀
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* ADD PAYOUT METHOD BOTTOMSHEET */}
      <BottomSheet
        isOpen={isAddMethodSheetOpen}
        onClose={() => setIsAddMethodSheetOpen(false)}
        title="إضافة وسيلة سحب جديدة 🏦"
      >
        <div className="space-y-3 dir-rtl text-right text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-800 block">نوع وسيلة السحب:</label>
            <select
              value={newMethodType}
              onChange={(e) => setNewMethodType(e.target.value as PayoutMethodType)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
            >
              <option value="INSTAPAY">أنستا باي مصر (InstaPay)</option>
              <option value="BANK_TRANSFER">تحويل بنكي (IBAN / حساب بنكي)</option>
              <option value="VODAFONE_CASH">محفظة فودافون كاش</option>
              <option value="ORANGE_CASH">محفظة أورنج كاش</option>
              <option value="ETISALAT_CASH">محفظة اتصالات كاش</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-800 block">اسم صاحب الحساب الثلاثي:</label>
            <input
              type="text"
              placeholder="مثال: أحمد الفاروق إبراهيم"
              value={newAccountTitle}
              onChange={(e) => setNewAccountTitle(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-800 block">رقم الحساب / IBAN / عنوان InstaPay:</label>
            <input
              type="text"
              placeholder="مثال: ahmed@instapay أو رقم IBAN"
              value={newAccountNumber}
              onChange={(e) => setNewAccountNumber(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono"
            />
          </div>

          {newMethodType === 'BANK_TRANSFER' && (
            <div className="space-y-1">
              <label className="font-bold text-slate-800 block">اسم البنك:</label>
              <input
                type="text"
                placeholder="مثال: البنك الأهلي المصري"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" size="md" fullWidth onClick={() => setIsAddMethodSheetOpen(false)}>
              إلغاء
            </Button>
            <Button variant="primary" size="md" fullWidth onClick={handleAddMethod} className="bg-[#0059FF] font-bold">
              حفظ الوسيلة 💾
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};

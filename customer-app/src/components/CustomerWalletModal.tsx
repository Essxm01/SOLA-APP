import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/api';
import { X, Wallet, CreditCard, Clock, CheckCircle2 } from 'lucide-react';

interface PaymentItem {
  id: string;
  bookingId: string;
  bookingNumber: string;
  propertyTitle: string;
  type: 'DEPOSIT_PAID' | 'DEPOSIT_PENDING' | 'ELECTRONIC_PAYMENT';
  title: string;
  amountEgp: number;
  currency: string;
  status: 'PAID' | 'PENDING' | 'REFUNDED';
  date?: string;
  description?: string;
}

interface CustomerWalletModalProps {
  authToken: string;
  onClose: () => void;
}

export const CustomerWalletModal: React.FC<CustomerWalletModalProps> = ({ authToken, onClose }) => {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const res = await fetch(getApiUrl('/customer/payments'), {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success && Array.isArray(json.data)) {
          setPayments(json.data);
          setError('');
        } else if (res.status === 404 || !json.success) {
          setPayments([]);
          setError('');
        } else {
          setPayments([]);
        }
      } catch {
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [authToken]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 animate-fade-in relative text-right max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-8 h-8 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-5 shrink-0">
          <div className="w-12 h-12 bg-blue-50 text-[#0059FF] rounded-2xl flex items-center justify-center mx-auto mb-2.5 shadow-xs">
            <Wallet className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-900">المحفظة والمدفوعات</h3>
          <p className="text-xs text-slate-500 font-bold mt-0.5">
            سجل العربون والمدفوعات المرتبطة بحجوزاتك
          </p>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-[#0059FF] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-bold">جاري تحميل سجل المدفوعات...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-center text-xs font-bold text-rose-700">
              {error}
            </div>
          ) : payments.length === 0 ? (
            /* Clean Zero-Data Empty State */
            <div className="py-10 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
              <div className="w-12 h-12 bg-white text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100 shadow-xs">
                <CreditCard className="w-6 h-6" />
              </div>
              <h4 className="font-black text-slate-800 text-sm mb-1">لا توجد مدفوعات حتى الآن</h4>
              <p className="text-xs text-slate-500 font-bold leading-relaxed max-w-xs mx-auto">
                عند تقديم وتأكيد طلبات الحجز، ستظهر هنا تفاصيل سداد العربون وتأكيدات الدفع الخاصة بإقاماتك.
              </p>
            </div>
          ) : (
            /* Real Payments & Deposits List */
            <div className="space-y-3">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs text-right space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900">
                        {p.amountEgp.toLocaleString()} ج.م
                      </span>
                    </div>
                    {p.status === 'PAID' ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>مدفوع</span>
                      </span>
                    ) : p.status === 'PENDING' ? (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>بانتظار السداد</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                        {p.status}
                      </span>
                    )}
                  </div>

                  <div>
                    <h5 className="font-black text-xs text-slate-800">{p.title}</h5>
                    <p className="text-[11px] text-slate-500 font-bold mt-0.5">{p.description}</p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold pt-1 border-t border-slate-100">
                    <span>رقم الحجز: {p.bookingNumber}</span>
                    {p.date && <span>{new Date(p.date).toLocaleDateString('ar-EG')}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Note at bottom */}
        <div className="mt-4 pt-3 border-t border-slate-100 text-center shrink-0">
          <p className="text-[11px] text-slate-400 font-bold">
            العربون يمثل قيمة الليلة الأولى لتثبيت الحجز، ويتم سداد المتبقي عند الاستلام.
          </p>
        </div>
      </div>
    </div>
  );
};

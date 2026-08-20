import React, { useState } from 'react';
import { getApiUrl } from '../utils/api';
import { X, Smartphone, KeyRound, ShieldCheck } from 'lucide-react';

interface CustomerAuthModalProps {
  onClose: () => void;
  onSuccess: (token: string, phone: string) => void;
  interceptedContext?: { propertyId: string; checkIn: string; checkOut: string; guests: number } | null;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  onClose,
  onSuccess,
  interceptedContext,
}) => {
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phone, setPhone] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleRequestOtp = async () => {
    if (!phone || phone.length < 10) {
      setError('يرجى كتابة رقم هاتف مصري صحيح (مثال: 01012345678)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const fullPhone = phone.startsWith('+20') ? phone : `+20${phone.replace(/^0/, '')}`;
      const res = await fetch(getApiUrl('/auth/request-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'تعذر إرسال رمز التحقق');
      }

      setStep('OTP');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!code || code.length < 4) {
      setError('يرجى كتابة كود التحقق المكون من 4 أرقام');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const fullPhone = phone.startsWith('+20') ? phone : `+20${phone.replace(/^0/, '')}`;
      const res = await fetch(getApiUrl('/auth/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, code, surface: 'CUSTOMER' }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'كود التحقق غير صحيح');
      }

      const token = json.data?.tokens?.accessToken;
      if (!token) {
        throw new Error('لم يتم استلام رمز الدخول من الخادم');
      }
      onSuccess(token, fullPhone);
    } catch (err: any) {
      setError(err.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 animate-fade-in relative">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-8 h-8 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-50 text-[#0059FF] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-900">تسجيل الدخول / إنشاء حساب</h3>
          <p className="text-xs text-slate-500 font-bold mt-1">
            ادخل رقم هاتفك لتأكيد حجزك ومتابعة تفاصيل الإقامة
          </p>

          {interceptedContext && (
            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-bold text-amber-800">
              📌 سيتم إعادتك لتأكيد حجز الوحدة مباشرة بعد إدخال كود التحقق.
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl text-center">
            {error}
          </div>
        )}

        {step === 'PHONE' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">رقم الجوال المصري</label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="01012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#0059FF]"
                />
                <Smartphone className="w-5 h-5 text-slate-400 absolute top-3.5 right-3" />
              </div>
            </div>

            <button
              onClick={handleRequestOtp}
              disabled={loading}
              className="w-full py-3.5 bg-[#0059FF] hover:bg-blue-600 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق عبر SMS'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                كود التحقق المرسل لـ ({phone})
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="1234"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-center tracking-widest text-slate-900 focus:outline-none focus:border-[#0059FF]"
                />
                <KeyRound className="w-5 h-5 text-slate-400 absolute top-3.5 right-3" />
              </div>
              <p className="text-[10px] text-slate-400 font-bold mt-1 text-center">
                الكود الافتراضي للتجربة هو: 1234
              </p>
            </div>

            <button
              onClick={handleVerifyOtp}
              disabled={loading}
              className="w-full py-3.5 bg-[#0059FF] hover:bg-blue-600 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'جاري التأكيد...' : 'تأكيد ودخول الحساب'}
            </button>

            <button
              onClick={() => setStep('PHONE')}
              className="w-full py-2 text-slate-400 hover:text-slate-600 text-xs font-bold text-center"
            >
              تغيير رقم الهاتف
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

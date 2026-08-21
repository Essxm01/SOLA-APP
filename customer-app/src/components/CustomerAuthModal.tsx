import React, { useState } from 'react';
import { getApiUrl } from '../utils/api';
import { X, Smartphone, User, CheckCircle2 } from 'lucide-react';

export interface CustomerUserProfile {
  id: string;
  phoneNumber: string;
  fullName: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  phoneVerifiedAt?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CustomerAuthModalProps {
  onClose: () => void;
  onSuccess: (token: string, phone: string, refreshToken?: string, user?: CustomerUserProfile) => void;
  interceptedContext?: { propertyId: string; checkIn: string; checkOut: string; guests: number } | null;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  onClose,
  onSuccess,
  interceptedContext,
}) => {
  const [step, setStep] = useState<'PHONE' | 'NAME_ONBOARDING'>('PHONE');
  const [phone, setPhone] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handlePhoneSubmit = async () => {
    if (!phone || phone.length < 10) {
      setError('يرجى كتابة رقم هاتف مصري صحيح (مثال: 01012345678)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const fullPhone = phone.startsWith('+20') ? phone : `+20${phone.replace(/^0/, '')}`;
      const res = await fetch(getApiUrl('/auth/prototype-login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, surface: 'CUSTOMER' }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || 'تعذر تسجيل الدخول، يرجى المحاولة مرة أخرى');
      }

      const data = json.data;
      if (data?.requiresNameOnboarding || !data?.user?.fullName) {
        setStep('NAME_ONBOARDING');
        return;
      }

      const token = data?.tokens?.accessToken;
      const refreshToken = data?.tokens?.refreshToken;
      const user = data?.user as CustomerUserProfile;

      if (!token) {
        throw new Error('لم يتم استلام رمز الدخول من الخادم');
      }

      onSuccess(token, fullPhone, refreshToken, user);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfileName = async () => {
    if (!fullName || fullName.trim().length < 2) {
      setError('يرجى إدخال اسمك بالكامل (حرفين على الأقل)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const fullPhone = phone.startsWith('+20') ? phone : `+20${phone.replace(/^0/, '')}`;
      const res = await fetch(getApiUrl('/auth/prototype-login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, surface: 'CUSTOMER', fullName: fullName.trim() }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || 'تعذر إتمام إنشاء الحساب');
      }

      const data = json.data;
      const token = data?.tokens?.accessToken;
      const refreshToken = data?.tokens?.refreshToken;
      const user = data?.user as CustomerUserProfile;

      if (!token) {
        throw new Error('لم يتم استلام رمز الدخول من الخادم');
      }

      onSuccess(token, fullPhone, refreshToken, user);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ البيانات.');
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

        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-50 text-[#0059FF] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
            <User className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-900">
            {step === 'NAME_ONBOARDING'
              ? 'أهلاً بك في كونفرم! 🎉'
              : 'تسجيل الدخول / إنشاء حساب'}
          </h3>
          <p className="text-xs text-slate-500 font-bold mt-1">
            {step === 'NAME_ONBOARDING'
              ? 'ادخل اسمك بالكامل لإتمام إنشاء حسابك ومتابعة حجزك'
              : 'ادخل رقم هاتفك لتسجيل الدخول والمتابعة'}
          </p>

          {interceptedContext && step !== 'NAME_ONBOARDING' && (
            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-bold text-amber-800 flex items-center gap-2">
              <span>📌</span>
              <span>سيتم إعادتك لتأكيد حجز الوحدة مباشرة بعد تسجيل الدخول.</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl text-center animate-fade-in">
            {error}
          </div>
        )}

        {/* Step 1: PHONE */}
        {step === 'PHONE' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">رقم الجوال المصري</label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="01012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePhoneSubmit()}
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#0059FF] transition-colors"
                />
                <Smartphone className="w-5 h-5 text-slate-400 absolute top-3.5 right-3" />
              </div>
            </div>

            <button
              onClick={handlePhoneSubmit}
              disabled={loading}
              className="w-full py-3.5 bg-[#0059FF] hover:bg-blue-600 active:scale-[0.99] text-white font-black text-xs rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'جاري التحقق...' : 'متابعة'}
            </button>
          </div>
        )}

        {/* Step 2: NAME ONBOARDING (Only for new users) */}
        {step === 'NAME_ONBOARDING' && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-2 text-xs font-bold text-blue-900">
              <CheckCircle2 className="w-4 h-4 text-[#0059FF] shrink-0" />
              <span>حساب جديد: أدخل اسمك لإتمام تسجيل حسابك في المنصة.</span>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">الاسم بالكامل (ثلاثي أو ثنائي)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="مثال: أحمد محمود علي"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveProfileName()}
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#0059FF] transition-colors"
                />
                <User className="w-5 h-5 text-slate-400 absolute top-3.5 right-3" />
              </div>
            </div>

            <button
              onClick={handleSaveProfileName}
              disabled={loading}
              className="w-full py-3.5 bg-[#0059FF] hover:bg-blue-600 active:scale-[0.99] text-white font-black text-xs rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ والدخول إلى كونفرم'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

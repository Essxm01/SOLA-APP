import React, { useState } from 'react';
import { PhoneInput } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, ArrowLeft, Lock } from 'lucide-react';

interface LoginScreenProps {
  onOTPSent?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = () => {
  const { phoneNumber, loginWithPhone } = useAuth();
  const [phone, setPhone] = useState(phoneNumber.replace('+20', ''));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, '');

    if (!cleanDigits) {
      setError('يرجى إدخال رقم الهاتف');
      return;
    }

    if (cleanDigits.length < 10 || cleanDigits.length > 11) {
      setError('يرجى إدخال رقم هاتف مصري صحيح (10 أو 11 رقم)');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const fullPhone = `+20${cleanDigits.startsWith('0') ? cleanDigits.slice(1) : cleanDigits}`;
      const result = await loginWithPhone(fullPhone);
      if (!result.success) {
        setError(result.error || 'تعذر تسجيل الدخول، يرجى التأكد من رقم المالك.');
      }
    } catch (err: any) {
      setError(err?.message || 'تعذر تسجيل الدخول، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-between p-6 dir-rtl">
      {/* Top Header */}
      <div className="pt-6 flex justify-between items-center">
        <div className="flex items-center">
          <img src="/favicon.svg" alt="Brand Logo" className="w-9 h-9 object-contain" />
        </div>
        <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full text-[#0059FF] text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>منصة موثقة</span>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="my-auto py-8 animate-fade-in max-w-md w-full mx-auto">
        <div className="mb-8 text-right">
          <h2 className="text-2xl font-black text-slate-900 mb-2">تسجيل دخول المالك</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            أدخل رقم الهاتف المسجل لديك للوصول المباشر إلى لوحة إدارة وحداتك وحجوزاتك.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <PhoneInput
            value={phone}
            onChange={(val) => {
              setPhone(val);
              if (error) setError('');
            }}
            error={error}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            icon={<ArrowLeft className="w-5 h-5" />}
            className="py-4 text-base font-bold shadow-xl shadow-blue-500/20"
          >
            دخول إلى لوحة التحكم
          </Button>
        </form>

        {/* Security note */}
        <div className="mt-8 p-4 bg-white rounded-2xl border border-slate-200/80 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#0059FF] shrink-0 mt-0.5">
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-xs text-slate-600 leading-relaxed">
            <p className="font-semibold text-slate-800 mb-0.5">إدارة آمنة ومباشرة</p>
            حسابك مخصص لمالكي ومؤجري الشاليهات المعتمدين في الساحل الشمالي.
          </div>
        </div>
      </div>

      {/* Footer terms */}
      <div className="pb-4 text-center text-xs text-slate-400">
        بمتابعتك، فإنك توافق على <span className="underline text-slate-600">شروط الخدمة</span> و <span className="underline text-slate-600">سياسة الخصوصية</span> الخاصة بـ Sola Vacation Rentals.
      </div>
    </div>
  );
};

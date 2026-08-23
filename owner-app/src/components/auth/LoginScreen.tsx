import React, { useState } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { PhoneInput } from '../ui/Input';

interface LoginScreenProps {
  onOTPSent?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = () => {
  const { phoneNumber, loginWithPhone } = useAuth();
  const [phone, setPhone] = useState(phoneNumber.replace('+20', ''));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
      if (!result.success) setError(result.error || 'تعذر تسجيل الدخول، يرجى التأكد من رقم المالك.');
    } catch (err: any) {
      setError(err?.message || 'تعذر تسجيل الدخول، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-[var(--konfrm-surface-canvas)] flex flex-col justify-between px-6 py-8 dir-rtl">
      <div className="flex items-center">
        <img src="/LOGO.svg" alt="KONFRM / كونفرم" className="h-10 w-10 object-contain" />
      </div>

      <div className="owner-entry-reveal my-auto w-full max-w-md py-8">
        <div className="mb-8 text-right">
          <p className="mb-2 text-sm font-semibold text-[var(--konfrm-color-primary)]">KONFRM / كونفرم</p>
          <h1 className="mb-2 text-2xl font-extrabold text-[var(--konfrm-text-primary)]">تسجيل دخول المالك</h1>
          <p className="text-base leading-7 text-[var(--konfrm-text-secondary)]">أدخل رقم الهاتف المسجل لحساب المالك للوصول إلى وحداتك وحجوزاتك.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <PhoneInput
            value={phone}
            onChange={(value) => {
              setPhone(value);
              if (error) setError('');
            }}
            error={error}
          />
          <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading} icon={<ArrowLeft className="h-5 w-5" />} className="min-h-12 py-3 text-base font-bold">
            دخول إلى لوحة التحكم
          </Button>
        </form>

        <div className="mt-8 flex items-start gap-3 rounded-[var(--konfrm-radius-card)] border border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] p-4">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--konfrm-radius-control)] bg-[var(--konfrm-color-primary-soft)] text-[var(--konfrm-color-primary)]">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="text-sm leading-6 text-[var(--konfrm-text-secondary)]">
            <p className="mb-0.5 font-semibold text-[var(--konfrm-text-primary)]">دخول مخصص للمالكين</p>
            إذا لم يكن رقمك مسجلًا كحساب مالك، فلن تتمكن من الدخول من هذه الشاشة.
          </div>
        </div>
      </div>

      <div className="pb-2 text-center text-xs text-[var(--konfrm-text-muted)]">بمتابعتك، فإنك توافق على شروط الخدمة وسياسة الخصوصية الخاصة بكونفرم.</div>
    </main>
  );
};

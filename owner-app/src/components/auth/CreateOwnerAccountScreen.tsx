import React, { useState } from 'react';
import { ArrowRight, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { PhoneInput } from '../ui/Input';

export const CreateOwnerAccountScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { registerOwnerWithPhone } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanName = fullName.trim();
    const digits = phone.replace(/\D/g, '');
    if (cleanName.length < 2) {
      setError('يرجى إدخال الاسم الكامل.');
      return;
    }
    if (digits.length < 10 || digits.length > 11) {
      setError('يرجى إدخال رقم هاتف مصري صحيح.');
      return;
    }
    setError('');
    setIsLoading(true);
    const normalizedPhone = `+20${digits.startsWith('0') ? digits.slice(1) : digits}`;
    const result = await registerOwnerWithPhone(normalizedPhone, cleanName);
    setIsLoading(false);
    if (!result.success) setError(result.error || 'تعذر إنشاء حساب المالك.');
  };

  return (
    <main className="min-h-screen w-full bg-[var(--konfrm-surface-canvas)] px-6 py-8 dir-rtl">
      <button type="button" onClick={onBack} className="flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--konfrm-text-secondary)]">
        <ArrowRight className="h-5 w-5" aria-hidden="true" /> العودة لتسجيل الدخول
      </button>
      <div className="owner-entry-reveal mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-md flex-col justify-center py-8">
        <img src="/LOGO.svg" alt="KONFRM / كونفرم" className="mb-8 h-12 w-12 object-contain" />
        <p className="mb-2 text-sm font-semibold text-[var(--konfrm-color-primary)]">KONFRM / كونفرم</p>
        <h1 className="mb-2 text-2xl font-extrabold text-[var(--konfrm-text-primary)]">إنشاء حساب مالك</h1>
        <p className="mb-8 text-base leading-7 text-[var(--konfrm-text-secondary)]">أنشئ حساب المالك ثم أرسل صور الهوية للمراجعة. لا يتم توثيق الحساب تلقائياً.</p>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <label className="text-right text-sm font-semibold text-[var(--konfrm-text-primary)]">
            الاسم الكامل
            <input value={fullName} onChange={(event) => { setFullName(event.target.value); if (error) setError(''); }} autoComplete="name" className="mt-2 min-h-12 w-full rounded-[var(--konfrm-radius-control)] border border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] px-4 text-base outline-none focus:border-[var(--konfrm-border-focus)]" />
          </label>
          <PhoneInput value={phone} onChange={(value) => { setPhone(value); if (error) setError(''); }} error={error} />
          <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading} icon={<UserPlus className="h-5 w-5" />} className="min-h-12 py-3 text-base font-bold">
            متابعة التوثيق
          </Button>
        </form>
      </div>
    </main>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Edit3, ArrowLeft, RefreshCw } from 'lucide-react';

interface OTPVerificationScreenProps {
  onBackToLogin: () => void;
  onSuccess: () => void;
}

export const OTPVerificationScreen: React.FC<OTPVerificationScreenProps> = ({
  onBackToLogin,
  onSuccess,
}) => {
  const { phoneNumber, verifyOTP, sendOTP } = useAuth();
  const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    // Focus first input on mount
    inputRefs[0].current?.focus();
  }, []);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[value.length - 1];
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (error) setError('');

    // Auto focus next input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = otp.join('');

    if (code.length < 4) {
      setError('يرجى إدخال كود التحقق المكون من 4 أرقام');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const valid = await verifyOTP(code);
      if (valid) {
        onSuccess();
      } else {
        setError('رمز التحقق غير صحيح، يرجى التأكد والمحاولة مرة أخرى');
      }
    } catch (err) {
      setError('حدث خطأ أثناء التحقق من الرمز');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setTimer(60);
    setError('');
    await sendOTP(phoneNumber);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-between p-6 dir-rtl">
      {/* Top Bar */}
      <div className="pt-4 flex items-center justify-between">
        <button
          onClick={onBackToLogin}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm"
        >
          <Edit3 className="w-4 h-4 text-[#0059FF]" />
          <span>تغيير رقم الهاتف</span>
        </button>
        <span className="text-xs font-bold text-slate-400">تأكيد الهوية</span>
      </div>

      {/* Main Content */}
      <div className="my-auto py-6 animate-fade-in max-w-md w-full mx-auto text-right">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0059FF] mb-6 shadow-sm">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-slate-900 mb-2">إدخال رمز التحقق (OTP)</h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          تم إرسال كود التأكيد المكون من 4 أرقام عبر SMS إلى الرقم:
          <span className="font-bold text-slate-900 mx-1 dir-ltr inline-block">{phoneNumber}</span>
        </p>

        {/* OTP Inputs */}
        <form onSubmit={handleVerify} className="flex flex-col gap-6">
          <div className="flex items-center justify-center gap-3 dir-ltr">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={inputRefs[index]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-14 h-16 text-center text-2xl font-bold bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:border-[#0059FF] focus:ring-4 focus:ring-blue-100 transition-all"
              />
            ))}
          </div>

          {error && <p className="text-xs text-rose-600 font-semibold text-center">{error}</p>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            icon={<ArrowLeft className="w-5 h-5" />}
            className="py-4 text-base font-bold shadow-xl shadow-blue-500/20"
          >
            تأكيد وتأمين الدخول
          </Button>
        </form>

        {/* Resend Timer */}
        <div className="mt-8 text-center">
          {canResend ? (
            <button
              onClick={handleResend}
              className="inline-flex items-center gap-2 text-sm font-bold text-[#0059FF] hover:underline"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة إرسال رمز التحقق الآن</span>
            </button>
          ) : (
            <p className="text-xs text-slate-500 font-medium">
              إعادة إرسال الرمز بعد{' '}
              <span className="font-bold text-slate-900 font-mono">
                00:{timer < 10 ? `0${timer}` : timer}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="pb-4 text-center text-xs text-slate-400">
        هل واجهتك مشكلة؟ تواصل مع الدعم الفني لـ Sola
      </div>
    </div>
  );
};

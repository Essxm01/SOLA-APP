import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { AlertBanner } from './ui/StateViews';
import { getApiUrl } from '../utils/api';

export interface AdminLoginProps {
  onLoginSuccess: (adminData: any, token: string) => void;
}

export function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState<string>('admin@sola.com');
  const [password, setPassword] = useState<string>('AdminPassword2026!');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(getApiUrl('/admin/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'فشل تسجيل الدخول. تحقق من اسم المستخدم وكلمة المرور.');
      }

      const { tokens, admin } = json.data;
      localStorage.setItem('sola_admin_access_token', tokens.accessToken);
      localStorage.setItem('sola_admin_user', JSON.stringify(admin));
      onLoginSuccess(admin, tokens.accessToken);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4 dir-rtl" dir="rtl">
      <div className="max-w-md w-full space-y-6 animate-fade-in">
        
        {/* Header Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#0059FF] via-blue-600 to-sky-400 flex items-center justify-center font-black text-white text-3xl shadow-xl mx-auto border border-white/20">
            S
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">SOLA VACATION RENTALS</h1>
          <p className="text-xs text-slate-500 font-semibold">بوابة دخول الإدارة والتشغيل</p>
        </div>

        {/* Login Card */}
        <Card className="p-6 bg-white shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {error && (
              <AlertBanner type="error" message={error} onClose={() => setError(null)} />
            )}

            <Input
              type="email"
              label="البريد الإلكتروني:"
              placeholder="admin@sola.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4 text-slate-400" />}
              required
            />

            <Input
              type="password"
              label="كلمة المرور:"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4 text-slate-400" />}
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={loading}
                icon={<ShieldCheck className="w-5 h-5" />}
              >
                تسجيل الدخول لبوابة الإدارة
              </Button>
            </div>

            <div className="text-center text-[11px] text-slate-400 font-semibold pt-2 border-t border-slate-100">
              جميع العمليات والجلسات مشفرة ومسجلة بسجلات Audit Logs 🔒
            </div>

          </form>
        </Card>

      </div>
    </div>
  );
}

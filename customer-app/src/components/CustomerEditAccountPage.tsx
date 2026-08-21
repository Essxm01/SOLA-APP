import React, { useState, useEffect } from 'react';
import { ArrowRight, User, Phone, Mail, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getApiUrl } from '../utils/api';
import type { CustomerUserProfile } from './CustomerAuthModal';

interface CustomerEditAccountPageProps {
  user: CustomerUserProfile | null;
  customerPhone?: string | null;
  authToken: string;
  onBack: () => void;
  onUpdated: (user: CustomerUserProfile) => void;
}

export const CustomerEditAccountPage: React.FC<CustomerEditAccountPageProps> = ({
  user,
  customerPhone,
  authToken,
  onBack,
  onUpdated,
}) => {
  const [fullName, setFullName] = useState<string>(user?.fullName || '');
  const [email, setEmail] = useState<string>(user?.email || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<CustomerUserProfile | null>(user);

  // Sync state if user prop updates
  useEffect(() => {
    if (user) {
      setCurrentUser(user);
      if (!fullName) setFullName(user.fullName || '');
      if (!email) setEmail(user.email || '');
    }
  }, [user]);

  // If user profile is not provided or incomplete, fetch canonical profile from API
  useEffect(() => {
    if ((!user || !user.fullName) && authToken) {
      fetch(getApiUrl('/customer/profile'), {
        headers: { Authorization: `Bearer ${authToken}` },
      })
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setCurrentUser(json.data);
            setFullName(json.data.fullName || '');
            setEmail(json.data.email || '');
          }
        })
        .catch(() => {});
    }
  }, [user, authToken]);

  const resolvedPhone = currentUser?.phoneNumber || customerPhone || '';
  const isPhoneVerified = !!currentUser?.phoneVerifiedAt;

  // Derive initials from full name
  const getInitials = (name?: string | null) => {
    if (!name || name.trim().length === 0) return 'م';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2);
    return `${parts[0][0]}.${parts[1][0]}`;
  };

  // Validation logic
  const trimmedName = fullName.trim();
  const trimmedEmail = email.trim();
  const isNameValid = trimmedName.length >= 2;
  const isEmailValid = trimmedEmail.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const isFormValid = isNameValid && isEmailValid;

  // Change detection
  const initialName = (currentUser?.fullName || '').trim();
  const initialEmail = (currentUser?.email || '').trim();
  const hasChanged = trimmedName !== initialName || trimmedEmail !== initialEmail;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isFormValid || !hasChanged || loading) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const patchBody: any = { fullName: trimmedName };
      if (trimmedEmail.length > 0) {
        patchBody.email = trimmedEmail;
      }

      const res = await fetch(getApiUrl('/customer/profile'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(patchBody),
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (!res.ok || (json && json.success === false)) {
        if (res.status === 401 || json?.error?.code === 'INVALID_TOKEN' || json?.error?.code === 'UNAUTHORIZED') {
          // Token expired: attempt refresh
          const refreshToken = localStorage.getItem('sola_customer_refresh_token');
          if (refreshToken) {
            const refreshRes = await fetch(getApiUrl('/auth/refresh'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });
            const refreshJson = await refreshRes.json();
            if (refreshRes.ok && refreshJson.success && refreshJson.data?.accessToken) {
              const newTok = refreshJson.data.accessToken;
              localStorage.setItem('sola_customer_access_token', newTok);
              // Retry PATCH with refreshed token
              const retryRes = await fetch(getApiUrl('/customer/profile'), {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${newTok}`,
                },
                body: JSON.stringify(patchBody),
              });
              const retryJson = await retryRes.json();
              if (retryRes.ok && retryJson.success) {
                const updatedData: CustomerUserProfile = retryJson.data;
                setCurrentUser(updatedData);
                onUpdated(updatedData);
                setSuccessMsg('تم حفظ التغييرات بنجاح');
                setTimeout(() => onBack(), 700);
                return;
              }
            }
          }
          throw new Error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.');
        }
        throw new Error(json?.error?.message || 'تعذر حفظ البيانات. يرجى المحاولة مرة أخرى.');
      }

      const updatedData: CustomerUserProfile = (json?.data || {
        ...currentUser,
        id: currentUser?.id || 'cust-user',
        phoneNumber: resolvedPhone,
        fullName: trimmedName,
        email: trimmedEmail.length > 0 ? trimmedEmail : null,
        phoneVerifiedAt: currentUser?.phoneVerifiedAt || null,
        status: currentUser?.status || 'ACTIVE',
      }) as CustomerUserProfile;

      setCurrentUser(updatedData);
      onUpdated(updatedData);
      setSuccessMsg('تم حفظ التغييرات بنجاح');

      // Auto-return to Account Hub after brief confirmation
      setTimeout(() => {
        onBack();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-right animate-fade-in pb-24">
      {/* Top Header Bar with Clean Back Action */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-4 py-3.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              title="العودة للحساب"
              className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center justify-center transition-colors border border-slate-200"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <h1 className="text-base font-black text-slate-900">تعديل الحساب</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-5">
        {/* Top Profile Summary Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs text-center space-y-3">
          <div className="w-20 h-20 bg-slate-900 text-white rounded-3xl flex items-center justify-center font-black text-2xl mx-auto shadow-sm">
            {getInitials(trimmedName || currentUser?.fullName)}
          </div>
          <div>
            <h2 className="font-black text-slate-900 text-base">
              {trimmedName || currentUser?.fullName || 'مستأجر'}
            </h2>
            <div className="mt-1 flex items-center justify-center">
              <bdi
                dir="ltr"
                style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
                className="text-xs text-slate-400 font-bold tracking-wide"
              >
                {resolvedPhone}
              </bdi>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSave} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          {/* Inline Alert / Error / Success Feedback */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs font-bold text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Field 1: Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-800">
              الاسم الكامل <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="الاسم الثلاثي أو الثنائي"
                className={`w-full pl-4 pr-10 py-3 bg-slate-50 border ${
                  !isNameValid && trimmedName.length > 0 ? 'border-rose-300' : 'border-slate-200'
                } rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0059FF] focus:bg-white transition-colors`}
              />
              <User className="w-4 h-4 text-slate-400 absolute top-3.5 right-3.5" />
            </div>
            <p className="text-[11px] text-slate-400 font-bold">
              الاسم المستخدم في حسابك على كونفرم
            </p>
          </div>

          {/* Field 2: Phone Number (Read-Only) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-slate-800">
                رقم الهاتف
              </label>
              {isPhoneVerified && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>موثق</span>
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                readOnly
                disabled
                dir="ltr"
                value={resolvedPhone}
                style={{ direction: 'ltr', unicodeBidi: 'isolate', textAlign: 'left' }}
                className="w-full pl-4 pr-10 py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 cursor-not-allowed select-none"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute top-3.5 right-3.5" />
            </div>
            <p className="text-[11px] text-slate-400 font-bold">
              رقم الهاتف مرتبط بالحساب وهوية الحجز الرسمية ولا يمكن تغييره من هنا
            </p>
          </div>

          {/* Field 3: Email (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-slate-800">
                البريد الإلكتروني
              </label>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                اختياري
              </span>
            </div>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="name@example.com"
                className={`w-full pl-4 pr-10 py-3 bg-slate-50 border ${
                  !isEmailValid ? 'border-rose-300' : 'border-slate-200'
                } rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0059FF] focus:bg-white transition-colors dir-ltr text-right`}
              />
              <Mail className="w-4 h-4 text-slate-400 absolute top-3.5 right-3.5" />
            </div>
            {!isEmailValid && (
              <p className="text-[11px] text-rose-500 font-bold">
                يرجى إدخال بريد إلكتروني صالح أو تركه فارغاً
              </p>
            )}
          </div>

          {/* Save UX Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!isFormValid || !hasChanged || loading}
              className={`w-full py-3.5 font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 ${
                isFormValid && hasChanged && !loading
                  ? 'bg-[#0059FF] hover:bg-blue-600 active:scale-[0.99] text-white shadow-blue-500/25 shadow-md cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <span>حفظ التغييرات</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

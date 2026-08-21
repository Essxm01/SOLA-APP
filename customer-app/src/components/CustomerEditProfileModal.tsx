import React, { useState } from 'react';
import { getApiUrl } from '../utils/api';
import { X, User, Check, ShieldCheck } from 'lucide-react';
import type { CustomerUserProfile } from './CustomerAuthModal';

interface CustomerEditProfileModalProps {
  user: CustomerUserProfile;
  authToken: string;
  onClose: () => void;
  onUpdated: (user: CustomerUserProfile) => void;
}

export const CustomerEditProfileModal: React.FC<CustomerEditProfileModalProps> = ({
  user,
  authToken,
  onClose,
  onUpdated,
}) => {
  const [fullName, setFullName] = useState<string>(user.fullName || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!fullName || fullName.trim().length < 2) {
      setError('يرجى إدخال اسم صحيح يتكون من حرفين على الأقل');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(getApiUrl('/customer/profile'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ fullName: fullName.trim() }),
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (!res.ok || (json && json.success === false)) {
        throw new Error(json?.error?.message || 'تعذر تعديل البيانات');
      }

      const updatedUser: CustomerUserProfile = (json?.data || { ...user, fullName: fullName.trim() }) as CustomerUserProfile;
      onUpdated(updatedUser);
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في الاتصال بالخادم.');
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
          <div className="w-12 h-12 bg-blue-50 text-[#0059FF] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
            <User className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-900">تعديل بيانات الحساب</h3>
          <p className="text-xs text-slate-500 font-bold mt-1">
            قم بتحديث اسمك المعروض على طلبات الحجز والتواصل
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">الاسم بالكامل</label>
            <div className="relative">
              <input
                type="text"
                placeholder="أحمد محمود علي"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#0059FF] transition-colors"
              />
              <User className="w-5 h-5 text-slate-400 absolute top-3.5 right-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">رقم الهاتف (موثق)</label>
            <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 flex items-center justify-between">
              <span className="dir-ltr">{user.phoneNumber}</span>
              <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> موثق
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold mt-1">
              رقم الهاتف مرتبط بالحساب وهوية الحجز الرسمية
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#0059FF] hover:bg-blue-600 active:scale-[0.99] text-white font-black text-xs rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 mt-2"
          >
            {loading ? 'جاري الحفظ...' : (
              <>
                <Check className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

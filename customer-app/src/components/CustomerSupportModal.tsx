import React from 'react';
import { X, Headphones, MessageCircle, Phone, Mail, ShieldCheck } from 'lucide-react';

interface CustomerSupportModalProps {
  onClose: () => void;
}

export const CustomerSupportModal: React.FC<CustomerSupportModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 animate-fade-in relative text-right">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-8 h-8 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Headphones className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-900">مركز الدعم والمساعدة</h3>
          <p className="text-xs text-slate-500 font-bold mt-1">
            فريق خدمة عملاء صولا متواجد لمساعدتك طوال أيام الأسبوع
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <a
            href="https://wa.me/201012345678"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-xs">تواصل عبر واتساب</h4>
                <p className="text-[11px] text-slate-500 font-bold">رد سريع ومباشر على مدار الساعة</p>
              </div>
            </div>
            <span className="text-xs font-black text-emerald-700 bg-emerald-100/60 px-2.5 py-1 rounded-lg">
              محادثة
            </span>
          </a>

          <a
            href="tel:+201012345678"
            className="p-4 bg-blue-50/60 hover:bg-blue-50 border border-blue-200/80 rounded-2xl flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0059FF] text-white rounded-xl flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-xs">الاتصال الهاتفي</h4>
                <p className="text-[11px] text-slate-500 font-bold">متاح يومياً من 9:00 ص إلى 11:00 م</p>
              </div>
            </div>
            <span className="text-xs font-black text-blue-700 bg-blue-100/60 px-2.5 py-1 rounded-lg">
              اتصال
            </span>
          </a>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 text-slate-700 rounded-xl flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 text-xs">البريد الإلكتروني للدعم</h4>
              <p className="text-xs text-slate-600 font-bold dir-ltr text-right">support@sola.eg</p>
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>صولا تضمن حماية جميع حجوزاتك ومستحقاتك المالية بنسبة 100%.</span>
        </div>
      </div>
    </div>
  );
};

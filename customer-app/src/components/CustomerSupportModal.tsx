import React from 'react';
import { X, HelpCircle, Shield, FileText, CheckCircle2 } from 'lucide-react';

interface CustomerSupportModalProps {
  onClose: () => void;
}

export const CustomerSupportModal: React.FC<CustomerSupportModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 animate-fade-in relative text-right max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-8 h-8 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-5 shrink-0">
          <div className="w-12 h-12 bg-blue-50 text-[#0059FF] rounded-2xl flex items-center justify-center mx-auto mb-2.5 shadow-xs">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-900">المساعدة وإرشادات الحجز</h3>
          <p className="text-xs text-slate-500 font-bold mt-0.5">
            دليلك لتأكيد وإدارة حجوزاتك على منصة كونفرم
          </p>
        </div>

        {/* FAQ Guide Sections */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-right">
            <div className="flex items-center gap-2 text-slate-900 font-black text-xs">
              <CheckCircle2 className="w-4 h-4 text-[#0059FF] shrink-0" />
              <span>كيفية تأكيد الحجز</span>
            </div>
            <p className="text-[11px] text-slate-500 font-bold leading-relaxed pr-6">
              بعد موافقة المالك على طلبك، يتم سداد العربون (قيمة الليلة الأولى) لتثبيت الحجز رسمياً وحظر التواريخ من أي طلبات أخرى.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-right">
            <div className="flex items-center gap-2 text-slate-900 font-black text-xs">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>أمان وموثوقية الإقامة</span>
            </div>
            <p className="text-[11px] text-slate-500 font-bold leading-relaxed pr-6">
              جميع الوحدات المعروضة تخضع للمراجعة الميدانية والتحقق من ملكية العقار لضمان استلامك للوحدة بنفس المواصفات المعلنة.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-right">
            <div className="flex items-center gap-2 text-slate-900 font-black text-xs">
              <FileText className="w-4 h-4 text-blue-600 shrink-0" />
              <span>طريقة سداد المتبقي</span>
            </div>
            <p className="text-[11px] text-slate-500 font-bold leading-relaxed pr-6">
              المبلغ المتبقي من قيمة الإقامة يتم سداده عند الوصول والاستلام المباشر للوحدة بالتنسيق مع المالك.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-right">
            <div className="flex items-center gap-2 text-slate-900 font-black text-xs">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>التواصل والتنسيق</span>
            </div>
            <p className="text-[11px] text-slate-500 font-bold leading-relaxed pr-6">
              عند تأكيد الحجز، تظهر تفاصيل الحجز كاملة في تبويب «حجوزاتي» لمتابعة مواعيد الوصول والمغادرة.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 text-center shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

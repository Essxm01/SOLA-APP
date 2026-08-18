import React from 'react';
import { CheckCircle2, CalendarCheck, ShieldCheck } from 'lucide-react';

interface BookingSuccessModalProps {
  bookingNumber: string;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  depositAmount: number;
  onGoToBookings: () => void;
  onClose: () => void;
}

export const BookingSuccessModal: React.FC<BookingSuccessModalProps> = ({
  bookingNumber,
  propertyTitle,
  checkIn,
  checkOut,
  nights,
  depositAmount,
  onGoToBookings,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-100 shadow-2xl animate-fade-in text-center space-y-4">
        <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[10px] font-black px-3 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
            رقم الطلب: {bookingNumber}
          </span>
          <h3 className="text-lg font-black text-slate-900 mt-2">تم إرسال طلبك للمالك بنجاح ⏳</h3>
          <p className="text-xs text-slate-500 font-bold mt-1">
            تم استلام طلب الحجز وجاري مراجعته الآن من قبل المالك.
          </p>
        </div>

        {/* Summary Card */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-right space-y-2 text-xs font-bold">
          <div className="flex justify-between text-slate-800">
            <span>الوحدة الساحلية:</span>
            <span className="font-black text-slate-900 truncate max-w-[200px]">{propertyTitle}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>تاريخ الإقامة ({nights} ليالي):</span>
            <span>{checkIn} ➔ {checkOut}</span>
          </div>
          <div className="flex justify-between text-[#0059FF] font-black pt-1 border-t border-slate-200">
            <span>العربون المطلوب بعد موافقة المالك:</span>
            <span className="dir-ltr">{depositAmount.toLocaleString()} ج.م</span>
          </div>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2 text-xs font-bold text-blue-900 text-right">
          <ShieldCheck className="w-4 h-4 text-[#0059FF] shrink-0 mt-0.5" />
          <span>
            سيتم إرسال إشعار لك فور موافقة المالك، لتتمكن من دفع العربون وتأكيد الحجز رسمياً.
          </span>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={onGoToBookings}
            className="w-full py-3.5 bg-[#0059FF] text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>متابعة حالة الطلب في حجوزاتي</span>
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 text-slate-400 font-bold text-xs"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    </div>
  );
};

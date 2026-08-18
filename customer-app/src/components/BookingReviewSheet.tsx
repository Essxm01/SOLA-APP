import React from 'react';
import { CustomerPropertyItem } from './PropertyCard';
import { X, Calendar, Users, ShieldCheck, ArrowRight } from 'lucide-react';

interface BookingReviewSheetProps {
  property: CustomerPropertyItem;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  firstNightPrice: number;
  totalBookingValue: number;
  depositAmount: number;
  remainingBalance: number;
  onClose: () => void;
  onConfirmSubmit: () => void;
  onEditDetails: () => void;
  isSubmitting?: boolean;
}

export const BookingReviewSheet: React.FC<BookingReviewSheetProps> = ({
  property,
  checkIn,
  checkOut,
  guests,
  nights,
  firstNightPrice,
  totalBookingValue,
  depositAmount,
  remainingBalance,
  onClose,
  onConfirmSubmit,
  onEditDetails,
  isSubmitting = false,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 border border-slate-100 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto space-y-4">
        {/* Sheet Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button onClick={onEditDetails} className="p-1 text-slate-400 hover:text-slate-700">
              <ArrowRight className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-black text-slate-900">مراجعة طلب الحجز قبل الإرسال</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Property Summary */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
          <img
            src={property.images && property.images.length > 0 ? property.images[0] : 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'}
            alt=""
            className="w-16 h-16 object-cover rounded-xl shrink-0"
          />
          <div className="overflow-hidden">
            <h4 className="font-black text-slate-900 text-xs truncate">{property.title}</h4>
            <p className="text-[11px] text-slate-500 font-bold truncate mt-0.5">{property.address}</p>
            <span className="inline-block mt-1 text-[10px] font-extrabold px-2 py-0.5 bg-blue-50 text-[#0059FF] rounded-md">
              إقامة موثقة من صولا
            </span>
          </div>
        </div>

        {/* Selected Dates & Capacity Summary */}
        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-[10px] text-slate-400 block mb-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#0059FF]" />
              <span>تواريخ الإقامة ({nights} ليالي)</span>
            </span>
            <span className="text-slate-800 font-black text-[11px] block">{checkIn} ➔ {checkOut}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-[10px] text-slate-400 block mb-0.5 flex items-center gap-1">
              <Users className="w-3 h-3 text-[#0059FF]" />
              <span>عدد الأفراد</span>
            </span>
            <span className="text-slate-800 font-black text-[11px] block">{guests} أفراد إقامة</span>
          </div>
        </div>

        {/* Financial Transparency Disclosure */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 text-xs">
          <div className="flex justify-between text-slate-300">
            <span>سعر الليلة الواحدة:</span>
            <span className="font-bold">{firstNightPrice.toLocaleString()} ج.م</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>إجمالي الإقامة الكاملة ({nights} ليالي):</span>
            <span className="font-bold">{totalBookingValue.toLocaleString()} ج.م</span>
          </div>
          <hr className="border-slate-800 my-1" />
          <div className="flex justify-between text-[#FFD700] font-black text-sm">
            <span>العربون المطلوب عند الموافقة (ليلة واحدة):</span>
            <span className="dir-ltr">{depositAmount.toLocaleString()} ج.م</span>
          </div>
          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>المبلغ المتبقي يدفعه النزيل كاش للمالك يوم الاستلام:</span>
            <span className="dir-ltr">{remainingBalance.toLocaleString()} ج.م</span>
          </div>
        </div>

        {/* Human Workflow Rules Banner */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2 text-xs font-bold text-amber-900 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            سيتم إرسال طلبك إلى المالك للموافقة أولاً. لن يتم خصم العربون قبل موافقة المالك على إقامتك. 
            (ملاحظة: سيتم التحقق من توفر التواريخ مرة أخرى عند إرسال الطلب).
          </span>
        </div>

        {/* Primary Action CTAs */}
        <div className="space-y-2 pt-1">
          <button
            onClick={onConfirmSubmit}
            disabled={isSubmitting}
            className="w-full py-3.5 bg-[#0059FF] hover:bg-blue-600 text-white font-black text-xs rounded-xl shadow-md transition-all"
          >
            {isSubmitting ? 'جاري إرسال الطلب للمالك...' : 'إرسال طلب الحجز'}
          </button>
          <button
            onClick={onEditDetails}
            className="w-full py-2 text-slate-400 hover:text-slate-700 font-bold text-xs"
          >
            تعديل التواريخ والتفاصيل
          </button>
        </div>
      </div>
    </div>
  );
};

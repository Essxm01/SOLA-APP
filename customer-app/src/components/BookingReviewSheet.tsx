/**
 * SOLA Customer App — BookingReviewSheet
 * White-dominant, mobile bottom sheet for final booking review before submission.
 *
 * Rules:
 * - STRICTLY NO DARK NAVY SURFACES.
 * - Dominant color: White #FFFFFF.
 * - Primary accent: SOLA Blue #0059FF.
 * - Secondary accent: SOLA Summer Yellow #FFD700.
 * - Transparent 1-night deposit disclosure with owner approval notice.
 */

import React from 'react';
import { CustomerPropertyItem } from './PropertyCard';
import { X, Calendar, Users, ShieldCheck, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

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
  submitError?: string | null;
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
  submitError,
}) => {
  const propertyImage =
    property.images && property.images.length > 0
      ? property.images[0]
      : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end justify-center p-0 animate-fade-in" dir="rtl">
      <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-5 border-t border-slate-200 shadow-2xl max-h-[92vh] overflow-y-auto space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEditDetails}
              className="p-1.5 -mr-1.5 text-slate-400 hover:text-slate-700 active:scale-95 transition-all"
              aria-label="تعديل التفاصيل"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-black text-slate-900">مراجعة طلب الحجز قبل الإرسال</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center transition-all"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Property Summary Card */}
        <div className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80">
          {propertyImage ? (
            <img
              src={propertyImage}
              alt={property.title}
              className="w-16 h-16 object-cover rounded-xl shrink-0 bg-slate-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl shrink-0 bg-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-bold text-center p-1">
              لا توجد صورة
            </div>
          )}
          <div className="overflow-hidden flex-1">
            <h4 className="font-black text-slate-900 text-xs truncate leading-snug">
              {property.title}
            </h4>
            <p className="text-[11px] text-slate-500 font-bold truncate mt-0.5">
              {property.address || 'الساحل الشمالي'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 bg-blue-50 text-[#0059FF] rounded-md border border-blue-100">
                <ShieldCheck className="w-3 h-3 text-[#0059FF]" />
                <span>إقامة موثقة</span>
              </span>
            </div>
          </div>
        </div>

        {/* Dates & Guests Details */}
        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 block mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#0059FF]" />
              <span>تواريخ الإقامة ({nights} ليالي)</span>
            </span>
            <div className="text-slate-900 font-black text-[11px] dir-ltr text-right">
              {checkIn} ← {checkOut}
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 block mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#0059FF]" />
              <span>عدد الضيوف</span>
            </span>
            <div className="text-slate-900 font-black text-[11px]">
              {guests} {guests === 1 ? 'ضيف واحد' : 'ضيوف'}
            </div>
          </div>
        </div>

        {/* Financial Transparency Disclosure (Clean White Card - ZERO DARK NAVY) */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2.5 text-xs shadow-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span className="font-bold">سعر الليلة الواحدة:</span>
            <span className="font-black text-slate-900">{firstNightPrice.toLocaleString()} ج.م</span>
          </div>

          <div className="flex justify-between items-center text-slate-600">
            <span className="font-bold">إجمالي الإقامة الكاملة ({nights} ليالي):</span>
            <span className="font-black text-slate-900">{totalBookingValue.toLocaleString()} ج.م</span>
          </div>

          <hr className="border-slate-100 my-1" />

          <div className="flex justify-between items-center bg-blue-50/80 p-2.5 rounded-xl border border-blue-100">
            <div>
              <div className="flex items-center gap-1 text-[#0059FF] font-black text-xs">
                <span className="w-2 h-2 rounded-full bg-[#FFD700]"></span>
                <span>العربون المطلوب عند الموافقة (ليلة واحدة):</span>
              </div>
              <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                (يتم سداده إلكترونياً بعد قبول المالك فقط)
              </span>
            </div>
            <span className="text-sm font-black text-[#0059FF] dir-ltr">
              {depositAmount.toLocaleString()} ج.م
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-500 text-[11px] pt-1 px-1">
            <span className="font-bold">المبلغ المتبقي:</span>
            <span className="font-black text-slate-700 dir-ltr">
              {remainingBalance.toLocaleString()} ج.م
            </span>
          </div>
        </div>

        {/* Human Workflow Rules Notice */}
        <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-xs font-bold text-amber-950 leading-relaxed">
          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[11px]">
            <p className="font-black text-amber-900 mb-0.5">
              سيتم إرسال طلبك إلى المالك للموافقة أولاً.
            </p>
            <p className="text-amber-800/90 font-medium">
              لن يتم تحصيل أي مبالغ الآن. ستصلك رسالة فور موافقة المالك لتتمكن من دفع العربون وتثبيت الحجز.
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-2 pt-1">
          {submitError && (
            <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-[11px] font-bold leading-relaxed">
              {submitError}
            </div>
          )}
          <button
            type="button"
            onClick={onConfirmSubmit}
            disabled={isSubmitting}
            className="w-full py-3.5 bg-[#0059FF] hover:bg-blue-600 active:scale-98 text-white font-black text-sm rounded-2xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>جاري إرسال الطلب...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>إرسال طلب الحجز للمالك</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onEditDetails}
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-black text-xs rounded-xl transition-all"
          >
            تعديل التواريخ والتفاصيل
          </button>
        </div>

      </div>
    </div>
  );
};

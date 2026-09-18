/**
 * SOLA Customer App — BookingReviewSheet
 * White-dominant, mobile bottom sheet for final booking review before submission.
 *
 * Screen 07 Narrow Truth Fixes (C3):
 * - Remove unconditional verified host badge.
 * - Accept canonical property detail fields (canonicalTitle, canonicalLocation, canonicalImage).
 * - Financials strictly bound to canonical server quote.
 * - Clear model preserved: إرسال الطلب ≠ دفع ≠ تأكيد حجز.
 */

import React from 'react';
import { CustomerPropertyItem } from './PropertyCard';
import { X, Calendar, Users, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { formatArabicStayRange } from '../utils/searchIntent';

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
  canonicalTitle?: string;
  canonicalLocation?: string;
  canonicalImage?: string | null;
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
  canonicalTitle,
  canonicalLocation,
  canonicalImage,
}) => {
  const propertyImage =
    canonicalImage !== undefined
      ? canonicalImage
      : property.images && property.images.length > 0
      ? property.images[0]
      : null;

  const resolvedTitle = canonicalTitle || property.title;
  const resolvedLocation =
    canonicalLocation ||
    property.address?.trim() ||
    property.resortName?.trim() ||
    property.region?.trim() ||
    null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end justify-center p-0 animate-fade-in" dir="rtl">
      <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-5 border-t border-slate-200 shadow-2xl max-h-[92vh] overflow-y-auto space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEditDetails}
              className="min-w-[44px] min-h-[44px] -mr-2 text-slate-400 hover:text-slate-700 active:scale-95 transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/40 rounded-xl"
              aria-label="تعديل التفاصيل"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-bold text-slate-900">مراجعة طلب الحجز قبل الإرسال</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/40 rounded-full"
            aria-label="إغلاق"
          >
            <span className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center transition-all">
              <X className="w-4 h-4" />
            </span>
          </button>
        </div>

        {/* Property Summary Card */}
        <div className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80">
          {propertyImage ? (
            <img
              src={propertyImage}
              alt={resolvedTitle}
              className="w-16 h-16 object-cover rounded-xl shrink-0 bg-slate-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl shrink-0 bg-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-bold text-center p-1">
              لا توجد صورة
            </div>
          )}
          <div className="overflow-hidden flex-1">
            <h4 className="font-bold text-slate-900 text-xs truncate leading-snug">
              {resolvedTitle}
            </h4>
            {resolvedLocation && (
              <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                {resolvedLocation}
              </p>
            )}
          </div>
        </div>

        {/* Dates & Guests Details */}
        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 block mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#0059FF]" />
              <span>تواريخ الإقامة ({nights} ليالي)</span>
            </span>
            <div className="text-slate-900 font-bold text-[11px] text-right">
              {formatArabicStayRange(checkIn, checkOut) || `${checkIn} ← ${checkOut}`}
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 block mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#0059FF]" />
              <span>عدد الضيوف</span>
            </span>
            <div className="text-slate-900 font-bold text-[11px]">
              {guests} {guests === 1 ? 'ضيف واحد' : 'ضيوف'}
            </div>
          </div>
        </div>

        {/* Financial Transparency Disclosure (Clean White Card - ZERO DARK NAVY) */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2.5 text-xs shadow-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span className="font-medium">سعر الليلة الواحدة:</span>
            <span className="font-bold text-slate-900">{firstNightPrice.toLocaleString()} ج.م</span>
          </div>

          <div className="flex justify-between items-center text-slate-600">
            <span className="font-medium">إجمالي الإقامة الكاملة ({nights} ليالي):</span>
            <span className="font-bold text-slate-900">{totalBookingValue.toLocaleString()} ج.م</span>
          </div>

          <hr className="border-slate-100 my-1" />

          <div className="flex justify-between items-center bg-blue-50/80 p-2.5 rounded-xl border border-blue-100">
            <div>
              <div className="flex items-center gap-1 text-[#0059FF] font-bold text-xs">
                <span>العربون بعد موافقة المالك:</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                (ليلة واحدة فقط)
              </span>
            </div>
            <span className="text-sm font-bold text-[#0059FF] dir-ltr">
              {depositAmount.toLocaleString()} ج.م
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-500 text-[11px] pt-1 px-1">
            <span className="font-medium">المبلغ المتبقي:</span>
            <span className="font-bold text-slate-700 dir-ltr">
              {remainingBalance.toLocaleString()} ج.م
            </span>
          </div>
        </div>

        {/* Human Workflow Rules Notice */}
        <div className="p-3 bg-blue-50/60 border border-blue-100/60 rounded-2xl flex items-start gap-2.5 text-xs text-slate-800 leading-relaxed">
          <Clock className="w-4 h-4 text-[#0059FF] shrink-0 mt-0.5" />
          <div className="text-[11px]">
            <p className="font-bold text-slate-900 mb-0.5">
              سيتم إرسال طلبك إلى المالك للموافقة أولاً.
            </p>
            <p className="text-slate-600 font-medium">
              لن تدفع أي مبلغ الآن. ستصلك رسالة فور موافقة المالك لتتمكن من دفع العربون وتأكيد الحجز.
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
            className="w-full py-3.5 bg-[#0059FF] hover:bg-blue-600 active:scale-98 text-white font-bold text-sm rounded-2xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
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
            className="w-full min-h-[44px] py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/40"
          >
            تعديل التواريخ والتفاصيل
          </button>
        </div>

      </div>
    </div>
  );
};

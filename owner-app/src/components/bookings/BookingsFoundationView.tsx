import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Booking } from '../../types';
import { BookingStatusChip } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { BottomSheet } from '../ui/BottomSheet';
import { DEPOSIT_PAYMENT_STATUS_CONFIG, REMAINING_BALANCE_METHOD_CONFIG } from '../../constants/theme';
import {
  Calendar as CalendarIcon,
  MapPin,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';

export const BookingsFoundationView: React.FC = () => {
  const {
    bookings,
    cancellationRequests,
    bookingTabSegment,
    setBookingTabSegment,
    approveBooking,
    rejectBooking,
    approveCancellationRequest,
    rejectCancellationRequest,
    openChatForBooking,
    isWithinSelfModificationWindow,
  } = useApp();

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Modal confirmation states for Approve/Reject booking request
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    booking: Booking | null;
    action: 'approve' | 'reject';
  }>({
    isOpen: false,
    booking: null,
    action: 'approve',
  });

  // Modal confirmation states for Cancellation Request
  const [cancellationConfirmModal, setCancellationConfirmModal] = useState<{
    isOpen: boolean;
    booking: Booking | null;
    requestId: string | null;
    action: 'approve' | 'reject';
    reason: string;
  }>({
    isOpen: false,
    booking: null,
    requestId: null,
    action: 'approve',
    reason: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const pendingBookings = (bookings || []).filter(
    (b) => b.status === 'PENDING_OWNER_APPROVAL' || b.status === 'APPROVED_PENDING_PAYMENT' || b.status === 'EXPIRED'
  );

  const upcomingBookings = (bookings || [])
    .filter((b) => (b.status === 'CONFIRMED' || b.status === 'CANCELLATION_REQUESTED') && b.checkOut >= today)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  const pastBookings = (bookings || [])
    .filter((b) => b.checkOut < today || b.status === 'CANCELLED')
    .sort((a, b) => b.checkIn.localeCompare(a.checkIn));

  const handleOpenConfirm = (booking: Booking, action: 'approve' | 'reject') => {
    setConfirmModal({
      isOpen: true,
      booking,
      action,
    });
  };

  const handleOpenCancellationConfirm = (booking: Booking, action: 'approve' | 'reject') => {
    const activeReq = cancellationRequests.find(
      (r) => r.bookingId === booking.id && r.status === 'PENDING_REVIEW'
    );
    setCancellationConfirmModal({
      isOpen: true,
      booking,
      requestId: activeReq ? activeReq.id : booking.activeCancellationRequestId || null,
      action,
      reason: '',
    });
  };

  const handleExecuteAction = async () => {
    if (!confirmModal.booking) return;
    setIsSubmitting(true);
    try {
      if (confirmModal.action === 'approve') {
        await approveBooking(confirmModal.booking.id);
      } else {
        await rejectBooking(confirmModal.booking.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
      setConfirmModal({ isOpen: false, booking: null, action: 'approve' });
      setIsDetailsOpen(false);
    }
  };

  const handleExecuteCancellationAction = async () => {
    if (!cancellationConfirmModal.requestId) return;
    setIsSubmitting(true);
    try {
      if (cancellationConfirmModal.action === 'approve') {
        await approveCancellationRequest(cancellationConfirmModal.requestId);
      } else {
        await rejectCancellationRequest(cancellationConfirmModal.requestId, cancellationConfirmModal.reason);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
      setCancellationConfirmModal({ isOpen: false, booking: null, requestId: null, action: 'approve', reason: '' });
      setIsDetailsOpen(false);
    }
  };

  const openDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsDetailsOpen(true);
  };

  return (
    <div className="p-4 space-y-4 dir-rtl text-right min-h-full pb-20">
      {/* Top Title & Header */}
      <div>
        <h2 className="text-xl font-black text-slate-900">إدارة طلبات والحجوزات</h2>
        <p className="text-xs text-slate-500">
          تابع طلبات المستأجرين والتفنيد المالي للعربون وعمولة Sola والمتبقي
        </p>
      </div>

      {/* Segmented Control Tabs */}
      <div className="bg-slate-100 p-1 rounded-2xl flex items-center justify-between text-xs font-bold">
        <button
          onClick={() => setBookingTabSegment('pending')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            bookingTabSegment === 'pending'
              ? 'bg-white text-[#0059FF] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>طلبات جديدة</span>
          {pendingBookings.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#0059FF] text-white text-[10px] flex items-center justify-center font-mono">
              {pendingBookings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setBookingTabSegment('upcoming')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            bookingTabSegment === 'upcoming'
              ? 'bg-white text-[#0059FF] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>الحجوزات القادمة</span>
          {upcomingBookings.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-[10px] flex items-center justify-center font-mono">
              {upcomingBookings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setBookingTabSegment('past')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            bookingTabSegment === 'past'
              ? 'bg-white text-[#0059FF] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>السجل والإلغاءات</span>
          {pastBookings.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-[10px] flex items-center justify-center font-mono">
              {pastBookings.length}
            </span>
          )}
        </button>
      </div>

      {/* SEGMENT 1: PENDING REQUESTS */}
      {bookingTabSegment === 'pending' && (
        <div className="space-y-3">
          {pendingBookings.length === 0 ? (
            <EmptyState
              type="bookings"
              title="لا توجد طلبات حجز جديدة حالياً"
              description="ستظهر هنا جميع طلبات المستأجرين الجديدة فور إرسالها لتتمكن من مراجعتها وقبولها أو رفضها."
            />
          ) : (
            pendingBookings.map((b) => {
              const fin = b.financialSummary;

              return (
                <div
                  key={b.id}
                  className={`bg-white rounded-2xl p-4 border-2 shadow-xs space-y-3.5 hover:shadow-md transition-all ${
                    'border-amber-200'
                  }`}
                >
                  {/* Renter Info Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black ring-2 ring-amber-100">
                        {(b.renter?.name || 'م')[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-900">{b.renter?.name || 'مستأجر'}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">طلب حجز جديد • {b.createdAt}</span>
                      </div>
                    </div>
                    <BookingStatusChip status={b.status} />
                  </div>

                  {/* Property & Dates Summary */}
                  <div className="flex gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {b.propertyImage ? <img src={b.propertyImage} alt={b.propertyTitle} className="w-16 h-16 rounded-lg object-cover shrink-0" /> : <div className="w-16 h-16 rounded-lg bg-slate-200 text-slate-500 text-[10px] flex items-center justify-center shrink-0">بدون صورة</div>}
                    <div className="min-w-0 space-y-1 text-xs">
                      <h4 className="font-bold text-slate-900 truncate">{b.propertyTitle}</h4>
                      <p className="text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{b.locationName}</span>
                      </p>
                      <div className="flex items-center gap-3 font-mono font-bold text-slate-800">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5 text-[#0059FF]" /> {b.checkIn} ➔ {b.checkOut}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown Brief Pill */}
                  {fin && (
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1 text-xs dir-rtl">
                      <div className="flex items-center justify-between text-blue-900 font-bold">
                        <span>قيمة الحجز:</span>
                        <span className="font-mono text-sm">{fin.totalBookingValue.toLocaleString()} ج.م</span>
                      </div>
                      <div className="flex items-center justify-between text-blue-900 font-bold">
                        <span>عربون الليلة الأولى:</span>
                        <span className="font-mono text-sm">{fin.depositAmount.toLocaleString()} ج.م</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 text-[11px] pt-1 border-t border-blue-100/50">
                        <span>المبلغ المتبقي عند الوصول:</span>
                        <span className="font-mono font-bold text-slate-900">{fin.remainingBalance.toLocaleString()} ج.م</span>
                      </div>
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="pt-2 flex items-center gap-2">
                    {b.status === 'PENDING_OWNER_APPROVAL' && (
                      <>
                        <Button
                          variant="primary"
                          size="md"
                          onClick={() => handleOpenConfirm(b, 'approve')}
                          icon={<CheckCircle2 className="w-4 h-4" />}
                          className="flex-1 font-bold bg-emerald-600 hover:bg-emerald-700 text-xs py-2.5 shadow-xs"
                        >
                          قبول الطلب 🟢
                        </Button>

                        <Button
                          variant="outline"
                          size="md"
                          onClick={() => handleOpenConfirm(b, 'reject')}
                          icon={<XCircle className="w-4 h-4" />}
                          className="flex-1 font-bold text-rose-600 border-rose-200 hover:bg-rose-50 text-xs py-2.5"
                        >
                          رفض الطلب 🔴
                        </Button>
                      </>
                    )}

                    <button
                      onClick={() => openDetails(b)}
                      className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                    >
                      التفاصيل المالية 👁️
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SEGMENT 2: UPCOMING BOOKINGS */}
      {bookingTabSegment === 'upcoming' && (
        <div className="space-y-3">
          {upcomingBookings.length === 0 ? (
            <EmptyState
              type="bookings"
              title="لا توجد حجوزات قادمة مؤكدة"
              description="عند قبول طلبات المستأجرين ستظهر حجوزاتك المؤكدة القادمة هنا."
            />
          ) : (
            upcomingBookings.map((b) => {
              const inWindow = isWithinSelfModificationWindow(b.confirmedAt);
              const activeCancReq = cancellationRequests.find(
                (r) => r.bookingId === b.id && r.status === 'PENDING_REVIEW'
              );
              const fin = b.financialSummary;

              return (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => openDetails(b)}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs">
                        {(b.renter?.name || 'م')[0]}
                      </div>
                      <span className="text-xs font-bold text-slate-900">{b.renter.name}</span>
                    </div>
                    <BookingStatusChip status={b.hasCancellationRequest ? 'CANCELLATION_REQUESTED' : b.status} />
                  </div>

                  <div className="flex gap-3">
                    {b.propertyImage ? <img src={b.propertyImage} alt={b.propertyTitle} className="w-14 h-14 rounded-xl object-cover shrink-0" /> : <div className="w-14 h-14 rounded-xl bg-slate-200 text-slate-500 text-[10px] flex items-center justify-center shrink-0">بدون صورة</div>}
                    <div className="min-w-0 space-y-1 text-xs">
                      <h4 className="font-bold text-slate-900 truncate">{b.propertyTitle}</h4>
                      <p className="text-slate-500 font-mono font-bold flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5 text-[#0059FF]" /> {b.checkIn} ➔ {b.checkOut} ({b.nights} ليالٍ)
                      </p>
                    </div>
                  </div>

                  {/* Financial Status Summary Pill */}
                  {fin && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-bold">حالة دفع العربون:</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          DEPOSIT_PAYMENT_STATUS_CONFIG[fin.depositPaymentStatus].bg
                        } ${DEPOSIT_PAYMENT_STATUS_CONFIG[fin.depositPaymentStatus].text}`}>
                          {DEPOSIT_PAYMENT_STATUS_CONFIG[fin.depositPaymentStatus].label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                          <span className="text-slate-500 block">صافي ربحك من العربون</span>
                          <span className="font-mono font-bold text-emerald-800 text-xs">
                            {fin.ownerNetDepositAmount.toLocaleString()} {fin.currency}
                          </span>
                        </div>

                        <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                          <span className="text-slate-500 block">المتبقي عند الوصول</span>
                          <span className="font-mono font-bold text-[#0059FF] text-xs">
                            {fin.remainingBalance.toLocaleString()} {fin.currency}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                        <span>طريقة دفع المتبقي:</span>
                        <span className="font-bold text-slate-900">
                          {REMAINING_BALANCE_METHOD_CONFIG[fin.remainingBalancePaymentMethod].label}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Cancellation Indicator Banner */}
                  {(b.hasCancellationRequest || activeCancReq) && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-900 font-bold">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>يوجد طلب إلغاء حجز معلق بانتظار قرارك ⚠️</span>
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetails(b);
                        }}
                        className="text-xs text-rose-700 underline font-bold"
                      >
                        مراجعة والبت 👁️
                      </button>
                    </div>
                  )}

                  {inWindow && !b.hasModificationRequest && !b.hasCancellationRequest && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>نافذة التعديل الفوري الذاتي نشطة للمستأجر (أول 60 دقيقة من التأكيد)</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span>إجمالي الحجز: <strong className="text-slate-900">{b.totalPrice.toLocaleString()} {b.currency}</strong></span>
                    <span className="text-[#0059FF] font-bold flex items-center gap-1">
                      عرض التفاصيل المباشرة <ChevronLeft className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SEGMENT 3: PAST BOOKINGS & CANCELLATIONS */}
      {bookingTabSegment === 'past' && (
        <div className="space-y-3">
          {pastBookings.length === 0 ? (
            <EmptyState
              type="bookings"
              title="لا توجد حجوزات سابقة أو ملغاة"
              description="سجل الحجوزات السابقة المكتملة أو الملغاة سيظهر هنا للاطلاع والتحليل."
            />
          ) : (
            pastBookings.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 opacity-90 shadow-xs space-y-3 cursor-pointer"
                onClick={() => openDetails(b)}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-600">مستأجر: {b.renter.name}</span>
                  <BookingStatusChip status={b.status} />
                </div>

                <div className="flex gap-3">
                  <img
                    src={b.propertyImage}
                    alt={b.propertyTitle}
                    className="w-14 h-14 rounded-xl object-cover grayscale shrink-0"
                  />
                  <div className="min-w-0 space-y-1 text-xs">
                    <h4 className="font-bold text-slate-900 truncate">{b.propertyTitle}</h4>
                    <p className="text-slate-500 font-mono">
                      {b.checkIn} ➔ {b.checkOut} ({b.nights} ليالٍ)
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Booking Details BottomSheet with Complete Financial Hierarchy */}
      <BottomSheet
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="التفنيد المالي والتفاصيل الكاملة للحجز"
      >
        {selectedBooking && (
          <div className="space-y-4 dir-rtl text-right">
            {/* Status Header */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-600">حالة الحجز الحالية:</span>
              <BookingStatusChip status={selectedBooking.status} />
            </div>

            {/* Financial Hierarchy Card */}
            {selectedBooking.financialSummary && (
              <div className="bg-white p-4 rounded-2xl border-2 border-[#0059FF]/30 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-[#0059FF]" />
                    <span>التفنيد المالي المعتمد لـ Sola</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#0059FF] bg-blue-50 px-2 py-0.5 rounded-full">
                    جنيه مصري EGP
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Total Reservation Value */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="font-bold text-slate-700">القيمة الإجمالية للحجز ({selectedBooking.nights} ليالٍ):</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {selectedBooking.financialSummary.totalBookingValue.toLocaleString()} ج.م
                    </span>
                  </div>

                  {/* Deposit Amount (First Night Price ONLY) */}
                  <div className="flex items-center justify-between p-2.5 bg-blue-50/80 rounded-xl border border-blue-100">
                    <div>
                      <span className="font-bold text-blue-900 block">العربون (سعر الليلة الأولى فقط):</span>
                      <span className="text-[10px] text-blue-700">يُدفع عبر منصة Sola فور التأكيد</span>
                    </div>
                    <span className="font-mono font-bold text-[#0059FF] text-sm">
                      {selectedBooking.financialSummary.depositAmount.toLocaleString()} ج.م
                    </span>
                  </div>

                  {/* Sola 20% Deposit Commission */}
                  <div className="flex items-center justify-between p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                    <div>
                      <span className="font-bold text-amber-900 block">عمولة Sola (20% من العربون فقط):</span>
                      <span className="text-[10px] text-amber-700">خصم حُكمي من مبلغ العربون</span>
                    </div>
                    <span className="font-mono font-bold text-amber-900 text-sm">
                      -{selectedBooking.financialSummary.solaCommissionAmount.toLocaleString()} ج.م
                    </span>
                  </div>

                  {/* Owner Net Deposit */}
                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div>
                      <span className="font-bold text-emerald-900 block">صافي العربون المستحق لك:</span>
                      <span className="text-[10px] text-emerald-700">مُحفظ/مُحَوّل لحسابك المالي</span>
                    </div>
                    <span className="font-mono font-black text-emerald-800 text-base">
                      {selectedBooking.financialSummary.ownerNetDepositAmount.toLocaleString()} ج.م
                    </span>
                  </div>

                  {/* Remaining Balance at Arrival */}
                  <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-xl">
                    <div>
                      <span className="font-bold block text-amber-400">المبلغ المتبقي عند الوصول:</span>
                      <span className="text-[10px] text-slate-300">يُدفع للمالك شخصياً بعد معاينة الوحدة</span>
                    </div>
                    <span className="font-mono font-black text-amber-300 text-base">
                      {selectedBooking.financialSummary.remainingBalance.toLocaleString()} ج.م
                    </span>
                  </div>

                  {/* Remaining Balance Payment Method */}
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600 font-bold">طريقة دفع المتبقي المُختارة:</span>
                    <span className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      {REMAINING_BALANCE_METHOD_CONFIG[selectedBooking.financialSummary.remainingBalancePaymentMethod].label}
                    </span>
                  </div>
                </div>

              </div>
            )}

            {/* Cancellation Request Section if active */}
            {(selectedBooking.hasCancellationRequest || selectedBooking.status === 'CANCELLATION_REQUESTED') && (
              <div className="bg-rose-50 p-4 rounded-2xl border-2 border-rose-300 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>طلب إلغاء حجز معلق مقدم من المستأجر ⚠️</span>
                </div>

                <div className="text-xs space-y-1.5 text-rose-800 leading-relaxed bg-white/70 p-3 rounded-xl border border-rose-200">
                  <p><strong>سبب الإلغاء المعلن:</strong> {
                    cancellationRequests.find((r) => r.bookingId === selectedBooking.id)?.reason || 'لم يتم ذكر سبب محدد'
                  }</p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    onClick={() => handleOpenCancellationConfirm(selectedBooking, 'approve')}
                    className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs py-2.5"
                  >
                    قبول الإلغاء وتفريغ الأيام 🟢
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    fullWidth
                    onClick={() => handleOpenCancellationConfirm(selectedBooking, 'reject')}
                    className="text-rose-600 border-rose-200 hover:bg-rose-100 font-bold text-xs py-2.5"
                  >
                    رفض الإلغاء 🔴
                  </Button>
                </div>
              </div>
            )}

            {/* Renter Details Card */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0059FF]">معلومات المستأجر</span>
                <button
                  onClick={() => {
                    setIsDetailsOpen(false);
                    openChatForBooking(selectedBooking.id);
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-[#0059FF] hover:underline"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>فتح المحادثة 💬</span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-black">
                  {(selectedBooking.renter?.name || 'م')[0]}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{selectedBooking.renter?.name || 'مستأجر'}</h4>
                  <span className="text-xs text-slate-500">التواصل داخل التطبيق فقط</span>
                </div>
              </div>
            </div>

            {/* Booking Schedule Details */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <span className="font-bold text-slate-900 block">جدول الإقامة وتوزيع الليالي</span>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">تاريخ الدخول (Check-in)</span>
                  <span className="font-mono font-bold text-slate-900">{selectedBooking.checkIn}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">تاريخ المغادرة (Check-out)</span>
                  <span className="font-mono font-bold text-slate-900">{selectedBooking.checkOut}</span>
                </div>
              </div>
            </div>

            {/* Action buttons inside details modal if PENDING & NOT EXPIRED */}
            {selectedBooking.status === 'PENDING_OWNER_APPROVAL' && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => handleOpenConfirm(selectedBooking, 'approve')}
                  className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                >
                  قبول طلب الحجز 🟢
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => handleOpenConfirm(selectedBooking, 'reject')}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 font-bold"
                >
                  رفض الطلب 🔴
                </Button>
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Confirmation Dialog Modal for Pending Bookings */}
      <BottomSheet
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, booking: null, action: 'approve' })}
        title={confirmModal.action === 'approve' ? 'تأكيد قبول طلب الحجز' : 'تأكيد رفض طلب الحجز'}
      >
        <div className="space-y-4 dir-rtl text-right">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <p className="text-sm font-bold text-slate-900">
              {confirmModal.action === 'approve'
                ? `هل تريد قبول طلب الحجز المقدم من المستأجر (${confirmModal.booking?.renter.name})؟`
                : `هل أنت متأكد من رغبتك في رفض طلب الحجز المقدم من المستأجر (${confirmModal.booking?.renter.name})؟`}
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              {confirmModal.action === 'approve'
                ? `سيتم قبول الطلب وتأكيد موافقة المالك وحجز الأيام على التقويم عبر منصة Sola.`
                : 'قرار الرفض نهائي وغير قابل للتراجع؛ سيتم إخطار النزيل وإلغاء الطلب واسترداد أي رصيد وإتاحة الأيام للمستأجرين الآخرين.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setConfirmModal({ isOpen: false, booking: null, action: 'approve' })}
            >
              إلغاء
            </Button>
            <Button
              variant={confirmModal.action === 'approve' ? 'primary' : 'danger'}
              size="md"
              fullWidth
              isLoading={isSubmitting}
              onClick={handleExecuteAction}
              className={confirmModal.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 font-bold' : 'font-bold'}
            >
              {confirmModal.action === 'approve' ? 'تأكيد القبول 🟢' : 'تأكيد الرفض 🔴'}
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Confirmation Dialog Modal for Cancellation Requests */}
      <BottomSheet
        isOpen={cancellationConfirmModal.isOpen}
        onClose={() => setCancellationConfirmModal({ isOpen: false, booking: null, requestId: null, action: 'approve', reason: '' })}
        title={cancellationConfirmModal.action === 'approve' ? 'تأكيد قبول إلغاء الحجز وتفريغ الأيام' : 'تأكيد رفض طلب الإلغاء'}
      >
        <div className="space-y-4 dir-rtl text-right">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <p className="text-sm font-bold text-slate-900">
              {cancellationConfirmModal.action === 'approve'
                ? `هل أنت متأكد من قبول إلغاء الحجز للمستأجر (${cancellationConfirmModal.booking?.renter.name})؟`
                : `هل أنت متأكد من رفض طلب الإلغاء وتأكيد الإقامة؟`}
            </p>
          </div>

          {cancellationConfirmModal.action === 'reject' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">سبب رفض طلب الإلغاء (اختياري)</label>
              <textarea
                rows={2}
                placeholder="مثال: نعتذر، تم تجاوز مهلة الإلغاء المسموح بها..."
                value={cancellationConfirmModal.reason}
                onChange={(e) => setCancellationConfirmModal((prev) => ({ ...prev, reason: e.target.value }))}
                className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0059FF]"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setCancellationConfirmModal({ isOpen: false, booking: null, requestId: null, action: 'approve', reason: '' })}
            >
              إلغاء
            </Button>
            <Button
              variant={cancellationConfirmModal.action === 'approve' ? 'primary' : 'danger'}
              size="md"
              fullWidth
              isLoading={isSubmitting}
              onClick={handleExecuteCancellationAction}
              className={cancellationConfirmModal.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 font-bold' : 'font-bold'}
            >
              {cancellationConfirmModal.action === 'approve' ? 'تأكيد القبول وتفريغ الأيام 🟢' : 'تأكيد الرفض 🔴'}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};

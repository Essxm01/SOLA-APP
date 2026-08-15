import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import type { AvailabilityRecord, AvailabilityStatus } from '../../types';
import { Button } from '../ui/Button';
import { BottomSheet } from '../ui/BottomSheet';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import {
  ChevronRight,
  ChevronLeft,
  Lock,
  Ban,
  Clock,
  Building2,
  AlertTriangle,
  Check,
  X,
  CheckCircle2,
} from 'lucide-react';

export const CalendarView: React.FC = () => {
  const {
    properties,
    calendarPropertyId,
    setCalendarPropertyId,
    getAvailability,
    blockDates,
    unblockDates,
    openAddPropertyWizard,
  } = useApp();

  // Current view month & year (default: August 2026)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(8); // 1-12 (8 = August)

  const [records, setRecords] = useState<AvailabilityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selection states
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);

  // Modal Confirmation states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [actionType, setActionType] = useState<'block' | 'unblock'>('block');

  // Property Selector BottomSheet
  const [isPropertySelectorOpen, setIsPropertySelectorOpen] = useState(false);

  // Get currently selected property
  const activeProperty =
    (properties || []).find((p) => p.id === calendarPropertyId) || (properties || [])[0] || null;

  const fetchMonthAvailability = useCallback(async () => {
    if (!activeProperty) return;
    setIsLoading(true);
    try {
      const data = await getAvailability(activeProperty.id, currentYear, currentMonth);
      setRecords(data);
    } catch (err) {
      console.error('Failed to load availability', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProperty, currentYear, currentMonth, getAvailability]);

  useEffect(() => {
    fetchMonthAvailability();
    // Clear selection when property or month changes
    setSelectedStartDate(null);
    setSelectedEndDate(null);
  }, [fetchMonthAvailability]);

  if (!activeProperty) {
    return (
      <div className="p-6 text-center text-slate-500 dir-rtl my-auto">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 mb-1">لم تقم بإضافة أي وحدة بعد</h3>
        <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
          أضف وحدتك الأولى للتمكن من فتح التقويم المركزي وإدارة التوفر والأسعار.
        </p>
        <Button variant="primary" size="md" onClick={() => openAddPropertyWizard()}>
          إضافة وحدة ساحلية ➕
        </Button>
      </div>
    );
  }

  // Month Navigation
  const monthNamesArabic = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  // Calendar Grid Calculations
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay();

  // Shift for Arabic calendar starting Saturday
  const startingOffset = (firstDayOfWeek + 1) % 7;

  // Helpers for dates
  const formatDateString = (day: number) => {
    const m = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;
    const d = day < 10 ? `0${day}` : `${day}`;
    return `${currentYear}-${m}-${d}`;
  };

  const getRecordForDate = (dateStr: string): AvailabilityStatus => {
    const found = records.find((r) => r.date === dateStr);
    return found ? found.status : 'AVAILABLE';
  };

  // Handle Day Selection Logic (Single & Range Selection)
  const handleDayClick = (dateStr: string) => {
    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      setSelectedStartDate(dateStr);
      setSelectedEndDate(null);
    } else if (selectedStartDate && !selectedEndDate) {
      if (dateStr < selectedStartDate) {
        setSelectedEndDate(selectedStartDate);
        setSelectedStartDate(dateStr);
      } else if (dateStr === selectedStartDate) {
        setSelectedEndDate(null);
      } else {
        setSelectedEndDate(dateStr);
      }
    }
  };

  // Calculate selected date range list
  const getSelectedDatesList = (): string[] => {
    if (!selectedStartDate) return [];
    if (!selectedEndDate) return [selectedStartDate];

    const dates: string[] = [];
    let curr = new Date(selectedStartDate);
    const end = new Date(selectedEndDate);

    while (curr <= end) {
      dates.push(curr.toISOString().slice(0, 10));
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  };

  const selectedDatesList = getSelectedDatesList();

  // Conflict Detection Engine
  const conflictingBookedDates = selectedDatesList.filter(
    (d) => getRecordForDate(d) === 'BOOKED'
  );
  const hasConflict = conflictingBookedDates.length > 0;

  // Determine available actions for selection
  const isAllBlocked =
    selectedDatesList.length > 0 &&
    selectedDatesList.every((d) => getRecordForDate(d) === 'BLOCKED');

  const handleOpenConfirm = (type: 'block' | 'unblock') => {
    setActionType(type);
    setIsConfirmOpen(true);
  };

  const handleExecuteAction = async () => {
    setIsConfirmOpen(false);
    if (actionType === 'block') {
      const datesToBlock = selectedDatesList.filter(
        (d) => getRecordForDate(d) !== 'BOOKED'
      );
      await blockDates(activeProperty.id, datesToBlock);
    } else {
      await unblockDates(activeProperty.id, selectedDatesList);
    }
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    fetchMonthAvailability();
  };

  if (!activeProperty) {
    return (
      <div className="p-4 space-y-4 dir-rtl text-right min-h-full pb-20 max-w-md mx-auto">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-[#0059FF] flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-slate-900">تقويم إتاحة الأسعار والأسرة</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              لم تقم بإضافة أي وحدة ساحلية بعد. قم بإضافة وحدتك الأولى لإدارة المواعيد المتاحة والمغلقة وحظر الأيام بنقرة واحدة.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => openAddPropertyWizard()}
            className="w-full font-bold shadow-md shadow-blue-500/20"
          >
            إضافة وحدة ساحلية جديدة ➕
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 dir-rtl text-right min-h-full pb-20">
      {/* Top Header & Property Selector */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={activeProperty.images?.[0] || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'}
            alt={activeProperty.title}
            className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
          />
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-[#0059FF] bg-blue-50 px-2 py-0.5 rounded-full">
              الوحدة النشطة
            </span>
            <h2 className="text-sm font-bold text-slate-900 truncate mt-0.5">
              {activeProperty.title}
            </h2>
            <p className="text-[11px] text-slate-500 truncate">{activeProperty.locationName}</p>
          </div>
        </div>

        {/* Change Property Button if owner has multiple properties */}
        {properties.length > 1 && (
          <button
            onClick={() => setIsPropertySelectorOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200 transition-colors shrink-0 border border-slate-200"
          >
            تغيير الوحدة ▼
          </button>
        )}
      </div>

      {/* Month Navigator Header */}
      <div className="bg-[#0059FF] text-white rounded-2xl p-3.5 flex items-center justify-between shadow-md">
        <button
          onClick={prevMonth}
          className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors text-white"
          aria-label="الشهر السابق"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="text-center">
          <span className="text-base font-black tracking-wide">
            {monthNamesArabic[currentMonth - 1]} {currentYear}
          </span>
          <span className="text-[11px] text-blue-100 block font-medium">
            جدول التوفر والإشغال اليومي
          </span>
        </div>

        <button
          onClick={nextMonth}
          className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors text-white"
          aria-label="الشهر التالي"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs space-y-2">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-100 pb-2">
          {['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map(
            (dayName) => (
              <span key={dayName} className="text-[11px] font-bold text-slate-500">
                {dayName}
              </span>
            )
          )}
        </div>

        {/* Calendar Days */}
        {isLoading ? (
          <div className="grid grid-cols-7 gap-1 py-8">
            {Array.from({ length: 28 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Empty Offset Cells */}
            {Array.from({ length: startingOffset }).map((_, i) => (
              <div key={`offset-${i}`} className="h-16 rounded-xl bg-slate-50/50" />
            ))}

            {/* Days Cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNumber = i + 1;
              const dateStr = formatDateString(dayNumber);
              const status = getRecordForDate(dateStr);
              const isSelected = selectedDatesList.includes(dateStr);

              // Status styles mapping
              const statusStyles = {
                AVAILABLE: {
                  bg: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
                  badgeBg: 'bg-emerald-100 text-emerald-800',
                  icon: <Check className="w-3 h-3 text-emerald-600" />,
                  label: 'متاح',
                },
                BOOKED: {
                  bg: 'bg-indigo-50 border-indigo-200 text-indigo-950',
                  badgeBg: 'bg-indigo-600 text-white',
                  icon: <Lock className="w-3 h-3 text-indigo-600" />,
                  label: 'مؤكد',
                },
                BLOCKED: {
                  bg: 'bg-slate-100 border-slate-300 text-slate-700',
                  badgeBg: 'bg-rose-100 text-rose-800',
                  icon: <Ban className="w-3 h-3 text-rose-600" />,
                  label: 'مغلق',
                },
                PENDING: {
                  bg: 'bg-amber-50 border-amber-200 text-amber-900',
                  badgeBg: 'bg-amber-100 text-amber-800',
                  icon: <Clock className="w-3 h-3 text-amber-600" />,
                  label: 'بانتظار',
                },
              };

              const style = statusStyles[status];

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => handleDayClick(dateStr)}
                  className={`h-16 rounded-xl border p-1 flex flex-col justify-between items-center transition-all duration-150 relative ${
                    style.bg
                  } ${
                    isSelected
                      ? 'ring-2 ring-[#0059FF] ring-offset-1 border-[#0059FF] scale-[1.02] z-10 shadow-md'
                      : 'hover:scale-[1.01]'
                  }`}
                >
                  <span className="text-xs font-bold font-mono self-start mr-0.5">
                    {dayNumber}
                  </span>

                  <div className="w-full flex items-center justify-between text-[9px] font-bold px-1">
                    {style.icon}
                    <span className="truncate">{style.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend Bar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 text-xs flex items-center justify-around text-slate-700 shadow-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>متاح للحجز</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-indigo-600" />
          <span>حجز مؤكد</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-slate-400" />
          <span>غير متاح / مغلق</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span>قيد الانتظار</span>
        </div>
      </div>

      {/* Conflict Warning Box (Section 9 & 19) */}
      {hasConflict && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-2 animate-fade-in shadow-sm">
          <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>لا يمكن حظر هذه الفترة بالكامل</span>
          </div>
          <p className="text-xs text-rose-950 leading-relaxed">
            يوجد حجز مؤكد خلال بعض الأيام المحددة:
            <span className="font-bold text-rose-700 font-mono mx-1 block mt-1">
              {conflictingBookedDates.join(' ، ')}
            </span>
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedStartDate(null);
              setSelectedEndDate(null);
            }}
            className="text-xs text-rose-700 border-rose-200 hover:bg-rose-100"
          >
            تعديل التحديد وإلغاء التعارض
          </Button>
        </div>
      )}

      {/* Active Selection Action Bar */}
      {selectedDatesList.length > 0 && !hasConflict && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <div>
              <span className="text-xs text-slate-300 block">الأيام المحددة للتغيير</span>
              <span className="text-sm font-bold font-mono">
                {selectedDatesList.length === 1
                  ? selectedStartDate
                  : `من ${selectedStartDate} إلى ${selectedEndDate} (${selectedDatesList.length} أيام)`}
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedStartDate(null);
                setSelectedEndDate(null);
              }}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isAllBlocked ? (
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => handleOpenConfirm('unblock')}
                icon={<CheckCircle2 className="w-4 h-4" />}
                className="font-bold"
              >
                إتاحة هذه الفترة للحجز 🔓
              </Button>
            ) : (
              <Button
                variant="danger"
                size="md"
                fullWidth
                onClick={() => handleOpenConfirm('block')}
                icon={<Ban className="w-4 h-4" />}
                className="font-bold"
              >
                حظر هذه الفترة ومنع الحجز 🔒
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <BottomSheet
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title={actionType === 'block' ? 'تأكيد حظر الفترة' : 'تأكيد إتاحة الفترة'}
      >
        <div className="space-y-4 dir-rtl text-right">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <p className="text-sm font-bold text-slate-900">
              {actionType === 'block'
                ? `هل أنت متأكد من جعل الفترة من (${selectedStartDate} إلى ${selectedEndDate || selectedStartDate}) غير متاحة للحجز؟`
                : `هل أنت متأكد من إعادة إتاحة الفترة من (${selectedStartDate} إلى ${selectedEndDate || selectedStartDate}) للحجز؟`}
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              {actionType === 'block'
                ? 'لن يظهر هذا الموعد للمستأجرين في نتائج البحث أثناء هذه الفترة.'
                : 'سيتمكن المستأجرون من طلب الحجز خلال هذه الأيام فور الاعتماد.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setIsConfirmOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              variant={actionType === 'block' ? 'danger' : 'primary'}
              size="md"
              fullWidth
              onClick={handleExecuteAction}
            >
              تأكيد القرار
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Property Selector BottomSheet */}
      <BottomSheet
        isOpen={isPropertySelectorOpen}
        onClose={() => setIsPropertySelectorOpen(false)}
        title="اختر الوحدة الساحلية لعرض تقويمها"
      >
        <div className="space-y-3 dir-rtl text-right">
          {properties.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                setCalendarPropertyId(p.id);
                setIsPropertySelectorOpen(false);
              }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                p.id === activeProperty.id
                  ? 'bg-blue-50 border-[#0059FF] ring-2 ring-blue-100'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <img src={p.images[0]} alt={p.title} className="w-10 h-10 rounded-xl object-cover" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{p.title}</h4>
                  <span className="text-[11px] text-slate-500">{p.locationName}</span>
                </div>
              </div>
              {p.id === activeProperty.id && (
                <span className="text-xs font-bold text-[#0059FF] bg-white px-2 py-0.5 rounded-full border border-blue-200">
                  محددة حالياً
                </span>
              )}
            </div>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
};

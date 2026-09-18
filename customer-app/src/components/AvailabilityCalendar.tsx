/**
 * SOLA Customer App — AvailabilityCalendar
 * Mobile-first, RTL Arabic monthly calendar for real date-range selection.
 *
 * Rules:
 * - Always inline single-month calendar.
 * - Date summary above calendar:
 *   Before: "الوصول — اختر" | "المغادرة — اختر"
 *   After: "[Arabic formatted check-in] → [check-out] · [N] ليالي"
 * - If inherited dates become invalid: "التواريخ اللي اخترتها لم تعد متاحة. اختر تواريخ جديدة."
 * - Past dates disabled.
 * - Real blocked/unavailable dates are visibly disabled (line-through) and untappable.
 * - Hit target >= 44x44 for all date cells and month navigation.
 * - Week headings >= 12px.
 * - No emoji helper.
 * - Preserves RTL & local calendar day semantics.
 */

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { formatArabicStayRange } from '../utils/searchIntent';

export interface BlockedRange {
  checkIn: string;
  checkOut: string;
}

export interface AvailabilityCalendarProps {
  blockedRanges?: BlockedRange[];
  minStay?: number;
  maxStay?: number;
  checkIn: string | null;
  checkOut: string | null;
  onRangeChange: (checkIn: string | null, checkOut: string | null) => void;
  invalidDatesNotice?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

function daysBetween(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / 86400000);
}

/**
 * Computes whether candidate Check-In date D can produce at least one valid
 * contiguous stay of length minStay before allowing it to be tapped as Check-In.
 *
 * Checks stay interval [D, D + minStay) against blocked ranges [b.checkIn, b.checkOut)
 * using half-open interval semantics: candidate < b.checkOut && minCheckout > b.checkIn.
 */
export function isCheckInViable(
  candidate: Date | string,
  blockedRanges: BlockedRange[] = [],
  minStay: number = 2,
  today: Date | string = new Date()
): boolean {
  const candidateDate = typeof candidate === 'string' ? new Date(candidate + 'T00:00:00') : candidate;
  const todayDate = typeof today === 'string' ? new Date(today + 'T00:00:00') : today;

  const todayNormalized = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
  const candidateNormalized = new Date(candidateDate.getFullYear(), candidateDate.getMonth(), candidateDate.getDate());

  if (candidateNormalized < todayNormalized) {
    return false;
  }

  const candidateStr = toLocalDateStr(candidateNormalized);
  const effectiveMinStay = Math.max(1, minStay);
  const minCheckoutDate = addDays(candidateNormalized, effectiveMinStay);
  const minCheckoutStr = toLocalDateStr(minCheckoutDate);

  for (const b of blockedRanges) {
    if (!b.checkIn || !b.checkOut || b.checkIn >= b.checkOut) continue;
    // Half-open interval overlap: [candidateStr, minCheckoutStr) overlaps [b.checkIn, b.checkOut)
    if (candidateStr < b.checkOut && minCheckoutStr > b.checkIn) {
      return false;
    }
  }

  return true;
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

// Egyptian week order: Saturday (سبت) -> Friday (جمع)
const ARABIC_DAYS_SHORT = ['سبت', 'أحد', 'اثن', 'ثلا', 'أرب', 'خمس', 'جمع'];

function buildMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const last = new Date(year, month + 1, 0);
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

function leadingBlanks(year: number, month: number): number {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun, 6=Sat
  return (firstDay + 1) % 7; // Sat->0, Sun->1, Mon->2, Tue->3, Wed->4, Thu->5, Fri->6
}

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  blockedRanges = [],
  minStay = 2,
  maxStay = 30,
  checkIn,
  checkOut,
  onRangeChange,
  invalidDatesNotice,
}) => {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [viewYear, setViewYear] = useState<number>(() => today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => today.getMonth());
  const [validationNotice, setValidationNotice] = useState<string | null>(null);

  const checkInDate = useMemo(() => (checkIn ? new Date(checkIn + 'T00:00:00') : null), [checkIn]);
  const checkOutDate = useMemo(() => (checkOut ? new Date(checkOut + 'T00:00:00') : null), [checkOut]);


  // Check if a range [start, end] intersects any blocked booking
  const isOverlapping = (start: Date, end: Date): boolean => {
    for (const b of blockedRanges) {
      const bIn = new Date(b.checkIn + 'T00:00:00');
      const bOut = new Date(b.checkOut + 'T00:00:00');
      if (start < bOut && end > bIn) return true;
    }
    return false;
  };

  // ── Date interaction state machine ─────────────────────────────────────────
  const handleDayPress = (day: Date) => {
    const dayStr = toLocalDateStr(day);

    if (day < today) return;

    // Phase 1: Select Check-In
    if (!checkIn || (checkIn && checkOut)) {
      if (!isCheckInViable(day, blockedRanges, minStay, today)) {
        setValidationNotice('لا توجد ليالٍ كافية بعد هذا التاريخ. اختر تاريخ وصول آخر.');
        return;
      }
      setValidationNotice(null);
      onRangeChange(dayStr, null);
      return;
    }

    // Phase 2: Select Check-Out
    const cIn = new Date(checkIn + 'T00:00:00');

    // Tapping before or on check-in restarts check-in
    if (day <= cIn) {
      if (!isCheckInViable(day, blockedRanges, minStay, today)) {
        setValidationNotice('لا توجد ليالٍ كافية بعد هذا التاريخ. اختر تاريخ وصول آخر.');
        return;
      }
      setValidationNotice(null);
      onRangeChange(dayStr, null);
      return;
    }

    const nights = daysBetween(cIn, day);
    if (nights < minStay) {
      setValidationNotice(`الحد الأدنى للإقامة ${minStay} ليالي`);
      return;
    }
    if (nights > maxStay) {
      setValidationNotice(`الحد الأقصى للإقامة ${maxStay} ليلة`);
      return;
    }

    // Check overlap: can't bridge over booked dates
    if (isOverlapping(cIn, day)) {
      setValidationNotice('يتخلل هذه الفترة أيام محجوزة مسبقاً');
      return;
    }

    setValidationNotice(null);
    onRangeChange(checkIn, dayStr);
  };

  // ── Month Navigation ───────────────────────────────────────────────────────
  const goPrev = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const canGoPrev =
    viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  const days = buildMonthDays(viewYear, viewMonth);
  const blanks = leadingBlanks(viewYear, viewMonth);

  // ── Cell State ─────────────────────────────────────────────────────────────
  const getDayState = (
    day: Date
  ): 'disabled' | 'unavailable' | 'check-in' | 'check-out' | 'in-range' | 'today' | 'available' => {
    if (day < today) return 'disabled';
    const dayStr = toLocalDateStr(day);

    if (checkInDate && dayStr === toLocalDateStr(checkInDate)) return 'check-in';
    if (checkOutDate && dayStr === toLocalDateStr(checkOutDate)) return 'check-out';

    if (checkInDate && checkOutDate && day > checkInDate && day < checkOutDate) {
      return 'in-range';
    }

    if (checkInDate && !checkOutDate) {
      if (day > checkInDate) {
        if (isOverlapping(checkInDate, day)) return 'unavailable';
      } else {
        if (!isCheckInViable(day, blockedRanges, minStay, today)) return 'unavailable';
      }
    } else {
      if (!isCheckInViable(day, blockedRanges, minStay, today)) return 'unavailable';
    }

    if (dayStr === toLocalDateStr(today)) return 'today';

    return 'available';
  };

  const nightsSelected =
    checkInDate && checkOutDate ? daysBetween(checkInDate, checkOutDate) : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-3 select-none" dir="rtl">
      
      {/* ── DATE SUMMARY ROW ABOVE CALENDAR ── */}
      {invalidDatesNotice ? (
        <div className="mb-3 p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-2 text-amber-900 text-xs font-bold leading-relaxed">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{invalidDatesNotice}</span>
        </div>
      ) : checkIn && checkOut && nightsSelected ? (
        <div className="mb-3 p-3 bg-[#EAF1FF] rounded-xl border border-blue-100 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-900">
            <span>{formatArabicStayRange(checkIn, checkOut) || `${checkIn} → ${checkOut}`}</span>
            <span className="text-[#0059FF] mr-1.5 font-black">· {nightsSelected} {nightsSelected === 1 ? 'ليلة' : 'ليالي'}</span>
          </div>
          <button
            type="button"
            onClick={() => onRangeChange(null, null)}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline pr-2"
          >
            تغيير
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-b border-slate-100 text-xs">
          <div className={`p-2.5 rounded-xl border transition-all ${
            !checkIn
              ? 'bg-blue-50/50 border-[#0059FF]/30 text-[#0059FF]'
              : 'bg-slate-50 border-slate-200/70 text-slate-700'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 block font-medium">الوصول</span>
              {checkIn && !checkOut && (
                <button
                  type="button"
                  onClick={() => {
                    setValidationNotice(null);
                    onRangeChange(null, null);
                  }}
                  className="text-[11px] font-bold text-[#0059FF] hover:underline"
                >
                  تغيير
                </button>
              )}
            </div>
            <span className="font-bold text-slate-800">{checkIn || 'اختر'}</span>
          </div>

          <div className={`p-2.5 rounded-xl border transition-all ${
            checkIn && !checkOut
              ? 'bg-blue-50/50 border-[#0059FF]/30 text-[#0059FF]'
              : 'bg-slate-50 border-slate-200/70 text-slate-700'
          }`}>
            <span className="text-[11px] text-slate-400 block font-medium">المغادرة</span>
            <span className="font-bold text-slate-800">{checkOut || 'اختر'}</span>
          </div>
        </div>
      )}

      {/* ── MONTH NAVIGATION HEADER ── */}
      <div className="flex items-center justify-between mb-2 px-1">
        <button
          type="button"
          onClick={goPrev}
          disabled={!canGoPrev}
          className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-all ${
            canGoPrev
              ? 'hover:bg-slate-100 text-slate-700 active:scale-95'
              : 'text-slate-200 cursor-not-allowed'
          }`}
          aria-label="الشهر السابق"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
          <CalendarIcon className="w-4 h-4 text-[#0059FF]" />
          <span>
            {ARABIC_MONTHS[viewMonth]} {viewYear}
          </span>
        </div>

        <button
          type="button"
          onClick={goNext}
          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-700 active:scale-95 transition-all"
          aria-label="الشهر التالي"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* ── WEEKDAY HEADINGS (>=12px) ── */}
      <div className="grid grid-cols-7 mb-1 text-center">
        {ARABIC_DAYS_SHORT.map((d) => (
          <div key={d} className="text-xs font-bold text-slate-400 py-1.5">
            {d}
          </div>
        ))}
      </div>

      {/* ── DAYS GRID (Touch hit targets >=44x44) ── */}
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: blanks }).map((_, i) => (
          <div key={`blank-${i}`} className="h-11 min-h-[44px] w-full" />
        ))}

        {days.map((day) => {
          const state = getDayState(day);
          const isPast = state === 'disabled';

          let innerCircleClass = 'w-9 h-9 flex items-center justify-center rounded-full text-xs font-bold transition-all ';
          let rangeConnector = '';

          if (state === 'disabled') {
            innerCircleClass += 'text-slate-200 cursor-not-allowed';
          } else if (state === 'unavailable') {
            innerCircleClass += 'text-slate-300 line-through bg-slate-50 cursor-not-allowed';
          } else if (state === 'check-in') {
            innerCircleClass += 'bg-[#0059FF] text-white shadow-sm shadow-blue-500/25 z-10';
            if (checkOutDate) {
              rangeConnector = 'bg-[#EAF1FF] rounded-r-full';
            }
          } else if (state === 'check-out') {
            innerCircleClass += 'bg-[#0059FF] text-white shadow-sm shadow-blue-500/25 z-10';
            rangeConnector = 'bg-[#EAF1FF] rounded-l-full';
          } else if (state === 'in-range') {
            innerCircleClass += 'text-[#0059FF] font-black';
            rangeConnector = 'bg-[#EAF1FF]';
          } else if (state === 'today') {
            innerCircleClass += 'text-[#0059FF] border border-[#0059FF]/50 hover:bg-blue-50';
          } else {
            innerCircleClass += 'text-slate-800 hover:bg-slate-100 active:scale-95';
          }

          return (
            <div
              key={toLocalDateStr(day)}
              className={`h-11 min-h-[44px] w-full flex items-center justify-center relative ${rangeConnector}`}
            >
              <button
                type="button"
                onClick={() => !isPast && handleDayPress(day)}
                disabled={isPast}
                aria-disabled={state === 'unavailable' ? 'true' : undefined}
                className="w-full h-11 min-w-[44px] min-h-[44px] p-0 flex items-center justify-center relative focus:outline-none"
                aria-label={toLocalDateStr(day)}
              >
                <span className={innerCircleClass}>
                  {day.getDate()}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* ── CALENDAR HELPER / VALIDATION STATUS ── */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs min-h-[44px] gap-2">
        <div className="flex-1 text-right">
          {validationNotice ? (
            <div className="flex items-center gap-1.5 text-amber-700 font-bold">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>{validationNotice}</span>
            </div>
          ) : !checkIn ? (
            <span className="text-slate-500 font-medium">اختر تاريخ الوصول</span>
          ) : !checkOut ? (
            <span className="text-[#0059FF] font-bold">اختر تاريخ المغادرة</span>
          ) : (
            <span className="text-slate-600 font-medium">تم تحديد التواريخ</span>
          )}
        </div>

        {checkIn && !checkOut && (
          <button
            type="button"
            onClick={() => {
              setValidationNotice(null);
              onRangeChange(null, null);
            }}
            className="min-h-[44px] px-3 py-2 text-xs font-bold text-[#0059FF] hover:bg-blue-50 active:scale-95 rounded-xl transition-all inline-flex items-center justify-center shrink-0 border border-[#0059FF]/20"
            aria-label="تغيير تاريخ الوصول"
          >
            تغيير تاريخ الوصول
          </button>
        )}
      </div>

    </div>
  );
};

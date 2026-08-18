/**
 * SOLA Customer App — AvailabilityCalendar
 * Mobile-first, RTL Arabic monthly calendar for real date-range selection.
 *
 * Rules:
 * - Past dates are disabled and untappable.
 * - Real booked/unavailable dates from backend are visibly disabled (line-through) and untappable.
 * - Start date (check-in): Filled SOLA Blue circle with bold white text.
 * - End date (check-out): Filled SOLA Blue circle with bold white text.
 * - Selected range: Continuous light SOLA Blue highlight between start and end.
 * - Selection flow: 1st tap = check-in, 2nd tap = check-out.
 * - Tapping before check-in or on booked date resets selection gracefully.
 * - Month navigation preserves current selection.
 */

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';

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
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysBetween(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / 86400000);
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
  return (firstDay + 1) % 7; // Sat→0, Sun→1, Mon→2, Tue→3, Wed→4, Thu→5, Fri→6
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  blockedRanges = [],
  minStay = 2,
  maxStay = 30,
  checkIn,
  checkOut,
  onRangeChange,
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

  // Set of dates that cannot be chosen as checkIn because of an existing booking
  const disabledCheckInDates = useMemo(() => {
    const set = new Set<string>();
    blockedRanges.forEach((range) => {
      const start = new Date(range.checkIn + 'T00:00:00');
      const end = new Date(range.checkOut + 'T00:00:00');
      let curr = new Date(start);
      while (curr < end) {
        set.add(toLocalDateStr(curr));
        curr.setDate(curr.getDate() + 1);
      }
    });
    return set;
  }, [blockedRanges]);

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
      if (disabledCheckInDates.has(dayStr)) return;
      setValidationNotice(null);
      onRangeChange(dayStr, null);
      return;
    }

    // Phase 2: Select Check-Out
    const cIn = new Date(checkIn + 'T00:00:00');

    // Tapping before or on check-in restarts check-in
    if (day <= cIn) {
      if (disabledCheckInDates.has(dayStr)) return;
      setValidationNotice(null);
      onRangeChange(dayStr, null);
      return;
    }

    const nights = daysBetween(cIn, day);
    if (nights < minStay) {
      setValidationNotice('الحد الأدنى للإقامة ليلتان');
      return;
    }
    if (nights > maxStay) {
      setValidationNotice('الحد الأقصى للإقامة 30 ليلة');
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

    if (checkInDate && !checkOutDate && day > checkInDate) {
      if (isOverlapping(checkInDate, day)) return 'unavailable';
    }

    if (disabledCheckInDates.has(dayStr)) return 'unavailable';

    if (dayStr === toLocalDateStr(today)) return 'today';

    return 'available';
  };

  const nightsSelected =
    checkInDate && checkOutDate ? daysBetween(checkInDate, checkOutDate) : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3.5 select-none" dir="rtl">
      {/* Month Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          type="button"
          onClick={goPrev}
          disabled={!canGoPrev}
          className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
            canGoPrev
              ? 'hover:bg-slate-100 text-slate-700 active:scale-95'
              : 'text-slate-200 cursor-not-allowed'
          }`}
          aria-label="الشهر السابق"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 text-sm font-black text-slate-900">
          <CalendarIcon className="w-4 h-4 text-[#0059FF]" />
          <span>
            {ARABIC_MONTHS[viewMonth]} {viewYear}
          </span>
        </div>

        <button
          type="button"
          onClick={goNext}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-700 active:scale-95 transition-all"
          aria-label="الشهر التالي"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-1.5 text-center">
        {ARABIC_DAYS_SHORT.map((d) => (
          <div key={d} className="text-[11px] font-black text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: blanks }).map((_, i) => (
          <div key={`blank-${i}`} className="h-9 w-full" />
        ))}

        {days.map((day) => {
          const state = getDayState(day);
          const isClickable = state !== 'disabled' && state !== 'unavailable';

          let cellClass =
            'h-9 w-9 mx-auto flex items-center justify-center text-xs font-black transition-all ';

          if (state === 'disabled') {
            cellClass += 'text-slate-200 cursor-not-allowed';
          } else if (state === 'unavailable') {
            cellClass += 'text-slate-300 line-through bg-slate-50/80 rounded-full cursor-not-allowed';
          } else if (state === 'check-in') {
            cellClass += 'bg-[#0059FF] text-white rounded-full shadow-md shadow-blue-500/30 scale-105 z-10';
          } else if (state === 'check-out') {
            cellClass += 'bg-[#0059FF] text-white rounded-full shadow-md shadow-blue-500/30 scale-105 z-10';
          } else if (state === 'in-range') {
            cellClass += 'bg-blue-50 text-[#0059FF] font-black w-full rounded-none';
          } else if (state === 'today') {
            cellClass += 'text-[#0059FF] border border-[#0059FF]/40 rounded-full hover:bg-blue-50';
          } else {
            cellClass += 'text-slate-800 hover:bg-slate-100 rounded-full active:scale-95';
          }

          return (
            <div
              key={toLocalDateStr(day)}
              className={`flex items-center justify-center ${
                state === 'in-range' ? 'bg-blue-50' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => isClickable && handleDayPress(day)}
                disabled={!isClickable}
                className={cellClass}
                aria-label={toLocalDateStr(day)}
              >
                {day.getDate()}
              </button>
            </div>
          );
        })}
      </div>

      {/* Live Selection Status Banner */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex-1 text-right">
          {validationNotice ? (
            <div className="flex items-center gap-1.5 text-amber-600 font-extrabold">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>{validationNotice}</span>
            </div>
          ) : !checkIn ? (
            <span className="text-slate-400 font-bold">👉 اختر تاريخ الوصول</span>
          ) : !checkOut ? (
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <span className="text-slate-400">الوصول:</span>
              <span className="text-[#0059FF] font-black dir-ltr">{checkIn}</span>
              <span className="text-amber-600 text-[11px] font-extrabold mr-1">
                • اختر تاريخ المغادرة (الحد الأدنى ليلتان)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <span className="text-slate-500">الإقامة:</span>
              <span className="text-slate-900 font-black dir-ltr">{checkIn}</span>
              <span className="text-slate-400">←</span>
              <span className="text-slate-900 font-black dir-ltr">{checkOut}</span>
            </div>
          )}
        </div>

        {nightsSelected !== null && nightsSelected > 0 && (
          <div className="bg-blue-50 text-[#0059FF] px-2.5 py-1 rounded-lg text-xs font-black shrink-0 mr-2">
            {nightsSelected} {nightsSelected === 1 ? 'ليلة' : 'ليالي'}
          </div>
        )}
      </div>
    </div>
  );
};

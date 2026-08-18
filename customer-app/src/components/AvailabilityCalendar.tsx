/**
 * SOLA Customer App — AvailabilityCalendar
 * Mobile-first, RTL Arabic calendar for date-range selection.
 *
 * Rules:
 * - Past dates are disabled (cannot check-in in the past).
 * - When checkIn changes, checkOut is reset to null (must re-select).
 * - minStay enforced: checkOut must be >= checkIn + minStay days.
 * - maxStay enforced: checkOut must be <= checkIn + maxStay days.
 * - Selection phase: first tap = checkIn, second tap = checkOut (if valid).
 */

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface BlockedRange {
  checkIn: string;
  checkOut: string;
}

export interface AvailabilityCalendarProps {
  blockedRanges?: BlockedRange[];
  minStay?: number; // minimum nights (default 1)
  maxStay?: number; // maximum nights (default 90)
  checkIn: string | null;
  checkOut: string | null;
  onRangeChange: (checkIn: string | null, checkOut: string | null) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toLocalDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

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
  return (firstDay + 1) % 7; // Sat→0, Sun→1, Mon→2 ... Fri→6
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  blockedRanges = [],
  minStay = 1,
  maxStay = 90,
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

  const checkInDate: Date | null = checkIn ? new Date(checkIn + 'T00:00:00') : null;
  const checkOutDate: Date | null = checkOut ? new Date(checkOut + 'T00:00:00') : null;

  const disabledCheckInDates = useMemo(() => {
    const set = new Set<string>();
    blockedRanges.forEach(range => {
      let d = new Date(range.checkIn + 'T00:00:00');
      const end = new Date(range.checkOut + 'T00:00:00');
      while (d < end) {
        set.add(toLocalDateStr(d));
        d.setDate(d.getDate() + 1);
      }
    });
    return set;
  }, [blockedRanges]);

  const isOverlapping = (start: Date, end: Date) => {
    for (const b of blockedRanges) {
      const bIn = new Date(b.checkIn + 'T00:00:00');
      const bOut = new Date(b.checkOut + 'T00:00:00');
      if (start < bOut && end > bIn) return true;
    }
    return false;
  };

  const handleDayPress = (day: Date) => {
    const dayStr = toLocalDateStr(day);

    if (day < today) return;

    if (!checkIn || (checkIn && checkOut)) {
      if (disabledCheckInDates.has(dayStr)) return;
      onRangeChange(dayStr, null);
      return;
    }

    if (day <= new Date(checkIn + 'T00:00:00')) {
      if (disabledCheckInDates.has(dayStr)) return;
      onRangeChange(dayStr, null);
      return;
    }

    const nights = daysBetween(new Date(checkIn + 'T00:00:00'), day);
    if (nights < minStay || nights > maxStay) return;

    if (isOverlapping(new Date(checkIn + 'T00:00:00'), day)) {
      if (disabledCheckInDates.has(dayStr)) return;
      onRangeChange(dayStr, null);
      return;
    }

    onRangeChange(checkIn, dayStr);
  };

  const goPrev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const goNext = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const canGoPrev = viewYear > today.getFullYear() || viewMonth > today.getMonth();

  const days = buildMonthDays(viewYear, viewMonth);
  const blanks = leadingBlanks(viewYear, viewMonth);

  const getDayState = (day: Date): 'disabled' | 'unavailable' | 'check-in' | 'check-out' | 'in-range' | 'min-stay-hint' | 'default' => {
    if (day < today) return 'disabled';
    const dayStr = toLocalDateStr(day);
    
    if (checkInDate && toLocalDateStr(day) === toLocalDateStr(checkInDate)) return 'check-in';
    if (checkOutDate && toLocalDateStr(day) === toLocalDateStr(checkOutDate)) return 'check-out';
    
    if (checkInDate && !checkOutDate) {
      if (day > checkInDate) {
        if (isOverlapping(checkInDate, day)) return 'unavailable';
        const diff = daysBetween(checkInDate, day);
        if (diff > 0 && diff < minStay) return 'min-stay-hint';
        return 'default';
      }
    }
    
    if (disabledCheckInDates.has(dayStr)) return 'unavailable';
    
    if (checkInDate && checkOutDate && day > checkInDate && day < checkOutDate) return 'in-range';
    return 'default';
  };

  const getDayClasses = (state: ReturnType<typeof getDayState>): string => {
    const base = 'w-9 h-9 flex items-center justify-center text-xs font-black rounded-full transition-all select-none';
    switch (state) {
      case 'disabled': return `${base} text-slate-200 cursor-not-allowed`;
      case 'unavailable': return `${base} text-slate-300 line-through cursor-not-allowed`;
      case 'check-in': return `${base} bg-[#0059FF] text-white shadow-md cursor-pointer`;
      case 'check-out': return `${base} bg-[#0059FF] text-white shadow-md cursor-pointer`;
      case 'in-range': return `${base} bg-blue-50 text-[#0059FF] rounded-none cursor-pointer`;
      case 'min-stay-hint': return `${base} bg-amber-50 text-amber-300 cursor-not-allowed`;
      default: return `${base} text-slate-800 hover:bg-slate-100 cursor-pointer`;
    }
  };

  const nightsSelected = checkInDate && checkOutDate ? daysBetween(checkInDate, checkOutDate) : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 select-none" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goPrev}
          disabled={!canGoPrev}
          className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
            canGoPrev ? 'hover:bg-slate-100 text-slate-700' : 'text-slate-200 cursor-not-allowed'
          }`}
          aria-label="الشهر السابق"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <span className="text-sm font-black text-slate-900">
          {ARABIC_MONTHS[viewMonth]} {viewYear}
        </span>

        <button
          onClick={goNext}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-700 transition-all"
          aria-label="الشهر التالي"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {ARABIC_DAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-[10px] font-black text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: blanks }).map((_, i) => (
          <div key={`blank-${i}`} className="w-9 h-9" />
        ))}

        {days.map((day) => {
          const state = getDayState(day);
          const isClickable = state !== 'disabled' && state !== 'unavailable' && state !== 'min-stay-hint';
          return (
            <div key={toLocalDateStr(day)} className="flex justify-center">
              <button
                onClick={() => isClickable && handleDayPress(day)}
                className={getDayClasses(state)}
                aria-label={toLocalDateStr(day)}
                disabled={!isClickable}
              >
                {day.getDate()}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
        <div className="text-slate-500">
          {checkIn ? (
            <span>
              وصول: <span className="text-slate-900 font-black">{checkIn}</span>
            </span>
          ) : (
            <span className="text-slate-400">اختر تاريخ الوصول</span>
          )}
        </div>
        <div className="text-slate-500">
          {checkOut ? (
            <span>
              مغادرة: <span className="text-slate-900 font-black">{checkOut}</span>
            </span>
          ) : checkIn ? (
            <span className="text-slate-400">اختر تاريخ المغادرة</span>
          ) : null}
        </div>
      </div>

      {nightsSelected && (
        <div className="mt-2 text-center text-xs font-black text-[#0059FF]">
          {nightsSelected} {nightsSelected === 1 ? 'ليلة' : 'ليالي'} إقامة
        </div>
      )}

      {checkIn && !checkOut && minStay > 1 && (
        <div className="mt-2 text-center text-[11px] font-bold text-amber-600">
          الحد الأدنى للإقامة {minStay} {minStay === 1 ? 'ليلة' : 'ليالي'}
        </div>
      )}
    </div>
  );
};

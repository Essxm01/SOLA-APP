const ARABIC_MONTHS = [
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

/**
 * Formats a single date into natural Arabic: e.g. "29 أغسطس" or "29 أغسطس 2026"
 */
export function formatArabicDate(dateStr: string, includeYear = false): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const day = date.getDate().toLocaleString('ar-EG');
  const month = ARABIC_MONTHS[date.getMonth()];
  const year = date.getFullYear().toLocaleString('ar-EG', { useGrouping: false });

  return includeYear ? `${day} ${month} ${year}` : `${day} ${month}`;
}

/**
 * Formats a check-in -> check-out date range naturally in Arabic with correct bidi flow:
 * e.g. "29 – 31 أغسطس" or "29 أغسطس – 2 سبتمبر"
 */
export function formatArabicDateRange(checkInStr: string, checkOutStr: string, includeYear = false): string {
  if (!checkInStr || !checkOutStr) return '';
  const checkIn = new Date(checkInStr);
  const checkOut = new Date(checkOutStr);

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    return `${checkInStr} – ${checkOutStr}`;
  }

  const inDay = checkIn.getDate().toLocaleString('ar-EG');
  const inMonth = ARABIC_MONTHS[checkIn.getMonth()];
  const inYear = checkIn.getFullYear().toLocaleString('ar-EG', { useGrouping: false });

  const outDay = checkOut.getDate().toLocaleString('ar-EG');
  const outMonth = ARABIC_MONTHS[checkOut.getMonth()];
  const outYear = checkOut.getFullYear().toLocaleString('ar-EG', { useGrouping: false });

  if (inMonth === outMonth && inYear === outYear) {
    return includeYear
      ? `${inDay} – ${outDay} ${inMonth} ${inYear}`
      : `${inDay} – ${outDay} ${inMonth}`;
  } else if (inYear === outYear) {
    return includeYear
      ? `${inDay} ${inMonth} – ${outDay} ${outMonth} ${inYear}`
      : `${inDay} ${inMonth} – ${outDay} ${outMonth}`;
  } else {
    return `${inDay} ${inMonth} ${inYear} – ${outDay} ${outMonth} ${outYear}`;
  }
}

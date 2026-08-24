import type { Booking, BookingStatus, RemainingBalancePaymentMethod } from '../types';

export type OwnerBookingCollections = {
  requests: Booking[];
  active: Booking[];
  history: Booking[];
};

export type OwnerBookingActionOutcome =
  | { ok: true }
  | { ok: false; message: string };

const activeStatuses = new Set<BookingStatus>([
  'APPROVED_PENDING_PAYMENT',
  'CONFIRMED',
  'CANCELLATION_REQUESTED',
]);

const historicalStatuses = new Set<BookingStatus>([
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
]);

const dateAtStartOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();

const parseBookingDate = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

export const getOwnerBookingCollections = (bookings: Booking[], now = new Date()): OwnerBookingCollections => {
  const today = dateAtStartOfDay(now);
  const requests = bookings
    .filter((booking) => booking.status === 'PENDING_OWNER_APPROVAL')
    .sort((left, right) => parseBookingDate(right.createdAt) - parseBookingDate(left.createdAt));

  const active = bookings
    .filter((booking) => activeStatuses.has(booking.status) && parseBookingDate(booking.checkOut) >= today)
    .sort((left, right) => parseBookingDate(left.checkIn) - parseBookingDate(right.checkIn));

  const history = bookings
    .filter((booking) => historicalStatuses.has(booking.status) || (booking.status === 'CONFIRMED' && parseBookingDate(booking.checkOut) < today))
    .sort((left, right) => parseBookingDate(right.checkIn) - parseBookingDate(left.checkIn));

  return { requests, active, history };
};

export const ownerBookingStatusPresentation: Partial<Record<BookingStatus, { label: string; tone: 'attention' | 'info' | 'success' | 'quiet' | 'danger' }>> = {
  PENDING_OWNER_APPROVAL: { label: 'ينتظر قرارك', tone: 'attention' },
  APPROVED_PENDING_PAYMENT: { label: 'بانتظار دفع العربون', tone: 'info' },
  CONFIRMED: { label: 'مؤكد', tone: 'success' },
  REJECTED: { label: 'مرفوض', tone: 'danger' },
  EXPIRED: { label: 'انتهت صلاحية الطلب', tone: 'quiet' },
  CANCELLED: { label: 'ملغي', tone: 'quiet' },
  CANCELLATION_REQUESTED: { label: 'طلب إلغاء يحتاج مراجعة', tone: 'attention' },
};

export const isOwnerBookingChatEligible = (status: BookingStatus) =>
  status === 'APPROVED_PENDING_PAYMENT' || status === 'CONFIRMED';

export const formatOwnerBookingMoney = (amount: number, currency = 'EGP') =>
  `${Number(amount || 0).toLocaleString('ar-EG')} ${currency === 'EGP' ? 'ج.م' : currency}`;

export const getRemainingBalanceMethodLabel = (method?: RemainingBalancePaymentMethod) => {
  if (method === 'CASH_ON_ARRIVAL') return 'نقداً عند الاستلام';
  if (method === 'IN_APP_PAYMENT_ON_ARRIVAL') return 'دفع عبر التطبيق عند الاستلام';
  return null;
};

export const runOwnerBookingAction = async (action: () => Promise<void>): Promise<OwnerBookingActionOutcome> => {
  try {
    await action();
    return { ok: true };
  } catch {
    return { ok: false, message: 'تعذر تنفيذ الإجراء. حاول مرة أخرى.' };
  }
};

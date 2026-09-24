/**
 * SOLA Customer App — Screen 11 Booking Request Sent State & Types
 * Location: customer-app/src/utils/customerScreen11BookingRequestSent.ts
 *
 * Governs Screen 11 state resolution, stay length rules, Arabic grammar formatting,
 * and lifecycle routing for fresh submissions and idempotent replays.
 */

export interface CustomerBookingCreateResponseDto {
  id: string;
  propertyId: string;
  bookingNumber: string;
  status: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestsCount: number;
  totalStay: number;
  depositAmount: number;
  remainingAmount: number;
  currency: 'EGP';
  createdAt: string;
  idempotentReplay?: boolean;
}

export interface BookingRequestSentState {
  booking: CustomerBookingCreateResponseDto;
  propertyTitle?: string | null;
}

/**
 * KONFRM canonical Customer stay rule: minimum 2 nights, maximum 30 nights.
 */
export function isAllowedStayLength(nights: number): boolean {
  return Number.isInteger(nights) && nights >= 2 && nights <= 30;
}

/**
 * Formats stay nights in canonical Arabic grammatical forms:
 * - 2 nights -> ليلتان
 * - 3–10 nights -> X ليالٍ
 * - 11–30 nights -> X ليلة
 */
export function formatArabicNights(nights: number): string {
  if (nights === 2) return 'ليلتان';
  if (nights >= 3 && nights <= 10) return `${nights} ليالٍ`;
  return `${nights} ليلة`;
}

/**
 * Formats guest count in canonical Arabic grammatical forms:
 * - 1 guest -> ضيف واحد
 * - 2 guests -> ضيفان
 * - 3–10 guests -> X ضيوف
 * - 11+ guests -> X ضيف
 */
export function formatArabicGuests(guests: number): string {
  if (guests === 1) return 'ضيف واحد';
  if (guests === 2) return 'ضيفان';
  if (guests >= 3 && guests <= 10) return `${guests} ضيوف`;
  return `${guests} ضيف`;
}

/**
 * Combines nights and guests into the canonical summary string for Screen 11.
 */
export function formatStayDurationAndGuests(nights: number, guests: number): string {
  return `${formatArabicNights(nights)} • ${formatArabicGuests(guests)}`;
}

export type Screen11SuccessRouting =
  | { action: 'SHOW_SCREEN_11'; state: BookingRequestSentState }
  | { action: 'NAVIGATE_TO_BOOKINGS'; booking: CustomerBookingCreateResponseDto };

/**
 * Resolves truthful Screen 11 routing upon booking create/replay success.
 * - PENDING_OWNER_APPROVAL: Show normal Screen 11.
 * - Progressed beyond PENDING_OWNER_APPROVAL (e.g. APPROVED_PENDING_PAYMENT, CONFIRMED):
 *   Do not lie about pending status; route directly to My Bookings.
 */
export function resolveScreen11SuccessRouting(
  booking: CustomerBookingCreateResponseDto,
  propertyTitle?: string | null
): Screen11SuccessRouting {
  if (booking.status === 'PENDING_OWNER_APPROVAL') {
    return {
      action: 'SHOW_SCREEN_11',
      state: {
        booking,
        propertyTitle: propertyTitle?.trim() || null,
      },
    };
  }

  return {
    action: 'NAVIGATE_TO_BOOKINGS',
    booking,
  };
}

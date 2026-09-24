/**
 * KONFRM Customer App — Screen 12 Booking Presentation & Status Lifecycle Utility
 * Location: customer-app/src/utils/customerBookingPresentation.ts
 *
 * Master Authority: Screen 12 Specification (C5 Booking Management)
 *
 * Rules:
 * 1. Explicit presentation mappings for all 8 canonical lifecycle statuses.
 * 2. Unknown status safety: never defaults to "مرفوض", never exposes raw enum.
 * 3. 3 core conditional sections: ACTION_REQUIRED, CURRENT, HISTORY (+ conditional OTHER).
 * 4. hasBookingActionRequired: true ONLY when at least one APPROVED_PENDING_PAYMENT exists.
 */

export type CanonicalBookingStatus =
  | 'PENDING_OWNER_APPROVAL'
  | 'APPROVED_PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED_BY_GUEST'
  | 'CANCELLED_BY_OWNER'
  | 'EXPIRED'
  | 'COMPLETED';

export type BookingSection = 'ACTION_REQUIRED' | 'CURRENT' | 'HISTORY' | 'OTHER';

export type BookingPresentationIconName =
  | 'Clock'
  | 'CreditCard'
  | 'CheckCircle2'
  | 'XCircle'
  | 'CircleSlash2'
  | 'Hourglass'
  | 'CheckCheck'
  | 'HelpCircle';

export class CustomerBookingsUnauthorizedError extends Error {
  constructor(message = 'UNAUTHORIZED_BOOKINGS_ACCESS') {
    super(message);
    this.name = 'CustomerBookingsUnauthorizedError';
  }
}

export interface CustomerBookingPresentation {
  status: string;
  customerLabel: string;
  supportingCopy?: string;
  actionCue?: string;
  section: BookingSection;
  iconName: BookingPresentationIconName;
  isActionRequired: boolean;
  isKnownStatus: boolean;
}

export interface CustomerBookingRecord {
  id: string;
  bookingNumber: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage?: string;
  locationName?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestsCount: number;
  status: string;
  totalStay: number;
  depositAmount: number;
  remainingAmount: number;
  property?: any;
}

export interface GroupedCustomerBookings {
  actionRequired: CustomerBookingRecord[];
  current: CustomerBookingRecord[];
  history: CustomerBookingRecord[];
  other: CustomerBookingRecord[];
}

export const BOOKING_SECTION_TITLES: Record<BookingSection, string> = {
  ACTION_REQUIRED: 'يحتاج إجراء منك',
  CURRENT: 'الحالية',
  HISTORY: 'السابقة',
  OTHER: 'حجوزات أخرى',
};

const CANONICAL_STATUS_MAP: Record<CanonicalBookingStatus, Omit<CustomerBookingPresentation, 'status' | 'isKnownStatus'>> = {
  PENDING_OWNER_APPROVAL: {
    customerLabel: 'قيد مراجعة المالك',
    supportingCopy: 'لا يوجد دفع مطلوب الآن.',
    section: 'CURRENT',
    iconName: 'Clock',
    isActionRequired: false,
  },
  APPROVED_PENDING_PAYMENT: {
    customerLabel: 'العربون مطلوب',
    supportingCopy: 'وافق المالك على الطلب.',
    actionCue: 'مطلوب منك: دفع العربون',
    section: 'ACTION_REQUIRED',
    iconName: 'CreditCard',
    isActionRequired: true,
  },
  CONFIRMED: {
    customerLabel: 'الحجز مؤكد',
    section: 'CURRENT',
    iconName: 'CheckCircle2',
    isActionRequired: false,
  },
  REJECTED: {
    customerLabel: 'لم يوافق المالك',
    section: 'HISTORY',
    iconName: 'XCircle',
    isActionRequired: false,
  },
  CANCELLED_BY_GUEST: {
    customerLabel: 'ملغي من جانبك',
    section: 'HISTORY',
    iconName: 'CircleSlash2',
    isActionRequired: false,
  },
  CANCELLED_BY_OWNER: {
    customerLabel: 'ملغي من جانب المالك',
    section: 'HISTORY',
    iconName: 'CircleSlash2',
    isActionRequired: false,
  },
  EXPIRED: {
    customerLabel: 'انتهت صلاحية الطلب',
    section: 'HISTORY',
    iconName: 'Hourglass',
    isActionRequired: false,
  },
  COMPLETED: {
    customerLabel: 'إقامة مكتملة',
    section: 'HISTORY',
    iconName: 'CheckCheck',
    isActionRequired: false,
  },
};

/**
 * Returns safe human presentation metadata for any booking status.
 * Fails closed on unknown statuses: uses neutral label "حالة الحجز",
 * routes to OTHER section, and logs a diagnostic warning.
 */
export function getCustomerBookingPresentation(status: unknown): CustomerBookingPresentation {
  const normalized = typeof status === 'string' ? status.trim().toUpperCase() : '';

  if (normalized in CANONICAL_STATUS_MAP) {
    const config = CANONICAL_STATUS_MAP[normalized as CanonicalBookingStatus];
    return {
      status: normalized,
      customerLabel: config.customerLabel,
      supportingCopy: config.supportingCopy,
      actionCue: config.actionCue,
      section: config.section,
      iconName: config.iconName,
      isActionRequired: config.isActionRequired,
      isKnownStatus: true,
    };
  }

  // Diagnostic log for unexpected or future status without crashing or misleading user
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(`[customerBookingPresentation] Unrecognized booking status encountered: "${String(status)}"`);
  }

  return {
    status: normalized || 'UNKNOWN',
    customerLabel: 'حالة الحجز',
    section: 'OTHER',
    iconName: 'HelpCircle',
    isActionRequired: false,
    isKnownStatus: false,
  };
}

/**
 * Groups bookings into actionRequired, current, history, and optional other.
 * Preserves the canonical server ordering (typically created_at DESC) inside each bucket.
 */
export function groupCustomerBookings(bookings: CustomerBookingRecord[] | null | undefined): GroupedCustomerBookings {
  const result: GroupedCustomerBookings = {
    actionRequired: [],
    current: [],
    history: [],
    other: [],
  };

  if (!Array.isArray(bookings)) {
    return result;
  }

  for (const booking of bookings) {
    if (!booking) continue;
    const presentation = getCustomerBookingPresentation(booking.status);
    switch (presentation.section) {
      case 'ACTION_REQUIRED':
        result.actionRequired.push(booking);
        break;
      case 'CURRENT':
        result.current.push(booking);
        break;
      case 'HISTORY':
        result.history.push(booking);
        break;
      case 'OTHER':
      default:
        result.other.push(booking);
        break;
    }
  }

  return result;
}

/**
 * Bottom Nav Attention Indicator Semantic:
 * TRUE only when the last successfully loaded canonical booking list
 * contains at least one booking requiring action (APPROVED_PENDING_PAYMENT).
 *
 * False for PENDING_OWNER_APPROVAL, CONFIRMED, REJECTED, CANCELLED_*, EXPIRED, COMPLETED.
 * False if bookings have never loaded or are empty/null.
 */
export function hasBookingActionRequired(bookings: CustomerBookingRecord[] | null | undefined): boolean {
  if (!Array.isArray(bookings) || bookings.length === 0) {
    return false;
  }
  return bookings.some((b) => b && b.status === 'APPROVED_PENDING_PAYMENT');
}

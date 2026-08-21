/**
 * SOLA Vacation Rentals — Canonical Booking Rules & Invariants
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md & Product Decisions (Section 1-4)
 */
/**
 * Global Stay Limits (MVP System-Level Rules)
 * NOT owner-configurable in MVP.
 */
export const GLOBAL_MIN_STAY_NIGHTS = 2;
export const GLOBAL_MAX_STAY_NIGHTS = 30;
/**
 * Canonical Booking Blocking Statuses
 *
 * APPROVED_PENDING_PAYMENT: Hard-blocks dates temporarily while customer pays deposit.
 * CONFIRMED: Hard-blocks dates for confirmed stay.
 *
 * Non-blocking statuses:
 * PENDING_OWNER_APPROVAL: Does NOT hard-block dates (allows competing booking requests).
 * REJECTED: Does not block dates.
 * CANCELLED_BY_GUEST: Does not block dates.
 * EXPIRED: Does not block dates.
 * COMPLETED: Historical dates, does not block future inventory.
 */
export const BLOCKING_BOOKING_STATUSES = [
    'APPROVED_PENDING_PAYMENT',
    'CONFIRMED',
];
export const NON_BLOCKING_BOOKING_STATUSES = [
    'PENDING_OWNER_APPROVAL',
    'REJECTED',
    'CANCELLED_BY_GUEST',
    'EXPIRED',
    'COMPLETED',
];
/**
 * Checks whether a booking status canonically blocks calendar dates
 */
export function isBookingStatusBlocking(status) {
    return BLOCKING_BOOKING_STATUSES.includes(status);
}
/**
 * Authoritative stay length validation
 */
export function validateStayLength(nights) {
    if (nights < GLOBAL_MIN_STAY_NIGHTS) {
        return {
            isValid: false,
            errorCode: 'MIN_STAY_NOT_MET',
            errorMessageArabic: 'الحد الأدنى للإقامة ليلتان',
        };
    }
    if (nights > GLOBAL_MAX_STAY_NIGHTS) {
        return {
            isValid: false,
            errorCode: 'MAX_STAY_EXCEEDED',
            errorMessageArabic: 'الحد الأقصى للإقامة 30 ليلة',
        };
    }
    return {
        isValid: true,
        errorMessageArabic: '',
    };
}
/**
 * Validates date range overlap against blocking records
 */
export function hasDateRangeOverlap(checkIn, checkOut, blocks) {
    const reqIn = new Date(checkIn + 'T00:00:00');
    const reqOut = new Date(checkOut + 'T00:00:00');
    for (const block of blocks) {
        // If status is present on block object, ensure it is a canonical blocking status
        if (block.status && !isBookingStatusBlocking(block.status)) {
            continue;
        }
        const bInStr = typeof block.checkIn === 'string' ? block.checkIn.slice(0, 10) : block.checkIn.toISOString().slice(0, 10);
        const bOutStr = typeof block.checkOut === 'string' ? block.checkOut.slice(0, 10) : block.checkOut.toISOString().slice(0, 10);
        const bIn = new Date(bInStr + 'T00:00:00');
        const bOut = new Date(bOutStr + 'T00:00:00');
        if (reqIn < bOut && reqOut > bIn) {
            return true;
        }
    }
    return false;
}

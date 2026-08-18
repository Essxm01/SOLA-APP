/**
 * Sola Vacation Rentals — Server Domain Controllers & State Machine Guards
 * Location: server/src/controllers/domainControllers.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */

import type { Property, Booking, Dispute } from '../types/server.js';
import { validateStayLength, GLOBAL_MIN_STAY_NIGHTS, GLOBAL_MAX_STAY_NIGHTS } from '../constants/bookingRules.js';
export type { Property, Booking, Dispute };

// ==========================================
// 1. PROPERTY DOMAIN CONTROLLER (RULE-4C-01 & RULE-4C-02)
// ==========================================
export class PropertyDomainController {
  static submitForReview(property: Property): Property {
    if (property.status !== 'DRAFT') {
      throw new Error('INVALID_STATE_TRANSITION_SUBMIT_REQUIRES_DRAFT');
    }
    return {
      ...property,
      status: 'PENDING_REVIEW',
      updatedAt: new Date().toISOString(),
    };
  }

  static archiveProperty(property: Property): Property {
    if (property.status === 'ARCHIVED') {
      throw new Error('PROPERTY_ALREADY_ARCHIVED');
    }
    return {
      ...property,
      status: 'ARCHIVED',
      updatedAt: new Date().toISOString(),
    };
  }

  // RULE-4C-01: Restorable Archive Strategy — ARCHIVED restores to DRAFT ONLY
  static restoreProperty(property: Property): Property {
    if (property.status !== 'ARCHIVED') {
      throw new Error('PROPERTY_NOT_ARCHIVED');
    }
    return {
      ...property,
      status: 'DRAFT', // Strictly DRAFT per RULE-4C-01
      updatedAt: new Date().toISOString(),
    };
  }

  // RULE-4C-02: Hard delete protection for properties with active bookings
  static validateHardDelete(property: Property, activeBookingsCount: number): void {
    if (activeBookingsCount > 0) {
      throw new Error('CANNOT_DELETE_PROPERTY_WITH_ACTIVE_BOOKINGS');
    }
  }
}

// ==========================================
// 2. BOOKING DOMAIN CONTROLLER (RULE-3B-02, 3C-01, 4A-01)
// ==========================================
export class BookingDomainController {
  static approveBooking(booking: Booking): { booking: Booking; confirmedAt: string } {
    if (booking.status !== 'PENDING_OWNER_APPROVAL') {
      throw new Error('INVALID_STATE_TRANSITION_BOOKING_NOT_PENDING');
    }

    const confirmedAt = new Date().toISOString();
    const updatedBooking: Booking = {
      ...booking,
      status: 'CONFIRMED',
      confirmedAt,
    };

    return { booking: updatedBooking, confirmedAt };
  }

  static rejectBooking(booking: Booking): Booking {
    if (booking.status !== 'PENDING_OWNER_APPROVAL') {
      throw new Error('INVALID_STATE_TRANSITION_BOOKING_NOT_PENDING');
    }

    return {
      ...booking,
      status: 'REJECTED',
      rejectedAt: new Date().toISOString(),
    };
  }

  // RULE-3C-01: Self-Service 60-Minute Modification Window Check
  static isWithin60MinuteModificationWindow(confirmedAtIso?: string): boolean {
    if (!confirmedAtIso) return false;
    const confirmedTime = new Date(confirmedAtIso).getTime();
    const currentTime = Date.now();
    const elapsedMinutes = (currentTime - confirmedTime) / (1000 * 60);
    return elapsedMinutes <= 60;
  }

  // Date Range Overlap Check (Application-level mirror of PostgreSQL GIST constraint)
  static checkDateOverlap(
    checkInA: string,
    checkOutA: string,
    checkInB: string,
    checkOutB: string
  ): boolean {
    const startA = new Date(checkInA).getTime();
    const endA = new Date(checkOutA).getTime();
    const startB = new Date(checkInB).getTime();
    const endB = new Date(checkOutB).getTime();

    // Standard interval intersection: startA < endB && endA > startB
    return startA < endB && endA > startB;
  }
}

// ==========================================
// 3. DISPUTE DOMAIN CONTROLLER (RULE-3G-01 & 3G-02)
// ==========================================
export class DisputeDomainController {
  static createDisputeHoldPayload(dispute: Dispute, ownerNetDepositEgp: number) {
    return {
      disputeId: dispute.id,
      bookingId: dispute.bookingId,
      ownerId: dispute.ownerId,
      frozenAmountEgp: ownerNetDepositEgp, // Net deposit frozen per RULE-3G-01
      status: 'HELD' as const,
      createdAt: new Date().toISOString(),
    };
  }

  // RULE-3G-02: Check Owner Timeout (24h/48h)
  static checkOwnerTimeout(timeoutAtIso: string): { isTimedOut: boolean; remainingMinutes: number } {
    const timeoutTime = new Date(timeoutAtIso).getTime();
    const currentTime = Date.now();
    const diffMs = timeoutTime - currentTime;

    if (diffMs <= 0) {
      return { isTimedOut: true, remainingMinutes: 0 };
    }

    return { isTimedOut: false, remainingMinutes: Math.ceil(diffMs / (1000 * 60)) };
  }
}

// ==========================================
// 4. ADMIN DOMAIN CONTROLLER (MINIMAL ADMINISTRATIVE FOUNDATION)
// ==========================================
export class AdminDomainController {
  static reviewOwnerDocument(doc: { id: string; status: string }, decision: 'APPROVED' | 'REJECTED', reason?: string) {
    if (doc.status !== 'PENDING' && doc.status !== 'PENDING_VERIFICATION') {
      throw new Error('INVALID_STATE_TRANSITION_DOC_NOT_PENDING');
    }
    const newDocStatus = decision === 'APPROVED' ? 'VERIFIED' : 'REJECTED';
    const newOwnerVerificationStatus = decision === 'APPROVED' ? 'VERIFIED' : 'REJECTED';
    return {
      documentStatus: newDocStatus,
      ownerVerificationStatus: newOwnerVerificationStatus,
      reason,
      reviewedAt: new Date().toISOString(),
    };
  }

  static reviewProperty(prop: Property, decision: 'PUBLISHED' | 'REJECTED', reviewNotes?: string): Property {
    if (prop.status !== 'PENDING_REVIEW') {
      throw new Error('INVALID_STATE_TRANSITION_PROP_NOT_PENDING_REVIEW');
    }
    const newStatus: Property['status'] = decision === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
    return {
      ...prop,
      status: newStatus,
      verificationStatus: decision === 'PUBLISHED' ? 'VERIFIED' : 'REJECTED',
      updatedAt: new Date().toISOString(),
    };
  }

  static validateProviderFee(grossAmountEgp: number, feeEgp: number): { isValid: boolean; maxAllowedFeeEgp: number } {
    const maxFee = Math.min(grossAmountEgp * 0.05, 100);
    if (isNaN(feeEgp) || feeEgp < 0 || feeEgp > maxFee) {
      return { isValid: false, maxAllowedFeeEgp: maxFee };
    }
    return { isValid: true, maxAllowedFeeEgp: maxFee };
  }

  static validateRejectionReason(reasonCode: string, rejectionReason?: string): { isValid: boolean; errorCode?: string } {
    const validCodes = ['INVALID_ACCOUNT_IDENTIFIER', 'NAME_MISMATCH', 'SUSPICIOUS_ACTIVITY', 'DUPLICATE_REQUEST', 'OTHER'];
    if (!reasonCode || !validCodes.includes(reasonCode)) {
      return { isValid: false, errorCode: 'INVALID_REJECTION_REASON_CODE' };
    }
    if (reasonCode === 'OTHER') {
      if (!rejectionReason || rejectionReason.trim().length < 15) {
        return { isValid: false, errorCode: 'REJECTION_REASON_TEXT_MIN_LENGTH_REQUIRED' };
      }
    }
    return { isValid: true };
  }

  static processPayout(
    payout: { id: string; status: string; grossAmount: number; ownerId: string },
    action: 'COMPLETED' | 'REJECTED',
    providerTxId?: string,
    rejectionReason?: string
  ) {
    if (payout.status !== 'PENDING_ADMIN_PROCESSING' && payout.status !== 'PENDING') {
      throw new Error('PAYOUT_ALREADY_PROCESSED');
    }
    if (action === 'COMPLETED' && (!providerTxId || !providerTxId.trim())) {
      throw new Error('PROVIDER_TX_ID_REQUIRED_FOR_COMPLETED_PAYOUT');
    }
    if (action === 'REJECTED' && (!rejectionReason || !rejectionReason.trim())) {
      throw new Error('REJECTION_REASON_REQUIRED_FOR_REJECTED_PAYOUT');
    }
    return {
      status: action,
      providerTxId,
      rejectionReason,
      processedAt: new Date().toISOString(),
    };
  }


  static validateDisputeResolution(
    resolutionType: 'RELEASE_TO_OWNER' | 'REFUND_GUEST' | 'SPLIT',
    frozenHoldEgp: number,
    ownerReleasedSoFarEgp: number = 0,
    refundAmountReq?: number,
    adminNotes?: string
  ): { isValid: boolean; errorCode?: string; ownerReleasedAmountEgp?: number; guestRefundAmountEgp?: number } {
    if (!adminNotes || adminNotes.trim().length < 20) {
      return { isValid: false, errorCode: 'ADMIN_NOTES_TEXT_MIN_LENGTH_REQUIRED' };
    }

    const validTypes = ['RELEASE_TO_OWNER', 'REFUND_GUEST', 'SPLIT'];
    if (!resolutionType || !validTypes.includes(resolutionType)) {
      return { isValid: false, errorCode: 'INVALID_RESOLUTION_TYPE' };
    }

    const remainingHeldEgp = frozenHoldEgp - ownerReleasedSoFarEgp;
    if (remainingHeldEgp <= 0) {
      return { isValid: false, errorCode: 'NO_REMAINING_HELD_BALANCE_AVAILABLE' };
    }

    if (resolutionType === 'RELEASE_TO_OWNER') {
      return {
        isValid: true,
        ownerReleasedAmountEgp: remainingHeldEgp,
        guestRefundAmountEgp: 0,
      };
    }

    if (resolutionType === 'REFUND_GUEST') {
      return {
        isValid: true,
        ownerReleasedAmountEgp: 0,
        guestRefundAmountEgp: remainingHeldEgp,
      };
    }

    // SPLIT
    const reqAmount = refundAmountReq !== undefined ? Number(refundAmountReq) : 0;
    if (isNaN(reqAmount) || reqAmount <= 0) {
      return { isValid: false, errorCode: 'REFUND_AMOUNT_REQUIRED_FOR_SPLIT_RESOLUTION' };
    }
    if (reqAmount >= remainingHeldEgp) {
      return { isValid: false, errorCode: 'REFUND_AMOUNT_EXCEEDS_REMAINING_HELD_BALANCE' };
    }

    return {
      isValid: true,
      ownerReleasedAmountEgp: remainingHeldEgp - reqAmount,
      guestRefundAmountEgp: reqAmount,
    };
  }

  static resolveDispute(
    dispute: Dispute,
    resolutionType: 'RELEASE_TO_OWNER' | 'REFUND_GUEST' | 'SPLIT',
    refundAmount?: number,
    adminNotes?: string
  ): Dispute {
    if (dispute.status === 'RESOLVED') {
      throw new Error('DISPUTE_ALREADY_RESOLVED');
    }

    const validation = AdminDomainController.validateDisputeResolution(
      resolutionType,
      5000.00, // sample frozen hold
      0,
      refundAmount,
      adminNotes
    );

    if (!validation.isValid) {
      throw new Error(validation.errorCode || 'INVALID_DISPUTE_RESOLUTION');
    }

    const mappedResolutionType =
      resolutionType === 'RELEASE_TO_OWNER' ? 'NO_FINANCIAL_ACTION' :
      resolutionType === 'REFUND_GUEST' ? 'FULL_REFUND' :
      'PARTIAL_REFUND';

    return {
      ...dispute,
      status: resolutionType === 'RELEASE_TO_OWNER' ? 'RESOLVED' : 'RESOLVING_PENDING_GATEWAY',
      resolutionType: mappedResolutionType as any,
    };
  }
}

// ==========================================
// 5. CUSTOMER DOMAIN CONTROLLER (PHASE C1 BASE BACKEND FOUNDATION)
// ==========================================
export class CustomerDomainController {
  static filterPublishedProperties(properties: Property[]): Property[] {
    return properties.filter((p) => p.status === 'PUBLISHED');
  }

  static sanitizePropertyForCustomer(property: Property) {
    if (property.status !== 'PUBLISHED') {
      throw new Error('PROPERTY_NOT_PUBLISHED');
    }

    const { ownerId, status, verificationStatus, ...publicDetails } = property;
    return {
      ...publicDetails,
      status: 'PUBLISHED' as const,
    };
  }

  static validateCustomerBookingRequest(
    property: Property,
    checkIn: string,
    checkOut: string,
    totalGuests: number
  ) {
    if (property.status !== 'PUBLISHED') {
      throw new Error('CANNOT_BOOK_UNPUBLISHED_PROPERTY');
    }

    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) {
      throw new Error('INVALID_BOOKING_DATE_RANGE');
    }

    if (totalGuests <= 0 || totalGuests > property.maxGuests) {
      throw new Error('INVALID_GUEST_COUNT');
    }

    const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));
    const stayCheck = validateStayLength(nights);
    if (!stayCheck.isValid) {
      throw new Error(`${stayCheck.errorCode}: ${stayCheck.errorMessageArabic}`);
    }

    const totalBookingValue = property.basePricePerNight * nights;
    const firstNightPrice = property.basePricePerNight;

    return { nights, totalBookingValue, firstNightPrice };
  }

  static cancelCustomerBooking(booking: Booking, customerId: string): Booking {
    if (booking.status !== 'PENDING_OWNER_APPROVAL' && booking.status !== 'CONFIRMED') {
      throw new Error('CANNOT_CANCEL_BOOKING_IN_CURRENT_STATE');
    }

    return {
      ...booking,
      status: 'CANCELLED_BY_GUEST',
    };
  }
}

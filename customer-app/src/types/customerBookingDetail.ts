/**
 * Sola Vacation Rentals — Customer Booking Detail DTO
 * Location: customer-app/src/types/customerBookingDetail.ts
 *
 * Master Source of Truth: Section 18 Canonical Detail Authority & Backend customerRenter.ts
 * Strict Rule: No `any` for the central Screen 13 DTO.
 */

export interface CustomerBookingPropertyDetail {
  id: string;
  title: string;
  unitType?: string;
  propertyType?: string;
  address?: string;
  region?: string;
  resortName?: string;
  locationName?: string;
  images: string[];
  pricePerNight?: number;
  bedrooms?: number;
  bathrooms?: number;
  maxGuests?: number;
}

export interface CustomerBookingDetailDto {
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
  currency: string;
  createdAt: string;
  guestName?: string | null;
  guestEmail?: string | null;
  specialRequests?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  confirmedAt?: string | null;
  completedAt?: string | null;
  property: CustomerBookingPropertyDetail;
}

export type Screen13LoadState =
  | 'INITIAL_LOADING'
  | 'LOADED'
  | 'REFRESHING'
  | 'STALE_ERROR'
  | 'ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND';

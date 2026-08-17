/**
 * Sola Vacation Rentals — Server Foundation Types & DTOs
 * Location: server/src/types/server.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */

export interface ApiErrorResponse {
  success: false;
  data?: undefined;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  error?: undefined;
  meta?: Record<string, unknown>;
  timestamp: string;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

export type UserRole = 'ROLE_OWNER' | 'ROLE_ADMIN' | 'ROLE_GUEST' | 'ROLE_CUSTOMER';

export interface JwtPayload {
  sub: string; // owner_id or admin_id
  phone?: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthSessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Property {
  id: string;
  ownerId: string;
  title: string;
  unitType?: string;
  propertyType?: string;
  address?: string;
  pricePerNight?: number;
  status: string;
  verificationStatus?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt: string;
  [key: string]: any;
}

export interface Booking {
  id: string;
  propertyId: string;
  customerId: string;
  ownerId: string;
  status: string;
  checkInDate?: string;
  checkOutDate?: string;
  totalAmount?: number;
  depositAmount?: number;
  rejectionReason?: string;
  cancellationReason?: string;
  createdAt?: string;
  updatedAt: string;
  [key: string]: any;
}

export interface BookingPropertySnapshot {
  propertyId: string;
  propertyTitle: string;
  basePriceAtBooking: number;
  capturedAt: string;
  [key: string]: any;
}

export interface Dispute {
  id: string;
  bookingId: string;
  status: string;
  resolutionOutcome?: 'RELEASE_TO_OWNER' | 'REFUND_GUEST' | 'SPLIT' | string;
  heldAmountEgp: number;
  refundAmountEgp?: number;
  ownerReleaseAmountEgp?: number;
  adminNotes?: string;
  createdAt?: string;
  updatedAt: string;
  [key: string]: any;
}

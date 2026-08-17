/**
 * Sola Vacation Rentals — Server Foundation Types & DTOs
 * Location: server/src/types/server.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */

export interface ApiErrorResponse {
  success: false;
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
  meta?: Record<string, unknown>;
  timestamp: string;
}

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
  status: string;
  verificationStatus?: string;
  [key: string]: any;
}

export interface Booking {
  id: string;
  propertyId: string;
  customerId: string;
  status: string;
  [key: string]: any;
}

export interface Dispute {
  id: string;
  bookingId: string;
  status: string;
  [key: string]: any;
}

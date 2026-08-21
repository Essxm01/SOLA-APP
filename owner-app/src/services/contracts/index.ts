/**
 * Sola Vacation Rentals — Phase 7 IRepository Contract Interfaces
 * Location: src/services/contracts/index.ts
 * 
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 * Strict Safety Boundary: 
 * - Zero financial rule or state machine changes.
 * - 100% strict TypeScript types (Zero `any`).
 * - Preserves mockRepository compatibility while defining production API boundaries.
 */

import type {
  Owner,
  Property,
  AvailabilityRecord,
  Booking,
  BookingFinancialSummary,
  BookingModificationRequest,
  BookingCancellationRequest,
  Dispute,
  OwnerWallet,
  WalletLedgerEntry,
  PayoutRequest,
  OwnerPayoutMethod,
  ChatConversation,
  ChatMessage,
  NotificationItem,
  FinancialAnalyticsSummary,
  AdvancedOwnerAnalytics,
  AnalyticsTimeRange,
  OwnerVerificationDocument,
} from '../../types';

// ==========================================
// 1. AUTHENTICATION REPOSITORY CONTRACT
// ==========================================
export interface RequestOtpPayload {
  phone: string;
}

export interface VerifyOtpPayload {
  phone: string;
  code: string;
  surface: 'CUSTOMER' | 'OWNER';
}

export interface AuthSessionResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  owner?: Owner | null;
  ownerOnboardingRequired?: boolean;
}

export interface IAuthRepository {
  requestOtp(payload: RequestOtpPayload): Promise<{ success: boolean; message: string }>;
  verifyOtp(payload: VerifyOtpPayload): Promise<AuthSessionResponse>;
  prototypeLogin(payload: { phone: string; surface: 'CUSTOMER' | 'OWNER'; fullName?: string }): Promise<any>;
  refreshSession(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }>;
  revokeSession(refreshToken: string): Promise<void>;
}

// ==========================================
// 2. OWNER & PROFILE REPOSITORY CONTRACT
// ==========================================
export interface UpdateOwnerProfilePayload {
  name?: string;
  fullName?: string;
  email?: string;
  avatar?: string;
  avatarUrl?: string;
}

export interface IOwnerRepository {
  getCurrentOwner(): Promise<Owner>;
  updateOwnerProfile(updates: UpdateOwnerProfilePayload): Promise<Owner>;
  uploadOwnerDocument(document: OwnerVerificationDocument): Promise<Owner>;
}

// ==========================================
// 3. PROPERTY REPOSITORY CONTRACT
// ==========================================
export interface CreatePropertyPayload {
  title: string;
  unitType: Property['unitType'];
  propertyType: Property['propertyType'];
  address: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  basePricePerNight: number;
  images: string[];
  amenities: Property['amenities'];
}

export interface UpdatePropertyPayload extends Partial<CreatePropertyPayload> {}

export interface IPropertyRepository {
  getProperties(): Promise<Property[]>;
  getPropertyById(id: string): Promise<Property | null>;
  createProperty(data: CreatePropertyPayload): Promise<Property>;
  updateProperty(id: string, data: UpdatePropertyPayload): Promise<Property>;
  submitPropertyForReview(id: string): Promise<Property>;
  pauseProperty(id: string): Promise<Property>;
  resumeProperty(id: string): Promise<Property>;
  archiveProperty(id: string): Promise<Property>;
  restoreProperty(id: string): Promise<Property>;
  deleteProperty(id: string): Promise<void>;
}

// ==========================================
// 4. CALENDAR & PRICING REPOSITORY CONTRACT
// ==========================================
export interface SetNightlyPriceOverridePayload {
  propertyId: string;
  date: string;
  price: number;
}

export interface ToggleDateBlockPayload {
  propertyId: string;
  date: string;
  note?: string;
}

export interface ICalendarRepository {
  getAvailabilityRecords(propertyId: string): Promise<AvailabilityRecord[]>;
  toggleDateBlock(payload: ToggleDateBlockPayload): Promise<AvailabilityRecord>;
  setNightlyPriceOverride(payload: SetNightlyPriceOverridePayload): Promise<AvailabilityRecord>;
  updatePropertyPricing(
    propertyId: string,
    pricingMap: Record<string, number>
  ): Promise<Property>;
}

// ==========================================
// 5. BOOKING REPOSITORY CONTRACT
// ==========================================
export interface CreateBookingPayload {
  propertyId: string;
  guestName: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  totalGuests: number;
}

export interface RequestModificationPayload {
  bookingId: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
}

export interface ReviewModificationPayload {
  requestId: string;
  decision: 'ACCEPTED' | 'REJECTED';
}

export interface CreateCancellationPayload {
  bookingId: string;
  reason: string;
}

export interface ReviewCancellationPayload {
  requestId: string;
  decision: 'APPROVED' | 'REJECTED';
}

export interface IBookingRepository {
  getBookings(): Promise<Booking[]>;
  getBookingById(id: string): Promise<Booking | null>;
  createBooking(payload: CreateBookingPayload): Promise<Booking>;
  approveBooking(id: string): Promise<Booking>;
  rejectBooking(id: string): Promise<Booking>;
  createModificationRequest(payload: RequestModificationPayload): Promise<BookingModificationRequest>;
  reviewModificationRequest(payload: ReviewModificationPayload): Promise<BookingModificationRequest>;
  createCancellationRequest(payload: CreateCancellationPayload): Promise<BookingCancellationRequest>;
  reviewCancellationRequest(payload: ReviewCancellationPayload): Promise<BookingCancellationRequest>;
}

// ==========================================
// 6. FINANCIALS REPOSITORY CONTRACT
// ==========================================
export interface IFinancialRepository {
  getOrCreateFinancialSummary(booking: Booking): Promise<BookingFinancialSummary>;
  getFinancialAnalyticsSummary(period?: string): Promise<FinancialAnalyticsSummary>;
}

// ==========================================
// 7. WALLET & LEDGER REPOSITORY CONTRACT
// ==========================================
export interface LedgerFilterPayload {
  limit?: number;
  offset?: number;
  transactionType?: string;
}

export interface IWalletRepository {
  getOwnerWallet(): Promise<OwnerWallet>;
  getWalletLedgerEntries(filter?: LedgerFilterPayload): Promise<WalletLedgerEntry[]>;
}

// ==========================================
// 8. PAYOUT REPOSITORY CONTRACT
// ==========================================
export interface CreatePayoutRequestPayload {
  payoutMethodId: string;
  amount: number;
  idempotencyKey: string;
}

export interface AddPayoutMethodPayload {
  type: OwnerPayoutMethod['type'];
  accountTitle: string;
  accountNumber: string;
  isDefault?: boolean;
}

export interface IPayoutRepository {
  getPayoutMethods(): Promise<OwnerPayoutMethod[]>;
  addOwnerPayoutMethod(payload: AddPayoutMethodPayload): Promise<OwnerPayoutMethod>;
  deleteOwnerPayoutMethod(id: string): Promise<void>;
  getPayoutRequests(): Promise<PayoutRequest[]>;
  createPayoutRequest(payload: CreatePayoutRequestPayload): Promise<PayoutRequest>;
  cancelPayoutRequestByOwner(id: string): Promise<PayoutRequest>;
}

// ==========================================
// 9. DISPUTE REPOSITORY CONTRACT
// ==========================================
export interface RespondToDisputePayload {
  disputeId: string;
  responseNote: string;
  evidenceFiles?: string[];
}

export interface IDisputeRepository {
  getDisputes(): Promise<Dispute[]>;
  getDisputeById(id: string): Promise<Dispute | null>;
  respondToDispute(payload: RespondToDisputePayload): Promise<Dispute>;
  getDisputeOwnerTimeoutStatus(disputeId: string): Promise<{
    isTimedOut: boolean;
    remainingMinutes: number;
  }>;
}

// ==========================================
// 10. MESSAGING REPOSITORY CONTRACT
// ==========================================
export interface SendChatMessagePayload {
  conversationId: string;
  text: string;
}

export interface IMessagingRepository {
  getConversations(): Promise<ChatConversation[]>;
  getChatMessages(conversationId: string): Promise<ChatMessage[]>;
  sendChatMessage(payload: SendChatMessagePayload): Promise<ChatMessage>;
  markConversationAsRead(conversationId: string): Promise<void>;
}

// ==========================================
// 11. NOTIFICATION REPOSITORY CONTRACT
// ==========================================
export interface INotificationRepository {
  getNotifications(): Promise<NotificationItem[]>;
  markNotificationAsRead(id: string): Promise<NotificationItem>;
  markAllNotificationsAsRead(): Promise<void>;
}

// ==========================================
// 12. ANALYTICS REPOSITORY CONTRACT
// ==========================================
export interface IAnalyticsRepository {
  getAdvancedAnalytics(timeRange: AnalyticsTimeRange): Promise<AdvancedOwnerAnalytics>;
}

// ==========================================
// 13. DOCUMENT REPOSITORY CONTRACT
// ==========================================
export interface PresignedUploadUrlResponse {
  uploadUrl: string;
  fileKey: string;
  expiresInSeconds: number;
}

export interface IDocumentRepository {
  getPresignedUploadUrl(fileName: string, mimeType: string): Promise<PresignedUploadUrlResponse>;
}

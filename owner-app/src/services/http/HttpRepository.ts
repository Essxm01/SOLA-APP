/**
 * Sola Vacation Rentals — Phase 7 Production HttpRepository Client
 * Location: src/services/http/HttpRepository.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 * 
 * Implements all 13 IRepository contracts for live production backend REST API communication.
 * Activated when VITE_USE_MOCK_REPO=false.
 */

import type {
  IAuthRepository,
  IOwnerRepository,
  IPropertyRepository,
  ICalendarRepository,
  IBookingRepository,
  IFinancialRepository,
  IWalletRepository,
  IPayoutRepository,
  IDisputeRepository,
  IMessagingRepository,
  INotificationRepository,
  IAnalyticsRepository,
  IDocumentRepository,
  RequestOtpPayload,
  VerifyOtpPayload,
  AuthSessionResponse,
  UpdateOwnerProfilePayload,
  CreatePropertyPayload,
  UpdatePropertyPayload,
  ToggleDateBlockPayload,
  SetNightlyPriceOverridePayload,
  CreateBookingPayload,
  RequestModificationPayload,
  ReviewModificationPayload,
  CreateCancellationPayload,
  ReviewCancellationPayload,
  LedgerFilterPayload,
  CreatePayoutRequestPayload,
  AddPayoutMethodPayload,
  RespondToDisputePayload,
  SendChatMessagePayload,
  PresignedUploadUrlResponse,
} from '../contracts';

import type {
  Owner,
  VerificationStatus,
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
export function mapOwnerProfileDtoToOwner(rawDto: unknown): Owner {
  if (!rawDto || typeof rawDto !== 'object') {
    throw new Error('MALFORMED_OWNER_PROFILE_DTO');
  }
  const dto = rawDto as Record<string, unknown>;
  const id = typeof dto.id === 'string' && dto.id.trim() !== '' ? dto.id.trim() : '';
  if (!id) {
    throw new Error('MALFORMED_OWNER_PROFILE_DTO: missing or invalid id');
  }

  const phone = typeof dto.phoneNumber === 'string' && dto.phoneNumber.trim() !== ''
    ? dto.phoneNumber.trim()
    : (typeof dto.phone === 'string' && dto.phone.trim() !== '' ? dto.phone.trim() : '');
  if (!phone) {
    throw new Error('MALFORMED_OWNER_PROFILE_DTO: missing or invalid phoneNumber');
  }

  const rawVerification = typeof dto.verificationStatus === 'string' && dto.verificationStatus.trim() !== ''
    ? dto.verificationStatus.trim()
    : (typeof dto.verification_status === 'string' && dto.verification_status.trim() !== '' ? dto.verification_status.trim() : '');
  if (!rawVerification) {
    throw new Error('MALFORMED_OWNER_PROFILE_DTO: missing or invalid verificationStatus');
  }

  const createdAt = typeof dto.createdAt === 'string' && dto.createdAt.trim() !== ''
    ? dto.createdAt.trim()
    : (typeof dto.created_at === 'string' && dto.created_at.trim() !== '' ? dto.created_at.trim() : '');
  if (!createdAt) {
    throw new Error('MALFORMED_OWNER_PROFILE_DTO: missing or invalid createdAt');
  }

  const updatedAt = typeof dto.updatedAt === 'string' && dto.updatedAt.trim() !== ''
    ? dto.updatedAt.trim()
    : (typeof dto.updated_at === 'string' && dto.updated_at.trim() !== '' ? dto.updated_at.trim() : '');
  if (!updatedAt) {
    throw new Error('MALFORMED_OWNER_PROFILE_DTO: missing or invalid updatedAt');
  }

  const name = typeof dto.fullName === 'string'
    ? dto.fullName
    : (typeof dto.name === 'string' ? dto.name : '');
  const avatar = typeof dto.avatarUrl === 'string'
    ? dto.avatarUrl
    : (typeof dto.avatar === 'string' ? dto.avatar : '');
  const verificationStatus = rawVerification as VerificationStatus;
  const verificationBadgeText =
    verificationStatus === 'VERIFIED'
      ? 'موثق'
      : (verificationStatus === 'PENDING_VERIFICATION' ? 'قيد المراجعة' : 'غير موثق');

  return {
    id,
    name,
    phone,
    avatar,
    verificationStatus,
    verificationBadgeText,
    ownerOnboardingCompletedAt: typeof dto.ownerOnboardingCompletedAt === 'string' ? dto.ownerOnboardingCompletedAt : (typeof dto.owner_onboarding_completed_at === 'string' ? dto.owner_onboarding_completed_at : null),
    createdAt,
    updatedAt,
  };
}

export class HttpRepository implements
  IAuthRepository,
  IOwnerRepository,
  IPropertyRepository,
  ICalendarRepository,
  IBookingRepository,
  IFinancialRepository,
  IWalletRepository,
  IPayoutRepository,
  IDisputeRepository,
  IMessagingRepository,
  INotificationRepository,
  IAnalyticsRepository,
  IDocumentRepository
{
  private baseUrl: string;

  constructor(baseUrl: string = '/api/v1') {
    this.baseUrl = baseUrl;
  }

  private async fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('sola_access_token');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    };

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    // Safely consume response body ONCE to prevent "Body has already been used" stream errors
    const responseText = await res.text().catch(() => '');
    let data: any = {};
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { message: responseText };
      }
    }

    if (!res.ok) {
      const serverMessage = data?.error?.message || data?.message || `HTTP_ERROR_${res.status}`;
      const error = new Error(serverMessage) as Error & { status?: number };
      error.status = res.status;
      throw error;
    }

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      if ('data' in data && data.data !== undefined) {
        return data.data;
      }
      if ('properties' in data && Array.isArray(data.properties)) return data.properties as unknown as T;
      if ('bookings' in data && Array.isArray(data.bookings)) return data.bookings as unknown as T;
      if ('notifications' in data && Array.isArray(data.notifications)) return data.notifications as unknown as T;
      if ('disputes' in data && Array.isArray(data.disputes)) return data.disputes as unknown as T;
      if ('conversations' in data && Array.isArray(data.conversations)) return data.conversations as unknown as T;
      if ('payoutRequests' in data && Array.isArray(data.payoutRequests)) return data.payoutRequests as unknown as T;
      if ('payoutMethods' in data && Array.isArray(data.payoutMethods)) return data.payoutMethods as unknown as T;
    }
    return data;
  }

  // 1. Auth Repository
  async requestOtp(payload: RequestOtpPayload): Promise<{ success: boolean; message: string }> {
    return this.fetchJson('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async verifyOtp(payload: VerifyOtpPayload): Promise<AuthSessionResponse> {
    return this.fetchJson('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async prototypeLogin(payload: { phone: string; surface: 'CUSTOMER' | 'OWNER'; fullName?: string }): Promise<any> {
    return this.fetchJson('/auth/prototype-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async registerOwner(payload: { phone: string; fullName: string }): Promise<any> {
    return this.fetchJson('/auth/register-owner', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async refreshSession(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    return this.fetchJson('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async revokeSession(refreshToken: string): Promise<void> {
    return this.fetchJson('/auth/revoke', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  // 2. Owner Repository
  async getCurrentOwner(): Promise<Owner> {
    const raw = await this.fetchJson<any>('/owner/profile');
    return mapOwnerProfileDtoToOwner(raw);
  }

  async updateOwnerProfile(updates: UpdateOwnerProfilePayload): Promise<Owner> {
    const payload: Record<string, any> = {};
    if (updates.name !== undefined || updates.fullName !== undefined) {
      payload.fullName = updates.fullName !== undefined ? updates.fullName : updates.name;
    }
    if (updates.email !== undefined) {
      payload.email = updates.email;
    }
    if (updates.avatar !== undefined || updates.avatarUrl !== undefined) {
      payload.avatarUrl = updates.avatarUrl !== undefined ? updates.avatarUrl : updates.avatar;
    }

    const raw = await this.fetchJson<any>('/owner/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return mapOwnerProfileDtoToOwner(raw);
  }

  async uploadOwnerDocument(document: OwnerVerificationDocument): Promise<Owner> {
    return this.fetchJson('/owner/profile/documents', {
      method: 'POST',
      body: JSON.stringify(document),
    });
  }

  async getKycStatus(): Promise<any> {
    return this.fetchJson('/owner/kyc/status');
  }

  async getKycPresignedUpload(payload: { documentType: 'NATIONAL_ID_FRONT' | 'NATIONAL_ID_BACK' | 'LIVE_FACE'; fileName: string; mimeType: string; fileSize: number }): Promise<any> {
    return this.fetchJson('/owner/kyc/presigned-upload', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async submitKycPackage(documents: any[]): Promise<any> {
    return this.fetchJson('/owner/kyc/submit', {
      method: 'POST',
      body: JSON.stringify({ documents }),
    });
  }

  // 3. Property Repository
  async getProperties(): Promise<Property[]> {
    return this.fetchJson('/owner/properties');
  }

  async getPropertyById(id: string): Promise<Property | null> {
    return this.fetchJson(`/owner/properties/${id}`);
  }

  async createProperty(data: CreatePropertyPayload): Promise<Property> {
    return this.fetchJson('/owner/properties', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProperty(id: string, data: UpdatePropertyPayload): Promise<Property> {
    return this.fetchJson(`/owner/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async submitPropertyForReview(id: string): Promise<Property> {
    return this.fetchJson(`/owner/properties/${id}/submit`, {
      method: 'POST',
    });
  }

  async pauseProperty(id: string): Promise<Property> {
    return this.fetchJson(`/owner/properties/${id}/pause`, {
      method: 'POST',
    });
  }

  async resumeProperty(id: string): Promise<Property> {
    return this.fetchJson(`/owner/properties/${id}/resume`, {
      method: 'POST',
    });
  }

  async archiveProperty(id: string): Promise<Property> {
    return this.fetchJson(`/owner/properties/${id}/archive`, {
      method: 'POST',
    });
  }

  async restoreProperty(id: string): Promise<Property> {
    return this.fetchJson(`/owner/properties/${id}/restore`, {
      method: 'POST',
    });
  }

  async deleteProperty(id: string): Promise<void> {
    return this.fetchJson(`/owner/properties/${id}`, {
      method: 'DELETE',
    });
  }

  async getImagePresignedUrl(propertyId: string, payload: { fileName: string; mimeType: string; fileSize: number }): Promise<any> {
    return this.fetchJson(`/owner/properties/${propertyId}/images/presigned-url`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async commitPropertyImage(propertyId: string, payload: {
    intentId?: string;
    objectKey: string;
    fileUrl: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    sortOrder?: number;
  }): Promise<any> {
    return this.fetchJson(`/owner/properties/${propertyId}/images`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deletePropertyImage(propertyId: string, imageId: string): Promise<void> {
    return this.fetchJson(`/owner/properties/${propertyId}/images/${imageId}`, {
      method: 'DELETE',
    });
  }

  async getPropertyImages(propertyId: string): Promise<any[]> {
    return this.fetchJson(`/owner/properties/${propertyId}/images`);
  }

  // 4. Calendar Repository
  async getAvailabilityRecords(propertyId: string): Promise<AvailabilityRecord[]> {
    return this.fetchJson(`/owner/calendar/${propertyId}`);
  }

  async toggleDateBlock(payload: ToggleDateBlockPayload): Promise<AvailabilityRecord> {
    return this.fetchJson('/owner/calendar/toggle-block', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async setNightlyPriceOverride(payload: SetNightlyPriceOverridePayload): Promise<AvailabilityRecord> {
    return this.fetchJson('/owner/calendar/price-override', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updatePropertyPricing(propertyId: string, pricingMap: Record<string, number>): Promise<Property> {
    return this.fetchJson(`/owner/properties/${propertyId}/pricing`, {
      method: 'PUT',
      body: JSON.stringify({ pricingMap }),
    });
  }

  // 5. Booking Repository
  async getBookings(): Promise<Booking[]> {
    return this.fetchJson('/owner/bookings');
  }

  async getBookingById(id: string): Promise<Booking | null> {
    return this.fetchJson(`/owner/bookings/${id}`);
  }

  async createBooking(payload: CreateBookingPayload): Promise<Booking> {
    return this.fetchJson('/owner/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async approveBooking(id: string): Promise<Booking> {
    return this.fetchJson(`/owner/bookings/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectBooking(id: string): Promise<Booking> {
    return this.fetchJson(`/owner/bookings/${id}/reject`, {
      method: 'POST',
    });
  }

  async createModificationRequest(payload: RequestModificationPayload): Promise<BookingModificationRequest> {
    return this.fetchJson(`/owner/bookings/${payload.bookingId}/modifications`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async reviewModificationRequest(payload: ReviewModificationPayload): Promise<BookingModificationRequest> {
    return this.fetchJson('/owner/bookings/modification-review', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createCancellationRequest(payload: CreateCancellationPayload): Promise<BookingCancellationRequest> {
    return this.fetchJson(`/owner/bookings/${payload.bookingId}/cancellations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async reviewCancellationRequest(payload: ReviewCancellationPayload): Promise<BookingCancellationRequest> {
    return this.fetchJson('/owner/bookings/cancellation-review', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // 6. Financials Repository
  async getOrCreateFinancialSummary(booking: Booking): Promise<BookingFinancialSummary> {
    return this.fetchJson(`/owner/bookings/${booking.id}/financials`);
  }

  async getFinancialAnalyticsSummary(period?: string): Promise<FinancialAnalyticsSummary> {
    return this.fetchJson(`/owner/financials/summary?period=${period || 'all'}`);
  }

  // 7. Wallet Repository
  async getOwnerWallet(): Promise<OwnerWallet> {
    return this.fetchJson('/owner/wallet');
  }

  async getWalletLedgerEntries(filter?: LedgerFilterPayload): Promise<WalletLedgerEntry[]> {
    const query = filter ? `?limit=${filter.limit || 50}&offset=${filter.offset || 0}` : '';
    return this.fetchJson(`/owner/wallet/ledger${query}`);
  }

  // 8. Payout Repository
  async getPayoutMethods(): Promise<OwnerPayoutMethod[]> {
    return this.fetchJson('/owner/payouts/methods');
  }

  async addOwnerPayoutMethod(payload: AddPayoutMethodPayload): Promise<OwnerPayoutMethod> {
    return this.fetchJson('/owner/payouts/methods', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteOwnerPayoutMethod(id: string): Promise<void> {
    return this.fetchJson(`/owner/payouts/methods/${id}`, {
      method: 'DELETE',
    });
  }

  async getPayoutRequests(): Promise<PayoutRequest[]> {
    return this.fetchJson('/owner/payouts');
  }

  async createPayoutRequest(payload: CreatePayoutRequestPayload): Promise<PayoutRequest> {
    return this.fetchJson('/owner/payouts', {
      method: 'POST',
      headers: {
        'Idempotency-Key': payload.idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
  }

  async cancelPayoutRequestByOwner(id: string): Promise<PayoutRequest> {
    return this.fetchJson(`/owner/payouts/${id}/cancel`, {
      method: 'POST',
    });
  }

  // 9. Dispute Repository
  async getDisputes(): Promise<Dispute[]> {
    return this.fetchJson('/owner/disputes');
  }

  async getDisputeById(id: string): Promise<Dispute | null> {
    return this.fetchJson(`/owner/disputes/${id}`);
  }

  async respondToDispute(payload: RespondToDisputePayload): Promise<Dispute> {
    return this.fetchJson(`/owner/disputes/${payload.disputeId}/respond`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getDisputeOwnerTimeoutStatus(disputeId: string): Promise<{ isTimedOut: boolean; remainingMinutes: number }> {
    return this.fetchJson(`/owner/disputes/${disputeId}/timeout-status`);
  }

  // 10. Messaging Repository
  async getConversations(): Promise<ChatConversation[]> {
    return this.fetchJson('/owner/conversations');
  }

  async getOrCreateConversationForBooking(bookingId: string): Promise<ChatConversation> {
    return this.fetchJson(`/owner/bookings/${bookingId}/conversation`, { method: 'POST' });
  }

  async getChatMessages(conversationId: string): Promise<ChatMessage[]> {
    return this.fetchJson(`/owner/conversations/${conversationId}/messages`);
  }

  async sendChatMessage(payload: SendChatMessagePayload): Promise<ChatMessage> {
    return this.fetchJson(`/owner/conversations/${payload.conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text: payload.text }),
    });
  }

  async markConversationAsRead(conversationId: string): Promise<void> {
    return this.fetchJson(`/owner/messages/conversations/${conversationId}/read`, {
      method: 'POST',
    });
  }

  // 11. Notification Repository
  async getNotifications(): Promise<NotificationItem[]> {
    return this.fetchJson('/owner/notifications');
  }

  async markNotificationAsRead(id: string): Promise<NotificationItem> {
    return this.fetchJson(`/owner/notifications/${id}/read`, {
      method: 'POST',
    });
  }

  async markAllNotificationsAsRead(): Promise<void> {
    return this.fetchJson('/owner/notifications/read-all', {
      method: 'POST',
    });
  }

  // 12. Analytics Repository
  async getAdvancedAnalytics(timeRange: AnalyticsTimeRange): Promise<AdvancedOwnerAnalytics> {
    return this.fetchJson(`/owner/analytics?timeRange=${timeRange}`);
  }

  // 13. Document Repository
  async getPresignedUploadUrl(fileName: string, mimeType: string): Promise<PresignedUploadUrlResponse> {
    return this.fetchJson('/owner/documents/presigned-url', {
      method: 'POST',
      body: JSON.stringify({ fileName, mimeType }),
    });
  }
}

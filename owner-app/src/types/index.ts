export type PropertyStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'PUBLISHED'
  | 'PAUSED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'ARCHIVED';

export type PropertyVerificationStatus =
  | 'UNVERIFIED'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'REJECTED';

export type PropertyType =
  | 'CHALET'
  | 'VILLA'
  | 'APARTMENT'
  | 'STUDIO'
  | 'HOTEL_ROOM'
  | 'OTHER';

export type BookingStatus =
  | 'PENDING_OWNER_APPROVAL'
  | 'APPROVED_PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLATION_REQUESTED'
  | 'CANCELLED'
  | 'REQUESTED'
  | 'OWNER_ACCEPTED'
  | 'OWNER_REJECTED'
  | 'PAYMENT_PENDING'
  | 'ACTIVE'
  | 'COMPLETED';

export type ModificationStatus =
  | 'PENDING_OWNER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'FAILED_AVAILABILITY';

export type CancellationStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'FAILED';

export type DepositPaymentStatus =
  | 'UNPAID'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type RemainingBalancePaymentMethod =
  | 'CASH_ON_ARRIVAL'
  | 'IN_APP_PAYMENT_ON_ARRIVAL';

export type RemainingBalanceStatus =
  | 'NOT_DUE'
  | 'PAYMENT_INITIATED'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED';

export type FinancialTransactionType =
  | 'DEPOSIT_PAYMENT'
  | 'SOLA_COMMISSION'
  | 'OWNER_PAYOUT'
  | 'REMAINING_BALANCE_PAYMENT'
  | 'REFUND';

export type FinancialTransactionStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type OwnerPayoutStatus =
  | 'OWNER_PAYOUT_PENDING'
  | 'OWNER_PAYOUT_PROCESSING'
  | 'OWNER_PAYOUT_COMPLETED'
  | 'OWNER_PAYOUT_FAILED';

export type FinancialAdjustmentType =
  | 'NO_CHANGE'
  | 'ADDITIONAL_PAYMENT_REQUIRED'
  | 'REFUND_REQUIRED';

export type DisputeType =
  | 'PROPERTY_MISMATCH'
  | 'PROPERTY_UNAVAILABLE'
  | 'MAJOR_AMENITY_MISSING'
  | 'PROPERTY_CONDITION'
  | 'SAFETY_ISSUE'
  | 'WRONG_UNIT'
  | 'OTHER';

export type DisputeSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DisputeStatus =
  | 'OPENED'
  | 'UNDER_OWNER_RESPONSE'
  | 'OWNER_RESPONDED'
  | 'UNDER_ADMIN_REVIEW'
  | 'WAITING_FOR_MORE_EVIDENCE'
  | 'RESOLUTION_PROPOSED'
  | 'RESOLVED'
  | 'REJECTED'
  | 'CANCELLED';

export type DisputeResolutionType =
  | 'NO_FINANCIAL_ACTION'
  | 'PARTIAL_REFUND'
  | 'FULL_REFUND'
  | 'OWNER_REMEDY'
  | 'PROPERTY_REPLACEMENT'
  | 'DISPUTE_REJECTED';

export type EvidenceSubmittedBy = 'RENTER' | 'OWNER' | 'ADMIN';
export type EvidenceType = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'TEXT';

export type VerificationStatus = 'NOT_VERIFIED' | 'UNVERIFIED' | 'PENDING' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';

export type UnitType = 'شاليه' | 'فيلا' | 'شقة' | 'استوديو' | 'غرفة فندقية';

export type AvailabilityStatus = 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'PENDING';

// Phase 4 Gap 4B: Property Owner Verification Documents
export type VerificationDocumentType = 'NATIONAL_ID' | 'PROPERTY_DEED' | 'LEASE_CONTRACT' | 'OTHER';

export interface OwnerVerificationDocument {
  id: string;
  ownerId: string;
  propertyId?: string;
  type: VerificationDocumentType;
  fileUrl: string;
  title: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  uploadedAt: string;
}

// Phase 5: Wallet & Payout Types
export type PayoutStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export type PayoutMethodType =
  | 'BANK_TRANSFER'
  | 'INSTAPAY'
  | 'VODAFONE_CASH'
  | 'ORANGE_CASH'
  | 'ETISALAT_CASH';

export interface OwnerPayoutMethod {
  id: string;
  ownerId: string;
  type: PayoutMethodType;
  accountTitle: string;
  accountNumberOrIban: string;
  bankName?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface OwnerWallet {
  ownerId: string;
  currency: string;
  availableBalance: number;
  pendingBalance: number;
  reservedForPayout: number;
  heldBalance: number;
  totalEarnedLifeTime: number;
  totalWithdrawnLifeTime: number;
  updatedAt: string;
}

export type WalletTransactionType =
  | 'DEPOSIT_HELD_IN_ESCROW'
  | 'DEPOSIT_AVAILABLE'
  | 'DEPOSIT_CREDIT'
  | 'PAYOUT_RESERVATION'
  | 'PAYOUT_WITHDRAWAL'
  | 'PAYOUT_RELEASE'
  | 'DISPUTE_FREEZE'
  | 'DISPUTE_RELEASE'
  | 'REFUND_DEBIT'
  | 'ADJUSTMENT_CREDIT'
  | 'ADJUSTMENT_DEBIT';

export interface WalletLedgerEntry {
  id: string;
  ownerId: string;
  bookingId?: string;
  payoutRequestId?: string;
  disputeId?: string;
  type: WalletTransactionType;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  previousBalance: number;
  newBalance: number;
  description: string;
  title?: string;
  statusLabel?: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface PayoutRequest {
  id: string;
  ownerId: string;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  payoutMethod: OwnerPayoutMethod;
  status: PayoutStatus;
  requestedAt: string;
  processedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  providerTransactionId?: string;
  notes?: string;
}

export interface FinancialAnalyticsSummary {
  ownerId: string;
  period: string;
  totalBookingsCount: number;
  totalGrossRevenue: number;
  totalDepositsCollected: number;
  totalSolaCommissionsPaid: number;
  totalOwnerNetEarned: number;
  totalExpectedArrivalCash: number;
  occupancyRatePercentage: number;
  averageDailyRate: number;
  revenuePerAvailableRoom: number;
}

export type NotificationType =
  | 'BOOKING_REQUEST_RECEIVED'
  | 'BOOKING_REQUEST_APPROVED'
  | 'BOOKING_REQUEST_REJECTED'
  | 'BOOKING_REQUEST_EXPIRED'
  | 'BOOKING_MODIFICATION_REQUEST_RECEIVED'
  | 'BOOKING_MODIFICATION_APPROVED'
  | 'BOOKING_MODIFICATION_REJECTED'
  | 'BOOKING_MODIFICATION_FAILED_AVAILABILITY'
  | 'CANCELLATION_REQUEST_RECEIVED'
  | 'CANCELLATION_APPROVED'
  | 'CANCELLATION_REJECTED'
  | 'BOOKING_CANCELLED'
  | 'DEPOSIT_PAYMENT_REQUIRED'
  | 'DEPOSIT_PAYMENT_SUCCESS'
  | 'DEPOSIT_PAYMENT_FAILED'
  | 'BOOKING_FINANCIALLY_CONFIRMED'
  | 'REFUND_INITIATED'
  | 'REFUND_COMPLETED'
  | 'ADDITIONAL_PAYMENT_REQUIRED'
  | 'REMAINING_BALANCE_DUE'
  | 'DISPUTE_OPENED'
  | 'DISPUTE_OWNER_RESPONSE_REQUIRED'
  | 'DISPUTE_ADMIN_REVIEW'
  | 'DISPUTE_RESOLVED'
  | 'DISPUTE_REJECTED'
  | 'PROPERTY_SUBMITTED_FOR_REVIEW'
  | 'PROPERTY_APPROVED'
  | 'PROPERTY_REJECTED'
  | 'PROPERTY_SUSPENDED'
  | 'PROPERTY_PUBLISHED'
  | 'PROPERTY_PAUSED'
  | 'PROPERTY_VERIFICATION_SUBMITTED'
  | 'PROPERTY_VERIFICATION_APPROVED'
  | 'PROPERTY_VERIFICATION_REJECTED'
  | 'PAYOUT_REQUEST_SUBMITTED'
  | 'PAYOUT_PROCESSING'
  | 'PAYOUT_COMPLETED'
  | 'PAYOUT_REJECTED'
  | 'PROPERTY_STATUS'
  | 'SYSTEM'
  | 'CHAT';

export type NotificationEntityType =
  | 'BOOKING'
  | 'MODIFICATION'
  | 'CANCELLATION'
  | 'PAYMENT'
  | 'DISPUTE'
  | 'PROPERTY'
  | 'PAYOUT'
  | 'CHAT';

export interface PropertyLocation {
  governorate: string;
  city: string;
  district: string;
  resortName?: string;
  unitNumber?: string;
  address: string;
  lat?: number;
  lng?: number;
}

export interface PropertyCapacity {
  baseGuests: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  floors?: number;
  areaSqM?: number;
}

export interface PropertyImage {
  id: string;
  url: string;
  isMain: boolean;
  order: number;
  uploadedAt: string;
}

export interface PropertyRules {
  minStay: number;
  maxStay: number;
  smokingAllowed: boolean;
  partiesAllowed: boolean;
  petsAllowed: boolean;
  childrenAllowed?: boolean;
  checkInTime: string;
  checkOutTime: string;
  specialInstructions?: string;
  additionalRules?: string;
}

export interface SeasonalPricePeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  pricePerNight: number;
}

export interface PropertyPricing {
  basePricePerNight: number;
  currency: string;
  dailyPricingMap?: Record<string, number>;
  seasonalPrices?: SeasonalPricePeriod[];
}

export interface Property {
  id: string;
  ownerId: string;
  title: string;
  unitType: UnitType;
  propertyType: PropertyType;
  description: string;
  region: string;
  locationName: string;
  resortName: string;
  address: string;
  location: PropertyLocation;
  capacity: PropertyCapacity;
  images: string[];
  propertyImages?: PropertyImage[];
  mainImageIndex: number;
  pricePerNight: number;
  currency: string;
  pricing: PropertyPricing;
  rating: number;
  reviewsCount: number;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  areaSqM?: number;
  bedsCount?: number;
  amenities: string[];
  houseRules: PropertyRules;
  status: PropertyStatus;
  verificationStatus: PropertyVerificationStatus;
  verificationDocuments?: OwnerVerificationDocument[];
  rejectionReason?: string;
  suspensionReason?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  suspendedAt?: string;
  archivedAt?: string;
}

// Phase 4 Gap 4A: Extended Snapshot with Dynamic Daily Pricing Granularity
export interface BookingPropertySnapshot {
  propertyId: string;
  propertyTitle: string;
  propertyType: PropertyType;
  location: PropertyLocation;
  capacity: PropertyCapacity;
  amenities: string[];
  images: string[];
  rules: PropertyRules;
  basePriceAtBooking: number;
  dailyPricingMapAtBooking?: Record<string, number>;
  bookedNightlyPrices?: { date: string; price: number }[];
  capturedAt: string;
}

export type PropertyAuditAction =
  | 'PROPERTY_CREATED'
  | 'PROPERTY_UPDATED_NONSENSITIVE'
  | 'PROPERTY_UPDATED_SENSITIVE'
  | 'PROPERTY_SUBMITTED_FOR_REVIEW'
  | 'PROPERTY_APPROVED'
  | 'PROPERTY_REJECTED'
  | 'PROPERTY_PAUSED'
  | 'PROPERTY_RESUMED'
  | 'PROPERTY_SUSPENDED'
  | 'PROPERTY_ARCHIVED'
  | 'PROPERTY_RESUMED_FROM_ARCHIVE'
  | 'PROPERTY_VERIFICATION_SUBMITTED'
  | 'PROPERTY_VERIFICATION_APPROVED'
  | 'PROPERTY_VERIFICATION_REJECTED'
  | 'PROPERTY_PRICING_UPDATED';

export interface PropertyAuditLog {
  id: string;
  propertyId: string;
  actorId: string;
  actorType: 'OWNER' | 'ADMIN' | 'SYSTEM';
  action: PropertyAuditAction;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AvailabilityRecord {
  id: string;
  propertyId: string;
  date: string;
  status: AvailabilityStatus;
  customPricePerNight?: number;
  notes?: string;
  updatedAt: string;
}

export interface Amenity {
  id: string;
  name: string;
  iconName: string;
  category: 'العامة' | 'الترفيه' | 'المطبخ' | 'الخدمات';
}

export interface Owner {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  verificationStatus: VerificationStatus;
  verificationBadgeText: string;
  createdAt: string;
}

export interface Renter {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  rating: number;
}

export interface BookingFinancialSummary {
  bookingId: string;
  totalBookingValue: number;
  firstNightPrice: number;
  depositAmount: number;
  depositPaymentStatus: DepositPaymentStatus;

  solaCommissionRate: number;
  solaCommissionAmount: number;
  ownerNetDepositAmount: number;

  remainingBalance: number;
  remainingBalancePaymentMethod: RemainingBalancePaymentMethod;
  remainingBalanceStatus: RemainingBalanceStatus;

  ownerPayoutStatus: OwnerPayoutStatus;
  currency: string;

  createdAt: string;
  updatedAt: string;
}

export interface FinancialTransaction {
  id: string;
  bookingId: string;
  type: FinancialTransactionType;
  amount: number;
  currency: string;
  payer: string;
  beneficiary: string;
  status: FinancialTransactionStatus;
  provider: string;
  providerTransactionId: string;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
}

export interface FinancialAdjustment {
  id: string;
  bookingId: string;
  modificationRequestId?: string;
  previousDeposit: number;
  newDeposit: number;
  previousTotal: number;
  newTotal: number;
  difference: number;
  adjustmentType: FinancialAdjustmentType;
  paymentStatus: string;
  createdAt: string;
}

export interface FinancialAuditLog {
  id: string;
  event: string;
  bookingId: string;
  transactionId?: string;
  actor: string;
  previousState?: string;
  newState?: string;
  amount?: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface DisputeEvidence {
  id: string;
  disputeId: string;
  submittedBy: EvidenceSubmittedBy;
  type: EvidenceType;
  url: string;
  description: string;
  createdAt: string;
}

export interface FinancialDisputeHold {
  id: string;
  disputeId: string;
  bookingId: string;
  reason: string;
  status: 'ACTIVE' | 'RELEASED' | 'CONVERTED_TO_REFUND' | 'CLOSED';
  createdAt: string;
  releasedAt?: string;
}

export interface DisputeAuditLog {
  id: string;
  disputeId: string;
  action: string;
  actorId: string;
  actorType: 'RENTER' | 'OWNER' | 'ADMIN' | 'SYSTEM';
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface Dispute {
  id: string;
  bookingId: string;
  propertyId: string;
  renterId: string;
  ownerId: string;

  propertyTitle: string;
  propertyImage: string;
  locationName: string;
  renterName: string;
  renterAvatar: string;
  renterPhone: string;

  type: DisputeType;
  severity: DisputeSeverity;
  status: DisputeStatus;
  description: string;

  evidence: DisputeEvidence[];

  ownerResponse?: string;
  ownerResponseAt?: string;
  ownerEvidence?: DisputeEvidence[];

  resolutionType?: DisputeResolutionType;
  resolutionReason?: string;
  resolvedBy?: string;
  financialDecisionId?: string;
  financialHold?: FinancialDisputeHold;

  openedAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface BookingModificationRequest {
  id: string;
  bookingId: string;
  propertyId: string;
  renterId: string;
  ownerId: string;

  originalCheckIn: string;
  originalCheckOut: string;
  originalNights: number;

  requestedCheckIn: string;
  requestedCheckOut: string;
  requestedNights: number;

  originalTotalPrice: number;
  requestedTotalPrice: number;
  priceDifference: number;

  paymentRequired?: boolean;
  amountDue?: number;
  refundRequired?: boolean;
  refundAmount?: number;

  status: ModificationStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  chatMessageId?: string;
}

export interface BookingModificationHistory {
  id: string;
  bookingId: string;
  oldCheckIn: string;
  oldCheckOut: string;
  newCheckIn: string;
  newCheckOut: string;
  requestedBy: string;
  approvedBy: string;
  status: ModificationStatus;
  createdAt: string;
}

export interface BookingCancellationRequest {
  id: string;
  bookingId: string;
  propertyId: string;
  renterId: string;
  ownerId: string;

  requestedBy: 'RENTER' | 'OWNER';
  reason?: string;

  status: CancellationStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  rejectionReason?: string;

  financialImpact?: 'NONE' | 'REFUND_REQUIRED' | 'POSSIBLE_REFUND';
  refundRequired?: boolean;
  refundAmount?: number;
  refundStatus?: 'PENDING_PAYMENT_ENGINE';
}

export interface BookingCancellationHistory {
  id: string;
  bookingId: string;
  cancellationRequestId: string;
  requestedBy: 'RENTER' | 'OWNER';
  resolvedBy: string;
  previousBookingStatus: BookingStatus;
  newBookingStatus: BookingStatus;
  reason?: string;
  createdAt: string;
  resolvedAt: string;
}

export interface Booking {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  locationName: string;
  renter: Renter;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestsCount: number;
  totalPrice: number;
  deposit: number;
  currency: string;
  status: BookingStatus;
  confirmedAt?: string;
  rejectedAt?: string;
  expiresAt?: string;
  activeModificationRequestId?: string;
  hasModificationRequest?: boolean;
  activeCancellationRequestId?: string;
  hasCancellationRequest?: boolean;
  activeDisputeId?: string;
  hasDispute?: boolean;
  financialSummary?: BookingFinancialSummary;
  propertySnapshot?: BookingPropertySnapshot;
  createdAt: string;
  updatedAt: string;
}

export type ChatMessageType =
  | 'TEXT'
  | 'BOOKING_MODIFICATION_REQUEST'
  | 'BOOKING_MODIFICATION_APPROVED'
  | 'BOOKING_MODIFICATION_REJECTED'
  | 'BOOKING_MODIFICATION_FAILED'
  | 'BOOKING_CANCELLATION_REQUEST'
  | 'BOOKING_CANCELLATION_APPROVED'
  | 'BOOKING_CANCELLATION_REJECTED'
  | 'DISPUTE_OPENED'
  | 'DISPUTE_OWNER_RESPONDED'
  | 'DISPUTE_RESOLVED'
  | 'DISPUTE_REJECTED';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'OWNER' | 'RENTER' | 'SYSTEM';
  text: string;
  type: ChatMessageType;
  modificationRequest?: BookingModificationRequest;
  cancellationRequest?: BookingCancellationRequest;
  dispute?: Dispute;
  timestamp: string;
  isRead: boolean;
}

export interface ChatConversation {
  id: string;
  bookingId?: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  renter: Renter;
  lastMessage: string;
  lastMessageTimestamp: string;
  unreadCount: number;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  actionRoute?: string;
  metadata?: Record<string, unknown>;
  deduplicationKey?: string;
}

export interface DashboardMetrics {
  newBookingRequestsCount: number;
  pendingModificationRequestsCount: number;
  pendingCancellationRequestsCount: number;
  openDisputesCount: number;
  pendingOwnerResponseDisputesCount: number;
  unreadMessagesCount: number;
  upcomingBookingsCount: number;
  underReviewPropertiesCount: number;
  unreadNotificationsCount: number;

  totalPropertiesCount: number;
  publishedPropertiesCount: number;
  draftPropertiesCount: number;
  pausedPropertiesCount: number;

  totalConfirmedDepositsOwnerNet: number;
  totalExpectedBalanceOnArrival: number;
  totalPendingDepositsCount: number;
}

export interface CancellationContext {
  bookingId: string;
  bookingStatus: BookingStatus;
  checkIn: string;
  checkOut: string;
  currentTime: string;
  hoursUntilCheckIn: number;
  daysUntilCheckIn: number;
}

// ==========================================
// PHASE 6: OWNER ANALYTICS & OPERATIONAL INSIGHTS TYPES
// ==========================================

export type AnalyticsTimeRange = 'month' | 'quarter' | 'season' | 'year' | 'all';

export interface PropertyPerformanceMetric {
  propertyId: string;
  propertyTitle: string;
  propertyType: PropertyType;
  locationName: string;
  totalBookingsCount: number;
  totalBookedNights: number;
  totalGrossRevenue: number;
  ownerNetEarnings: number;
  occupancyRatePercentage: number;
  averageDailyRate: number;
  revenuePerAvailableRoom: number;
  averageLengthOfStay: number;
  disputesCount: number;
  rank: number;
}

export interface OperationalQualityIndex {
  ownerId: string;
  totalRequestsReceivedCount: number;
  approvedRequestsCount: number;
  rejectedRequestsCount: number;
  expiredRequestsCount: number;
  approvalRatePercentage: number;
  averageOwnerResponseTimeMinutes: number;
  totalDisputesOpenedCount: number;
  disputeRatioPercentage: number;
  averageLengthOfStayNights: number;
  averageLeadTimeDays: number;
  overallQualityScore: number; // 0 - 100
}

export interface AdvancedOwnerAnalytics {
  ownerId: string;
  timeRange: AnalyticsTimeRange;
  financialSummary: FinancialAnalyticsSummary;
  propertyMetrics: PropertyPerformanceMetric[];
  qualityIndex: OperationalQualityIndex;
  topPerformingProperty?: PropertyPerformanceMetric;
  generatedAt: string;
}

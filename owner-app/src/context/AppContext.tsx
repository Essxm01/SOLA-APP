import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  Property,
  Booking,
  NotificationItem,
  DashboardMetrics,
  AvailabilityRecord,
  BookingModificationRequest,
  BookingCancellationRequest,
  BookingFinancialSummary,
  FinancialTransaction,
  FinancialAuditLog,
  CancellationContext,
  Dispute,
  DisputeResolutionType,
  PropertyAuditLog,
  ChatConversation,
  ChatMessage,
  ChatMessageType,
  OwnerWallet,
  OwnerPayoutMethod,
  PayoutRequest,
  WalletLedgerEntry,
  FinancialAnalyticsSummary,
  AdvancedOwnerAnalytics,
  AnalyticsTimeRange,
} from '../types';
import { mockRepository } from '../services/mockRepository';
import { repositoryFactory } from '../services/repositoryFactory';

type NavTab = 'home' | 'bookings' | 'properties' | 'messages' | 'disputes' | 'wallet' | 'profile' | 'calendar';
type PropertyViewMode = 'list' | 'details' | 'wizard';
type BookingSegment = 'pending' | 'upcoming' | 'past';

interface ToastState {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isEmptyDashboard: boolean;
  setIsEmptyDashboard: (empty: boolean) => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  properties: Property[];
  bookings: Booking[];
  notifications: NotificationItem[];
  metrics: DashboardMetrics;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  toast: ToastState | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  deviceViewMode: 'mobile-frame' | 'full-screen';
  setDeviceViewMode: (mode: 'mobile-frame' | 'full-screen') => void;

  // Phase 2 & Phase 4: Property & Listing Management
  selectedPropertyId: string | null;
  setSelectedPropertyId: (id: string | null) => void;
  propertyViewMode: PropertyViewMode;
  setPropertyViewMode: (mode: PropertyViewMode) => void;
  wizardStep: number;
  setWizardStep: (step: number) => void;
  currentDraft: Partial<Property> | null;
  setCurrentDraft: (draft: Partial<Property> | null) => void;
  createOrUpdateProperty: (data: Partial<Property>, submitForReview?: boolean) => Promise<Property>;
  submitPropertyForReview: (propertyId: string) => Promise<void>;
  pauseProperty: (propertyId: string) => Promise<void>;
  resumeProperty: (propertyId: string) => Promise<void>;
  archiveProperty: (propertyId: string) => Promise<void>;
  restoreProperty: (propertyId: string) => Promise<void>;
  deleteProperty: (propertyId: string) => Promise<void>;
  submitOwnerVerificationDocuments: (
    propertyId: string,
    documents: Array<{ type: 'NATIONAL_ID' | 'PROPERTY_DEED' | 'LEASE_CONTRACT' | 'OTHER'; fileUrl: string; title: string }>
  ) => Promise<void>;
  setDailyPricing: (propertyId: string, datePriceMap: Record<string, number>) => Promise<void>;
  getPropertyAuditLogs: (propertyId: string) => Promise<PropertyAuditLog[]>;
  openAddPropertyWizard: (initialData?: Partial<Property>) => void;
  openPropertyDetails: (propertyId: string) => void;

  // Phase 3A: Calendar & Availability
  calendarPropertyId: string | null;
  setCalendarPropertyId: (id: string | null) => void;
  openCalendarForProperty: (propertyId: string) => void;
  getAvailability: (propertyId: string, year: number, month: number) => Promise<AvailabilityRecord[]>;
  blockDates: (propertyId: string, dates: string[]) => Promise<void>;
  unblockDates: (propertyId: string, dates: string[]) => Promise<void>;

  // Phase 3B: Booking Engine & State Machine
  bookingTabSegment: BookingSegment;
  setBookingTabSegment: (segment: BookingSegment) => void;
  selectedBookingId: string | null;
  setSelectedBookingId: (id: string | null) => void;
  approveBooking: (bookingId: string) => Promise<void>;
  rejectBooking: (bookingId: string) => Promise<void>;
  openPendingBookings: () => void;

  // Phase 3C: Booking Modification System & Chat Integration
  modificationRequests: BookingModificationRequest[];
  chatConversations: ChatConversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  createModificationRequest: (params: {
    bookingId: string;
    requestedCheckIn: string;
    requestedCheckOut: string;
    reason?: string;
  }) => Promise<BookingModificationRequest>;
  approveModificationRequest: (requestId: string) => Promise<void>;
  rejectModificationRequest: (requestId: string, reason?: string) => Promise<void>;
  isWithinSelfModificationWindow: (confirmedAt?: string) => boolean;
  openChatForBooking: (bookingId: string) => void;
  getChatMessages: (conversationId: string) => Promise<ChatMessage[]>;
  sendChatMessage: (conversationId: string, text: string, type?: ChatMessageType) => Promise<ChatMessage>;

  // Phase 3D: Cancellation & Expiration System
  cancellationRequests: BookingCancellationRequest[];
  createCancellationRequest: (params: {
    bookingId: string;
    requestedBy: 'RENTER' | 'OWNER';
    reason?: string;
  }) => Promise<BookingCancellationRequest>;
  approveCancellationRequest: (requestId: string) => Promise<void>;
  rejectCancellationRequest: (requestId: string, reason?: string) => Promise<void>;
  getCancellationContext: (bookingId: string) => Promise<CancellationContext>;
  isBookingExpired: (booking: Booking) => boolean;

  // Phase 3E: Payment, Deposit & Financial Engine
  getBookingFinancialSummary: (bookingId: string) => Promise<BookingFinancialSummary | null>;
  simulateDepositPayment: (
    bookingId: string,
    providerTxId?: string,
    remainingMethod?: 'CASH_ON_ARRIVAL' | 'IN_APP_PAYMENT_ON_ARRIVAL'
  ) => Promise<BookingFinancialSummary>;
  getFinancialTransactions: (bookingId?: string) => Promise<FinancialTransaction[]>;
  getFinancialAuditLogs: (bookingId?: string) => Promise<FinancialAuditLog[]>;

  // Phase 3G: Dispute & Property Mismatch System
  disputes: Dispute[];
  selectedDisputeId: string | null;
  setSelectedDisputeId: (id: string | null) => void;
  respondToDispute: (disputeId: string, responseText: string, evidenceUrls?: string[]) => Promise<Dispute>;
  resolveDisputeByAdmin: (disputeId: string, resolutionType: DisputeResolutionType, reason: string, refundAmount?: number) => Promise<Dispute>;
  openDisputeDetails: (disputeId: string) => void;

  // Phase 3H: Notifications Routing & Read Persistence
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  handleNotificationClick: (notif: NotificationItem) => void;

  // Phase 5: Wallet, Payouts & Financial Analytics
  wallet: OwnerWallet | null;
  payoutMethods: OwnerPayoutMethod[];
  payoutRequests: PayoutRequest[];
  walletLedger: WalletLedgerEntry[];
  financialAnalytics: FinancialAnalyticsSummary | null;
  createPayoutRequest: (params: { amount: number; payoutMethodId: string; actualProviderFee?: number; notes?: string }) => Promise<PayoutRequest>;
  cancelPayoutRequestByOwner: (payoutRequestId: string) => Promise<void>;
  processPayoutByAdmin: (payoutRequestId: string, action: 'COMPLETED' | 'REJECTED', reason?: string, providerTxId?: string) => Promise<void>;
  addOwnerPayoutMethod: (data: Omit<OwnerPayoutMethod, 'id' | 'ownerId' | 'createdAt'>) => Promise<void>;
  deleteOwnerPayoutMethod: (id: string) => Promise<void>;

  // Phase 6: Owner Analytics & Operational Insights Integration
  advancedAnalytics: AdvancedOwnerAnalytics | null;
  analyticsTimeRange: AnalyticsTimeRange;
  setAnalyticsTimeRange: (range: AnalyticsTimeRange) => void;
  getAdvancedAnalytics: (range?: AnalyticsTimeRange) => Promise<AdvancedOwnerAnalytics>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isEmptyDashboard, setIsEmptyDashboard] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    newBookingRequestsCount: 0,
    pendingModificationRequestsCount: 0,
    pendingCancellationRequestsCount: 0,
    openDisputesCount: 0,
    pendingOwnerResponseDisputesCount: 0,
    unreadMessagesCount: 0,
    upcomingBookingsCount: 0,
    underReviewPropertiesCount: 0,
    unreadNotificationsCount: 0,
    totalPropertiesCount: 0,
    publishedPropertiesCount: 0,
    draftPropertiesCount: 0,
    pausedPropertiesCount: 0,
    totalConfirmedDepositsOwnerNet: 0,
    totalExpectedBalanceOnArrival: 0,
    totalPendingDepositsCount: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [deviceViewMode, setDeviceViewMode] = useState<'mobile-frame' | 'full-screen'>('mobile-frame');

  // Phase 2 & 4 States
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [propertyViewMode, setPropertyViewMode] = useState<PropertyViewMode>('list');
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [currentDraft, setCurrentDraft] = useState<Partial<Property> | null>(() => {
    const saved = localStorage.getItem('sola_owner_property_draft');
    return saved ? JSON.parse(saved) : null;
  });

  // Phase 3A States
  const [calendarPropertyId, setCalendarPropertyId] = useState<string | null>(null);

  // Phase 3B States
  const [bookingTabSegment, setBookingTabSegment] = useState<BookingSegment>('pending');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  // Phase 3C, 3D, 3E States
  const [modificationRequests, setModificationRequests] = useState<BookingModificationRequest[]>([]);
  const [cancellationRequests, setCancellationRequests] = useState<BookingCancellationRequest[]>([]);
  const [chatConversations, setChatConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Phase 3G States
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);

  // Phase 5 States
  const [wallet, setWallet] = useState<OwnerWallet | null>(null);
  const [payoutMethods, setPayoutMethods] = useState<OwnerPayoutMethod[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [walletLedger, setWalletLedger] = useState<WalletLedgerEntry[]>([]);
  const [financialAnalytics, setFinancialAnalytics] = useState<FinancialAnalyticsSummary | null>(null);

  // Phase 6 States
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<AnalyticsTimeRange>('all');
  const [advancedAnalytics, setAdvancedAnalytics] = useState<AdvancedOwnerAnalytics | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToast({ id, message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const repo = repositoryFactory;
      
      if (!repo.useMockMode) {
        const [
          propsData,
          bksData,
          notifsData,
          convsData,
          dispData,
          walletData,
          methodsData,
          reqsData,
          ledgerData,
          analyticsData,
          advAnalyticsData,
        ] = await Promise.all([
          repo.property.getProperties(),
          repo.booking.getBookings(),
          repo.notification.getNotifications().catch(() => []),
          repo.messaging.getConversations().catch(() => []),
          repo.dispute.getDisputes().catch(() => []),
          repo.wallet.getOwnerWallet().catch(() => null),
          repo.payout.getPayoutMethods().catch(() => []),
          repo.payout.getPayoutRequests().catch(() => []),
          repo.wallet.getWalletLedgerEntries().catch(() => []),
          repo.financial.getFinancialAnalyticsSummary().catch(() => null),
          repo.analytics.getAdvancedAnalytics(analyticsTimeRange).catch(() => null),
        ]);

        setProperties(Array.isArray(propsData) ? propsData as Property[] : []);
        setBookings(Array.isArray(bksData) ? bksData as Booking[] : []);
        setNotifications(Array.isArray(notifsData) ? notifsData as NotificationItem[] : []);
        setChatConversations(Array.isArray(convsData) ? convsData as ChatConversation[] : []);
        setDisputes(Array.isArray(dispData) ? dispData as Dispute[] : []);
        setWallet(walletData as OwnerWallet || null);
        setPayoutMethods(Array.isArray(methodsData) ? methodsData as OwnerPayoutMethod[] : []);
        setPayoutRequests(Array.isArray(reqsData) ? reqsData as PayoutRequest[] : []);
        setWalletLedger(Array.isArray(ledgerData) ? ledgerData as WalletLedgerEntry[] : []);
        setFinancialAnalytics(analyticsData as FinancialAnalyticsSummary || null);
        setAdvancedAnalytics(advAnalyticsData as AdvancedOwnerAnalytics || null);

        // Derive dashboard metrics from live server data
        const validProps = Array.isArray(propsData) ? propsData as Property[] : [];
        const validBks = Array.isArray(bksData) ? bksData as Booking[] : [];
        const validNotifs = Array.isArray(notifsData) ? notifsData as NotificationItem[] : [];
        const validDisps = Array.isArray(dispData) ? dispData as Dispute[] : [];

        const totalProps = validProps.length;
        const pubProps = validProps.filter((p) => p.status === 'PUBLISHED').length;
        const draftProps = validProps.filter((p) => p.status === 'DRAFT').length;
        const pausedProps = validProps.filter((p) => p.status === 'PAUSED').length;
        const reviewProps = validProps.filter((p) => p.status === 'PENDING_REVIEW').length;

        const newRequests = validBks.filter((b) => b.status === 'PENDING_OWNER_APPROVAL').length;
        const upcomingBks = validBks.filter((b) => b.status === 'CONFIRMED').length;
        const unreadNotifs = validNotifs.filter((n) => !n.isRead).length;

        setMetrics({
          newBookingRequestsCount: newRequests,
          pendingModificationRequestsCount: 0,
          pendingCancellationRequestsCount: 0,
          openDisputesCount: validDisps.length,
          pendingOwnerResponseDisputesCount: validDisps.filter((d) => d.status === 'OPENED' || d.status === 'UNDER_OWNER_RESPONSE').length,
          unreadMessagesCount: 0,
          upcomingBookingsCount: upcomingBks,
          underReviewPropertiesCount: reviewProps,
          unreadNotificationsCount: unreadNotifs,

          totalPropertiesCount: totalProps,
          publishedPropertiesCount: pubProps,
          draftPropertiesCount: draftProps,
          pausedPropertiesCount: pausedProps,

          totalConfirmedDepositsOwnerNet: (walletData as OwnerWallet)?.availableBalance ?? 0,
          totalExpectedBalanceOnArrival: (walletData as OwnerWallet)?.pendingBalance ?? 0,
          totalPendingDepositsCount: newRequests,
        });

        if ((propsData as Property[]).length > 0 && !calendarPropertyId) {
          setCalendarPropertyId((propsData as Property[])[0].id);
        }
      } else {
        const [
          propsData,
          bksData,
          notifsData,
          metricsData,
          modsData,
          cancsData,
          convsData,
          dispData,
          walletData,
          methodsData,
          reqsData,
          ledgerData,
          analyticsData,
          advAnalyticsData,
        ] = await Promise.all([
          mockRepository.getProperties(isEmptyDashboard),
          mockRepository.getBookings(isEmptyDashboard),
          mockRepository.getNotifications(),
          mockRepository.getDashboardMetrics(isEmptyDashboard),
          mockRepository.getModificationRequests(),
          mockRepository.getCancellationRequests(),
          mockRepository.getChatConversations(),
          mockRepository.getDisputes(),
          mockRepository.getOwnerWallet(),
          mockRepository.getOwnerPayoutMethods(),
          mockRepository.getPayoutRequests(),
          mockRepository.getWalletLedgerEntries(),
          mockRepository.getFinancialAnalyticsSummary(),
          mockRepository.getAdvancedAnalytics(analyticsTimeRange),
        ]);

        setProperties(propsData);
        setBookings(bksData);
        setNotifications(notifsData);
        setMetrics(metricsData);
        setModificationRequests(modsData);
        setCancellationRequests(cancsData);
        setChatConversations(convsData);
        setDisputes(dispData);

        setWallet(walletData);
        setPayoutMethods(methodsData);
        setPayoutRequests(reqsData);
        setWalletLedger(ledgerData);
        setFinancialAnalytics(analyticsData);
        setAdvancedAnalytics(advAnalyticsData);

        if (propsData.length > 0 && !calendarPropertyId) {
          setCalendarPropertyId(propsData[0].id);
        }
      }
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  }, [isEmptyDashboard, calendarPropertyId, analyticsTimeRange]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (currentDraft) {
      localStorage.setItem('sola_owner_property_draft', JSON.stringify(currentDraft));
    }
  }, [currentDraft]);

  const createOrUpdateProperty = async (
    data: Partial<Property>,
    submitForReview: boolean = false
  ): Promise<Property> => {
    try {
      const repo = repositoryFactory;
      let savedProperty: Property;

      if (repo.useMockMode) {
        savedProperty = await mockRepository.createOrUpdateProperty(data, submitForReview);
      } else {
        const payload: any = {
          title: data.title || 'شاليه جديد',
          unitType: (data.unitType as any) || 'CHALET',
          propertyType: data.propertyType || 'CHALET',
          address: data.address || '',
          bedrooms: data.bedrooms || 1,
          bathrooms: data.bathrooms || 1,
          maxGuests: data.maxGuests || 2,
          basePricePerNight: data.pricePerNight || (data.pricing?.basePricePerNight) || 1000,
          pricePerNight: data.pricePerNight || (data.pricing?.basePricePerNight) || 1000,
          description: data.description,
          region: data.region,
          resortName: data.resortName,
          areaSqM: data.areaSqM,
          bedsCount: data.bedsCount,
          images: data.images || [],
          amenities: data.amenities || [],
          houseRules: data.houseRules,
        };

        if (data.id) {
          savedProperty = await repo.property.updateProperty(data.id, payload);
        } else {
          savedProperty = await repo.property.createProperty(payload);
        }
      }

      if (submitForReview) {
        if (!repo.useMockMode && savedProperty.id) {
          await repo.property.submitPropertyForReview(savedProperty.id);
        }
        showToast('تم إرسال الوحدة للمراجعة', 'success');
        setCurrentDraft(null);
        localStorage.removeItem('sola_owner_property_draft');
      } else {
        showToast('تم حفظ مسودة الوحدة بنجاح', 'info');
        setCurrentDraft(prev => ({ ...(prev || {}), ...savedProperty, id: savedProperty.id }));
        localStorage.setItem('sola_owner_property_draft', JSON.stringify({ ...(currentDraft || {}), ...savedProperty, id: savedProperty.id }));
      }
      await refreshData();
      return savedProperty as Property;
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء حفظ بيانات الوحدة', 'error');
      throw err;
    }
  };

  const submitPropertyForReview = async (propertyId: string) => {
    try {
      const repo = repositoryFactory;
      if (!repo.useMockMode) {
        await repo.property.submitPropertyForReview(propertyId);
      } else {
        await mockRepository.submitPropertyForReview(propertyId);
      }
      showToast('تم إرسال الوحدة للمراجعة', 'success');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'تعذر إرسال الوحدة للمراجعة', 'error');
    }
  };

  const pauseProperty = async (propertyId: string) => {
    try {
      const repo = repositoryFactory;
      if (!repo.useMockMode) {
        await repo.property.pauseProperty(propertyId);
      } else {
        await mockRepository.pauseProperty(propertyId);
      }
      showToast('تم إيقاف استقبال الحجوزات الجديدة على الوحدة مؤقتاً ⏸️', 'info');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'تعذر إيقاف الوحدة', 'error');
    }
  };

  const resumeProperty = async (propertyId: string) => {
    try {
      const repo = repositoryFactory;
      if (!repo.useMockMode) {
        await repo.property.resumeProperty(propertyId);
      } else {
        await mockRepository.resumeProperty(propertyId);
      }
      showToast('تم استئناف نشر الوحدة واستقبال الحجوزات 🟢', 'success');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'تعذر استئناف نشر الوحدة', 'error');
    }
  };

  const archiveProperty = async (propertyId: string) => {
    try {
      const repo = repositoryFactory;
      if (!repo.useMockMode) {
        await repo.property.archiveProperty(propertyId);
      } else {
        await mockRepository.archiveProperty(propertyId);
      }
      showToast('تم أرشفة الوحدة وتأمين سجلاتها التاريخية بنجاح 📁', 'info');
      if (selectedPropertyId === propertyId) {
        setSelectedPropertyId(null);
        setPropertyViewMode('list');
      }
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'تعذر أرشفة الوحدة', 'error');
    }
  };

  const restoreProperty = async (propertyId: string) => {
    try {
      const repo = repositoryFactory;
      if (!repo.useMockMode) {
        await repo.property.restoreProperty(propertyId);
      } else {
        await mockRepository.restoreProperty(propertyId);
      }
      showToast('تم استرجاع الوحدة المؤرشفة لمسودة مراجعة 📄', 'success');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'تعذر استرجاع الوحدة', 'error');
    }
  };

  const submitOwnerVerificationDocuments = async (
    propertyId: string,
    documents: Array<{ type: 'NATIONAL_ID' | 'PROPERTY_DEED' | 'LEASE_CONTRACT' | 'OTHER'; fileUrl: string; title: string }>
  ) => {
    try {
      const repo = repositoryFactory;
      if (!repo.useMockMode) {
        for (const doc of documents) {
          const presigned = await repo.document.getPresignedUploadUrl(
            doc.title || 'verification_doc.pdf',
            'application/pdf'
          );
          await repo.owner.uploadOwnerDocument({
            id: `doc-${Date.now()}`,
            ownerId: wallet?.ownerId || '00000000-0000-4000-a000-000000000001',
            type: doc.type,
            title: doc.title,
            fileUrl: presigned.fileKey || doc.fileUrl,
            status: 'PENDING',
            uploadedAt: new Date().toISOString(),
          });
        }
      } else {
        await mockRepository.submitOwnerVerificationDocuments(propertyId, documents);
      }
      showToast('تم إرسال مستندات التوثيق لمراجعة فريق جودة Sola 📄', 'success');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'تعذر إرسال مستندات التوثيق', 'error');
    }
  };

  const deleteProperty = async (propertyId: string) => {
    try {
      const repo = repositoryFactory;
      if (!repo.useMockMode) {
        await repo.property.deleteProperty(propertyId);
      } else {
        await mockRepository.deleteProperty(propertyId);
      }
      showToast('تم حذف العقار بنجاح 🗑️', 'success');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'تعذر حذف العقار لوجود قيود أو حجوزات نشطة', 'error');
    }
  };

  const setDailyPricing = async (propertyId: string, datePriceMap: Record<string, number>) => {
    try {
      const repo = repositoryFactory;
      if (!repo.useMockMode) {
        for (const [date, price] of Object.entries(datePriceMap)) {
          await repo.calendar.setNightlyPriceOverride({ propertyId, date, price });
        }
      } else {
        await mockRepository.setDailyPricing(propertyId, datePriceMap);
      }
      showToast('تم تحديث جدول الأسعار اليومية المخصصة بنجاح 💰', 'success');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'تعذر تحديث الأسعار اليومية', 'error');
    }
  };

  const getPropertyAuditLogs = async (propertyId: string): Promise<PropertyAuditLog[]> => {
    return mockRepository.getPropertyAuditLogs(propertyId);
  };

  const openAddPropertyWizard = (initialData?: Partial<Property>) => {
    if (initialData) {
      setCurrentDraft(initialData);
    } else if (!currentDraft) {
      setCurrentDraft({
        unitType: 'شاليه',
        propertyType: 'CHALET',
        region: 'الساحل الشمالي',
        bedrooms: 2,
        bathrooms: 1,
        maxGuests: 4,
        areaSqM: 110,
        bedsCount: 3,
        pricePerNight: 5000,
        currency: 'ج.م',
        amenities: ['pool', 'central_ac', 'wifi'],
        images: [],
        mainImageIndex: 0,
        houseRules: {
          minStay: 2,
          maxStay: 30,
          smokingAllowed: false,
          partiesAllowed: false,
          petsAllowed: false,
          childrenAllowed: true,
          checkInTime: '14:00',
          checkOutTime: '12:00',
        },
        status: 'DRAFT',
      });
    }
    setWizardStep(1);
    setPropertyViewMode('wizard');
    setActiveTab('properties');
  };

  const openPropertyDetails = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setPropertyViewMode('details');
    setActiveTab('properties');
  };

  // Phase 3A Handlers
  const openCalendarForProperty = (propertyId: string) => {
    setCalendarPropertyId(propertyId);
    setActiveTab('calendar');
  };

  const getAvailability = async (
    propertyId: string,
    year: number,
    month: number
  ): Promise<AvailabilityRecord[]> => {
    const repo = repositoryFactory;
    if (!repo.useMockMode) {
      return repo.calendar.getAvailabilityRecords(propertyId);
    }
    return mockRepository.getAvailability(propertyId, year, month);
  };

  const blockDates = async (propertyId: string, dates: string[]) => {
    try {
      const repo = repositoryFactory;
      if (!repo.useMockMode) {
        for (const date of dates) {
          await repo.calendar.toggleDateBlock({ propertyId, date, note: 'BLOCKED' });
        }
      } else {
        await mockRepository.blockDates(propertyId, dates);
      }
      showToast(`تم حظر الأيام المحددة (${dates.length} أيام) بنجاح 🔒`, 'success');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء حظر الأيام المحددة', 'error');
    }
  };

  const unblockDates = async (propertyId: string, dates: string[]) => {
    try {
      const repo = repositoryFactory;
      if (!repo.useMockMode) {
        for (const date of dates) {
          await repo.calendar.toggleDateBlock({ propertyId, date, note: 'UNBLOCKED' });
        }
      } else {
        await mockRepository.unblockDates(propertyId, dates);
      }
      showToast(`تم إتاحة الأيام المحددة (${dates.length} أيام) للحجز بنجاح 🔓`, 'success');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء إتاحة الأيام', 'error');
    }
  };

  // Phase 3B Handlers
  const openPendingBookings = () => {
    setBookingTabSegment('pending');
    setActiveTab('bookings');
  };

  const approveBooking = async (bookingId: string) => {
    try {
      const repo = repositoryFactory;
      if (!repo.useMockMode) {
        await repo.booking.approveBooking(bookingId);
      } else {
        await mockRepository.approveBooking(bookingId);
      }
      showToast('تم قبول الطلب. بانتظار سداد العربون من العميل.', 'success');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'تعذر قبول طلب الحجز', 'error');
    }
  };

  const rejectBooking = async (bookingId: string) => {
    try {
      const repo = repositoryFactory;
      if (!repo.useMockMode) {
        await repo.booking.rejectBooking(bookingId);
      } else {
        await mockRepository.rejectBooking(bookingId);
      }
      showToast('تم رفض طلب الحجز', 'info');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'تعذر رفض طلب الحجز', 'error');
    }
  };

  // Phase 3C Handlers
  const isWithinSelfModificationWindow = (confirmedAt?: string): boolean => {
    return mockRepository.isWithinSelfModificationWindow(confirmedAt);
  };

  const createModificationRequest = async (params: {
    bookingId: string;
    requestedCheckIn: string;
    requestedCheckOut: string;
    reason?: string;
  }) => {
    try {
      const newReq = await mockRepository.createModificationRequest(params);
      showToast('تم إرسال طلب تعديل الحجز بنجاح للمالك 💬', 'success');
      await refreshData();
      return newReq;
    } catch (err: any) {
      showToast(err.message || 'تعذر إرسال طلب التعديل', 'error');
      throw err;
    }
  };

  const approveModificationRequest = async (requestId: string) => {
    try {
      await mockRepository.approveModificationRequest(requestId);
      showToast('تمت الموافقة على تعديل الحجز وتحديث التواريخ والتقويم بنجاح! 🥳', 'success');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'تعذر اعتماد طلب التعديل', 'error');
    }
  };

  const rejectModificationRequest = async (requestId: string, reason?: string) => {
    try {
      await mockRepository.rejectModificationRequest(requestId, reason);
      showToast('تم رفض طلب التعديل والإبقاء على الحجز الأصلي', 'info');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'تعذر رفض طلب التعديل', 'error');
    }
  };

  // Phase 3D Handlers
  const isBookingExpired = (booking: Booking): boolean => {
    return mockRepository.isBookingExpired(booking);
  };

  const createCancellationRequest = async (params: {
    bookingId: string;
    requestedBy: 'RENTER' | 'OWNER';
    reason?: string;
  }) => {
    try {
      const newReq = await mockRepository.createCancellationRequest(params);
      showToast('تم إرسال طلب إلغاء الحجز للمراجعة بنجاح ⚠️', 'info');
      await refreshData();
      return newReq;
    } catch (err: any) {
      showToast(err.message || 'تعذر تقديم طلب الإلغاء', 'error');
      throw err;
    }
  };

  const approveCancellationRequest = async (requestId: string) => {
    try {
      await mockRepository.approveCancellationRequest(requestId);
      showToast('تم إقرار إلغاء الحجز وتفريغ الأيام في التقويم بنجاح 🚫', 'success');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'تعذر قبول طلب الإلغاء', 'error');
    }
  };

  const rejectCancellationRequest = async (requestId: string, reason?: string) => {
    try {
      await mockRepository.rejectCancellationRequest(requestId, reason);
      showToast('تم رفض طلب الإلغاء وتأكيد الحجز والإقامة 🟢', 'info');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'تعذر رفض طلب الإلغاء', 'error');
    }
  };

  const getCancellationContext = async (bookingId: string): Promise<CancellationContext> => {
    return mockRepository.getCancellationContext(bookingId);
  };

  const getBookingFinancialSummary = async (bookingId: string): Promise<BookingFinancialSummary | null> => {
    const repo = repositoryFactory;
    if (!repo.useMockMode) {
      const bk = bookings.find((b) => b.id === bookingId);
      if (!bk) return null;
      return repo.financial.getOrCreateFinancialSummary(bk);
    }
    return mockRepository.getBookingFinancialSummary(bookingId);
  };

  const simulateDepositPayment = async (
    bookingId: string,
    providerTxId?: string,
    remainingMethod: 'CASH_ON_ARRIVAL' | 'IN_APP_PAYMENT_ON_ARRIVAL' = 'CASH_ON_ARRIVAL'
  ): Promise<BookingFinancialSummary> => {
    try {
      const summary = await mockRepository.simulateDepositPayment(bookingId, providerTxId, remainingMethod);
      showToast('تمت محاكاة تحويل عربون الليلة الأولى بنجاح 💰', 'success');
      await refreshData();
      return summary;
    } catch (err: any) {
      showToast(err.message || 'تعذر إجراء تحويل العربون الافتراضي', 'error');
      throw err;
    }
  };

  const getFinancialTransactions = async (bookingId?: string): Promise<FinancialTransaction[]> => {
    return mockRepository.getFinancialTransactions(bookingId);
  };

  const getFinancialAuditLogs = async (bookingId?: string): Promise<FinancialAuditLog[]> => {
    return mockRepository.getFinancialAuditLogs(bookingId);
  };

  // Phase 3G Dispute Handlers
  const respondToDispute = async (disputeId: string, responseText: string, evidenceUrls: string[] = []): Promise<Dispute> => {
    try {
      const repo = repositoryFactory;
      const updated = !repo.useMockMode
        ? await repo.dispute.respondToDispute({ disputeId, responseNote: responseText, evidenceFiles: evidenceUrls })
        : await mockRepository.respondToDispute(disputeId, responseText, evidenceUrls);
      showToast('تم تسجيل ردك وأدلتك بنجاح وتحويل النزاع لفريق مراجعة Sola ⚖️', 'success');
      await refreshData();
      return updated as Dispute;
    } catch (err: any) {
      showToast(err.message || 'تعذر تسجيل الرد على النزاع', 'error');
      throw err;
    }
  };

  const resolveDisputeByAdmin = async (
    disputeId: string,
    resolutionType: DisputeResolutionType,
    reason: string,
    refundAmount?: number
  ): Promise<Dispute> => {
    try {
      const resolved = await mockRepository.resolveDisputeByAdmin(disputeId, resolutionType, reason, refundAmount);
      showToast('تم تنفيذ القرار الإداري وحسم النزاع بنجاح 🏁', 'success');
      await refreshData();
      return resolved;
    } catch (err: any) {
      showToast(err.message || 'تعذر حسم النزاع', 'error');
      throw err;
    }
  };

  const openDisputeDetails = (disputeId: string) => {
    setSelectedDisputeId(disputeId);
    setActiveTab('disputes');
  };

  const openChatForBooking = (bookingId: string) => {
    const conv = chatConversations.find((c) => c.bookingId === bookingId);
    if (conv) {
      setActiveConversationId(conv.id);
    } else {
      const bk = bookings.find((b) => b.id === bookingId);
      if (bk) {
        const newConvId = `conv-${bk.id}`;
        setActiveConversationId(newConvId);
      }
    }
    setActiveTab('messages');
  };

  const getChatMessages = async (conversationId: string): Promise<ChatMessage[]> => {
    const repo = repositoryFactory;
    if (!repo.useMockMode) {
      return repo.messaging.getChatMessages(conversationId);
    }
    return mockRepository.getChatMessages(conversationId);
  };

  const sendChatMessage = async (
    conversationId: string,
    text: string,
    type: ChatMessageType = 'TEXT'
  ): Promise<ChatMessage> => {
    const repo = repositoryFactory;
    const msg = !repo.useMockMode
      ? await repo.messaging.sendChatMessage({ conversationId, text })
      : await mockRepository.sendChatMessage(conversationId, text, type);
    await refreshData();
    return msg as ChatMessage;
  };

  // Phase 3H Notification Routing & Persistence
  const markNotificationAsRead = async (id: string) => {
    const repo = repositoryFactory;
    if (!repo.useMockMode) {
      await repo.notification.markNotificationAsRead(id);
    } else {
      await mockRepository.markNotificationAsRead(id);
    }
    await refreshData();
  };

  const markAllNotificationsAsRead = async () => {
    const repo = repositoryFactory;
    if (!repo.useMockMode) {
      await repo.notification.markAllNotificationsAsRead();
    } else {
      await mockRepository.markAllNotificationsAsRead();
    }
    showToast('تم تعليم جميع الإشعارات كمقروءة 🔔', 'info');
    await refreshData();
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    await markNotificationAsRead(notif.id);
    setIsNotificationsOpen(false);

    if (notif.entityType === 'DISPUTE' && notif.entityId) {
      openDisputeDetails(notif.entityId);
    } else if (notif.entityType === 'BOOKING' && notif.entityId) {
      setSelectedBookingId(notif.entityId);
      setActiveTab('bookings');
    } else if (notif.entityType === 'PAYOUT' || notif.actionRoute === 'wallet') {
      setActiveTab('wallet');
    } else if (notif.entityType === 'CHAT' || notif.actionRoute === 'messages') {
      setActiveTab('messages');
    } else if (notif.actionRoute) {
      setActiveTab(notif.actionRoute as NavTab);
    }
  };

  // Phase 5 Handlers
  const createPayoutRequest = async (params: { amount: number; payoutMethodId: string; actualProviderFee?: number; notes?: string }) => {
    try {
      const repo = repositoryFactory;
      const newReq = !repo.useMockMode
        ? await repo.payout.createPayoutRequest({
            payoutMethodId: params.payoutMethodId,
            amount: params.amount,
            idempotencyKey: `idem_payout_${Date.now()}`,
          })
        : await mockRepository.createPayoutRequest(params);
      showToast('تم إرسال طلب سحب المستحقات وحجز المبلغ من المحفظة بنجاح 💸', 'success');
      await refreshData();
      return newReq;
    } catch (err: any) {
      showToast(err.message || 'تعذر إرسال طلب السحب', 'error');
      throw err;
    }
  };

  const cancelPayoutRequestByOwner = async (payoutRequestId: string) => {
    try {
      const repo = repositoryFactory;
      if (!repo.useMockMode) {
        await repo.payout.cancelPayoutRequestByOwner(payoutRequestId);
      } else {
        await mockRepository.cancelPayoutRequestByOwner(payoutRequestId);
      }
      showToast('تم إلغاء طلب السحب وتحرير المبلغ المحجوز للرصيد المتاح ↩️', 'info');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'تعذر إلغاء طلب السحب', 'error');
    }
  };

  const processPayoutByAdmin = async (
    payoutRequestId: string,
    action: 'COMPLETED' | 'REJECTED',
    reason?: string,
    providerTxId?: string
  ) => {
    try {
      await mockRepository.processPayoutByAdmin(payoutRequestId, action, reason, providerTxId);
      if (action === 'COMPLETED') {
        showToast('تم اعتماد التحويل البنكي وتحديث مسحوبات المالك بنجاح 🟢', 'success');
      } else {
        showToast('تم رفض طلب السحب وإعادة الرصيد للمحفظة 🔴', 'info');
      }
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'تعذر معالجة طلب السحب', 'error');
    }
  };

  const addOwnerPayoutMethod = async (data: Omit<OwnerPayoutMethod, 'id' | 'ownerId' | 'createdAt'>) => {
    try {
      const repo = repositoryFactory;
      if (!repo.useMockMode) {
        await repo.payout.addOwnerPayoutMethod({
          type: data.type,
          accountTitle: data.accountTitle,
          accountNumber: data.accountNumberOrIban || (data as any).accountNumber || '0000000000',
          isDefault: data.isDefault,
        });
      } else {
        await mockRepository.addOwnerPayoutMethod(data);
      }
      showToast('تمت إضافة وسيلة سحب جديدة بنجاح 🏦', 'success');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'تعذر إضافة وسيلة السحب', 'error');
    }
  };

  const deleteOwnerPayoutMethod = async (id: string) => {
    try {
      const repo = repositoryFactory;
      if (!repo.useMockMode) {
        await repo.payout.deleteOwnerPayoutMethod(id);
      } else {
        await mockRepository.deleteOwnerPayoutMethod(id);
      }
      showToast('تم حذف وسيلة السحب 🗑️', 'info');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'تعذر حذف وسيلة السحب', 'error');
    }
  };

  // Phase 6 Handlers
  const getAdvancedAnalytics = async (range?: AnalyticsTimeRange): Promise<AdvancedOwnerAnalytics> => {
    const targetRange = range || analyticsTimeRange;
    try {
      const repo = repositoryFactory;
      const advData = !repo.useMockMode
        ? await repo.analytics.getAdvancedAnalytics(targetRange)
        : await mockRepository.getAdvancedAnalytics(targetRange);
      setAdvancedAnalytics(advData);
      return advData;
    } catch (err: any) {
      showToast(err.message || 'تعذر تحميل بيانات التحليلات', 'error');
      throw err;
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        isEmptyDashboard,
        setIsEmptyDashboard,
        isNotificationsOpen,
        setIsNotificationsOpen,
        properties,
        bookings,
        notifications,
        metrics,
        isLoading,
        error,
        refreshData,
        toast,
        showToast,
        deviceViewMode,
        setDeviceViewMode,

        // Phase 2 & 4
        selectedPropertyId,
        setSelectedPropertyId,
        propertyViewMode,
        setPropertyViewMode,
        wizardStep,
        setWizardStep,
        currentDraft,
        setCurrentDraft,
        createOrUpdateProperty,
        submitPropertyForReview,
        pauseProperty,
        resumeProperty,
        archiveProperty,
        restoreProperty,
        deleteProperty,
        submitOwnerVerificationDocuments,
        setDailyPricing,
        getPropertyAuditLogs,
        openAddPropertyWizard,
        openPropertyDetails,

        // Phase 3A
        calendarPropertyId,
        setCalendarPropertyId,
        openCalendarForProperty,
        getAvailability,
        blockDates,
        unblockDates,

        // Phase 3B
        bookingTabSegment,
        setBookingTabSegment,
        selectedBookingId,
        setSelectedBookingId,
        approveBooking,
        rejectBooking,
        openPendingBookings,

        // Phase 3C
        modificationRequests,
        chatConversations,
        activeConversationId,
        setActiveConversationId,
        createModificationRequest,
        approveModificationRequest,
        rejectModificationRequest,
        isWithinSelfModificationWindow,
        openChatForBooking,
        getChatMessages,
        sendChatMessage,

        // Phase 3D
        cancellationRequests,
        createCancellationRequest,
        approveCancellationRequest,
        rejectCancellationRequest,
        getCancellationContext,
        isBookingExpired,

        // Phase 3E
        getBookingFinancialSummary,
        simulateDepositPayment,
        getFinancialTransactions,
        getFinancialAuditLogs,

        // Phase 3G
        disputes,
        selectedDisputeId,
        setSelectedDisputeId,
        respondToDispute,
        resolveDisputeByAdmin,
        openDisputeDetails,

        // Phase 3H
        markNotificationAsRead,
        markAllNotificationsAsRead,
        handleNotificationClick,

        // Phase 5
        wallet,
        payoutMethods,
        payoutRequests,
        walletLedger,
        financialAnalytics,
        createPayoutRequest,
        cancelPayoutRequestByOwner,
        processPayoutByAdmin,
        addOwnerPayoutMethod,
        deleteOwnerPayoutMethod,

        // Phase 6
        advancedAnalytics,
        analyticsTimeRange,
        setAnalyticsTimeRange,
        getAdvancedAnalytics,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

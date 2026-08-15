import type {
  Owner,
  Property,
  Booking,
  NotificationItem,
  DashboardMetrics,
  AvailabilityRecord,
  BookingModificationRequest,
  BookingModificationHistory,
  BookingCancellationRequest,
  BookingCancellationHistory,
  BookingFinancialSummary,
  FinancialTransaction,
  FinancialAdjustment,
  FinancialAuditLog,
  CancellationContext,
  Dispute,
  DisputeEvidence,
  DisputeStatus,
  DisputeResolutionType,
  DisputeAuditLog,
  PropertyAuditLog,
  PropertyAuditAction,
  ChatConversation,
  ChatMessage,
  ChatMessageType,
  OwnerPayoutMethod,
  OwnerWallet,
  WalletLedgerEntry,
  PayoutRequest,
  FinancialAnalyticsSummary,
  AnalyticsTimeRange,
  AdvancedOwnerAnalytics,
  PropertyPerformanceMetric,
  OperationalQualityIndex,
} from '../types';
import {
  MOCK_OWNER,
  MOCK_PROPERTIES,
  MOCK_BOOKINGS,
  MOCK_NOTIFICATIONS,
  MOCK_AVAILABILITY_RECORDS,
  MOCK_MODIFICATION_REQUESTS,
  MOCK_MODIFICATION_HISTORY,
  MOCK_CANCELLATION_REQUESTS,
  MOCK_CANCELLATION_HISTORY,
  MOCK_FINANCIAL_SUMMARIES,
  MOCK_FINANCIAL_TRANSACTIONS,
  MOCK_FINANCIAL_ADJUSTMENTS,
  MOCK_FINANCIAL_AUDIT_LOGS,
  MOCK_DISPUTES,
  MOCK_DISPUTE_AUDIT_LOGS,
  MOCK_PROPERTY_AUDIT_LOGS,
  MOCK_CONVERSATIONS,
  MOCK_CHAT_MESSAGES,
  MOCK_PAYOUT_METHODS,
  MOCK_OWNER_WALLET,
  MOCK_WALLET_LEDGER,
  MOCK_PAYOUT_REQUESTS,
  createFinancialSummary,
  createBookingSnapshot,
} from '../data/mockData';
import { MINIMUM_PAYOUT_AMOUNT } from '../constants/theme';

let currentOwner: Owner = { ...MOCK_OWNER };
let currentProperties: Property[] = [...MOCK_PROPERTIES];
let currentBookings: Booking[] = [...MOCK_BOOKINGS];
let currentNotifications: NotificationItem[] = [...MOCK_NOTIFICATIONS];
let currentAvailability: AvailabilityRecord[] = [...MOCK_AVAILABILITY_RECORDS];
let currentModificationRequests: BookingModificationRequest[] = [...MOCK_MODIFICATION_REQUESTS];
let currentModificationHistory: BookingModificationHistory[] = [...MOCK_MODIFICATION_HISTORY];
let currentCancellationRequests: BookingCancellationRequest[] = [...MOCK_CANCELLATION_REQUESTS];
let currentCancellationHistory: BookingCancellationHistory[] = [...MOCK_CANCELLATION_HISTORY];

let currentFinancialSummaries: Record<string, BookingFinancialSummary> = { ...MOCK_FINANCIAL_SUMMARIES };
let currentFinancialTransactions: FinancialTransaction[] = [...MOCK_FINANCIAL_TRANSACTIONS];
let currentFinancialAdjustments: FinancialAdjustment[] = [...MOCK_FINANCIAL_ADJUSTMENTS];
let currentFinancialAuditLogs: FinancialAuditLog[] = [...MOCK_FINANCIAL_AUDIT_LOGS];

let currentDisputes: Dispute[] = [...MOCK_DISPUTES];
let currentDisputeAuditLogs: DisputeAuditLog[] = [...MOCK_DISPUTE_AUDIT_LOGS];
let currentPropertyAuditLogs: PropertyAuditLog[] = [...MOCK_PROPERTY_AUDIT_LOGS];

let currentConversations: ChatConversation[] = [...MOCK_CONVERSATIONS];
let currentChatMessages: Record<string, ChatMessage[]> = { ...MOCK_CHAT_MESSAGES };

// Phase 5 State
let currentPayoutMethods: OwnerPayoutMethod[] = [...MOCK_PAYOUT_METHODS];
let currentOwnerWallet: OwnerWallet = { ...MOCK_OWNER_WALLET };
let currentWalletLedger: WalletLedgerEntry[] = [...MOCK_WALLET_LEDGER];
let currentPayoutRequests: PayoutRequest[] = [...MOCK_PAYOUT_REQUESTS];

const delay = (ms: number = 250) => new Promise((resolve) => setTimeout(resolve, ms));

const getOccupiedNights = (checkIn: string, checkOut: string): string[] => {
  const nights: string[] = [];
  let curr = new Date(checkIn);
  const end = new Date(checkOut);

  while (curr < end) {
    nights.push(curr.toISOString().slice(0, 10));
    curr.setDate(curr.getDate() + 1);
  }
  return nights;
};

export const mockRepository = {
  pushDeduplicatedNotification: (data: Omit<NotificationItem, 'id' | 'createdAt' | 'recipientId'> & { deduplicationKey: string }): boolean => {
    const existing = currentNotifications.find((n) => n.deduplicationKey === data.deduplicationKey);
    if (existing) {
      return false;
    }

    const newNotif: NotificationItem = {
      ...data,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      recipientId: currentOwner.id,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    currentNotifications.unshift(newNotif);
    return true;
  },

  logPropertyAudit: (
    propertyId: string,
    action: PropertyAuditAction,
    actorType: 'OWNER' | 'ADMIN' | 'SYSTEM' = 'OWNER',
    previousValue?: unknown,
    newValue?: unknown,
    metadata?: Record<string, unknown>
  ) => {
    currentPropertyAuditLogs.unshift({
      id: `p-audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      propertyId,
      actorId: actorType === 'OWNER' ? currentOwner.id : 'sola-admin-system',
      actorType,
      action,
      previousValue,
      newValue,
      metadata,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    });
  },

  isBookingExpired: (booking: Booking): boolean => {
    if (booking.status === 'EXPIRED') return true;
    if (booking.status !== 'PENDING_OWNER_APPROVAL') return false;
    if (!booking.expiresAt) return false;

    return new Date().getTime() >= new Date(booking.expiresAt).getTime();
  },

  expirePendingBookingsIfNeeded: async (): Promise<void> => {
    const nowIso = new Date().toISOString();

    for (let i = 0; i < currentBookings.length; i++) {
      const b = currentBookings[i];
      if (b.status === 'PENDING_OWNER_APPROVAL' && b.expiresAt) {
        if (new Date(nowIso).getTime() >= new Date(b.expiresAt).getTime()) {
          currentBookings[i] = {
            ...b,
            status: 'EXPIRED',
            updatedAt: nowIso.slice(0, 16).replace('T', ' '),
          };

          if (currentFinancialSummaries[b.id]) {
            currentFinancialSummaries[b.id].depositPaymentStatus = 'EXPIRED';
          }

          mockRepository.pushDeduplicatedNotification({
            title: 'انقضاء مهلة الرد على طلب الحجز ⏱️',
            message: `انتهت المهلة المحددة للرد على طلب حجز ${b.propertyTitle} دون اتخاذ قرار.`,
            type: 'BOOKING_REQUEST_EXPIRED',
            isRead: false,
            entityType: 'BOOKING',
            entityId: b.id,
            actionRoute: 'bookings',
            deduplicationKey: `exp-${b.id}`,
          });
        }
      }
    }
  },

  getOwnerProfile: async (): Promise<Owner> => {
    await delay();
    return { ...currentOwner };
  },

  updateOwnerProfile: async (updates: Partial<Owner>): Promise<Owner> => {
    await delay();
    currentOwner = { ...currentOwner, ...updates };
    return { ...currentOwner };
  },

  // ==========================================
  // Phase 5: Owner Wallet, Payouts & Financial Reports
  // ==========================================

  getOwnerWallet: async (): Promise<OwnerWallet> => {
    await delay(150);

    // Recalculate dynamic balances for high fidelity financial integrity
    const nowMs = Date.now();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    let pendingBalance = 0;
    let availableBalance = 0;
    let heldBalance = 0;
    let totalEarnedLifeTime = 0;

    for (const b of currentBookings) {
      if (b.status === 'CONFIRMED' || b.status === 'COMPLETED') {
        const fin = currentFinancialSummaries[b.id] || mockRepository.getOrCreateFinancialSummary(b);
        if (fin.depositPaymentStatus === 'PAID') {
          const ownerNet = fin.ownerNetDepositAmount;
          totalEarnedLifeTime += ownerNet;

          // Check if active dispute exists
          const dispute = currentDisputes.find(
            (d) => d.bookingId === b.id && d.status !== 'RESOLVED' && d.status !== 'REJECTED' && d.status !== 'CANCELLED'
          );

          if (dispute || (b.hasDispute && b.activeDisputeId)) {
            heldBalance += ownerNet;
          } else {
            const checkInMs = new Date(b.checkIn).getTime();
            if (nowMs - checkInMs >= twentyFourHoursMs) {
              availableBalance += ownerNet;
            } else {
              pendingBalance += ownerNet;
            }
          }
        }
      }
    }

    // Reserved for Payouts (PENDING or PROCESSING)
    let reservedForPayout = 0;
    for (const req of currentPayoutRequests) {
      if (req.status === 'PENDING' || req.status === 'PROCESSING') {
        reservedForPayout += req.amount;
      }
    }

    // Deduct reserved for payout from available balance
    availableBalance = Math.max(0, availableBalance - reservedForPayout);

    currentOwnerWallet = {
      ownerId: currentOwner.id,
      currency: 'ج.م',
      availableBalance,
      pendingBalance,
      reservedForPayout,
      heldBalance,
      totalEarnedLifeTime,
      totalWithdrawnLifeTime: currentOwnerWallet.totalWithdrawnLifeTime || 12000,
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    return { ...currentOwnerWallet };
  },

  getOwnerPayoutMethods: async (): Promise<OwnerPayoutMethod[]> => {
    await delay(150);
    return [...currentPayoutMethods];
  },

  addOwnerPayoutMethod: async (data: Omit<OwnerPayoutMethod, 'id' | 'ownerId' | 'createdAt'>): Promise<OwnerPayoutMethod> => {
    await delay(300);
    const newMethod: OwnerPayoutMethod = {
      ...data,
      id: `pm-${Date.now()}`,
      ownerId: currentOwner.id,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    if (newMethod.isDefault) {
      currentPayoutMethods = currentPayoutMethods.map((m) => ({ ...m, isDefault: false }));
    }

    currentPayoutMethods.push(newMethod);
    return newMethod;
  },

  deleteOwnerPayoutMethod: async (id: string): Promise<boolean> => {
    await delay(200);
    currentPayoutMethods = currentPayoutMethods.filter((m) => m.id !== id);
    return true;
  },

  getPayoutRequests: async (): Promise<PayoutRequest[]> => {
    await delay(150);
    return [...currentPayoutRequests];
  },

  getWalletLedgerEntries: async (): Promise<WalletLedgerEntry[]> => {
    await delay(150);
    return [...currentWalletLedger];
  },

  // Mandatory Payout Reservation Hold Implementation
  createPayoutRequest: async (params: {
    amount: number;
    payoutMethodId: string;
    actualProviderFee?: number;
    notes?: string;
  }): Promise<PayoutRequest> => {
    await delay(350);

    const wallet = await mockRepository.getOwnerWallet();

    if (params.amount < MINIMUM_PAYOUT_AMOUNT) {
      throw new Error(`الحد الأدنى المعتمد لطلب سحب المستحقات هو ${MINIMUM_PAYOUT_AMOUNT.toLocaleString()} ج.م.`);
    }

    if (params.amount > wallet.availableBalance) {
      throw new Error(
        `المبلغ المطلوب (${params.amount.toLocaleString()} ج.م) يتجاوز الرصيد المتاح للسحب (${wallet.availableBalance.toLocaleString()} ج.م).`
      );
    }

    const method = currentPayoutMethods.find((m) => m.id === params.payoutMethodId);
    if (!method) throw new Error('وسيلة السحب المحددة غير موجودة.');

    // Provider transfer fee (owner pays actual fee charged by provider)
    // Sola does NOT charge any platform fee or enforce static percentages/minima.
    const actualProviderFee = params.actualProviderFee ?? 0;
    const fee = actualProviderFee;
    const netAmount = params.amount - fee;

    const nowFormat = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const payoutId = `pay-req-${Date.now()}`;
    const idempotencyKey = `idemp-pay-res-${payoutId}`;

    // Idempotency Guard
    const existingLedger = currentWalletLedger.find((l) => l.idempotencyKey === idempotencyKey);
    if (existingLedger) {
      throw new Error('تم تنفيذ طلب السحب هذا بالفعل.');
    }

    const newRequest: PayoutRequest = {
      id: payoutId,
      ownerId: currentOwner.id,
      amount: params.amount,
      fee,
      netAmount,
      currency: 'ج.م',
      payoutMethod: method,
      status: 'PENDING',
      requestedAt: nowFormat,
      notes: params.notes,
    };

    currentPayoutRequests.unshift(newRequest);

    // Wallet Ledger Entry (PAYOUT_RESERVATION: AVAILABLE -> RESERVED_FOR_PAYOUT)
    const ledgerEntry: WalletLedgerEntry = {
      id: `w-ledger-${Date.now()}`,
      ownerId: currentOwner.id,
      payoutRequestId: payoutId,
      type: 'PAYOUT_RESERVATION',
      amount: params.amount,
      fee,
      netAmount,
      currency: 'ج.م',
      previousBalance: wallet.availableBalance,
      newBalance: wallet.availableBalance - params.amount,
      description: `حجز مبلغ ${params.amount.toLocaleString()} ج.م لطلب سحب أرباح قيد المراجعة عبر (${method.accountTitle})`,
      idempotencyKey,
      createdAt: nowFormat,
    };

    currentWalletLedger.unshift(ledgerEntry);

    mockRepository.pushDeduplicatedNotification({
      title: 'تم تسجيل طلب سحب الأرباح 💸',
      message: `تم حجز مبلغ ${params.amount.toLocaleString()} ج.م وتسجيل طلب السحب للمراجعة والتحويل.`,
      type: 'PAYOUT_REQUEST_SUBMITTED',
      isRead: false,
      entityType: 'PAYOUT',
      entityId: payoutId,
      actionRoute: 'wallet',
      deduplicationKey: `pay-notif-${payoutId}`,
    });

    return newRequest;
  },

  cancelPayoutRequestByOwner: async (payoutRequestId: string): Promise<PayoutRequest> => {
    await delay(300);

    const index = currentPayoutRequests.findIndex((r) => r.id === payoutRequestId);
    if (index === -1) throw new Error('طلب السحب غير موجود.');

    const req = currentPayoutRequests[index];
    if (req.status !== 'PENDING') {
      throw new Error('يمكن إلغاء طلبات السحب التي قيد المراجعة (PENDING) فقط.');
    }

    const nowFormat = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const idempotencyKey = `idemp-pay-rel-${payoutRequestId}`;

    const updated: PayoutRequest = {
      ...req,
      status: 'CANCELLED',
      rejectedAt: nowFormat,
    };

    currentPayoutRequests[index] = updated;

    const wallet = await mockRepository.getOwnerWallet();

    // Wallet Ledger Entry (PAYOUT_RELEASE: RESERVED_FOR_PAYOUT -> AVAILABLE)
    currentWalletLedger.unshift({
      id: `w-ledger-${Date.now()}`,
      ownerId: currentOwner.id,
      payoutRequestId,
      type: 'PAYOUT_RELEASE',
      amount: req.amount,
      fee: 0,
      netAmount: req.amount,
      currency: 'ج.م',
      previousBalance: wallet.availableBalance,
      newBalance: wallet.availableBalance + req.amount,
      description: `تحرير المبلغ المحجوز (${req.amount.toLocaleString()} ج.م) وإعادته للرصيد المتاح بعد إلغاء الطلب`,
      idempotencyKey,
      createdAt: nowFormat,
    });

    return updated;
  },

  processPayoutByAdmin: async (
    payoutRequestId: string,
    action: 'COMPLETED' | 'REJECTED',
    reason?: string,
    providerTransactionId?: string
  ): Promise<PayoutRequest> => {
    await delay(350);

    const index = currentPayoutRequests.findIndex((r) => r.id === payoutRequestId);
    if (index === -1) throw new Error('طلب السحب غير موجود.');

    const req = currentPayoutRequests[index];
    if (req.status === 'COMPLETED' || req.status === 'CANCELLED') {
      throw new Error(`لا يمكن تغيير حالة طلب سحب (${req.status}).`);
    }

    const nowFormat = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const wallet = await mockRepository.getOwnerWallet();

    if (action === 'COMPLETED') {
      const idempotencyKey = `idemp-pay-comp-${payoutRequestId}`;

      const updated: PayoutRequest = {
        ...req,
        status: 'COMPLETED',
        processedAt: nowFormat,
        providerTransactionId: providerTransactionId || `BANK-TX-${Date.now()}`,
      };

      currentPayoutRequests[index] = updated;
      currentOwnerWallet.totalWithdrawnLifeTime += req.amount;

      currentWalletLedger.unshift({
        id: `w-ledger-${Date.now()}`,
        ownerId: currentOwner.id,
        payoutRequestId,
        type: 'PAYOUT_WITHDRAWAL',
        amount: req.amount,
        fee: req.fee,
        netAmount: req.netAmount,
        currency: 'ج.م',
        previousBalance: wallet.availableBalance,
        newBalance: wallet.availableBalance,
        description: `تم تحويل صافي المبلغ (${req.netAmount.toLocaleString()} ج.م) بنجاح عبر (${req.payoutMethod.accountTitle})`,
        idempotencyKey,
        createdAt: nowFormat,
      });

      mockRepository.pushDeduplicatedNotification({
        title: 'تم تحويل مستحقاتك المالية بنجاح 🟢',
        message: `تم تحويل مبلغ ${req.netAmount.toLocaleString()} ج.م لحسابك البنكي/المحفظة بنجاح.`,
        type: 'PAYOUT_COMPLETED',
        isRead: false,
        entityType: 'PAYOUT',
        entityId: payoutRequestId,
        actionRoute: 'wallet',
        deduplicationKey: `pay-comp-notif-${payoutRequestId}`,
      });

      return updated;
    } else {
      const idempotencyKey = `idemp-pay-rej-${payoutRequestId}`;

      const updated: PayoutRequest = {
        ...req,
        status: 'REJECTED',
        rejectedAt: nowFormat,
        rejectionReason: reason || 'بيانات الحساب البنكي غير مطابقة',
      };

      currentPayoutRequests[index] = updated;

      currentWalletLedger.unshift({
        id: `w-ledger-${Date.now()}`,
        ownerId: currentOwner.id,
        payoutRequestId,
        type: 'PAYOUT_RELEASE',
        amount: req.amount,
        fee: 0,
        netAmount: req.amount,
        currency: 'ج.م',
        previousBalance: wallet.availableBalance,
        newBalance: wallet.availableBalance + req.amount,
        description: `إعادة المبلغ المحجوز (${req.amount.toLocaleString()} ج.م) للرصيد المتاح لرفض الطلب: ${reason || 'خطأ بالبيانات'}`,
        idempotencyKey,
        createdAt: nowFormat,
      });

      mockRepository.pushDeduplicatedNotification({
        title: 'تم رفض طلب السحب وإعادة الرصيد 🔴',
        message: `تم رفض طلب السحب بسبب: ${reason || 'خطأ ببيانات الحساب'}. المبلغ في رصيدك المتاح.`,
        type: 'PAYOUT_REJECTED',
        isRead: false,
        entityType: 'PAYOUT',
        entityId: payoutRequestId,
        actionRoute: 'wallet',
        deduplicationKey: `pay-rej-notif-${payoutRequestId}`,
      });

      return updated;
    }
  },

  getFinancialAnalyticsSummary: async (period: string = '2026-08'): Promise<FinancialAnalyticsSummary> => {
    await delay(200);

    const activeBookings = currentBookings.filter(
      (b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED'
    );

    let totalGrossRevenue = 0;
    let totalDepositsCollected = 0;
    let totalSolaCommissionsPaid = 0;
    let totalOwnerNetEarned = 0;
    let totalExpectedArrivalCash = 0;

    for (const b of activeBookings) {
      const fin = currentFinancialSummaries[b.id] || mockRepository.getOrCreateFinancialSummary(b);
      totalGrossRevenue += fin.totalBookingValue;
      totalDepositsCollected += fin.depositAmount;
      totalSolaCommissionsPaid += fin.solaCommissionAmount;
      totalOwnerNetEarned += fin.ownerNetDepositAmount;
      totalExpectedArrivalCash += fin.remainingBalance;
    }

    const totalDaysInMonth = 31;
    const totalPublishedProps = currentProperties.filter((p) => p.status === 'PUBLISHED').length;
    const totalAvailableRoomNights = (totalPublishedProps || 1) * totalDaysInMonth;
    const totalBookedNights = activeBookings.reduce((sum, b) => sum + b.nights, 0);

    const occupancyRatePercentage = totalAvailableRoomNights > 0
      ? Math.min(100, Math.round((totalBookedNights / totalAvailableRoomNights) * 100))
      : 0;

    const averageDailyRate = totalBookedNights > 0
      ? Math.round(totalGrossRevenue / totalBookedNights)
      : 0;

    const revenuePerAvailableRoom = totalAvailableRoomNights > 0
      ? Math.round(totalGrossRevenue / totalAvailableRoomNights)
      : 0;

    return {
      ownerId: currentOwner.id,
      period,
      totalBookingsCount: activeBookings.length,
      totalGrossRevenue,
      totalDepositsCollected,
      totalSolaCommissionsPaid,
      totalOwnerNetEarned,
      totalExpectedArrivalCash,
      occupancyRatePercentage,
      averageDailyRate,
      revenuePerAvailableRoom,
    };
  },

  getAdvancedAnalytics: async (
    timeRange: AnalyticsTimeRange = 'all'
  ): Promise<AdvancedOwnerAnalytics> => {
    await delay(250);

    const financialSummary = await mockRepository.getFinancialAnalyticsSummary(timeRange);
    const activeProperties = currentProperties.filter((p) => p.status !== 'ARCHIVED');
    const confirmedBookings = currentBookings.filter(
      (b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED'
    );

    // 1. Multi-Property Performance Comparison Metrics
    const rawPropertyMetrics: PropertyPerformanceMetric[] = activeProperties.map((prop) => {
      const propBookings = confirmedBookings.filter((b) => b.propertyId === prop.id);
      const totalBookedNights = propBookings.reduce((sum, b) => sum + b.nights, 0);
      const totalGrossRevenue = propBookings.reduce((sum, b) => {
        const fin = currentFinancialSummaries[b.id] || mockRepository.getOrCreateFinancialSummary(b);
        return sum + fin.totalBookingValue;
      }, 0);

      const ownerNetEarnings = propBookings.reduce((sum, b) => {
        const fin = currentFinancialSummaries[b.id] || mockRepository.getOrCreateFinancialSummary(b);
        return sum + (fin.ownerNetDepositAmount + fin.remainingBalance);
      }, 0);

      const availableRoomNights = 31; // Days in current period
      const occupancyRatePercentage = availableRoomNights > 0
        ? Math.min(100, Math.round((totalBookedNights / availableRoomNights) * 100))
        : 0;

      const averageDailyRate = totalBookedNights > 0
        ? Math.round(totalGrossRevenue / totalBookedNights)
        : 0;

      const revenuePerAvailableRoom = Math.round(totalGrossRevenue / availableRoomNights);
      const averageLengthOfStay = propBookings.length > 0
        ? Number((totalBookedNights / propBookings.length).toFixed(1))
        : 0;

      const disputesCount = currentDisputes.filter((d) => d.propertyId === prop.id).length;

      return {
        propertyId: prop.id,
        propertyTitle: prop.title,
        propertyType: prop.propertyType,
        locationName: prop.locationName,
        totalBookingsCount: propBookings.length,
        totalBookedNights,
        totalGrossRevenue,
        ownerNetEarnings,
        occupancyRatePercentage,
        averageDailyRate,
        revenuePerAvailableRoom,
        averageLengthOfStay,
        disputesCount,
        rank: 1, // Will be set after sorting
      };
    });

    // Sort by Total Gross Revenue descending to rank properties
    rawPropertyMetrics.sort((a, b) => b.totalGrossRevenue - a.totalGrossRevenue);
    const propertyMetrics = rawPropertyMetrics.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    // 2. Operational Quality Index Calculations
    const allRequestsReceived = currentBookings.length;
    const approvedRequestsCount = confirmedBookings.length;
    const rejectedRequestsCount = currentBookings.filter((b) => b.status === 'REJECTED').length;
    const expiredRequestsCount = currentBookings.filter((b) => b.status === 'EXPIRED').length;

    const approvalRatePercentage = allRequestsReceived > 0
      ? Math.round((approvedRequestsCount / allRequestsReceived) * 100)
      : 0; // Technical zero fallback when no requests exist

    // Response time calculation (minutes between createdAt and confirmedAt/rejectedAt)
    let totalResponseMinutes = 0;
    let respondedCount = 0;
    for (const b of currentBookings) {
      if (b.confirmedAt && b.createdAt) {
        const createdMs = new Date(b.createdAt).getTime();
        const confirmedMs = new Date(b.confirmedAt).getTime();
        const diffMins = Math.max(1, Math.round((confirmedMs - createdMs) / 60000));
        if (!isNaN(diffMins)) {
          totalResponseMinutes += diffMins;
          respondedCount++;
        }
      }
    }

    const averageOwnerResponseTimeMinutes = respondedCount > 0
      ? Math.round(totalResponseMinutes / respondedCount)
      : 0; // Technical zero fallback when no responses exist

    const totalDisputesOpenedCount = currentDisputes.length;
    const disputeRatioPercentage = approvedRequestsCount > 0
      ? Number(((totalDisputesOpenedCount / approvedRequestsCount) * 100).toFixed(1))
      : 0;

    const totalBookedNightsAll = confirmedBookings.reduce((sum, b) => sum + b.nights, 0);
    const averageLengthOfStayNights = approvedRequestsCount > 0
      ? Number((totalBookedNightsAll / approvedRequestsCount).toFixed(1))
      : 0;

    // Lead time calculation (days between createdAt and checkIn)
    let totalLeadDays = 0;
    for (const b of confirmedBookings) {
      const createdMs = new Date(b.createdAt).getTime();
      const checkInMs = new Date(b.checkIn).getTime();
      const diffDays = Math.max(0, Math.round((checkInMs - createdMs) / (1000 * 60 * 60 * 24)));
      if (!isNaN(diffDays)) {
        totalLeadDays += diffDays;
      }
    }

    const averageLeadTimeDays = approvedRequestsCount > 0
      ? Math.round(totalLeadDays / approvedRequestsCount)
      : 0;

    // Neutral technical placeholder (0) for TypeScript interface compatibility.
    // NOT a calculated business KPI score until formal management specification.
    const overallQualityScore = 0;

    const qualityIndex: OperationalQualityIndex = {
      ownerId: currentOwner.id,
      totalRequestsReceivedCount: allRequestsReceived,
      approvedRequestsCount,
      rejectedRequestsCount,
      expiredRequestsCount,
      approvalRatePercentage,
      averageOwnerResponseTimeMinutes,
      totalDisputesOpenedCount,
      disputeRatioPercentage,
      averageLengthOfStayNights,
      averageLeadTimeDays,
      overallQualityScore,
    };

    return {
      ownerId: currentOwner.id,
      timeRange,
      financialSummary,
      propertyMetrics,
      qualityIndex,
      topPerformingProperty: propertyMetrics[0],
      generatedAt: new Date().toISOString(),
    };
  },

  // ==========================================
  // Phase 4: Property Domain & Listing Management
  // ==========================================

  getProperties: async (isEmptyState: boolean = false): Promise<Property[]> => {
    await delay();
    if (isEmptyState) return [];
    return currentProperties.filter((p) => p.status !== 'ARCHIVED');
  },

  getPropertyById: async (id: string): Promise<Property | null> => {
    await delay();
    const found = currentProperties.find((p) => p.id === id);
    return found ? { ...found } : null;
  },

  getPropertyAuditLogs: async (propertyId: string): Promise<PropertyAuditLog[]> => {
    await delay(150);
    return currentPropertyAuditLogs.filter((l) => l.propertyId === propertyId);
  },

  createOrUpdateProperty: async (
    data: Partial<Property>,
    submitForReview: boolean = false
  ): Promise<Property> => {
    await delay(350);
    const now = new Date().toISOString().slice(0, 10);
    const existingIndex = data.id ? currentProperties.findIndex((p) => p.id === data.id) : -1;

    if (existingIndex >= 0) {
      const target = currentProperties[existingIndex];
      const previousStatus = target.status;

      // PROPERTY STATE MACHINE GUARD
      if (previousStatus === 'SUSPENDED' && submitForReview) {
        throw new Error('لا يمكن إعادة إرسال وحدة معلقة إدارياً من منصة Sola.');
      }

      const updatedStatus = submitForReview
        ? 'PENDING_REVIEW'
        : data.status || target.status || 'DRAFT';

      const updatedProperty: Property = {
        ...target,
        ...data,
        status: updatedStatus,
        rejectionReason: submitForReview ? undefined : target.rejectionReason,
        updatedAt: now,
      };

      currentProperties[existingIndex] = updatedProperty;

      mockRepository.logPropertyAudit(
        target.id,
        submitForReview ? 'PROPERTY_SUBMITTED_FOR_REVIEW' : 'PROPERTY_UPDATED_NONSENSITIVE',
        'OWNER',
        { status: previousStatus },
        { status: updatedStatus }
      );

      if (submitForReview) {
        mockRepository.pushDeduplicatedNotification({
          title: 'تم تقديم الوحدة للمراجعة 📋',
          message: `تم رفع إعلان ${updatedProperty.title} إلى مراجعة إدارة منصة Sola.`,
          type: 'PROPERTY_SUBMITTED_FOR_REVIEW',
          isRead: false,
          entityType: 'PROPERTY',
          entityId: updatedProperty.id,
          actionRoute: 'properties',
          deduplicationKey: `prop-submit-${updatedProperty.id}`,
        });
      }

      return { ...updatedProperty };
    } else {
      const newId = `prop-${Date.now()}`;
      const newProperty: Property = {
        id: newId,
        ownerId: currentOwner.id,
        title: data.title || 'وحدة ساحلية جديدة',
        unitType: data.unitType || 'شاليه',
        propertyType: data.propertyType || 'CHALET',
        description: data.description || '',
        region: data.region || 'الساحل الشمالي',
        locationName: data.locationName || `${data.resortName || 'قرية ساحلية'}، ${data.region || 'الساحل الشمالي'}`,
        resortName: data.resortName || 'منتجع ساحلي',
        address: data.address || '',
        location: data.location || {
          governorate: 'مطروح',
          city: 'العلمين',
          district: data.region || 'الساحل الشمالي',
          resortName: data.resortName || 'منتجع ساحلي',
          address: data.address || '',
        },
        capacity: data.capacity || {
          baseGuests: 4,
          maxGuests: data.maxGuests || 6,
          bedrooms: data.bedrooms || 2,
          beds: data.bedsCount || 3,
          bathrooms: data.bathrooms || 1,
          areaSqM: data.areaSqM || 120,
        },
        images: data.images && data.images.length > 0 ? data.images : [
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
        ],
        mainImageIndex: data.mainImageIndex || 0,
        pricePerNight: data.pricePerNight || 5000,
        currency: 'ج.م',
        pricing: data.pricing || {
          basePricePerNight: data.pricePerNight || 5000,
          currency: 'ج.م',
        },
        rating: 0,
        reviewsCount: 0,
        bedrooms: data.bedrooms || 2,
        bathrooms: data.bathrooms || 1,
        maxGuests: data.maxGuests || 6,
        areaSqM: data.areaSqM || 120,
        bedsCount: data.bedsCount || 3,
        amenities: data.amenities || ['pool', 'central_ac', 'wifi'],
        houseRules: data.houseRules || {
          minStay: 2,
          maxStay: 30,
          smokingAllowed: false,
          partiesAllowed: false,
          petsAllowed: false,
          childrenAllowed: true,
          checkInTime: '14:00',
          checkOutTime: '12:00',
        },
        status: submitForReview ? 'PENDING_REVIEW' : 'DRAFT',
        verificationStatus: 'UNVERIFIED',
        createdAt: now,
        updatedAt: now,
      };

      currentProperties.unshift(newProperty);

      mockRepository.logPropertyAudit(
        newId,
        'PROPERTY_CREATED',
        'OWNER',
        undefined,
        { title: newProperty.title, status: newProperty.status }
      );

      return { ...newProperty };
    }
  },

  submitPropertyForReview: async (propertyId: string): Promise<Property> => {
    await delay(300);
    const index = currentProperties.findIndex((p) => p.id === propertyId);
    if (index === -1) throw new Error('الوحدة غير موجودة');

    const prop = currentProperties[index];

    if (prop.images.length === 0) {
      throw new Error('لا يمكن إرسال الوحدة للمراجعة دون رفع صور واضحة (صورة واحدة على الأقل).');
    }

    if (prop.status === 'SUSPENDED') {
      throw new Error('الوحدة معلقة إدارياً من منصة Sola ولا يمكن إرسالها للمراجعة.');
    }

    currentProperties[index] = {
      ...prop,
      status: 'PENDING_REVIEW',
      rejectionReason: undefined,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    mockRepository.logPropertyAudit(propertyId, 'PROPERTY_SUBMITTED_FOR_REVIEW', 'OWNER', { status: prop.status }, { status: 'PENDING_REVIEW' });

    mockRepository.pushDeduplicatedNotification({
      title: 'تم تقديم الوحدة للمراجعة 📋',
      message: `تم رفع إعلان ${prop.title} إلى مراجعة إدارة منصة Sola.`,
      type: 'PROPERTY_SUBMITTED_FOR_REVIEW',
      isRead: false,
      entityType: 'PROPERTY',
      entityId: propertyId,
      actionRoute: 'properties',
      deduplicationKey: `prop-sub-${propertyId}`,
    });

    return { ...currentProperties[index] };
  },

  pauseProperty: async (propertyId: string): Promise<Property> => {
    await delay(300);
    const index = currentProperties.findIndex((p) => p.id === propertyId);
    if (index === -1) throw new Error('الوحدة غير موجودة');

    const prop = currentProperties[index];
    if (prop.status !== 'PUBLISHED') {
      throw new Error('يمكن إيقاف الوحدات المنشورة فقط.');
    }

    currentProperties[index] = {
      ...prop,
      status: 'PAUSED',
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    mockRepository.logPropertyAudit(propertyId, 'PROPERTY_PAUSED', 'OWNER', { status: 'PUBLISHED' }, { status: 'PAUSED' });

    mockRepository.pushDeduplicatedNotification({
      title: 'تم إيقاف إعلان الوحدة مؤقتاً ⏸️',
      message: `تم إيقاف استقبال طلبات الحجز الجديدة على ${prop.title}. الحجوزات القائمة سارية.`,
      type: 'PROPERTY_PAUSED',
      isRead: false,
      entityType: 'PROPERTY',
      entityId: propertyId,
      actionRoute: 'properties',
      deduplicationKey: `prop-pause-${propertyId}`,
    });

    return { ...currentProperties[index] };
  },

  resumeProperty: async (propertyId: string): Promise<Property> => {
    await delay(300);
    const index = currentProperties.findIndex((p) => p.id === propertyId);
    if (index === -1) throw new Error('الوحدة غير موجودة');

    const prop = currentProperties[index];
    if (prop.status !== 'PAUSED') {
      throw new Error('يمكن استئناف نشر الوحدات الموقوفة مؤقتاً فقط.');
    }

    currentProperties[index] = {
      ...prop,
      status: 'PUBLISHED',
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    mockRepository.logPropertyAudit(propertyId, 'PROPERTY_RESUMED', 'OWNER', { status: 'PAUSED' }, { status: 'PUBLISHED' });

    mockRepository.pushDeduplicatedNotification({
      title: 'تم استئناف نشر الوحدة 🟢',
      message: `أصبحت ${prop.title} متاحة مجدداً لاستقبال الحجوزات على المنصة.`,
      type: 'PROPERTY_PUBLISHED',
      isRead: false,
      entityType: 'PROPERTY',
      entityId: propertyId,
      actionRoute: 'properties',
      deduplicationKey: `prop-pub-${propertyId}`,
    });

    return { ...currentProperties[index] };
  },

  archiveProperty: async (propertyId: string): Promise<Property> => {
    await delay(300);
    const index = currentProperties.findIndex((p) => p.id === propertyId);
    if (index === -1) throw new Error('الوحدة غير موجودة');

    const prop = currentProperties[index];

    const hasActiveBookings = currentBookings.some(
      (b) => b.propertyId === propertyId && (b.status === 'CONFIRMED' || b.status === 'PENDING_OWNER_APPROVAL')
    );

    if (hasActiveBookings) {
      throw new Error('لا يمكن أرشفة أو حذف وحدة لديها حجوزات قادمة مؤكدة أو قيد المراجعة.');
    }

    currentProperties[index] = {
      ...prop,
      status: 'ARCHIVED',
      archivedAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    mockRepository.logPropertyAudit(propertyId, 'PROPERTY_ARCHIVED', 'OWNER', { status: prop.status }, { status: 'ARCHIVED' });

    return { ...currentProperties[index] };
  },

  restoreProperty: async (propertyId: string): Promise<Property> => {
    await delay(300);
    const index = currentProperties.findIndex((p) => p.id === propertyId);
    if (index === -1) throw new Error('الوحدة غير موجودة');

    const prop = currentProperties[index];
    if (prop.status !== 'ARCHIVED') {
      throw new Error('يمكن استرجاع الوحدات المؤرشفة فقط.');
    }

    currentProperties[index] = {
      ...prop,
      status: 'DRAFT',
      archivedAt: undefined,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    mockRepository.logPropertyAudit(propertyId, 'PROPERTY_RESUMED_FROM_ARCHIVE', 'OWNER', { status: 'ARCHIVED' }, { status: 'DRAFT' });

    mockRepository.pushDeduplicatedNotification({
      title: 'تم استرجاع الوحدة المؤرشفة لمسودة 📄',
      message: `تم تحويل إعلان ${prop.title} إلى مسودة مراجعة بدلاً من الأرشفة.`,
      type: 'PROPERTY_STATUS',
      isRead: false,
      entityType: 'PROPERTY',
      entityId: propertyId,
      actionRoute: 'properties',
      deduplicationKey: `prop-rest-${propertyId}`,
    });

    return { ...currentProperties[index] };
  },

  submitOwnerVerificationDocuments: async (
    propertyId: string,
    documents: Array<{ type: 'NATIONAL_ID' | 'PROPERTY_DEED' | 'LEASE_CONTRACT' | 'OTHER'; fileUrl: string; title: string }>
  ): Promise<Property> => {
    await delay(350);
    const index = currentProperties.findIndex((p) => p.id === propertyId);
    if (index === -1) throw new Error('الوحدة غير موجودة');

    const prop = currentProperties[index];
    const nowFormat = new Date().toISOString().slice(0, 10);

    const formattedDocs = documents.map((d, i) => ({
      id: `ver-doc-${Date.now()}-${i}`,
      ownerId: currentOwner.id,
      propertyId,
      type: d.type,
      fileUrl: d.fileUrl,
      title: d.title,
      status: 'PENDING' as const,
      uploadedAt: nowFormat,
    }));

    currentProperties[index] = {
      ...prop,
      verificationStatus: 'PENDING_VERIFICATION',
      verificationDocuments: formattedDocs,
      updatedAt: nowFormat,
    };

    mockRepository.logPropertyAudit(propertyId, 'PROPERTY_VERIFICATION_SUBMITTED', 'OWNER', { status: prop.verificationStatus }, { status: 'PENDING_VERIFICATION' });

    mockRepository.pushDeduplicatedNotification({
      title: 'تم تقديم مستندات الملكية والتوثيق 📄',
      message: `تم رفع مستندات توثيق ${prop.title} لمراجعة فريق جودة Sola.`,
      type: 'PROPERTY_VERIFICATION_SUBMITTED',
      isRead: false,
      entityType: 'PROPERTY',
      entityId: propertyId,
      actionRoute: 'properties',
      deduplicationKey: `prop-ver-sub-${propertyId}`,
    });

    return { ...currentProperties[index] };
  },

  processPropertyVerificationByAdmin: async (
    propertyId: string,
    action: 'VERIFIED' | 'REJECTED',
    reason?: string
  ): Promise<Property> => {
    await delay(300);
    const index = currentProperties.findIndex((p) => p.id === propertyId);
    if (index === -1) throw new Error('الوحدة غير موجودة');

    const prop = currentProperties[index];
    const nowFormat = new Date().toISOString().slice(0, 10);

    currentProperties[index] = {
      ...prop,
      verificationStatus: action,
      rejectionReason: action === 'REJECTED' ? reason : undefined,
      updatedAt: nowFormat,
    };

    mockRepository.logPropertyAudit(
      propertyId,
      action === 'VERIFIED' ? 'PROPERTY_VERIFICATION_APPROVED' : 'PROPERTY_VERIFICATION_REJECTED',
      'ADMIN',
      { status: prop.verificationStatus },
      { status: action }
    );

    return { ...currentProperties[index] };
  },

  setDailyPricing: async (propertyId: string, datePriceMap: Record<string, number>): Promise<Property> => {
    await delay(300);
    const index = currentProperties.findIndex((p) => p.id === propertyId);
    if (index === -1) throw new Error('الوحدة غير موجودة');

    const prop = currentProperties[index];

    const currentMap = prop.pricing?.dailyPricingMap || {};
    const updatedMap = { ...currentMap, ...datePriceMap };

    currentProperties[index] = {
      ...prop,
      pricing: {
        ...prop.pricing,
        basePricePerNight: prop.pricePerNight,
        currency: prop.currency,
        dailyPricingMap: updatedMap,
      },
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    mockRepository.logPropertyAudit(propertyId, 'PROPERTY_PRICING_UPDATED', 'OWNER', currentMap, updatedMap);

    return { ...currentProperties[index] };
  },

  deleteProperty: async (propertyId: string): Promise<boolean> => {
    await mockRepository.archiveProperty(propertyId);
    return true;
  },

  getAvailability: async (
    propertyId: string,
    year: number,
    month: number
  ): Promise<AvailabilityRecord[]> => {
    await delay(200);
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const prefix = `${year}-${monthStr}`;

    return currentAvailability.filter(
      (a) => a.propertyId === propertyId && a.date.startsWith(prefix)
    );
  },

  blockDates: async (propertyId: string, dates: string[]): Promise<AvailabilityRecord[]> => {
    await delay(300);
    const now = new Date().toISOString().slice(0, 10);
    const updatedRecords: AvailabilityRecord[] = [];

    for (const d of dates) {
      const existingIndex = currentAvailability.findIndex(
        (a) => a.propertyId === propertyId && a.date === d
      );

      if (existingIndex >= 0) {
        if (currentAvailability[existingIndex].status !== 'BOOKED') {
          currentAvailability[existingIndex] = {
            ...currentAvailability[existingIndex],
            status: 'BLOCKED',
            updatedAt: now,
          };
        }
        updatedRecords.push(currentAvailability[existingIndex]);
      } else {
        const newRecord: AvailabilityRecord = {
          id: `av-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          propertyId,
          date: d,
          status: 'BLOCKED',
          updatedAt: now,
        };
        currentAvailability.push(newRecord);
        updatedRecords.push(newRecord);
      }
    }

    return updatedRecords;
  },

  unblockDates: async (propertyId: string, dates: string[]): Promise<AvailabilityRecord[]> => {
    await delay(300);
    const now = new Date().toISOString().slice(0, 10);
    const updatedRecords: AvailabilityRecord[] = [];

    for (const d of dates) {
      const existingIndex = currentAvailability.findIndex(
        (a) => a.propertyId === propertyId && a.date === d
      );

      if (existingIndex >= 0) {
        if (currentAvailability[existingIndex].status === 'BLOCKED') {
          currentAvailability[existingIndex] = {
            ...currentAvailability[existingIndex],
            status: 'AVAILABLE',
            updatedAt: now,
          };
        }
        updatedRecords.push(currentAvailability[existingIndex]);
      }
    }

    return updatedRecords;
  },

  getBookings: async (isEmptyState: boolean = false): Promise<Booking[]> => {
    await delay();
    await mockRepository.expirePendingBookingsIfNeeded();
    if (isEmptyState) return [];

    return currentBookings.map((b) => ({
      ...b,
      financialSummary: currentFinancialSummaries[b.id] || mockRepository.getOrCreateFinancialSummary(b),
    }));
  },

  getPendingBookings: async (): Promise<Booking[]> => {
    await delay(150);
    await mockRepository.expirePendingBookingsIfNeeded();
    return currentBookings
      .filter((b) => b.status === 'PENDING_OWNER_APPROVAL')
      .map((b) => ({
        ...b,
        financialSummary: currentFinancialSummaries[b.id] || mockRepository.getOrCreateFinancialSummary(b),
      }));
  },

  getUpcomingBookings: async (): Promise<Booking[]> => {
    await delay(150);
    const today = new Date().toISOString().slice(0, 10);
    return currentBookings
      .filter((b) => (b.status === 'CONFIRMED' || b.status === 'CANCELLATION_REQUESTED') && b.checkOut >= today)
      .map((b) => ({
        ...b,
        financialSummary: currentFinancialSummaries[b.id] || mockRepository.getOrCreateFinancialSummary(b),
      }))
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  },

  getPastBookings: async (): Promise<Booking[]> => {
    await delay(150);
    const today = new Date().toISOString().slice(0, 10);
    return currentBookings
      .filter((b) => b.checkOut < today || b.status === 'CANCELLED' || b.status === 'EXPIRED' || b.status === 'REJECTED')
      .map((b) => ({
        ...b,
        financialSummary: currentFinancialSummaries[b.id] || mockRepository.getOrCreateFinancialSummary(b),
      }))
      .sort((a, b) => b.checkIn.localeCompare(a.checkIn));
  },

  getBookingById: async (id: string): Promise<Booking | null> => {
    await delay();
    await mockRepository.expirePendingBookingsIfNeeded();
    const found = currentBookings.find((b) => b.id === id);
    if (!found) return null;

    return {
      ...found,
      financialSummary: currentFinancialSummaries[found.id] || mockRepository.getOrCreateFinancialSummary(found),
    };
  },

  approveBooking: async (bookingId: string): Promise<Booking> => {
    await delay(350);
    await mockRepository.expirePendingBookingsIfNeeded();

    const index = currentBookings.findIndex((b) => b.id === bookingId);
    if (index === -1) throw new Error('طلب الحجز غير موجود');

    const booking = currentBookings[index];

    if (booking.status === 'CANCELLED' || booking.status === 'REJECTED' || booking.status === 'EXPIRED') {
      throw new Error(`لا يمكن تغيير حالة حجز (${booking.status}) إلى مؤكد.`);
    }

    if (mockRepository.isBookingExpired(booking)) {
      currentBookings[index] = {
        ...booking,
        status: 'EXPIRED',
        updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      };
      throw new Error('انتهت مهلة الرد على هذا الطلب ولا يمكن قبوله.');
    }

    if (booking.status !== 'PENDING_OWNER_APPROVAL') {
      throw new Error('لم يعد هذا الطلب بانتظار الموافقة.');
    }

    const occupiedNights = getOccupiedNights(booking.checkIn, booking.checkOut);

    const conflictingDates = occupiedNights.filter((d) => {
      const record = currentAvailability.find(
        (a) => a.propertyId === booking.propertyId && a.date === d
      );
      return record && record.status === 'BOOKED';
    });

    if (conflictingDates.length > 0) {
      throw new Error(
        `لا يمكن تأكيد هذا الحجز - توجد أيام متعارضة مع حجز مؤكد لهذه الوحدة (${conflictingDates.join(' ، ')})`
      );
    }

    const nowIso = new Date().toISOString();
    const nowFormat = nowIso.slice(0, 16).replace('T', ' ');

    const prop = currentProperties.find((p) => p.id === booking.propertyId);
    const snapshot = prop ? createBookingSnapshot(prop) : booking.propertySnapshot;

    currentBookings[index] = {
      ...booking,
      status: 'CONFIRMED',
      confirmedAt: nowIso,
      propertySnapshot: snapshot,
      updatedAt: nowFormat,
    };

    const finSummary = mockRepository.getOrCreateFinancialSummary(booking);
    finSummary.depositPaymentStatus = 'PAYMENT_PENDING';
    finSummary.updatedAt = nowFormat;
    currentFinancialSummaries[booking.id] = finSummary;

    for (const nightDate of occupiedNights) {
      const avIndex = currentAvailability.findIndex(
        (a) => a.propertyId === booking.propertyId && a.date === nightDate
      );
      if (avIndex >= 0) {
        currentAvailability[avIndex] = {
          ...currentAvailability[avIndex],
          status: 'BOOKED',
          notes: `حجز مؤكد - ${booking.renter.name}`,
          updatedAt: nowFormat.slice(0, 10),
        };
      } else {
        currentAvailability.push({
          id: `av-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          propertyId: booking.propertyId,
          date: nightDate,
          status: 'BOOKED',
          notes: `حجز مؤكد - ${booking.renter.name}`,
          updatedAt: nowFormat.slice(0, 10),
        });
      }
    }

    mockRepository.pushDeduplicatedNotification({
      title: 'تم قبول طلب الحجز وتأكيده 🟢',
      message: `تم قبول طلب الحجز الخاص بالمستأجر ${booking.renter.name} من ${booking.checkIn} إلى ${booking.checkOut}.`,
      type: 'BOOKING_REQUEST_APPROVED',
      isRead: false,
      entityType: 'BOOKING',
      entityId: booking.id,
      actionRoute: 'bookings',
      deduplicationKey: `app-bk-${booking.id}`,
    });

    return {
      ...currentBookings[index],
      financialSummary: finSummary,
    };
  },

  rejectBooking: async (bookingId: string): Promise<Booking> => {
    await delay(300);
    const index = currentBookings.findIndex((b) => b.id === bookingId);
    if (index === -1) throw new Error('طلب الحجز غير موجود');

    const booking = currentBookings[index];

    if (booking.status !== 'PENDING_OWNER_APPROVAL') {
      throw new Error('لم يعد هذا الطلب بانتظار اتخاذ قرار.');
    }

    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

    currentBookings[index] = {
      ...booking,
      status: 'REJECTED',
      updatedAt: now,
    };

    const occupiedNights = getOccupiedNights(booking.checkIn, booking.checkOut);
    currentAvailability = currentAvailability.filter(
      (a) => !(a.propertyId === booking.propertyId && occupiedNights.includes(a.date) && a.status === 'PENDING')
    );

    mockRepository.pushDeduplicatedNotification({
      title: 'تم رفض طلب الحجز 🔴',
      message: `تم رفض طلب حجز المستأجر ${booking.renter.name} وإشعار الطرفين.`,
      type: 'BOOKING_REQUEST_REJECTED',
      isRead: false,
      entityType: 'BOOKING',
      entityId: booking.id,
      actionRoute: 'bookings',
      deduplicationKey: `rej-bk-${booking.id}`,
    });

    return { ...currentBookings[index] };
  },

  getOrCreateFinancialSummary: (booking: Booking): BookingFinancialSummary => {
    if (currentFinancialSummaries[booking.id]) {
      return currentFinancialSummaries[booking.id];
    }

    const prop = currentProperties.find((p) => p.id === booking.propertyId);

    let firstNightPrice = prop ? prop.pricePerNight : booking.totalPrice / (booking.nights || 1);
    if (prop?.pricing?.dailyPricingMap && prop.pricing.dailyPricingMap[booking.checkIn]) {
      firstNightPrice = prop.pricing.dailyPricingMap[booking.checkIn];
    }

    const summary = createFinancialSummary({
      bookingId: booking.id,
      totalBookingValue: booking.totalPrice,
      firstNightPrice,
      depositPaymentStatus: booking.status === 'CONFIRMED' ? 'PAID' : 'UNPAID',
    });

    currentFinancialSummaries[booking.id] = summary;
    return summary;
  },

  getBookingFinancialSummary: async (bookingId: string): Promise<BookingFinancialSummary | null> => {
    await delay(150);
    const booking = currentBookings.find((b) => b.id === bookingId);
    if (!booking) return null;

    return mockRepository.getOrCreateFinancialSummary(booking);
  },

  simulateDepositPayment: async (
    bookingId: string,
    providerTransactionId?: string,
    remainingBalanceMethod: 'CASH_ON_ARRIVAL' | 'IN_APP_PAYMENT_ON_ARRIVAL' = 'CASH_ON_ARRIVAL'
  ): Promise<BookingFinancialSummary> => {
    await delay(400);

    const booking = currentBookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error('الحجز غير موجود.');

    const txId = providerTransactionId || `PAY-MOCK-${Date.now()}`;

    const existingTx = currentFinancialTransactions.find(
      (t) => t.providerTransactionId === txId && t.status === 'COMPLETED'
    );

    if (existingTx) {
      return currentFinancialSummaries[bookingId];
    }

    const summary = mockRepository.getOrCreateFinancialSummary(booking);
    const nowIso = new Date().toISOString();
    const nowFormat = nowIso.slice(0, 16).replace('T', ' ');

    summary.depositPaymentStatus = 'PAID';
    summary.remainingBalancePaymentMethod = remainingBalanceMethod;
    summary.ownerPayoutStatus = 'OWNER_PAYOUT_COMPLETED';
    summary.updatedAt = nowFormat;

    currentFinancialSummaries[bookingId] = summary;

    currentFinancialTransactions.push({
      id: `tx-dep-${Date.now()}`,
      bookingId,
      type: 'DEPOSIT_PAYMENT',
      amount: summary.depositAmount,
      currency: summary.currency,
      payer: booking.renter.name,
      beneficiary: 'منصة Sola',
      status: 'COMPLETED',
      provider: 'MOCK_SOLA_PAY',
      providerTransactionId: txId,
      createdAt: nowFormat,
      completedAt: nowFormat,
    });

    currentFinancialTransactions.push({
      id: `tx-comm-${Date.now()}`,
      bookingId,
      type: 'SOLA_COMMISSION',
      amount: summary.solaCommissionAmount,
      currency: summary.currency,
      payer: `${currentOwner.name} (خصم من العربون)`,
      beneficiary: 'منصة Sola (عمولة 20%)',
      status: 'COMPLETED',
      provider: 'MOCK_SOLA_PAY',
      providerTransactionId: `COMM-${txId}`,
      createdAt: nowFormat,
      completedAt: nowFormat,
    });

    currentFinancialTransactions.push({
      id: `tx-payout-${Date.now()}`,
      bookingId,
      type: 'OWNER_PAYOUT',
      amount: summary.ownerNetDepositAmount,
      currency: summary.currency,
      payer: 'منصة Sola',
      beneficiary: `${currentOwner.name} (صافي العربون)`,
      status: 'COMPLETED',
      provider: 'MOCK_SOLA_PAY',
      providerTransactionId: `PO-${txId}`,
      createdAt: nowFormat,
      completedAt: nowFormat,
    });

    currentFinancialAuditLogs.unshift({
      id: `audit-${Date.now()}`,
      event: 'DEPOSIT_PAYMENT_SUCCEEDED',
      bookingId,
      transactionId: txId,
      actor: 'MOCK_SOLA_PAYMENT_GATEWAY',
      previousState: 'UNPAID',
      newState: 'PAID',
      amount: summary.depositAmount,
      timestamp: nowFormat,
      metadata: {
        solaCommission: summary.solaCommissionAmount,
        ownerNetDeposit: summary.ownerNetDepositAmount,
        remainingBalance: summary.remainingBalance,
      },
    });

    mockRepository.pushDeduplicatedNotification({
      title: 'تم استلام عربون حجز جديد 💰',
      message: `قام المستأجر ${booking.renter.name} بدفع عربون الليلة الأولى (${summary.depositAmount.toLocaleString()} ج.م) بنجاح عبر Sola.`,
      type: 'DEPOSIT_PAYMENT_SUCCESS',
      isRead: false,
      entityType: 'BOOKING',
      entityId: bookingId,
      actionRoute: 'bookings',
      deduplicationKey: `dep-pay-${txId}`,
    });

    return summary;
  },

  getFinancialTransactions: async (bookingId?: string): Promise<FinancialTransaction[]> => {
    await delay(150);
    if (bookingId) {
      return currentFinancialTransactions.filter((t) => t.bookingId === bookingId);
    }
    return [...currentFinancialTransactions];
  },

  getFinancialAuditLogs: async (bookingId?: string): Promise<FinancialAuditLog[]> => {
    await delay(150);
    if (bookingId) {
      return currentFinancialAuditLogs.filter((l) => l.bookingId === bookingId);
    }
    return [...currentFinancialAuditLogs];
  },

  getDisputes: async (): Promise<Dispute[]> => {
    await delay(150);
    return [...currentDisputes];
  },

  getDisputeById: async (id: string): Promise<Dispute | null> => {
    await delay(150);
    const found = currentDisputes.find((d) => d.id === id);
    return found ? { ...found } : null;
  },

  respondToDispute: async (
    disputeId: string,
    responseText: string,
    evidenceUrls: string[] = []
  ): Promise<Dispute> => {
    await delay(350);

    const index = currentDisputes.findIndex((d) => d.id === disputeId);
    if (index === -1) throw new Error('النزاع غير موجود.');

    const dispute = currentDisputes[index];

    if (dispute.status !== 'OPENED' && dispute.status !== 'UNDER_OWNER_RESPONSE' && dispute.status !== 'WAITING_FOR_MORE_EVIDENCE') {
      throw new Error('لا يطلب هذا النزاع رداً من المالك في الوقت الحالي.');
    }

    const nowIso = new Date().toISOString();
    const nowFormat = nowIso.slice(0, 16).replace('T', ' ');

    const newOwnerEvidence: DisputeEvidence[] = evidenceUrls.map((url, i) => ({
      id: `ev-owner-${Date.now()}-${i}`,
      disputeId,
      submittedBy: 'OWNER',
      type: 'IMAGE',
      url,
      description: `أدلة إضافية مقدمة من المالك أحمد الفاروق (${i + 1})`,
      createdAt: nowFormat,
    }));

    const updatedDispute: Dispute = {
      ...dispute,
      status: 'OWNER_RESPONDED',
      ownerResponse: responseText,
      ownerResponseAt: nowFormat,
      ownerEvidence: [...(dispute.ownerEvidence || []), ...newOwnerEvidence],
      updatedAt: nowFormat,
    };

    currentDisputes[index] = updatedDispute;

    currentDisputeAuditLogs.unshift({
      id: `disp-audit-${Date.now()}`,
      disputeId,
      action: 'OWNER_RESPONDED',
      actorId: currentOwner.id,
      actorType: 'OWNER',
      metadata: { responseLength: responseText.length, evidenceCount: newOwnerEvidence.length },
      createdAt: nowFormat,
    });

    let conv = currentConversations.find((c) => c.bookingId === dispute.bookingId);
    if (conv) {
      conv.lastMessage = 'أرسل المالك رده ودلائله الدفاعية على النزاع المفتوح.';
      conv.lastMessageTimestamp = nowFormat.slice(11, 16);

      const chatMsg: ChatMessage = {
        id: `msg-disp-resp-${Date.now()}`,
        conversationId: conv.id,
        senderId: currentOwner.id,
        senderName: currentOwner.name,
        senderRole: 'OWNER',
        text: 'أرسلت ردي التفصيلي وأدلتي لإدارة منصة Sola لمراجعة النزاع.',
        type: 'DISPUTE_OWNER_RESPONDED',
        dispute: updatedDispute,
        timestamp: nowFormat.slice(11, 16),
        isRead: true,
      };

      if (!currentChatMessages[conv.id]) {
        currentChatMessages[conv.id] = [];
      }
      currentChatMessages[conv.id].push(chatMsg);
    }

    mockRepository.pushDeduplicatedNotification({
      title: 'تم تسجيل رد المالك على النزاع ⚖️',
      message: `تم رفع ردك والأدلة بنجاح إلى فريق مراجعة جودة Sola للبت فيه.`,
      type: 'DISPUTE_ADMIN_REVIEW',
      isRead: false,
      entityType: 'DISPUTE',
      entityId: disputeId,
      actionRoute: 'disputes',
      deduplicationKey: `disp-resp-${disputeId}`,
    });

    return updatedDispute;
  },

  resolveDisputeByAdmin: async (
    disputeId: string,
    resolutionType: DisputeResolutionType,
    reason: string,
    refundAmount?: number
  ): Promise<Dispute> => {
    await delay(350);

    const index = currentDisputes.findIndex((d) => d.id === disputeId);
    if (index === -1) throw new Error('النزاع غير موجود.');

    const dispute = currentDisputes[index];
    const nowIso = new Date().toISOString();
    const nowFormat = nowIso.slice(0, 16).replace('T', ' ');

    let newStatus: DisputeStatus = 'RESOLVED';
    if (resolutionType === 'DISPUTE_REJECTED') {
      newStatus = 'REJECTED';
    }

    const updatedDispute: Dispute = {
      ...dispute,
      status: newStatus,
      resolutionType,
      resolutionReason: reason,
      resolvedBy: 'Sola Admin (فريق الجودة والسلامة)',
      resolvedAt: nowFormat,
      updatedAt: nowFormat,
    };

    if (dispute.financialHold) {
      dispute.financialHold.status = resolutionType === 'FULL_REFUND' || resolutionType === 'PARTIAL_REFUND' ? 'CONVERTED_TO_REFUND' : 'RELEASED';
      dispute.financialHold.releasedAt = nowFormat;
    }

    if (resolutionType === 'FULL_REFUND') {
      const summary = currentFinancialSummaries[dispute.bookingId];
      if (summary) {
        summary.depositPaymentStatus = 'REFUNDED';
        summary.ownerPayoutStatus = 'OWNER_PAYOUT_FAILED';
        summary.solaCommissionAmount = 0;
        summary.ownerNetDepositAmount = 0;
      }
    }

    currentDisputes[index] = updatedDispute;

    currentDisputeAuditLogs.unshift({
      id: `disp-audit-${Date.now()}`,
      disputeId,
      action: resolutionType === 'DISPUTE_REJECTED' ? 'DISPUTE_REJECTED' : 'DISPUTE_RESOLVED',
      actorId: 'ADMIN_SOLA_SYSTEM',
      actorType: 'ADMIN',
      metadata: { resolutionType, reason, refundAmount },
      createdAt: nowFormat,
    });

    return updatedDispute;
  },

  getDisputeAuditLogs: async (disputeId?: string): Promise<DisputeAuditLog[]> => {
    await delay(150);
    if (disputeId) {
      return currentDisputeAuditLogs.filter((l) => l.disputeId === disputeId);
    }
    return [...currentDisputeAuditLogs];
  },

  isWithinSelfModificationWindow: (confirmedAt?: string): boolean => {
    if (!confirmedAt) return false;
    const confirmedTime = new Date(confirmedAt).getTime();
    const nowTime = Date.now();
    const sixtyMinutesMs = 60 * 60 * 1000;
    return nowTime - confirmedTime <= sixtyMinutesMs;
  },

  getModificationRequests: async (): Promise<BookingModificationRequest[]> => {
    await delay(150);
    return [...currentModificationRequests];
  },

  getPendingModificationRequests: async (): Promise<BookingModificationRequest[]> => {
    await delay(150);
    return currentModificationRequests.filter((r) => r.status === 'PENDING_OWNER_REVIEW');
  },

  createModificationRequest: async (params: {
    bookingId: string;
    requestedCheckIn: string;
    requestedCheckOut: string;
    reason?: string;
  }): Promise<BookingModificationRequest> => {
    await delay(300);

    const bookingIndex = currentBookings.findIndex((b) => b.id === params.bookingId);
    if (bookingIndex === -1) throw new Error('الحجز غير موجود');

    const booking = currentBookings[bookingIndex];

    if (booking.hasCancellationRequest) {
      throw new Error('يوجد طلب إلغاء قيد المراجعة لهذا الحجز. يرجى البت فيه أولاً.');
    }

    if (booking.hasDispute) {
      throw new Error('يوجد نزاع نشط مفتوح بشأن هذا الحجز. يرجى الانتظار لحين حسم النزاع إدارياً.');
    }

    const activeExisting = currentModificationRequests.find(
      (r) => r.bookingId === params.bookingId && r.status === 'PENDING_OWNER_REVIEW'
    );
    if (activeExisting) {
      throw new Error('يوجد بالفعل طلب تعديل قيد المراجعة لهذا الحجز.');
    }

    const prop = currentProperties.find((p) => p.id === booking.propertyId);
    const pricePerNight = prop ? prop.pricePerNight : 5000;

    const requestedNights = getOccupiedNights(params.requestedCheckIn, params.requestedCheckOut).length;
    const requestedTotalPrice = requestedNights * pricePerNight;
    const priceDifference = requestedTotalPrice - booking.totalPrice;

    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const newRequest: BookingModificationRequest = {
      id: `mod-req-${Date.now()}`,
      bookingId: booking.id,
      propertyId: booking.propertyId,
      renterId: booking.renter.id,
      ownerId: currentOwner.id,

      originalCheckIn: booking.checkIn,
      originalCheckOut: booking.checkOut,
      originalNights: booking.nights,

      requestedCheckIn: params.requestedCheckIn,
      requestedCheckOut: params.requestedCheckOut,
      requestedNights,

      originalTotalPrice: booking.totalPrice,
      requestedTotalPrice,
      priceDifference,

      paymentRequired: priceDifference > 0,
      amountDue: priceDifference > 0 ? priceDifference : 0,
      refundRequired: priceDifference < 0,
      refundAmount: priceDifference < 0 ? Math.abs(priceDifference) : 0,

      status: 'PENDING_OWNER_REVIEW',
      createdAt: now,
      updatedAt: now,
    };

    currentModificationRequests.unshift(newRequest);

    currentBookings[bookingIndex] = {
      ...booking,
      hasModificationRequest: true,
      activeModificationRequestId: newRequest.id,
    };

    let conv = currentConversations.find((c) => c.bookingId === booking.id);
    if (!conv) {
      conv = {
        id: `conv-${booking.id}`,
        bookingId: booking.id,
        propertyId: booking.propertyId,
        propertyTitle: booking.propertyTitle,
        propertyImage: booking.propertyImage,
        renter: booking.renter,
        lastMessage: 'أرسل طلب تعديل تواريخ الإقامة',
        lastMessageTimestamp: now.slice(11, 16),
        unreadCount: 1,
      };
      currentConversations.unshift(conv);
    } else {
      conv.lastMessage = 'أرسل طلب تعديل تواريخ الإقامة';
      conv.lastMessageTimestamp = now.slice(11, 16);
      conv.unreadCount += 1;
    }

    const chatMsg: ChatMessage = {
      id: `msg-mod-${Date.now()}`,
      conversationId: conv.id,
      senderId: booking.renter.id,
      senderName: booking.renter.name,
      senderRole: 'RENTER',
      text: params.reason || 'أرسل طلب تعديل تواريخ الإقامة',
      type: 'BOOKING_MODIFICATION_REQUEST',
      modificationRequest: newRequest,
      timestamp: now.slice(11, 16),
      isRead: false,
    };

    newRequest.chatMessageId = chatMsg.id;

    if (!currentChatMessages[conv.id]) {
      currentChatMessages[conv.id] = [];
    }
    currentChatMessages[conv.id].push(chatMsg);

    mockRepository.pushDeduplicatedNotification({
      title: 'طلب تعديل حجز جديد 🔄',
      message: `أرسل ${booking.renter.name} طلب تعديل تواريخ الإقامة لشاليه ${booking.propertyTitle}.`,
      type: 'BOOKING_MODIFICATION_REQUEST_RECEIVED',
      isRead: false,
      entityType: 'MODIFICATION',
      entityId: newRequest.id,
      actionRoute: 'messages',
      deduplicationKey: `mod-notif-${newRequest.id}`,
    });

    return newRequest;
  },

  approveModificationRequest: async (requestId: string): Promise<BookingModificationRequest> => {
    await delay(350);

    const reqIndex = currentModificationRequests.findIndex((r) => r.id === requestId);
    if (reqIndex === -1) throw new Error('طلب التعديل غير موجود');

    const req = currentModificationRequests[reqIndex];
    if (req.status !== 'PENDING_OWNER_REVIEW') {
      throw new Error('لم يعد طلب التعديل قيد المراجعة.');
    }

    const bookingIndex = currentBookings.findIndex((b) => b.id === req.bookingId);
    if (bookingIndex === -1) throw new Error('الحجز الأصلي غير موجود');

    const booking = currentBookings[bookingIndex];

    const oldOccupiedNights = getOccupiedNights(req.originalCheckIn, req.originalCheckOut);
    const newOccupiedNights = getOccupiedNights(req.requestedCheckIn, req.requestedCheckOut);

    const conflictingDates = newOccupiedNights.filter((d) => {
      if (oldOccupiedNights.includes(d)) return false;

      const record = currentAvailability.find(
        (a) => a.propertyId === req.propertyId && a.date === d
      );
      return record && record.status === 'BOOKED';
    });

    if (conflictingDates.length > 0) {
      currentModificationRequests[reqIndex] = {
        ...req,
        status: 'FAILED_AVAILABILITY',
        updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      };

      currentBookings[bookingIndex] = {
        ...booking,
        hasModificationRequest: false,
        activeModificationRequestId: undefined,
      };

      mockRepository.pushDeduplicatedNotification({
        title: 'تعذر تعديل الحجز لعدم التوفر ⚠️',
        message: `تعذر قبول التعديل للحجز بسبب شغل بعض الأيام المطلوبة (${conflictingDates.join('، ')}).`,
        type: 'BOOKING_MODIFICATION_FAILED_AVAILABILITY',
        isRead: false,
        entityType: 'MODIFICATION',
        entityId: req.id,
        actionRoute: 'bookings',
        deduplicationKey: `mod-fail-${req.id}`,
      });

      throw new Error(`لم تعد الفترة المطلوبة متاحة بسبب وجود تعارض في الأيام: (${conflictingDates.join(' ، ')})`);
    }

    const nowIso = new Date().toISOString();
    const nowFormat = nowIso.slice(0, 16).replace('T', ' ');

    for (const oldNight of oldOccupiedNights) {
      if (!newOccupiedNights.includes(oldNight)) {
        const avIdx = currentAvailability.findIndex(
          (a) => a.propertyId === req.propertyId && a.date === oldNight
        );
        if (avIdx >= 0) {
          currentAvailability[avIdx] = {
            ...currentAvailability[avIdx],
            status: 'AVAILABLE',
            notes: undefined,
            updatedAt: nowFormat.slice(0, 10),
          };
        }
      }
    }

    for (const newNight of newOccupiedNights) {
      const avIdx = currentAvailability.findIndex(
        (a) => a.propertyId === req.propertyId && a.date === newNight
      );
      if (avIdx >= 0) {
        currentAvailability[avIdx] = {
          ...currentAvailability[avIdx],
          status: 'BOOKED',
          notes: `حجز معدل - ${booking.renter.name}`,
          updatedAt: nowFormat.slice(0, 10),
        };
      } else {
        currentAvailability.push({
          id: `av-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          propertyId: req.propertyId,
          date: newNight,
          status: 'BOOKED',
          notes: `حجز معدل - ${booking.renter.name}`,
          updatedAt: nowFormat.slice(0, 10),
        });
      }
    }

    const oldSummary = mockRepository.getOrCreateFinancialSummary(booking);
    const prop = currentProperties.find((p) => p.id === booking.propertyId);
    const firstNightPrice = prop ? prop.pricePerNight : req.requestedTotalPrice / req.requestedNights;

    const newSummary = createFinancialSummary({
      bookingId: booking.id,
      totalBookingValue: req.requestedTotalPrice,
      firstNightPrice,
      depositPaymentStatus: oldSummary.depositPaymentStatus,
      remainingBalancePaymentMethod: oldSummary.remainingBalancePaymentMethod,
    });

    currentFinancialSummaries[booking.id] = newSummary;

    const adjType =
      req.priceDifference > 0
        ? 'ADDITIONAL_PAYMENT_REQUIRED'
        : req.priceDifference < 0
        ? 'REFUND_REQUIRED'
        : 'NO_CHANGE';

    currentFinancialAdjustments.unshift({
      id: `adj-${Date.now()}`,
      bookingId: booking.id,
      modificationRequestId: req.id,
      previousDeposit: oldSummary.depositAmount,
      newDeposit: newSummary.depositAmount,
      previousTotal: oldSummary.totalBookingValue,
      newTotal: newSummary.totalBookingValue,
      difference: req.priceDifference,
      adjustmentType: adjType,
      paymentStatus: 'PENDING_PAYMENT_ENGINE',
      createdAt: nowFormat,
    });

    currentBookings[bookingIndex] = {
      ...booking,
      checkIn: req.requestedCheckIn,
      checkOut: req.requestedCheckOut,
      nights: req.requestedNights,
      totalPrice: req.requestedTotalPrice,
      hasModificationRequest: false,
      activeModificationRequestId: undefined,
      financialSummary: newSummary,
      updatedAt: nowFormat,
    };

    const approvedReq: BookingModificationRequest = {
      ...req,
      status: 'APPROVED',
      approvedAt: nowFormat,
      updatedAt: nowFormat,
    };
    currentModificationRequests[reqIndex] = approvedReq;

    currentModificationHistory.unshift({
      id: `hist-${Date.now()}`,
      bookingId: booking.id,
      oldCheckIn: req.originalCheckIn,
      oldCheckOut: req.originalCheckOut,
      newCheckIn: req.requestedCheckIn,
      newCheckOut: req.requestedCheckOut,
      requestedBy: req.renterId,
      approvedBy: req.ownerId,
      status: 'APPROVED',
      createdAt: nowFormat,
    });

    mockRepository.pushDeduplicatedNotification({
      title: 'تمت الموافقة على تعديل الحجز 🟢',
      message: `تم اعتماد تواريخ الإقامة الجديدة وتعديل التقويم بنجاح.`,
      type: 'BOOKING_MODIFICATION_APPROVED',
      isRead: false,
      entityType: 'MODIFICATION',
      entityId: req.id,
      actionRoute: 'bookings',
      deduplicationKey: `mod-app-${req.id}`,
    });

    return approvedReq;
  },

  rejectModificationRequest: async (
    requestId: string,
    rejectionReason?: string
  ): Promise<BookingModificationRequest> => {
    await delay(300);

    const reqIndex = currentModificationRequests.findIndex((r) => r.id === requestId);
    if (reqIndex === -1) throw new Error('طلب التعديل غير موجود');

    const req = currentModificationRequests[reqIndex];
    if (req.status !== 'PENDING_OWNER_REVIEW') {
      throw new Error('لم يعد طلب التعديل قيد المراجعة.');
    }

    const bookingIndex = currentBookings.findIndex((b) => b.id === req.bookingId);
    if (bookingIndex === -1) throw new Error('الحجز الأصلي غير موجود');

    const booking = currentBookings[bookingIndex];
    const nowFormat = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const rejectedReq: BookingModificationRequest = {
      ...req,
      status: 'REJECTED',
      rejectionReason,
      rejectedAt: nowFormat,
      updatedAt: nowFormat,
    };

    currentModificationRequests[reqIndex] = rejectedReq;

    currentBookings[bookingIndex] = {
      ...booking,
      hasModificationRequest: false,
      activeModificationRequestId: undefined,
      updatedAt: nowFormat,
    };

    mockRepository.pushDeduplicatedNotification({
      title: 'تم رفض طلب تعديل الحجز 🔴',
      message: `تم رفض التعديل والإبقاء على تواريخ الحجز الأصلية.`,
      type: 'BOOKING_MODIFICATION_REJECTED',
      isRead: false,
      entityType: 'MODIFICATION',
      entityId: req.id,
      actionRoute: 'bookings',
      deduplicationKey: `mod-rej-${req.id}`,
    });

    return rejectedReq;
  },

  getCancellationRequests: async (): Promise<BookingCancellationRequest[]> => {
    await delay(150);
    return [...currentCancellationRequests];
  },

  getPendingCancellationRequests: async (): Promise<BookingCancellationRequest[]> => {
    await delay(150);
    return currentCancellationRequests.filter((r) => r.status === 'PENDING_REVIEW');
  },

  getCancellationRequestById: async (id: string): Promise<BookingCancellationRequest | null> => {
    await delay(150);
    const found = currentCancellationRequests.find((r) => r.id === id);
    return found ? { ...found } : null;
  },

  createCancellationRequest: async (params: {
    bookingId: string;
    requestedBy: 'RENTER' | 'OWNER';
    reason?: string;
  }): Promise<BookingCancellationRequest> => {
    await delay(300);

    const bookingIndex = currentBookings.findIndex((b) => b.id === params.bookingId);
    if (bookingIndex === -1) throw new Error('الحجز غير موجود');

    const booking = currentBookings[bookingIndex];

    if (booking.status === 'CANCELLED') throw new Error('هذا الحجز ملغى بالفعل.');
    if (booking.status === 'EXPIRED') throw new Error('هذا الطلب منتهي الصلاحية ولا يمكن إلغاؤه.');
    if (booking.status === 'REJECTED') throw new Error('هذا الطلب مرفوض بالفعل.');

    if (booking.hasModificationRequest) {
      throw new Error('يوجد طلب تعديل قيد المراجعة لهذا الحجز. يرجى الترفيع أو البت في التعديل أولاً.');
    }

    if (booking.hasDispute) {
      throw new Error('يوجد نزاع نشط مفتوح بشأن هذا الحجز. يرجى الانتظار لحين حسم النزاع إدارياً.');
    }

    const activeExisting = currentCancellationRequests.find(
      (r) => r.bookingId === params.bookingId && r.status === 'PENDING_REVIEW'
    );
    if (activeExisting) {
      throw new Error('يوجد بالفعل طلب إلغاء قيد المراجعة لهذا الحجز.');
    }

    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const newRequest: BookingCancellationRequest = {
      id: `canc-req-${Date.now()}`,
      bookingId: booking.id,
      propertyId: booking.propertyId,
      renterId: booking.renter.id,
      ownerId: currentOwner.id,
      requestedBy: params.requestedBy,
      reason: params.reason,
      status: 'PENDING_REVIEW',
      createdAt: now,
      updatedAt: now,
      financialImpact: 'POSSIBLE_REFUND',
      refundRequired: true,
      refundAmount: booking.totalPrice,
      refundStatus: 'PENDING_PAYMENT_ENGINE',
    };

    currentCancellationRequests.unshift(newRequest);

    currentBookings[bookingIndex] = {
      ...booking,
      status: 'CANCELLATION_REQUESTED',
      hasCancellationRequest: true,
      activeCancellationRequestId: newRequest.id,
    };

    let conv = currentConversations.find((c) => c.bookingId === booking.id);
    if (!conv) {
      conv = {
        id: `conv-${booking.id}`,
        bookingId: booking.id,
        propertyId: booking.propertyId,
        propertyTitle: booking.propertyTitle,
        propertyImage: booking.propertyImage,
        renter: booking.renter,
        lastMessage: 'أرسل طلب إلغاء الحجز',
        lastMessageTimestamp: now.slice(11, 16),
        unreadCount: 1,
      };
      currentConversations.unshift(conv);
    } else {
      conv.lastMessage = 'أرسل طلب إلغاء الحجز';
      conv.lastMessageTimestamp = now.slice(11, 16);
      conv.unreadCount += 1;
    }

    const chatMsg: ChatMessage = {
      id: `msg-canc-${Date.now()}`,
      conversationId: conv.id,
      senderId: params.requestedBy === 'RENTER' ? booking.renter.id : currentOwner.id,
      senderName: params.requestedBy === 'RENTER' ? booking.renter.name : currentOwner.name,
      senderRole: params.requestedBy === 'RENTER' ? 'RENTER' : 'OWNER',
      text: params.reason || 'أرسل طلب إلغاء الحجز',
      type: 'BOOKING_CANCELLATION_REQUEST',
      cancellationRequest: newRequest,
      timestamp: now.slice(11, 16),
      isRead: false,
    };

    if (!currentChatMessages[conv.id]) {
      currentChatMessages[conv.id] = [];
    }
    currentChatMessages[conv.id].push(chatMsg);

    mockRepository.pushDeduplicatedNotification({
      title: 'طلب إلغاء حجز جديد ⚠️',
      message: `أرسل ${params.requestedBy === 'RENTER' ? `المستأجر ${booking.renter.name}` : 'المالك'} طلب إلغاء حجز ${booking.propertyTitle}.`,
      type: 'CANCELLATION_REQUEST_RECEIVED',
      isRead: false,
      entityType: 'CANCELLATION',
      entityId: newRequest.id,
      actionRoute: 'messages',
      deduplicationKey: `canc-req-notif-${newRequest.id}`,
    });

    return newRequest;
  },

  approveCancellationRequest: async (requestId: string): Promise<BookingCancellationRequest> => {
    await delay(350);

    const reqIndex = currentCancellationRequests.findIndex((r) => r.id === requestId);
    if (reqIndex === -1) throw new Error('طلب الإلغاء غير موجود');

    const req = currentCancellationRequests[reqIndex];
    if (req.status !== 'PENDING_REVIEW') {
      throw new Error('لم يعد طلب الإلغاء قيد المراجعة.');
    }

    const bookingIndex = currentBookings.findIndex((b) => b.id === req.bookingId);
    if (bookingIndex === -1) throw new Error('الحجز الأصلي غير موجود');

    const booking = currentBookings[bookingIndex];
    const previousStatus = booking.status;

    const nowIso = new Date().toISOString();
    const nowFormat = nowIso.slice(0, 16).replace('T', ' ');

    const currentOccupiedNights = getOccupiedNights(booking.checkIn, booking.checkOut);

    for (const nightDate of currentOccupiedNights) {
      const avIndex = currentAvailability.findIndex(
        (a) => a.propertyId === booking.propertyId && a.date === nightDate
      );
      if (avIndex >= 0) {
        currentAvailability[avIndex] = {
          ...currentAvailability[avIndex],
          status: 'AVAILABLE',
          notes: undefined,
          updatedAt: nowFormat.slice(0, 10),
        };
      }
    }

    currentBookings[bookingIndex] = {
      ...booking,
      status: 'CANCELLED',
      hasCancellationRequest: false,
      activeCancellationRequestId: undefined,
      updatedAt: nowFormat,
    };

    if (currentFinancialSummaries[booking.id]) {
      currentFinancialSummaries[booking.id].depositPaymentStatus = 'REFUND_PENDING';
      currentFinancialSummaries[booking.id].remainingBalanceStatus = 'CANCELLED';
    }

    const approvedReq: BookingCancellationRequest = {
      ...req,
      status: 'APPROVED',
      resolvedAt: nowFormat,
      resolvedBy: currentOwner.id,
      updatedAt: nowFormat,
    };
    currentCancellationRequests[reqIndex] = approvedReq;

    currentCancellationHistory.unshift({
      id: `canc-hist-${Date.now()}`,
      bookingId: booking.id,
      cancellationRequestId: req.id,
      requestedBy: req.requestedBy,
      resolvedBy: currentOwner.id,
      previousBookingStatus: previousStatus,
      newBookingStatus: 'CANCELLED',
      reason: req.reason,
      createdAt: req.createdAt,
      resolvedAt: nowFormat,
    });

    mockRepository.pushDeduplicatedNotification({
      title: 'تم إقرار إلغاء الحجز وتفريغ الأيام 🚫',
      message: `تم إلغاء الحجز رسمياً وتفريغ التواريخ على التقويم.`,
      type: 'CANCELLATION_APPROVED',
      isRead: false,
      entityType: 'CANCELLATION',
      entityId: req.id,
      actionRoute: 'bookings',
      deduplicationKey: `canc-app-${req.id}`,
    });

    return approvedReq;
  },

  rejectCancellationRequest: async (
    requestId: string,
    rejectionReason?: string
  ): Promise<BookingCancellationRequest> => {
    await delay(300);

    const reqIndex = currentCancellationRequests.findIndex((r) => r.id === requestId);
    if (reqIndex === -1) throw new Error('طلب الإلغاء غير موجود');

    const req = currentCancellationRequests[reqIndex];
    if (req.status !== 'PENDING_REVIEW') {
      throw new Error('لم يعد طلب الإلغاء قيد المراجعة.');
    }

    const bookingIndex = currentBookings.findIndex((b) => b.id === req.bookingId);
    if (bookingIndex === -1) throw new Error('الحجز الأصلي غير موجود');

    const booking = currentBookings[bookingIndex];
    const nowFormat = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const rejectedReq: BookingCancellationRequest = {
      ...req,
      status: 'REJECTED',
      rejectionReason,
      resolvedAt: nowFormat,
      resolvedBy: currentOwner.id,
      updatedAt: nowFormat,
    };

    currentCancellationRequests[reqIndex] = rejectedReq;

    currentBookings[bookingIndex] = {
      ...booking,
      status: 'CONFIRMED',
      hasCancellationRequest: false,
      activeCancellationRequestId: undefined,
      updatedAt: nowFormat,
    };

    mockRepository.pushDeduplicatedNotification({
      title: 'تم رفض طلب إلغاء الحجز 🟢',
      message: `تم رفض الإلغاء وتأكيد استمرار الإقامة على التقويم.`,
      type: 'CANCELLATION_REJECTED',
      isRead: false,
      entityType: 'CANCELLATION',
      entityId: req.id,
      actionRoute: 'bookings',
      deduplicationKey: `canc-rej-${req.id}`,
    });

    return rejectedReq;
  },

  getCancellationContext: async (bookingId: string): Promise<CancellationContext> => {
    await delay(100);
    const booking = currentBookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error('الحجز غير موجود');

    const now = new Date();
    const checkInDate = new Date(booking.checkIn);
    const diffMs = checkInDate.getTime() - now.getTime();
    const hoursUntilCheckIn = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
    const daysUntilCheckIn = Math.max(0, Math.floor(hoursUntilCheckIn / 24));

    return {
      bookingId: booking.id,
      bookingStatus: booking.status,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      currentTime: now.toISOString(),
      hoursUntilCheckIn,
      daysUntilCheckIn,
    };
  },

  getChatConversations: async (): Promise<ChatConversation[]> => {
    await delay(150);
    return [...currentConversations];
  },

  getChatMessages: async (conversationId: string): Promise<ChatMessage[]> => {
    await delay(150);
    return currentChatMessages[conversationId] || [];
  },

  sendChatMessage: async (
    conversationId: string,
    text: string,
    type: ChatMessageType = 'TEXT'
  ): Promise<ChatMessage> => {
    await delay(200);
    const nowFormat = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: currentOwner.id,
      senderName: currentOwner.name,
      senderRole: 'OWNER',
      text,
      type,
      timestamp: nowFormat.slice(11, 16),
      isRead: true,
    };

    if (!currentChatMessages[conversationId]) {
      currentChatMessages[conversationId] = [];
    }
    currentChatMessages[conversationId].push(newMsg);

    const convIndex = currentConversations.findIndex((c) => c.id === conversationId);
    if (convIndex >= 0) {
      currentConversations[convIndex].lastMessage = text;
      currentConversations[convIndex].lastMessageTimestamp = nowFormat.slice(11, 16);
    }

    return newMsg;
  },

  getNotifications: async (): Promise<NotificationItem[]> => {
    await delay();
    return [...currentNotifications];
  },

  markNotificationAsRead: async (id: string): Promise<void> => {
    await delay(100);
    currentNotifications = currentNotifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
  },

  markAllNotificationsAsRead: async (): Promise<void> => {
    await delay(150);
    currentNotifications = currentNotifications.map((n) => ({ ...n, isRead: true }));
  },

  getDashboardMetrics: async (isEmptyState: boolean = false): Promise<DashboardMetrics> => {
    await delay();
    await mockRepository.expirePendingBookingsIfNeeded();

    if (isEmptyState) {
      return {
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
      };
    }

    const today = new Date().toISOString().slice(0, 10);

    const confirmedBookings = currentBookings.filter(
      (b) => (b.status === 'CONFIRMED' || b.status === 'CANCELLATION_REQUESTED') && b.checkOut >= today
    );

    let totalConfirmedDepositsOwnerNet = 0;
    let totalExpectedBalanceOnArrival = 0;
    let totalPendingDepositsCount = 0;

    for (const b of confirmedBookings) {
      const summary = mockRepository.getOrCreateFinancialSummary(b);
      if (summary.depositPaymentStatus === 'PAID') {
        totalConfirmedDepositsOwnerNet += summary.ownerNetDepositAmount;
        totalExpectedBalanceOnArrival += summary.remainingBalance;
      } else {
        totalPendingDepositsCount += 1;
      }
    }

    const openDisputesCount = currentDisputes.filter(
      (d) => d.status !== 'RESOLVED' && d.status !== 'REJECTED' && d.status !== 'CANCELLED'
    ).length;

    const pendingOwnerResponseDisputesCount = currentDisputes.filter(
      (d) => d.status === 'OPENED' || d.status === 'UNDER_OWNER_RESPONSE' || d.status === 'WAITING_FOR_MORE_EVIDENCE'
    ).length;

    const unreadNotificationsCount = currentNotifications.filter((n) => !n.isRead).length;

    const activeProps = currentProperties.filter((p) => p.status !== 'ARCHIVED');

    return {
      newBookingRequestsCount: currentBookings.filter(
        (b) => b.status === 'PENDING_OWNER_APPROVAL'
      ).length,
      pendingModificationRequestsCount: currentModificationRequests.filter(
        (r) => r.status === 'PENDING_OWNER_REVIEW'
      ).length,
      pendingCancellationRequestsCount: currentCancellationRequests.filter(
        (r) => r.status === 'PENDING_REVIEW'
      ).length,
      openDisputesCount,
      pendingOwnerResponseDisputesCount,
      unreadMessagesCount: currentConversations.reduce((acc, c) => acc + c.unreadCount, 0),
      upcomingBookingsCount: confirmedBookings.length,
      underReviewPropertiesCount: activeProps.filter(
        (p) => p.status === 'PENDING_REVIEW'
      ).length,
      unreadNotificationsCount,

      totalPropertiesCount: activeProps.length,
      publishedPropertiesCount: activeProps.filter((p) => p.status === 'PUBLISHED').length,
      draftPropertiesCount: activeProps.filter((p) => p.status === 'DRAFT').length,
      pausedPropertiesCount: activeProps.filter((p) => p.status === 'PAUSED').length,

      totalConfirmedDepositsOwnerNet,
      totalExpectedBalanceOnArrival,
      totalPendingDepositsCount,
    };
  },

  resetData: () => {
    currentOwner = { ...MOCK_OWNER };
    currentProperties = [...MOCK_PROPERTIES];
    currentBookings = [...MOCK_BOOKINGS];
    currentNotifications = [...MOCK_NOTIFICATIONS];
    currentAvailability = [...MOCK_AVAILABILITY_RECORDS];
    currentModificationRequests = [...MOCK_MODIFICATION_REQUESTS];
    currentModificationHistory = [...MOCK_MODIFICATION_HISTORY];
    currentCancellationRequests = [...MOCK_CANCELLATION_REQUESTS];
    currentCancellationHistory = [...MOCK_CANCELLATION_HISTORY];
    currentFinancialSummaries = { ...MOCK_FINANCIAL_SUMMARIES };
    currentFinancialTransactions = [...MOCK_FINANCIAL_TRANSACTIONS];
    currentFinancialAdjustments = [...MOCK_FINANCIAL_ADJUSTMENTS];
    currentFinancialAuditLogs = [...MOCK_FINANCIAL_AUDIT_LOGS];
    currentDisputes = [...MOCK_DISPUTES];
    currentDisputeAuditLogs = [...MOCK_DISPUTE_AUDIT_LOGS];
    currentPropertyAuditLogs = [...MOCK_PROPERTY_AUDIT_LOGS];
    currentConversations = [...MOCK_CONVERSATIONS];
    currentChatMessages = { ...MOCK_CHAT_MESSAGES };
    currentPayoutMethods = [...MOCK_PAYOUT_METHODS];
    currentOwnerWallet = { ...MOCK_OWNER_WALLET };
    currentWalletLedger = [...MOCK_WALLET_LEDGER];
    currentPayoutRequests = [...MOCK_PAYOUT_REQUESTS];
  },
};

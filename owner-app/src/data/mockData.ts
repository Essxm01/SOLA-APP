import type {
  Owner,
  Property,
  Booking,
  NotificationItem,
  AvailabilityRecord,
  BookingModificationRequest,
  BookingModificationHistory,
  BookingCancellationRequest,
  BookingCancellationHistory,
  BookingFinancialSummary,
  FinancialTransaction,
  FinancialAdjustment,
  FinancialAuditLog,
  DepositPaymentStatus,
  Dispute,
  DisputeAuditLog,
  PropertyAuditLog,
  BookingPropertySnapshot,
  ChatConversation,
  ChatMessage,
  OwnerPayoutMethod,
  OwnerWallet,
  WalletLedgerEntry,
  PayoutRequest,
} from '../types';
import { PENDING_BOOKING_EXPIRATION_HOURS, SOLA_COMMISSION_RATE } from '../constants/theme';

export const MOCK_OWNER: Owner = {
  id: 'owner-egypt-001',
  name: 'أحمد الفاروق',
  phone: '+20 100 123 4567',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  verificationStatus: 'VERIFIED',
  verificationBadgeText: 'مالك موثق رسمياً برقم القومي',
  createdAt: '2025-01-15',
};

export const MOCK_PAYOUT_METHODS: OwnerPayoutMethod[] = [
  {
    id: 'pm-instapay-01',
    ownerId: 'owner-egypt-001',
    type: 'INSTAPAY',
    accountTitle: 'أحمد الفاروق إبراهيم',
    accountNumberOrIban: 'ahmed.elfarouk@instapay',
    isDefault: true,
    createdAt: '2025-01-20',
  },
  {
    id: 'pm-bank-01',
    ownerId: 'owner-egypt-001',
    type: 'BANK_TRANSFER',
    accountTitle: 'أحمد الفاروق إبراهيم - البنك الأهلي المصري',
    accountNumberOrIban: 'EG380002000100000001234567890',
    bankName: 'البنك الأهلي المصري',
    isDefault: false,
    createdAt: '2025-02-05',
  },
  {
    id: 'pm-voda-01',
    ownerId: 'owner-egypt-001',
    type: 'VODAFONE_CASH',
    accountTitle: 'أحمد الفاروق',
    accountNumberOrIban: '01001234567',
    isDefault: false,
    createdAt: '2025-02-10',
  },
];

export const MOCK_OWNER_WALLET: OwnerWallet = {
  ownerId: 'owner-egypt-001',
  currency: 'ج.م',
  availableBalance: 13600,     // 6800 + 6800 (from confirmed bookings past checkin)
  pendingBalance: 6800,        // 6800 from upcoming deposit
  reservedForPayout: 2500,     // 2500 held in pending payout request
  heldBalance: 13200,          // 13200 held due to open dispute on bk-2026-002
  totalEarnedLifeTime: 42900,
  totalWithdrawnLifeTime: 12000,
  updatedAt: '2026-08-14 20:00',
};

export const MOCK_WALLET_LEDGER: WalletLedgerEntry[] = [
  {
    id: 'w-ledger-001',
    ownerId: 'owner-egypt-001',
    bookingId: 'bk-2026-006',
    type: 'DEPOSIT_CREDIT',
    amount: 6800,
    fee: 0,
    netAmount: 6800,
    currency: 'ج.م',
    previousBalance: 6800,
    newBalance: 13600,
    description: 'تحويل صافي عربون حجز مراسي (bk-2026-006) للرصيد المتاح بعد مرور 24 ساعة من التسكين',
    idempotencyKey: 'idemp-dep-bk-2026-006',
    createdAt: '2026-08-14 18:45',
  },
  {
    id: 'w-ledger-002',
    ownerId: 'owner-egypt-001',
    payoutRequestId: 'pay-req-101',
    type: 'PAYOUT_RESERVATION',
    amount: 2500,
    fee: 25,
    netAmount: 2475,
    currency: 'ج.م',
    previousBalance: 16100,
    newBalance: 13600,
    description: 'حجز مبلغ لطلب سحب أرباح قيد المراجعة عبر InstaPay',
    idempotencyKey: 'idemp-pay-req-101',
    createdAt: '2026-08-14 19:30',
  },
];

export const MOCK_PAYOUT_REQUESTS: PayoutRequest[] = [
  {
    id: 'pay-req-101',
    ownerId: 'owner-egypt-001',
    amount: 2500,
    fee: 25,
    netAmount: 2475,
    currency: 'ج.م',
    payoutMethod: MOCK_PAYOUT_METHODS[0],
    status: 'PENDING',
    requestedAt: '2026-08-14 19:30',
    notes: 'طلب سحب أرباح لشراء مستلزمات الشاليه',
  },
  {
    id: 'pay-req-100',
    ownerId: 'owner-egypt-001',
    amount: 12000,
    fee: 30,
    netAmount: 11970,
    currency: 'ج.م',
    payoutMethod: MOCK_PAYOUT_METHODS[1],
    status: 'COMPLETED',
    requestedAt: '2026-07-28 10:00',
    processedAt: '2026-07-28 14:15',
    providerTransactionId: 'BANK-TX-99882211',
  },
];

export const MOCK_PROPERTIES: Property[] = [
  {
    id: 'prop-marassi-101',
    ownerId: 'owner-egypt-001',
    title: 'شالية فاخر مطل على البحر مباشرة - مراسي مراسينا',
    unitType: 'شاليه',
    propertyType: 'CHALET',
    description: 'شالية صف أول على البحر في قرية مراسي الساحل الشمالي، تشطيب هاي لوكس، مكيف بالكامل مع حديقة خاصة وتراس بانورامي.',
    region: 'الساحل الشمالي',
    locationName: 'مراسي، الساحل الشمالي',
    resortName: 'مراسي - مراسينا',
    address: 'المنطقة الساحلية - الكيلو 125 طريق الإسكندرية مطروح',
    location: {
      governorate: 'مطروح',
      city: 'العلمين',
      district: 'سيدي عبد الرحمن',
      resortName: 'مراسي - مراسينا',
      unitNumber: 'Chalet 14B',
      address: 'المنطقة الساحلية - الكيلو 125 طريق الإسكندرية مطروح',
      lat: 30.9167,
      lng: 28.9500,
    },
    capacity: {
      baseGuests: 4,
      maxGuests: 6,
      bedrooms: 3,
      beds: 4,
      bathrooms: 2,
      floors: 1,
      areaSqM: 185,
    },
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    ],
    propertyImages: [
      { id: 'img-1', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80', isMain: true, order: 0, uploadedAt: '2025-02-01' },
      { id: 'img-2', url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80', isMain: false, order: 1, uploadedAt: '2025-02-01' },
    ],
    mainImageIndex: 0,
    pricePerNight: 8500,
    currency: 'ج.م',
    pricing: {
      basePricePerNight: 8500,
      currency: 'ج.م',
      dailyPricingMap: {
        '2026-08-20': 8500,
        '2026-08-21': 8500,
        '2026-08-22': 9500,
        '2026-08-23': 9500,
        '2026-08-24': 8500,
      },
    },
    rating: 4.9,
    reviewsCount: 28,
    bedrooms: 3,
    bathrooms: 2,
    maxGuests: 6,
    areaSqM: 185,
    bedsCount: 4,
    amenities: ['pool', 'sea_view', 'central_ac', 'wifi', 'kitchen', 'garage', 'bbq', 'private_beach'],
    houseRules: {
      minStay: 2,
      maxStay: 30,
      smokingAllowed: false,
      partiesAllowed: false,
      petsAllowed: false,
      childrenAllowed: true,
      checkInTime: '14:00',
      checkOutTime: '12:00',
      additionalRules: 'يرجى الالتزام بالهدوء بعد الساعة 12 منتصف الليل والالتزام بتتعليمات أمناء قرية مراسي.',
    },
    status: 'PUBLISHED',
    verificationStatus: 'VERIFIED',
    createdAt: '2025-02-01',
    updatedAt: '2026-08-01',
    publishedAt: '2025-02-03',
  },
  {
    id: 'prop-hacienda-102',
    ownerId: 'owner-egypt-001',
    title: 'فيلا مودرن بحمام سباحة خاص - هاسيندا باي',
    unitType: 'فيلا',
    propertyType: 'VILLA',
    description: 'فيلا مستقلة فاخرة مع حمام سباحة خاص مغطى بالكامل، مساحات واسعة تتسع للعائلات الكبيرة، جراج خاص يتسع لسيارتين.',
    region: 'الساحل الشمالي',
    locationName: 'هاسيندا باي، الكيلو 124 الساحل الشمالي',
    resortName: 'هاسيندا باي',
    address: 'الفيلا رقم 42 - المنطقة الأولى',
    location: {
      governorate: 'مطروح',
      city: 'العلمين',
      district: 'هاسيندا',
      resortName: 'هاسيندا باي',
      unitNumber: 'Villa 42',
      address: 'الفيلا رقم 42 - المنطقة الأولى',
      lat: 30.9200,
      lng: 28.9300,
    },
    capacity: {
      baseGuests: 8,
      maxGuests: 10,
      bedrooms: 5,
      beds: 7,
      bathrooms: 4,
      floors: 2,
      areaSqM: 420,
    },
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    ],
    mainImageIndex: 0,
    pricePerNight: 16500,
    currency: 'ج.م',
    pricing: {
      basePricePerNight: 16500,
      currency: 'ج.م',
      dailyPricingMap: {
        '2026-08-28': 16500,
        '2026-08-29': 17500,
        '2026-08-30': 17500,
      },
    },
    rating: 4.95,
    reviewsCount: 14,
    bedrooms: 5,
    bathrooms: 4,
    maxGuests: 10,
    areaSqM: 420,
    bedsCount: 7,
    amenities: ['pool', 'central_ac', 'wifi', 'kitchen', 'garage', 'smart_tv', 'garden', 'bbq', 'security'],
    houseRules: {
      minStay: 3,
      maxStay: 60,
      smokingAllowed: false,
      partiesAllowed: false,
      petsAllowed: true,
      childrenAllowed: true,
      checkInTime: '15:00',
      checkOutTime: '11:00',
      additionalRules: 'يسمح باصطحاب الحيوانات الأليفة مع مراعاة النظافة العامة للفيلا والحديقة.',
    },
    status: 'PUBLISHED',
    verificationStatus: 'VERIFIED',
    createdAt: '2025-03-10',
    updatedAt: '2026-08-05',
    publishedAt: '2025-03-12',
  },
  {
    id: 'prop-gouna-103',
    ownerId: 'owner-egypt-001',
    title: 'تاون هاوس على اللاجون مباشرة - الجونة أبيدوس',
    unitType: 'شقة',
    propertyType: 'APARTMENT',
    description: 'تاون هاوس فريد على اللاجون مباشرة في الجونة، يضمن إطلالة مائية خلابة مع دخول مباشر للمياه ومكان مخصص للربط البحري.',
    region: 'الجونة',
    locationName: 'الجونة، البحر الأحمر',
    resortName: 'أبيدوس الجونة',
    address: 'حي أبيدوس - تاون هاوس 12B',
    location: {
      governorate: 'البحر الأحمر',
      city: 'الغردقة',
      district: 'الجونة - أبيدوس',
      resortName: 'أبيدوس الجونة',
      unitNumber: 'Townhouse 12B',
      address: 'حي أبيدوس - تاون هاوس 12B',
      lat: 27.3948,
      lng: 33.6766,
    },
    capacity: {
      baseGuests: 4,
      maxGuests: 6,
      bedrooms: 3,
      beds: 4,
      bathrooms: 3,
      floors: 2,
      areaSqM: 210,
    },
    images: [
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
    ],
    mainImageIndex: 0,
    pricePerNight: 9800,
    currency: 'ج.م',
    pricing: {
      basePricePerNight: 9800,
      currency: 'ج.م',
    },
    rating: 4.85,
    reviewsCount: 19,
    bedrooms: 3,
    bathrooms: 3,
    maxGuests: 6,
    areaSqM: 210,
    bedsCount: 4,
    amenities: ['sea_view', 'central_ac', 'wifi', 'kitchen', 'smart_tv', 'garden'],
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
    status: 'PENDING_REVIEW',
    verificationStatus: 'PENDING_VERIFICATION',
    createdAt: '2026-08-01',
    updatedAt: '2026-08-14',
  },
  {
    id: 'prop-sokhna-104',
    ownerId: 'owner-egypt-001',
    title: 'شاليه بورتو السخنة بالروف والبانوراما البحرية',
    unitType: 'شاليه',
    propertyType: 'CHALET',
    description: 'شالية علوي بروف خاص بانوراما بالكامل يطل على خليج السويس ومجمع بورتو السخنة، قريب جداً من التلفريك وحمامات السباحة.',
    region: 'العين السخنة',
    locationName: 'العين السخنة، السويس',
    resortName: 'بورتو السخنة',
    address: 'برج الأهرامات - شقة 704',
    location: {
      governorate: 'السويس',
      city: 'العين السخنة',
      district: 'بورتو السخنة',
      resortName: 'بورتو السخنة',
      unitNumber: 'Apt 704',
      address: 'برج الأهرامات - شقة 704',
      lat: 29.5630,
      lng: 32.3397,
    },
    capacity: {
      baseGuests: 4,
      maxGuests: 4,
      bedrooms: 2,
      beds: 3,
      bathrooms: 1,
      floors: 1,
      areaSqM: 110,
    },
    images: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
    ],
    mainImageIndex: 0,
    pricePerNight: 4200,
    currency: 'ج.م',
    pricing: {
      basePricePerNight: 4200,
      currency: 'ج.م',
    },
    rating: 4.7,
    reviewsCount: 42,
    bedrooms: 2,
    bathrooms: 1,
    maxGuests: 4,
    areaSqM: 110,
    bedsCount: 3,
    amenities: ['sea_view', 'central_ac', 'kitchen', 'smart_tv'],
    houseRules: {
      minStay: 1,
      maxStay: 14,
      smokingAllowed: true,
      partiesAllowed: false,
      petsAllowed: false,
      childrenAllowed: true,
      checkInTime: '13:00',
      checkOutTime: '11:00',
    },
    status: 'DRAFT',
    verificationStatus: 'REJECTED',
    rejectionReason: 'يرجى إرفاق صور أكثر وضوحاً لغرف النوم وتوضيح سند ملكية الوحدة أو عقد الإدارة المعتمد قبل إعادة الإرسال.',
    createdAt: '2026-08-10',
    updatedAt: '2026-08-12',
  },
];

export const MOCK_PROPERTY_AUDIT_LOGS: PropertyAuditLog[] = [
  {
    id: 'p-audit-001',
    propertyId: 'prop-marassi-101',
    actorId: 'owner-egypt-001',
    actorType: 'OWNER',
    action: 'PROPERTY_CREATED',
    metadata: { title: 'شالية فاخر مطل على البحر مباشرة - مراسي مراسينا' },
    createdAt: '2025-02-01 10:00',
  },
  {
    id: 'p-audit-002',
    propertyId: 'prop-marassi-101',
    actorId: 'admin-sola-01',
    actorType: 'ADMIN',
    action: 'PROPERTY_APPROVED',
    metadata: { previousStatus: 'PENDING_REVIEW', newStatus: 'PUBLISHED' },
    createdAt: '2025-02-03 14:30',
  },
];

const nowMs = Date.now();
const twentyHoursMs = 20 * 60 * 60 * 1000;
const thirtyHoursMs = 30 * 60 * 60 * 1000;

export const createFinancialSummary = (params: {
  bookingId: string;
  totalBookingValue: number;
  firstNightPrice: number;
  depositPaymentStatus?: DepositPaymentStatus;
  remainingBalancePaymentMethod?: 'CASH_ON_ARRIVAL' | 'IN_APP_PAYMENT_ON_ARRIVAL';
  remainingBalanceStatus?: 'NOT_DUE' | 'PAYMENT_INITIATED' | 'PAID' | 'FAILED' | 'CANCELLED';
  ownerPayoutStatus?: 'OWNER_PAYOUT_PENDING' | 'OWNER_PAYOUT_PROCESSING' | 'OWNER_PAYOUT_COMPLETED';
}): BookingFinancialSummary => {
  const depositAmount = params.firstNightPrice;
  const solaCommissionAmount = depositAmount * SOLA_COMMISSION_RATE;
  const ownerNetDepositAmount = depositAmount - solaCommissionAmount;
  const remainingBalance = params.totalBookingValue - depositAmount;

  return {
    bookingId: params.bookingId,
    totalBookingValue: params.totalBookingValue,
    firstNightPrice: params.firstNightPrice,
    depositAmount,
    depositPaymentStatus: params.depositPaymentStatus || 'UNPAID',

    solaCommissionRate: SOLA_COMMISSION_RATE,
    solaCommissionAmount,
    ownerNetDepositAmount,

    remainingBalance,
    remainingBalancePaymentMethod: params.remainingBalancePaymentMethod || 'CASH_ON_ARRIVAL',
    remainingBalanceStatus: params.remainingBalanceStatus || 'NOT_DUE',

    ownerPayoutStatus: params.ownerPayoutStatus || 'OWNER_PAYOUT_PENDING',
    currency: 'ج.م',

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const MOCK_FINANCIAL_SUMMARIES: Record<string, BookingFinancialSummary> = {
  'bk-2026-001': createFinancialSummary({
    bookingId: 'bk-2026-001',
    totalBookingValue: 42500,
    firstNightPrice: 8500,
    depositPaymentStatus: 'UNPAID',
    remainingBalancePaymentMethod: 'CASH_ON_ARRIVAL',
  }),

  'bk-2026-002': createFinancialSummary({
    bookingId: 'bk-2026-002',
    totalBookingValue: 82500,
    firstNightPrice: 16500,
    depositPaymentStatus: 'PAID',
    remainingBalancePaymentMethod: 'CASH_ON_ARRIVAL',
    ownerPayoutStatus: 'OWNER_PAYOUT_COMPLETED',
  }),

  'bk-2026-006': createFinancialSummary({
    bookingId: 'bk-2026-006',
    totalBookingValue: 42500,
    firstNightPrice: 8500,
    depositPaymentStatus: 'PAID',
    remainingBalancePaymentMethod: 'IN_APP_PAYMENT_ON_ARRIVAL',
    ownerPayoutStatus: 'OWNER_PAYOUT_PENDING',
  }),

  'bk-2026-003': createFinancialSummary({
    bookingId: 'bk-2026-003',
    totalBookingValue: 42500,
    firstNightPrice: 8500,
    depositPaymentStatus: 'PAID',
    remainingBalancePaymentMethod: 'CASH_ON_ARRIVAL',
    remainingBalanceStatus: 'PAID',
    ownerPayoutStatus: 'OWNER_PAYOUT_COMPLETED',
  }),

  'bk-2026-007': createFinancialSummary({
    bookingId: 'bk-2026-007',
    totalBookingValue: 34000,
    firstNightPrice: 8500,
    depositPaymentStatus: 'EXPIRED',
  }),
};

export const createBookingSnapshot = (prop: Property, bookedNights?: string[]): BookingPropertySnapshot => {
  const dailyPricingMap = prop.pricing?.dailyPricingMap || {};
  const bookedNightlyPrices = (bookedNights || []).map((date) => ({
    date,
    price: dailyPricingMap[date] || prop.pricePerNight,
  }));

  return {
    propertyId: prop.id,
    propertyTitle: prop.title,
    propertyType: prop.propertyType,
    location: prop.location,
    capacity: prop.capacity,
    amenities: prop.amenities,
    images: prop.images,
    rules: prop.houseRules,
    basePriceAtBooking: prop.pricePerNight,
    dailyPricingMapAtBooking: { ...dailyPricingMap },
    bookedNightlyPrices,
    capturedAt: new Date().toISOString(),
  };
};

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: 'bk-2026-001',
    propertyId: 'prop-marassi-101',
    propertyTitle: 'شالية فاخر مطل على البحر مباشرة - مراسي مراسينا',
    propertyImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    locationName: 'مراسي، الساحل الشمالي',
    renter: {
      id: 'renter-101',
      name: 'عمر الملا',
      phone: '+20 111 888 9900',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      rating: 4.9,
    },
    checkIn: '2026-08-20',
    checkOut: '2026-08-25',
    nights: 5,
    guestsCount: 4,
    totalPrice: 42500,
    deposit: 8500,
    currency: 'ج.م',
    status: 'PENDING_OWNER_APPROVAL',
    createdAt: new Date(nowMs - twentyHoursMs).toISOString(),
    expiresAt: new Date(nowMs + (PENDING_BOOKING_EXPIRATION_HOURS * 3600000 - twentyHoursMs)).toISOString(),
    financialSummary: MOCK_FINANCIAL_SUMMARIES['bk-2026-001'],
    propertySnapshot: createBookingSnapshot(MOCK_PROPERTIES[0]),
    updatedAt: new Date(nowMs - twentyHoursMs).toISOString(),
  },
  {
    id: 'bk-2026-007',
    propertyId: 'prop-marassi-101',
    propertyTitle: 'شالية فاخر مطل على البحر مباشرة - مراسي مراسينا',
    propertyImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    locationName: 'مراسي، الساحل الشمالي',
    renter: {
      id: 'renter-107',
      name: 'محمود عبد الفتاح',
      phone: '+20 106 111 2233',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      rating: 4.6,
    },
    checkIn: '2026-09-01',
    checkOut: '2026-09-05',
    nights: 4,
    guestsCount: 3,
    totalPrice: 34000,
    deposit: 8500,
    currency: 'ج.م',
    status: 'EXPIRED',
    createdAt: new Date(nowMs - thirtyHoursMs).toISOString(),
    expiresAt: new Date(nowMs - (thirtyHoursMs - PENDING_BOOKING_EXPIRATION_HOURS * 3600000)).toISOString(),
    financialSummary: MOCK_FINANCIAL_SUMMARIES['bk-2026-007'],
    propertySnapshot: createBookingSnapshot(MOCK_PROPERTIES[0]),
    updatedAt: new Date(nowMs - 6 * 3600000).toISOString(),
  },
  {
    id: 'bk-2026-002',
    propertyId: 'prop-hacienda-102',
    propertyTitle: 'فيلا مودرن بحمام سباحة خاص - هاسيندا باي',
    propertyImage: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
    locationName: 'هاسيندا باي، الساحل الشمالي',
    renter: {
      id: 'renter-102',
      name: 'د. ياسمين صبري',
      phone: '+20 102 555 4433',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      rating: 5.0,
    },
    checkIn: '2026-08-28',
    checkOut: '2026-09-02',
    nights: 5,
    guestsCount: 8,
    totalPrice: 82500,
    deposit: 16500,
    currency: 'ج.م',
    status: 'CONFIRMED',
    confirmedAt: '2026-08-10T10:15:00Z',
    hasDispute: true,
    activeDisputeId: 'disp-2026-001',
    financialSummary: MOCK_FINANCIAL_SUMMARIES['bk-2026-002'],
    propertySnapshot: createBookingSnapshot(MOCK_PROPERTIES[1]),
    createdAt: '2026-08-10 10:15',
    updatedAt: '2026-08-14 09:00',
  },
  {
    id: 'bk-2026-006',
    propertyId: 'prop-marassi-101',
    propertyTitle: 'شالية فاخر مطل على البحر مباشرة - مراسي مراسينا',
    propertyImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    locationName: 'مراسي، الساحل الشمالي',
    renter: {
      id: 'renter-106',
      name: 'مهندس حسام الدين',
      phone: '+20 109 777 8899',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      rating: 4.9,
    },
    checkIn: '2026-08-10',
    checkOut: '2026-08-15',
    nights: 5,
    guestsCount: 4,
    totalPrice: 42500,
    deposit: 8500,
    currency: 'ج.م',
    status: 'CONFIRMED',
    confirmedAt: '2026-08-08 12:00',
    hasDispute: false,
    financialSummary: MOCK_FINANCIAL_SUMMARIES['bk-2026-006'],
    propertySnapshot: createBookingSnapshot(MOCK_PROPERTIES[0]),
    createdAt: '2026-08-08 12:00',
    updatedAt: '2026-08-14 18:45',
  },
];

export const MOCK_DISPUTES: Dispute[] = [
  {
    id: 'disp-2026-001',
    bookingId: 'bk-2026-002',
    propertyId: 'prop-hacienda-102',
    renterId: 'renter-102',
    ownerId: 'owner-egypt-001',

    propertyTitle: 'فيلا مودرن بحمام سباحة خاص - هاسيندا باي',
    propertyImage: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
    locationName: 'هاسيندا باي، الساحل الشمالي',
    renterName: 'د. ياسمين صبري',
    renterAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    renterPhone: '+20 102 555 4433',

    type: 'PROPERTY_MISMATCH',
    severity: 'HIGH',
    status: 'UNDER_OWNER_RESPONSE',
    description: 'عند الوصول لاستلام الفيلا في هاسيندا باي، تبين أن الفيلا المسلمة رقم 14 وليست الفيلا رقم 42 المعروضة بالصور، والمسبح غير مغطى ولا يوجد حمام أطفال مخصص.',

    evidence: [
      {
        id: 'ev-101',
        disputeId: 'disp-2026-001',
        submittedBy: 'RENTER',
        type: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
        description: 'صورة واجهة الفيلا المسلمة رقم 14 تختلف عن صور الإعلان المعتمدة.',
        createdAt: '2026-08-14 19:10',
      },
    ],

    financialHold: {
      id: 'hold-001',
      disputeId: 'disp-2026-001',
      bookingId: 'bk-2026-002',
      reason: 'تجميد مالي مؤقت للدفعة لحين مراجعة نزاع عدم مطابقة الوحدة من إدارة Sola',
      status: 'ACTIVE',
      createdAt: '2026-08-14 19:10',
    },

    openedAt: '2026-08-14 19:10',
    updatedAt: '2026-08-14 19:10',
  },
];

export const MOCK_DISPUTE_AUDIT_LOGS: DisputeAuditLog[] = [
  {
    id: 'disp-audit-001',
    disputeId: 'disp-2026-001',
    action: 'DISPUTE_CREATED',
    actorId: 'renter-102',
    actorType: 'RENTER',
    metadata: { type: 'PROPERTY_MISMATCH', severity: 'HIGH' },
    createdAt: '2026-08-14 19:10',
  },
];

export const MOCK_FINANCIAL_TRANSACTIONS: FinancialTransaction[] = [];
export const MOCK_FINANCIAL_ADJUSTMENTS: FinancialAdjustment[] = [];
export const MOCK_FINANCIAL_AUDIT_LOGS: FinancialAuditLog[] = [];
export const MOCK_MODIFICATION_REQUESTS: BookingModificationRequest[] = [];
export const MOCK_CANCELLATION_REQUESTS: BookingCancellationRequest[] = [];
export const MOCK_MODIFICATION_HISTORY: BookingModificationHistory[] = [];
export const MOCK_CANCELLATION_HISTORY: BookingCancellationHistory[] = [];

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-disp-1',
    recipientId: 'owner-egypt-001',
    title: 'تنبيه نزاع جديد بشأن حجز 🚨',
    message: 'قامت د. ياسمين صبري بفتح نزاع عدم مطابقة الوحدة لفيلا هاسيندا باي. يرجى إرسال ردك والأدلة.',
    type: 'DISPUTE_OPENED',
    isRead: false,
    createdAt: 'منذ ساعتين',
    entityType: 'DISPUTE',
    entityId: 'disp-2026-001',
    actionRoute: 'disputes',
    deduplicationKey: 'notif-disp-1',
  },
  {
    id: 'notif-dep-1',
    recipientId: 'owner-egypt-001',
    title: 'تم استلام عربون حجز جديد 💰',
    message: 'قام المستأجر حسام الدين بدفع عربون الليلة الأولى (8,500 ج.م) بنجاح عبر منصة Sola.',
    type: 'DEPOSIT_PAYMENT_SUCCESS',
    isRead: false,
    createdAt: 'منذ 3 ساعات',
    entityType: 'BOOKING',
    entityId: 'bk-2026-006',
    actionRoute: 'bookings',
    deduplicationKey: 'notif-dep-1',
  },
];

export const MOCK_CONVERSATIONS: ChatConversation[] = [
  {
    id: 'conv-102',
    bookingId: 'bk-2026-002',
    propertyId: 'prop-hacienda-102',
    propertyTitle: 'فيلا مودرن بحمام سباحة خاص - هاسيندا باي',
    propertyImage: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
    renter: {
      id: 'renter-102',
      name: 'د. ياسمين صبري',
      phone: '+20 102 555 4433',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      rating: 5.0,
    },
    lastMessage: 'تم فتح نزاع بشأن عدم مطابقة الفيلا المسلمة بالصور.',
    lastMessageTimestamp: '19:10',
    unreadCount: 1,
  },
];

export const MOCK_CHAT_MESSAGES: Record<string, ChatMessage[]> = {
  'conv-102': [
    {
      id: 'msg-disp-001',
      conversationId: 'conv-102',
      senderId: 'renter-102',
      senderName: 'د. ياسمين صبري',
      senderRole: 'RENTER',
      text: 'تم فتح نزاع بشأن عدم مطابقة الوحدة المسلمة رقم 14 للصور المعتمدة في الإعلان.',
      type: 'DISPUTE_OPENED',
      dispute: MOCK_DISPUTES[0],
      timestamp: '19:10',
      isRead: false,
    },
  ],
};

export const MOCK_AVAILABILITY_RECORDS: AvailabilityRecord[] = [
  { id: 'av-1', propertyId: 'prop-marassi-101', date: '2026-08-01', status: 'BOOKED', notes: 'حجز مؤكد - كريم زكي', updatedAt: '2026-07-25' },
  { id: 'av-2', propertyId: 'prop-marassi-101', date: '2026-08-02', status: 'BOOKED', notes: 'حجز مؤكد - كريم زكي', updatedAt: '2026-07-25' },
];

import type {
  PropertyStatus,
  PropertyVerificationStatus,
  PropertyType,
  BookingStatus,
  VerificationStatus,
  DepositPaymentStatus,
  RemainingBalancePaymentMethod,
  DisputeStatus,
  DisputeSeverity,
  DisputeType,
  DisputeResolutionType,
  PayoutStatus,
  PayoutMethodType,
} from '../types';

export const SOLA_THEME = {
  primaryBlue: '#0059FF',
  secondaryYellow: '#FFD700',
  backgroundColor: '#FFFFFF',
  secondaryLightBg: '#F5F7FA',
  textColor: '#000000',
  fontFamily: "'Cairo', sans-serif",
  direction: 'rtl',
  language: 'ar',
} as const;

export const SOLA_COMMISSION_RATE = 0.20; // 20% commission on deposit ONLY
export const PENDING_BOOKING_EXPIRATION_HOURS = 24;
export const MINIMUM_PAYOUT_AMOUNT = 500; // EGP approved minimum payout limit

export const PAYOUT_STATUS_CONFIG: Record<
  PayoutStatus,
  { label: string; bg: string; text: string; border: string; description: string }
> = {
  PENDING: {
    label: 'قيد الطلب',
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    border: 'border-amber-300',
    description: 'تم حجز المبلغ من الرصيد المتاح وفي انتظار مراجعة Sola Admin.',
  },
  PROCESSING: {
    label: 'قيد التحويل البنكي',
    bg: 'bg-blue-50',
    text: 'text-[#0059FF]',
    border: 'border-blue-300',
    description: 'جاري تنفيذ أمر تحويل الأموال إلى حسابك البنكي/المحفظة.',
  },
  COMPLETED: {
    label: 'تم التحويل بنجاح ✅',
    bg: 'bg-emerald-50',
    text: 'text-emerald-900',
    border: 'border-emerald-300',
    description: 'تم تحويل المبلغ بنجاح لحسابك البنكي المعتمد.',
  },
  REJECTED: {
    label: 'مرفوض وإعادة الرصيد',
    bg: 'bg-rose-50',
    text: 'text-rose-900',
    border: 'border-rose-300',
    description: 'تم رفض الطلب لخطأ في بيانات الحساب وتم إعادة المبلغ المالي للرصيد المتاح.',
  },
  CANCELLED: {
    label: 'ملغى من المالك',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-300',
    description: 'تم إلغاء طلب السحب بواسطة المالك وتحرير المبلغ المحجوز.',
  },
};

export const PAYOUT_METHOD_CONFIG: Record<
  PayoutMethodType,
  { label: string; icon: string; estimatedFeeText: string }
> = {
  BANK_TRANSFER: {
    label: 'تحويل بنكي مباشر (حساب بنكي / IBAN)',
    icon: '🏦',
    estimatedFeeText: 'رسوم التحويل الفعلية حسب مزود الخدمة',
  },
  INSTAPAY: {
    label: 'أنستا باي مصر (InstaPay IPA / رقم الموبايل)',
    icon: '⚡',
    estimatedFeeText: 'رسوم التحويل الفعلية حسب مزود الخدمة',
  },
  VODAFONE_CASH: {
    label: 'محفظة فودافون كاش (Vodafone Cash)',
    icon: '📱',
    estimatedFeeText: 'رسوم التحويل الفعلية حسب مزود الخدمة',
  },
  ORANGE_CASH: {
    label: 'محفظة أورنج كاش (Orange Cash)',
    icon: '📱',
    estimatedFeeText: 'رسوم التحويل الفعلية حسب مزود الخدمة',
  },
  ETISALAT_CASH: {
    label: 'محفظة اتصالات كاش (Etisalat Cash)',
    icon: '📱',
    estimatedFeeText: 'رسوم التحويل الفعلية حسب مزود الخدمة',
  },
};

export const EGYPTIAN_COASTAL_REGIONS = [
  { id: 'north_coast', name: 'الساحل الشمالي', cities: ['العلمين', 'سيدي عبد الرحمن', 'رأس الحكمة', 'مرسى مطروح'] },
  { id: 'red_sea', name: 'البحر الأحمر', cities: ['الجونة', 'الغردقة', 'سهل حشيش', 'مكادي باي', 'مرسى علم'] },
  { id: 'suez_gulf', name: 'خليج السويس', cities: ['العين السخنة', 'راس سدر'] },
  { id: 'south_sinai', name: 'جنوب سيناء', cities: ['شرم الشيخ', 'دهب', 'نويبع'] },
];

export const UNIT_TYPES = [
  { id: 'CHALET', name: 'شاليه', icon: '🏡' },
  { id: 'VILLA', name: 'فيلا', icon: '🏰' },
  { id: 'APARTMENT', name: 'شقة', icon: '🏢' },
  { id: 'STUDIO', name: 'استوديو', icon: '🛏️' },
  { id: 'HOTEL_ROOM', name: 'غرفة فندقية', icon: '🏨' },
  { id: 'OTHER', name: 'نوع آخر', icon: '🏠' },
];

export const PREDEFINED_AMENITIES = [
  { id: 'pool', name: 'حمام سباحة', category: 'الترفيه', icon: '🏊‍♂️' },
  { id: 'private_pool', name: 'حمام سباحة خاص مغطى', category: 'الترفيه', icon: '🏊‍♀️' },
  { id: 'sea_view', name: 'إطلالة مباشرة على البحر', category: 'العامة', icon: '🌊' },
  { id: 'central_ac', name: 'تكييف مركزي بالكامل', category: 'الخدمات', icon: '❄️' },
  { id: 'wifi', name: 'إنترنت واي فاي سريعة', category: 'الخدمات', icon: '📶' },
  { id: 'kitchen', name: 'مطبخ مجهز بالكامل', category: 'المطبخ', icon: '🍳' },
  { id: 'garage', name: 'جراج مغطى للسيارات', category: 'العامة', icon: '🚗' },
  { id: 'smart_tv', name: 'شاشة سمارت وساتلايت', category: 'الترفيه', icon: '📺' },
  { id: 'garden', name: 'حديقة خاصة وتراس', category: 'الترفيه', icon: '🏡' },
  { id: 'bbq', name: 'منطقة شواء وتجهيزات BBQ', category: 'الترفيه', icon: '🍖' },
  { id: 'private_beach', name: 'دخول شاطئ خاص بالقرية', category: 'الترفيه', icon: '🏖️' },
  { id: 'security', name: 'أمن وحراسة 24/7', category: 'الخدمات', icon: '🛡️' },
];

export const PROPERTY_STATUS_CONFIG: Record<
  PropertyStatus,
  { label: string; bg: string; text: string; border: string; description: string }
> = {
  DRAFT: {
    label: 'مسودة',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    description: 'الوحدة قيد الإعداد لدى المالك ولم تُرسل للمراجعة بعد.',
  },
  PENDING_REVIEW: {
    label: 'قيد المراجعة',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
    description: 'الوحدة مرفوعة ومنتظرة موافقة فريق جودة منصة Sola.',
  },
  PUBLISHED: {
    label: 'منشورة ومتاحة للحجز',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    description: 'الوحدة معتمدة ومفتوحة على المنصة وتستقبل الحجوزات.',
  },
  PAUSED: {
    label: 'موقوفة مؤقتاً',
    bg: 'bg-blue-50',
    text: 'text-[#0059FF]',
    border: 'border-blue-300',
    description: 'الوحدة موقوفة بطلب المالك عن الحجوزات الجديدة (الحجوزات المؤكدة سارية).',
  },
  SUSPENDED: {
    label: 'معلقة إدارياً',
    bg: 'bg-slate-900',
    text: 'text-amber-400',
    border: 'border-slate-800',
    description: 'الوحدة معلقة بقرار إداري من Sola لسبب انضباطي.',
  },
  ARCHIVED: {
    label: 'مؤرشفة',
    bg: 'bg-slate-200',
    text: 'text-slate-500',
    border: 'border-slate-400',
    description: 'الوحدة سحبت تشغيلياً وحُفظت سجلاتها التاريخية.',
  },
};

export const PROPERTY_VERIFICATION_CONFIG: Record<
  PropertyVerificationStatus,
  { label: string; bg: string; text: string }
> = {
  UNVERIFIED: {
    label: 'غير موثقة',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
  },
  PENDING_VERIFICATION: {
    label: 'قيد التوثيق',
    bg: 'bg-amber-100',
    text: 'text-amber-900',
  },
  VERIFIED: {
    label: 'موثقة رسمياً ✓',
    bg: 'bg-emerald-100',
    text: 'text-emerald-900',
  },
  REJECTED: {
    label: 'توثيق مرفوض',
    bg: 'bg-rose-100',
    text: 'text-rose-900',
  },
};

export const PROPERTY_TYPE_CONFIG: Record<PropertyType, { label: string; icon: string }> = {
  CHALET: { label: 'شاليه', icon: '🏡' },
  VILLA: { label: 'فيلا', icon: '🏰' },
  APARTMENT: { label: 'شقة', icon: '🏢' },
  STUDIO: { label: 'استوديو', icon: '🛏️' },
  HOTEL_ROOM: { label: 'غرفة فندقية', icon: '🏨' },
  OTHER: { label: 'نوع آخر', icon: '🏠' },
};

export const BOOKING_STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; bg: string; text: string }
> = {
  PENDING_OWNER_APPROVAL: { label: 'بانتظار موافقتك ⏳', bg: 'bg-amber-100', text: 'text-amber-900' },
  APPROVED_PENDING_PAYMENT: { label: 'مقبول — بانتظار سداد العربون من النزيل 💰', bg: 'bg-blue-100', text: 'text-blue-900' },
  CONFIRMED: { label: 'مؤكد 🟢', bg: 'bg-emerald-100', text: 'text-emerald-900' },
  REJECTED: { label: 'مرفوض 🔴', bg: 'bg-rose-100', text: 'text-rose-900' },
  EXPIRED: { label: 'منتهي الصلاحية ⏱️', bg: 'bg-slate-100', text: 'text-slate-600' },
  CANCELLATION_REQUESTED: { label: 'طلب إلغاء ⚠️', bg: 'bg-rose-50', text: 'text-rose-800' },
  CANCELLED: { label: 'ملغى 🚫', bg: 'bg-slate-200', text: 'text-slate-700' },
  REQUESTED: { label: 'قيد الطلب', bg: 'bg-amber-50', text: 'text-amber-800' },
  OWNER_ACCEPTED: { label: 'مقبول من المالك', bg: 'bg-blue-100', text: 'text-blue-900' },
  OWNER_REJECTED: { label: 'مرفوض من المالك', bg: 'bg-rose-100', text: 'text-rose-900' },
  PAYMENT_PENDING: { label: 'بانتظار تحويل العربون 💰', bg: 'bg-blue-100', text: 'text-blue-900' },
  ACTIVE: { label: 'إقامة نشطة حالياً 🏖️', bg: 'bg-emerald-500', text: 'text-white' },
  COMPLETED: { label: 'مكتمل ✅', bg: 'bg-slate-100', text: 'text-slate-800' },
};

export const VERIFICATION_STATUS_CONFIG: Record<
  VerificationStatus,
  { label: string; bg: string; text: string }
> = {
  NOT_VERIFIED: { label: 'غير موثق', bg: 'bg-slate-100', text: 'text-slate-600' },
  UNVERIFIED: { label: 'غير موثق', bg: 'bg-slate-100', text: 'text-slate-600' },
  PENDING: { label: 'قيد المراجعة', bg: 'bg-amber-100', text: 'text-amber-900' },
  PENDING_VERIFICATION: { label: 'قيد المراجعة والإرجاء', bg: 'bg-amber-100', text: 'text-amber-900' },
  VERIFIED: { label: 'موثق رسمياً ✓', bg: 'bg-emerald-100', text: 'text-emerald-900' },
  REJECTED: { label: 'مرفوض التوثيق', bg: 'bg-rose-100', text: 'text-rose-900' },
};

export const DEPOSIT_PAYMENT_STATUS_CONFIG: Record<
  DepositPaymentStatus,
  { label: string; bg: string; text: string }
> = {
  UNPAID: { label: 'عربون غير مدفوع', bg: 'bg-amber-100', text: 'text-amber-900' },
  PAYMENT_PENDING: { label: 'بانتظار سداد العربون 💰', bg: 'bg-blue-100', text: 'text-blue-900' },
  PAID: { label: 'تم استلام العربون بنجاح 🟢', bg: 'bg-emerald-100', text: 'text-emerald-900' },
  FAILED: { label: 'فشل سداد العربون 🔴', bg: 'bg-rose-100', text: 'text-rose-900' },
  EXPIRED: { label: 'انتهت مهلة السداد ⏱️', bg: 'bg-slate-100', text: 'text-slate-600' },
  REFUND_PENDING: { label: 'طلب استرداد قيد المعالجة 🔄', bg: 'bg-amber-100', text: 'text-amber-900' },
  REFUNDED: { label: 'تم رد العربون بالكامل ↩️', bg: 'bg-slate-200', text: 'text-slate-800' },
  PARTIALLY_REFUNDED: { label: 'تم رد جزء من العربون ⚖️', bg: 'bg-purple-100', text: 'text-purple-900' },
};

export const REMAINING_BALANCE_METHOD_CONFIG: Record<
  RemainingBalancePaymentMethod,
  { label: string; description: string }
> = {
  CASH_ON_ARRIVAL: {
    label: 'نقداً عند الوصول للمالك (Cash on Arrival)',
    description: 'يقوم المستأجر بدفع المتبقي للمالك مباشرة يد بيد بعد معاينة واستلام الوحدة.',
  },
  IN_APP_PAYMENT_ON_ARRIVAL: {
    label: 'دفع إلكتروني عبر التطبيق عند الوصول',
    description: 'يدفع المستأجر المتبقي إلكترونياً بعد الاستلام وتُحول لحساب المالك.',
  },
};

export const DISPUTE_STATUS_CONFIG: Record<
  DisputeStatus,
  { label: string; bg: string; text: string; actionRequiredByOwner: boolean }
> = {
  OPENED: {
    label: 'مفتوح (بانتظار رد المالك)',
    bg: 'bg-amber-100',
    text: 'text-amber-900',
    actionRequiredByOwner: true,
  },
  UNDER_OWNER_RESPONSE: {
    label: 'مطلوب رد المالك والأدلة',
    bg: 'bg-amber-100',
    text: 'text-amber-900',
    actionRequiredByOwner: true,
  },
  OWNER_RESPONDED: {
    label: 'تم رد المالك (قيد المراجعة)',
    bg: 'bg-blue-100',
    text: 'text-blue-900',
    actionRequiredByOwner: false,
  },
  UNDER_ADMIN_REVIEW: {
    label: 'قيد مراجعة Sola Admin',
    bg: 'bg-[#0059FF]/10',
    text: 'text-[#0059FF]',
    actionRequiredByOwner: false,
  },
  WAITING_FOR_MORE_EVIDENCE: {
    label: 'مطلوب أدلة إضافية',
    bg: 'bg-amber-100',
    text: 'text-amber-900',
    actionRequiredByOwner: true,
  },
  RESOLUTION_PROPOSED: {
    label: 'تم مقترح الحل الإداري',
    bg: 'bg-purple-100',
    text: 'text-purple-900',
    actionRequiredByOwner: false,
  },
  RESOLVED: {
    label: 'تم حسم النزاع رسمياً ✅',
    bg: 'bg-emerald-100',
    text: 'text-emerald-900',
    actionRequiredByOwner: false,
  },
  REJECTED: {
    label: 'تم رفض النزاع (الشكوى غير مبررة)',
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    actionRequiredByOwner: false,
  },
  CANCELLED: {
    label: 'ملغى من المستأجر',
    bg: 'bg-slate-100',
    text: 'text-slate-500',
    actionRequiredByOwner: false,
  },
};

export const DISPUTE_SEVERITY_CONFIG: Record<
  DisputeSeverity,
  { label: string; bg: string; text: string; border: string }
> = {
  LOW: { label: 'طفيف', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300' },
  MEDIUM: { label: 'متوسط', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  HIGH: { label: 'عالي الجسامات', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300' },
  CRITICAL: { label: 'حرج جداً', bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-700' },
};

export const DISPUTE_TYPE_CONFIG: Record<DisputeType, { label: string; description: string }> = {
  PROPERTY_MISMATCH: {
    label: 'عدم مطابقة الوحدة المسلمة للصور',
    description: 'الاستلام الفعلي لوحدة تختلف عن الصور والمعلومات المعروضة بالإعلان.',
  },
  PROPERTY_UNAVAILABLE: {
    label: 'الوحدة غير متاحة عند الوصول',
    description: 'تعذر استلام الوحدة بسبب حجز مزدوج أو عدم تواجد مفاتيح.',
  },
  MAJOR_AMENITY_MISSING: {
    label: 'عطل/غياب مرفق جوهري معلن',
    description: 'عطل التكييف المركزي، حمام السباحة، أو المطبخ المرفق.',
  },
  PROPERTY_CONDITION: {
    label: 'سوء حالة النظافة والجاهزية',
    description: 'تردي مستوى النظافة والصيانة عن الحد المقبول.',
  },
  SAFETY_ISSUE: {
    label: 'مخاطر سلامة وأمن بالوحدة',
    description: 'مشاكل في الأقفال أو خطورة في كهرباء الوحدة.',
  },
  WRONG_UNIT: {
    label: 'تسليم وحدة مختلفة بقرية أخرى',
    description: 'تغيير القرية أو العمارة المسلمة عن العقد.',
  },
  OTHER: {
    label: 'نزاع فرعي آخر',
    description: 'أية ملاحظات وإخلال بشروط الإقامة.',
  },
};

export const DISPUTE_RESOLUTION_CONFIG: Record<
  DisputeResolutionType,
  { label: string; description: string }
> = {
  NO_FINANCIAL_ACTION: {
    label: 'إغلاق بدون إجراء مالي (إنهاء النزاع)',
    description: 'الشكوى غير جوهرية وتم التوصل لتسوية ودية مع المالك.',
  },
  PARTIAL_REFUND: {
    label: 'خصم وتعويض جزئي للمستأجر',
    description: 'استرداد نسبة محددة من العربون للمستأجر لغياب مرفق ثانوي.',
  },
  FULL_REFUND: {
    label: 'استرداد كامل للعربون (خلل المالك)',
    description: 'استرداد 100% من العربون للمستأجر وتصفير عمولة Sola الـ 20% لخلل المالك.',
  },
  OWNER_REMEDY: {
    label: 'التزام المالك بالإصلاح الفوري',
    description: 'معالجة المشكلة خلال ساعات وتوفير خدمات بديلة.',
  },
  PROPERTY_REPLACEMENT: {
    label: 'ترقية وتوفير وحدة بديلة بالقرية',
    description: 'توفير وحدة مساوية أو أعلى للمستأجر بنفس التكلفة.',
  },
  DISPUTE_REJECTED: {
    label: 'رفض شكوى المستأجر (مستند المالك صحيح)',
    description: 'الشكوى غير مبررة والإبقاء على كامل مستحقات المالك والعربون.',
  },
};

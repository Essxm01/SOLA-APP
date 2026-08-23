# StatusBadge contract

A `StatusBadge` is a semantic presentation of a canonical status, not an independently styled screen chip. It uses the corresponding semantic background, text and border token; an icon or dot is optional and cannot be the only signal.

| Domain | Status → Arabic label guidance | Semantic type |
|---|---|---|
| Property | DRAFT → مسودة; PENDING_REVIEW → قيد المراجعة; PUBLISHED → منشورة; REJECTED → مرفوضة; PAUSED → موقوفة | warning, warning, success, danger, info |
| Booking | PENDING_OWNER_APPROVAL → بانتظار موافقة المالك; APPROVED_PENDING_PAYMENT → تمت الموافقة — العربون مطلوب; CONFIRMED → الحجز مؤكد; REJECTED → مرفوض; CANCELLED → ملغى; EXPIRED → انتهت المهلة | warning, info, success, danger, danger, muted/info |
| Payment | INITIATED → بدأ الدفع; PENDING → قيد المعالجة; SUCCEEDED → تم الدفع; FAILED → فشل الدفع | info, warning, success, danger |
| Wallet/Payout | PENDING → معلق; AVAILABLE → متاح; RESERVED → محجوز; HELD → محتجز; PROCESSING → قيد التحويل; COMPLETED → مكتمل; REJECTED → مرفوض | warning, success, info, warning, info, success, danger |
| Identity | UNVERIFIED → غير موثق; PENDING_VERIFICATION → قيد التحقق; VERIFIED → موثق; REJECTED → مرفوض | muted, warning, success, danger |

Applications map internal enum values centrally and never expose them as user-facing English text. Exact wording may be refined centrally without changing business status semantics.

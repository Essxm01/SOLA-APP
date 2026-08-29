<div dir="rtl">

# KONFRM — Master Project Context

**نوع الوثيقة:** Project Brain + Product Bible + Founder Context + Decision Log + Business Rules Reference + Technical Context + Brand Context  
**الحالة:** Single Source of Truth حتى تاريخ التحديث  
**آخر تحديث:** 2026-08-19  
**اللغة الأساسية:** العربية — RTL  
**الاسم الحالي الرسمي:** **KONFRM — كونفرم**  
**الدومين:** **KONFRM.COM**  
**مرحلة المشروع:** Functional Prototype / Realistic MVP / Product Validation  

> هذه الوثيقة مُعدة لتكون المرجع الرئيسي للمشروع عند نقله إلى مشروع ChatGPT جديد. أي اسم قديم مثل **Yalla Masyaf / يلا مصيف** أو **SOLA / سولا** يشير إلى نفس المشروع تاريخيًا، لكن الاسم الحالي المعتمد هو **KONFRM**.

## فهرس الأقسام الرئيسية

- 1. طريقة استخدام هذه الوثيقة
- 2. KONFRM — Executive Snapshot
- 3. Founder Vision & Founder Story
- 4. Problem Statement & Market Pain Map
- 5. Project Evolution
- 6. Naming History & KONFRM Brand
- 7. Visual Identity
- 8. Target Users & Personas
- 9. Business Model
- 10. Marketplace Structure
- 11. Platform Architecture — Product Level
- 12. Prototype vs Production
- 13. Prototype Technical Architecture
- 14. Renter Mobile Application
- 15. Owner Mobile Application
- 16. Admin Web Application
- 17. User Flows — Renter
- 18. User Flows — Owner
- 19. User Flows — Admin
- 20. Business Rules — Confirmed Current Reference
- 21. Booking Workflow — Detailed Product Logic
- 22. Financial Workflow
- 23. Escrow, Hold & Ledger
- 24. Cancellation & Refunds
- 25. Verification & Trust
- 26. Reviews & Reputation
- 27. Disputes
- 28. Notifications & Messaging
- 29. State Machines
- 30. Data Model
- 31. API Considerations
- 32. Security
- 33. UX Principles
- 34. Owner Research & Market Validation
- 35. Go-to-Market & Launch
- 36. Implementation Partner / الشركة المنفذة
- 37. Roadmap / Project Phases
- 38. Final Software Company Handoff Requirements
- 39. Risk Register
- 40. Important Edge Cases
- 41. Open Questions — Master Register
- 42. Decision Log
- 43. Deprecated / Rejected Decisions
- 44. Future Ideas — Not Current Requirements
- 45. Founder Working Style
- 46. Instructions for Any Future AI Working on KONFRM
- 47. Antigravity Operating Protocol
- 48. Current Project Status — اقرأ هذا أولًا عند الاستكمال
- 49. Recommended Next Step
- 50. Glossary
- 51. Document Maintenance Protocol
- 52. Final Continuation Checklist for a New ChatGPT Project
- 53. Closing Principle

---

# 1. طريقة استخدام هذه الوثيقة

هذه الوثيقة هي المرجع المركزي للمشروع حتى تاريخها. الهدف أن يتمكن أي ChatGPT أو Product Manager أو Developer أو Designer أو مستشار أو شركة تطوير من فهم المشروع دون العودة للمحادثة القديمة.

## 1.1 قاعدة أولوية الحقيقة

عند وجود تعارض، يُستخدم الترتيب التالي:

1. أحدث قرار صريح من المؤسس.
2. Business Rule معتمدة بوضوح.
3. أحدث Product Specification معتمد.
4. أحدث Architecture Specification معتمد.
5. أحدث Live Verification حقيقي.
6. الكود الحالي.
7. Technical defaults / mocks / constants القديمة.

> **قاعدة صفر:** وجود قيمة داخل الكود لا يجعلها Business Rule تلقائيًا. أي قيمة مثل `24h` أو `5000` أو `14:00` لا تُعتمد لمجرد وجودها في الكود.

## 1.2 تصنيف القرارات

- ✅ **قرار حالي معتمد** — يُبنى عليه الآن.
- 🟡 **قيد الدراسة / Current Direction** — اتجاه قوي لكنه ليس نهائيًا بالكامل.
- ⚠️ **غير محسوم / Open Question** — يحتاج قرارًا أو تحققًا.
- ❌ **قرار قديم تم إلغاؤه / Rejected** — لا يُستخدم كمرجع حالي.
- 🔄 **Superseded** — كان قرارًا صحيحًا في مرحلة سابقة ثم استُبدل.
- 🧪 **Prototype/MVP Only** — حل أو قاعدة مؤقتة لخدمة الـPrototype الحالي.
- 🚀 **Production Requirement** — شرط يجب التحقق منه أو تنفيذه في النسخة النهائية.
- 💡 **استنتاج منطقي** — ليس قرارًا معتمدًا حتى يوافق عليه المؤسس.

## 1.3 تصنيف حالة التنفيذ

- **DESIGNED** — تم وضع UX/Spec/Architecture فقط.
- **IMPLEMENTED** — تم كتابة الكود.
- **LOCAL VERIFIED** — تم التحقق محليًا.
- **LIVE VERIFIED** — تم التحقق فعليًا على البيئة الحية.
- **BLOCKED** — يجب عدم التقدم قبل حل قرار أو مشكلة.

**Build Success أو CI أخضر ليسا دليلًا على أن Feature تعمل فعليًا أو أن UX صحيح.**

---

# 2. KONFRM — Executive Snapshot

## 2.1 ما هو KONFRM؟

**KONFRM** هو Marketplace مصري متخصص في إيجارات الوحدات الساحلية والمصيفية قصيرة الأجل، يربط المستأجرين بملاك وحدات موثقة داخل تجربة حجز أكثر تنظيمًا وثقة من السوق التقليدي القائم على Facebook Groups وWhatsApp والوسطاء والتحويلات المباشرة.

القيمة ليست مجرد “عرض شاليهات”، بل بناء **Transaction + Trust + Availability Layer** تشمل:

- اكتشاف وحدات حقيقية.
- توثيق المالك.
- توثيق كل وحدة بشكل مستقل.
- صور وبيانات أكثر موثوقية.
- Availability حقيقية مرتبطة بالحجوزات.
- اختيار التواريخ والضيوف بوضوح.
- Quote سعرية Server-authoritative.
- طلب حجز منظم.
- موافقة/رفض المالك قبل أي دفع.
- دفع عربون بعد الموافقة فقط.
- سجل للحجز والمدفوعات والحالات.
- محفظة وسحب للمالك.
- مراجعات مرتبطة بإقامات فعلية.
- نزاعات وأدلة وAdmin intervention عند الحاجة.

## 2.2 لماذا المشروع موجود؟

السوق المصري الحالي يعاني من:

- تجزؤ شديد للمعلومات بين Facebook وWhatsApp والوسطاء.
- صعوبة معرفة الوحدة المتاحة فعلًا.
- صور قديمة أو مسروقة أو غير دقيقة.
- انتحال صفة المالك.
- تحويل عربون لمحتال.
- أسعار غير موحدة أو غير واضحة.
- عدم وجود Booking history موحد.
- عدم وجود Workflow واضح للقبول والدفع والإلغاء والاسترداد.
- صعوبة إدارة المالك لتواريخه وطلباته ومدفوعاته.
- غياب طبقة Trust موحدة يمكن للطرفين الاعتماد عليها.

## 2.3 السوق الأولي

✅ **السوق:** مصر.  
✅ **القطاع:** Vacation Rentals / Coastal Rentals.  
🟡 **التركيز العملي الحالي:** الساحل الشمالي بصورة أساسية في الـPrototype والـDemo.  
🟡 **التوسع المنطقي لاحقًا:** مناطق ساحلية وسياحية مصرية أخرى مثل الإسكندرية، العين السخنة، الجونة، الغردقة، شرم الشيخ، دهب، رأس البر وغيرها. لا يُقفل البراند على منطقة واحدة.

## 2.4 المستخدمون الأساسيون

1. **Renter / Guest — المستأجر**
2. **Owner / Host — المالك**
3. **Admin / Operations — الإدارة**

قد تظهر أدوار تشغيلية داخل الإدارة لاحقًا مثل Support/Finance/Reviewer/Super Admin، لكن صلاحياتها النهائية لم تُحسم.

## 2.5 التطبيقات الحالية المستهدفة

✅ **Renter Mobile Application**  
✅ **Owner Mobile Application**  
✅ **Admin Web Application**

> رغم أن الـPrototype الحالي يستخدم React/Web technology، فإن Form Factor المنتج ثابت: المستأجر والمالك **Mobile Apps**، والإدارة **Web App**.

## 2.6 مرحلة المشروع الحالية

المؤسس **لا يبني النسخة التجارية النهائية بنفسه**. ما يتم بناؤه الآن هو:

> **Realistic Functional Prototype / Operational MVP / High-Fidelity Working Demo**

يُستخدم لاكتشاف منطق المنتج وتجربة الأدوار الثلاثة فعليًا قبل دفع المال للشركة التي ستبني النسخة النهائية.

## 2.7 لماذا الـPrototype حقيقي وليس Mockup؟

الهدف أن يستطيع المؤسس لعب دور:

- المستأجر.
- المالك.
- الإدارة.

وأن يختبر فعليًا:

- البيانات.
- Authentication.
- State transitions.
- Booking flows.
- Availability.
- Admin approvals.
- Wallet/Payout/Dispute concepts.
- Cross-app synchronization.
- UX pain points.
- Edge cases.

البرمجة هنا **وسيلة للتفكير في المنتج** وليست مجرد محاولة لإطلاق الكود الحالي للجمهور.

## 2.8 خطة المنتج النهائي

✅ الخطة الحالية هي التعاقد مع **شركة تطوير خارجية** لإعادة بناء المنتج Production-grade من البداية للنهاية.

**الفهم الحالي للعرض:**

- تكلفة تقريبية: **25,000 جنيه مصري**.
- Admin Web App.
- Owner Mobile App.
- Renter Mobile App.
- دعم فني لمدة **6 أشهر**.
- Hosting / Server / Database / Infrastructure لمدة **6 أشهر** وفق الفهم الحالي.

⚠️ **بعد 6 أشهر:** التكلفة السنوية غير مؤكدة. توجد ذاكرة تقريبية عن `2,000 EGP/year` أو ربما `4,000 EGP` لكل خدمة، لكن هذه ليست Fact ويجب مراجعة العقد/العرض الرسمي.

## 2.9 الهدف الرئيسي الحالي

> الوصول للشركة المنفذة ومع المؤسس **Well-Defined Product Logic** بدل مجرد فكرة “تطبيق تأجير شاليهات”.

---

# 3. Founder Vision & Founder Story

## 3.1 الرؤية

المؤسس يريد تحويل تجربة إيجار المصيف في مصر من عملية فوضوية وغير قابلة للتتبع إلى Marketplace منظم يحافظ على بساطة السوق المحلي لكنه يضيف طبقات الثقة والتوافر والحجز والمال التي يفتقدها.

لا يريد أن يصبح KONFRM نسخة مصرية سطحية من Airbnb. يمكن دراسة Airbnb/Booking كمراجع، لكن السوق المصري مختلف في:

- انتشار WhatsApp.
- ثقافة العربون.
- التفاوض.
- ملاك أفراد وليس شركات Hospitality احترافية فقط.
- تفاوت جودة الصور والبيانات.
- حجز خارجي عبر عدة قنوات.
- اعتماد كبير على Facebook Groups.
- اختلاف طرق الدفع وسلوكيات المستخدمين.

لذلك التصميم يجب أن يبدأ من **السوق الحقيقي** لا من تقليد منصة عالمية.

## 3.2 فلسفة المنتج

المؤسس يفضل:

> **Less Features + Strong Logic**

على:

> **Many Features + Weak Product**

أي Feature جديدة يجب تقييمها عبر:

- من يحتاجها؟
- متى يحتاجها؟
- ماذا يحدث بدونها؟
- هل هناك حل أبسط؟
- هل تزيد تكلفة التطوير؟
- هل تخلق Edge Cases جديدة؟
- هل تحتاجها نسخة MVP فعلًا؟
- هل يمكن تأجيلها؟
- هل هي احتياج مستخدم حقيقي أم افتراض داخلي؟

## 3.3 معيار النجاح الحقيقي

النجاح ليس عدد الملفات أو الاختبارات أو اللون الأخضر في CI. المعيار:

1. **Functional** — تعمل.
2. **Integrated** — تستخدم نفس البيانات الحقيقية بين التطبيقات.
3. **Human UX** — مستخدم طبيعي يفهمها دون شرح تقني.
4. **Demo Ready** — تبدو كمنتج يمكن عرضه على شركة محترفة.

---

# 4. Problem Statement & Market Pain Map

## 4.1 مشاكل المستأجر

- البحث مبعثر بين Groups وPosts ورسائل.
- لا توجد مقارنة موحدة بين الوحدات.
- السعر قد يكون غير واضح أو متغيرًا حسب الشخص.
- الصور قد لا تطابق الوحدة.
- قد تكون الوحدة محجوزة رغم بقاء الإعلان منشورًا.
- لا يوجد Calendar موثوق.
- صعوبة التحقق من أن الشخص هو المالك الحقيقي.
- إمكانية إرسال العربون لمحتال.
- لا يوجد Booking Reference/History موحد.
- لا توجد سياسات واضحة دائمًا للإلغاء والاسترداد.
- صعوبة معرفة “ماذا بعد؟” بعد التحويل أو الطلب.
- مراجعات السوق التقليدي ليست مرتبطة دائمًا بإقامة حقيقية.

## 4.2 مشاكل المالك

- طلبات كثيرة وغير منظمة.
- تكرار نفس الأسئلة في عدة قنوات.
- صعوبة إدارة Availability عبر WhatsApp/Facebook/وسطاء/حجوزات خارجية.
- Double-booking risk.
- صعوبة إظهار أنه مالك موثوق.
- لا توجد طريقة منظمة لعرض الوحدة وتاريخها.
- صعوبة متابعة حالة كل Booking request.
- صعوبة متابعة العربون والمحفظة والسحب.
- نزاعات وأدلة بدون Workflow موحد.
- ضغط تشغيلي كبير إذا زاد عدد الوحدات والطلبات.

## 4.3 مشاكل الإدارة/المنصة

- حمل مراجعة KYC والوحدات.
- اكتشاف Fraud وDuplicate/Fake listings.
- مراقبة المدفوعات والاستردادات.
- إدارة Payout queue.
- معالجة النزاعات والأدلة.
- Audit trail.
- ضبط الاستثناءات دون كسر Business Rules.
- دعم المستخدمين بدون أن يصبح كل شيء Manual bottleneck.

## 4.4 مشاكل الثقة

- Owner impersonation.
- صور مسروقة.
- Fake ownership.
- عدم توثيق كل Property منفصلة.
- Fake reviews.
- off-platform contact/commission bypass.

## 4.5 مشاكل الدفع

- تحويل مباشر دون سجل مركزي.
- Deposit scams.
- غموض مسؤولية المنصة عن الأموال.
- Refund disputes.
- Payment provider fees.
- Failed payments/payouts.
- Chargeback risk.
- حاجة لمحاسبة دقيقة وLedger.

## 4.6 مشاكل التوافر

- نفس الوحدة قد تُحجز من قناة أخرى.
- الطلب الأولي لا يعني بالضرورة حجزًا مؤكدًا.
- Calendar قد تصبح قديمة.
- Race conditions عند عدة طلبات لنفس التواريخ.

## 4.7 مشاكل التواصل

السوق يعتمد على WhatsApp والمكالمات، لكن اتجاه المنتج الحالي داخل KONFRM هو:

✅ **In-app chat only**  
✅ عدم كشف رقم الهاتف داخل التجربة الحالية  
❌ لا Voice Calling  
❌ لا Masked Calling حاليًا

هذا يختلف عن بعض الوثائق التاريخية التي كانت تسمح بعرض بيانات التواصل بعد موافقة المالك؛ هذا الاتجاه **Superseded**.

---

# 5. Project Evolution

## 5.1 المرحلة الأولى — Yalla Masyaf / يلا مصيف

بدأت الفكرة كMarketplace ساحلي مصري يركز على:

- Trust.
- Owner verification.
- Property verification.
- Browsing.
- Booking.
- Calendar.

## 5.2 الانتقال من “إعلان” إلى “وحدة”

✅ قرار معماري مهم:

> **لا يوجد Advertisement entity مستقل كجوهر المنتج.**

النموذج الأساسي أصبح:

`Property + Calendar + Pricing + Bookings`

الوحدة كيان مستمر، وليس إعلانًا جديدًا لكل موسم أو فترة.

## 5.3 مرحلة Website Validation البسيطة

📌 تاريخيًا تمت مناقشة اختبار السوق بموقع بسيط وعدد محدود من الوحدات قبل الاستثمار الكبير.

🔄 تم تجاوز هذا كاتجاه التنفيذ الحالي. الـPrototype أصبح 3 تطبيقات متكاملة.

## 5.4 Owner App أولًا

تم تطوير Owner flow بعمق، ثم ظهرت مشكلات بسبب Mock/In-Memory state وعدم وجود Cross-app integration حقيقية. أدى ذلك إلى تشديد قاعدة:

> **Real DB/API first for core flows.**

## 5.5 Admin + Operational Integrity

تم بناء Admin flows لمراجعة الملاك والوحدات والسحوبات والنزاعات، وتم إثبات Owner → Admin → Published تاريخيًا على البيئة الحية.

## 5.6 مرحلة SOLA

تم تغيير اسم المنتج إلى **SOLA / سولا**، وبُني جزء كبير من الـPrototype بهذا الاسم، لذلك ما زالت أسماء Repo/Cloudflare وبعض الملفات تحمل SOLA.

## 5.7 انتقال الاستضافة Vercel → Cloudflare

حدث انتقال بسبب الوصول إلى Rate limits نتيجة كثرة Deployments في Monorepo.

الهدف أصبح:

- GitHub + GitHub Actions.
- Cloudflare Pages للـ3 Frontends.
- Cloudflare Worker للBackend.
- Supabase PostgreSQL كمصدر البيانات.
- Vercel يبقى Legacy/Fallback ولا يُحذف بدون قرار.

## 5.8 إعادة بناء Renter Experience

أول تنفيذ للمستأجر خرج كـBooking Simulator / Responsive Website، وتم رفضه بوضوح.

الاتجاه الحالي:

- Mobile App.
- Browse-first.
- White-dominant.
- Discovery marketplace.
- Inline availability calendar.
- Explicit user decisions.
- Server-authoritative pricing.

## 5.9 المرحلة الحالية — KONFRM

✅ الاسم الرسمي الحالي: **KONFRM — كونفرم**.

لم يتم بعد تنفيذ Brand migration كامل داخل أسماء الكود/Cloudflare/Repo؛ لذلك أي `SOLA` داخل الـPrototype يجب فهمه كاسم Legacy لنفس المشروع، وليس Brand حاليًا.

---

# 6. Naming History & KONFRM Brand

## 6.1 تاريخ الاسم

| المرحلة | الاسم | الحالة الحالية |
|---|---|---|
| 1 | Yalla Masyaf / يلا مصيف | ❌ اسم تاريخي |
| 2 | SOLA / سولا | ❌ اسم سابق / Legacy في الكود |
| 3 | **KONFRM / كونفرم** | ✅ الاسم الحالي الرسمي |

## 6.2 قصة اسم KONFRM

KONFRM مشتق من:

**CONFIRM → KONFRM**

الفلسفة مستوحاة من مدارس Naming مثل:

- `THUNDER → THNDR` — Compression.
- `LOCAL → LOKAL` — Letter Twist.

المطلوب اسم:

- حديث.
- Digital-first.
- Brandable.
- لا يبدو كصفحة Facebook.
- لا يصف النشاط بصورة حرفية رخيصة.
- له أصل يمكن شرحه.
- يسمح بالتوسع مستقبلًا.
- يشبه شركة Technology/Hospitality حقيقية.

KONFRM يرتبط ضمنيًا بفكرة:

- Confirmed booking.
- Confirmed owner.
- Confirmed property.
- Confirmed payment.
- Trust in process.

لكن:

> **KONFRM ليس Verification App ولا Cybersecurity SaaS.**

الهوية المطلوبة:

**Technology + Hospitality + Lifestyle + Trust**

## 6.3 Naming preferences للمؤسس

المؤسس لا يحب:

- أسماء رخيصة أو Generic.
- أسماء مباشرة جدًا تشرح الوظيفة.
- أسماء من نوع `Yalla + كلمة` كهوية نهائية.
- أسماء مصطنعة بلا منطق.
- أسماء عربية فصحى ثقيلة.
- أسماء تحاول حشر كل وظيفة التطبيق في الاسم.

يميل إلى فلسفة أسماء مثل:

- THNDR.
- Airbnb.
- Booking.
- Uber.
- Binance.
- LOKAL.

## 6.4 Domain

✅ **KONFRM.COM** تم شراؤه لمدة سنة.  
التكلفة التقريبية: **500 جنيه مصري**.

المؤسس يعلم أن الشراء كان سريعًا نسبيًا، لكن توفر `.com` بنفس الاسم وشعوره بأن الاسم مميز شجعه على الشراء.

قاعدة مهمة:

> شراء الدومين لا يجب أن يتحول إلى Sunk Cost يمنع إعادة التقييم إذا ظهر سبب استراتيجي قوي جدًا؛ لكن حاليًا KONFRM هو الـPrimary Brand Name.

---

# 7. Visual Identity

## 7.1 Palette الحالية

| الدور | اللون |
|---|---|
| Primary Brand | **Blue `#0059FF`** |
| Secondary Accent | **Summer Yellow `#FFD700`** |
| Dominant Surface | **White `#FFFFFF`** |
| Light Neutral | `#F5F7FA` |
| Main Text | Black / near-black |

**White must dominate.**

الأزرق يستخدم في:

- Primary CTA.
- Selected state.
- Active icon.
- Verification accents.
- أهم الأرقام/التفاعل.

Summer Yellow يستخدم بصورة محدودة في:

- Rating.
- Highlight.
- Info/accent.

لا يجب تحويل Summer Yellow إلى هوية Gold/Amber/Mustard مختلفة.

## 7.2 Visual personality

- نظيف.
- حديث.
- مريح.
- موثوق.
- Premium بدون تكلف.
- Hospitality/Travel أكثر من Corporate Tech.
- واسع بصريًا.
- Arabic-first / RTL.

## 7.3 ما يجب تجنبه

❌ Dark navy dominant header.  
❌ Navy financial cards.  
❌ Full-width dark surfaces.  
❌ Desktop-first Renter UI.  
❌ Giant desktop hero.  
❌ Admin-dashboard aesthetic داخل Renter App.  
❌ Beach cliché رخيص: موجات/شمس/نخيل بشكل مبالغ.  
❌ Cybersecurity look.  
❌ Stock property image تُعرض كأنها الوحدة الحقيقية.  
❌ Excessive pills/chips.  
❌ Tiny technical typography.  
❌ Pill/capsule Admin navigation.

## 7.4 Typography

🟡 الـPrototype الحالي يستخدم **Cairo** في Renter UI ويعتبر مناسبًا حاليًا. Final production typography يمكن إعادة تقييمها ضمن Brand System نهائي.

## 7.5 Renter/Owner visual form

- Mobile canvas.
- White surfaces.
- Clean cards.
- Moderate radius.
- Subtle borders.
- Generous spacing.
- Thumb-friendly interactions.
- Real property imagery.
- Bottom navigation حيث يناسب.
- RTL.

## 7.6 Admin visual form

- Web operational UI.
- White cards.
- Subtle borders.
- Strong typography.
- Spacious.
- Active Blue.
- Active navigation كـsoft rectangle تقريبًا `10–12px` radius.
- لا separate circular icon bubble.
- لا pill/capsule nav.

---

# 8. Target Users & Personas

## 8.1 Renter / Guest

### الهدف
إيجاد إقامة مناسبة وحجزها بثقة وبأقل احتكاك.

### الاحتياجات

- Browse بدون Login.
- Search جيد.
- صور حقيقية.
- Availability واضحة.
- السعر الإجمالي قبل الالتزام.
- التحقق من الوحدة/المالك.
- Booking status واضح.
- مراجعات حقيقية.
- Account creation منخفض الاحتكاك عند الحاجة فقط.

### المخاوف

- النصب.
- فقد العربون.
- الوحدة مختلفة عن الصور.
- تاريخ غير متاح.
- أسعار مخفية.
- مالك غير موثوق.

## 8.2 Owner / Host

### الهدف
تأجير الوحدة وإدارة التشغيل دون فوضى.

### الاحتياجات

- Verification.
- Property management.
- Calendar.
- Pricing.
- Booking requests.
- Wallet/Ledger.
- Payouts.
- Disputes.
- Notifications.
- Analytics مفيدة.

### المخاوف

- Double booking.
- طلبات غير جادة.
- Payment failure.
- Disputes.
- كشف بيانات تجارية حساسة.
- تعقيد النظام.

## 8.3 Admin / Operations

### الهدف
Governance وتشغيل المنصة.

المهام المحورية:

- Owner verification.
- Property review.
- Booking/payment visibility.
- Payouts.
- Disputes.
- Support.
- Audit/controls.

---

# 9. Business Model

## 9.1 نموذج السوق

Two-sided Marketplace:

- Supply = Owners/Hosts.
- Demand = Renters/Guests.
- Admin = operations/trust/financial governance.

## 9.2 الإيراد المؤكد حاليًا

✅ **العربون = سعر أول ليلة الفعلي.**  
✅ **عمولة KONFRM = 20% من العربون فقط.**  
✅ **صافي عربون المالك = 80% من العربون.**  
✅ **عمولة KONFRM على المبلغ المتبقي = 0%.**

مثال:

إذا كانت أول ليلة `7,500 EGP` وإجمالي الإقامة `30,000 EGP`:

- العربون: 7,500.
- عمولة KONFRM: 1,500.
- صافي عربون المالك: 6,000.
- المتبقي: 22,500.
- لا توجد عمولة إضافية على الـ22,500.

## 9.3 مخاوف Economics

🟡 المؤسس ناقش أن **20% من عربون ليلة واحدة** قد يكون Revenue محدودًا نسبيًا. لم يتم اعتماد تعديل العمولة.

🟡 نوقشت ميزانية تقريبية مبكرة حول `50,000 EGP` لإطلاق/اختبار، لكنها Planning discussion وليست التزامًا ماليًا حاليًا.

## 9.4 Monetization مستقبلية — غير معتمدة

- Subscriptions.
- Promoted listings.
- Owner services.
- Cleaning.
- Maintenance.
- Concierge.
- Insurance.
- Broker programs.

---

# 10. Marketplace Structure

## 10.1 الكيان المحوري

**Property / Unit** هو الكيان الأساسي.

لا يوجد “إعلان” مستقل كجوهر النظام. الوحدة ترتبط بـ:

- Owner.
- Verification.
- Media.
- Amenities.
- Pricing.
- Availability.
- Bookings.
- Reviews.

## 10.2 Single Account Concept

✅ المفهوم العام: الهوية الواحدة يمكن أن تكون Renter وOwner بحسب الصلاحيات/الحالة.

🧪 الـPrototype الحالي لديه **Owner App منفصل وRenter App منفصل**، وبالتالي لا يجب فرض UI role-switch داخل تطبيق واحد لمجرد أن وثيقة تاريخية كانت تقترحه.

🚀 في المنتج النهائي يجب حسم كيفية تمثيل الهوية المشتركة عبر التطبيقين من ناحية Account/session/permissions، دون خلط Product Form Factor.

## 10.3 Trust Layer

الثقة لا تُقدم كـMarketing claim فقط، بل عبر:

- Owner KYC.
- Property verification.
- Real media.
- Availability.
- Structured booking.
- Payment trail.
- Reviews tied to completed stays.
- Disputes/evidence.
- Audit trail.

---

# 11. Platform Architecture — Product Level

## 11.1 Admin Web Application

✅ Web App فقط.

## 11.2 Owner Mobile Application

✅ Mobile App.

## 11.3 Renter Mobile Application

✅ Mobile App.

## 11.4 Cross-app principle

الثلاثة تستخدم نفس النظام ونفس الـDatabase/Backend. لا يجوز أن يصبح لكل App state وهمي مستقل.

أي Flow أساسي يجب أن يكون له أثر متسق عبر الأطراف، مثل:

`Renter Request → Owner sees request → Owner decision → Renter sees new state → Admin can supervise`.

---

# 12. Prototype vs Production

| المجال | Prototype الحالي | Production النهائي |
|---|---|---|
| الهدف | اكتشاف المنطق وتجربة المنتج | الإطلاق التجاري |
| من يبنيه | المؤسس باستخدام Antigravity | شركة تطوير خارجية |
| التكلفة | شبه صفر قدر الإمكان | عرض حالي ~25,000 EGP |
| المستخدمون | المؤسس/اختبارات داخلية | جمهور حقيقي |
| Frontends | React/Vite working demo | Native-quality mobile apps + Admin Web |
| Backend | Working shared backend | Production-grade rebuild |
| Data | Supabase PostgreSQL حقيقي | Production DB مُدار بعقود واضحة |
| Hosting | Free tiers / Cloudflare | Company/infrastructure plan |
| Security | كافٍ للديمو مع ديون معروفة | Secrets/Environments/MFA/WAF/Audit كاملة |
| Payments | Architecture/Paymob boundary بدون live creds نهائية | Live payment provider + settlement/legal validation |
| Availability | حقيقي قدر الإمكان مع Worker workaround | Transactionally robust inventory |
| الهدف الهندسي | Adequate + realistic | Scalability + reliability + security + compliance |
| قيمة الكود | مرجع تنفيذي/تجريبي | ليس ملزمًا أن يُعاد استخدامه |

## 12.1 Free-tier strategy

قاعدة حالية للمؤسس:

> لا تدفع على الـPrototype إلا إذا كان هناك سبب قوي جدًا ولا يوجد بديل مجاني منطقي.

يُفضل:

- Free tiers.
- Trials.
- Developer plans.
- Free hosting/storage/APIs المناسبة.

لكن **لا يتم التضحية بواقعية الـCore Flow** لصالح Mock مجاني سطحي.


# 13. Prototype Technical Architecture

## 13.1 Repository & workspace

**GitHub Repo الحالي:** `https://github.com/Essxm01/SOLA-APP.git`  
**Branch:** `main`  
**Legacy workspace:** `C:\Users\Essam\OneDrive\Desktop\SOLA - RENTAL APP`

> أسماء Repo/workspace ما زالت تحمل SOLA لأنها Legacy. لا تُعامل كاسم المنتج الحالي.

## 13.2 Primary modules

بالضبط:

- `admin-app/`
- `owner-app/`
- `customer-app/`
- `backend/`

KONFRM/SOLA ليس تطبيقًا رابعًا.

## 13.3 Frontend stack الحالي

- React 19.
- TypeScript.
- Vite 8.
- Tailwind في التطبيقات ذات الصلة.
- Lucide icons.
- Cairo/RTL في Renter direction الحالي.

## 13.4 Backend stack الحالي

- TypeScript.
- Node/native HTTP architecture تاريخيًا.
- Raw parameterized SQL.
- `pg`.
- JWT.
- Node crypto.
- Supabase JS.
- Cloudflare Worker adapter (`worker.ts`).

## 13.5 Database

✅ **Supabase PostgreSQL** هو Source of Truth الحالي.

لا يوجد Prisma/ORM كقرار معماري حالي؛ الـPrototype يستخدم SQL مباشر/Repositories.

## 13.6 Storage

- Supabase Storage حاليًا لوسائط العقارات.
- Bucket تاريخي: `property-media`.

## 13.7 Authentication / Authorization

- Phone OTP للمستخدمين في Product concept.
- JWT sessions.
- RBAC.
- Role boundaries بين Owner/Renter/Admin.
- Admin login له مسار مستقل.

مواصفات تاريخية استُخدمت في Architecture، ويجب التحقق منها قبل Final production:

- OTP expiry: 5 minutes.
- OTP request throttling: 3 / 15 minutes.
- Access token: 15 minutes.
- Refresh token: 7 days.
- Brute force protections.

هذه ليست ضمانًا أن Live prototype يطبق كل قيمة بنفس الشكل الآن.

## 13.8 Current hosting/deployment

### GitHub

- Source control.
- CI validation.
- Deployment orchestration.

### Cloudflare Pages

Legacy project URLs:

- `https://sola-customer-app.pages.dev`
- `https://sola-owner-app.pages.dev`
- `https://sola-admin-app.pages.dev`

### Cloudflare Worker

- `https://sola-backend-api.essxm01.workers.dev`

### Supabase

- PostgreSQL.
- Storage.
- Service-role server access.

### Vercel

📌 كان الـPrimary hosting سابقًا.  
🔄 أصبح Legacy/Fallback بعد Rate-limit/deploy-loop incident.  
لا يُحذف بدون قرار صريح.

## 13.9 لماذا حدث انتقال Cloudflare؟

Vercel Hobby وصل تقريبًا إلى حد ~100 deployments في rolling 24h بسبب Push/Deploy loops في Monorepo.

القرار أصبح:

- one logical commit.
- one push.
- wait CI.
- one deployment.
- live verification.

## 13.10 Worker DB compatibility debt

الBackend الأصلي يعتمد على `pg.Pool` وTCP، بينما Cloudflare Workers لها قيود مختلفة.

🧪 الحل الحالي للـPrototype:

- `pg` حيث يعمل.
- targeted Supabase REST/PostgREST fallback لبعض Queries الضرورية في Worker runtime.

⚠️ هذا **ليس SQL engine عامًا** ولا يجب نسخه للنسخة النهائية، خصوصًا في:

- Transactions.
- `SELECT FOR UPDATE`.
- Wallet atomicity.
- Payout processing.
- Financial ledger mutations.

🚀 Recommendation للنسخة النهائية إن بقي Cloudflare Worker ضمن Architecture: **Hyperdrive + PostgreSQL/pg** أو Production DB approach بديل يحافظ على transaction semantics.

المؤسس قرر ألا يجعل Hyperdrive blocker يوقف تطوير الـDemo الحالي.

## 13.11 Paymob

✅ Paymob هو الاتجاه الحالي لبوابة الدفع من ناحية Product/Integration abstraction.  
⚠️ لا توجد Live production credentials مؤكدة حتى الآن.

Known prototype routes:

- `POST /api/v1/customer/bookings/:id/pay`
- `POST /api/v1/payments/webhook/paymob`
- `GET /api/v1/customer/bookings/:id/payment-status`

## 13.12 Deployment/runtime details useful for continuation

- Cloudflare Worker build moved إلى **Node 22** بعد Engine incompatibility مع Node 20 وWrangler/Supabase packages.
- `nodejs_compat` مستخدم في Worker compatibility layer.
- CORS تم إصلاحه تاريخيًا ليسمح بالـProduction Pages origins والـCloudflare preview subdomains مع `Vary: Origin` وOPTIONS صحيح.
- Frontend production API base يجب أن يشير إلى Worker `/api/v1`، وليس relative URL يعتمد على نفس origin.
- نجاح `wrangler deploy --dry-run` لا يعني أن Worker نُشر؛ يجب دائمًا إثبات deployment/version الحي.

## 13.13 Antigravity development environment

المؤسس يستخدم **Antigravity** كـExecution/Coding Agent، ويستخدم حاليًا نموذج **Gemini Flash 3.6 High** ضمن هذا السياق التنفيذي.

قاعدة governance:

> **ChatGPT defines product/architecture/UX direction; Antigravity executes.**

Antigravity ليس Product Manager ولا يحق له اختراع Business Rules أو تغيير Financial logic من نفسه.

---

# 14. Renter Mobile Application

## 14.1 الهدف

تجربة Mobile-first لاكتشاف الوحدة واتخاذ قرار الحجز بصورة طبيعية قبل إجبار المستخدم على إنشاء حساب.

## 14.2 قاعدة الدخول

✅ لا يوجد Mandatory login عند فتح التطبيق.

المستخدم يستطيع بدون حساب:

- Explore.
- Search.
- View results.
- Property details.
- Images.
- Amenities.
- Reviews.
- Availability.
- Pricing/quote.

Protected actions:

- Booking request.
- Favorite.
- Payment.
- Review.
- Account-specific content.

## 14.3 Bottom Navigation

الاتجاه المعتمد:

- **استكشف**
- **المفضلة**
- **حجوزاتي**
- **الحساب**

يختفي الـGlobal Bottom Nav داخل Full-screen Property Details decision flow.

## 14.4 Home / Explore

Purpose: discovery، وليس Dashboard.

المكونات:

- compact white header.
- search entry.
- destination discovery.
- real PUBLISHED feed.
- real property cards.
- trust/verification signals.

أمثلة وجهات مستخدمة في الـPrototype:

- مراسي.
- رأس الحكمة.
- سيدي عبد الرحمن.
- هاسيندا.
- الساحل الشمالي.

## 14.5 Search

المعايير الأساسية:

- Destination.
- Check-in.
- Check-out.
- Guests.

Filters محتملة/حالية:

- Property type.
- Max price.
- Bedrooms.
- Amenities إذا كانت البيانات تدعم.

القائمة النهائية للفلاتر يمكن أن تتطور.

## 14.6 Property Card

يجب أن تعرض المعلومات التي تساعد على قرار الاستكشاف دون ازدحام:

- صورة حقيقية.
- Title/location.
- Verified indicator.
- capacity basics.
- nightly price.
- favorite action.
- rating إذا كان حقيقيًا.

❌ لا Fake price.  
❌ لا Unsplash villa تُعرض كأنها الوحدة الحقيقية.

## 14.7 Property Details — Current approved UX

Full-screen Mobile view يتضمن:

1. Mobile gallery.
2. Back + favorite.
3. Title/location/verification.
4. Quick facts: guests/bedrooms/bathrooms.
5. Description.
6. Real amenities.
7. **Inline open availability calendar**.
8. Guest stepper.
9. Server quote.
10. Booking terms explanation.
11. Sticky bottom CTA لا يغطي المحتوى.

### Gallery

- mobile-sized controlled gallery.
- swipe/navigation.
- image count.
- real images only.

### Calendar

التقويم يجب أن يكون مفتوحًا أمام عين المستخدم، وليس مجرد Date inputs.

Required behavior:

- Arabic month grid.
- previous/next month navigation.
- past disabled.
- blocked dates disabled.
- first tap = check-in.
- second tap = check-out.
- start/end in Blue.
- all dates between highlighted light blue.
- live nights count.
- no manual fake dates.

### Stay length

✅ Global MVP:

- Minimum: **2 nights**.
- Maximum: **30 nights**.

ليست Owner-configurable في الـPrototype الحالي.

### Guest selector

- explicit +/-.
- min valid sensible count.
- max = real `maxGuests`.
- no hardcoded `4 guests`.

### Price summary

يأتي من Server quote ويظهر:

- price/night.
- nights.
- total stay.
- deposit.
- remaining amount.
- currency.

❌ لا SOLA/KONFRM commission split.  
❌ لا Owner wallet/entitlement.

## 14.8 Booking Request Review

قبل إنشاء الطلب يجب عرض Review screen/sheet:

- property summary.
- check-in/out.
- nights.
- guests.
- nightly price.
- total.
- deposit.
- remaining.

Copy direction:

> سيتم إرسال طلبك إلى المالك للموافقة أولًا. لن يتم تحصيل العربون قبل موافقة المالك.

Actions:

- Primary: **إرسال طلب الحجز**.
- Secondary: **تعديل التفاصيل**.

## 14.9 Auth interception

إذا كان المستخدم Guest وضغط Protected action:

`Current Context → OTP → Verify → Return to same context`

يجب حفظ:

- Property ID.
- Check-in.
- Check-out.
- Guests.
- Intended action.
- Quote context حيث يلزم مع إعادة validation server-side.

## 14.10 My Bookings

Human categories بدل عرض State Machine خام:

- طلبات قيد المراجعة.
- بانتظار دفع العربون.
- حجوزات مؤكدة.
- حجوزات سابقة.
- مرفوضة/ملغاة/منتهية.

## 14.11 Booking Details حسب الحالة

### PENDING_OWNER_APPROVAL

- request summary.
- بانتظار المالك.
- لا Payment CTA.

### APPROVED_PENDING_PAYMENT

- owner approved.
- deposit amount.
- payment CTA.
- payment window عندما يتم اعتماد مدته.

### CONFIRMED

- confirmation.
- stay/property details.
- remaining amount.
- لا يتم اختراع universal check-in time.

### REJECTED / EXPIRED

- explanation.
- browse alternatives.

## 14.12 Favorites

Protected action:

`Favorite while guest → OTP → return → complete favorite`

Favorites page تعرض real saved properties فقط.

## 14.13 Account / حسابي

### الاتجاه الحالي العملي لـRenter Account

- real phone/account identity.
- profile basics الموجودة فعلًا.
- bookings entry.
- favorites entry.
- logout.

### تاريخيًا

تمت مناقشة شاشة “حسابي” أوسع تشمل:

- اسم المستخدم.
- verification badge.
- contact data.
- settings.
- role/mode switching بين Renter وOwner.
- “أصبح مالكًا” إذا لم يتم Owner verification.

🔄 **التحديث الحالي:** المنتج الآن لديه Owner Mobile App وRenter Mobile App منفصلان، لذلك لا يجب افتراض أن Mode Switch القديم سيظهر داخل نفس التطبيق. underlying account concept يمكن أن يكون موحدًا، لكن UX النهائي للتبديل بين التطبيقين/الأدوار **يحتاج حسمًا في Final product**.

---

# 15. Owner Mobile Application

## 15.1 الهدف

توفير Workspace Mobile للمالك لإدارة هويته ووحداته وتواريخه وطلباته وأمواله بدون فوضى.

## 15.2 Authentication

- Phone OTP.
- session/JWT.

## 15.3 Owner Profile & Verification

✅ Owner verification:

1. ID Front.
2. ID Back.
3. Live Face.
4. Admin Review.

حالات مفاهيمية:

`UNVERIFIED → PENDING → VERIFIED / REJECTED`

Exact KYC provider في النسخة النهائية: TBD.

## 15.4 Property creation

Flow الحالي المفاهيمي:

`New Property → Draft → Details → Capacity/Amenities → Photos → Pricing → Verification requirements → Review → Submit → PENDING_REVIEW → Admin`

## 15.5 Property lifecycle UX

المستخدم قد يرى كلمات بشرية مثل:

- مسودة.
- جاهزة للإرسال.
- قيد المراجعة.
- منشورة.
- تحتاج تعديلات.
- مخفية/موقوفة.
- مؤرشفة.

بينما Backend enums يمكن أن تكون مختلفة.

## 15.6 Property data

- Type.
- location/address.
- bedrooms.
- bathrooms.
- maxGuests.
- amenities.
- description.
- pricing.
- images.
- availability.

## 15.7 Media rules

✅ لكل وحدة:

- 5–20 images.
- first image = cover.
- reorder allowed.
- moderation.

Forbidden:

- contact info.
- QR.
- watermark.
- video في الاتجاه الحالي للوحدة.

## 15.8 Property verification

✅ كل Property تُوثق بشكل مستقل عن توثيق المالك.

Unverified/unpublished property لا تظهر للعامة.

Exact ownership document taxonomy: TBD.

## 15.9 Editing protection

✅ Concept confirmed: Owner edits/archiving actions التي تهدد Booking integrity يجب أن تُقيد عندما توجد current/upcoming protected bookings.

Exact active-status mapping يجب الحفاظ عليه في Final production spec.

## 15.10 Calendar

Owner calendar أغنى من Customer calendar:

- availability.
- manual blocks.
- external bookings.
- maintenance blocks.
- daily prices.
- seasonal/dynamic pricing.

Customer لا يرى:

- owner income strategy.
- occupancy strategy.
- private annual pricing data.

## 15.11 Booking Requests

Owner يرى:

- property.
- dates.
- nights.
- guests.
- relevant customer trust context مع احترام privacy.
- price summary.
- approve/reject.

## 15.12 Wallet

Wallet buckets:

- Available.
- Pending.
- Held.
- Reserved for Payout.

قاعدة UX:

> نفس المبلغ لا يظهر في Bucketين في الوقت نفسه.

## 15.13 Payout

يظهر:

- gross amount.
- real provider fee.
- net amount.
- payout method.
- status.

## 15.14 Disputes

- case list.
- evidence.
- response.
- amount held.
- resolution status.

## 15.15 Analytics

مؤشرات تاريخية مصممة/منفذة في Owner scope:

- Occupancy.
- ADR.
- RevPAR.
- ALOS.
- Lead Time.
- Approval Rate.

ليست Priority في Renter MVP الحالي، ويجب تقييم حاجتها في النسخة النهائية بدل نقل كل Metrics تلقائيًا.

---

# 16. Admin Web Application

## 16.1 الهدف

Operational governance للمنصة، وليس مجرد Dashboard تجميلي.

## 16.2 Core navigation المعتمد

خمسة Areas رئيسية:

1. **Overview**
2. **Owner Verification**
3. **Property Review**
4. **Payout Requests**
5. **Disputes**

هذه هي الـCore navigation الحالية؛ يمكن أن توجد صفحات فرعية كثيرة تحتها.

## 16.3 Extended operational inventory التاريخي

📌 **Master Screen Inventory V1** تاريخيًا كان حوالي **21 شاشة رئيسية** وتم اعتماده كمرجع تصميم إداري في مرحلة سابقة. مع تطور المنتج، تم تبسيط الـTop-level navigation إلى 5 Areas رئيسية، بينما تبقى الشاشات التفصيلية كصفحات/Queues/Details تحتها.

مراحل التصميم السابقة غطت أيضًا:

- Admin Login.
- Dashboard/Overview.
- Owner management/list/detail.
- Owner verification queue/detail.
- Property management/review/detail.
- Bookings supervision.
- Payments monitoring.
- Payout requests/detail.
- Disputes list/detail.
- Notifications.
- Support.
- Admin users/permissions.
- Settings.

لا يجب تحويل كل هذه العناصر إلى Tabs رئيسية إذا كان التنظيم داخل الـ5 Core Areas أفضل.

## 16.4 Overview

- real metrics only.
- no hardcoded zeros.
- no fake counts.
- operational KPIs relevant to active queues.

## 16.5 Owner Verification Queue

- owner info.
- document status.
- waiting time.
- review action.
- reason/comments.

## 16.6 Property Review Queue

- title.
- type.
- location.
- price.
- owner.
- waiting time.
- status.
- search/filter.

Property detail review:

- all property information.
- media.
- owner verification context.
- review history.
- approve.
- reject with reason.
- audit trail.

## 16.7 Payout Queue

- requested amount.
- payout method.
- provider fee.
- balance validation.
- processing status.

## 16.8 Disputes

- booking context.
- evidence.
- held amount.
- renter/owner responses.
- admin decision.
- financial consequence.

## 16.9 Admin UI language

Use natural operational Arabic مثل:

- قيد المراجعة.
- اعتماد ونشر.
- رفض مع سبب.
- فشل الاتصال بالخادم.

Do not expose:

- FLOW-ADM-07.
- ROLE_ADMIN.
- Saga.
- FIFO.
- DB state labels.

---

# 17. User Flows — Renter

## 17.1 Discovery

`Open App logged out → Explore → Destination → Dates → Guests → Search → Results`

## 17.2 Property Decision

`Result → Property Details → Gallery → Trust → Quick Facts → Description → Amenities → Inline Calendar → Guests → Server Quote → Review`

## 17.3 Date Selection

`Tap Check-in → Tap Check-out → Highlight full range → Calculate nights → Validate 2–30 → Validate blocked dates`

## 17.4 Booking Request

`Review → If Guest: OTP → Restore same review → Submit real request → PENDING_OWNER_APPROVAL`

No payment here.

## 17.5 Owner response

- Approve → `APPROVED_PENDING_PAYMENT`.
- Reject → `REJECTED`.

## 17.6 Deposit Payment

`APPROVED_PENDING_PAYMENT → Payment CTA → Paymob → success → CONFIRMED`

## 17.7 Stay / Completion

High-level:

`CONFIRMED → Check-in/Stay → Completion → COMPLETED → Review eligible`

Exact check-in/out UX and timing rules تحتاج final validation.

## 17.8 Cancellation / Refund / Dispute

- Cancellation exists conceptually.
- Owner fault refund confirmed.
- full renter cancellation matrix TBD.
- dispute can freeze relevant money and escalate to Admin.

---

# 18. User Flows — Owner

## 18.1 Onboarding

`Owner Login → Profile → ID Front → ID Back → Live Face → Submit → Admin Review → Verified/Rejected`

## 18.2 Add Property

`Create Draft → Basic Details → Location → Capacity/Amenities → Images → Price/Calendar → Review → Submit`

## 18.3 Property Review

`PENDING_REVIEW → Admin Review → PUBLISHED / REJECTED`

If changes requested, Owner updates and resubmits وفق UX النهائي.

## 18.4 Booking Request

`Owner receives request → inspect dates/guests/price → Approve or Reject`

Approval creates payment entitlement/temporary hard inventory block; it does **not** by itself mean booking is confirmed.

## 18.5 Confirmed Stay

`Payment success → CONFIRMED → prepare handoff/stay → completion`

## 18.6 Wallet/Payout

`Pending funds → Available according to release rule → payout request → Reserved → Admin/provider processing → Completed/Released`

## 18.7 Dispute

`Dispute opened → funds held → Owner evidence/response → Admin resolution`

---

# 19. User Flows — Admin

## 19.1 Admin Auth

`Login → credentials validation → Admin session → operational dashboard`

## 19.2 Owner Verification

`Queue → Owner detail/docs → approve/reject → status + audit + notification`

## 19.3 Property Review

`Pending queue → Property detail/media/owner context → approve/reject → PUBLISHED/REJECTED → audit`

## 19.4 Payout

`Payout queue → validate wallet/reservation/method/fee → process → completed/rejected → ledger update`

## 19.5 Dispute

`Case → booking/evidence/funds → request evidence if needed → decision → release/refund/hold resolution`

## 19.6 Support / Exceptional cases

Support functionality exists داخل Admin/Disputes concept، لكن final staffing, SLA, escalation tiers, separate Support Agent role: TBD.


# 20. Business Rules — Confirmed Current Reference

هذا القسم هو أهم مرجع عملي. عند أي تغيير يجب تحديث Flow/State/API/Open Questions المرتبطة به.

## 20.1 Account & Access Rules

### BR-A01 — Public Browse
✅ المستخدم غير المسجل يستطيع Browse/Search/View Property/Calendar/Pricing قبل إنشاء حساب.

### BR-A02 — Protected Actions
✅ Booking request / Favorite / Payment / Review / account-specific content تحتاج Authentication.

### BR-A03 — Context Preservation
✅ بعد OTP يجب العودة إلى نفس:

- property.
- dates.
- guests.
- intended action.

### BR-A04 — Role Isolation
✅ Admin APIs لا يستهلكها Owner/Renter والعكس وفق RBAC.

### BR-A05 — Underlying account concept
✅ نفس الشخص يمكن أن يملك Renter/Owner capabilities مفاهيميًا، لكن Product surfaces الحالية منفصلة. طريقة UX النهائية للربط بين التطبيقين لم تُحسم.

## 20.2 Owner Verification Rules

### BR-O01
✅ Owner KYC = ID front + ID back + live face + Admin review.

### BR-O02
⚠️ Exact KYC provider/document retention/legal rules غير محددة.

## 20.3 Property Rules

### BR-P01 — Independent Property Verification
✅ كل وحدة يتم توثيقها بشكل مستقل؛ توثيق المالك وحده لا يجعل الوحدة Public.

### BR-P02 — Public Visibility
✅ فقط Property موثقة/منشورة يمكن عرضها للمستأجر.

### BR-P03 — Lifecycle
Conceptual UX:

`Draft → Complete → Submit Review → Under Review → Published → Hidden/Paused → Archived`

Backend historical enums تشمل:

- `DRAFT`
- `PENDING_REVIEW`
- `PUBLISHED`
- `REJECTED`
- `PAUSED`
- `SUSPENDED`
- `ARCHIVED`

### BR-P04 — Archive Restore
✅ `ARCHIVED → DRAFT` فقط عند السماح بالاستعادة.

### BR-P05 — Protected Booking Integrity
✅ لا تُسمح تعديلات/أرشفة/حذف يهدد Booking حالي أو قادم محمي.

### BR-P06 — Media
✅ 5–20 صور. الأولى Cover. Reorder + moderation.

### BR-P07 — Forbidden Media
✅ لا contact info / QR / watermark / video.

### BR-P08 — No fake listing content
✅ إذا السعر/الصورة/البيانات الحقيقية ناقصة، لا يتم اختلاق بديل يوهم المستخدم.

## 20.4 Availability Rules

### BR-V01 — Stay length
✅ Global MVP: **2–30 nights**.

### BR-V02 — Pending Request
✅ `PENDING_OWNER_APPROVAL` **لا يحجب التواريخ**.

### BR-V03 — Blocking statuses
✅ hard block فقط:

- `APPROVED_PENDING_PAYMENT`
- `CONFIRMED`

### BR-V04 — Non-blocking statuses
✅ لا تحجب future inventory:

- `PENDING_OWNER_APPROVAL`
- `REJECTED`
- `CANCELLED_BY_GUEST`
- `EXPIRED`
- `COMPLETED`

### BR-V05 — Quote is not a hold
✅ Price quote لا تحجز Inventory.

### BR-V06 — Revalidation
✅ Booking creation تعيد التحقق من Availability، حتى لو Quote سابقة نجحت.

### BR-V07 — Fail closed
✅ فشل DB/API لا يعني “كل الأيام متاحة”.

### BR-V08 — Competing requests
✅ عدة `PENDING_OWNER_APPROVAL` يمكن أن تستهدف نفس التواريخ.

⚠️ ماذا يحدث للطلبات المنافسة بعد موافقة المالك على طلب واحد؟ Open Question.

## 20.5 Booking Rules

### BR-B01 — Human decision first
✅ لا يتم إنشاء Booking قبل اختيار المستخدم التواريخ والضيوف ومراجعة السعر.

### BR-B02 — Request before payment
✅ `Request → Owner Approval → Deposit → Confirmed`.

### BR-B03 — No instant payment
✅ ممنوع دفع العربون داخل Property Details قبل Owner approval.

### BR-B04 — Booking request state
✅ بعد الإرسال: `PENDING_OWNER_APPROVAL`.

### BR-B05 — Owner approve
✅ → `APPROVED_PENDING_PAYMENT`.

### BR-B06 — Owner reject
✅ → `REJECTED`.

### BR-B07 — Booking Snapshot
✅ بعد confirmation يجب حفظ Historical snapshot لسعر/بيانات الحجز حتى لا تتغير نتيجة تعديل الوحدة لاحقًا.

### BR-B08 — Self-service modification
✅ قاعدة مسترجعة: نافذة تعديل ذاتي **60 دقيقة بعد confirmation**.

🟡 Full UX والسياسة بعد الـ60 دقيقة تحتاج مراجعة في Final build.

### BR-B09 — Request expiry
⚠️ exact duration غير محسومة. 24h ظهر في code/history لكنه لم يعتمد كقاعدة نهائية.

### BR-B10 — Payment window after approval
⚠️ exact duration غير محسومة.

## 20.6 Financial Rules

### BR-F01 — Deposit
✅ `deposit = actual first-night price`.

### BR-F02 — Platform commission
✅ `KONFRM commission = deposit × 20%`.

### BR-F03 — Owner entitlement
✅ `owner net deposit = deposit − commission` = 80% من العربون.

### BR-F04 — Remaining
✅ `remaining balance = total booking value − deposit`.

### BR-F05 — Commission on remaining
✅ `0%`.

### BR-F06 — No payment before approval
✅ لا يتم تحصيل العربون قبل موافقة المالك.

### BR-F07 — Customer financial privacy
✅ Renter UI/API لا يعرض:

- platform commission.
- owner net entitlement.
- wallet/payout internals.

### BR-F08 — Server authority
✅ Client يرسل booking intent فقط، ولا يرسل authoritative price.

### BR-F09 — Money precision
✅ money calculations server-side، integer cents/decimal-safe؛ DB final production يستخدم `NUMERIC(12,2)` أو مكافئ مناسب، لا FLOAT.

### BR-F10 — Owner-fault refund
✅ إذا الخطأ/الإلغاء من المالك حسب السيناريو المعتمد: **100% deposit refund + 0 platform commission**.

### BR-F11 — Dispute hold
✅ dispute مالي فعال يجمد المبلغ المرتبط في `heldBalance`.

### BR-F12 — Owner wallet release
✅ Current rule: Owner net electronic deposit ينتقل `Pending → Available` **24h after check-in**.

📌 تاريخيًا تم تطبيق هذه القاعدة أولًا قبل اعتماد business decisions في مرحلة قديمة؛ أحدث مرجع للمشروع يعاملها كقاعدة حالية. يجب إعادة validation قانوني/تشغيلي في Final production.

### BR-F13 — Minimum payout
✅ Current rule: **500 EGP**.

📌 أيضًا كانت تاريخيًا ضمن قواعد طُبقت قبل approval ثم أصبحت ضمن Current master rules. Revalidate contract/provider in production.

### BR-F14 — Payout provider fee
✅ Owner يتحمل **actual provider fee**، لا fake percentage/formula.

### BR-F15 — Payout reservation
✅ `Available → ReservedForPayout → Completed / Released`.

### BR-F16 — Ledger idempotency
✅ كل حركة Wallet لها immutable ledger entry + idempotency key.

### BR-F17 — Money separation
✅ أي Remaining balance يتم تحصيله خارج electronic platform wallet لا يجوز أن يُضاف كرصيد إلكتروني وهمي للمالك.

> هذا لا يعني أن `CASH_ON_ARRIVAL` هي الطريقة الوحيدة أو المعتمدة للمتبقي.

### BR-F18 — Remaining payment method
⚠️ Cash / electronic / both لم تُحسم كقاعدة نهائية عامة.

## 20.7 Review Rules

### BR-R01
✅ Review فقط بعد `COMPLETED` stay.

## 20.8 Communication Rules

### BR-C01
✅ latest direction = In-app chat only.

### BR-C02
✅ no exposed phone numbers in current product direction.

### BR-C03
❌ historical “contact after approval” superseded.

## 20.9 Admin Rules

### BR-AD01
✅ Admin actions must be audit-able.

### BR-AD02
✅ Admin cannot use fake counts/metrics.

### BR-AD03
✅ Reject actions should include reason where relevant.

### BR-AD04
✅ UI language is human Arabic, not internal engineering labels.

---

# 21. Booking Workflow — Detailed Product Logic

## 21.1 Browse & Discover

`Guest opens app → Explore → Search/filters → Real property results`

No account required.

## 21.2 Property Decision

Before any booking intent, user needs:

- images.
- trust indicators.
- description.
- amenities.
- capacity.
- real availability.
- dates.
- guests.
- price quote.

## 21.3 Calendar selection

- Calendar inline and visible.
- start/end selection by tapping days.
- in-between days highlighted.
- 2-night min.
- 30-night max.
- blocked dates cannot be selected.
- user sees number of nights immediately.

## 21.4 Quote

Renter sends intent:

```json
{
  "propertyId": "...",
  "checkIn": "YYYY-MM-DD",
  "checkOut": "YYYY-MM-DD",
  "guests": 4
}
```

Server:

1. loads real PUBLISHED property.
2. reads authoritative price.
3. validates guests.
4. validates stay length.
5. validates availability.
6. calculates nights/total/deposit/remaining.
7. returns customer-safe DTO.

## 21.5 Review before submission

المستخدم يجب أن يرى summary كاملًا ويؤكد Intent.

إذا غير مسجل:

`Review → OTP → Return to same Review`

## 21.6 Submit request

Server يعيد:

- auth.
- property status.
- owner link.
- guest count.
- dates.
- availability.
- authoritative price.

ولا يعيد 201 إلا بعد نجاح DB persistence.

## 21.7 Pending owner approval

`PENDING_OWNER_APPROVAL`:

- no payment.
- does not block dates.
- multiple competing requests allowed.

## 21.8 Owner approval

`APPROVED_PENDING_PAYMENT`:

- dates hard-block.
- renter gets payment CTA.
- exact payment deadline: TBD.

## 21.9 Deposit payment

- deposit = first night.
- Paymob boundary.
- success → `CONFIRMED`.
- failure → remains unconfirmed; retry expected.
- expiry behavior: TBD.

## 21.10 Confirmed

- booking snapshot fixed.
- availability blocked.
- stay proceeds.

---

# 22. Financial Workflow

## 22.1 Confirmed Financial Rules

### Formula

Let:

- `P1` = actual first-night price.
- `T` = total stay value.

Then:

```text
deposit = P1
KONFRM commission = deposit × 20%
owner net deposit = deposit − commission
remaining balance = T − deposit
commission on remaining = 0
```

### Payment timing

✅ No payment before Owner approval.

### Customer view

يعرض فقط:

- nightly price.
- nights.
- total.
- deposit.
- remaining.

### Owner electronic wallet

Current conceptual buckets:

- Pending.
- Available.
- Held.
- ReservedForPayout.

### Release

✅ Current accounting rule: Owner net deposit يصبح Available بعد **24h من check-in**.

### Payout

✅ minimum 500 EGP.  
✅ provider actual fee on Owner payout.  
✅ reserve funds during processing.

### Owner fault

✅ full deposit refund to renter.  
✅ KONFRM commission = 0.

## 22.2 Proposed / Architecture Rules needing production validation

- Hold/controlled release through platform/payment-provider arrangement.
- Short atomic transactions for wallet/payout.
- Provider-specific payout rails.
- Admin processing of payout queue.
- Payment webhook-driven state updates.

## 22.3 Open Financial Questions

1. Exact payment window after Owner approval.
2. Exact booking request expiry before approval.
3. Exact method(s) for remaining balance.
4. Payment provider fee treatment on refund/cancellation.
5. Chargeback process.
6. No-show financial treatment.
7. Partial refund rules.
8. Renter cancellation refund matrix by timing.
9. Payment retry limits and expiry.
10. Failed payout provider-specific behavior.
11. Whether/how confirmation of check-in triggers accounting clock in final product.
12. How platform invoices/receipts are structured.
13. Tax/VAT/e-invoicing implications.

## 22.4 Financial Edge Cases

- Payment succeeds at provider but webhook delayed.
- duplicate webhook.
- retry after ambiguous provider response.
- owner approves while inventory changes elsewhere.
- two customers approved incorrectly due race condition.
- chargeback after Owner payout.
- dispute opened while funds are Reserved for payout.
- payout rejected after provider fee calculation.
- refund while payout is pending.
- partial service failure after booking state changes.
- zero/negative/malformed pricing.
- dynamic nightly pricing changes after booking confirmation.

## 22.5 Financial Risks

- Race conditions.
- balance drift.
- duplicate payouts.
- double charging.
- stale quotes.
- misclassifying cash as wallet balance.
- illegal/incorrect escrow terminology.
- chargeback liability.
- provider settlement mismatch.

## 22.6 Required Legal Clarifications

- هل Paymob يسمح بالـholding/release model المقصود؟
- من يمتلك الأموال قانونيًا أثناء الـhold؟
- هل يمكن استخدام كلمة Escrow؟
- KYC obligations للملاك.
- Marketplace/payout regulatory structure.
- VAT/tax/e-invoicing.
- invoice party.
- refund timing.
- chargebacks.
- consumer rights.
- village/compound rental restrictions.

---

# 23. Escrow, Hold & Ledger

## 23.1 Terminology

⚠️ لا تستخدم **Escrow** كادعاء قانوني مؤكد قبل validation.

الوصف الأكثر أمانًا حاليًا:

- Controlled Hold.
- Pending balance.
- Financial hold.
- Controlled release.

## 23.2 Ledger requirements

- immutable entries.
- every mutation traceable.
- idempotency key.
- before/after balance.
- booking/payment/payout/dispute references.
- no floating-point money.
- audit-friendly timestamps.

## 23.3 Wallet buckets

### Pending
صافي العربون الإلكتروني قبل release timing.

### Available
ما يمكن طلب سحبه.

### Held
ما تم تجميده بسبب dispute أو قرار مالي.

### Reserved for Payout
Available balance تم حجزه لطلب سحب قائم.

## 23.4 Payout lifecycle

`Available → Reserve → PENDING_ADMIN_PROCESSING → COMPLETED / REJECTED / CANCELLED → Consume or Release reservation`

---

# 24. Cancellation & Refunds

## 24.1 Confirmed

✅ Owner fault → full deposit refund + 0 KONFRM commission.

## 24.2 Historical but not safely final

📌 ظهرت قواعد تاريخية مثل “تراجع المستأجر = لا عودة للعربون”، لكنها لم تُسترجع بدرجة كافية كCurrent final universal policy.

## 24.3 Open

- renter cancellation before owner approval.
- after approval before payment.
- after deposit.
- close to check-in.
- after check-in.
- owner cancellation timing and penalties.
- partial refunds.
- provider fee responsibility.
- admin override boundaries.

---

# 25. Verification & Trust

## 25.1 Owner KYC

✅ ID front + ID back + live face + Admin review.

## 25.2 Property verification

✅ كل Property تُراجع وتوثق بشكل مستقل.

⚠️ exact ownership documents غير محسومة. Historical candidates:

- National ID.
- Property deed.
- Lease/management authorization.
- Other supporting docs.

لكن هذه taxonomy ليست Final Requirement حتى الآن.

## 25.3 Property moderation

- media review.
- prohibited contact info/QR/watermark.
- publication only after review.

## 25.4 Renter verification

⚠️ beyond phone/account authentication، مستوى KYC المطلوب للمستأجر قبل/بعد حجز عالي القيمة لم يُحسم.

## 25.5 Historical privacy concepts requiring reconfirmation

📌 وثائق مبكرة تضمنت أفكارًا مثل إخفاء الموقع الدقيق وبيانات التواصل قبل مراحل متقدمة من الحجز، والسماح للمالك بإخفاء صورته بعد نجاح التحقق.

- **بيانات التواصل:** تم حسمها لاحقًا إلى in-app chat/no phone exposure.
- **الموقع الدقيق:** مستوى الإخفاء قبل/بعد confirmation يحتاج إعادة حسم في Final UX/Security spec.
- **صورة المالك:** ليست قاعدة Current مؤكدة؛ تحتاج قرارًا إذا كانت ستظهر للمستأجر أصلًا.

## 25.6 Fraud prevention

- verified owners.
- verified property.
- server-authoritative pricing.
- public-safe DTO.
- audit trails.
- payment after approval.
- no direct phone exposure in latest direction.

---

# 26. Reviews & Reputation

✅ Only completed stays can create reviews.

أهداف:

- منع fake reviews.
- ربط التقييم بمعاملة فعلية.
- مساعدة المستأجر على القرار.
- تحسين accountability للمالك والوحدة.

⚠️ تفاصيل مثل review dimensions، الرد على review، moderation، dispute of review، abuse policy لم تُحسم نهائيًا.

---

# 27. Disputes

## 27.1 Conceptual flow

`Issue → Open dispute → Hold relevant money → Evidence → Owner response → More evidence/Admin escalation → Resolution → Release/Refund`

## 27.2 State machine الحالي

```text
OPENED
→ UNDER_OWNER_RESPONSE
→ WAITING_FOR_MORE_EVIDENCE
→ ESCALATED_TO_ADMIN
→ RESOLVED
```

⚠️ exact timeout 24/48/72/manual = TBD.

## 27.3 Evidence types في Architecture

- Image.
- Video.
- Document.
- Text.

Exact UX/limits تحتاج final design.

---

# 28. Notifications & Messaging

## 28.1 Notifications

Domains المهمة:

- owner/property verification.
- booking request.
- owner approval/rejection.
- payment due/success/failure.
- booking confirmation.
- cancellation/refund.
- dispute.
- payout.

Exact Push provider/APNS/FCM architecture في Production: TBD.

## 28.2 Messaging

✅ Current direction: **In-app chat only**.

❌ no exposed phone.  
❌ no voice call.  
❌ no masked calling.

Need future decisions حول:

- realtime technology.
- message retention.
- moderation/reporting.
- contact info detection.
- file/image sharing.

---

# 29. State Machines

## 29.1 Booking State Machine

```text
PENDING_OWNER_APPROVAL
  ├─ Owner Rejects → REJECTED
  ├─ Request Expires → EXPIRED  [duration TBD]
  └─ Owner Approves → APPROVED_PENDING_PAYMENT
                         ├─ Payment Success → CONFIRMED
                         └─ Payment Window Expires → behavior TBD

CONFIRMED
  ├─ Cancellation paths
  ├─ Dispute paths
  └─ Stay completion → COMPLETED
```

### Inventory behavior

- `PENDING_OWNER_APPROVAL` → non-blocking.
- `APPROVED_PENDING_PAYMENT` → blocking.
- `CONFIRMED` → blocking.
- `REJECTED/CANCELLED/EXPIRED/COMPLETED` → no future block.

## 29.2 Property State Machine

Backend/operational states recovered:

- `DRAFT`
- `PENDING_REVIEW`
- `PUBLISHED`
- `REJECTED`
- `PAUSED`
- `SUSPENDED`
- `ARCHIVED`

UX may use friendlier labels.

Confirmed:

`ARCHIVED → DRAFT` only when restoration is allowed.

## 29.3 Property Verification

```text
UNVERIFIED
→ PENDING_VERIFICATION
→ VERIFIED
  or
→ REJECTED
```

## 29.4 Owner Verification

Conceptually:

`UNVERIFIED → PENDING → VERIFIED / REJECTED`

Exact DB enum naming may differ.

## 29.5 Payment State Machine

🟡 Known concepts:

- NOT_DUE before approval.
- DUE after approval.
- initiated.
- success.
- failed/retry.

⚠️ exact production enum/state machine not final.

## 29.6 Payout State Machine

```text
PENDING_ADMIN_PROCESSING
→ COMPLETED
→ REJECTED
→ CANCELLED_BY_OWNER
```

with financial reservation:

`Available → Reserved → Completed/Released`.

## 29.7 Dispute State Machine

```text
OPENED
→ UNDER_OWNER_RESPONSE
→ WAITING_FOR_MORE_EVIDENCE
→ ESCALATED_TO_ADMIN
→ RESOLVED
```

## 29.8 Refund State Machine

⚠️ incomplete.

Confirmed only:

- owner fault full deposit refund.
- dispute hold can resolve to refund/release.

---

# 30. Data Model

## 30.1 Confirmed / existing domain entities

Current/recovered architecture includes:

1. Users/Owners identity.
2. User sessions.
3. Admin users.
4. Properties.
5. Property verification documents.
6. Property images/media.
7. Property availability/blocks.
8. Bookings.
9. Booking snapshots.
10. Booking financial summaries.
11. Owner wallets.
12. Wallet ledger entries.
13. Payout methods.
14. Payout requests.
15. Disputes.
16. Financial dispute holds.
17. Dispute evidence.
18. Notifications.
19. Chat conversations/messages.
20. Payment transactions.
21. Audit logs.

## 30.2 Important relationships

```text
User/Owner 1 ── N Properties
Property 1 ── N Media
Property 1 ── N Availability/Blocks
Property 1 ── N Bookings
Booking ── Financial Summary
Booking ── Snapshot
Owner ── Wallet
Owner/Wallet ── N Ledger Entries
Owner ── N Payout Requests
Booking ── Dispute(s) subject to rules
Dispute ── N Evidence
```

## 30.3 IDs

✅ UUIDs للكيانات الأساسية.

Historical bugs بسبب non-UUID IDs تم إصلاحها باستخدام `crypto.randomUUID()` وphone-to-UUID approaches في بعض prototype paths.

## 30.4 Money fields

🚀 Final production principle:

- DB decimal type مثل `NUMERIC(12,2)`.
- server calculations in integer cents/decimal-safe form.
- currency EGP في السوق الحالي.

## 30.5 Open database decisions

- final normalized User/Owner/Renter identity model.
- favorite entity details.
- review schema/details.
- cancellation/refund records.
- payment provider settlement tables.
- exact inventory exclusion/locking constraints.
- background jobs/event outbox.
- notification delivery records.
- KYC document retention/encryption.

---

# 31. API Considerations

## 31.1 Public Renter boundaries

Public:

- property search.
- property details.
- availability.
- quote calculation.

Protected:

- booking mutation.
- favorites.
- payment.
- review.
- account data.

## 31.2 Availability

Intended route:

`GET /api/v1/customer/properties/:id/availability`

Customer-safe response concept:

```json
{
  "propertyId": "...",
  "unavailableRanges": [],
  "minStay": 2,
  "maxStay": 30
}
```

Must fail closed.

## 31.3 Quote

`POST /api/v1/customer/bookings/calculate`

Client sends intent only.

Customer response only:

- propertyId.
- dates.
- nights.
- guests.
- pricePerNight.
- totalStay.
- depositAmount.
- remainingAmount.
- currency.

## 31.4 Booking creation

`POST /api/v1/customer/bookings`

Must:

- authenticate.
- property PUBLISHED.
- valid owner.
- valid guests.
- valid 2–30 date range.
- revalidate availability.
- authoritative DB price.
- persist booking before returning 201.

## 31.5 Owner APIs — known areas

- auth request/verify/refresh.
- profile/verification.
- properties.
- submit property.
- calendar.
- bookings.
- approve/reject.
- wallet.
- ledger.
- payouts.
- disputes.
- analytics.
- documents.
- messaging/notifications.

## 31.6 Admin APIs — known areas

- auth.
- overview stats.
- owner verification queue/detail/action.
- property pending/all/detail.
- approve/reject property.
- payouts queue/process.
- disputes queue/resolve.
- operational support/audit.

## 31.7 API security principles

- RBAC.
- tenant/ownership checks.
- no Service Role in frontend.
- no internal financial split in Renter DTO.
- no unpublished public access.
- no fake publication ID bypass.
- errors must not be silently converted into successful empty state.

---

# 32. Security

## 32.1 Prototype security position

المؤسس يعتبر الـPrototype disposable وغير مخصص للإطلاق العام، لذلك تسريب بعض أسرار Demo تاريخيًا **ليس أولوية تشغيلية كبيرة** بالنسبة له الآن.

مع ذلك:

- لا يجب تكرار secrets داخل prompts/files بلا داعٍ.
- لا يتم وضع server secrets في frontend/VITE variables.
- Final production must use fresh credentials entirely.

## 32.2 Production requirements

🚀 قبل الإطلاق الحقيقي:

- rotate all demo secrets.
- separate dev/staging/prod.
- proper secret manager.
- Admin MFA.
- rate limiting.
- WAF/abuse protection.
- secure password/session strategy.
- KYC provider security.
- encryption/retention policy.
- audit logging.
- backups/DR.
- webhook verification + idempotency.
- security review/pentest as appropriate.

## 32.3 Known historical incident

Plaintext DB/JWT values ظهرت تاريخيًا في prototype config/Git context، ثم أزيلت. بما أن المنتج النهائي سيُعاد بناؤه، المبدأ:

> **Never reuse any prototype credential in production.**

---

# 33. UX Principles

## 33.1 Human decision flow

كل شاشة يجب أن تجيب:

- لماذا موجودة؟
- ما القرار الذي يأخذه المستخدم؟
- ما البيانات التي يحتاجها؟
- ما الخطأ المتوقع؟
- ما التالي؟

## 33.2 User chooses; system does not invent

❌ لا default booking dates.  
❌ لا hardcoded guest count.  
❌ لا fake booking reference.  
❌ لا fake price.  
❌ لا fake property media.

## 33.3 Required UX states

كل flow مهم:

- Loading.
- Success.
- Empty.
- Validation failure.
- Network failure.
- Server failure.
- Timeout.
- Retry.

## 33.4 Natural Arabic

- لا developer jargon.
- لا enums.
- لا internal workflow names.
- الرسالة تشرح ماذا حدث وماذا يفعل المستخدم بعده.

## 33.5 Mobile-first means mobile

Renter/Owner لا يتحولان لموقع Desktop عند 1440px.

في Prototype يمكن الحفاظ على max-width ~430px centered mobile canvas على desktop demo.

## 33.6 No dark identity drift

White dominant دائمًا، Blue main action، Summer Yellow accent.

---

# 34. Owner Research & Market Validation

## 34.1 لماذا التواصل مع الملاك؟

Marketplace يعتمد على Supply. الهدف ليس مجرد إقناع المالك بالتسجيل، بل فهم:

- ما أكثر شيء يزعجه في التأجير الحالي؟
- كيف يدير Calendar؟
- ما الذي يجعله يرفض منصة؟
- ما الذي يجعله يثق بها؟
- هل KYC مرهق؟
- هل عمولة المنصة مقبولة؟
- ما المشاكل مع العملاء/العربون/الإلغاء؟
- ما الذي يتمنى أن تحله أداة جديدة؟

## 34.2 أسلوب التواصل المفضل

المؤسس يريد بحثًا:

- سريعًا.
- قليل الاحتكاك.
- لا يبدو كاستجواب.
- لا يبدو Survey Corporate.
- يعطي قيمة لرأي المالك وخبرته.

Pattern تمت مناقشته:

1. opener قصير لطلب الإذن.
2. لا Logo/Link/Image في أول رسالة.
3. لا قائمة 10 أسئلة.
4. شجّع المالك يرسل **Voice Note 1–2 minutes** على WhatsApp.
5. اسأله أساسًا عن:
   - أكبر مشكلة في تجربة التأجير.
   - أهم شيء يتمنى أن تحله منصة/أداة.

Exact outreach script يجب reconfirm قبل حملة فعلية.

## 34.3 ما الذي نريد تعلمه؟

- Owner pain severity.
- willingness to use digital calendar.
- KYC resistance.
- willingness to wait for controlled payout.
- preferred communication.
- cancellation expectations.
- supply liquidity.
- commission sensitivity.
- operational habits.

## 34.4 Validation principle

✅ Validate with real Owners/Renters before large spend.  
✅ Learn objections.  
🟡 limited paid acquisition can be used for validation.  
⚠️ exact CAC/demand funnel not known.

---

# 35. Go-to-Market & Launch

## 35.1 Immediate objective

ليس Public Launch كبيرًا الآن.

الهدف:

> Prototype convincing enough for product learning + professional software company handoff.

## 35.2 Supply first

Quality inventory critical. Owner outreach/verification/content quality are foundational.

## 35.3 Demand acquisition

⚠️ exact channels/creative/media budget not finalized.

Potential channel thinking can include social/search/referrals later, but no current approved media plan.

## 35.4 Market positioning

KONFRM ليس:

- الأرخص بأي ثمن.
- أكبر كمية وحدات بأي جودة.

الاتجاه:

- real units.
- more trustworthy owners.
- clear availability.
- trackable booking.
- clearer payment process.
- organized experience.
- admin intervention عند الحاجة.

---

# 36. Implementation Partner / الشركة المنفذة

## 36.1 Current understood offer

- Build cost: **~25,000 EGP**.
- Admin Web App.
- Owner Mobile App.
- Renter Mobile App.
- Support: 6 months.
- Hosting/server/database/infrastructure: 6 months according to current understanding.

## 36.2 Unconfirmed commercial details

⚠️ التكلفة بعد 6 أشهر غير مؤكدة.

ذاكرة تقريبية:

- ~2,000 EGP/year.
- أو ~4,000 EGP لكل خدمة.

يجب عدم استخدامها كFact قبل مراجعة العرض/العقد.

## 36.3 Critical Questions Before Contract

1. من يملك Source Code؟
2. من يملك Git repository؟
3. من يملك Database project/account؟
4. من يملك Server/Cloud account؟
5. KONFRM.COM يبقى تحت سيطرة المؤسس؟
6. Apple Developer account ownership؟
7. Google Play account ownership؟
8. Payment/KYC/API credentials ownership؟
9. Backup policy؟
10. Disaster recovery؟
11. Exit/migration plan؟
12. Maintenance cost بعد 6 أشهر؟
13. Bug-fix SLA؟
14. Support scope؟
15. Scope changes/change requests pricing؟
16. Intellectual Property assignment؟
17. Documentation deliverables؟
18. Deployment process؟
19. Environments dev/staging/prod؟
20. Warranty على Critical bugs؟
21. Ownership of analytics/push/email/SMS provider accounts؟
22. Handover if company relationship ends؟

---


# 37. Roadmap / Project Phases

## Phase A — Thinking & Validation

المرحلة المستمرة حاليًا بالتوازي مع التطوير: حسم المنطق، مقابلة/استطلاع الملاك، اكتشاف الأسئلة والمخاطر.

## Phase B — Functional Prototype / Operational MVP

🧪 يبنيه المؤسس باستخدام Antigravity.

الهدف:

- اختبار كل Role.
- اختبار Cross-app states.
- كشف Edge Cases.
- الوصول إلى UX يمكن عرضه.
- بناء Product Blueprint للشركة.

## Phase C — Final MVP by Development Company

🚀 الشركة تعيد البناء Production-grade مع الحفاظ على Product Logic المعتمد، وليس بالضرورة إعادة استخدام كود الـPrototype.

## Phase D — Initial Commercial Launch

⚠️ غير مجدول نهائيًا بعد. يجب أن يسبقه:

- legal/payment validation.
- production security.
- verified supply.
- stable booking/payment flows.
- App Store/Google Play readiness.
- support/operations readiness.

## Phase E — Future Expansion

Features غير ضرورية للـInitial Launch لا تدخل تلقائيًا في الـMVP، مثل ancillary services، insurance، broker programs، subscriptions وغيرها.

---

# 38. Final Software Company Handoff Requirements

## 38.1 Must Preserve — Product Logic

الشركة يجب أن تحافظ على:

- KONFRM brand direction ما لم يغيره المؤسس.
- actor responsibilities.
- Renter/Owner Mobile + Admin Web split.
- core user journeys.
- financial formulas.
- booking/availability semantics.
- verification model.
- guest browse-first.
- natural Arabic UX.
- white/blue/summer-yellow direction.
- no payment before approval.

## 38.2 Must Rebuild/Validate Production-grade

### Mobile
اختيار React Native/Flutter/native أو غيره قرار هندسي للشركة؛ React/Vite demo ليس stack إلزاميًا.

### Backend
- robust framework.
- observability.
- rate limiting.
- typed API/OpenAPI.
- background jobs/queues as needed.
- reliable event processing.

### Database
- migrations.
- transactional integrity.
- row locking/constraints.
- inventory concurrency.
- backups/DR.
- audit.

### Payments
- real Paymob/provider contract.
- holding/settlement legality.
- refunds.
- chargebacks.
- webhook security/idempotency.
- PCI boundary.

### Security
- fresh credentials.
- environments.
- MFA Admin.
- WAF/rate limits.
- KYC security.
- secret manager.
- security audit.

### Legal
- terms/privacy.
- rental compliance.
- tax/e-invoice.
- payout/KYC obligations.
- consumer rights.

## 38.3 Demo-only technical debt not to copy blindly

- targeted SQL-to-REST matcher.
- Worker compatibility hacks.
- demo OTP values.
- old test data.
- web-based mobile canvas if final native app is chosen.
- disposable secrets.
- legacy SOLA project names.

---

# 39. Risk Register

لا توجد نسب رقمية لعدم وجود بيانات empirical كافية.

| ID | الخطر | الاحتمالية النوعية | التأثير | الوضع/التخفيف الحالي |
|---|---|---|---|---|
| R-01 | Fake owner | Material | High | KYC + Admin review |
| R-02 | Fake property/stolen media | Material | High | independent property verification + media moderation |
| R-03 | Deposit scam | Material | Critical | structured payment after owner approval |
| R-04 | Double booking | Material | Critical | availability + server revalidation + blocking states |
| R-05 | Multiple pending requests | Expected | Medium/High | allowed; resolution after first approval TBD |
| R-06 | Stale/incorrect availability | Material | High | fail-closed + canonical DB, current Worker issue unresolved |
| R-07 | Payment provider failure | Material | High | payment abstraction + retry architecture |
| R-08 | Chargeback | Material | High | audit trail; policy TBD |
| R-09 | Owner cancellation/no-delivery | Material | High | full deposit refund rule + dispute |
| R-10 | Renter cancellation/no-show | Material | High | policy incomplete |
| R-11 | Property mismatch | Material | High | verification + evidence/dispute |
| R-12 | Refund delay | Material | High | requires provider/legal workflow |
| R-13 | Payout failure | Material | High | reserved bucket + ledger |
| R-14 | Ledger/balance drift | Low if architecture respected | Critical | idempotency + transactions needed in prod |
| R-15 | Worker DB workaround breaks finance | Current technical debt | Critical | narrow use only; production rebuild |
| R-16 | KYC drop-off | Material | Medium/High | optimize onboarding; validate with owners |
| R-17 | Admin operational overload | Increases with scale | High | queues + future staffing/automation |
| R-18 | Escrow/legal misrepresentation | Material | Critical | do not claim regulated escrow without legal approval |
| R-19 | Tax/VAT/e-invoice uncertainty | TBD | High | legal/accounting review |
| R-20 | Compound/village subletting restrictions | TBD | High | legal research |
| R-21 | Off-platform transactions | Material | High | in-app chat/no phone + value incentives |
| R-22 | Commission bypass | Material | Medium/High | controlled contact/payment flow |
| R-23 | Review abuse | Material | Medium | completed-stay restriction; moderation TBD |
| R-24 | Vendor dependency | Material | High | ownership/exit clauses needed |
| R-25 | Prototype over-engineering | Historically likely | Medium | demo-first strategy |
| R-26 | AI hallucinated business rule | Historically high | High | single source + BLOCKED protocol |
| R-27 | False “100% complete” reports | Historically high | High | evidence/LIVE VERIFIED taxonomy |
| R-28 | Brand/UI drift | Repeated | Medium | visual contract |
| R-29 | Prototype secret exposure | Known | Low for disposable demo / Critical if reused | never reuse in production |
| R-30 | Infrastructure/free-tier limitation | Material | Medium | document prototype-only compromises |
| R-31 | Brand/trademark conflict | ⚠️ Not researched in current record | High if exists | trademark/legal search before major launch |

---

# 40. Important Edge Cases

## Booking / Availability

- two renters request same dates while pending.
- owner approves one while another remains pending.
- availability changes between Quote and Submit.
- booking overlaps blocked period.
- external owner booking added late.
- maintenance block added after pending request.
- adjacent checkout/check-in boundaries.
- 1-night vs 2-night min.
- >30-night request.

## Payments

- provider response timeout.
- payment succeeded but webhook delayed.
- duplicate webhook.
- payment failure then retry.
- payment window expires.
- refund after commission accounting.
- chargeback after owner payout.

## Owner

- owner KYC rejected.
- owner wants to edit property during active booking.
- owner archives by mistake.
- owner cancels after deposit.
- owner does not deliver unit.

## Renter

- user authenticates halfway through booking.
- app must restore dates/context.
- renter cancels before/after payment.
- no-show.
- claims mismatch on arrival.

## Admin

- evidence conflict.
- payout while dispute exists.
- user/property suspended.
- provider payout fails.
- manual override needs audit.

## Data/Infrastructure

- DB request fails.
- storage image unavailable.
- API returns stale data.
- CI green but deploy old revision.
- frontend deployed but backend worker not deployed.

---

# 41. Open Questions — Master Register

## 41.1 Business

1. ماذا يحدث للـcompeting `PENDING_OWNER_APPROVAL` requests عندما يوافق المالك على واحد؟
2. Exact booking request expiry.
3. Exact payment deadline بعد Owner approval.
4. Full renter cancellation policy.
5. Owner cancellation penalties beyond confirmed refund rule.
6. No-show policy.
7. هل 20% من one-night deposit يكفي كBusiness Model طويل المدى؟
8. هل يصبح هناك subscriptions/promoted listings لاحقًا؟

## 41.2 Product

1. Final Account architecture عبر Owner/Renter apps مع unified identity.
2. هل يوجد role switch أم deep-link between apps أم مجرد shared identity؟
3. final check-in/check-out confirmation UX.
4. exact support center scope.
5. exact notification matrix.
6. exact modification policy بعد أول 60 دقيقة.

## 41.3 Financial

1. remaining balance method: cash/electronic/both.
2. payment window.
3. refund matrix.
4. payment provider fees عند refund/cancellation.
5. chargeback accounting.
6. failed payout behavior.
7. check-in financial trigger verification.

## 41.4 Legal

1. holding/escrow legality.
2. marketplace payment settlement model.
3. owner KYC obligations.
4. renter KYC requirements.
5. tax/VAT/e-invoice.
6. consumer protection.
7. village/compound rental rules.
8. privacy/data retention.
9. trademark/name clearance for KONFRM.

## 41.5 Technical

1. final mobile technology: React Native / Flutter / native / other.
2. final backend framework.
3. final production DB connection/transaction architecture.
4. inventory concurrency strategy/DB constraints.
5. background jobs/queues.
6. realtime chat architecture.
7. push notifications provider.
8. observability/logging.

## 41.6 Security

1. Admin MFA implementation.
2. final rate limits.
3. KYC document encryption/retention.
4. fraud monitoring.
5. secure account recovery.
6. security testing before launch.

## 41.7 UX

1. final Renter Account content.
2. Owner account/profile content.
3. exact cancellation UX.
4. dispute evidence UX.
5. final review dimensions.
6. accessibility requirements.

## 41.8 Operations

1. Admin staffing/SLA.
2. owner verification review time.
3. property review turnaround.
4. dispute SLA.
5. payout processing SLA.
6. support escalation.

## 41.9 Vendor / Development Company

كل الأسئلة الواردة في Section 36.3، خصوصًا ownership، maintenance، exit plan، accounts، IP، SLA، backups.

## 41.10 Launch

1. exact launch geography.
2. supply target before launch.
3. minimum inventory quality threshold.
4. beta cohort.
5. launch date.

## 41.11 Marketing

1. exact demand channels.
2. CAC assumptions.
3. creative strategy.
4. referral program.
5. owner acquisition incentives.

## 41.12 Branding

1. final logo/system.
2. trademark clearance.
3. typography finalization.
4. whether code/deployment legacy SOLA names need migration before demo/company handoff.

---

# 42. Decision Log

| الموضوع | القرار القديم | القرار الحالي | الحالة | سبب/ملاحظة |
|---|---|---|---|---|
| اسم المشروع | Yalla Masyaf | SOLA ثم **KONFRM** | ✅ Current | آخر قرار Branding |
| الدومين | غير محسوم | **KONFRM.COM** سنة | ✅ Purchased | ~500 EGP |
| Listing model | Ad-centric | Persistent Property entity | ✅ | تقليل التكرار وربط calendar/bookings |
| حساب المستخدم | هويات/أدوار منفصلة مفاهيميًا | shared identity concept مع Owner/Renter surfaces منفصلة | 🟡 | final account UX TBD |
| Renter entry | Mandatory/login أو simulator | Browse-first بدون Login | ✅ | تقليل friction |
| Renter form factor | Responsive website | Mobile Application | ✅ | قرار صريح |
| Owner form factor | Web-like | Mobile Application | ✅ | قرار صريح |
| Admin form factor | — | Web Application | ✅ | operational use |
| Customer UI | navy/desktop | White-dominant mobile | ✅ | rejected old visual direction |
| Brand palette | mixed/navy | White + Blue #0059FF + Summer Yellow #FFD700 | ✅ | current visual contract |
| Contact | reveal details after approval | in-app chat only/no phone | ✅ latest | privacy/control |
| Booking payment | instant/early payment concepts | Request → approval → deposit | ✅ | owner approval first |
| Deposit | %/other formulas considered historically | actual first-night price | ✅ | current financial rule |
| Commission | various/total booking | 20% of deposit only | ✅ | fixed clarification |
| Remaining commission | possible | 0% | ✅ | fixed |
| Stay length | undefined/default | 2–30 nights global MVP | ✅ 2026-08-18 | founder approval |
| Pending request availability | hard-block in old logic | does not block | ✅ 2026-08-18 | avoid uncommitted inventory lock |
| Hard blocking | many active statuses | APPROVED_PENDING_PAYMENT + CONFIRMED | ✅ | current canonical rule |
| Quote pricing | client arithmetic | server-authoritative | ✅ | prevent manipulation |
| Availability failure | `catch → []` | fail closed | ✅ | prevent false availability |
| Customer financial DTO | internal split shown | customer-safe summary only | ✅ | UX/privacy |
| Remaining payment | CASH_ON_ARRIVAL hardcoded | not universally decided | ⚠️ | invented rule removed |
| Check-in time | 2:00 PM hardcoded | no universal time | ⚠️ | property-level/final rule TBD |
| Hosting | Vercel primary | Cloudflare primary, Vercel fallback | ✅ MVP | deploy limits |
| DB Worker path | raw pg only | targeted PostgREST fallback for MVP | 🧪 | Worker compatibility workaround |
| Hyperdrive | migrate immediately | production recommendation, not MVP blocker | ✅ strategy | demo-first |
| Prototype goal | final codebase mindset | functional demo/product learning | ✅ | company will rebuild |
| Antigravity | autonomous coding partner | execution-only agent | ✅ | prevent product drift |
| Task tracking | scattered task/report files | one authoritative task board | ✅ | context discipline |

---

# 43. Deprecated / Rejected Decisions

## 43.1 Yalla Masyaf/SOLA as current Brand
❌ ليسا الاسم الحالي. يبقيان historical/legacy فقط.

## 43.2 Customer Booking Simulator as Home
❌ rejected.

## 43.3 Desktop Website Customer UX
❌ rejected.

## 43.4 Navy-dominant surfaces
❌ rejected.

## 43.5 Instant deposit CTA on property page
❌ rejected.

## 43.6 Fake user decisions
❌ default dates / guests / fake booking states.

## 43.7 Fake runtime business data
❌ fake price/owner/customer/property media/metrics.

## 43.8 Availability error → empty array
❌ rejected fail-open pattern.

## 43.9 Exposing internal commission split to renter
❌ rejected.

## 43.10 Universal 2:00 PM check-in
❌ rejected as invented.

## 43.11 Universal CASH_ON_ARRIVAL
❌ rejected as invented universal policy.

## 43.12 Pill Admin navigation
❌ rejected repeatedly.

## 43.13 Developer jargon in user UI
❌ rejected.

## 43.14 Hyperdrive as reason to freeze MVP product work
❌ rejected as blocker; still valid production architecture consideration.

## 43.15 Deployment spam
❌ repeated commits/deploy experiments rejected.

---

# 44. Future Ideas — Not Current Requirements

- cleaning services.
- maintenance services.
- concierge.
- damage insurance.
- accredited broker accounts.
- property management companies.
- promoted listings.
- subscriptions.
- expanded owner analytics.
- geographic expansion.
- richer reputation system.

أي فكرة هنا تحتاج تقييم MVP/Later ولا تُنفذ تلقائيًا.

---

# 45. Founder Working Style

هذا القسم ملزم لأي AI يعمل مع المؤسس.

## 45.1 طريقة التفكير

- يهتم جدًا بالتفاصيل المنطقية.
- يسأل باستمرار: **ماذا يحدث إذا؟**
- يريد Edge Cases قبل التنفيذ، لا بعده.
- يريد فهم المنطق لا مجرد UI جميل.
- يحب تجربة المنتج بنفسه من كل Role.
- يريد الوصول للشركة وهو يفهم المنتج بعمق.
- يفضل Real Product behavior على slide/mockup فقط.
- لا يحب Over-engineering لا يخدم الهدف.
- لا يريد تجاهل edge cases المهمة بحجة “MVP”.

## 45.2 طريقة اتخاذ القرار

- يريد Trade-offs.
- يريد Failure Modes.
- يريد Pushback حقيقي.
- لا يريد ChatGPT يوافق لمجرد الإرضاء.
- إذا فكرة سيئة: يجب قول ذلك بوضوح.
- لا يريد Sunk Cost Fallacy؛ شراء domain أو تنفيذ feature لا يجعل القرار مقدسًا.
- قد يتحمس ويتعجل أحيانًا في Branding/شراء شيء يعجبه؛ دور AI أن يوازن الحماس بتحليل استراتيجي.

## 45.3 طريقة التنفيذ

- Task by Task.
- Clusters محدودة ومترابطة.
- لا تفتح 10 جبهات معًا.
- لا micro-manage كل زر إذا يمكن تنفيذ Batch منطقي.
- لا تقفز للمرحلة التالية قبل إغلاق الحالية.
- يفضل مراجعة بعد Milestone فعلي.

## 45.4 ما يزعجه جدًا

- نسيان قرارات سابقة.
- إعادة قرار تم رفضه.
- Hallucination.
- Agent يخترع Business Rule.
- “100% complete / Zero Gaps” بلا دليل.
- CI green يُقدم كدليل UX.
- شغل سريع لا يدرس الشاشة.
- خلط Mobile وWeb.
- نسيان White/Blue/Yellow identity.
- Fake data.
- طلب Debugging تقني معقد منه عندما يستطيع Agent القيام به.

## 45.5 تقسيم المسؤوليات المفضل

### Founder

- يجرب المنتج بعين المستخدم.
- يرسل Screenshot.
- يقول ما لم يعجبه/ما لم يفهمه.
- يحسم Business/Product decisions.

### ChatGPT

- Product/UX/Architecture/Business reasoning.
- يحافظ على context.
- يكتشف التناقض.
- يحدد next bounded scope.
- يكتب أوامر Antigravity.
- يراجع evidence.

### Antigravity

- Inspect code/logs/DB.
- Plan within scope.
- Implement.
- Test.
- Self-fix.
- Regression.
- Deploy with discipline.
- Return evidence.

---

# 46. Instructions for Any Future AI Working on KONFRM

1. اقرأ هذه الوثيقة كاملة قبل اقتراح قرارات كبيرة.
2. اعتبرها Source of Truth إلى أن يصدر قرار أحدث من المؤسس.
3. **KONFRM هو الاسم الحالي.** لا تستخدم SOLA/Yalla Masyaf كاسم حالي.
4. إذا ظهرت SOLA في repo/code، اعتبرها Legacy identifier لا Brand الحالي.
5. لا تعيد فتح قرار محسوم بدون سبب قوي جديد.
6. إذا تعارض قرار جديد مع قديم، أحدث قرار من المؤسس يفوز، ثم حدّث Decision Log.
7. لا تفترض معلومة ناقصة.
8. فرّق دائمًا بين Confirmed / Proposed / Open / Prototype-only / Production.
9. لا توافق المؤسس تلقائيًا؛ مارس Pushback حقيقيًا.
10. عند Pushback: اشرح المشكلة، الأثر، البدائل، والتوصية.
11. افحص Edge Cases قبل اعتماد Flow.
12. فكر من أدوار Founder / Renter / Owner / Admin / Developer / Finance / Legal / Security / Investor / Operations / UX.
13. لا تجعل Architecture تعقّد Prototype بلا عائد واضح.
14. لا تجعل Prototype workaround يصبح تلقائيًا Production architecture.
15. Prototype current priority = real behavior + integration + UX، لا Enterprise perfection.
16. ابحث أولًا عن Free Tier/Trial للـPrototype قبل اقتراح اشتراك مدفوع.
17. لا تستخدم Mock/Fake في Core flows إذا يمكن استخدام real data.
18. Build/CI ليسا Live Verification.
19. لا تقل “LIVE VERIFIED” دون تجربة البيئة الحية.
20. لا تستخدم “100% complete / perfect / zero gaps” دون دليل موضوعي.
21. Customer/Owner = Mobile. Admin = Web.
22. White dominant + Blue `#0059FF` + Summer Yellow `#FFD700`.
23. لا Navy dominant.
24. لا Fake property image/price/user/booking decision.
25. Renter browses قبل Login.
26. OTP بعد Protected action ويجب Restore Context.
27. لا Payment قبل Owner approval.
28. Deposit = actual first-night price.
29. Commission = 20% of deposit only.
30. لا Commission على remaining balance.
31. Customer لا يرى platform/owner financial split.
32. Availability: pending owner request لا block؛ approved pending payment + confirmed block.
33. Stay = 2–30 nights في MVP.
34. Quote server-authoritative؛ client لا يرسل price authoritative.
35. Availability failure must fail closed.
36. Booking creation revalidates availability and price.
37. Persistence must succeed before 201.
38. لا تخترع check-in time/payment method/cancellation policy.
39. عند Feature جديدة وضح: الفائدة، التكلفة، التعقيد، المخاطر، MVP vs Later.
40. عند تعديل Booking Flow افحص التأثير على Payment/Availability/Notifications/Owner/Renter/Admin/Refund/Ledger.
41. عند التعامل مع المدفوعات لا تفترض legal rules.
42. لا تجعل Renter يرى Backend State Machine كواجهة.
43. Arabic copy بشرية، لا engineering jargon.
44. كل flow يجب أن يحتوي loading/error/retry/success/empty حيث ينطبق.
45. عند Product decision جديد: حدث Business Rules + Flow + State + Open Questions + Decision Log + Current Status.
46. لا تطلب من المؤسس Network/SQL diagnostics يدويًا إذا يستطيع Agent استخراجها.
47. عند استخدام Antigravity، أعطه scope محدد + non-goals + stop conditions.
48. لا تسمح Antigravity بmass refactor أو schema/business changes بدون قرار.
49. لا Deployment spam.
50. حافظ على Maximum Useful Context — Minimum Noise.

---

# 47. Antigravity Operating Protocol

## 47.1 Governance

> **ChatGPT defines; Antigravity executes.**

## 47.2 Authoritative Task Board

الـRepo الحالي يستخدم Legacy filename:

`SOLA_EXECUTION_TASKS.md`

هذا هو task board التنفيذي الحالي. لا تنشئ `task.md`, `final_report.md` عشوائيًا.

عند انتقال البراند للكود يمكن إعادة التسمية إلى KONFRM في مهمة منفصلة، لا mass rename تلقائي.

## 47.3 Prompt template

أي Prompt كبير لـAntigravity يجب أن يحتوي:

### CONTEXT
أين نحن وما حالة Live.

### OBJECTIVE
نتيجة واحدة واضحة.

### USER EXPERIENCE INTENT
ما القرار/الشعور المطلوب للمستخدم.

### INSPECT FIRST
Files/API/DB/contracts.

### NON-NEGOTIABLES
Business/financial/platform/visual.

### SCOPE
ماذا ينفذ.

### NON-GOALS
ماذا لا يلمس.

### IMPLEMENTATION ORDER
خطوات متسلسلة.

### FAILURE MODES
DB/API/network/validation.

### TESTING
Focused tests.

### VISUAL QA
Actual screenshots عند UI.

### LIVE VERIFICATION
Exact live scenario.

### STOP CONDITIONS
أي Product decision → BLOCKED.

### DEPLOYMENT
one logical commit/push/deploy.

### REPORT
Evidence only.

## 47.4 Execution sequence

`Inspect → Plan → Update Task Board → Implement → Test → Self-fix → Retest → Regression → Local Verify → One Commit → One Push → Live Verify → Evidence Report`

---

# 48. Current Project Status — اقرأ هذا أولًا عند الاستكمال

## 48.1 Brand

**KONFRM — كونفرم**

## 48.2 Domain

**KONFRM.COM** — purchased for one year, ~500 EGP.

## 48.3 Stage

**Functional Prototype / MVP Validation / Product Learning**

## 48.4 Current Builder

Founder using **Antigravity** (Gemini Flash 3.6 High in current workflow), with ChatGPT as product/architecture/UX reasoning layer.

## 48.5 Current Systems

- Admin Web App.
- Owner Mobile App.
- Renter Mobile App.
- Shared backend/data.

## 48.6 Connected Infrastructure

- GitHub.
- GitHub Actions.
- Supabase PostgreSQL.
- Supabase Storage.
- Cloudflare Pages.
- Cloudflare Worker.
- Vercel legacy/fallback.
- Paymob architecture only; live payment creds not confirmed.

## 48.7 What has been proven historically

✅ Owner/Admin property lifecycle was Live-verified historically:

```text
Owner OTP
→ Create Property
→ Submit
→ PENDING_REVIEW
→ Admin Queue
→ Approve
→ PUBLISHED
→ Owner sees PUBLISHED
```

## 48.8 Current Renter implementation status

Current approved/implemented direction includes:

- mobile shell.
- Explore.
- real published property feed direction.
- Property Details.
- gallery.
- inline availability calendar UI.
- guest stepper.
- server quote architecture.
- Booking Review.

## 48.9 Critical current blocker — Live Availability Calendar

**آخر تجربة مباشرة من المؤسس:** Property Details الجديدة ظهرت Live، لكن التقويم ما زال يعرض:

> **"تعذر تحميل بيانات التوفر من الخادم"**

Execution agent شخّص سببين:

1. `availability` كانت تحت Customer auth gate وتتطلب JWT رغم أن Public browsing يجب أن يسمح بها.
2. Cloudflare Worker targeted PostgREST fallback لم يكن يدعم Bookings availability query.

Agent reported fixes/commits:

- `2f3c652` — stay rules + canonical blocking logic.
- `255f8aa` — public availability + Supabase REST blocking query transport.
- `8ac8546` — Worker deployment step in CI.

لكن **حتى آخر User-confirmed screenshot لم يتم إثبات أن Worker live serving `workers.dev` يحمل الإصلاح النهائي ويرجع 200 للتوافر الحقيقي**.

لذلك:

> **Renter Property Decision Cluster = NOT LIVE VERIFIED YET.**

## 48.10 Current immediate objective

قبل أي Booking submission/Auth expansion:

1. Verify actual Worker production deployment revision.
2. Use real PUBLISHED Property UUID.
3. `GET /api/v1/customer/properties/{real UUID}/availability` without Login → HTTP 200.
4. Open live Renter App.
5. Calendar month grid appears.
6. blocked days disabled.
7. select valid range.
8. range highlight + nights.
9. choose guests.
10. server quote.
11. white Booking Review.

**ثم فقط** يبدأ الـNext Cluster:

```text
Booking Review
→ OTP Login
→ Context Restore
→ Submit Real Booking Request
→ PENDING_OWNER_APPROVAL
→ Owner App Receives Request
```

ثم:

```text
Owner Accept/Reject
→ Renter status update
→ Payment only after approval
```

## 48.11 Production Plan

External development company rebuild.

- estimated: ~25,000 EGP.
- 3 applications.
- 6 months support.
- 6 months infrastructure according to current understanding.
- annual costs after that: unconfirmed.

## 48.12 Current main objective in one sentence

> **اكتشاف أخطاء المنطق والـBusiness Rules والـUX عبر Prototype حقيقي ومتكامل قبل تسليم متطلبات دقيقة لشركة التطوير النهائية.**

---

# 49. Recommended Next Step

✅ **الخطوة المنطقية التالية ليست Feature جديدة.**

أولًا أغلق مشكلة Live Availability end-to-end:

`Production Worker revision → public availability 200 → live calendar renders → range → guests → quote → review`

بعد نجاحها، ابدأ Cluster واحد فقط:

`Review → OTP → Restore → Submit Request → Owner sees PENDING_OWNER_APPROVAL`

لا تبدأ Payment حتى Owner Accept/Reject synchronization يصبح Live ومقنعًا.

---

# 50. Glossary

## KONFRM
الاسم الحالي الرسمي للمنصة.

## Yalla Masyaf / SOLA
أسماء تاريخية لنفس المشروع؛ قد تظهر في الملفات والكود القديم.

## Property / Unit
الوحدة الساحلية الأساسية.

## Listing
طريقة عرض Property؛ ليس كيان Ad مستقلًا في Core model.

## Renter / Customer / Guest
المستخدم الباحث عن إقامة. `Guest` قد يعني أيضًا unauthenticated user حسب السياق.

## Owner / Host
مالك/مدير الوحدة المصرح له.

## Availability
الفترات المتاحة/غير المتاحة.

## PENDING_OWNER_APPROVAL
طلب ينتظر قرار المالك؛ لا يحجب التواريخ.

## APPROVED_PENDING_PAYMENT
وافق المالك، لم يدفع المستأجر العربون؛ يحجب التواريخ مؤقتًا.

## CONFIRMED
تم دفع العربون وأصبح الحجز مؤكدًا.

## Deposit / عربون
سعر أول ليلة الفعلي.

## Commission
20% من العربون لصالح KONFRM.

## Remaining Balance
إجمالي الإقامة ناقص العربون.

## Hold
تجميد/تعليق أموال حسب حالة تشغيلية.

## Escrow
مصطلح قانوني لا يُستخدم كادعاء نهائي قبل validation.

## Ledger
سجل غير قابل للتلاعب لحركات المحفظة/الأموال.

## Pending Balance
صافي العربون الإلكتروني قبل release.

## Available Balance
رصيد قابل للسحب.

## Held Balance
رصيد مجمد بسبب dispute.

## Reserved For Payout
رصيد متاح تم حجزه لطلب سحب.

## Payout
تحويل أموال المالك إلى وسيلة سحب.

## KYC
توثيق هوية المستخدم/المالك.

## Property Verification
توثيق الوحدة بشكل مستقل.

## Snapshot
نسخة تاريخية ثابتة من بيانات الحجز/السعر.

## Idempotency
منع تنفيذ الحركة المالية نفسها مرتين عند تكرار الطلب.

## Customer-safe DTO
بيانات API للمستأجر لا تحتوي PII/internal finance/admin metadata غير لازمة.

## Fail Closed
عند فشل الأمان/التوافر يمنع النظام العملية بدل افتراض نجاحها.

## LIVE VERIFIED
تم إثبات العمل على البيئة الحية، وليس Local/CI فقط.

---

# 51. Document Maintenance Protocol

هذه الوثيقة يجب أن تكون **Living Single Source of Truth**.

بعد كل قرار جوهري:

1. حدّث Current Decision.
2. انقل القرار القديم إلى Decision History/Deprecated إذا كان مهمًا.
3. حدّث Business Rule.
4. حدّث User Flow.
5. حدّث State Machine.
6. حدّث Open Questions.
7. حدّث Current Project Status.
8. نفّذ Consistency Audit.
9. أضف تاريخ التحديث.

لا تحذف التاريخ المفيد بصمت.

---

# 52. Final Continuation Checklist for a New ChatGPT Project

قبل أي جلسة عمل جديدة:

- [ ] قرأت Executive Snapshot.
- [ ] قرأت Current Project Status.
- [ ] عرفت أن Brand الحالي KONFRM.
- [ ] لم أستخدم SOLA/Yalla Masyaf كBrand حالي.
- [ ] راجعت Open Questions.
- [ ] عرفت Current Cluster.
- [ ] راجعت Business Rules المتعلقة بالمهمة.
- [ ] راجعت Platform Contract: Renter/Owner Mobile, Admin Web.
- [ ] راجعت Visual Contract.
- [ ] لم أحول Code default إلى Business Rule.
- [ ] لم أستخدم superseded decision.
- [ ] لم أخلط Prototype مع Production.
- [ ] عرفت معيار LIVE VERIFIED.
- [ ] إذا احتجت Antigravity، كتبت Scope + Non-goals + Stop Conditions.

---

# 53. Closing Principle

قبل أي Feature أو قرار جديد في KONFRM اسأل:

> **هل هذا يجعل تجربة إيجار المصيف أكثر ثقة، وضوحًا، وتنظيمًا وتحكمًا للمستخدم — أم أنه مجرد كود/تعقيد أكثر؟**

إذا كان مجرد كود أكثر، فهو ليس أولوية.

الهدف من الـPrototype الحالي هو أن يستطيع المؤسس في النهاية فتح التطبيقات أمام شركة التطوير ويقول:

> **"ده المنتج اللي في دماغي. دي الرحلة. دي القواعد. دي التفاصيل. ابنوه Production-grade بنفس المنطق والتجربة."**

</div>

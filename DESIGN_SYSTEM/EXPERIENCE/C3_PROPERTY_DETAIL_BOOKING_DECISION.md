# C3 — Customer Screen 06 Property Details / Booking Decision

**Status:** Design Lab final direction for C3  
**Scope:** Screen 06 and only the narrow truth handoff required into Screen 07  
**Non-goals:** No business-rule, backend-contract, payment, lifecycle or architecture change.

## North star

> هل هذه الوحدة مناسبة لي؟ هل التواريخ مناسبة؟ كام السعر الحقيقي؟ وهل أريد أراجع طلب حجز لها؟

Screen 06 is **hospitality evaluation → stay selection → price understanding → booking decision**. It is not a property encyclopedia and not instant booking.

## Final vertical hierarchy

1. Property Gallery Hero
2. Property Decision Header
3. Essential Stay Facts
4. Short Description
5. Key Amenities Preview
6. Booking Decision Section: dates summary, inline availability calendar, guest selector
7. Server-authoritative Quote
8. Calm Booking Process Explanation
9. Secondary Details / Rules
10. Sticky Decision Bar

Decision controls appear before long secondary detail.

## Gallery

- Edge-to-edge, photography-led.
- Target roughly 4:3, capped around 304px on wider mobile.
- Horizontal swipe is the primary gallery interaction.
- Keep Back, Favorite and image counter.
- Remove mobile previous/next arrows when swipe is available.
- Back/Favorite prefer 48×48px targets.
- Tap image may open an embedded full-screen gallery overlay.
- No-image state uses a light neutral placeholder, not a large dark slab.
- Do not show a verification/trust badge unless a customer-facing canonical claim explicitly authorizes that wording.

## Identity and facts

Order: Title → public canonical location → canonical nightly price → property type as secondary metadata → capacity / bedrooms / bathrooms.

Working typography: title ~22px / 800; nightly price ~18px / 800; body ~14px; metadata ~12–13px.

Do not show 0 ج.م as a price. Use open fact rows rather than nested fact cards.

## Description and amenities

Description: 3-line collapsed preview; عرض المزيد inline; hide the section if no canonical description exists.

Amenities: preview roughly 4 key canonical amenities; عرض كل المرافق (N) for the rest; open grid/rows rather than a rounded card per amenity; hide the section if empty.

## Booking decision section

Heading: **اختار إقامتك**

Dates, Calendar, Guests and Quote should feel like one coherent decision zone.

## Calendar

Use an **always-inline single-month calendar** inside Screen 06.

- no separate dates page;
- no required modal/sheet for the main calendar;
- start/end use KONFRM Blue;
- selected range uses soft blue;
- blocked and past dates are visibly disabled;
- month controls >=44px;
- date hit target >=44px;
- preserve local-calendar-day semantics;
- no emoji helper copy;
- conflict messages stay inline near the calendar.

Inherited invalid dates should be explained rather than silently discarded.

## Guest selector

Place directly after the calendar.

- Row structure: label/capacity + minus/value/plus.
- Minus/Plus prefer 48×48px.
- Minimum 1.
- Maximum from canonical property capacity.
- Reaching max is a disabled state, not a warning.
- If inherited guests are clamped down, use one neutral explanatory notice.

## Quote

Visible booking total is **server-authoritative only**.

Before valid dates: nightly canonical price may be visible; no booking total.

Loading: جاري حساب السعر...; no local estimate.

Success hierarchy:
1. إجمالي الإقامة
2. number of nights
3. العربون بعد موافقة المالك
4. المبلغ المتبقي
5. nightly price as secondary breakdown if useful

Failure: تعذر حساب السعر حاليًا + إعادة حساب السعر; no zero, stale total or client-calculated fallback.

Customer never sees commission, Owner net, wallet or payout internals.

## Booking-process explanation

Do not style the normal booking process as an amber warning.

Use calm explanatory treatment:

1. أرسل طلب الحجز — لا يتم الدفع الآن.
2. المالك يراجع الطلب.
3. بعد الموافقة يصبح دفع العربون هو الخطوة التالية.
4. Successful canonical payment is what moves the booking to confirmed.

No countdown, fake urgency or invented deadline.

## Secondary details

After the decision area, show additional property data progressively: beds/area, house rules, additional instructions and other secondary details.

Hide optional empty sections rather than creating empty cards. Only canonical check-in/out rules may be shown.

## Sticky decision bar

Visible from Screen 06 entry and safe-area aware.

- No dates → اختيار التواريخ
- Check-in only → اختيار تاريخ المغادرة
- Availability loading → disabled جاري تحميل التوفر...
- Availability failure → recovery إعادة تحميل التوفر
- Quote loading → disabled جاري حساب السعر...
- Quote failure → recovery إعادة حساب السعر
- Quote ready → canonical total + مراجعة طلب الحجز

Do not use احجز الآن, ادفع الآن or تأكيد الحجز because Screen 06 does not perform those actions.

## Truth and visibility

Remove unconditional trust claims such as إقامة موثقة من كونفرم, إقامة موثقة or مضمونة unless a customer-facing canonical contract explicitly defines and supports the claim.

Location may use only public canonical data. Do not invent fallback geography.

Favorite is appropriate as a secondary gallery action. Share is not required for C3 unless separately approved as scope.

## State behavior

- Property detail loading: structural skeletons.
- Property detail failure: explicit error + retry; booking decision cannot continue from unverified detail.
- Availability loading: calendar-shaped skeleton.
- Availability failure: property can remain visible; booking fails closed + retry.
- Quote loading: no fake number.
- Quote error: inline error + retry.
- Missing images: light placeholder.
- Missing optional description/amenities/rules: omit the section.
- Offline/stale truth must not be presented as a newly verified booking decision.

## Narrow Screen 07 handoff

C3 may require only truth-preserving handoff fixes into Booking Review:

- remove unconditional trust claim;
- pass/display canonical quote values only;
- preserve canonical property identity/context;
- keep إرسال الطلب ≠ دفع ≠ حجز مؤكد.

Full Screen 07 redesign remains C4 work.

## Mobile acceptance

Required layout evidence: 360×800, 390×844, 430×932.

Check gallery proportions, long Arabic title/location, touch comfort, calendar range/blocked dates, guest stepper, quote transition, sticky bar overlap/safe area, error/retry states and no horizontal overflow.

Designated Founder physical-device review remains the strongest final evidence for mobile feel.

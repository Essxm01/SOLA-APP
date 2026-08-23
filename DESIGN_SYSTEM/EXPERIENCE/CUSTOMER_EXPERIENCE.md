# Customer experience contract

Customer is a leisure/travel booking user. Their journey is **discover → evaluate → trust → choose dates → request → wait → pay deposit → confirmed → communicate → stay**.

## Information priority

| Screen/domain | Primary user question | First information | Primary action | Keep secondary/hidden |
|---|---|---|---|---|
| Explore | أين أجد إقامة مناسبة؟ | Real image, destination, capacity, nightly price, availability cue | Open property/search | Operational property fields, internal reviews |
| Property detail | هل تناسبني هذه الإقامة؟ | Image, title, location, guest fit, dates, canonical price summary | Choose dates / continue booking | Long detail behind expansion |
| Calendar/dates | هل التواريخ متاحة وكم سأدفع؟ | Available/blocked dates, guest count, canonical quote | Continue | Technical availability/transaction details |
| Booking request | هل أفهم ما سأرسله؟ | Dates, total, deposit-after-approval explanation, remaining balance | Send request | Owner/internal workflow |
| Booking detail | ماذا يحدث في حجزي؟ | Human booking status, dates, payment next step | State-specific action | Raw IDs/internal status enum |
| Payment | ما الذي سأدفعه الآن؟ | Property, booking reference, total, deposit, remaining, prototype disclosure | Complete prototype payment | Commission, owner net, wallet |
| Chat | كيف أتواصل بشأن حجزي؟ | Property/booking context and conversation | Send message when permitted | Admin/audit context |
| Profile/trips | ما رحلاتي وحسابي؟ | Current/upcoming booking summary and account details | Continue current trip/account task | Owner finances/operations |

Primary booking CTAs may be full-width/large on mobile. Share, favorite, policy viewing and chat remain secondary unless their state makes them the next task. Customer sees decision-relevant prices, deposit, remaining amount, dates and status—but never KONFRM commission, owner net, owner wallet, payout data or admin audit information.

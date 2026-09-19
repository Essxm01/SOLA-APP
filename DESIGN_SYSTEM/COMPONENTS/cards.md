# Card, MetricCard, ListRow, PropertyCard and BookingCard shells

Cards are light: `surface.primary`, `border.default`, `radius.card`, `cardPadding`, and at most `shadow.subtle`. Borders and spacing take precedence over shadow.

| Contract | Required content | Notes |
|---|---|---|
| Standard | coherent grouped content | not a decorative container stack |
| Interactive | standard card plus clear action/focus state | whole-card click must remain accessible |
| MetricCard | label, one primary number, supporting context | does not invent dark KPI slabs |
| Summary | concise status/value/action | suitable for a decision moment |
| Selected | standard card plus selected border/surface | selection is not colour-only |
| Warning | semantic warning context | not a new yellow brand-card type |
| ListRow | title, supporting metadata, optional trailing action | predictable height and divider logic |
| PropertyCard shell | real image (1.4:1), independent favorite button, title before location, compact facts, prominent price per night | shared across Explore, Search Results, Favorites; never fake property imagery or synthetic badges |
| BookingCard shell | booking identity, property, dates/status and contextual action | no raw enum label to users |

## Shared PropertyCard Anatomy (Phase 5 / Screen 03)

The `PropertyCard` is the canonical discovery unit across Explore, Search Results, and Favorites:
- **Media**: 1.4:1 aspect ratio (`aspect-[1.4/1]`), real photography or neutral `#F1F5F9` placeholder with icon and "لا توجد صورة".
- **Favorite Action**: Top-left floating heart button with >=48px touch target; active state is KONFRM Blue `#0059FF`; handles pending state gracefully.
- **Hierarchy**: Title (16px `font-extrabold`, `line-clamp-2`) placed strictly before canonical location (13px `font-medium`, `line-clamp-2`, muted `text-slate-500`).
- **Facts**: 13px `font-medium` compact row (X ضيوف · Y غرف · Z حمام) formatted truthfully without zero-values.
- **Price**: 18–20px `font-extrabold` in EGP with clean suffix `/ ليلة` (eliminates redundant "السعر في الليلة").
- **Clean Surface**: No synthetic trust badges ("إقامة موثقة"), no fake rating stars, no internal dividers, and no nested CTA links (the entire card is the interactive trigger to Property Detail).

Dark-card is not a normal variant. A hover effect may use neutral border/elevation changes, never a glow or decorative translation system.

## Open-surface composition rule

Do not use cards as the default visual separator. Prefer whitespace, typography, dividers and open rows when the content belongs to one continuous journey.

Avoid **card soup**: a card inside a card, a rounded box for every fact, or repeated bordered containers that make a decision screen feel like a dashboard. Customer hospitality screens should remain photography-led and editorial; Owner cards should group operational objects/actions; Admin cards should not replace efficient tables/queues.

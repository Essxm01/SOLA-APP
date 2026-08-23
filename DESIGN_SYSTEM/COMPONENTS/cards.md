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
| PropertyCard shell | real image or neutral placeholder, title, location, status, price, 1–2 actions | never fake property imagery |
| BookingCard shell | booking identity, property, dates/status and contextual action | no raw enum label to users |

Dark-card is not a normal variant. A hover effect may use neutral border/elevation changes, never a glow or decorative translation system.

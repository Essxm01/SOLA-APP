import React from 'react';
import { ImageOff, MapPin } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getPropertyHomeSummary, getRelevantProperties } from '../../utils/ownerHome';
import { PropertyStatusChip } from '../ui/Badge';

export const PropertiesSummarySection: React.FC = () => {
  const { properties, setActiveTab } = useApp();
  if (!properties.length) return null;
  const summary = getPropertyHomeSummary(properties);
  const visible = getRelevantProperties(properties);
  return <section className="space-y-4 text-right" aria-labelledby="owner-properties"><div className="flex items-center justify-between"><div><h2 id="owner-properties" className="text-lg font-extrabold text-[var(--konfrm-text-primary)]">وحداتك</h2><p className="mt-1 text-sm text-[var(--konfrm-text-secondary)]">{summary.published} منشورة · {summary.pendingReview} قيد المراجعة · {summary.drafts} مسودات</p></div><button onClick={() => setActiveTab('properties')} className="min-h-11 text-sm font-bold text-[var(--konfrm-color-primary)]">عرض كل الوحدات</button></div>
    <div className="space-y-3">{visible.map((property) => <button key={property.id} onClick={() => setActiveTab('properties')} className="flex w-full gap-3 rounded-[var(--konfrm-radius-card)] border border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] p-3 text-right"><div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--konfrm-radius-control)] bg-[var(--konfrm-surface-secondary)] text-[var(--konfrm-text-muted)]">{property.images?.[0] ? <img src={property.images[0]} alt="" className="h-full w-full object-cover" /> : <ImageOff className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="truncate font-bold text-[var(--konfrm-text-primary)]">{property.title}</h3><PropertyStatusChip status={property.status} /></div><p className="mt-2 flex items-center gap-1 truncate text-sm text-[var(--konfrm-text-secondary)]"><MapPin className="h-4 w-4 shrink-0" />{property.locationName || property.region}</p>{property.status === 'DRAFT' && <p className="mt-2 text-sm font-bold text-[var(--konfrm-color-primary)]">تحتاج إلى الإكمال</p>}{property.status === 'REJECTED' && <p className="mt-2 text-sm font-bold text-[var(--konfrm-semantic-danger)]">تحتاج إلى تعديلات</p>}</div></button>)}</div>
  </section>;
};

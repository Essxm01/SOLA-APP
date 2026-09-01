import React from 'react';
import { ArrowLeft, Building2, MapPin } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getPropertyHomeSummary, getRelevantProperties } from '../../utils/ownerHome';
import { getPropertyStatusPresentation } from '../../utils/ownerProperties';
import type { Property } from '../../types';

const PropertyCard: React.FC<{ property: Property; onOpen: () => void }> = ({ property, onOpen }) => {
  const presentation = getPropertyStatusPresentation(property);
  const location = property.locationName || property.address || property.region;
  return <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 rounded-[var(--konfrm-radius-card)] border border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] p-4 text-right [box-shadow:var(--konfrm-shadow-subtle)]">
    {property.images?.[0] ? <img src={property.images[0]} alt="" className="h-20 w-20 shrink-0 rounded-[var(--konfrm-radius-control)] object-cover" /> : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[var(--konfrm-radius-control)] bg-[var(--konfrm-surface-secondary)] text-[var(--konfrm-text-muted)]"><Building2 className="h-6 w-6" /></div>}
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-2"><h3 className="line-clamp-2 text-[15px] font-bold leading-5 text-[var(--konfrm-text-primary)]">{property.title}</h3><span className={`shrink-0 rounded-[var(--konfrm-radius-pill)] px-2 py-1 text-[12px] font-bold ${presentation.tone}`}>{presentation.label}</span></div>
      {location && <p className="mt-1.5 flex items-center gap-1 text-[13px] text-[var(--konfrm-text-muted)]"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{location}</span></p>}
      {property.status === 'DRAFT' && <p className="mt-2 text-[13px] font-bold text-[var(--konfrm-color-primary)]">{presentation.label === 'تحتاج تعديلات' ? 'راجع التعديلات المطلوبة' : 'أكمل بيانات الوحدة'}</p>}
    </div>
  </button>;
};

export const PropertiesSummarySection: React.FC = () => {
  const { properties, setActiveTab } = useApp();
  if (!properties.length) return null;
  const summary = getPropertyHomeSummary(properties);
  const counts = [summary.published ? `${summary.published} منشورة` : null, summary.pendingReview ? `${summary.pendingReview} قيد المراجعة` : null, summary.drafts ? `${summary.drafts} مسودة` : null, summary.rejected ? `${summary.rejected} تحتاج تعديلات` : null].filter(Boolean);
  const visible = getRelevantProperties(properties);
  return <section aria-labelledby="owner-properties">
    <div className="flex items-end justify-between gap-3"><h2 id="owner-properties" className="text-[20px] font-extrabold tracking-[-0.01em] text-[var(--konfrm-text-primary)]">وحداتك</h2><button type="button" onClick={() => setActiveTab('properties')} className="min-h-11 text-[14px] font-bold text-[var(--konfrm-color-primary)]">عرض الكل</button></div>
    {counts.length > 0 && <p className="mt-1.5 text-[13px] leading-6 text-[var(--konfrm-text-muted)]">{counts.join(' · ')}</p>}
    <div className="mt-3 space-y-3">{visible.map((property) => <PropertyCard key={property.id} property={property} onOpen={() => setActiveTab('properties')} />)}</div>
    <button type="button" onClick={() => setActiveTab('properties')} className="mt-3 inline-flex min-h-11 items-center gap-1 text-[14px] font-bold text-[var(--konfrm-color-primary)]">إدارة الوحدات <ArrowLeft className="h-4 w-4" /></button>
  </section>;
};

import type { Property, PropertyStatus } from '../types';

export type OwnerPropertyFilter = 'all' | 'action' | 'published' | 'review' | 'drafts' | 'other';

const statusOrder: Record<PropertyStatus, number> = { DRAFT: 1, PENDING_REVIEW: 2, PUBLISHED: 3, PAUSED: 4, SUSPENDED: 5, ARCHIVED: 6 };

// Property rejection is a verification outcome on a draft, not a second
// properties.status enum value. Keep this composite rule in one place.
export const isRejectedProperty = (property: Pick<Property, 'status' | 'verificationStatus'>) =>
  property.status === 'DRAFT' && property.verificationStatus === 'REJECTED';

export const isPropertyActionRequired = (property: Pick<Property, 'status' | 'verificationStatus'>) =>
  property.status === 'DRAFT' || isRejectedProperty(property);
export const propertyStatusPresentation: Record<PropertyStatus, { label: string; tone: string }> = {
  DRAFT: { label: 'مسودة', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
  PENDING_REVIEW: { label: 'قيد المراجعة', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
  PUBLISHED: { label: 'منشورة', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  PAUSED: { label: 'متوقفة مؤقتًا', tone: 'bg-blue-50 text-blue-800 border-blue-200' },
  SUSPENDED: { label: 'موقوفة', tone: 'bg-rose-50 text-rose-800 border-rose-200' },
  ARCHIVED: { label: 'مؤرشفة', tone: 'bg-slate-100 text-slate-600 border-slate-200' },
};
export const primaryPropertyAction = (property: Property) => {
  if (isRejectedProperty(property)) return 'مراجعة التعديلات';
  if (property.status === 'DRAFT') return 'استكمال الوحدة';
  if (property.status === 'PUBLISHED') return 'إدارة الوحدة';
  return 'عرض التفاصيل';
};
export const getOwnerPropertyCollections = (properties: Property[], filter: OwnerPropertyFilter) => {
  const matching = properties.filter((property) => filter === 'all' || (filter === 'action' && isPropertyActionRequired(property)) || (filter === 'published' && property.status === 'PUBLISHED') || (filter === 'review' && property.status === 'PENDING_REVIEW') || (filter === 'drafts' && property.status === 'DRAFT' && !isRejectedProperty(property)) || (filter === 'other' && ['PAUSED', 'SUSPENDED', 'ARCHIVED'].includes(property.status)));
  return matching.sort((a, b) => (isRejectedProperty(a) ? 0 : statusOrder[a.status]) - (isRejectedProperty(b) ? 0 : statusOrder[b.status]) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
};

export const getPropertyStatusPresentation = (property: Property) =>
  isRejectedProperty(property)
    ? { label: 'تحتاج تعديلات', tone: 'bg-rose-50 text-rose-800 border-rose-200' }
    : propertyStatusPresentation[property.status];
export const ownerPropertyFilterCount = (properties: Property[], filter: OwnerPropertyFilter) => getOwnerPropertyCollections(properties, filter).length;

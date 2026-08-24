import type { Property, PropertyStatus } from '../types';

export type OwnerPropertyFilter = 'all' | 'action' | 'published' | 'review' | 'drafts' | 'other';

const statusOrder: Record<PropertyStatus, number> = { REJECTED: 0, DRAFT: 1, PENDING_REVIEW: 2, PUBLISHED: 3, PAUSED: 4, SUSPENDED: 5, ARCHIVED: 6 };
export const isPropertyActionRequired = (status: PropertyStatus) => status === 'DRAFT' || status === 'REJECTED';
export const propertyStatusPresentation: Record<PropertyStatus, { label: string; tone: string }> = {
  DRAFT: { label: 'مسودة', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
  PENDING_REVIEW: { label: 'قيد المراجعة', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
  PUBLISHED: { label: 'منشورة', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  PAUSED: { label: 'متوقفة مؤقتًا', tone: 'bg-blue-50 text-blue-800 border-blue-200' },
  REJECTED: { label: 'تحتاج تعديلات', tone: 'bg-rose-50 text-rose-800 border-rose-200' },
  SUSPENDED: { label: 'موقوفة', tone: 'bg-rose-50 text-rose-800 border-rose-200' },
  ARCHIVED: { label: 'مؤرشفة', tone: 'bg-slate-100 text-slate-600 border-slate-200' },
};
export const primaryPropertyAction = (property: Property) => {
  if (property.status === 'DRAFT') return 'استكمال الوحدة';
  if (property.status === 'REJECTED') return 'مراجعة التعديلات';
  if (property.status === 'PUBLISHED') return 'إدارة الوحدة';
  return 'عرض التفاصيل';
};
export const getOwnerPropertyCollections = (properties: Property[], filter: OwnerPropertyFilter) => {
  const matching = properties.filter((property) => filter === 'all' || (filter === 'action' && isPropertyActionRequired(property.status)) || (filter === 'published' && property.status === 'PUBLISHED') || (filter === 'review' && property.status === 'PENDING_REVIEW') || (filter === 'drafts' && property.status === 'DRAFT') || (filter === 'other' && ['PAUSED', 'SUSPENDED', 'ARCHIVED'].includes(property.status)));
  return matching.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || String(b.updatedAt).localeCompare(String(a.updatedAt)));
};
export const ownerPropertyFilterCount = (properties: Property[], filter: OwnerPropertyFilter) => getOwnerPropertyCollections(properties, filter).length;

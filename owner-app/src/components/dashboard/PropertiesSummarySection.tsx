import React from 'react';
import { Building, MapPin } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getPropertyHomeSummary, getRelevantProperties } from '../../utils/ownerHome';
import { PropertyStatusChip } from '../ui/Badge';

export const PropertiesSummarySection: React.FC = () => {
  const { properties, setActiveTab } = useApp();
  if (!properties.length) return null;

  const summary = getPropertyHomeSummary(properties);
  const visible = getRelevantProperties(properties);

  // Format natural Arabic summary counts
  const summaryParts: string[] = [];
  if (summary.published > 0) summaryParts.push(`${summary.published} منشورة`);
  if (summary.pendingReview > 0) summaryParts.push(`${summary.pendingReview} قيد المراجعة`);
  if (summary.drafts > 0) summaryParts.push(`${summary.drafts} مسودة`);
  if (summary.rejected > 0) summaryParts.push(`${summary.rejected} مرفوضة`);
  const summaryText = summaryParts.length > 0 ? summaryParts.join(' · ') : `${properties.length} وحدات`;

  return (
    <section className="space-y-3 text-right" aria-labelledby="owner-properties">
      {/* Section Header */}
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <h2 id="owner-properties" className="text-lg font-black text-slate-900 tracking-tight">
            وحداتك
          </h2>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold border border-slate-200/60">
            {summaryText}
          </span>
        </div>
        <button
          onClick={() => setActiveTab('properties')}
          className="text-xs font-bold text-[#0059FF] hover:text-blue-700 transition-colors cursor-pointer"
        >
          عرض كل الوحدات
        </button>
      </div>

      {/* Relevant Property Cards (Max 2) */}
      <div className="space-y-2.5">
        {visible.map((property) => (
          <div
            key={property.id}
            onClick={() => setActiveTab('properties')}
            className="group flex gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer text-right items-center"
          >
            {/* Thumbnail or Neutral Placeholder */}
            {property.images && property.images[0] ? (
              <img
                src={property.images[0]}
                alt={property.title}
                className="h-20 w-20 shrink-0 rounded-xl object-cover border border-slate-100 group-hover:border-blue-200 transition-colors"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-50 border border-slate-200/80 text-slate-400 group-hover:border-blue-200 transition-colors">
                <Building className="h-6 w-6" />
                <span className="text-[9px] font-bold text-slate-400 mt-0.5">بدون صورة</span>
              </div>
            )}

            {/* Content Body */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-xs font-black text-slate-900 group-hover:text-[#0059FF] transition-colors" title={property.title}>
                  {property.title}
                </h3>
                <PropertyStatusChip status={property.status} />
              </div>

              <p className="flex items-center gap-1 truncate text-[11px] text-slate-500 font-medium">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{property.locationName || property.address || property.region || 'الساحل الشمالي'}</span>
              </p>

              {/* Contextual Action / Status Hint */}
              <div className="pt-0.5">
                {property.status === 'DRAFT' && (
                  <span className="text-xs font-bold text-[#0059FF]">
                    أكمل بيانات الوحدة ←
                  </span>
                )}
                {property.status === 'REJECTED' && (
                  <span className="text-xs font-bold text-rose-600">
                    راجع التعديلات المطلوبة ←
                  </span>
                )}
                {property.status === 'PENDING_REVIEW' && (
                  <span className="text-[11px] font-semibold text-amber-700">
                    قيد مراجعة الإدارة
                  </span>
                )}
                {property.status === 'PUBLISHED' && (
                  <span className="text-xs font-black text-slate-800">
                    {property.pricePerNight.toLocaleString('ar-EG')} ج.م <span className="text-[10px] font-normal text-slate-500">/ ليلة</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};


import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { PropertyStatus } from '../../types';
import { PropertyStatusChip } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import {
  Plus,
  Search,
  MapPin,
  BedDouble,
  Bath,
  Star,
  ChevronLeft,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const PropertiesView: React.FC = () => {
  const {
    properties,
    isEmptyDashboard,
    openAddPropertyWizard,
    openPropertyDetails,
    currentDraft,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<PropertyStatus | 'ALL'>('ALL');

  // Filter properties logic
  const filteredProperties = properties.filter((p) => {
    // Search query filter (title, location, resort, region)
    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.resortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.region.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = activeFilter === 'ALL' || p.status === activeFilter;

    return matchesSearch && matchesStatus;
  });

  const filterTabs: { id: PropertyStatus | 'ALL'; label: string; count?: number }[] = [
    { id: 'ALL', label: 'الكل', count: properties.length },
    {
      id: 'PUBLISHED',
      label: 'منشورة',
      count: properties.filter((p) => p.status === 'PUBLISHED').length,
    },
    {
      id: 'PENDING_REVIEW',
      label: 'قيد المراجعة',
      count: properties.filter((p) => p.status === 'PENDING_REVIEW').length,
    },
    {
      id: 'PAUSED',
      label: 'موقوفة',
      count: properties.filter((p) => p.status === 'PAUSED').length,
    },
    {
      id: 'DRAFT',
      label: 'مسودة',
      count: properties.filter((p) => p.status === 'DRAFT').length,
    },
    {
      id: 'REJECTED',
      label: 'مرفوضة',
      count: properties.filter((p) => p.status === 'REJECTED').length,
    },
  ];

  return (
    <div className="p-4 space-y-4 dir-rtl text-right min-h-full pb-20">
      {/* Top Title & Add Property Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">إدارة الوحدات الساحلية</h2>
          <p className="text-xs text-slate-500">
            {properties.length > 0 ? `لديك ${properties.length} وحدة مسجلة` : 'أضف وحداتك وتابع مراجعتها'}
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => openAddPropertyWizard()}
          icon={<Plus className="w-4 h-4" />}
          className="text-xs font-bold shadow-md shadow-blue-500/20"
        >
          إضافة وحدة جديدة
        </Button>
      </div>

      {/* Resume Unsaved Draft Banner if draft exists */}
      {currentDraft && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-amber-900 block truncate">
                توجد مسودة غير مكتملة: {currentDraft.title || 'وحدة ساحلية جديدة'}
              </span>
              <span className="text-[11px] text-amber-700 block">
                يمكنك متابعة الإدخال من حيث توقفت.
              </span>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openAddPropertyWizard()}
            className="text-xs py-1 px-3 shrink-0"
          >
            متابعة الإعداد
          </Button>
        </div>
      )}

      {/* Search Input */}
      <div className="relative w-full">
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="ابحث باسم الوحدة، القرية، أو الساحل..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full py-2.5 pr-10 pl-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0059FF] focus:ring-2 focus:ring-blue-100 transition-all shadow-xs"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeFilter === tab.id
                ? 'bg-[#0059FF] text-white shadow-sm'
                : 'bg-white text-[#64748B] border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`px-1.5 py-0.2 text-[10px] font-mono rounded-full ${
                  activeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {isEmptyDashboard || filteredProperties.length === 0 ? (
        <EmptyState
          type="properties"
          title={searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'لم تضف أي وحدة بعد'}
          description={
            searchQuery
              ? 'تأكد من كتابة اسم الوحدة أو القرية بشكل صحيح أو قم بتعديل خيارات التصفية.'
              : 'أضف أول وحدة ساحلية لك وابدأ في إدارتها واستقبال الحجوزات من مكان واحد.'
          }
          actionText="إضافة وحدة جديدة ➕"
          onAction={() => openAddPropertyWizard()}
        />
      ) : (
        /* Property Cards List */
        <div className="space-y-3.5">
          {filteredProperties.map((p) => (
            <div
              key={p.id}
              onClick={() => openPropertyDetails(p.id)}
              className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer overflow-hidden ${
                p.status === 'REJECTED'
                  ? 'border-rose-200 bg-rose-50/10'
                  : p.status === 'PENDING_REVIEW'
                  ? 'border-amber-200'
                  : 'border-slate-200/80'
              }`}
            >
              <div className="relative h-40 w-full">
                <img
                  src={p.images[p.mainImageIndex || 0] || p.images[0]}
                  alt={p.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 z-10">
                  <PropertyStatusChip status={p.status} />
                </div>
                <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-xl dir-ltr shadow-md">
                  {p.pricePerNight.toLocaleString()} {p.currency} / ليلة
                </div>
              </div>

              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#0059FF] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                    {p.unitType || 'شاليه'} • {p.region}
                  </span>
                  {p.rating > 0 && (
                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{p.rating}</span>
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug truncate">
                  {p.title}
                </h3>

                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{p.locationName}</span>
                </p>

                {/* Rejection Warning Box if REJECTED */}
                {p.status === 'REJECTED' && p.rejectionReason && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>سبب الرفض:</strong> {p.rejectionReason}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <BedDouble className="w-3.5 h-3.5 text-slate-400" /> {p.bedrooms} غرف
                    </span>
                    <span className="flex items-center gap-1">
                      <Bath className="w-3.5 h-3.5 text-slate-400" /> {p.bathrooms} حمام
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[#0059FF] font-bold text-xs">
                    <span>عرض التفاصيل والإجراءات</span>
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

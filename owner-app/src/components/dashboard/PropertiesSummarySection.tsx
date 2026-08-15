import React from 'react';
import { useApp } from '../../context/AppContext';
import { PropertyStatusChip } from '../ui/Badge';
import { MapPin, BedDouble, Bath, Star, Plus } from 'lucide-react';

export const PropertiesSummarySection: React.FC = () => {
  const { properties, setActiveTab } = useApp();

  if (properties.length === 0) return null;

  return (
    <div className="w-full space-y-3 dir-rtl">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <span>الوحدات الساحلية للمالك</span>
          <span className="text-xs font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
            {properties.length}
          </span>
        </h2>
        <button
          onClick={() => setActiveTab('properties')}
          className="text-xs font-bold text-[#0059FF] hover:underline flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>إضافة وحدة</span>
        </button>
      </div>

      <div className="space-y-3">
        {properties.map((property) => (
          <div
            key={property.id}
            onClick={() => setActiveTab('properties')}
            className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex gap-3 items-center"
          >
            <img
              src={property.images[0]}
              alt={property.title}
              className="w-22 h-22 rounded-xl object-cover shrink-0 ring-1 ring-slate-200"
            />

            <div className="flex-1 min-w-0 text-right">
              <div className="flex items-center justify-between gap-1 mb-1">
                <PropertyStatusChip status={property.status} />
                <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{property.rating}</span>
                </div>
              </div>

              <h3 className="text-sm font-bold text-slate-900 truncate leading-snug">
                {property.title}
              </h3>

              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{property.locationName}</span>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <BedDouble className="w-3.5 h-3.5 text-slate-400" /> {property.bedrooms} غرف
                  </span>
                  <span className="flex items-center gap-1">
                    <Bath className="w-3.5 h-3.5 text-slate-400" /> {property.bathrooms} حمام
                  </span>
                </div>
                <span className="font-extrabold text-[#0059FF] font-mono">
                  {property.pricePerNight.toLocaleString()} {property.currency} / ليلة
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

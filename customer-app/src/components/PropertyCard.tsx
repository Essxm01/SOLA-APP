import React from 'react';
import { MapPin, Users, Bed, Bath, ShieldCheck, Heart } from 'lucide-react';
import { getPropertyTypeLabel } from '../utils/searchIntent';

export interface CustomerPropertyItem {
  id: string;
  title: string;
  unitType: string;
  propertyType?: string;
  address: string;
  region?: string;
  resortName?: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  basePricePerNight: number;
  currency?: string;
  images?: string[];
}

interface PropertyCardProps {
  property: CustomerPropertyItem;
  onSelect: (id: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string, e: React.MouseEvent) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onSelect,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const rawFirst = property.images && property.images.length > 0 ? property.images[0] : null;
  const coverImage = typeof rawFirst === 'string' ? rawFirst : (rawFirst as any)?.fileUrl || null;
  const unitTypeLabel = getPropertyTypeLabel(property.propertyType || property.unitType) || 'وحدة ساحلية';

  return (
    <div
      onClick={() => onSelect(property.id)}
      className="sola-mobile-card group cursor-pointer overflow-hidden flex flex-col justify-between h-full bg-white mb-4"
    >
      {/* Cover Image Container */}
      <div className="relative w-full h-56 overflow-hidden bg-slate-100">
        {coverImage ? (
          <img
            src={coverImage}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-slate-200 flex items-center justify-center">
            <div className="text-slate-400 text-xs font-bold text-center px-4">لا توجد صور متاحة</div>
          </div>
        )}

        {/* Verified Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-md text-[#0059FF] font-black text-[10px] px-2.5 py-1 rounded-full shadow-sm border border-slate-100">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0059FF]" />
          <span>إقامة موثقة</span>
        </div>

        {/* Favorite Button (>=44px touch target with compact visual indicator) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleFavorite) onToggleFavorite(property.id, e);
          }}
          aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
          className="absolute top-1.5 left-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/40"
        >
          <span
            className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
              isFavorite
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-white/80 text-slate-700 hover:bg-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-white' : ''}`} />
          </span>
        </button>

        {/* Unit Type Pill (canonical Arabic label — never exposes backend enum) */}
        <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md text-white font-extrabold text-[10px] px-2.5 py-1 rounded-lg">
          {unitTypeLabel}
        </div>
      </div>

      {/* Content Info */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Location row — only canonical geography; omitted entirely when
              the canonical record has none (address='' is valid and must not
              be replaced with an invented location). No rating is rendered:
              there is no canonical review data yet. */}
          {(property.address?.trim() || property.resortName?.trim() || property.region?.trim()) ? (
            <div className="flex items-center gap-1 text-slate-500 text-xs font-bold mb-1">
              <MapPin className="w-3.5 h-3.5 text-[#0059FF] shrink-0" />
              <span className="truncate max-w-[240px]">
                {(property.address?.trim() || property.resortName?.trim() || property.region?.trim()) as string}
              </span>
            </div>
          ) : null}

          {/* Title */}
          <h3 className="font-black text-slate-900 text-sm leading-snug line-clamp-2 mb-2 group-hover:text-[#0059FF] transition-colors">
            {property.title}
          </h3>

          {/* Capacity Icons */}
          <div className="flex items-center gap-3 text-slate-500 text-[11px] font-bold py-1.5 border-t border-slate-100 mb-2">
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>{property.maxGuests} أفراد</span>
            </div>
            <div className="flex items-center gap-1">
              <Bed className="w-3.5 h-3.5 text-slate-400" />
              <span>{property.bedrooms} غرف</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="w-3.5 h-3.5 text-slate-400" />
              <span>{property.bathrooms} حمام</span>
            </div>
          </div>
        </div>

        {/* Price Row */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-50">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block">السعر في الليلة</span>
            <div className="flex items-baseline gap-1">
              <span className="font-black text-base text-[#0059FF] dir-ltr">
                {property.basePricePerNight?.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-700">ج.م</span>
            </div>
          </div>

          <span className="text-xs font-extrabold text-[#0059FF] group-hover:underline">
            تفاصيل الوحدة ←
          </span>
        </div>
      </div>
    </div>
  );
};

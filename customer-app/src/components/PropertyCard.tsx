import React, { useState } from 'react';
import { Heart, ImageOff, Loader2 } from 'lucide-react';

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

export interface PropertyCardProps {
  property: CustomerPropertyItem;
  onSelect: (id: string) => void;
  isFavorite?: boolean;
  isFavoritePending?: boolean;
  onToggleFavorite?: (id: string, e: React.MouseEvent) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onSelect,
  isFavorite = false,
  isFavoritePending = false,
  onToggleFavorite,
}) => {
  const [imageError, setImageError] = useState(false);

  const rawFirst = property.images && property.images.length > 0 ? property.images[0] : null;
  const coverImage = typeof rawFirst === 'string' ? rawFirst : (rawFirst as any)?.fileUrl || null;

  // Canonical geography string — omitted entirely when none
  const locationText = (property.address?.trim() || property.resortName?.trim() || property.region?.trim()) || null;

  // Truthful facts row — only >0 facts, bullet-separated
  const facts: string[] = [];
  if (property.maxGuests > 0) facts.push(`${property.maxGuests} ضيوف`);
  if (property.bedrooms > 0) facts.push(`${property.bedrooms} غرف`);
  if (property.bathrooms > 0) facts.push(`${property.bathrooms} حمام`);

  return (
    <div className="relative group overflow-hidden flex flex-col justify-between h-full bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
      {/* Primary Card Action Button (accessible hit-target covering card, sibling to favorite button — zero nested interactive controls) */}
      <button
        type="button"
        onClick={() => onSelect(property.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(property.id);
          }
        }}
        aria-label={`عرض تفاصيل ${property.title}`}
        className="absolute inset-0 z-0 w-full h-full rounded-2xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/50 pointer-events-auto"
      />

      {/* Cover Image Container (1.4:1 responsive aspect ratio) */}
      <div className="relative w-full aspect-[1.4/1] overflow-hidden bg-slate-100 rounded-t-2xl pointer-events-none z-1">
        {coverImage && !imageError ? (
          <img
            src={coverImage}
            alt={property.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-[#F1F5F9] flex flex-col items-center justify-center gap-1.5 text-slate-400">
            <ImageOff className="w-6 h-6 text-slate-300" />
            <span className="text-xs font-medium text-slate-400">لا توجد صورة</span>
          </div>
        )}

        {/* Favorite Button (>=48px touch target, sibling control positioned with pointer-events-auto) */}
        <button
          type="button"
          disabled={isFavoritePending}
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleFavorite && !isFavoritePending) onToggleFavorite(property.id, e);
          }}
          aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
          className="pointer-events-auto absolute top-2 left-2 min-w-[48px] min-h-[48px] w-12 h-12 flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/40 cursor-pointer disabled:cursor-not-allowed"
        >
          <span
            className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
              isFavorite
                ? 'bg-white text-[#0059FF] shadow-xs'
                : 'bg-white/90 text-slate-700 hover:bg-white shadow-xs'
            }`}
          >
            {isFavoritePending ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#0059FF]" />
            ) : (
              <Heart
                className={`w-4 h-4 transition-colors ${
                  isFavorite ? 'fill-[#0059FF] text-[#0059FF]' : 'text-slate-700'
                }`}
              />
            )}
          </span>
        </button>
      </div>

      {/* Content Info (Zero dividers, clean typography, truthful hierarchy) */}
      <div className="p-4 flex-1 flex flex-col justify-between pointer-events-none z-1 gap-2">
        <div className="space-y-1">
          {/* Location row — only canonical geography; omitted entirely when none */}
          {locationText && (
            <div className="text-[13px] font-medium text-slate-500 line-clamp-1">
              {locationText}
            </div>
          )}

          {/* Title */}
          <h3 className="font-extrabold text-slate-900 text-[16px] leading-snug line-clamp-2 group-hover:text-[#0059FF] transition-colors">
            {property.title}
          </h3>

          {/* Facts: clean bullet-separated text */}
          {facts.length > 0 && (
            <div className="text-[12px] font-medium text-slate-500 pt-0.5">
              {facts.join(' · ')}
            </div>
          )}
        </div>

        {/* Price Row: prominent price + per-night suffix */}
        <div className="flex items-baseline gap-1 pt-1">
          <span className="text-lg font-black text-slate-900 dir-ltr">
            {property.basePricePerNight?.toLocaleString('ar-EG') || property.basePricePerNight?.toLocaleString()}
          </span>
          <span className="text-xs font-bold text-slate-700">ج.م</span>
          <span className="text-xs font-medium text-slate-500 mr-1">/ ليلة</span>
        </div>
      </div>
    </div>
  );
};

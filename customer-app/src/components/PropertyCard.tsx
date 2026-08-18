import React from 'react';
import { MapPin, Users, Bed, Bath, ShieldCheck, Star } from 'lucide-react';

export interface CustomerPropertyItem {
  id: string;
  title: string;
  unitType: string;
  propertyType?: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  basePricePerNight: number;
  status: string;
  verificationStatus: string;
  images?: string[];
  ownerName?: string;
  rating?: number;
}

interface PropertyCardProps {
  property: CustomerPropertyItem;
  onSelect: (id: string) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, onSelect }) => {
  const defaultImage = 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800';
  const coverImage = property.images && property.images.length > 0 ? property.images[0] : defaultImage;

  const translateType = (type?: string) => {
    switch (type?.toUpperCase()) {
      case 'VILLA':
      case 'فيلا':
        return 'فيلا فاخرة';
      case 'CHALET':
      case 'شاليه':
        return 'شاليه ساحلي';
      case 'APARTMENT':
      case 'شقة':
        return 'شقة مصيفية';
      default:
        return property.unitType || 'وحدة ساحلية';
    }
  };

  return (
    <div
      onClick={() => onSelect(property.id)}
      className="sola-card sola-card-hover group cursor-pointer overflow-hidden flex flex-col justify-between h-full bg-white"
    >
      {/* Image Banner Container */}
      <div className="relative w-full h-52 overflow-hidden bg-slate-100">
        <img
          src={coverImage}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Verified Badge Overlay */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-slate-900/80 backdrop-blur-md text-emerald-400 font-extrabold text-[11px] px-2.5 py-1 rounded-full border border-emerald-500/30 shadow-md">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>إقامة موثقة</span>
        </div>

        {/* Property Type Pill */}
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md text-slate-800 font-black text-[11px] px-2.5 py-1 rounded-xl shadow-sm">
          {translateType(property.propertyType || property.unitType)}
        </div>

        {/* Rating Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-md text-amber-600 font-extrabold text-[11px] px-2 py-1 rounded-lg shadow-sm">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>4.9</span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Location */}
          <div className="flex items-center gap-1 text-slate-500 text-xs font-bold mb-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#0059FF] shrink-0" />
            <span className="truncate">{property.address || 'الساحل الشمالي'}</span>
          </div>

          {/* Title */}
          <h3 className="font-black text-slate-900 text-sm leading-snug line-clamp-2 mb-3 group-hover:text-[#0059FF] transition-colors">
            {property.title}
          </h3>

          {/* Capacity Icons Row */}
          <div className="flex items-center gap-4 text-slate-600 text-xs font-bold py-2 border-y border-slate-100 mb-3">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-slate-400" />
              <span>{property.maxGuests} أفراد</span>
            </div>
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4 text-slate-400" />
              <span>{property.bedrooms} غرف</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="w-4 h-4 text-slate-400" />
              <span>{property.bathrooms} حمام</span>
            </div>
          </div>
        </div>

        {/* Price & Action Row */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block">السعر في الليلة</span>
            <div className="flex items-baseline gap-1">
              <span className="font-black text-lg text-[#0059FF] dir-ltr">
                {property.basePricePerNight?.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-700">ج.م</span>
            </div>
          </div>

          <button className="px-3.5 py-2 bg-blue-50 text-[#0059FF] group-hover:bg-[#0059FF] group-hover:text-white font-extrabold text-xs rounded-xl transition-all">
            التفاصيل
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { CustomerPropertyItem } from './PropertyCard';
import { BookingReviewSheet } from './BookingReviewSheet';
import { ChevronRight, MapPin, Users, Bed, Bath, ShieldCheck, CheckCircle2, Calendar, Lock, Heart, Star } from 'lucide-react';

interface PropertyDetailModalProps {
  property: CustomerPropertyItem;
  authToken?: string | null;
  onClose: () => void;
  onInitiateBooking: (prop: CustomerPropertyItem, checkIn: string, checkOut: string, guests: number) => void;
  onRequireAuth: (interceptedAction: { propertyId: string; checkIn: string; checkOut: string; guests: number }) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  authToken,
  onClose,
  onInitiateBooking,
  onRequireAuth,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const [checkIn, setCheckIn] = useState<string>('2026-09-01');
  const [checkOut, setCheckOut] = useState<string>('2026-09-05');
  const [guests, setGuests] = useState<number>(4);
  const [showReviewSheet, setShowReviewSheet] = useState<boolean>(false);

  // Nights calculation
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  const nights = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)));

  const firstNightPrice = property.basePricePerNight || 5000;
  const totalBookingValue = firstNightPrice * nights;
  const depositAmount = firstNightPrice; // Required Deposit = 1 night price
  const remainingBalance = totalBookingValue - depositAmount;

  const defaultImages = [
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800',
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800',
  ];
  const images = property.images && property.images.length > 0 ? property.images : defaultImages;
  const [activeImage, setActiveImage] = useState<string>(images[0]);

  const handleOpenReviewSheet = () => {
    setShowReviewSheet(true);
  };

  const handleConfirmSubmitRequest = () => {
    if (!authToken) {
      // Unauthenticated Guest Interception: Save intent & open auth modal
      onRequireAuth({
        propertyId: property.id,
        checkIn,
        checkOut,
        guests,
      });
      return;
    }

    onInitiateBooking(property, checkIn, checkOut, guests);
  };

  const amenitiesList = [
    'شاطئ خاص بالقرية',
    'حمام سباحة خاص / مشترك',
    'تكييف central بجميع الغرف',
    'إنترنت واي فاي عالي السرعة',
    'أثاث ومفروشات جديدة',
    'مطبخ مجهز بالكامل',
    'حراسة وأمن 24 ساعة',
    'موقف سيارات مجاني',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-y-auto animate-fade-in">
      {/* Mobile Top Navigation Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-slate-700 text-xs font-black hover:text-slate-900"
        >
          <ChevronRight className="w-5 h-5" />
          <span>العودة للاستكشاف</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleFavorite && onToggleFavorite(property.id)}
            className={`p-2 rounded-full border transition-all ${
              isFavorite ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 pb-24">
        {/* Gallery Image Display */}
        <div className="relative w-full h-72 bg-slate-100">
          <img src={activeImage} alt={property.title} className="w-full h-full object-cover" />

          {/* Verified Host Badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-md text-[#0059FF] font-black text-[10px] px-2.5 py-1 rounded-full shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>إقامة موثقة من صولا</span>
          </div>

          {/* Gallery Thumbnails */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 overflow-x-auto p-1 bg-black/40 backdrop-blur-md rounded-xl">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`w-12 h-10 rounded-lg overflow-hidden border transition-all shrink-0 ${
                    activeImage === img ? 'border-[#0059FF] scale-105' : 'border-transparent opacity-60'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Property Specs & Summary Container */}
        <div className="max-w-md mx-auto p-4 space-y-5">
          {/* Title & Location */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
              <div className="flex items-center gap-1 text-[#0059FF]">
                <MapPin className="w-3.5 h-3.5" />
                <span>{property.address || 'الساحل الشمالي'}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-800 font-black">
                <Star className="w-3.5 h-3.5 fill-[#FFD700] text-[#FFD700]" />
                <span>4.9 (12 تقييم)</span>
              </div>
            </div>
            <h1 className="text-lg font-black text-slate-900 leading-tight mb-2">
              {property.title}
            </h1>
            <p className="text-xs text-slate-500 font-bold leading-relaxed">
              إقامة ساحلية فاخرة تضمن لك أعلى مستويات الراحة والخصوصية في أرق شواطئ الساحل الشمالي.
            </p>
          </div>

          {/* Specs Bar */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block">السعة</span>
              <div className="flex items-center justify-center gap-1 text-xs font-black text-slate-800 mt-0.5">
                <Users className="w-3.5 h-3.5 text-[#0059FF]" />
                <span>{property.maxGuests} أفراد</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block">الغرف</span>
              <div className="flex items-center justify-center gap-1 text-xs font-black text-slate-800 mt-0.5">
                <Bed className="w-3.5 h-3.5 text-[#0059FF]" />
                <span>{property.bedrooms} غرف</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block">الحمامات</span>
              <div className="flex items-center justify-center gap-1 text-xs font-black text-slate-800 mt-0.5">
                <Bath className="w-3.5 h-3.5 text-[#0059FF]" />
                <span>{property.bathrooms} حمام</span>
              </div>
            </div>
          </div>

          {/* Amenities Grid */}
          <div>
            <h3 className="text-xs font-black text-slate-900 mb-2">المميزات والخدمات:</h3>
            <div className="grid grid-cols-2 gap-2">
              {amenitiesList.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl text-[11px] font-bold text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dates & Guest Selector Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs font-black text-slate-900 border-b border-slate-200 pb-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-[#0059FF]" />
                <span>تواريخ الإقامة المحددة</span>
              </span>
              <span className="text-[#0059FF] font-bold">{nights} ليالي إقامة</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">تاريخ الوصول</label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">تاريخ المغادرة</label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">عدد الأفراد</label>
              <select
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
              >
                {Array.from({ length: property.maxGuests || 6 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'فرد' : 'أفراد'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Financial Breakdown Disclosure */}
          <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>السعر في الليلة:</span>
              <span className="font-bold">{firstNightPrice.toLocaleString()} ج.م</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>إجمالي قيمة الإقامة الكاملة ({nights} ليالي):</span>
              <span className="font-bold">{totalBookingValue.toLocaleString()} ج.م</span>
            </div>
            <hr className="border-blue-100 my-1" />
            <div className="flex justify-between text-[#0059FF] font-black">
              <span>العربون المطلوب عند الموافقة (ليلة واحدة):</span>
              <span className="dir-ltr">{depositAmount.toLocaleString()} ج.م</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>المبلغ المتبقي يدفعه النزيل كاش للمالك يوم الاستلام:</span>
              <span className="dir-ltr">{remainingBalance.toLocaleString()} ج.م</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Mobile Bottom Booking CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 p-3 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block">الإجمالي الكلي</span>
            <div className="flex items-baseline gap-1">
              <span className="font-black text-lg text-[#0059FF] dir-ltr">
                {totalBookingValue.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-700">ج.م</span>
            </div>
          </div>

          <button
            onClick={handleOpenReviewSheet}
            className="flex-1 py-3.5 bg-[#0059FF] hover:bg-blue-600 text-white font-black text-sm rounded-2xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-1.5"
          >
            {!authToken && <Lock className="w-4 h-4 text-white/80" />}
            <span>متابعة طلب الحجز</span>
          </button>
        </div>
      </div>

      {/* Booking Review Sheet */}
      {showReviewSheet && (
        <BookingReviewSheet
          property={property}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guests}
          nights={nights}
          firstNightPrice={firstNightPrice}
          totalBookingValue={totalBookingValue}
          depositAmount={depositAmount}
          remainingBalance={remainingBalance}
          onClose={() => setShowReviewSheet(false)}
          onConfirmSubmit={handleConfirmSubmitRequest}
          onEditDetails={() => setShowReviewSheet(false)}
        />
      )}
    </div>
  );
};

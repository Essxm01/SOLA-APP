import React, { useState } from 'react';
import { CustomerPropertyItem } from './PropertyCard';
import { X, MapPin, Users, Bed, Bath, ShieldCheck, CheckCircle2, Calendar, Lock } from 'lucide-react';

interface PropertyDetailModalProps {
  property: CustomerPropertyItem;
  authToken?: string | null;
  onClose: () => void;
  onInitiateBooking: (prop: CustomerPropertyItem, checkIn: string, checkOut: string, guests: number) => void;
  onRequireAuth: (interceptedAction: { propertyId: string; checkIn: string; checkOut: string; guests: number }) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  authToken,
  onClose,
  onInitiateBooking,
  onRequireAuth,
}) => {
  const [checkIn, setCheckIn] = useState<string>('2026-09-01');
  const [checkOut, setCheckOut] = useState<string>('2026-09-05');
  const [guests, setGuests] = useState<number>(4);

  // Nights calculation
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  const nights = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)));

  const firstNightPrice = property.basePricePerNight || 5000;
  const totalBookingValue = firstNightPrice * nights;
  const depositAmount = firstNightPrice; // Deposit = 1 night price
  const remainingBalance = totalBookingValue - depositAmount;

  const defaultImages = [
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800',
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800',
  ];
  const images = property.images && property.images.length > 0 ? property.images : defaultImages;
  const [activeImage, setActiveImage] = useState<string>(images[0]);

  const handleBookClick = () => {
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
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-fade-in relative max-h-[92vh] flex flex-col">
        {/* Close Button Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-400">تفاصيل الوحدة الساحلية</span>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              مراجعة وموثقة من صولا ⭐️
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Main Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Main Photo Gallery */}
          <div className="space-y-3">
            <div className="w-full h-64 sm:h-96 rounded-2xl overflow-hidden bg-slate-100 relative">
              <img src={activeImage} alt={property.title} className="w-full h-full object-cover" />
            </div>

            {/* Gallery Thumbnails */}
            {images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={`w-20 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                      activeImage === img ? 'border-[#0059FF] scale-95' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title & Verified Host Section */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0059FF] mb-1">
                <MapPin className="w-4 h-4" />
                <span>{property.address || 'الساحل الشمالي'}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mb-2">
                {property.title}
              </h1>
              <p className="text-xs text-slate-500 font-bold">
                إقامة ساحلية فاخرة تضمن لك أعلى مستويات الراحة والخصوصية في قلب الساحل.
              </p>
            </div>

            {/* Host Trust Card */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 block">مالك موثق معتمد</span>
                <span className="text-xs font-black text-slate-800">{property.ownerName || 'مالك صولا المباشر'}</span>
              </div>
            </div>
          </div>

          {/* Key Specs Bar */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-center">
            <div>
              <span className="text-[10px] font-bold text-slate-500 block">السعة القصوى</span>
              <div className="flex items-center justify-center gap-1 text-xs font-black text-slate-800 mt-1">
                <Users className="w-4 h-4 text-[#0059FF]" />
                <span>{property.maxGuests} أفراد</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 block">غرف النوم</span>
              <div className="flex items-center justify-center gap-1 text-xs font-black text-slate-800 mt-1">
                <Bed className="w-4 h-4 text-[#0059FF]" />
                <span>{property.bedrooms} غرف</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 block">الحمامات</span>
              <div className="flex items-center justify-center gap-1 text-xs font-black text-slate-800 mt-1">
                <Bath className="w-4 h-4 text-[#0059FF]" />
                <span>{property.bathrooms} حمام</span>
              </div>
            </div>
          </div>

          {/* Amenities Grid */}
          <div>
            <h3 className="text-sm font-black text-slate-900 mb-3">المميزات والخدمات المتاحة:</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {amenitiesList.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Date Selection & Server Price Calculation Box */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0059FF]" />
                <span>حدد تواريخ الإقامة واستحساب المبلغ</span>
              </h3>
              <span className="text-xs font-bold text-slate-400">{nights} ليالي إقامة</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">تاريخ الوصول</label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">تاريخ المغادرة</label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">عدد الأفراد</label>
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} أفراد
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Financial Breakdown Transparency */}
            <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>سعر الليلة الواحدة:</span>
                <span className="font-bold">{firstNightPrice.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>إجمالي قيمة الإقامة الكاملة ({nights} ليالي):</span>
                <span className="font-bold">{totalBookingValue.toLocaleString()} ج.م</span>
              </div>
              <hr className="border-slate-700 my-2" />
              <div className="flex justify-between text-[#FFD700] font-black text-sm">
                <span>العربون المطلوب دفعه الآن لضمان الحجز (ليلة واحدة):</span>
                <span className="dir-ltr">{depositAmount.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>المبلغ المتبقي يدفعه النزيل كاش للمالك يوم الاستلام:</span>
                <span className="dir-ltr">{remainingBalance.toLocaleString()} ج.م</span>
              </div>
            </div>

            {/* Action CTA Button */}
            <button
              onClick={handleBookClick}
              className="w-full py-4 bg-[#0059FF] hover:bg-blue-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
            >
              {!authToken && <Lock className="w-4 h-4 text-white/80" />}
              <span>
                {!authToken
                  ? 'تسجيل الدخول وطلب حجز هذه الوحدة'
                  : 'تقديم طلب حجز ودفع العربون الآن'}
              </span>
            </button>

            {!authToken && (
              <p className="text-[11px] text-amber-300/90 text-center font-bold">
                🔒 سيُطلب منك تسجيل الدخول رقم الهاتف لإكمال الطلب، وسيتم إعادتك لنفس هذه التواريخ تلقائياً.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

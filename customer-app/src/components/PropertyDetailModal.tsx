import React, { useState, useCallback } from 'react';
import { CustomerPropertyItem } from './PropertyCard';
import { BookingReviewSheet } from './BookingReviewSheet';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { GuestSelector } from './GuestSelector';
import { getApiUrl } from '../utils/api';
import {
  ChevronRight, MapPin, Users, Bed, Bath, ShieldCheck,
  CheckCircle2, Calendar, Lock, Heart, Star, Loader2, AlertCircle, RefreshCw,
} from 'lucide-react';

interface PropertyDetailModalProps {
  property: CustomerPropertyItem;
  authToken?: string | null;
  onClose: () => void;
  onInitiateBooking: (prop: CustomerPropertyItem, checkIn: string, checkOut: string, guests: number) => void;
  onRequireAuth: (interceptedAction: { propertyId: string; checkIn: string; checkOut: string; guests: number }) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

/** Server-authoritative price quote shape returned by /api/v1/customer/bookings/calculate */
export interface ServerPriceQuote {
  nights: number;
  totalBookingValue: number;
  depositAmount: number;
  solaCommissionAmount: number;
  ownerNetDepositAmount: number;
  remainingBalance: number;
  commissionOnRemainingBalance: number;
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
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [guests, setGuests] = useState<number>(1);

  // Price-quote states
  const [quoteLoading, setQuoteLoading] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quote, setQuote] = useState<ServerPriceQuote | null>(null);

  // Review sheet visibility
  const [showReviewSheet, setShowReviewSheet] = useState<boolean>(false);

  // Gallery
  const defaultImages = [
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800',
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800',
  ];
  const images =
    property.images && property.images.length > 0 ? property.images : defaultImages;
  const [activeImage, setActiveImage] = useState<string>(images[0]);

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

  // ── Availability state ─────────────────────────────────────────────────────
  const [availabilityLoading, setAvailabilityLoading] = useState<boolean>(true);
  const [blockedRanges, setBlockedRanges] = useState<{checkIn: string, checkOut: string}[]>([]);
  const [minStay, setMinStay] = useState<number>(1);
  const [maxStay, setMaxStay] = useState<number>(30);
  const [availabilityError, setAvailabilityError] = useState<boolean>(false);

  React.useEffect(() => {
    let mounted = true;
    const fetchAvailability = async () => {
      setAvailabilityLoading(true);
      setAvailabilityError(false);
      try {
        const res = await fetch(getApiUrl(`/customer/properties/${property.id}/availability`));
        const json = await res.json();
        if (res.ok && json.success) {
          if (mounted) {
            const data = json.data;
            setMinStay(data.minStay || 1);
            setMaxStay(data.maxStay || 30);
            setBlockedRanges(data.unavailableRanges || []);
          }
        } else {
          if (mounted) setAvailabilityError(true);
        }
      } catch (err) {
        if (mounted) setAvailabilityError(true);
      } finally {
        if (mounted) setAvailabilityLoading(false);
      }
    };
    fetchAvailability();
    return () => { mounted = false; };
  }, [property.id]);

  // ── Date range handler ─────────────────────────────────────────────────────
  const handleRangeChange = useCallback(
    (newCheckIn: string | null, newCheckOut: string | null) => {
      setCheckIn(newCheckIn);
      setCheckOut(newCheckOut);
      // Invalidate any existing quote when dates change
      setQuote(null);
      setQuoteError(null);
    },
    []
  );

  // ── Server price quote fetch ───────────────────────────────────────────────
  const fetchPriceQuote = useCallback(async () => {
    if (!checkIn || !checkOut) return;

    setQuoteLoading(true);
    setQuoteError(null);
    setQuote(null);

    try {
      const res = await fetch(getApiUrl('/customer/bookings/calculate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // The calculate endpoint requires authentication per the route guard
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          propertyId: property.id,
          checkIn,
          checkOut,
          guests,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setQuoteError(json?.error?.message || 'تعذر جلب عرض السعر من الخادم. حاول مرة أخرى.');
        return;
      }

      setQuote(json.data as ServerPriceQuote);
      setShowReviewSheet(true);
    } catch {
      setQuoteError('خطأ في الاتصال بالخادم. تحقق من الإنترنت وأعد المحاولة.');
    } finally {
      setQuoteLoading(false);
    }
  }, [authToken, checkIn, checkOut, guests, property.id]);

  // ── CTA handler ────────────────────────────────────────────────────────────
  const handleCTAPress = async () => {
    if (!checkIn || !checkOut) return; // guard: both dates required

    if (!authToken) {
      // Intercept: save intent → open auth modal
      onRequireAuth({ propertyId: property.id, checkIn, checkOut, guests });
      return;
    }

    // If we already have a valid quote open the review sheet directly
    if (quote) {
      setShowReviewSheet(true);
      return;
    }

    // Otherwise fetch the quote
    await fetchPriceQuote();
  };

  // ── Confirm booking submission ─────────────────────────────────────────────
  const handleConfirmSubmitRequest = () => {
    onInitiateBooking(property, checkIn!, checkOut!, guests);
  };

  const datesSelected = checkIn && checkOut;

  // Compute a local nights preview for the CTA price display (before server quote)
  const localNightsPreview = (() => {
    if (!checkIn || !checkOut) return 0;
    const d1 = new Date(checkIn + 'T00:00:00');
    const d2 = new Date(checkOut + 'T00:00:00');
    return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 86400000));
  })();

  const localTotalPreview = (property.basePricePerNight || 5000) * localNightsPreview;

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
              isFavorite
                ? 'bg-rose-50 border-rose-200 text-rose-500'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 pb-28">
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
                    activeImage === img
                      ? 'border-[#0059FF] scale-105'
                      : 'border-transparent opacity-60'
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
                <div
                  key={idx}
                  className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl text-[11px] font-bold text-slate-700"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── DATE SELECTION — AvailabilityCalendar ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0059FF]" />
                <h3 className="text-xs font-black text-slate-900">تواريخ الإقامة</h3>
              </div>
            </div>
            
            {availabilityLoading ? (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2 text-[#0059FF]" />
                <span className="text-xs font-bold">جاري تحميل التواريخ المتاحة...</span>
              </div>
            ) : availabilityError ? (
              <div className="bg-rose-50 rounded-2xl border border-rose-200 p-6 flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-6 h-6 text-rose-500 mb-2" />
                <p className="text-xs font-bold text-rose-800 mb-3">تعذر تحميل التواريخ المتاحة</p>
                <button
                  onClick={() => {
                    setAvailabilityLoading(true);
                    setAvailabilityError(false);
                    fetch(getApiUrl(`/customer/properties/${property.id}/availability`))
                      .then(res => res.json())
                      .then(json => {
                        if (json.success) {
                          setMinStay(json.data.minStay || 1);
                          setMaxStay(json.data.maxStay || 30);
                          setBlockedRanges(json.data.unavailableRanges || []);
                          setAvailabilityError(false);
                        } else throw new Error();
                      })
                      .catch(() => setAvailabilityError(true))
                      .finally(() => setAvailabilityLoading(false));
                  }}
                  className="px-4 py-2 bg-white text-rose-600 border border-rose-200 rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-rose-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  إعادة المحاولة
                </button>
              </div>
            ) : (
              <AvailabilityCalendar
                blockedRanges={blockedRanges}
                checkIn={checkIn}
                checkOut={checkOut}
                minStay={minStay}
                maxStay={maxStay}
                onRangeChange={handleRangeChange}
              />
            )}
          </div>

          {/* ── GUEST SELECTION — GuestSelector ── */}
          <div>
            <h3 className="text-xs font-black text-slate-900 mb-2">عدد الأفراد</h3>
            <GuestSelector
              guests={guests}
              maxGuests={property.maxGuests || 6}
              onChange={setGuests}
            />
          </div>

          {/* ── PRICE PREVIEW (local, before server quote) ── */}
          {datesSelected && localNightsPreview > 0 && !quote && (
            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>السعر في الليلة:</span>
                <span className="font-bold">
                  {(property.basePricePerNight || 5000).toLocaleString()} ج.م
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>إجمالي قيمة الإقامة ({localNightsPreview} ليالي):</span>
                <span className="font-bold">{localTotalPreview.toLocaleString()} ج.م</span>
              </div>
              <p className="text-[10px] text-slate-400 text-center pt-1">
                * سيتم حساب تفاصيل العربون المعتمدة من الخادم عند الانتقال للمراجعة
              </p>
            </div>
          )}

          {/* ── SERVER QUOTE (after successful fetch) ── */}
          {quote && (
            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>السعر في الليلة:</span>
                <span className="font-bold">
                  {(property.basePricePerNight || 5000).toLocaleString()} ج.م
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>إجمالي قيمة الإقامة ({quote.nights} ليالي):</span>
                <span className="font-bold">{quote.totalBookingValue.toLocaleString()} ج.م</span>
              </div>
              <hr className="border-blue-100 my-1" />
              <div className="flex justify-between text-[#0059FF] font-black">
                <span>العربون المطلوب عند الموافقة (ليلة واحدة):</span>
                <span className="dir-ltr">{quote.depositAmount.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>المبلغ المتبقي يدفعه النزيل كاش للمالك يوم الاستلام:</span>
                <span className="dir-ltr">{quote.remainingBalance.toLocaleString()} ج.م</span>
              </div>
            </div>
          )}

          {/* ── QUOTE ERROR / RETRY ── */}
          {quoteError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-xs font-bold text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{quoteError}</p>
                <button
                  onClick={fetchPriceQuote}
                  className="mt-2 flex items-center gap-1 text-[#0059FF] font-black"
                >
                  <RefreshCw className="w-3 h-3" />
                  إعادة المحاولة
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Mobile Bottom Booking CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 p-3 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block">
              {quote ? 'الإجمالي الكلي' : localTotalPreview > 0 ? 'السعر التقريبي' : 'اختر التواريخ'}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-black text-lg text-[#0059FF] dir-ltr">
                {(quote ? quote.totalBookingValue : localTotalPreview).toLocaleString()}
              </span>
              {(quote || localTotalPreview > 0) && (
                <span className="text-xs font-bold text-slate-700">ج.م</span>
              )}
            </div>
          </div>

          <button
            onClick={handleCTAPress}
            disabled={quoteLoading || !datesSelected || availabilityLoading || availabilityError}
            className={`flex-1 py-3.5 font-black text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5 ${
              !datesSelected || availabilityLoading || availabilityError
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#0059FF] hover:bg-blue-600 text-white shadow-blue-500/25'
            }`}
          >
            {quoteLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري الحساب...</span>
              </>
            ) : (
              <>
                {!authToken && <Lock className="w-4 h-4 text-white/80" />}
                <span>
                  {!datesSelected
                    ? 'اختر التواريخ أولاً'
                    : quote
                    ? 'مراجعة طلب الحجز'
                    : 'متابعة طلب الحجز'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Booking Review Sheet — opens only after server quote is ready */}
      {showReviewSheet && quote && (
        <BookingReviewSheet
          property={property}
          checkIn={checkIn!}
          checkOut={checkOut!}
          guests={guests}
          nights={quote.nights}
          firstNightPrice={property.basePricePerNight || 5000}
          totalBookingValue={quote.totalBookingValue}
          depositAmount={quote.depositAmount}
          remainingBalance={quote.remainingBalance}
          onClose={() => setShowReviewSheet(false)}
          onConfirmSubmit={handleConfirmSubmitRequest}
          onEditDetails={() => setShowReviewSheet(false)}
        />
      )}
    </div>
  );
};

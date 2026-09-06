/**
 * SOLA Customer App — PropertyDetailModal
 * Mobile-first, full-screen decision flow for coastal property bookings.
 *
 * Ordered Mobile Flow:
 * 1. Mobile Image Gallery (controlled height, back/favorite overlays, counter "1 / N")
 * 2. Property Identity (title, location, verified host badge)
 * 3. Quick Facts (guests, bedrooms, bathrooms)
 * 4. Description (with readable "عرض المزيد" toggle)
 * 5. Real Amenities Grid
 * 6. Inline Visible Availability Calendar (RTL, real blocked dates, fail-closed error UI)
 * 7. Guest Selection (+/- Stepper)
 * 8. Live Server-Authoritative Price Summary (White surface, ZERO navy)
 * 9. Booking Terms Notice
 * 10. Sticky Bottom Booking Bar / CTA (never overlaps content)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CustomerPropertyItem } from './PropertyCard';
import { BookingReviewSheet } from './BookingReviewSheet';
import { AvailabilityCalendar, BlockedRange } from './AvailabilityCalendar';
import { GuestSelector } from './GuestSelector';
import { getApiUrl } from '../utils/api';
import { fetchCanonicalPropertyDetail, type CustomerPropertyDetail } from '../utils/customerTruthfulState';
import {
  ChevronRight,
  ChevronLeft,
  MapPin,
  Users,
  Bed,
  Bath,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Heart,
  Loader2,
  AlertCircle,
  RefreshCw,
  Clock,
} from 'lucide-react';

const AMENITY_LABELS: Record<string, string> = {
  pool: 'حمام سباحة',
  private_pool: 'حمام سباحة خاص',
  sea_view: 'إطلالة مباشرة على البحر',
  central_ac: 'تكييف مركزي',
  ac: 'تكييف',
  wifi: 'إنترنت واي فاي',
  kitchen: 'مطبخ مجهز بالكامل',
  garage: 'جراج للسيارات',
  smart_tv: 'شاشة سمارت',
  garden: 'حديقة خاصة وتراس',
  bbq: 'منطقة شواء BBQ',
  private_beach: 'شاطئ خاص بالقرية',
  security: 'أمن وحراسة 24/7',
};

function formatAmenity(amenity: string): string {
  const normalized = amenity.trim().toLowerCase();
  return AMENITY_LABELS[normalized] || amenity;
}

interface PropertyDetailModalProps {
  property: CustomerPropertyItem;
  authToken?: string | null;
  onClose: () => void;
  onInitiateBooking: (prop: CustomerPropertyItem, checkIn: string, checkOut: string, guests: number) => Promise<void>;
  onRequireAuth: (interceptedAction: { propertyId: string; checkIn: string; checkOut: string; guests: number }) => void;
  restoredBookingIntent?: { propertyId: string; checkIn: string; checkOut: string; guests: number } | null;
  restoreBookingReview?: boolean;
  onBookingReviewRestored?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

/** Server-authoritative customer-safe quote shape */
export interface ServerPriceQuote {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  pricePerNight: number;
  totalStay: number;
  depositAmount: number;
  remainingAmount: number;
  currency: string;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  authToken,
  onClose,
  onInitiateBooking,
  onRequireAuth,
  restoredBookingIntent,
  restoreBookingReview = false,
  onBookingReviewRestored,
  isFavorite = false,
  onToggleFavorite,
}) => {
  // Canonical Detail State
  const [detail, setDetail] = useState<CustomerPropertyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(true);
  const [detailError, setDetailError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    setDetailLoading(true);
    setDetailError(null);
    const token = authToken || localStorage.getItem('sola_customer_access_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const result = await fetchCanonicalPropertyDetail(property.id, { headers });
      if (result.kind === 'success') {
        setDetail(result.data);
      } else if (result.kind === 'unauthorized') {
        setDetailError('انتهت صلاحية الجلسة أو يلزم تسجيل الدخول لعرض تفاصيل الوحدة.');
      } else {
        setDetailError(result.message || 'تعذر تحميل تفاصيل الوحدة من الخادم');
      }
    } catch (err: any) {
      setDetailError(err?.message || 'تعذر الاتصال بالخدمة لتحميل بيانات الوحدة');
    } finally {
      setDetailLoading(false);
    }
  }, [authToken, property.id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Booking Selection State
  const [checkIn, setCheckIn] = useState<string | null>(restoredBookingIntent?.checkIn || null);
  const [checkOut, setCheckOut] = useState<string | null>(restoredBookingIntent?.checkOut || null);
  const [guests, setGuests] = useState<number>(restoredBookingIntent?.guests || 1);

  // Gallery State
  const images = useMemo(() => {
    const list = detail?.images && detail.images.length > 0 ? detail.images : property.images;
    if (list && Array.isArray(list) && list.length > 0) {
      return list.map((img: any) => (typeof img === 'string' ? img : img?.fileUrl || '')).filter(Boolean);
    }
    return [];
  }, [detail?.images, property.images]);

  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Description expand toggle
  const [descriptionExpanded, setDescriptionExpanded] = useState<boolean>(false);

  // Real Availability State
  const [availabilityLoading, setAvailabilityLoading] = useState<boolean>(true);
  const [availabilityError, setAvailabilityError] = useState<boolean>(false);
  const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([]);
  const [minStay, setMinStay] = useState<number>(2);
  const [maxStay, setMaxStay] = useState<number>(30);

  // Server Price Quote State
  const [quoteLoading, setQuoteLoading] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quote, setQuote] = useState<ServerPriceQuote | null>(null);

  // Booking Review Sheet
  const [showReviewSheet, setShowReviewSheet] = useState<boolean>(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState<boolean>(false);
  const [bookingSubmitError, setBookingSubmitError] = useState<string | null>(null);

  // ── 1. Fetch Real Availability (Fail-Closed) ──────────────────────────────
  const fetchAvailability = useCallback(async () => {
    setAvailabilityLoading(true);
    setAvailabilityError(false);
    const token = authToken || localStorage.getItem('sola_customer_access_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(getApiUrl(`/customer/properties/${property.id}/availability`), {
        headers,
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setBlockedRanges(json.data.unavailableRanges || []);
        setMinStay(json.data.minStay || 2);
        setMaxStay(json.data.maxStay || 30);
      } else {
        setAvailabilityError(true);
      }
    } catch {
      setAvailabilityError(true);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [authToken, property.id]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // ── 2. Handle Date Range Change ───────────────────────────────────────────
  const handleRangeChange = useCallback((newCheckIn: string | null, newCheckOut: string | null) => {
    setCheckIn(newCheckIn);
    setCheckOut(newCheckOut);
    setQuote(null);
    setQuoteError(null);
  }, []);

  // ── 3. Fetch Server-Authoritative Price Quote ─────────────────────────────
  const fetchServerQuote = useCallback(async () => {
    if (!checkIn || !checkOut) return;

    setQuoteLoading(true);
    setQuoteError(null);
    const token = authToken || localStorage.getItem('sola_customer_access_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(getApiUrl('/customer/bookings/calculate'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          propertyId: property.id,
          checkIn,
          checkOut,
          guests,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success || !json.data) {
        setQuoteError(json?.error?.message || 'تعذر حساب عرض السعر من الخادم. يرجى إعادة المحاولة.');
        return;
      }

      setQuote(json.data as ServerPriceQuote);
    } catch {
      setQuoteError('خطأ في الاتصال بالخادم أثناء حساب السعر. يرجى التحقق من الاتصال.');
    } finally {
      setQuoteLoading(false);
    }
  }, [authToken, checkIn, checkOut, guests, property.id]);

  // Automatically request server quote when valid dates are selected or guests change
  useEffect(() => {
    if (checkIn && checkOut) {
      fetchServerQuote();
    }
  }, [checkIn, checkOut, guests, fetchServerQuote]);

  useEffect(() => {
    if (!restoreBookingReview || !authToken || !checkIn || !checkOut || quoteLoading) return;
    if (quote) {
      setShowReviewSheet(true);
      onBookingReviewRestored?.();
      return;
    }
    void fetchServerQuote();
  }, [restoreBookingReview, authToken, checkIn, checkOut, quote, quoteLoading, fetchServerQuote, onBookingReviewRestored]);

  // ── 4. Continue CTA Handler ───────────────────────────────────────────────
  const handleCTAPress = async () => {
    if (!checkIn || !checkOut) return;

    if (!quote) {
      await fetchServerQuote();
      return;
    }

    if (!authToken) {
      onRequireAuth({ propertyId: property.id, checkIn, checkOut, guests });
      return;
    }

    setShowReviewSheet(true);
  };

  // ── 5. Confirm Submit Booking Request ─────────────────────────────────────
  const handleConfirmSubmit = async () => {
    if (isSubmittingBooking || !checkIn || !checkOut) return;
    setIsSubmittingBooking(true);
    setBookingSubmitError(null);
    try {
      await onInitiateBooking(property, checkIn, checkOut, guests);
      setShowReviewSheet(false);
    } catch (err: any) {
      setBookingSubmitError(err?.message || 'تعذر إرسال طلب الحجز. لم يتم إنشاء أي طلب.');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Local calculations
  const datesSelected = Boolean(checkIn && checkOut);

  const localNights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const d1 = new Date(checkIn + 'T00:00:00');
    const d2 = new Date(checkOut + 'T00:00:00');
    return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 86400000));
  }, [checkIn, checkOut]);

  const nightlyPrice = detail?.basePricePerNight || property.basePricePerNight || 0;
  const estimatedTotal = quote ? quote.totalStay : nightlyPrice * localNights;

  return (
    <div className="fixed inset-0 z-50 bg-[#F5F7FA] flex justify-center selection:bg-blue-100" dir="rtl">
      <div className="w-full max-w-[430px] min-h-screen bg-white shadow-2xl relative flex flex-col font-sans overflow-y-auto">
        
        {/* ── SECTION 1: MOBILE IMAGE GALLERY ── */}
        <div className="relative w-full h-72 bg-slate-900 shrink-0">
          {images.length > 0 ? (
            <img
              src={images[activeImageIndex]}
              alt={detail?.title || property.title}
              className="w-full h-full object-cover transition-opacity duration-300"
            />
          ) : (
            <div className="w-full h-full bg-slate-700 flex items-center justify-center">
              <div className="text-slate-400 text-sm font-bold text-center px-6">لا توجد صور لهذه الوحدة</div>
            </div>
          )}

          {/* Top Overlays: Back & Favorite */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md text-slate-800 flex items-center justify-center shadow-md active:scale-95 transition-all"
              aria-label="العودة للاستكشاف"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => onToggleFavorite && onToggleFavorite(property.id)}
              className={`w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center shadow-md active:scale-95 transition-all ${
                isFavorite
                  ? 'bg-rose-50/95 text-rose-500 border border-rose-200'
                  : 'bg-white/90 text-slate-700'
              }`}
              aria-label="إضافة للمفضلة"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
          </div>

          {/* Bottom Overlays: Verified Badge & Image Counter */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
            <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md text-[#0059FF] text-[11px] font-black px-3 py-1 rounded-full shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>إقامة موثقة من كونفرم</span>
            </div>

            {images.length > 1 && (
              <div className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full dir-ltr">
                {activeImageIndex + 1} / {images.length}
              </div>
            )}
          </div>

          {/* Gallery Navigation Buttons (if multiple images) */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-xs active:scale-95"
                aria-label="الصورة السابقة"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-xs active:scale-95"
                aria-label="الصورة التالية"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* ── SCROLLABLE CONTENT BODY (With safe bottom padding pb-36) ── */}
        <div className="flex-1 p-4 space-y-5 pb-36">

          {/* ── SECTION 2: PROPERTY IDENTITY ── */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0059FF]">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{detail?.address || detail?.resortName || detail?.region || property.address || property.resortName || property.region || 'الساحل الشمالي'}</span>
            </div>

            <h1 className="text-base font-black text-slate-900 leading-snug">
              {detail?.title || property.title}
            </h1>
          </div>

          {/* ── SECTION 3: QUICK FACTS ── */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block">السعة القصوى</span>
              <div className="flex items-center justify-center gap-1 text-xs font-black text-slate-800 mt-0.5">
                <Users className="w-3.5 h-3.5 text-[#0059FF]" />
                <span>{(detail?.maxGuests ?? property.maxGuests)} أفراد</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block">عدد الغرف</span>
              <div className="flex items-center justify-center gap-1 text-xs font-black text-slate-800 mt-0.5">
                <Bed className="w-3.5 h-3.5 text-[#0059FF]" />
                <span>{(detail?.bedrooms ?? property.bedrooms)} غرف</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block">الحمامات</span>
              <div className="flex items-center justify-center gap-1 text-xs font-black text-slate-800 mt-0.5">
                <Bath className="w-3.5 h-3.5 text-[#0059FF]" />
                <span>{(detail?.bathrooms ?? property.bathrooms)} حمام</span>
              </div>
            </div>
          </div>

          {((detail?.bedsCount !== undefined && detail?.bedsCount !== null) || (detail?.areaSqM !== undefined && detail?.areaSqM !== null)) && (
            <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60 text-center">
              {detail.bedsCount !== undefined && detail.bedsCount !== null && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-700 font-bold">
                  <span className="text-slate-400 text-[11px]">الأسرّة:</span>
                  <span className="font-black text-slate-900">{detail.bedsCount}</span>
                </div>
              )}
              {detail.areaSqM !== undefined && detail.areaSqM !== null && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-700 font-bold">
                  <span className="text-slate-400 text-[11px]">المساحة:</span>
                  <span className="font-black text-slate-900">{detail.areaSqM} م²</span>
                </div>
              )}
            </div>
          )}

          {/* ── DETAIL-DEPENDENT CONTENT: DESCRIPTION & AMENITIES ── */}
          {detailLoading ? (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-col items-center justify-center text-center space-y-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#0059FF]" />
              <span className="text-xs font-bold text-slate-500">جاري تحميل تفاصيل ومميزات الوحدة...</span>
            </div>
          ) : detailError ? (
            <div className="p-4 bg-rose-50/80 rounded-2xl border border-rose-200 text-center space-y-2">
              <AlertCircle className="w-5 h-5 text-rose-500 mx-auto" />
              <p className="text-xs font-bold text-rose-800">{detailError}</p>
              <button
                type="button"
                onClick={fetchDetail}
                className="px-3.5 py-1.5 bg-white text-rose-600 border border-rose-200 rounded-xl text-xs font-black inline-flex items-center gap-1 hover:bg-rose-50 transition-all active:scale-95"
              >
                <RefreshCw className="w-3 h-3" />
                <span>إعادة المحاولة</span>
              </button>
            </div>
          ) : (
            <>
              {/* ── SECTION 4: DESCRIPTION ── */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-black text-slate-900">عن هذه الإقامة</h3>
                {detail?.description ? (
                  <div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-line">
                      {descriptionExpanded || detail.description.length <= 160
                        ? detail.description
                        : `${detail.description.slice(0, 160)}...`}
                    </p>
                    {detail.description.length > 160 && (
                      <button
                        type="button"
                        onClick={() => setDescriptionExpanded((prev) => !prev)}
                        className="text-xs font-black text-[#0059FF] hover:underline pt-0.5"
                      >
                        {descriptionExpanded ? 'عرض أقل' : 'عرض المزيد'}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 font-medium">لم يقم المالك بإضافة وصف مكتوب لهذه الوحدة بعد.</p>
                )}
              </div>

              {/* ── SECTION 5: AMENITIES ── */}
              <div className="space-y-2">
                <h3 className="text-xs font-black text-slate-900">المميزات والخدمات</h3>
                {detail?.amenities && detail.amenities.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {detail.amenities.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl text-[11px] font-bold text-slate-700 border border-slate-100"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{formatAmenity(item)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 font-medium">لم يتم تحديد مرافق إضافية لهذه الوحدة.</p>
                )}
              </div>

              {/* House Rules if present */}
              {detail?.houseRules && Object.keys(detail.houseRules).length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-black text-slate-900">قواعد الإقامة</h3>
                  <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                    {detail.houseRules.smokingAllowed !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">التدخين:</span>
                        <span>{detail.houseRules.smokingAllowed ? 'مسموح' : 'غير مسموح داخل الوحدة'}</span>
                      </div>
                    )}
                    {detail.houseRules.petsAllowed !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">الحيوانات الأليفة:</span>
                        <span>{detail.houseRules.petsAllowed ? 'مسموح' : 'غير مسموح'}</span>
                      </div>
                    )}
                    {typeof detail.houseRules.customRules === 'string' && detail.houseRules.customRules && (
                      <p className="text-xs text-slate-500 mt-1">{detail.houseRules.customRules}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── SECTION 6: INLINE AVAILABILITY CALENDAR ── */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0059FF]" />
              <h3 className="text-xs font-black text-slate-900">تواريخ الإقامة المتاحة</h3>
            </div>

            {availabilityLoading ? (
              <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#0059FF] mb-2" />
                <span className="text-xs font-bold text-slate-500">جاري تحميل تواريخ التوفر الحقيقية...</span>
              </div>
            ) : availabilityError ? (
              <div className="p-5 bg-rose-50/80 rounded-2xl border border-rose-200 flex flex-col items-center justify-center text-center space-y-2">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                <p className="text-xs font-bold text-rose-800">تعذر تحميل بيانات التوفر من الخادم</p>
                <button
                  type="button"
                  onClick={fetchAvailability}
                  className="px-3.5 py-1.5 bg-white text-rose-600 border border-rose-200 rounded-xl text-xs font-black flex items-center gap-1 hover:bg-rose-50 transition-all"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>إعادة المحاولة</span>
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

          {/* ── SECTION 7: GUEST SELECTION ── */}
          <div className="space-y-2 pt-1">
            <h3 className="text-xs font-black text-slate-900">عدد الأفراد</h3>
            <GuestSelector
              guests={guests}
              maxGuests={property.maxGuests || 6}
              onChange={setGuests}
            />
          </div>

          {/* ── SECTION 8: LIVE PRICE SUMMARY (WHITE-DOMINANT, ZERO NAVY) ── */}
          {datesSelected && (
            <div className="space-y-2 pt-2 border-t border-slate-100 animate-fade-in">
              <h3 className="text-xs font-black text-slate-900">تفاصيل السعر</h3>

              {quoteLoading ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0059FF]" />
                  <span>جاري حساب عرض السعر المعتمد...</span>
                </div>
              ) : quoteError ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-xs font-bold text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p>{quoteError}</p>
                    <button
                      type="button"
                      onClick={fetchServerQuote}
                      className="mt-1.5 text-[#0059FF] font-black flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>إعادة المحاولة</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>السعر في الليلة:</span>
                    <span className="font-bold text-slate-900">
                      {(quote ? quote.pricePerNight : nightlyPrice).toLocaleString()} ج.م
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>إجمالي الإقامة ({quote ? quote.nights : localNights} ليالي):</span>
                    <span className="font-bold text-slate-900">
                      {(quote ? quote.totalStay : estimatedTotal).toLocaleString()} ج.م
                    </span>
                  </div>

                  <hr className="border-slate-200/80 my-1" />

                  <div className="flex justify-between items-center bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                    <div>
                      <span className="font-black text-[#0059FF] block">
                        العربون بعد موافقة المالك:
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        (ليلة واحدة فقط)
                      </span>
                    </div>
                    <span className="text-sm font-black text-[#0059FF] dir-ltr">
                      {(quote ? quote.depositAmount : nightlyPrice).toLocaleString()} ج.م
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-500 text-[11px] px-1">
                    <span>المبلغ المتبقي:</span>
                    <span className="font-black text-slate-700 dir-ltr">
                      {(quote ? quote.remainingAmount : estimatedTotal - nightlyPrice).toLocaleString()} ج.م
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SECTION 9: BOOKING TERMS / NOTICE ── */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-2xl flex items-start gap-2.5 text-xs font-medium text-amber-950 leading-relaxed">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px]">
              <p className="font-black text-amber-900 mb-0.5">
                سيتم إرسال طلبك إلى المالك للموافقة أولاً.
              </p>
              <p className="text-amber-800 font-normal">
                لن يتم تحصيل أي مبالغ حتى يوافق المالك على حجزك وتأكيد التواريخ.
              </p>
            </div>
          </div>

        </div>

        {/* ── SECTION 10: STICKY BOTTOM BOOKING BAR / CTA ── */}
        <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-center pointer-events-none">
          <div className="w-full max-w-[430px] bg-white border-t border-slate-200 p-3 shadow-lg flex items-center justify-between gap-3 pointer-events-auto">
            
            {/* Price Preview / Status */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 block">
                {datesSelected ? 'إجمالي الإقامة' : 'السعر في الليلة'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="font-black text-lg text-[#0059FF] dir-ltr">
                  {(datesSelected ? estimatedTotal : nightlyPrice).toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-700">ج.م</span>
              </div>
            </div>

            {/* Dynamic Continue CTA */}
            <button
              type="button"
              onClick={handleCTAPress}
              disabled={!datesSelected || availabilityLoading || availabilityError || quoteLoading}
              className={`flex-1 py-3.5 font-black text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5 ${
                !datesSelected || availabilityLoading || availabilityError || quoteLoading
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-[#0059FF] hover:bg-blue-600 active:scale-98 text-white shadow-blue-500/25'
              }`}
            >
              {availabilityLoading ? (
                <span>جاري تحميل التوفر...</span>
              ) : quoteLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري حساب السعر...</span>
                </>
              ) : !checkIn ? (
                <span>اختر تواريخ الإقامة</span>
              ) : !checkOut ? (
                <span>اختر تاريخ المغادرة</span>
              ) : (
                <span>متابعة طلب الحجز</span>
              )}
            </button>

          </div>
        </div>

        {/* ── MODAL: BOOKING REVIEW SHEET ── */}
        {showReviewSheet && quote && (
          <BookingReviewSheet
            property={property}
            checkIn={checkIn!}
            checkOut={checkOut!}
            guests={guests}
            nights={quote.nights}
            firstNightPrice={quote.pricePerNight}
            totalBookingValue={quote.totalStay}
            depositAmount={quote.depositAmount}
            remainingBalance={quote.remainingAmount}
            onClose={() => setShowReviewSheet(false)}
            onConfirmSubmit={handleConfirmSubmit}
            onEditDetails={() => setShowReviewSheet(false)}
            isSubmitting={isSubmittingBooking}
            submitError={bookingSubmitError}
          />
        )}

      </div>
    </div>
  );
};

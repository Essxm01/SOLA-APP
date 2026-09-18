/**
 * SOLA Customer App — PropertyDetailModal
 * Screen 06: Property Details / Booking Decision
 *
 * Exact Top-to-Bottom Final Hierarchy:
 * 01 — Property Gallery Hero (4:3 responsive, swipe, 48x48 back/favorite, fullscreen viewer, light placeholder for no-images)
 * 02 — Property Decision Header (Title 22/800 -> Location 13-14/500 -> Nightly Price 18/800 -> Property Type 12/600)
 * 03 — Essential Facts (Concise row: max guests | bedrooms | bathrooms)
 * 04 — Short Description ("عن هذه الإقامة", inline toggle, hidden if absent)
 * 05 — Key Amenities Preview (Max 4 preview + inline expansion, hidden if absent)
 * 06 — Booking Decision Section: "اختار إقامتك" (Calendar + Guest Stepper)
 * 07 — Authoritative Quote (STRICTLY SERVER-AUTHORITATIVE, ZERO CLIENT CALCULATED TOTALS)
 * 08 — Calm Booking Process Explanation ("كيف بيتم الحجز؟", soft-blue card)
 * 09 — Secondary Details (bedsCount, areaSqM, House Rules "قواعد الإقامة", owner instructions)
 * 10 — Sticky Decision Bar (Always visible from entry, 7 explicit states, "مراجعة طلب الحجز")
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CustomerPropertyItem } from './PropertyCard';
import { BookingRequestReviewScreen } from './BookingRequestReviewScreen';
import { AvailabilityCalendar, BlockedRange } from './AvailabilityCalendar';
import { GuestSelector } from './GuestSelector';
import { getApiUrl } from '../utils/api';
import { getLocalTodayISO } from '../utils/searchIntent';
import {
  fetchCanonicalPropertyDetail,
  type CustomerPropertyDetail,
  resolveDetailGalleryImages,
  resolveEffectiveMaxGuests,
  clampGuests,
  getRenderableHouseRules,
  resolvePropertyType,
  resolvePropertyLocation,
} from '../utils/customerTruthfulState';
import {
  ChevronRight,
  MapPin,
  Users,
  Bed,
  Bath,
  Check,
  Heart,
  Loader2,
  AlertCircle,
  RefreshCw,
  Clock,
  ImageIcon,
  X,
} from 'lucide-react';

function validateStayDatesAgainstAvailability(
  checkIn: string | null,
  checkOut: string | null,
  blockedRanges: BlockedRange[],
  minStay: number,
  maxStay: number,
  todayStr: string
): { valid: boolean; reason?: string } {
  if (!checkIn) return { valid: true };
  if (checkIn < todayStr) {
    return { valid: false, reason: 'تاريخ الوصول في الماضي' };
  }
  const cInDate = new Date(checkIn + 'T00:00:00');
  for (const b of blockedRanges) {
    const bIn = new Date(b.checkIn + 'T00:00:00');
    const bOut = new Date(b.checkOut + 'T00:00:00');
    if (cInDate >= bIn && cInDate < bOut) {
      return { valid: false, reason: 'تاريخ الوصول يقع ضمن فترة محجوزة' };
    }
  }

  if (!checkOut) return { valid: true };
  if (checkOut <= checkIn) {
    return { valid: false, reason: 'تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول' };
  }

  const cOutDate = new Date(checkOut + 'T00:00:00');
  const nights = Math.round((cOutDate.getTime() - cInDate.getTime()) / 86400000);
  if (nights < minStay) {
    return { valid: false, reason: `أقل مدة إقامة لهذه الوحدة ${minStay} ليالي` };
  }
  if (nights > maxStay) {
    return { valid: false, reason: `أقصى مدة إقامة لهذه الوحدة ${maxStay} ليلة` };
  }

  for (const b of blockedRanges) {
    const bIn = new Date(b.checkIn + 'T00:00:00');
    const bOut = new Date(b.checkOut + 'T00:00:00');
    if (cInDate < bOut && cOutDate > bIn) {
      return { valid: false, reason: 'يتخلل الفترة المختارة أيام محجوزة مسبقاً' };
    }
  }

  return { valid: true };
}

const AMENITY_LABELS: Record<string, string> = {
  pool: 'حمام سباحة',
  private_pool: 'حمام سباحة خاص',
  sea_view: 'إطلالة على البحر',
  central_ac: 'تكييف مركزي',
  ac: 'تكييف',
  wifi: 'واي فاي',
  kitchen: 'مطبخ مجهز',
  garage: 'موقف سيارات',
  smart_tv: 'شاشة ذكية',
  garden: 'حديقة خاصة',
  bbq: 'منطقة شواء',
  private_beach: 'شاطئ خاص',
  security: 'أمن وحراسة',
};

function formatAmenity(amenity: string): string {
  const normalized = amenity.trim().toLowerCase();
  return AMENITY_LABELS[normalized] || amenity;
}

interface PropertyDetailModalProps {
  property: CustomerPropertyItem;
  authToken?: string | null;
  onClose: () => void;
  onBookingSuccess?: (bookingData: any) => void;
  onRequireAuth: (interceptedAction: {
    propertyId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    quoteSnapshot?: ServerPriceQuote | null;
    quoteFingerprint?: string | null;
    requestId?: string | null;
  }) => void;
  restoredBookingIntent?: {
    propertyId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    quoteSnapshot?: ServerPriceQuote | null;
    quoteFingerprint?: string | null;
    requestId?: string | null;
  } | null;
  initialSearchIntent?: { checkIn?: string; checkOut?: string; totalGuests?: number } | null;
  restoreBookingReview?: boolean;
  onBookingReviewRestored?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

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
  quoteFingerprint?: string;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  authToken,
  onClose,
  onBookingSuccess,
  onRequireAuth,
  restoredBookingIntent,
  initialSearchIntent,
  restoreBookingReview = false,
  onBookingReviewRestored,
  isFavorite = false,
  onToggleFavorite,
}) => {
  // ── Canonical Detail State ────────────────────────────────────────────────
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

  const isDetailLoaded = detail !== null;

  // ── Authoritative Max Guests & Capacity ───────────────────────────────────
  const effectiveMaxGuests = useMemo(() => {
    return resolveEffectiveMaxGuests(detail?.maxGuests, property.maxGuests, isDetailLoaded);
  }, [detail?.maxGuests, property.maxGuests, isDetailLoaded]);

  // Booking Selection State
  const [checkIn, setCheckIn] = useState<string | null>(
    restoredBookingIntent?.checkIn || (initialSearchIntent?.checkIn ? initialSearchIntent.checkIn : null)
  );
  const [checkOut, setCheckOut] = useState<string | null>(
    restoredBookingIntent?.checkOut || (initialSearchIntent?.checkOut ? initialSearchIntent.checkOut : null)
  );
  const [guests, setGuests] = useState<number>(
    restoredBookingIntent?.guests ||
      (initialSearchIntent?.totalGuests && initialSearchIntent.totalGuests > 0
        ? clampGuests(initialSearchIntent.totalGuests, property.maxGuests || 1)
        : 1)
  );

  // One-time neutral notice if inherited search intent was clamped
  const [clampedNotice, setClampedNotice] = useState<boolean>(() => {
    if (initialSearchIntent?.totalGuests && initialSearchIntent.totalGuests > (property.maxGuests || 1)) {
      return true;
    }
    return false;
  });

  // Clamp selected guests downward if canonical detail arrives with a lower maxGuests
  useEffect(() => {
    if (isDetailLoaded) {
      setGuests((prev) => {
        const next = clampGuests(prev, effectiveMaxGuests);
        if (prev > effectiveMaxGuests) {
          setClampedNotice(true);
        }
        return next;
      });
    }
  }, [isDetailLoaded, effectiveMaxGuests]);

  // Gallery State: Authoritative detail.images when loaded, exploreImages only before detail loads
  const images = useMemo(() => {
    return resolveDetailGalleryImages(detail?.images, property.images, isDetailLoaded);
  }, [detail?.images, property.images, isDetailLoaded]);

  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const safeImageIndex = images.length > 0 ? Math.min(activeImageIndex, images.length - 1) : 0;

  // Fullscreen Viewer State
  const [fullscreenOpen, setFullscreenOpen] = useState<boolean>(false);

  // Touch swipe support for gallery & fullscreen
  const touchStartXRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    touchStartXRef.current = null;
    if (Math.abs(diff) > 40 && images.length > 1) {
      if (diff > 0) {
        // Swiped left (in RTL: next image)
        setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      } else {
        // Swiped right (in RTL: prev image)
        setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      }
    }
  };

  // Authoritative Property Type label
  const propertyTypeLabel = useMemo(() => {
    return resolvePropertyType(detail, property);
  }, [detail, property]);

  // Authoritative Property Location label
  const propertyLocation = useMemo(() => {
    return resolvePropertyLocation(detail, property);
  }, [detail, property]);

  // Canonical base nightly price (never 0 ج.م)
  const canonicalNightlyPrice = detail?.basePricePerNight || property.basePricePerNight || 0;

  // Description expand toggle
  const [descriptionExpanded, setDescriptionExpanded] = useState<boolean>(false);

  // Amenities preview toggle (max 4 initially)
  const [showAllAmenities, setShowAllAmenities] = useState<boolean>(false);

  // House Rules
  const renderableRules = useMemo(() => {
    return getRenderableHouseRules(detail?.houseRules);
  }, [detail?.houseRules]);
  const [showAllRules, setShowAllRules] = useState<boolean>(false);

  // Availability State
  const [availabilityLoading, setAvailabilityLoading] = useState<boolean>(true);
  const [availabilityError, setAvailabilityError] = useState<boolean>(false);
  const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([]);
  const [minStay, setMinStay] = useState<number>(2);
  const [maxStay, setMaxStay] = useState<number>(30);
  const [dateNotice, setDateNotice] = useState<string | null>(null);

  // Server Price Quote State
  const [quoteLoading, setQuoteLoading] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quote, setQuote] = useState<ServerPriceQuote | null>(null);

  // Booking Review Screen
  const [showReviewSheet, setShowReviewSheet] = useState<boolean>(false);

  // Ref to Booking Decision Section for Sticky CTA scrolling
  const bookingSectionRef = useRef<HTMLDivElement>(null);

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
        const ranges: BlockedRange[] = json.data.unavailableRanges || [];
        const minS = json.data.minStay || 2;
        const maxS = json.data.maxStay || 30;
        setBlockedRanges(ranges);
        setMinStay(minS);
        setMaxStay(maxS);

        // Revalidate inherited dates against canonical availability
        const todayStr = getLocalTodayISO();
        setCheckIn((prevIn) => {
          if (!prevIn) return null;
          setCheckOut((prevOut) => {
            const check = validateStayDatesAgainstAvailability(prevIn, prevOut, ranges, minS, maxS, todayStr);
            if (!check.valid) {
              setDateNotice('التواريخ اللي اخترتها لم تعد متاحة. اختر تواريخ جديدة.');
              setQuote(null);
              setQuoteError(null);
              return null;
            }
            return prevOut;
          });
          const checkInOnly = validateStayDatesAgainstAvailability(prevIn, null, ranges, minS, maxS, todayStr);
          if (!checkInOnly.valid) {
            setDateNotice('التواريخ اللي اخترتها لم تعد متاحة. اختر تواريخ جديدة.');
            setQuote(null);
            setQuoteError(null);
            return null;
          }
          return prevIn;
        });
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
    setDateNotice(null);
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
        setQuoteError(json?.error?.message || 'تعذر حساب السعر حاليًا.');
        return;
      }

      setQuote(json.data as ServerPriceQuote);
    } catch {
      setQuoteError('تعذر حساب السعر حاليًا.');
    } finally {
      setQuoteLoading(false);
    }
  }, [authToken, checkIn, checkOut, guests, property.id]);

  // Automatically request server quote when valid dates are selected or guests change
  useEffect(() => {
    if (!availabilityLoading && checkIn && checkOut) {
      fetchServerQuote();
    }
  }, [availabilityLoading, checkIn, checkOut, guests, fetchServerQuote]);

  useEffect(() => {
    if (!restoreBookingReview || !checkIn || !checkOut) return;
    setShowReviewSheet(true);
  }, [restoreBookingReview, checkIn, checkOut]);

  // ── 4. Continue CTA Handler ───────────────────────────────────────────────
  const handleCTAPress = async () => {
    // If dates are not complete, scroll/focus to calendar
    if (!checkIn || !checkOut) {
      bookingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (availabilityError) {
      fetchAvailability();
      return;
    }

    if (quoteError && !quote) {
      fetchServerQuote();
      return;
    }

    if (!quote) {
      await fetchServerQuote();
      return;
    }

    // Flow A: Guest enters Screen 07 directly without auth interception
    setShowReviewSheet(true);
  };


  const datesSelected = Boolean(checkIn && checkOut);

  // Canonical amenities preview (max 4 initially)
  const canonicalAmenities = detail?.amenities || [];
  const visibleAmenities = showAllAmenities ? canonicalAmenities : canonicalAmenities.slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 bg-[#F5F7FA] flex justify-center selection:bg-blue-100" dir="rtl">
      <div className="w-full max-w-[430px] min-h-screen bg-white shadow-2xl relative flex flex-col font-sans overflow-y-auto">

        {/* ── 01 — PROPERTY GALLERY HERO (Responsive 4:3) ── */}
        {isDetailLoaded && images.length === 0 ? (
          /* No-Image State: light neutral placeholder ~#F1F5F9, height ~200-220px */
          <div className="w-full h-[210px] bg-[#F1F5F9] flex flex-col items-center justify-center text-slate-400 gap-2 shrink-0 relative">
            <ImageIcon className="w-8 h-8 text-slate-400" />
            <span className="text-xs font-bold text-slate-500">لا توجد صور متاحة لهذه الوحدة</span>

            {/* Top Overlays: Back & Favorite (48x48) */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
              <button
                type="button"
                onClick={onClose}
                className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white/95 text-slate-800 flex items-center justify-center shadow-md active:scale-95 transition-all"
                aria-label="العودة"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => onToggleFavorite && onToggleFavorite(property.id)}
                className={`w-12 h-12 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all ${
                  isFavorite
                    ? 'bg-white text-[#0059FF] border-2 border-[#0059FF]'
                    : 'bg-white/95 text-slate-700'
                }`}
                aria-label="المفضلة"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-[#0059FF] text-[#0059FF]' : ''}`} />
              </button>
            </div>
          </div>
        ) : (
          <div
            className="relative w-full aspect-[4/3] max-h-[304px] bg-slate-900 shrink-0 overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {images.length > 0 ? (
              <img
                src={images[safeImageIndex]}
                alt={detail?.title || property.title}
                onClick={() => setFullscreenOpen(true)}
                className="w-full h-full object-cover transition-opacity duration-300 cursor-pointer"
              />
            ) : (
              <div className="w-full h-full bg-[#F1F5F9] flex flex-col items-center justify-center text-slate-400 gap-2">
                <ImageIcon className="w-8 h-8 text-slate-400" />
                <span className="text-xs font-bold text-slate-500">لا توجد صور متاحة لهذه الوحدة</span>
              </div>
            )}

            {/* Top Overlays: Back & Favorite (48x48) */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white/95 backdrop-blur-md text-slate-800 flex items-center justify-center shadow-md active:scale-95 transition-all"
                aria-label="العودة"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => onToggleFavorite && onToggleFavorite(property.id)}
                className={`w-12 h-12 min-w-[48px] min-h-[48px] rounded-full backdrop-blur-md flex items-center justify-center shadow-md active:scale-95 transition-all ${
                  isFavorite
                    ? 'bg-white text-[#0059FF] border-2 border-[#0059FF]'
                    : 'bg-white/95 text-slate-700'
                }`}
                aria-label="المفضلة"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-[#0059FF] text-[#0059FF]' : ''}`} />
              </button>
            </div>

            {/* Bottom Overlay: Image Counter Only (No trust claims) */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
                <div className="bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full dir-ltr">
                  {safeImageIndex + 1} / {images.length}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── FULLSCREEN GALLERY VIEWER MODAL ── */}
        {fullscreenOpen && images.length > 0 && (
          <div
            className="fixed inset-0 z-[70] bg-black flex flex-col justify-between select-none"
            dir="rtl"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Top Bar: Close (48x48) & Counter */}
            <div className="flex items-center justify-between p-4 z-10">
              <button
                type="button"
                onClick={() => setFullscreenOpen(false)}
                className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center active:scale-95 transition-all"
                aria-label="إغلاق المعرض"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="text-sm font-bold text-white/90 dir-ltr">
                {safeImageIndex + 1} / {images.length}
              </div>
            </div>

            {/* Main Image View */}
            <div className="flex-1 flex items-center justify-center p-2 relative overflow-hidden">
              <img
                src={images[safeImageIndex]}
                alt={detail?.title || property.title}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Bottom Navigation Indicators */}
            <div className="p-4 flex items-center justify-center gap-1.5">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === safeImageIndex ? 'w-6 bg-white' : 'w-2 bg-white/40'
                  }`}
                  aria-label={`صورة ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── SCROLLABLE CONTENT BODY (safe bottom padding pb-36) ── */}
        <div className="flex-1 p-4 space-y-6 pb-36">

          {/* ── 02 — PROPERTY DECISION HEADER ── */}
          <div className="space-y-2">
            {/* 1. Title: 22px / Cairo 800 */}
            <h1 className="text-[22px] font-extrabold text-slate-900 leading-snug break-words">
              {detail?.title || property.title}
            </h1>

            {/* 2. Location: 13-14px MapPin small */}
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-600">
              <MapPin className="w-4 h-4 text-[#0059FF] shrink-0" />
              <span>{propertyLocation}</span>
            </div>

            {/* 3. Nightly Price: 18px / 800 (Never 0 ج.م) */}
            {canonicalNightlyPrice > 0 && (
              <div className="pt-1 flex items-baseline gap-1">
                <span className="text-[18px] font-extrabold text-slate-900 dir-ltr">
                  {canonicalNightlyPrice.toLocaleString()}
                </span>
                <span className="text-[13px] font-medium text-slate-500">ج.م / ليلة</span>
              </div>
            )}

            {/* 4. Secondary Property Type Metadata */}
            <div className="text-xs text-slate-500 font-medium">
              <span>{propertyTypeLabel}</span>
            </div>
          </div>

          {/* ── 03 — ESSENTIAL FACTS (Concise open row) ── */}
          <div className="flex items-center justify-around py-3 border-y border-slate-100 text-sm">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Users className="w-4.5 h-4.5 text-[#0059FF]" />
              <span>{effectiveMaxGuests} ضيوف</span>
            </div>
            <span className="text-slate-200">|</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Bed className="w-4.5 h-4.5 text-[#0059FF]" />
              <span>{detail?.bedrooms ?? property.bedrooms} غرف</span>
            </div>
            <span className="text-slate-200">|</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Bath className="w-4.5 h-4.5 text-[#0059FF]" />
              <span>{detail?.bathrooms ?? property.bathrooms} حمام</span>
            </div>
          </div>

          {/* ── DETAIL LOADING SKELETON / ERROR ── */}
          {detailLoading ? (
            <div className="p-5 bg-slate-50 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#0059FF]" />
              <span className="text-xs font-bold text-slate-500">جاري تحميل تفاصيل الوحدة...</span>
            </div>
          ) : detailError ? (
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-center space-y-2">
              <AlertCircle className="w-5 h-5 text-rose-500 mx-auto" />
              <p className="text-xs font-bold text-rose-800">{detailError}</p>
              <button
                type="button"
                onClick={fetchDetail}
                className="px-4 py-2 min-h-[44px] bg-white text-rose-600 border border-rose-200 rounded-xl text-xs font-bold inline-flex items-center gap-1 hover:bg-rose-50 active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة المحاولة</span>
              </button>
            </div>
          ) : (
            <>
              {/* ── 04 — SHORT DESCRIPTION (Hidden if absent) ── */}
              {detail?.description && detail.description.trim() !== '' && (
                <div className="space-y-1.5">
                  <h2 className="text-base font-bold text-slate-900">عن هذه الإقامة</h2>
                  <p className="text-sm text-slate-600 font-medium leading-[1.7] whitespace-pre-line">
                    {descriptionExpanded || detail.description.length <= 160
                      ? detail.description
                      : `${detail.description.slice(0, 160)}...`}
                  </p>
                  {detail.description.length > 160 && (
                    <button
                      type="button"
                      onClick={() => setDescriptionExpanded((prev) => !prev)}
                      className="min-h-[44px] inline-flex items-center text-sm font-bold text-[#0059FF] hover:underline"
                    >
                      {descriptionExpanded ? 'عرض أقل' : 'عرض المزيد'}
                    </button>
                  )}
                </div>
              )}

              {/* ── 05 — KEY AMENITIES PREVIEW (Hidden if absent) ── */}
              {canonicalAmenities.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-base font-bold text-slate-900">المميزات والخدمات</h2>
                  <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                    {visibleAmenities.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-[13px] font-medium text-slate-700 truncate">
                          {formatAmenity(item)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {canonicalAmenities.length > 4 && (
                    <button
                      type="button"
                      onClick={() => setShowAllAmenities((prev) => !prev)}
                      className="min-h-[44px] inline-flex items-center text-sm font-bold text-[#0059FF] hover:underline pt-1"
                    >
                      {showAllAmenities ? 'عرض أقل' : `عرض كل المرافق (${canonicalAmenities.length})`}
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── 06 — BOOKING DECISION SECTION: "اختار إقامتك" ── */}
          <div ref={bookingSectionRef} className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">اختار إقامتك</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                حدد التواريخ وعدد الضيوف علشان نعرض لك السعر الصحيح.
              </p>
            </div>

            {/* Calendar State Handling */}
            {availabilityLoading ? (
              <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#0059FF] mb-2" />
                <span className="text-xs font-bold text-slate-500">جاري تحميل التوفر...</span>
              </div>
            ) : availabilityError ? (
              <div className="p-5 bg-rose-50/80 rounded-2xl border border-rose-200 flex flex-col items-center justify-center text-center space-y-2">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                <p className="text-xs font-bold text-rose-800">تعذر تحميل التوفر.</p>
                <button
                  type="button"
                  onClick={fetchAvailability}
                  className="px-4 py-2 min-h-[44px] bg-white text-rose-600 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-rose-50 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
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
                invalidDatesNotice={dateNotice}
              />
            )}

            {/* One-time neutral notice for clamped search guests */}
            {clampedNotice && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 font-medium text-right">
                تم ضبط عدد الضيوف ليتناسب مع سعة الوحدة.
              </div>
            )}

            {/* Guest Selector */}
            <GuestSelector
              guests={guests}
              maxGuests={effectiveMaxGuests}
              onChange={(newGuests) => setGuests(clampGuests(newGuests, effectiveMaxGuests))}
            />
          </div>

          {/* ── 07 — AUTHORITATIVE SERVER QUOTE (ZERO CLIENT TOTAL FALLBACK) ── */}
          {datesSelected && (
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <h2 className="text-base font-bold text-slate-900">تفاصيل السعر</h2>

              {quoteLoading ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0059FF]" />
                  <span>جاري حساب السعر...</span>
                </div>
              ) : quoteError ? (
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">تعذر حساب السعر حاليًا.</p>
                    <button
                      type="button"
                      onClick={fetchServerQuote}
                      className="mt-2 min-h-[44px] px-3 py-1.5 bg-white text-[#0059FF] border border-blue-200 rounded-xl font-bold flex items-center gap-1 active:scale-95"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>إعادة حساب السعر</span>
                    </button>
                  </div>
                </div>
              ) : quote ? (
                /* STRICT SERVER-RETURNED QUOTE ONLY */
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-medium">إجمالي الإقامة ({quote.nights} ليالي):</span>
                    <span className="text-base font-extrabold text-slate-900 dir-ltr">
                      {quote.totalStay.toLocaleString()} ج.م
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-[#EAF1FF] p-2.5 rounded-xl border border-blue-100">
                    <div>
                      <span className="font-bold text-[#0059FF] block">العربون بعد موافقة المالك:</span>
                      <span className="text-[10px] text-slate-500 font-medium">(ليلة واحدة فقط)</span>
                    </div>
                    <span className="text-sm font-bold text-[#0059FF] dir-ltr">
                      {quote.depositAmount.toLocaleString()} ج.م
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600 px-1">
                    <span className="font-medium">المبلغ المتبقي:</span>
                    <span className="font-bold text-slate-800 dir-ltr">
                      {quote.remainingAmount.toLocaleString()} ج.م
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-400 text-[11px] pt-1 px-1 border-t border-slate-200/60">
                    <span>السعر في الليلة:</span>
                    <span className="dir-ltr font-bold text-slate-600">
                      {quote.pricePerNight.toLocaleString()} ج.م
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ── 08 — CALM BOOKING PROCESS EXPLANATION ── */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900">كيف بيتم الحجز؟</h2>
            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/60 space-y-3 text-xs leading-relaxed">
              <div>
                <span className="font-bold text-slate-800 block">1 — أرسل طلب الحجز</span>
                <span className="text-slate-500 font-medium block mt-0.5">لن تدفع أي مبلغ الآن.</span>
              </div>
              <div className="border-t border-blue-100/40 pt-2">
                <span className="font-bold text-slate-800 block">2 — المالك يراجع الطلب</span>
                <span className="text-slate-500 font-medium block mt-0.5">سيتم تحديث حالة الطلب بعد قراره.</span>
              </div>
              <div className="border-t border-blue-100/40 pt-2">
                <span className="font-bold text-slate-800 block">3 — بعد الموافقة تدفع العربون</span>
                <span className="text-slate-500 font-medium block mt-0.5">وبعد نجاح الدفع يصبح الحجز مؤكدًا.</span>
              </div>
            </div>
          </div>

          {/* ── 09 — SECONDARY DETAILS (bedsCount, area, house rules) ── */}
          {(((detail?.bedsCount !== undefined && detail?.bedsCount !== null) ||
            (detail?.areaSqM !== undefined && detail?.areaSqM !== null)) ||
            renderableRules.hasRenderableRules) && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              {/* Secondary Facts: beds & area */}
              {((detail?.bedsCount !== undefined && detail?.bedsCount !== null) ||
                (detail?.areaSqM !== undefined && detail?.areaSqM !== null)) && (
                <div className="flex items-center gap-4 text-xs text-slate-600 font-medium">
                  {detail.bedsCount !== undefined && detail.bedsCount !== null && (
                    <div>
                      <span className="text-slate-400">الأسرّة: </span>
                      <span className="font-bold text-slate-800">{detail.bedsCount}</span>
                    </div>
                  )}
                  {detail.areaSqM !== undefined && detail.areaSqM !== null && (
                    <div>
                      <span className="text-slate-400">المساحة: </span>
                      <span className="font-bold text-slate-800">{detail.areaSqM} م²</span>
                    </div>
                  )}
                </div>
              )}

              {/* House Rules: "قواعد الإقامة" (Hidden if absent) */}
              {renderableRules.hasRenderableRules && (
                <div className="space-y-2">
                  <h2 className="text-base font-bold text-slate-900">قواعد الإقامة</h2>
                  <div className="space-y-2 text-xs text-slate-600 font-medium">
                    {renderableRules.smokingAllowed !== undefined && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-700 font-bold">التدخين:</span>
                        <span>{renderableRules.smokingAllowed ? 'مسموح' : 'غير مسموح داخل الوحدة'}</span>
                      </div>
                    )}
                    {renderableRules.partiesAllowed !== undefined && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-700 font-bold">الحفلات والفعاليات:</span>
                        <span>{renderableRules.partiesAllowed ? 'مسموح' : 'غير مسموح'}</span>
                      </div>
                    )}
                    {renderableRules.petsAllowed !== undefined && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-700 font-bold">الحيوانات الأليفة:</span>
                        <span>{renderableRules.petsAllowed ? 'مسموح' : 'غير مسموح'}</span>
                      </div>
                    )}

                    {/* Expandable rules if many */}
                    {(showAllRules || (!renderableRules.smokingAllowed && !renderableRules.partiesAllowed && !renderableRules.petsAllowed)) && (
                      <>
                        {renderableRules.childrenAllowed !== undefined && (
                          <div className="flex items-center justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-700 font-bold">استقبال الأطفال:</span>
                            <span>{renderableRules.childrenAllowed ? 'مناسب للأطفال' : 'غير مناسب للأطفال'}</span>
                          </div>
                        )}
                        {renderableRules.checkInTime && (
                          <div className="flex items-center justify-between py-1 border-b border-slate-100">
                            <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>تسجيل الوصول:</span>
                            </div>
                            <span>{renderableRules.checkInTime}</span>
                          </div>
                        )}
                        {renderableRules.checkOutTime && (
                          <div className="flex items-center justify-between py-1 border-b border-slate-100">
                            <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>تسجيل المغادرة:</span>
                            </div>
                            <span>{renderableRules.checkOutTime}</span>
                          </div>
                        )}
                        {renderableRules.additionalRules && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mt-2">
                            <span className="font-bold text-slate-700 block mb-1">تعليمات إضافية من المالك:</span>
                            <p className="text-slate-600 leading-relaxed whitespace-pre-line">{renderableRules.additionalRules}</p>
                          </div>
                        )}
                      </>
                    )}

                    {(renderableRules.childrenAllowed !== undefined || renderableRules.checkInTime || renderableRules.checkOutTime || renderableRules.additionalRules) && (
                      <button
                        type="button"
                        onClick={() => setShowAllRules((prev) => !prev)}
                        className="min-h-[44px] inline-flex items-center text-xs font-bold text-[#0059FF] hover:underline"
                      >
                        {showAllRules ? 'عرض أقل' : 'عرض كل القواعد'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── 10 — STICKY DECISION BAR (Always visible from entry) ── */}
        <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-center pointer-events-none">
          <div className="w-full max-w-[430px] bg-white border-t border-slate-200/90 p-3 shadow-lg flex items-center justify-between gap-3 pointer-events-auto">

            {/* Left Column: Price Preview / Status */}
            <div className="min-w-[120px]">
              {availabilityError ? (
                <div>
                  <span className="text-xs font-medium text-slate-500 block">السعر في الليلة</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-extrabold text-base text-slate-900 dir-ltr">
                      {canonicalNightlyPrice.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-slate-500">ج.م</span>
                  </div>
                </div>
              ) : quoteLoading ? (
                <div>
                  <span className="text-xs font-bold text-slate-600 block">جاري حساب الإجمالي</span>
                </div>
              ) : quoteError && !quote ? (
                <div>
                  <span className="text-xs font-bold text-rose-600 block">تعذر حساب الإجمالي</span>
                </div>
              ) : datesSelected && quote ? (
                <div>
                  <span className="text-xs font-medium text-slate-500 block">إجمالي الإقامة</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-extrabold text-lg text-[#0059FF] dir-ltr">
                      {quote.totalStay.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-slate-700">ج.م</span>
                  </div>
                </div>
              ) : (
                <div>
                  <span className="text-xs font-medium text-slate-500 block">السعر في الليلة</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-extrabold text-base text-slate-900 dir-ltr">
                      {canonicalNightlyPrice > 0 ? canonicalNightlyPrice.toLocaleString() : ''}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {canonicalNightlyPrice > 0 ? 'ج.م' : 'اختر التواريخ لمعرفة السعر'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Dynamic Action CTA (Height 52-56px) */}
            <button
              type="button"
              onClick={handleCTAPress}
              disabled={availabilityLoading || quoteLoading}
              className={`flex-1 h-14 min-h-[52px] font-bold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5 ${
                availabilityLoading || quoteLoading
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-[#0059FF] hover:bg-blue-600 active:scale-98 text-white shadow-blue-500/25'
              }`}
            >
              {availabilityLoading ? (
                /* State C: Availability loading */
                <span>جاري تحميل التوفر...</span>
              ) : availabilityError ? (
                /* State D: Availability failure (active recovery) */
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-4 h-4" />
                  <span>إعادة تحميل التوفر</span>
                </span>
              ) : !checkIn ? (
                /* State A: No dates */
                <span>اختيار التواريخ</span>
              ) : !checkOut ? (
                /* State B: Check-in only */
                <span>اختيار تاريخ المغادرة</span>
              ) : quoteLoading ? (
                /* State E: Quote loading */
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري حساب السعر...</span>
                </>
              ) : quoteError && !quote ? (
                /* State F: Quote failure (active recovery) */
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-4 h-4" />
                  <span>إعادة حساب السعر</span>
                </span>
              ) : (
                /* State G: Quote ready (FINAL CTA copy) */
                <span>مراجعة طلب الحجز</span>
              )}
            </button>

          </div>
        </div>

        {/* ── SCREEN 07: BOOKING REQUEST REVIEW (Dedicated Full-Screen Surface) ── */}
        {showReviewSheet && (quote || restoredBookingIntent?.quoteSnapshot) && (
          <BookingRequestReviewScreen
            property={property}
            canonicalTitle={detail?.title || property.title}
            canonicalLocation={propertyLocation}
            canonicalImage={images[0] || null}
            checkIn={checkIn!}
            checkOut={checkOut!}
            guests={guests}
            initialQuote={quote || restoredBookingIntent!.quoteSnapshot!}
            authToken={authToken}
            onBack={() => setShowReviewSheet(false)}
            onEditDetails={() => setShowReviewSheet(false)}
            onRequireAuth={(context) => {
              onRequireAuth({
                ...context,
                propertyId: property.id,
              });
            }}
            onSubmitSuccess={(bookingData) => {
              setShowReviewSheet(false);
              onBookingSuccess?.(bookingData);
            }}
            onAvailabilityConflict={() => {
              setShowReviewSheet(false);
              setCheckIn(null);
              setCheckOut(null);
              setQuote(null);
              bookingSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            restoredFromAuth={restoreBookingReview}
            existingRequestId={restoredBookingIntent?.requestId}
            onContextCaptured={onBookingReviewRestored}
          />
        )}

      </div>
    </div>
  );
};

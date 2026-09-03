import { useState, useEffect } from 'react';
import { CustomerHeader } from './components/CustomerHeader';
import { CoastalSearchBar, SearchFilterState } from './components/CoastalSearchBar';
import { PropertyCard, CustomerPropertyItem } from './components/PropertyCard';
import { PropertyDetailModal } from './components/PropertyDetailModal';
import { CustomerAuthModal, type CustomerUserProfile } from './components/CustomerAuthModal';
import { CustomerEditAccountPage } from './components/CustomerEditAccountPage';
import { CustomerSupportModal } from './components/CustomerSupportModal';
import { CustomerWalletModal } from './components/CustomerWalletModal';
import type { BookingDetails } from './components/CustomerCheckoutModal';
import { BookingSuccessModal } from './components/BookingSuccessModal';
import { BookingDetailModal, type CustomerBookingRecord } from './components/BookingDetailModal';
import { CustomerBottomNav, CustomerTabType } from './components/CustomerBottomNav';
import { LoadingStateView, EmptyStateView, ErrorStateView } from './components/StateViews';
import { getApiUrl } from './utils/api';
import { fetchCanonicalCollection } from './utils/customerTruthfulState';
import { buildPublicPropertySearchPath } from './utils/publicPropertySearch';
import {
  fetchCustomerFavorites,
  addCustomerFavorite,
  removeCustomerFavorite,
  mergeCustomerProfile,
  fetchCustomerAccountSummary,
} from './utils/customerFavorites';
import {
  Heart,
  CalendarCheck,
  User,
  AlertCircle,
  ImageOff,
  MapPin,
  Users,
  ChevronLeft,
  HelpCircle,
  Wallet,
  Edit3,
  LogOut,
} from 'lucide-react';

export function App() {
  // Persisted credentials are only candidates. Public browsing can render while
  // restoration runs, but protected Customer UI waits for canonical validation.
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(localStorage.getItem('sola_customer_phone'));
  const [userProfile, setUserProfile] = useState<CustomerUserProfile | null>(() => {
    const saved = localStorage.getItem('sola_customer_profile');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });
  const [customerAuthError, setCustomerAuthError] = useState<string | null>(null);

  // Dedicated Full-Screen Edit Account View State
  const [isEditingAccount, setIsEditingAccount] = useState<boolean>(false);

  // Account Hub Summary State
  const [accountSummary, setAccountSummary] = useState<{
    confirmedBookingsCount: number;
    upcomingStaysCount: number;
    totalBookingsCount: number;
    totalDepositsPaidEgp: number;
  } | null>(null);
  const [accountSummaryError, setAccountSummaryError] = useState<string | null>(null);

  // Data & Search States
  const [properties, setProperties] = useState<CustomerPropertyItem[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<CustomerPropertyItem[]>([]);
  const [activeDestination, setActiveDestination] = useState<string>('الكل');
  type FavoritesLoadState = 'UNAUTHORIZED' | 'LOADING' | 'SUCCESS' | 'ERROR';
  const [favoriteProperties, setFavoriteProperties] = useState<CustomerPropertyItem[]>([]);
  const [favoritesLoadState, setFavoritesLoadState] = useState<FavoritesLoadState>('UNAUTHORIZED');
  const [favoritesError, setFavoritesError] = useState<string | null>(null);
  const [favoriteInFlightIds, setFavoriteInFlightIds] = useState<Set<string>>(new Set());
  const favorites = favoriteProperties.map((p) => p.id);
  const [propertyLoadState, setPropertyLoadState] = useState<'LOADING' | 'SUCCESS' | 'ERROR'>('LOADING');
  const [propertyLoadError, setPropertyLoadError] = useState<string | null>(null);

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<CustomerTabType>('EXPLORE');
  const [selectedProperty, setSelectedProperty] = useState<CustomerPropertyItem | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showSupportModal, setShowSupportModal] = useState<boolean>(false);
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [restoreBookingReview, setRestoreBookingReview] = useState<boolean>(false);

  // Intercepted Guest Context
  const [interceptedContext, setInterceptedContext] = useState<{
    propertyId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
  } | null>(() => {
    const saved = localStorage.getItem('sola_customer_pending_booking_intent');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });

  // Active Booking State for Checkout / Details
  const [activeBooking, setActiveBooking] = useState<BookingDetails | null>(null);
  const [customerBookings, setCustomerBookings] = useState<CustomerBookingRecord[]>([]);
  const [bookingDetailId, setBookingDetailId] = useState<string | null>(null);
  const [bookingsLoading, setBookingsLoading] = useState<boolean>(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  // Fetch Published Properties from API (Server-Authoritative Public Search — P2.1)
  const fetchProperties = async (filters?: Partial<SearchFilterState>) => {
    setPropertyLoadState('LOADING');
    setPropertyLoadError(null);
    let path: string;
    try {
      path = buildPublicPropertySearchPath(filters);
    } catch {
      setPropertyLoadError('بيانات البحث غير صالحة. راجع الفلاتر وحاول مرة أخرى.');
      setPropertyLoadState('ERROR');
      return;
    }
    const result = await fetchCanonicalCollection<CustomerPropertyItem>(path);
    if (result.kind === 'success') {
      setProperties(result.data);
      setFilteredProperties(result.data);
      setPropertyLoadState('SUCCESS');
      return;
    }
    setPropertyLoadError(result.kind === 'unauthorized'
      ? 'تعذر تحميل أماكن الإقامة حالياً. حاول مرة أخرى.'
      : result.message);
    setPropertyLoadState('ERROR');
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  // Server-Authoritative Search Filter Handler (P2.1)
  const handleSearchFilters = (filters: SearchFilterState) => {
    void fetchProperties(filters);
  };

  const handleSelectDestinationChip = (dest: string) => {
    setActiveDestination(dest);
    if (dest === 'الكل') {
      void fetchProperties();
    } else {
      void fetchProperties({ destination: dest });
    }
  };

  // Fetch Real Customer Profile (AUTH-03 & P2.2)
  const fetchCustomerProfile = async (token?: string | null) => {
    const t = token || authToken || localStorage.getItem('sola_customer_access_token');
    if (!t) return;
    try {
      const res = await fetch(getApiUrl('/customer/profile'), {
        headers: {
          Authorization: `Bearer ${t}`,
        },
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const canonicalProfile = mergeCustomerProfile(json.data);
        setUserProfile(canonicalProfile as any);
        localStorage.setItem('sola_customer_profile', JSON.stringify(canonicalProfile));
      }
    } catch {}
  };

  // Fetch Real Account Hub Summary Metrics (P2.2)
  const fetchAccountSummary = async (token?: string | null) => {
    const t = token || authToken || localStorage.getItem('sola_customer_access_token');
    if (!t) return;
    setAccountSummaryError(null);
    try {
      const data = await fetchCustomerAccountSummary(t);
      setAccountSummary(data);
    } catch {
      setAccountSummaryError('تعذر تحميل ملخص الحساب');
    }
  };

  // Fetch Canonical Favorites Collection (P2.2)
  const loadFavorites = async (token?: string | null) => {
    const t = token || authToken || localStorage.getItem('sola_customer_access_token');
    if (!t) {
      setFavoriteProperties([]);
      setFavoritesLoadState('UNAUTHORIZED');
      return;
    }
    setFavoritesLoadState('LOADING');
    setFavoritesError(null);
    try {
      const items = await fetchCustomerFavorites(t);
      setFavoriteProperties(items as any);
      setFavoritesLoadState('SUCCESS');
    } catch (err: any) {
      setFavoritesLoadState('ERROR');
      setFavoritesError(err?.message || 'تعذر تحميل الوحدات المفضلة');
    }
  };

  const toBookingRecord = (booking: any): CustomerBookingRecord => ({
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    propertyId: booking.propertyId,
    propertyTitle: booking.property?.title || booking.propertyTitle || '',
    propertyImage: booking.property?.images?.[0] || booking.propertyImage || '',
    locationName: booking.property?.locationName || booking.locationName || '',
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    nights: Number(booking.nights),
    guestsCount: Number(booking.guestsCount ?? booking.guests ?? 0),
    status: booking.status,
    totalStay: Number(booking.financialSummary?.totalBookingValue ?? booking.totalStay),
    depositAmount: Number(booking.financialSummary?.depositAmount ?? booking.depositAmount),
    remainingAmount: Number(booking.financialSummary?.remainingBalance ?? booking.remainingAmount),
    property: booking.property,
  });

  const toBookingDetails = (booking: CustomerBookingRecord): BookingDetails => ({
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    propertyTitle: booking.propertyTitle,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    totalNights: booking.nights,
    depositAmountEgp: booking.depositAmount,
    remainingBalanceEgp: booking.remainingAmount,
    totalBookingValueEgp: booking.totalStay,
    status: booking.status as BookingDetails['status'],
  });

  const fetchBookings = async (token?: string | null) => {
    const t = token || authToken || localStorage.getItem('sola_customer_access_token');
    if (!t) {
      setActiveBooking(null);
      setCustomerBookings([]);
      return [];
    }
    setBookingsLoading(true);
    setBookingsError(null);
    try {
      const res = await fetch(getApiUrl('/customer/bookings'), { headers: { Authorization: `Bearer ${t}` } });
      const json = await res.json();
      if (!res.ok || !json.success || !Array.isArray(json.data)) {
        throw new Error(json?.error?.message || 'تعذر جلب طلبات الحجز');
      }
      const bookings = json.data.map(toBookingRecord);
      setCustomerBookings(bookings);
      setActiveBooking(bookings[0] ? toBookingDetails(bookings[0]) : null);
      return bookings;
    } catch (err: any) {
      setBookingsError(err?.message || 'تعذر جلب طلبات الحجز من الخادم');
      throw err;
    } finally {
      setBookingsLoading(false);
    }
  };

  // Session Restoration & Token Refresh on Mount
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('sola_customer_access_token');
      const refreshToken = localStorage.getItem('sola_customer_refresh_token');

      if (storedToken) {
        try {
          const profileRes = await fetch(getApiUrl('/customer/profile'), {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          const profileJson = await profileRes.json();
          if (profileRes.ok && profileJson.success && profileJson.data) {
            const canonicalProfile = mergeCustomerProfile(profileJson.data);
            setUserProfile(canonicalProfile as any);
            localStorage.setItem('sola_customer_profile', JSON.stringify(canonicalProfile));
            setAuthToken(storedToken);
            setCustomerAuthError(null);
            fetchAccountSummary(storedToken);
            loadFavorites(storedToken);
            void fetchBookings(storedToken).catch(() => undefined);
            return;
          }
          if (profileRes.status !== 401 && profileRes.status !== 403) {
            setCustomerAuthError('تعذر التحقق من جلسة حسابك. تحقق من الاتصال ثم أعد المحاولة.');
            return;
          }
        } catch {
          setCustomerAuthError('تعذر التحقق من جلسة حسابك. تحقق من الاتصال ثم أعد المحاولة.');
          return;
        }
      }

      if (refreshToken) {
        try {
          const res = await fetch(getApiUrl('/auth/refresh'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          const json = await res.json();
          if (res.ok && json.success && json.data?.accessToken) {
            localStorage.setItem('sola_customer_access_token', json.data.accessToken);
            setAuthToken(json.data.accessToken);
            fetchCustomerProfile(json.data.accessToken);
            fetchAccountSummary(json.data.accessToken);
            loadFavorites(json.data.accessToken);
            void fetchBookings(json.data.accessToken).catch(() => undefined);
          } else {
            handleLogout();
          }
        } catch {
          // Keep the persisted candidate for a later retry, but never render it
          // as an authenticated Customer session.
          setCustomerAuthError('تعذر استعادة جلسة حسابك. تحقق من الاتصال ثم أعد المحاولة.');
        }
      } else if (!storedToken) {
        setAuthToken(null);
      }
    };
    restoreSession();
  }, []);

  // Sync profile & summary whenever navigating to Account tab
  useEffect(() => {
    if (activeTab === 'ACCOUNT') {
      const tok = authToken || localStorage.getItem('sola_customer_access_token');
      if (tok) {
        fetchCustomerProfile(tok);
        fetchAccountSummary(tok);
      }
    }
  }, [activeTab, authToken]);

  useEffect(() => {
    if (activeTab === 'FAVORITES' && authToken) {
      loadFavorites(authToken);
    }
  }, [activeTab, authToken]);

  useEffect(() => {
    if (activeTab === 'BOOKINGS' && authToken) {
      void fetchBookings(authToken).catch(() => undefined);
    }
  }, [activeTab, authToken]);

  const getInitials = (name?: string | null): string => {
    if (!name || name.trim().length === 0) return 'ن';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}.${parts[1][0]}`;
    }
    return parts[0].slice(0, 2);
  };

  // Favorite Toggle Handler (Protected Action - P2.2)
  const handleToggleFavorite = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!authToken) {
      // Unauthenticated Guest Interception for Favorites
      localStorage.setItem('sola_customer_pending_favorite_property_id', id);
      setShowAuthModal(true);
      return;
    }

    if (favoriteInFlightIds.has(id)) return;

    setFavoriteInFlightIds((prev) => new Set(prev).add(id));
    const isFav = favoriteProperties.some((p) => p.id === id);

    try {
      if (isFav) {
        await removeCustomerFavorite(authToken, id);
        setFavoriteProperties((prev) => prev.filter((p) => p.id !== id));
      } else {
        await addCustomerFavorite(authToken, id);
        const fresh = await fetchCustomerFavorites(authToken);
        setFavoriteProperties(fresh as any);
      }
    } catch {
      // Error leaves heart state untouched truthfully
    } finally {
      setFavoriteInFlightIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Auth Handlers
  const handleAuthSuccess = (
    token: string,
    phone: string,
    refreshToken?: string,
    user?: CustomerUserProfile
  ) => {
    localStorage.setItem('sola_customer_access_token', token);
    if (refreshToken) {
      localStorage.setItem('sola_customer_refresh_token', refreshToken);
    }
    localStorage.setItem('sola_customer_phone', phone);
    setAuthToken(token);
    setCustomerAuthError(null);
    setCustomerPhone(phone);

    if (user) {
      const canonicalProfile = mergeCustomerProfile(user);
      setUserProfile(canonicalProfile as any);
      localStorage.setItem('sola_customer_profile', JSON.stringify(canonicalProfile));
    } else {
      fetchCustomerProfile(token);
    }
    fetchAccountSummary(token);
    void fetchBookings(token).catch(() => undefined);

    // Check pending favorite intent
    const pendingFavId = localStorage.getItem('sola_customer_pending_favorite_property_id');
    if (pendingFavId) {
      addCustomerFavorite(token, pendingFavId)
        .then(() => {
          localStorage.removeItem('sola_customer_pending_favorite_property_id');
          loadFavorites(token);
        })
        .catch(() => {
          loadFavorites(token);
        });
    } else {
      loadFavorites(token);
    }

    setShowAuthModal(false);

    // Context Preservation: Return to exact same property & dates post-login
    if (interceptedContext) {
      const targetProp = properties.find((p) => p.id === interceptedContext.propertyId) || selectedProperty;
      if (targetProp) {
        setSelectedProperty(targetProp);
      }
      setRestoreBookingReview(true);
    }
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('sola_customer_refresh_token');
    if (refreshToken) {
      try {
        await fetch(getApiUrl('/auth/revoke'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {}
    }
    localStorage.removeItem('sola_customer_access_token');
    localStorage.removeItem('sola_customer_refresh_token');
    localStorage.removeItem('sola_customer_phone');
    localStorage.removeItem('sola_customer_profile');
    localStorage.removeItem('sola_customer_pending_favorite_property_id');
    setAuthToken(null);
    setCustomerPhone(null);
    setUserProfile(null);
    setAccountSummary(null);
    setAccountSummaryError(null);
    setFavoriteProperties([]);
    setFavoritesLoadState('UNAUTHORIZED');
    setFavoritesError(null);
    setActiveBooking(null);
    setCustomerBookings([]);
    setBookingDetailId(null);
    setBookingsError(null);
    setCustomerAuthError(null);
    setActiveTab('EXPLORE');
  };

  // Booking Request Handler: submits intent only. The server owns price, availability, and persistence.
  const handleInitiateBooking = async (
    prop: CustomerPropertyItem,
    checkIn: string,
    checkOut: string,
    guests: number
  ): Promise<void> => {
    if (!authToken) {
      const intent = { propertyId: prop.id, checkIn, checkOut, guests };
      localStorage.setItem('sola_customer_pending_booking_intent', JSON.stringify(intent));
      setInterceptedContext(intent);
      setShowAuthModal(true);
      return;
    }

    const res = await fetch(getApiUrl('/customer/bookings'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ propertyId: prop.id, checkIn, checkOut, guests }),
    });
    const json = await res.json();
    if (!res.ok || !json.success || !json.data) {
      throw new Error(json?.error?.message || 'تعذر إرسال طلب الحجز. لم يتم إنشاء أي طلب.');
    }

    await fetchBookings(authToken);
    setSelectedProperty(null);
    setShowSuccessModal(true);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex justify-center selection:bg-blue-100">
      <div className="w-full max-w-[430px] min-h-screen bg-white shadow-2xl relative flex flex-col font-sans">
        {/* Full-Screen Dedicated Edit Account Page */}
        {isEditingAccount && authToken ? (
          <CustomerEditAccountPage
            user={userProfile}
            customerPhone={customerPhone}
            authToken={authToken}
            onBack={() => setIsEditingAccount(false)}
            onUpdated={(updated, newAccessToken) => {
              setUserProfile(updated);
              localStorage.setItem('sola_customer_profile', JSON.stringify(updated));
              if (newAccessToken) {
                setAuthToken(newAccessToken);
                localStorage.setItem('sola_customer_access_token', newAccessToken);
              }
            }}
          />
        ) : (
          <>
            {/* Mobile White App Header */}
            <CustomerHeader
              customerPhone={customerPhone}
              activeTab={activeTab}
              onOpenAuthModal={() => setShowAuthModal(true)}
              onGoToAccount={() => {
                setIsEditingAccount(false);
                setActiveTab('ACCOUNT');
              }}
              onLogout={handleLogout}
            />

            {/* Main Container — Max Mobile Width */}
            <main className="flex-1 w-full px-4 pt-3 pb-20">
        {/* Tab 1: EXPLORE */}
        {activeTab === 'EXPLORE' && (
          <div>
            {/* Mobile Coastal Search & Destination Chips */}
            <CoastalSearchBar
              onSearch={handleSearchFilters}
              activeDestination={activeDestination}
              onSelectDestinationChip={handleSelectDestinationChip}
            />

            {/* Results Counter */}
            <div className="flex items-center justify-between my-3">
              <h2 className="text-sm font-black text-slate-900">
                الوحدات الساحلية المتاحة ({filteredProperties.length})
              </h2>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ضمان كونفرم للإقامات ⭐️
              </span>
            </div>

            {/* Viewport States */}
            {propertyLoadState === 'LOADING' ? (
              <LoadingStateView message="جاري استكشاف إقامات الساحل الشمالي..." />
            ) : propertyLoadState === 'ERROR' ? (
              <ErrorStateView
                title="تعذر تحميل أماكن الإقامة"
                message={propertyLoadError || 'تحقق من الاتصال وحاول مرة أخرى.'}
                onRetry={fetchProperties}
              />
            ) : filteredProperties.length === 0 ? (
              <EmptyStateView
                title={properties.length === 0 ? 'لا توجد أماكن إقامة متاحة حالياً' : undefined}
                description={properties.length === 0
                  ? 'لم تتوفر وحدات منشورة حالياً. يمكنك المحاولة لاحقاً.'
                  : undefined}
                onReset={properties.length > 0 ? () => setFilteredProperties(properties) : undefined}
              />
            ) : (
              /* Mobile Vertical Feed */
              <div className="space-y-4 my-3">
                {filteredProperties.map((prop) => (
                  <PropertyCard
                    key={prop.id}
                    property={prop}
                    onSelect={() => setSelectedProperty(prop)}
                    isFavorite={favorites.includes(prop.id)}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: FAVORITES */}
        {activeTab === 'FAVORITES' && (
          <div className="my-4">
            <h2 className="text-base font-black text-slate-900 mb-3">
              الوحدات المفضلة ({favoritesLoadState === 'SUCCESS' ? favoriteProperties.length : 0})
            </h2>

            {favoritesLoadState === 'UNAUTHORIZED' ? (
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 text-center my-6">
                <Heart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-black text-slate-800 mb-1">سجّل الدخول لعرض وحداتك المفضلة</h3>
                <p className="text-xs text-slate-500 mb-4 font-bold">
                  يمكنك حفظ ومتابعة الوحدات المفضلة بعد تسجيل الدخول إلى حسابك.
                </p>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-5 py-2.5 bg-[#0059FF] text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  تسجيل الدخول
                </button>
              </div>
            ) : favoritesLoadState === 'LOADING' ? (
              <div className="py-12">
                <LoadingStateView message="جاري تحميل الوحدات المفضلة..." />
              </div>
            ) : favoritesLoadState === 'ERROR' ? (
              <div className="py-8">
                <ErrorStateView
                  title="تعذر تحميل المفضلة"
                  message={favoritesError || 'حدث خطأ أثناء تحميل الوحدات المفضلة.'}
                  onRetry={() => loadFavorites(authToken)}
                />
              </div>
            ) : favoriteProperties.length === 0 ? (
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 text-center my-6">
                <Heart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-black text-slate-800 mb-1">لا توجد وحدات مفضلة بعد</h3>
                <p className="text-xs text-slate-500 mb-4 font-bold">
                  انقر على رمز القلب على أي وحدة ساحلية لحفظها في قائمتك المفضلة.
                </p>
                <button
                  onClick={() => setActiveTab('EXPLORE')}
                  className="px-5 py-2.5 bg-[#0059FF] text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  استكشف الإقامات
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {favoriteProperties.map((prop) => (
                  <PropertyCard
                    key={prop.id}
                    property={prop}
                    onSelect={() => setSelectedProperty(prop)}
                    isFavorite={true}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: BOOKINGS */}
        {activeTab === 'BOOKINGS' && (
          <div className="my-4">
            <h2 className="text-base font-black text-slate-900 mb-3">حجوزاتي والطلبات الحالية</h2>
            {bookingsLoading ? (
              <LoadingStateView message="جاري جلب طلبات الحجز..." />
            ) : bookingsError ? (
              <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
                <p className="text-xs font-bold text-rose-900">{bookingsError}</p>
                <button onClick={() => void fetchBookings()} className="min-h-11 px-4 rounded-xl bg-white border border-rose-200 text-rose-700 text-xs font-black">إعادة المحاولة</button>
              </div>
            ) : customerBookings.length > 0 ? (
              <div className="space-y-3">
                {customerBookings.map((booking) => (
                  <button key={booking.id} onClick={() => setBookingDetailId(booking.id)} className="w-full text-right bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:border-blue-200 transition-colors">
                    <div className="flex gap-3 p-3">
                      <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        {booking.propertyImage ? <img src={booking.propertyImage} alt={booking.propertyTitle} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageOff className="w-5 h-5" /></div>}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex justify-between items-start gap-2"><h3 className="font-black text-sm text-slate-900 truncate">{booking.propertyTitle}</h3><span className={`text-[10px] font-black px-2 py-1 rounded-full shrink-0 ${booking.status === 'APPROVED_PENDING_PAYMENT' ? 'bg-blue-50 text-[#0059FF]' : booking.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>{booking.status === 'PENDING_OWNER_APPROVAL' ? 'قيد المراجعة' : booking.status === 'APPROVED_PENDING_PAYMENT' ? 'وافق المالك — العربون مطلوب' : booking.status === 'CONFIRMED' ? 'الحجز مؤكد' : 'مرفوض'}</span></div>
                        {booking.locationName && <p className="flex gap-1 text-[11px] text-slate-500 truncate"><MapPin className="w-3.5 h-3.5 shrink-0 text-[#0059FF]" />{booking.locationName}</p>}
                        <p className="text-[11px] font-bold text-slate-700" dir="ltr">{booking.checkIn} ← {booking.checkOut} · {booking.nights} ليالٍ</p>
                        <p className="flex gap-1 text-[11px] text-slate-500"><Users className="w-3.5 h-3.5" />{booking.guestsCount} ضيوف</p>
                      </div>
                    </div>
                    <div className="px-3 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs"><span className="text-slate-600">الإجمالي <strong className="text-slate-900">{booking.totalStay.toLocaleString()} ج.م</strong></span><span className="text-[#0059FF] font-black">العربون {booking.depositAmount.toLocaleString()} ج.م · عرض التفاصيل</span></div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 text-center my-6">
                <CalendarCheck className="w-10 h-10 text-[#0059FF] mx-auto mb-2" />
                <h3 className="text-sm font-black text-slate-900 mb-1">لا توجد طلبات حجز حالية</h3>
                <p className="text-xs text-slate-500 mb-5 font-bold">
                  اختر إقامتك المفضل في الساحل الشمالي واطلب حجز الوحدة لتتابع حالة الطلب هنا.
                </p>
                <button
                  onClick={() => setActiveTab('EXPLORE')}
                  className="px-5 py-2.5 bg-[#0059FF] text-white font-extrabold text-xs rounded-xl shadow-xs"
                >
                  استكشف الإقامات الآن
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: ACCOUNT */}
        {activeTab === 'ACCOUNT' && (
          <div className="my-4 space-y-4 pb-20">
            {/* A. Top App Bar */}
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-lg font-black text-slate-900">حسابي</h2>
            </div>

            {authToken ? (
              <div className="space-y-4 animate-fade-in">
                {/* B. Profile Header Card */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden">
                  <div className="flex items-center gap-4">
                    {/* Neutral Initials Avatar */}
                    <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-sm shrink-0">
                      {getInitials(userProfile?.fullName)}
                    </div>

                    <div className="flex-1 min-w-0">
                      {userProfile?.fullName && userProfile.fullName.trim().length > 0 ? (
                        <h3 className="font-black text-slate-900 text-base truncate">
                          {userProfile.fullName.trim()}
                        </h3>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-800">
                          <h3 className="font-black text-sm text-slate-800">مستخدم جديد</h3>
                          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200">
                            أكمل بيانات حسابك
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 mt-0.5">
                        <bdi
                          dir="ltr"
                          style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
                          className="text-xs text-slate-500 font-bold tracking-wide"
                        >
                          {userProfile?.phoneNumber || customerPhone}
                        </bdi>
                      </div>
                    </div>

                    {/* Clear Working Edit Profile Affordance */}
                    <button
                      onClick={() => setIsEditingAccount(true)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1 shrink-0"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>
                  </div>

                  {/* Clean Incomplete Profile Alert Prompt (Only when full_name is genuinely empty) */}
                  {(!userProfile?.fullName || userProfile.fullName.trim().length === 0) && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold text-amber-900">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>يرجى إضافة اسمك بالكامل لإتمام الملف الشخصي.</span>
                      </div>
                      <button
                        onClick={() => setIsEditingAccount(true)}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] rounded-lg shrink-0 transition-colors"
                      >
                        أكمل بيانات حسابك
                      </button>
                    </div>
                  )}
                </div>

                {/* C. Real Account Summary Metrics */}
                {accountSummaryError && (
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-800 text-xs font-bold text-center">
                    {accountSummaryError}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-xs">
                    <p className="text-[11px] font-bold text-slate-400">الحجوزات المؤكدة</p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">
                      {accountSummary ? accountSummary.confirmedBookingsCount : '-'}
                    </p>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-xs">
                    <p className="text-[11px] font-bold text-slate-400">الإقامة القادمة</p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">
                      {accountSummary ? accountSummary.upcomingStaysCount : '-'}
                    </p>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-xs">
                    <p className="text-[11px] font-bold text-slate-400">المفضلة</p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">
                      {favoritesLoadState === 'SUCCESS' ? favoriteProperties.length : '-'}
                    </p>
                  </div>
                </div>

                {/* D. SECTION: رحلاتي */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-black text-slate-400 px-1">رحلاتي</h4>
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
                    {/* Row 1: حجوزاتي */}
                    <button
                      onClick={() => {
                        setIsEditingAccount(false);
                        setActiveTab('BOOKINGS');
                      }}
                      className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-right"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-50 text-[#0059FF] rounded-xl flex items-center justify-center shrink-0">
                          <CalendarCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-black text-slate-900 text-xs">حجوزاتي</h5>
                          <p className="text-[11px] text-slate-400 font-bold">تابع حجوزاتك الحالية والسابقة</p>
                        </div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-slate-400" />
                    </button>

                    {/* Row 2: المفضلة */}
                    <button
                      onClick={() => {
                        setIsEditingAccount(false);
                        setActiveTab('FAVORITES');
                      }}
                      className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-right"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                          <Heart className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-black text-slate-900 text-xs">المفضلة</h5>
                          <p className="text-[11px] text-slate-400 font-bold">الوحدات التي حفظتها للرجوع إليها</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {favorites.length > 0 && (
                          <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                            {favorites.length}
                          </span>
                        )}
                        <ChevronLeft className="w-4 h-4 text-slate-400" />
                      </div>
                    </button>
                  </div>
                </div>

                {/* E. SECTION: المحفظة والمدفوعات */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-black text-slate-400 px-1">المحفظة والمدفوعات</h4>
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <button
                      onClick={() => setShowWalletModal(true)}
                      className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-right"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                          <Wallet className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-black text-slate-900 text-xs">المحفظة والمدفوعات</h5>
                          <p className="text-[11px] text-slate-400 font-bold">العربون والمدفوعات والمبالغ المتعلقة بحجوزاتك</p>
                        </div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* F. SECTION: الحساب */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-black text-slate-400 px-1">الحساب</h4>
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
                    {/* Row 1: البيانات الشخصية */}
                    <button
                      onClick={() => setIsEditingAccount(true)}
                      className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-right"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-black text-slate-900 text-xs">البيانات الشخصية</h5>
                          <p className="text-[11px] text-slate-400 font-bold">تعديل الاسم وتحديث بيانات الحساب</p>
                        </div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-slate-400" />
                    </button>

                    {/* Row 2: المساعدة والدعم */}
                    <button
                      onClick={() => setShowSupportModal(true)}
                      className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-right"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                          <HelpCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-black text-slate-900 text-xs">المساعدة والدعم</h5>
                          <p className="text-[11px] text-slate-400 font-bold">الأسئلة الشائعة وإرشادات الحجز</p>
                        </div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* G. LOGOUT */}
                <div className="pt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full py-3 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 font-black text-xs rounded-xl border border-slate-200 hover:border-rose-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              </div>
            ) : customerAuthError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
                <p className="text-sm font-bold text-rose-800">{customerAuthError}</p>
                <button type="button" onClick={() => window.location.reload()} className="mt-3 min-h-11 rounded-xl bg-[var(--konfrm-color-primary)] px-4 text-xs font-bold text-white">إعادة المحاولة</button>
              </div>
            ) : (
              /* Logged-Out State */
              <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center space-y-4 shadow-xs">
                <div className="w-16 h-16 bg-blue-50 text-[#0059FF] rounded-3xl flex items-center justify-center mx-auto mb-2 shadow-xs">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base mb-1">تسجيل الدخول / إنشاء حساب</h3>
                  <p className="text-xs text-slate-500 font-bold max-w-xs mx-auto leading-relaxed">
                    ادخل رقم هاتفك لتتمكن من تقديم طلبات الحجز المباشرة وحفظ شاليهاتك المفضلة ومتابعة التأكيدات.
                  </p>
                </div>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full py-3.5 bg-[#0059FF] hover:bg-blue-600 active:scale-[0.99] text-white font-black text-xs rounded-xl shadow-lg shadow-blue-500/25 transition-all"
                >
                  دخول برقم الجوال
                </button>
              </div>
            )}
          </div>
        )}
      </main>
      </>
      )}

      {/* Full-Screen Mobile Property Details Screen/Sheet */}
      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          authToken={authToken}
          onClose={() => setSelectedProperty(null)}
          onInitiateBooking={handleInitiateBooking}
          onRequireAuth={(context) => {
            localStorage.setItem('sola_customer_pending_booking_intent', JSON.stringify(context));
            setInterceptedContext(context);
            setShowAuthModal(true);
          }}
          restoredBookingIntent={interceptedContext}
          restoreBookingReview={restoreBookingReview}
          onBookingReviewRestored={() => {
            setRestoreBookingReview(false);
            setInterceptedContext(null);
            localStorage.removeItem('sola_customer_pending_booking_intent');
          }}
          isFavorite={favorites.includes(selectedProperty.id)}
          onToggleFavorite={(id) => handleToggleFavorite(id)}
        />
      )}

      {bookingDetailId && authToken && (
        <BookingDetailModal
          bookingId={bookingDetailId}
          authToken={authToken}
          onClose={() => setBookingDetailId(null)}
          onPaymentSuccess={() => { void fetchBookings(authToken); void fetchAccountSummary(authToken); }}
        />
      )}

      {/* Customer Auth OTP Modal */}
      {showAuthModal && (
        <CustomerAuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
          interceptedContext={interceptedContext}
        />
      )}

      {/* Customer Support Modal */}
      {showSupportModal && (
        <CustomerSupportModal onClose={() => setShowSupportModal(false)} />
      )}

      {/* Customer Wallet & Payments Modal */}
      {showWalletModal && authToken && (
        <CustomerWalletModal
          authToken={authToken}
          onClose={() => setShowWalletModal(false)}
        />
      )}

      {/* Request Success Modal */}
      {showSuccessModal && activeBooking && (
        <BookingSuccessModal
          bookingNumber={activeBooking.bookingNumber}
          propertyTitle={activeBooking.propertyTitle}
          checkIn={activeBooking.checkIn}
          checkOut={activeBooking.checkOut}
          nights={activeBooking.totalNights}
          depositAmount={activeBooking.depositAmountEgp}
          onGoToBookings={() => {
            setShowSuccessModal(false);
            setIsEditingAccount(false);
            setActiveTab('BOOKINGS');
          }}
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      {/* Native Persistent Mobile Bottom Navigation Bar (hidden during property details or edit account view) */}
      {!selectedProperty && !isEditingAccount && (
        <CustomerBottomNav
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setIsEditingAccount(false);
            setActiveTab(tab);
          }}
          favoritesCount={favorites.length}
          hasActiveBooking={!!activeBooking}
        />
      )}
    </div>
  </div>
);
}

export default App;

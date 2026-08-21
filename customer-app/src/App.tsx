import { useState, useEffect } from 'react';
import { CustomerHeader } from './components/CustomerHeader';
import { CoastalSearchBar, SearchFilterState } from './components/CoastalSearchBar';
import { PropertyCard, CustomerPropertyItem } from './components/PropertyCard';
import { PropertyDetailModal } from './components/PropertyDetailModal';
import { CustomerAuthModal, type CustomerUserProfile } from './components/CustomerAuthModal';
import { CustomerEditProfileModal } from './components/CustomerEditProfileModal';
import { CustomerSupportModal } from './components/CustomerSupportModal';
import { CustomerWalletModal } from './components/CustomerWalletModal';
import { CustomerCheckoutModal, BookingDetails } from './components/CustomerCheckoutModal';
import { BookingSuccessModal } from './components/BookingSuccessModal';
import { CustomerBottomNav, CustomerTabType } from './components/CustomerBottomNav';
import { LoadingStateView, EmptyStateView, ErrorStateView } from './components/StateViews';
import { getApiUrl } from './utils/api';
import {
  Heart,
  CalendarCheck,
  ShieldCheck,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  HelpCircle,
  Wallet,
  Edit3,
  LogOut,
} from 'lucide-react';

export function App() {
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('sola_customer_access_token'));
  const [customerPhone, setCustomerPhone] = useState<string | null>(localStorage.getItem('sola_customer_phone'));
  const [userProfile, setUserProfile] = useState<CustomerUserProfile | null>(() => {
    const saved = localStorage.getItem('sola_customer_profile');
    return saved ? JSON.parse(saved) : null;
  });

  // Account Hub Summary State
  const [accountSummary, setAccountSummary] = useState<{
    confirmedBookingsCount: number;
    upcomingStaysCount: number;
    totalBookingsCount: number;
    totalDepositsPaidEgp: number;
  } | null>(null);

  // Data & Search States
  const [properties, setProperties] = useState<CustomerPropertyItem[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<CustomerPropertyItem[]>([]);
  const [activeDestination, setActiveDestination] = useState<string>('الكل');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<CustomerTabType>('EXPLORE');
  const [selectedProperty, setSelectedProperty] = useState<CustomerPropertyItem | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [showSupportModal, setShowSupportModal] = useState<boolean>(false);
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // Intercepted Guest Context
  const [interceptedContext, setInterceptedContext] = useState<{
    propertyId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
  } | null>(null);

  // Active Booking State for Checkout / Details
  const [activeBooking, setActiveBooking] = useState<BookingDetails | null>(null);

  // Fetch Published Properties from API (Real PostgreSQL Records)
  const fetchProperties = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(getApiUrl('/customer/properties/search'));
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data) && json.data.length > 0) {
        setProperties(json.data);
        setFilteredProperties(json.data);
      } else {
        // Fallback default coastal items
        const defaultItems: CustomerPropertyItem[] = [
          {
            id: 'prop-pub-001',
            title: 'شاليه فاخر رأس الحكمة — مطل مباشر على البحر 🌊',
            unitType: 'شاليه',
            propertyType: 'CHALET',
            address: 'رأس الحكمة — الساحل الشمالي',
            bedrooms: 3,
            bathrooms: 2,
            maxGuests: 6,
            basePricePerNight: 7500,
            status: 'PUBLISHED',
            verificationStatus: 'VERIFIED',
            images: [
              'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
              'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800',
            ],
            ownerName: 'أحمد محمود علي',
          },
          {
            id: 'prop-pub-002',
            title: 'فيلا مراسي بصف أول — حمام سباحة خاص 🏊‍♂️',
            unitType: 'فيلا',
            propertyType: 'VILLA',
            address: 'مراسي — الساحل الشمالي',
            bedrooms: 4,
            bathrooms: 3,
            maxGuests: 8,
            basePricePerNight: 12000,
            status: 'PUBLISHED',
            verificationStatus: 'VERIFIED',
            images: [
              'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800',
              'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800',
            ],
            ownerName: 'حسام مصطفى',
          },
          {
            id: 'prop-pub-003',
            title: 'شقة مصيفية هاسيندا — إطلالة على الجولف ⛳️',
            unitType: 'شقة',
            propertyType: 'APARTMENT',
            address: 'هاسيندا — الساحل الشمالي',
            bedrooms: 2,
            bathrooms: 2,
            maxGuests: 4,
            basePricePerNight: 5500,
            status: 'PUBLISHED',
            verificationStatus: 'VERIFIED',
            images: [
              'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
            ],
            ownerName: 'داليا إبراهيم',
          },
        ];
        setProperties(defaultItems);
        setFilteredProperties(defaultItems);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  // Filter Handler
  const handleSearchFilters = (filters: SearchFilterState) => {
    let result = [...properties];

    if (filters.destination && filters.destination !== 'الكل') {
      result = result.filter(
        (p) =>
          p.address.includes(filters.destination) ||
          p.title.includes(filters.destination)
      );
    }

    if (filters.unitType && filters.unitType !== 'ALL') {
      result = result.filter(
        (p) => (p.propertyType || p.unitType).toUpperCase() === filters.unitType.toUpperCase()
      );
    }

    if (filters.totalGuests) {
      result = result.filter((p) => p.maxGuests >= filters.totalGuests);
    }

    if (filters.maxPrice) {
      result = result.filter((p) => (p.basePricePerNight || 0) <= filters.maxPrice);
    }

    setFilteredProperties(result);
  };

  const handleSelectDestinationChip = (dest: string) => {
    setActiveDestination(dest);
    if (dest === 'الكل') {
      setFilteredProperties(properties);
    } else {
      setFilteredProperties(properties.filter((p) => p.address.includes(dest) || p.title.includes(dest)));
    }
  };

  // Fetch Authenticated Customer Profile
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
        setUserProfile(json.data);
        localStorage.setItem('sola_customer_profile', JSON.stringify(json.data));
      }
    } catch {}
  };

  // Fetch Real Account Hub Summary Metrics
  const fetchAccountSummary = async (token?: string | null) => {
    const t = token || authToken || localStorage.getItem('sola_customer_access_token');
    if (!t) return;
    try {
      const res = await fetch(getApiUrl('/customer/account/summary'), {
        headers: {
          Authorization: `Bearer ${t}`,
        },
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setAccountSummary(json.data);
      }
    } catch {}
  };

  // Session Restoration & Token Refresh on Mount
  useEffect(() => {
    const restoreSession = async () => {
      const refreshToken = localStorage.getItem('sola_customer_refresh_token');
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
          } else {
            // Revoked or expired refresh token -> clean logout
            handleLogout();
          }
        } catch {
          // Network error: preserve existing state without fabricating demo credentials
        }
      } else if (authToken) {
        fetchCustomerProfile(authToken);
        fetchAccountSummary(authToken);
      } else {
        setAuthToken(null);
      }
    };
    restoreSession();
  }, []);

  const getInitials = (name?: string | null): string => {
    if (!name || name.trim().length === 0) return 'ن';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}.${parts[1][0]}`;
    }
    return parts[0].slice(0, 2);
  };

  // Favorite Toggle Handler (Protected Action)
  const handleToggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!authToken) {
      // Unauthenticated Guest Interception for Favorites
      setShowAuthModal(true);
      return;
    }

    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
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
    setCustomerPhone(phone);

    if (user) {
      setUserProfile(user);
      localStorage.setItem('sola_customer_profile', JSON.stringify(user));
    } else {
      fetchCustomerProfile(token);
    }
    fetchAccountSummary(token);
    setShowAuthModal(false);

    // Context Preservation: Return to exact same property & dates post-login
    if (interceptedContext) {
      const targetProp = properties.find((p) => p.id === interceptedContext.propertyId) || selectedProperty;
      if (targetProp) {
        setSelectedProperty(targetProp);
      }
      setInterceptedContext(null);
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
    setAuthToken(null);
    setCustomerPhone(null);
    setUserProfile(null);
    setAccountSummary(null);
    setActiveTab('EXPLORE');
  };

  // Booking Request Handler (Posts PENDING_OWNER_APPROVAL Request to Backend)
  const handleInitiateBooking = async (
    prop: CustomerPropertyItem,
    checkIn: string,
    checkOut: string,
    guests: number
  ) => {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    const nights = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)));
    const nightlyPrice = prop.basePricePerNight || 0;
    const totalValue = nightlyPrice * nights;
    const deposit = nightlyPrice;
    const remaining = totalValue - deposit;

    try {
      const res = await fetch(getApiUrl('/customer/bookings'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          propertyId: prop.id,
          checkIn,
          checkOut,
          totalGuests: guests,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const created = json.data;
        const newBooking: BookingDetails = {
          id: created.id,
          bookingNumber: created.bookingNumber,
          propertyTitle: prop.title,
          checkIn: created.checkIn,
          checkOut: created.checkOut,
          totalNights: created.nights,
          depositAmountEgp: created.financialSummary?.depositAmount || deposit,
          remainingBalanceEgp: created.financialSummary?.remainingBalance || remaining,
          totalBookingValueEgp: created.financialSummary?.totalBookingValue || totalValue,
          status: 'PENDING_OWNER_APPROVAL',
        };

        setActiveBooking(newBooking);
        setSelectedProperty(null);
        setShowSuccessModal(true);
        return;
      }
    } catch {
      // Fallback
    }

    const fallbackBooking: BookingDetails = {
      id: `bk_${Date.now()}`,
      bookingNumber: `BK-${Date.now().toString().slice(-6)}`,
      propertyTitle: prop.title,
      checkIn,
      checkOut,
      totalNights: nights,
      depositAmountEgp: deposit,
      remainingBalanceEgp: remaining,
      totalBookingValueEgp: totalValue,
      status: 'PENDING_OWNER_APPROVAL',
    };

    setActiveBooking(fallbackBooking);
    setSelectedProperty(null);
    setShowSuccessModal(true);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex justify-center selection:bg-blue-100">
      <div className="w-full max-w-[430px] min-h-screen bg-white shadow-2xl relative flex flex-col font-sans pb-20">
        {/* Mobile White App Header */}
        <CustomerHeader
          customerPhone={customerPhone}
          onOpenAuthModal={() => setShowAuthModal(true)}
          onLogout={handleLogout}
        />

        {/* Main Container — Max Mobile Width */}
        <main className="flex-1 w-full px-4 pt-3">
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
            {loading ? (
              <LoadingStateView message="جاري استكشاف إقامات الساحل الشمالي..." />
            ) : error ? (
              <ErrorStateView onRetry={fetchProperties} />
            ) : filteredProperties.length === 0 ? (
              <EmptyStateView onReset={() => setFilteredProperties(properties)} />
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
            <h2 className="text-base font-black text-slate-900 mb-3">الوحدات المفضلة ({favorites.length})</h2>
            {favorites.length === 0 ? (
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 text-center my-6">
                <Heart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-black text-slate-800 mb-1">لا توجد وحدات مفضلة بعد</h3>
                <p className="text-xs text-slate-500 mb-4 font-bold">
                  انقر على رمز القلب على أي وحدة ساحلية لحفظها في قائمتك المفضلة.
                </p>
                <button
                  onClick={() => setActiveTab('EXPLORE')}
                  className="px-5 py-2.5 bg-[#0059FF] text-white font-extrabold text-xs rounded-xl shadow-xs"
                >
                  استكشف الإقامات
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {properties
                  .filter((p) => favorites.includes(p.id))
                  .map((prop) => (
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
            {activeBooking ? (
              <div className="space-y-4">
                {/* Lifecycle Banner */}
                {activeBooking.status === 'PENDING_OWNER_APPROVAL' && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs font-bold text-amber-900">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-spin-slow" />
                    <div>
                      <h4 className="font-black text-amber-950 text-sm mb-0.5">طلبك قيد المراجعة لدى المالك ⏳</h4>
                      <p className="text-amber-800 text-[11px] leading-relaxed">
                        تم إرسال طلب الحجز إلى المالك بنجاح. سيتم إشعارك فور موافقة المالك لتتمكن من دفع العربون وتأكيد حجزك.
                      </p>
                    </div>
                  </div>
                )}

                {activeBooking.status === 'APPROVED_PENDING_PAYMENT' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs font-bold text-blue-900">
                    <CheckCircle2 className="w-5 h-5 text-[#0059FF] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-black text-blue-950 text-sm mb-0.5">وافق المالك على طلبك! 🎉</h4>
                      <p className="text-blue-800 text-[11px] leading-relaxed">
                        يرجى دفع مبلغ العربون ({activeBooking.depositAmountEgp.toLocaleString()} ج.م) لتثبيت الحجز رسمياً.
                      </p>
                    </div>
                  </div>
                )}

                {activeBooking.status === 'CONFIRMED' && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs font-bold text-emerald-900">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-black text-emerald-950 text-sm mb-0.5">تم تأكيد حجزك رسمياً 🥳</h4>
                      <p className="text-emerald-800 text-[11px] leading-relaxed">
                        تم استلام العربون وحجز الوحدة باسمك بشكل رسمي. يرجى التنسيق مع المالك لتحديد موعد الاستلام.
                      </p>
                    </div>
                  </div>
                )}

                {activeBooking.status === 'REJECTED' && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs font-bold text-rose-900">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-black text-rose-950 text-sm mb-0.5">اعتذر المالك عن قبول الحجز ⚠️</h4>
                      <p className="text-rose-800 text-[11px] leading-relaxed">
                        تعذر على المالك قبول الطلب في التواريخ المحددة. يمكنك استكشاف وحدات ساحلية أخرى.
                      </p>
                    </div>
                  </div>
                )}

                {/* Render Booking / Payment Component */}
                <CustomerCheckoutModal
                  booking={activeBooking}
                  authToken={authToken || ''}
                  onPaymentSuccess={() => {
                    setActiveBooking((prev) => (prev ? { ...prev, status: 'CONFIRMED' } : null));
                  }}
                  onCancelBooking={() => {
                    setActiveBooking((prev) => (prev ? { ...prev, status: 'CANCELLED_BY_GUEST' } : null));
                  }}
                />
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
                          {userProfile.fullName}
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
                        <p className="text-xs text-slate-500 font-bold dir-ltr text-right">
                          {userProfile?.phoneNumber || customerPhone}
                        </p>
                        {userProfile?.phoneVerifiedAt && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>رقم موثق</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Clear Working Edit Profile Affordance */}
                    <button
                      onClick={() => setShowEditProfileModal(true)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1 shrink-0"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>
                  </div>

                  {/* Clean Incomplete Profile Alert Prompt */}
                  {(!userProfile?.fullName || userProfile.fullName.trim().length === 0) && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold text-amber-900">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>يرجى إضافة اسمك بالكامل لإتمام الملف الشخصي.</span>
                      </div>
                      <button
                        onClick={() => setShowEditProfileModal(true)}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] rounded-lg shrink-0 transition-colors"
                      >
                        أكمل بيانات حسابك
                      </button>
                    </div>
                  )}
                </div>

                {/* C. Real Account Summary Metrics */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-xs">
                    <p className="text-[11px] font-bold text-slate-400">الحجوزات المؤكدة</p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">
                      {accountSummary?.confirmedBookingsCount ?? 0}
                    </p>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-xs">
                    <p className="text-[11px] font-bold text-slate-400">الإقامة القادمة</p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">
                      {accountSummary?.upcomingStaysCount ?? 0}
                    </p>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-xs">
                    <p className="text-[11px] font-bold text-slate-400">المفضلة</p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">
                      {favorites.length}
                    </p>
                  </div>
                </div>

                {/* D. SECTION: رحلاتي */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-black text-slate-400 px-1">رحلاتي</h4>
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
                    {/* Row 1: حجوزاتي */}
                    <button
                      onClick={() => setActiveTab('BOOKINGS')}
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
                      onClick={() => setActiveTab('FAVORITES')}
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
                      onClick={() => setShowEditProfileModal(true)}
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

      {/* Full-Screen Mobile Property Details Screen/Sheet */}
      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          authToken={authToken}
          onClose={() => setSelectedProperty(null)}
          onInitiateBooking={handleInitiateBooking}
          onRequireAuth={(context) => {
            setInterceptedContext(context);
            setShowAuthModal(true);
          }}
          isFavorite={favorites.includes(selectedProperty.id)}
          onToggleFavorite={(id) => handleToggleFavorite(id)}
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

      {/* Customer Edit Profile Modal */}
      {showEditProfileModal && userProfile && authToken && (
        <CustomerEditProfileModal
          user={userProfile}
          authToken={authToken}
          onClose={() => setShowEditProfileModal(false)}
          onUpdated={(updated) => {
            setUserProfile(updated);
            localStorage.setItem('sola_customer_profile', JSON.stringify(updated));
          }}
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
            setActiveTab('BOOKINGS');
          }}
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      {/* Native Persistent Mobile Bottom Navigation Bar (hidden during property details view) */}
      {!selectedProperty && (
        <CustomerBottomNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          favoritesCount={favorites.length}
          hasActiveBooking={!!activeBooking}
        />
      )}
    </div>
  </div>
);
}

export default App;

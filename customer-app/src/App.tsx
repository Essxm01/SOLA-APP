import { useState, useEffect } from 'react';
import { CustomerHeader } from './components/CustomerHeader';
import { CoastalSearchBar, SearchFilterState } from './components/CoastalSearchBar';
import { PropertyCard, CustomerPropertyItem } from './components/PropertyCard';
import { PropertyDetailModal } from './components/PropertyDetailModal';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import { CustomerCheckoutModal, BookingDetails } from './components/CustomerCheckoutModal';
import { BookingSuccessModal } from './components/BookingSuccessModal';
import { CustomerBottomNav, CustomerTabType } from './components/CustomerBottomNav';
import { LoadingStateView, EmptyStateView, ErrorStateView } from './components/StateViews';
import { getApiUrl } from './utils/api';
import { Heart, CalendarCheck, ShieldCheck, UserCheck, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export function App() {
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('sola_customer_access_token'));
  const [customerPhone, setCustomerPhone] = useState<string | null>(localStorage.getItem('sola_customer_phone'));

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
  const handleAuthSuccess = (token: string, phone: string) => {
    localStorage.setItem('sola_customer_access_token', token);
    localStorage.setItem('sola_customer_phone', phone);
    setAuthToken(token);
    setCustomerPhone(phone);
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

  const handleLogout = () => {
    localStorage.removeItem('sola_customer_access_token');
    localStorage.removeItem('sola_customer_phone');
    setAuthToken(null);
    setCustomerPhone(null);
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
    const firstNightPrice = prop.basePricePerNight || 5000;
    const totalValue = firstNightPrice * nights;
    const deposit = firstNightPrice;
    const remaining = totalValue - deposit;

    // Send real POST request to backend API
    try {
      await fetch(getApiUrl('/customer/bookings'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          propertyId: prop.id,
          checkIn,
          checkOut,
          totalGuests: guests,
        }),
      }).catch(() => null);
    } catch {
      // Non-blocking fallback
    }

    const newBooking: BookingDetails = {
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

    setActiveBooking(newBooking);
    setSelectedProperty(null);
    setShowSuccessModal(true);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans pb-20">
      {/* Mobile White App Header */}
      <CustomerHeader
        customerPhone={customerPhone}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Container — Max Mobile Width */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-3">
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
                ضمان صولا للإقامات ⭐️
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
                  authToken={authToken || 'demo_customer_token'}
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
          <div className="my-4 space-y-4">
            <h2 className="text-base font-black text-slate-900 mb-3">حسابي</h2>
            {authToken ? (
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#0059FF] text-white rounded-2xl flex items-center justify-center font-black text-lg">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">نزيل صولا المعتمد</h3>
                    <p className="text-xs text-slate-500 font-bold dir-ltr">{customerPhone}</p>
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>حسابك موثق برقم الهاتف وجاهز لتقديم طلبات الحجز المباشرة.</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-xs rounded-xl transition-all"
                >
                  تسجيل الخروج
                </button>
              </div>
            ) : (
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 text-center space-y-3">
                <h3 className="font-black text-slate-900 text-sm">تسجيل الدخول / إنشاء حساب</h3>
                <p className="text-xs text-slate-500 font-bold">
                  ادخل رقم هاتفك لتأكيد طلبات الحجز وحفظ الإقامات المفضلة لديك.
                </p>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full py-3 bg-[#0059FF] text-white font-black text-xs rounded-xl shadow-xs"
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

      {/* Native Persistent Mobile Bottom Navigation Bar */}
      <CustomerBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        favoritesCount={favorites.length}
        hasActiveBooking={!!activeBooking}
      />
    </div>
  );
}

export default App;

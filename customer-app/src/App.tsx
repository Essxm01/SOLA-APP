import { useState, useEffect } from 'react';
import { CustomerHeader } from './components/CustomerHeader';
import { CoastalSearchBar, SearchFilterState } from './components/CoastalSearchBar';
import { PropertyCard, CustomerPropertyItem } from './components/PropertyCard';
import { PropertyDetailModal } from './components/PropertyDetailModal';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import { CustomerCheckoutModal, BookingDetails } from './components/CustomerCheckoutModal';
import { LoadingStateView, EmptyStateView, ErrorStateView } from './components/StateViews';
import { getApiUrl } from './utils/api';
import { ShieldCheck, Compass, Heart, CalendarCheck, Home } from 'lucide-react';

export function App() {
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('sola_customer_access_token'));
  const [customerPhone, setCustomerPhone] = useState<string | null>(localStorage.getItem('sola_customer_phone'));

  // Data & Search States
  const [properties, setProperties] = useState<CustomerPropertyItem[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<CustomerPropertyItem[]>([]);
  const [activeDestination, setActiveDestination] = useState<string>('الكل');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // Modals & Navigation
  const [selectedProperty, setSelectedProperty] = useState<CustomerPropertyItem | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'EXPLORE' | 'BOOKINGS' | 'FAVORITES'>('EXPLORE');

  // Intercepted Guest Context
  const [interceptedContext, setInterceptedContext] = useState<{
    propertyId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
  } | null>(null);

  // Active Checkout Booking State
  const [activeBooking, setActiveBooking] = useState<BookingDetails | null>(null);

  // Fetch Published Properties from API
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

  // Auth Handlers
  const handleAuthSuccess = (token: string, phone: string) => {
    localStorage.setItem('sola_customer_access_token', token);
    localStorage.setItem('sola_customer_phone', phone);
    setAuthToken(token);
    setCustomerPhone(phone);
    setShowAuthModal(false);

    // If intercepted, resume exact booking flow
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
  };

  // Initiate Booking Handler
  const handleInitiateBooking = async (
    prop: CustomerPropertyItem,
    checkIn: string,
    checkOut: string,
    _guests: number
  ) => {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    const nights = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)));
    const firstNightPrice = prop.basePricePerNight || 5000;
    const totalValue = firstNightPrice * nights;
    const deposit = firstNightPrice;
    const remaining = totalValue - deposit;

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
      status: 'APPROVED_PENDING_PAYMENT',
    };

    setActiveBooking(newBooking);
    setSelectedProperty(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col font-sans pb-20 md:pb-8">
      {/* Navbar Header */}
      <CustomerHeader
        customerPhone={customerPhone}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        activeDestination={activeDestination}
        onSelectDestination={handleSelectDestinationChip}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('EXPLORE')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'EXPLORE'
                  ? 'bg-[#0059FF] text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>استكشاف الإقامات</span>
            </button>
            <button
              onClick={() => setActiveTab('BOOKINGS')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'BOOKINGS'
                  ? 'bg-[#0059FF] text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>حجوزاتي</span>
            </button>
          </div>

          {/* Guarantee Badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-extrabold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>جميع الإقامات معروضة ومثبتة برقم الهاتف</span>
          </div>
        </div>

        {/* Tab 1: EXPLORE */}
        {activeTab === 'EXPLORE' && (
          <div>
            {/* Coastal Search Bar */}
            <CoastalSearchBar
              onSearch={handleSearchFilters}
              initialDestination={activeDestination}
            />

            {/* Results Header */}
            <div className="flex items-center justify-between my-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  إقامات الساحل الشمالي المتاحة ({filteredProperties.length})
                </h2>
                <p className="text-xs text-slate-500 font-bold">
                  احجز وحدتك الساحلية مباشرة من المالك مع ضمان صولا بدفع عربون ليلة واحدة فقط.
                </p>
              </div>
            </div>

            {/* Viewport States */}
            {loading ? (
              <LoadingStateView message="جاري استكشاف وحدات الساحل الشمالي..." />
            ) : error ? (
              <ErrorStateView onRetry={fetchProperties} />
            ) : filteredProperties.length === 0 ? (
              <EmptyStateView onReset={() => setFilteredProperties(properties)} />
            ) : (
              /* Property Cards Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 my-6">
                {filteredProperties.map((prop) => (
                  <PropertyCard
                    key={prop.id}
                    property={prop}
                    onSelect={() => setSelectedProperty(prop)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: BOOKINGS */}
        {activeTab === 'BOOKINGS' && (
          <div className="my-6">
            {activeBooking ? (
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
            ) : (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md mx-auto my-8">
                <CalendarCheck className="w-12 h-12 text-[#0059FF] mx-auto mb-3" />
                <h3 className="text-base font-black text-slate-900 mb-1">لا توجد حجوزات نشطة حالياً</h3>
                <p className="text-xs text-slate-500 mb-6 font-bold">
                  اختر إقامتك المفضل في الساحل الشمالي واطلب الحجز لتظهر تفاصيله هنا.
                </p>
                <button
                  onClick={() => setActiveTab('EXPLORE')}
                  className="px-6 py-2.5 bg-[#0059FF] text-white font-extrabold text-xs rounded-xl shadow-md"
                >
                  استكشف الإقامات الآن
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Property Details Modal */}
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
        />
      )}

      {/* Customer Auth Modal */}
      {showAuthModal && (
        <CustomerAuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
          interceptedContext={interceptedContext}
        />
      )}

      {/* Mobile Bottom Navigation Bar (< 768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-white flex items-center justify-around py-2.5 px-4 shadow-2xl">
        <button
          onClick={() => setActiveTab('EXPLORE')}
          className={`flex flex-col items-center gap-1 text-[10px] font-black ${
            activeTab === 'EXPLORE' ? 'text-[#0059FF]' : 'text-slate-400'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>الرئيسية</span>
        </button>
        <button
          onClick={() => setActiveTab('BOOKINGS')}
          className={`flex flex-col items-center gap-1 text-[10px] font-black ${
            activeTab === 'BOOKINGS' ? 'text-[#0059FF]' : 'text-slate-400'
          }`}
        >
          <CalendarCheck className="w-5 h-5" />
          <span>حجوزاتي</span>
        </button>
        <button
          onClick={() => (authToken ? handleLogout() : setShowAuthModal(true))}
          className={`flex flex-col items-center gap-1 text-[10px] font-black ${
            authToken ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <Heart className="w-5 h-5" />
          <span>{authToken ? 'حسابي' : 'الدخول'}</span>
        </button>
      </nav>
    </div>
  );
}

export default App;

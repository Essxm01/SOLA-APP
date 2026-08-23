import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { SplashScreen } from './components/auth/SplashScreen';
import { OnboardingScreen } from './components/auth/OnboardingScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import { CreateOwnerAccountScreen } from './components/auth/CreateOwnerAccountScreen';
import { OwnerKycOnboarding } from './components/auth/OwnerKycOnboarding';
import { completeOwnerFirstRunOnboarding, resolveOwnerFirstRunPhase, type OwnerFirstRunPhase } from './utils/ownerFirstRun';
import { OwnerDashboardView } from './components/dashboard/OwnerDashboardView';
import { BookingsFoundationView } from './components/bookings/BookingsFoundationView';
import { PropertiesFoundationView } from './components/properties/PropertiesFoundationView';
import { MessagesFoundationView } from './components/messages/MessagesFoundationView';
import { WalletFoundationView } from './components/wallet/WalletFoundationView';
import { ProfileView } from './components/profile/ProfileView';
import { CalendarView } from './components/calendar/CalendarView';
import { DisputesFoundationView } from './components/disputes/DisputesFoundationView';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { NotificationsModal } from './components/notifications/NotificationsModal';
import { Toast } from './components/ui/Toast';
import { MobileContainer } from './components/ui/MobileContainer';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const OwnerAppContent: React.FC = () => {
  const { activeTab, isLoading, error, refreshData } = useApp();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return <OwnerDashboardView />;
      case 'bookings':
        return <BookingsFoundationView />;
      case 'properties':
        return <PropertiesFoundationView />;
      case 'messages':
        return <MessagesFoundationView />;
      case 'disputes':
        return <DisputesFoundationView />;
      case 'wallet':
        return <WalletFoundationView />;
      case 'profile':
        return <ProfileView />;
      case 'calendar':
        return <CalendarView />;
      default:
        return <OwnerDashboardView />;
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-slate-600 dir-rtl">جاري تحميل بيانات حساب المالك…</div>;
  if (error) return <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center dir-rtl"><p className="text-slate-700">{error}</p><button className="text-[#0059FF] font-bold" onClick={() => void refreshData()}>إعادة المحاولة</button></div>;
  return <div className="w-full min-h-full pb-16 relative"><ErrorBoundary key={activeTab}>{renderTabContent()}</ErrorBoundary><BottomNavigation /><NotificationsModal /><Toast /></div>;
};

const OwnerFirstRunGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [phase, setPhase] = useState<OwnerFirstRunPhase>(() => resolveOwnerFirstRunPhase(window.localStorage));

  if (phase === 'SPLASH') {
    return <MobileContainer><SplashScreen onComplete={() => setPhase('ONBOARDING')} /></MobileContainer>;
  }

  if (phase === 'ONBOARDING') {
    const finishOnboarding = () => {
      completeOwnerFirstRunOnboarding(window.localStorage);
      setPhase('DONE');
    };
    return <MobileContainer><OnboardingScreen onComplete={finishOnboarding} /></MobileContainer>;
  }

  return <>{children}</>;
};

const OwnerAuthGate: React.FC = () => {
  const { isLoadingAuth, isAuthenticated, owner } = useAuth();
  const [showRegistration, setShowRegistration] = useState(false);
  if (isLoadingAuth) return <MobileContainer><div className="min-h-screen flex items-center justify-center text-slate-600 dir-rtl">جاري التحقق من الحساب…</div></MobileContainer>;
  if (!isAuthenticated || !owner?.id) {
    return <MobileContainer>{showRegistration ? <CreateOwnerAccountScreen onBack={() => setShowRegistration(false)} /> : <LoginScreen onCreateOwnerAccount={() => setShowRegistration(true)} />}</MobileContainer>;
  }
  if (!owner.ownerOnboardingCompletedAt) return <MobileContainer><OwnerKycOnboarding onComplete={() => undefined} /></MobileContainer>;
  return <MobileContainer><AppProvider key={owner.id} ownerId={owner.id}><OwnerAppContent /></AppProvider></MobileContainer>;
};

export function App() {
  return (
    <AuthProvider>
      <OwnerFirstRunGate>
        <OwnerAuthGate />
      </OwnerFirstRunGate>
    </AuthProvider>
  );
}

export default App;

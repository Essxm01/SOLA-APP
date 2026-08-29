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
import { OwnerLaunchSkeleton } from './components/ui/LoadingSkeleton';
import { getOwnerAuthPresentation, shouldHomeOwnDataState } from './utils/ownerBootstrap';

const OwnerAppContent: React.FC = () => {
  const { activeTab, isLoading, error, refreshData, propertyViewMode } = useApp();

  const isWizardActive = activeTab === 'properties' && propertyViewMode === 'wizard';

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

  // Home owns its truthful loading/error presentation so returning Owners see
  // the Home-shaped skeleton rather than a second technical bootstrap page.
  const tabContent = shouldHomeOwnDataState(activeTab)
    ? renderTabContent()
    : isLoading
      ? <OwnerLaunchSkeleton />
      : error
        ? <div className="min-h-[60vh] p-6 text-center text-[var(--konfrm-text-secondary)]"><p>تعذر تحميل بيانات الشاشة.</p><button type="button" className="mt-4 font-bold text-[var(--konfrm-color-primary)]" onClick={() => void refreshData()}>إعادة المحاولة</button></div>
        : renderTabContent();

  return (
    <div className={`w-full min-h-full relative ${isWizardActive ? '' : 'pb-16'}`}>
      <ErrorBoundary key={activeTab}>{tabContent}</ErrorBoundary>
      {!isWizardActive && <BottomNavigation disabled={isLoading} />}
      <NotificationsModal />
      <Toast />
    </div>
  );
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
  const { isLoadingAuth, isAuthenticated, owner, authError, retryAuth } = useAuth();
  const [showRegistration, setShowRegistration] = useState(false);
  const authPresentation = getOwnerAuthPresentation(isLoadingAuth, isAuthenticated, !!owner?.id, !!owner?.ownerOnboardingCompletedAt);
  if (authPresentation === 'NEUTRAL_LAUNCH') return <MobileContainer><OwnerLaunchSkeleton /></MobileContainer>;
  if (authError) {
    return <MobileContainer><main className="min-h-screen px-6 py-8 text-center" dir="rtl"><h1 className="text-xl font-bold text-[var(--konfrm-text-primary)]">تعذر التحقق من الجلسة</h1><p className="mt-3 text-[var(--konfrm-text-secondary)]">{authError}</p><button type="button" className="mt-6 min-h-11 rounded-[var(--konfrm-radius-control)] bg-[var(--konfrm-color-primary)] px-5 font-bold text-white" onClick={retryAuth}>إعادة المحاولة</button></main></MobileContainer>;
  }
  if (authPresentation === 'LOGIN') {
    return <MobileContainer>{showRegistration ? <CreateOwnerAccountScreen onBack={() => setShowRegistration(false)} /> : <LoginScreen onCreateOwnerAccount={() => setShowRegistration(true)} />}</MobileContainer>;
  }
  if (authPresentation === 'KYC') return <MobileContainer><OwnerKycOnboarding onComplete={() => undefined} /></MobileContainer>;
  if (!owner) return <MobileContainer><OwnerLaunchSkeleton /></MobileContainer>;
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

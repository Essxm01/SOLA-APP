import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { SplashScreen } from './components/auth/SplashScreen';
import { OnboardingScreen } from './components/auth/OnboardingScreen';
import { LoginScreen } from './components/auth/LoginScreen';
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
  const { isAuthenticated, hasCompletedOnboarding, completeOnboarding } = useAuth();
  const { activeTab } = useApp();

  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onContinue={() => setShowSplash(false)} />;
  }

  if (!hasCompletedOnboarding) {
    return <OnboardingScreen onComplete={() => completeOnboarding()} />;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

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

  return (
    <MobileContainer>
      <div className="w-full min-h-full pb-16 relative">
        <ErrorBoundary key={activeTab}>
          {renderTabContent()}
        </ErrorBoundary>
        <BottomNavigation />
        <NotificationsModal />
        <Toast />
      </div>
    </MobileContainer>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <OwnerAppContent />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;

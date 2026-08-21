import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Owner } from '../types';
import { mockRepository } from '../services/mockRepository';
import { repositoryFactory } from '../services/repositoryFactory';

interface AuthContextType {
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  phoneNumber: string;
  owner: Owner | null;
  setPhoneNumber: (phone: string) => void;
  loginWithPhone: (phone: string) => Promise<{ success: boolean; ownerOnboardingRequired?: boolean; error?: string }>;
  sendOTP: (phone: string) => Promise<boolean>;
  verifyOTP: (code: string) => Promise<boolean>;
  logout: () => void;
  completeOnboarding: () => void;
  isLoadingAuth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('sola_owner_authenticated') === 'true' || !!localStorage.getItem('sola_access_token');
  });

  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    return localStorage.getItem('sola_owner_onboarding') === 'true';
  });

  const [phoneNumber, setPhoneNumber] = useState<string>(() => {
    return localStorage.getItem('sola_owner_phone') || '';
  });

  const [owner, setOwner] = useState<Owner | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoadingAuth(true);
      try {
        const repo = repositoryFactory;
        const hasToken = !!localStorage.getItem('sola_access_token');
        const refreshToken = localStorage.getItem('sola_refresh_token');

        if (hasToken || refreshToken) {
          if (!repo.useMockMode) {
            try {
              const profile = await repo.owner.getCurrentOwner();
              setOwner(profile as Owner);
              setIsAuthenticated(true);
            } catch (err: any) {
              // If token expired, attempt refresh session
              if (refreshToken) {
                try {
                  const refreshRes = await repo.auth.refreshSession(refreshToken);
                  if (refreshRes && refreshRes.accessToken) {
                    localStorage.setItem('sola_access_token', refreshRes.accessToken);
                    const profile = await repo.owner.getCurrentOwner();
                    setOwner(profile as Owner);
                    setIsAuthenticated(true);
                    return;
                  }
                } catch (refreshErr) {
                  // Refresh token revoked or expired -> clean logout
                  await logout();
                  return;
                }
              }
              await logout();
            }
          } else {
            const profile = await mockRepository.getOwnerProfile();
            setOwner(profile);
            setIsAuthenticated(true);
          }
        } else {
          setIsAuthenticated(false);
          setOwner(null);
        }
      } catch (err) {
        setIsAuthenticated(false);
        setOwner(null);
      } finally {
        setIsLoadingAuth(false);
      }
    };
    loadProfile();
  }, []);

  const loginWithPhone = async (phone: string): Promise<{ success: boolean; ownerOnboardingRequired?: boolean; error?: string }> => {
    setPhoneNumber(phone);
    localStorage.setItem('sola_owner_phone', phone);
    const repo = repositoryFactory;
    if (!repo.useMockMode) {
      try {
        const res: any = await repo.auth.prototypeLogin({ phone, surface: 'OWNER' });
        const token = res.tokens?.accessToken || res.data?.tokens?.accessToken || res.accessToken;
        const refreshToken = res.tokens?.refreshToken || res.data?.tokens?.refreshToken || res.refreshToken;
        const ownerData = res.owner || res.data?.owner;
        const ownerOnboardingRequired = res.ownerOnboardingRequired ?? res.data?.ownerOnboardingRequired;

        if (token) {
          localStorage.setItem('sola_access_token', token);
          if (refreshToken) {
            localStorage.setItem('sola_refresh_token', refreshToken);
          }
          localStorage.setItem('sola_owner_authenticated', 'true');
          if (ownerData) {
            setOwner(ownerData);
          }
          if (ownerOnboardingRequired) {
            setHasCompletedOnboarding(false);
            localStorage.setItem('sola_owner_onboarding', 'false');
          } else {
            setHasCompletedOnboarding(true);
            localStorage.setItem('sola_owner_onboarding', 'true');
          }
          setIsAuthenticated(true);
          return { success: true, ownerOnboardingRequired };
        }

        if (ownerOnboardingRequired) {
          setHasCompletedOnboarding(false);
          localStorage.setItem('sola_owner_onboarding', 'false');
          return { success: false, ownerOnboardingRequired: true, error: 'هذا الحساب غير مسجل كمالك وحدات بعد.' };
        }

        return { success: false, error: res.error?.message || 'تعذر تسجيل الدخول كمالك' };
      } catch (err: any) {
        return { success: false, error: err.message || 'حدث خطأ في تسجيل الدخول' };
      }
    }

    setIsAuthenticated(true);
    localStorage.setItem('sola_owner_authenticated', 'true');
    return { success: true };
  };

  const sendOTP = async (phone: string): Promise<boolean> => {
    setPhoneNumber(phone);
    localStorage.setItem('sola_owner_phone', phone);
    const repo = repositoryFactory;
    if (!repo.useMockMode) {
      await repo.auth.requestOtp({ phone });
      return true;
    }
    await new Promise((r) => setTimeout(r, 600));
    return true;
  };

  const verifyOTP = async (code: string): Promise<boolean> => {
    const repo = repositoryFactory;
    if (!repo.useMockMode) {
      const res: any = await repo.auth.verifyOtp({ phone: phoneNumber, code, surface: 'OWNER' });
      const token = res.accessToken || res.tokens?.accessToken;
      const refreshToken = res.refreshToken || res.tokens?.refreshToken;
      if (token) {
        localStorage.setItem('sola_access_token', token);
        if (refreshToken) {
          localStorage.setItem('sola_refresh_token', refreshToken);
        }
        localStorage.setItem('sola_owner_authenticated', 'true');
        if (res.owner) {
          setOwner(res.owner);
        }
        if (res.ownerOnboardingRequired) {
          setHasCompletedOnboarding(false);
          localStorage.setItem('sola_owner_onboarding', 'false');
        }
        setIsAuthenticated(true);
        return true;
      }
      return false;
    }
    await new Promise((r) => setTimeout(r, 800));
    if (code.length >= 4) {
      setIsAuthenticated(true);
      localStorage.setItem('sola_owner_authenticated', 'true');
      return true;
    }
    return false;
  };

  const logout = async () => {
    const repo = repositoryFactory;
    const refreshToken = localStorage.getItem('sola_refresh_token');
    if (refreshToken && !repo.useMockMode) {
      try {
        await repo.auth.revokeSession(refreshToken);
      } catch {}
    }
    setIsAuthenticated(false);
    setOwner(null);
    localStorage.removeItem('sola_owner_authenticated');
    localStorage.removeItem('sola_access_token');
    localStorage.removeItem('sola_refresh_token');
    localStorage.removeItem('sola_owner_phone');
    localStorage.removeItem('sola_owner_onboarding');
  };

  const completeOnboarding = () => {
    setHasCompletedOnboarding(true);
    localStorage.setItem('sola_owner_onboarding', 'true');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        hasCompletedOnboarding,
        phoneNumber,
        owner,
        setPhoneNumber,
        loginWithPhone,
        sendOTP,
        verifyOTP,
        logout,
        completeOnboarding,
        isLoadingAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

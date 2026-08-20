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
        if (hasToken) {
          if (!repo.useMockMode) {
            const profile = await repo.owner.getCurrentOwner();
            setOwner(profile as Owner);
          } else {
            const profile = await mockRepository.getOwnerProfile();
            setOwner(profile);
          }
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setOwner(null);
        }
      } catch (err) {
        console.error('Failed to load profile', err);
        setIsAuthenticated(false);
        setOwner(null);
      } finally {
        setIsLoadingAuth(false);
      }
    };
    loadProfile();
  }, []);

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
      if (token) {
        localStorage.setItem('sola_access_token', token);
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

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('sola_owner_authenticated');
    localStorage.removeItem('sola_access_token');
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

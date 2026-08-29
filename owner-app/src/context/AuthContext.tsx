import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Owner } from '../types';
import { mockRepository } from '../services/mockRepository';
import { repositoryFactory } from '../services/repositoryFactory';
import { getCanonicalOwnerPhone, isValidOwnerLogin, unwrapOwnerLoginResponse } from '../utils/ownerIdentity';
import { isInvalidOwnerSessionFailure } from '../utils/ownerBootstrap';

interface AuthContextType {
  isAuthenticated: boolean;
  phoneNumber: string;
  owner: Owner | null;
  setPhoneNumber: (phone: string) => void;
  loginWithPhone: (phone: string) => Promise<{ success: boolean; ownerOnboardingRequired?: boolean; error?: string }>;
  registerOwnerWithPhone: (phone: string, fullName: string) => Promise<{ success: boolean; createdOwner?: boolean; error?: string }>;
  refreshCanonicalOwner: () => Promise<Owner | null>;
  sendOTP: (phone: string) => Promise<boolean>;
  verifyOTP: (code: string) => Promise<boolean>;
  logout: () => void;
  isLoadingAuth: boolean;
  authError: string | null;
  retryAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// This is only for the controlled local Owner Home visual-review URLs. It keeps
// the production authentication and KYC boundary unchanged.
const withLocalHomeFixtureOwner = (canonicalOwner: Owner): Owner => {
  const fixture = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('ownerHomeFixture') : null;
  return fixture ? { ...canonicalOwner, ownerOnboardingCompletedAt: canonicalOwner.ownerOnboardingCompletedAt || '2026-01-01T00:00:00.000Z' } : canonicalOwner;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // A token in storage is only a candidate session. It is not authenticated until
  // the canonical owner profile has been read successfully.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [phoneNumber, setPhoneNumber] = useState<string>(() => {
    return localStorage.getItem('sola_owner_phone') || '';
  });

  const [owner, setOwner] = useState<Owner | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  const clearLocalOwnerSession = () => {
    setIsAuthenticated(false);
    setOwner(null);
    setPhoneNumber('');
    setAuthError(null);
    localStorage.removeItem('sola_owner_authenticated');
    localStorage.removeItem('sola_access_token');
    localStorage.removeItem('sola_refresh_token');
    localStorage.removeItem('sola_owner_phone');
  };

  const applyCanonicalOwner = (canonicalOwner: Owner) => {
    const canonicalPhone = getCanonicalOwnerPhone(canonicalOwner);
    if (!canonicalOwner.id || !canonicalPhone) {
      throw new Error('OWNER_PROFILE_INVALID');
    }
    setOwner(canonicalOwner);
    setPhoneNumber(canonicalPhone);
    localStorage.setItem('sola_owner_phone', canonicalPhone);
    localStorage.setItem('sola_owner_authenticated', 'true');
    setIsAuthenticated(true);
    setAuthError(null);
  };

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoadingAuth(true);
      setAuthError(null);
      try {
        const repo = repositoryFactory;
        const hasToken = !!localStorage.getItem('sola_access_token');
        const refreshToken = localStorage.getItem('sola_refresh_token');

        if (hasToken || refreshToken) {
          if (!repo.useMockMode) {
            try {
              const profile = await repo.owner.getCurrentOwner();
              applyCanonicalOwner(profile as Owner);
            } catch (err: any) {
              // If token expired, attempt refresh session
              if (refreshToken) {
                try {
                  const refreshRes = await repo.auth.refreshSession(refreshToken);
                  if (refreshRes && refreshRes.accessToken) {
                    localStorage.setItem('sola_access_token', refreshRes.accessToken);
                    const profile = await repo.owner.getCurrentOwner();
                    applyCanonicalOwner(profile as Owner);
                    return;
                  }
                } catch (refreshErr) {
                  if (isInvalidOwnerSessionFailure(refreshErr)) {
                    clearLocalOwnerSession();
                  } else {
                    setIsAuthenticated(false);
                    setOwner(null);
                    setAuthError('تعذر التحقق من جلسة المالك. تحقق من الاتصال ثم أعد المحاولة.');
                  }
                  return;
                }
              }
              if (isInvalidOwnerSessionFailure(err)) {
                clearLocalOwnerSession();
              } else {
                setIsAuthenticated(false);
                setOwner(null);
                setAuthError('تعذر التحقق من جلسة المالك. تحقق من الاتصال ثم أعد المحاولة.');
              }
            }
          } else {
            const profile = await mockRepository.getOwnerProfile();
            applyCanonicalOwner(withLocalHomeFixtureOwner(profile));
          }
        } else {
          clearLocalOwnerSession();
        }
      } catch (err) {
        setIsAuthenticated(false);
        setOwner(null);
        setAuthError('تعذر التحقق من جلسة المالك. تحقق من الاتصال ثم أعد المحاولة.');
      } finally {
        setIsLoadingAuth(false);
      }
    };
    loadProfile();
  }, [restoreAttempt]);

  const retryAuth = () => setRestoreAttempt((attempt) => attempt + 1);

  const loginWithPhone = async (phone: string): Promise<{ success: boolean; ownerOnboardingRequired?: boolean; error?: string }> => {
    const repo = repositoryFactory;
    if (!repo.useMockMode) {
      try {
        const res: any = await repo.auth.prototypeLogin({ phone, surface: 'OWNER' });
        const result = unwrapOwnerLoginResponse(res);
        const token = result.tokens?.accessToken || result.accessToken;
        const refreshToken = result.tokens?.refreshToken || result.refreshToken;

        if (!isValidOwnerLogin(res)) {
          // A pure customer must never retain a previous owner session or its UI.
          clearLocalOwnerSession();
          if (refreshToken) void repo.auth.revokeSession(refreshToken).catch(() => {});
          return {
            success: false,
            ownerOnboardingRequired: result.ownerOnboardingRequired === true,
            error: result.ownerOnboardingRequired === true
              ? 'هذا الرقم غير مسجل كحساب مالك حالياً'
              : res.error?.message || 'تعذر تسجيل الدخول كمالك',
          };
        }

        // Keep the token only long enough to validate the canonical profile. The
        // UI is still unauthenticated until this read succeeds.
        localStorage.setItem('sola_access_token', token!);
        if (refreshToken) localStorage.setItem('sola_refresh_token', refreshToken);
        const canonicalOwner = await repo.owner.getCurrentOwner();
        if (canonicalOwner.id !== result.owner?.id) {
          throw new Error('OWNER_PROFILE_ID_MISMATCH');
        }
        applyCanonicalOwner(canonicalOwner as Owner);
        return { success: true };
      } catch (err: any) {
        clearLocalOwnerSession();
        return { success: false, error: err.message || 'حدث خطأ في تسجيل الدخول' };
      }
    }

    const profile = await mockRepository.getOwnerProfile();
    applyCanonicalOwner(withLocalHomeFixtureOwner(profile));
    return { success: true };
  };

  const refreshCanonicalOwner = async (): Promise<Owner | null> => {
    const repo = repositoryFactory;
    try {
      const canonicalOwner = repo.useMockMode
        ? await mockRepository.getOwnerProfile()
        : await repo.owner.getCurrentOwner();
      const ownerForSession = withLocalHomeFixtureOwner(canonicalOwner as Owner);
      applyCanonicalOwner(ownerForSession);
      return ownerForSession;
    } catch {
      clearLocalOwnerSession();
      return null;
    }
  };

  const registerOwnerWithPhone = async (phone: string, fullName: string): Promise<{ success: boolean; createdOwner?: boolean; error?: string }> => {
    const repo = repositoryFactory;
    if (repo.useMockMode) {
      return { success: false, error: 'تسجيل حساب مالك غير متاح في وضع العرض المحلي.' };
    }

    try {
      const res: any = await repo.auth.registerOwner({ phone, fullName });
      const result = unwrapOwnerLoginResponse(res);
      const token = result.tokens?.accessToken || result.accessToken;
      const refreshToken = result.tokens?.refreshToken || result.refreshToken;

      if (!token || !refreshToken || !result.owner?.id || result.isOwner !== true) {
        throw new Error('OWNER_REGISTRATION_INVALID_RESPONSE');
      }

      localStorage.setItem('sola_access_token', token);
      localStorage.setItem('sola_refresh_token', refreshToken);
      const canonicalOwner = await repo.owner.getCurrentOwner();
      if (canonicalOwner.id !== result.owner.id) {
        throw new Error('OWNER_PROFILE_ID_MISMATCH');
      }
      applyCanonicalOwner(canonicalOwner as Owner);
      return { success: true, createdOwner: result.createdOwner === true };
    } catch (err: any) {
      clearLocalOwnerSession();
      return { success: false, error: err?.message || 'تعذر إنشاء حساب المالك. حاول مرة أخرى.' };
    }
  };

  const sendOTP = async (phone: string): Promise<boolean> => {
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
      if (token && isValidOwnerLogin(res)) {
        localStorage.setItem('sola_access_token', token);
        if (refreshToken) localStorage.setItem('sola_refresh_token', refreshToken);
        applyCanonicalOwner(unwrapOwnerLoginResponse(res).owner as Owner);
        return true;
      }
      clearLocalOwnerSession();
      return false;
    }
    await new Promise((r) => setTimeout(r, 800));
    if (code.length >= 4) {
      applyCanonicalOwner(withLocalHomeFixtureOwner(await mockRepository.getOwnerProfile()));
      return true;
    }
    return false;
  };

  const logout = () => {
    const repo = repositoryFactory;
    const refreshToken = localStorage.getItem('sola_refresh_token');
    // Destroy the account boundary before a best-effort revoke can delay the UI.
    clearLocalOwnerSession();
    if (refreshToken && !repo.useMockMode) void repo.auth.revokeSession(refreshToken).catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        phoneNumber,
        owner,
        setPhoneNumber,
        loginWithPhone,
        registerOwnerWithPhone,
        refreshCanonicalOwner,
        sendOTP,
        verifyOTP,
        logout,
        isLoadingAuth,
        authError,
        retryAuth,
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

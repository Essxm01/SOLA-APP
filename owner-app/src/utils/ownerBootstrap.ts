export type OwnerAuthPresentation = 'NEUTRAL_LAUNCH' | 'LOGIN' | 'KYC' | 'APP';

export const getOwnerAuthPresentation = (
  isLoadingAuth: boolean,
  isAuthenticated: boolean,
  hasCanonicalOwner: boolean,
  ownerOnboardingCompleted: boolean,
): OwnerAuthPresentation => {
  if (isLoadingAuth) return 'NEUTRAL_LAUNCH';
  if (!isAuthenticated || !hasCanonicalOwner) return 'LOGIN';
  if (!ownerOnboardingCompleted) return 'KYC';
  return 'APP';
};

export const shouldHomeOwnDataState = (activeTab: string) => activeTab === 'home';

export const isInvalidOwnerSessionFailure = (error: unknown): boolean => {
  const candidate = error as { status?: number; message?: string } | null;
  if (candidate?.status === 401 || candidate?.status === 403) return true;
  return /UNAUTHORIZED|FORBIDDEN|INVALID_TOKEN|EXPIRED|SESSION_REVOKED/i.test(candidate?.message || '');
};

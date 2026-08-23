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

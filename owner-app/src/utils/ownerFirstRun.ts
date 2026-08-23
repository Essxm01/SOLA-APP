export const OWNER_SPLASH_SEEN_KEY = 'konfrm_owner_splash_seen_v1';
export const OWNER_ONBOARDING_COMPLETED_KEY = 'konfrm_owner_onboarding_completed_v1';
const LEGACY_OWNER_ONBOARDING_KEY = 'sola_owner_onboarding';

export type OwnerFirstRunPhase = 'SPLASH' | 'ONBOARDING' | 'DONE';

export interface OwnerFirstRunStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const isTrue = (storage: OwnerFirstRunStorage, key: string) => storage.getItem(key) === 'true';

export const resolveOwnerFirstRunPhase = (storage: OwnerFirstRunStorage): OwnerFirstRunPhase => {
  const splashSeen = isTrue(storage, OWNER_SPLASH_SEEN_KEY);
  const onboardingCompleted = isTrue(storage, OWNER_ONBOARDING_COMPLETED_KEY);

  if (!splashSeen && !onboardingCompleted && isTrue(storage, LEGACY_OWNER_ONBOARDING_KEY)) {
    storage.setItem(OWNER_SPLASH_SEEN_KEY, 'true');
    storage.setItem(OWNER_ONBOARDING_COMPLETED_KEY, 'true');
    return 'DONE';
  }

  if (onboardingCompleted) return 'DONE';
  if (splashSeen) return 'ONBOARDING';

  // Persist at first entry so an interrupted flow resumes onboarding instead
  // of replaying the branded Splash.
  storage.setItem(OWNER_SPLASH_SEEN_KEY, 'true');
  return 'SPLASH';
};

export const completeOwnerFirstRunOnboarding = (storage: OwnerFirstRunStorage) => {
  storage.setItem(OWNER_SPLASH_SEEN_KEY, 'true');
  storage.setItem(OWNER_ONBOARDING_COMPLETED_KEY, 'true');
};

export const getOwnerOnboardingSwipeAction = (deltaX: number, threshold = 48): 'NEXT' | 'PREVIOUS' | null => {
  if (deltaX <= -threshold) return 'NEXT';
  if (deltaX >= threshold) return 'PREVIOUS';
  return null;
};

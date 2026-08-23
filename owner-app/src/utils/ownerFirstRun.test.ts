import {
  completeOwnerFirstRunOnboarding,
  getOwnerOnboardingSwipeAction,
  OWNER_ONBOARDING_COMPLETED_KEY,
  OWNER_SPLASH_SEEN_KEY,
  resolveOwnerFirstRunPhase,
} from './ownerFirstRun';
import { isValidOwnerLogin } from './ownerIdentity';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const newDevice = new MemoryStorage();
assert(resolveOwnerFirstRunPhase(newDevice) === 'SPLASH', 'new device must begin with Splash');
assert(newDevice.getItem(OWNER_SPLASH_SEEN_KEY) === 'true', 'Splash must persist on entry');
assert(resolveOwnerFirstRunPhase(newDevice) === 'ONBOARDING', 'interrupted flow must resume onboarding');
completeOwnerFirstRunOnboarding(newDevice);
assert(newDevice.getItem(OWNER_ONBOARDING_COMPLETED_KEY) === 'true', 'Skip/final completion must persist');
assert(resolveOwnerFirstRunPhase(newDevice) === 'DONE', 'completed device must skip first-run UI');

const legacyDevice = new MemoryStorage();
legacyDevice.setItem('sola_owner_onboarding', 'true');
assert(resolveOwnerFirstRunPhase(legacyDevice) === 'DONE', 'legacy onboarding must migrate to completed');
assert(legacyDevice.getItem(OWNER_SPLASH_SEEN_KEY) === 'true', 'legacy migration must mark Splash seen');
assert(legacyDevice.getItem(OWNER_ONBOARDING_COMPLETED_KEY) === 'true', 'legacy migration must mark onboarding completed');

assert(getOwnerOnboardingSwipeAction(-60) === 'NEXT', 'left swipe must advance in RTL carousel');
assert(getOwnerOnboardingSwipeAction(60) === 'PREVIOUS', 'right swipe must go back in RTL carousel');
assert(getOwnerOnboardingSwipeAction(12) === null, 'small gestures must not change slide');

assert(!isValidOwnerLogin({ accessToken: 'customer-token', isOwner: false, owner: null, ownerOnboardingRequired: true }), 'pure Customer response must not become an Owner session');
assert(isValidOwnerLogin({ accessToken: 'owner-token', isOwner: true, owner: { id: 'owner-1' } }), 'canonical Owner response must remain valid');

console.log('OWNER-FIRST-RUN-01 focused state tests passed');

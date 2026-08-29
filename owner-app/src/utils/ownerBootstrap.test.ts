import { getOwnerAuthPresentation, isInvalidOwnerSessionFailure, shouldHomeOwnDataState } from './ownerBootstrap';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

assert(getOwnerAuthPresentation(true, false, false, false) === 'NEUTRAL_LAUNCH', 'candidate session validation must use the neutral launch shell');
assert(getOwnerAuthPresentation(false, false, false, false) === 'LOGIN', 'invalid session must go directly to Login');
assert(getOwnerAuthPresentation(false, true, true, false) === 'KYC', 'validated unfinished Owner must resume KYC');
assert(getOwnerAuthPresentation(false, true, true, true) === 'APP', 'only validated complete Owner can enter the AppProvider boundary');
assert(shouldHomeOwnDataState('home'), 'Home must own its skeleton/error state');
assert(!shouldHomeOwnDataState('bookings'), 'non-Home tabs must not render Home data while loading');
assert(isInvalidOwnerSessionFailure({ status: 401 }), 'a rejected canonical profile must clear the stale Owner candidate session');
assert(!isInvalidOwnerSessionFailure({ status: 503 }), 'a backend outage must remain a retryable Owner bootstrap error, not a false logout');

console.log('OWNER bootstrap presentation tests passed');

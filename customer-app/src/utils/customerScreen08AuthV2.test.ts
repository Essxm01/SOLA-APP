import {
  createScreen08FormState,
  createScreen08HandoffGuard,
  createScreen08IssueGuard,
  switchScreen08Intent,
  switchScreen08Method,
  updateScreen08Identifier,
  restoreScreen08PhoneValue,
} from './customerScreen08AuthV2';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  assert(actual === expected, `${message} (actual=${String(actual)} expected=${String(expected)})`);
}

let state = createScreen08FormState('CREATE_ACCOUNT');
assertEqual(state.intent, 'CREATE_ACCOUNT', 'initial intent');
assertEqual(state.method, 'PHONE', 'phone is the default method');
state = updateScreen08Identifier(state, '01012345678');
state = switchScreen08Method(state, 'EMAIL');
state = updateScreen08Identifier(state, 'Name@example.com');
assertEqual(state.phone, '01012345678', 'phone value is preserved');
assertEqual(state.email, 'Name@example.com', 'email value is preserved');
state = switchScreen08Method(state, 'PHONE');
assertEqual(state.phone, '01012345678', 'switching back restores phone');
state = switchScreen08Intent(state, 'LOGIN');
assertEqual(state.intent, 'LOGIN', 'intent switch');
assertEqual(state.phone, '01012345678', 'intent switch preserves phone');
assertEqual(state.email, 'Name@example.com', 'intent switch preserves email');
assertEqual(restoreScreen08PhoneValue('+201012345678'), '01012345678', 'E.164 phone restores to local Screen 08 format');
assertEqual(restoreScreen08PhoneValue('01012345678'), '01012345678', 'local phone remains unchanged');

const guard = createScreen08IssueGuard();
const generation = guard.begin();
assertEqual(guard.isCurrent(generation), true, 'active generation is current');
guard.cancel();
assertEqual(guard.isCurrent(generation), false, 'cancel invalidates late response');
const nextGeneration = guard.begin();
assert(nextGeneration !== generation, 'new request receives a new generation');
assertEqual(guard.isCurrent(nextGeneration), true, 'new generation is current');
assertEqual(guard.isCurrent(generation), false, 'old generation stays invalid');

const handoffGuard = createScreen08HandoffGuard();
assertEqual(handoffGuard.claim(), true, 'first successful challenge claims the mounted handoff');
assertEqual(handoffGuard.claim(), false, 'same mounted Screen 08 cannot issue a duplicate successful challenge');
assertEqual(handoffGuard.issued(), true, 'handoff guard remains issued until unmount');

console.log('customerScreen08AuthV2 tests passed');

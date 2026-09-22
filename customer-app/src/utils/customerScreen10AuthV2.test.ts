import {
  createScreen10SubmissionGuard,
  getScreen10FailureDisposition,
  getScreen10OriginMessage,
  isValidCustomerFullName,
  normalizeCustomerFullName,
} from './customerScreen10AuthV2';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function equal(actual: unknown, expected: unknown, message: string): void {
  assert(actual === expected, `${message}: ${String(actual)} !== ${String(expected)}`);
}

equal(normalizeCustomerFullName('  أحمد   محمد  '), 'أحمد محمد', 'full name trims and collapses whitespace');
equal(isValidCustomerFullName(' أ '), true, 'two-character names are accepted');
equal(isValidCustomerFullName(' '), false, 'blank names are rejected');

equal(
  getScreen10OriginMessage({ type: 'PROTECTED_BOOKING', context: { propertyId: 'p1', checkIn: '2026-10-01', checkOut: '2026-10-03', guests: 2 } }),
  'ستعود إلى مراجعة طلب الحجز بعد إكمال الحساب.',
  'booking copy preserves review context',
);
equal(
  getScreen10OriginMessage({ type: 'PROTECTED_FAVORITE', propertyId: 'p1' }),
  'ستعود إلى الوحدة بعد إكمال الحساب.',
  'favorite copy preserves property context',
);
equal(getScreen10OriginMessage({ type: 'WELCOME_CREATE_ACCOUNT' }), null, 'welcome create has no extra context copy');

equal(getScreen10FailureDisposition('CONTINUATION_TOKEN_EXPIRED'), 'REVERIFY', 'expired continuation requires re-verification');
equal(getScreen10FailureDisposition('CONTINUATION_ALREADY_CONSUMED'), 'REVERIFY', 'consumed continuation requires re-verification');
equal(getScreen10FailureDisposition('CONTINUATION_INVALID'), 'REVERIFY', 'invalid continuation requires re-verification');
equal(getScreen10FailureDisposition('REQUEST_FAILED'), 'RETRY', 'transient request failure stays retryable');

const guard = createScreen10SubmissionGuard();
const first = guard.begin();
assert(first !== null, 'first submission starts');
equal(guard.begin(), null, 'double submit is blocked');
assert(guard.isCurrent(first), 'first generation stays current');
guard.cancel();
equal(guard.isCurrent(first), false, 'cancel invalidates the prior generation');
assert(guard.begin() !== null, 'a later retry can begin');

console.log('customerScreen10AuthV2 tests passed');

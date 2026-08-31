import { isRejectedPropertyReview, matchesPropertyReviewFilter } from './propertyReviewState';

const equal = (actual: unknown, expected: unknown) => { if (actual !== expected) throw new Error(`Expected ${String(expected)} but received ${String(actual)}`); };

const rejected = { status: 'DRAFT', verificationStatus: 'REJECTED' } as const;
const draft = { status: 'DRAFT', verificationStatus: 'UNVERIFIED' } as const;
const pending = { status: 'PENDING_REVIEW', verificationStatus: 'PENDING_VERIFICATION' } as const;

equal(isRejectedPropertyReview(rejected), true);
equal(isRejectedPropertyReview(draft), false);
equal(matchesPropertyReviewFilter(rejected, 'REJECTED'), true);
equal(matchesPropertyReviewFilter(rejected, 'PENDING_REVIEW'), false);
equal(matchesPropertyReviewFilter(pending, 'PENDING_REVIEW'), true);
equal(matchesPropertyReviewFilter(draft, 'REJECTED'), false);
console.log('ADMIN-PROPERTY-REVIEW-STATE canonical rejected-state tests passed.');

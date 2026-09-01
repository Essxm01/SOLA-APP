import { getPropertyReviewStatus, isRejectedPropertyReview } from './propertyReviewStatus';

const equal = (actual: unknown, expected: unknown) => {
  if (actual !== expected) throw new Error(`Expected ${String(expected)} but received ${String(actual)}`);
};

equal(getPropertyReviewStatus({ status: 'PENDING_REVIEW', verificationStatus: 'PENDING_VERIFICATION' }), 'PENDING_REVIEW');
equal(getPropertyReviewStatus({ status: 'DRAFT', verificationStatus: 'REJECTED' }), 'REJECTED');
equal(isRejectedPropertyReview({ status: 'DRAFT', verificationStatus: 'UNVERIFIED' }), false);
equal(getPropertyReviewStatus({ status: 'DRAFT', verificationStatus: 'UNVERIFIED' }), null);
console.log('Admin property review status derivations passed.');

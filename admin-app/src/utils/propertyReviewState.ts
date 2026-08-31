export type PropertyReviewState = {
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED';
  verificationStatus: 'UNVERIFIED' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
};

export const isRejectedPropertyReview = (property: PropertyReviewState) =>
  property.status === 'DRAFT' && property.verificationStatus === 'REJECTED';

export const matchesPropertyReviewFilter = (
  property: PropertyReviewState,
  filter: 'ALL' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED',
) => filter === 'ALL'
  || (filter === 'REJECTED' ? isRejectedPropertyReview(property) : property.status === filter);

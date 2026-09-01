export type PropertyReviewStatus = 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';

export interface PropertyReviewState {
  status: string;
  verificationStatus: string;
}

// A rejected property remains a DRAFT. Rejection is expressed through its
// verification state so Admin review and Owner remediation use the same truth.
export const isRejectedPropertyReview = (property: PropertyReviewState) =>
  property.status === 'DRAFT' && property.verificationStatus === 'REJECTED';

export const getPropertyReviewStatus = (property: PropertyReviewState): PropertyReviewStatus | null => {
  if (property.status === 'PENDING_REVIEW') return 'PENDING_REVIEW';
  if (property.status === 'PUBLISHED') return 'PUBLISHED';
  if (isRejectedPropertyReview(property)) return 'REJECTED';
  return null;
};

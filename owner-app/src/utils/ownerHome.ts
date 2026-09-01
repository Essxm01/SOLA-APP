import type { Booking, OwnerWallet, Property } from '../types';
import { isRejectedProperty } from './ownerProperties';

export const getPendingBookingRequests = (bookings: Booking[]) =>
  bookings.filter((booking) => booking.status === 'PENDING_OWNER_APPROVAL');

export const getUpcomingConfirmedBookings = (bookings: Booking[], now = new Date()) => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return bookings
    .filter((booking) => booking.status === 'CONFIRMED' && Number.isFinite(Date.parse(booking.checkIn)) && Date.parse(booking.checkIn) >= today)
    .sort((left, right) => Date.parse(left.checkIn) - Date.parse(right.checkIn));
};

export const getPropertyHomeSummary = (properties: Property[]) => ({
  published: properties.filter((property) => property.status === 'PUBLISHED').length,
  pendingReview: properties.filter((property) => property.status === 'PENDING_REVIEW').length,
  drafts: properties.filter((property) => property.status === 'DRAFT' && !isRejectedProperty(property)).length,
  rejected: properties.filter(isRejectedProperty).length,
});

export const getRelevantProperties = (properties: Property[]) =>
  [...properties]
    .sort((left, right) => {
      const priority = (property: Property) => isRejectedProperty(property) ? 0 : property.status === 'DRAFT' ? 1 : property.status === 'PENDING_REVIEW' ? 2 : 3;
      return priority(left) - priority(right) || Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    })
    .slice(0, 2);

export const getWalletHomeState = (wallet: OwnerWallet | null, walletError: string | null) => {
  if (walletError) return { kind: 'error' as const };
  if (!wallet) return { kind: 'loading' as const };
  return { kind: 'ready' as const, available: wallet.availableBalance, pending: wallet.pendingBalance, currency: wallet.currency || 'EGP' };
};

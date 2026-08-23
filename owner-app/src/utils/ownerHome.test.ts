import { getPendingBookingRequests, getPropertyHomeSummary, getUpcomingConfirmedBookings, getWalletHomeState } from './ownerHome';

const booking = (status: string, checkIn: string) => ({ status, checkIn, checkOut: checkIn }) as any;

const run = () => {
  const equal = (actual: unknown, expected: unknown) => { if (actual !== expected) throw new Error(`Expected ${String(expected)} but received ${String(actual)}`); };
  equal(getPendingBookingRequests([booking('PENDING_OWNER_APPROVAL', '2030-01-01'), booking('CONFIRMED', '2030-01-01')]).length, 1);
  equal(getUpcomingConfirmedBookings([booking('CONFIRMED', '2020-01-01'), booking('CONFIRMED', '2030-02-01'), booking('CONFIRMED', '2030-01-01')], new Date('2030-01-01')).map((item) => item.checkIn).join(','), '2030-01-01,2030-02-01');
  const propertySummary = getPropertyHomeSummary([{ status: 'PENDING_REVIEW' }, { status: 'DRAFT' }, { status: 'PUBLISHED' }] as any);
  equal(propertySummary.pendingReview, 1);
  equal(propertySummary.drafts, 1);
  equal(getWalletHomeState({ availableBalance: 0, pendingBalance: 1600, currency: 'EGP' } as any, null).kind, 'ready');
  equal(getWalletHomeState(null, 'failed').kind, 'error');
  console.log('OWNER-HOME-01 derivations passed.');
};

run();

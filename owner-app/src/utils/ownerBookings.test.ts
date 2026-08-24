import { getOwnerBookingCollections, isOwnerBookingChatEligible, runOwnerBookingAction } from './ownerBookings';

const booking = (status: string, checkIn: string, checkOut = checkIn) => ({ id: status + checkIn, status, checkIn, checkOut, createdAt: checkIn }) as any;

const equal = (actual: unknown, expected: unknown) => {
  if (actual !== expected) throw new Error(`Expected ${String(expected)} but received ${String(actual)}`);
};

const run = async () => {
  const now = new Date('2030-01-10T12:00:00');
  const collections = getOwnerBookingCollections([
    booking('PENDING_OWNER_APPROVAL', '2030-01-20'),
    booking('APPROVED_PENDING_PAYMENT', '2030-01-21'),
    booking('CONFIRMED', '2030-01-22', '2030-01-24'),
    booking('CONFIRMED', '2030-01-01', '2030-01-03'),
    booking('REJECTED', '2030-01-02'),
    booking('EXPIRED', '2030-01-03'),
    booking('CANCELLED', '2030-01-04'),
  ], now);

  equal(collections.requests.map((item) => item.status).join(','), 'PENDING_OWNER_APPROVAL');
  equal(collections.active.map((item) => item.status).join(','), 'APPROVED_PENDING_PAYMENT,CONFIRMED');
  equal(collections.history.map((item) => item.status).join(','), 'CANCELLED,EXPIRED,REJECTED,CONFIRMED');
  equal(isOwnerBookingChatEligible('APPROVED_PENDING_PAYMENT'), true);
  equal(isOwnerBookingChatEligible('CONFIRMED'), true);
  equal(isOwnerBookingChatEligible('PENDING_OWNER_APPROVAL'), false);

  let calls = 0;
  const successful = await runOwnerBookingAction(async () => { calls += 1; });
  equal(successful.ok, true);
  const failed = await runOwnerBookingAction(async () => { calls += 1; throw new Error('network'); });
  equal(failed.ok, false);
  equal(calls, 2);
  if (!failed.ok) equal(failed.message, 'تعذر تنفيذ الإجراء. حاول مرة أخرى.');

  console.log('OWNER-BOOKINGS-01 derivations and action outcomes passed.');
};

void run();

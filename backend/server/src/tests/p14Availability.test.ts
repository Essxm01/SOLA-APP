import { strict as assert } from 'node:assert';
import { ExpressServerApp } from '../app';
import { signAccessToken } from '../services/jwtService';
import { bookingDb, ownerDb, propertyAvailabilityDb, propertyDb, userDb } from '../services/dbRepository';

const ownerA = 'a1111111-1111-4111-8111-111111111111';
const ownerB = 'b2222222-2222-4222-8222-222222222222';
const customerId = 'c5555555-5555-4555-8555-555555555555';
const propertyId = 'd4444444-4444-4444-8444-444444444444';
const ownerHeaders = (id: string) => ({ authorization: `Bearer ${signAccessToken({ sub: id, role: 'ROLE_OWNER' })}` });
const customerHeaders = { authorization: `Bearer ${signAccessToken({ sub: customerId, role: 'ROLE_CUSTOMER' })}` };

const publishedProperty: any = {
  id: propertyId, ownerId: ownerA, status: 'PUBLISHED', verificationStatus: 'VERIFIED',
  basePricePerNight: 2000, maxGuests: 4, title: 'وحدة اختبار',
};
const customer: any = { id: customerId, fullName: 'عميل', phoneNumber: '+201012345678' };

const originals: Record<string, any> = {
  propById: propertyDb.getById,
  userById: userDb.getById,
  ownerById: ownerDb.getById,
  blocks: bookingDb.getBlocksByPropertyId,
  avRows: propertyAvailabilityDb.getByPropertyId,
  avSet: propertyAvailabilityDb.setBlockedForDate,
  bookingCreate: (bookingDb as any).create,
  bookingSummary: (bookingDb as any).createFinancialSummary,
  bookingById: bookingDb.getById,
  approvalUpdate: bookingDb.updateStatusForOwner,
};

// In-memory canonical availability state mirroring the DB contracts:
// blocking booking intervals + manual property_availability rows.
let manualRows: any[] = [];
let blockingBookings: any[] = [];
let persistedWrites: any[] = [];
let createdBookings: any[] = [];
let writeCallCount = 0;
let bookingCreateError: any = null;
let approvalError: any = null;

try {
  (propertyDb as any).getById = async (id: string) => id === propertyId ? { ...publishedProperty } : null;
  (userDb as any).getById = async (id: string) => id === customerId ? { ...customer } : null;
  (bookingDb as any).getBlocksByPropertyId = async (id: string) => id === propertyId ? blockingBookings.map((b) => ({ ...b })) : [];
  (propertyAvailabilityDb as any).getByPropertyId = async (id: string) => id === propertyId ? manualRows.map((r) => ({ ...r })) : [];
  (propertyAvailabilityDb as any).setBlockedForDate = async (_p: string, date: string, isBooked: boolean, note?: string | null) => {
    writeCallCount += 1;
    persistedWrites.push({ date, isBooked, note });
    // Price overrides already persisted on the row are never touched by toggles.
    const existing = manualRows.find((r) => r.date === date);
    const row = {
      id: existing?.id ?? `av-${date}`,
      propertyId,
      date,
      isBooked,
      customPricePerNight: existing?.customPricePerNight ?? null,
      note: note ?? null,
    };
    manualRows = [...manualRows.filter((r) => r.date !== date), row];
    return { ...row };
  };
  (bookingDb as any).create = async (payload: any) => {
    if (bookingCreateError) throw bookingCreateError;
    const created = { id: payload.id, ...payload };
    createdBookings.push(created);
    return created;
  };
  (bookingDb as any).getById = async (id: string) => createdBookings.find((b) => b.id === id) ?? null;
  (bookingDb as any).createFinancialSummary = async () => ({ bookingId: 'x' });
  (bookingDb as any).updateStatusForOwner = async (id: string, ownerId: string, status: string) => {
    if (approvalError) throw approvalError;
    return id && ownerId === ownerA ? { id, status } : null;
  };

  const app = new ExpressServerApp();

  // --- Owner block persists and round-trips as BLOCKED ---
  const blocked = await app.handleHttpRequest('POST', '/api/v1/owner/calendar/toggle-block', ownerHeaders(ownerA), { propertyId, date: '2026-12-05', note: 'BLOCKED' });
  assert.equal(blocked.statusCode, 200, 'owner block persists');
  assert.equal((blocked.body as any).data.status, 'BLOCKED');
  assert.equal((blocked.body as any).data.date, '2026-12-05');
  assert.equal(persistedWrites[0].isBooked, true);
  const calendar = await app.handleHttpRequest('GET', `/api/v1/owner/calendar/${propertyId}`, ownerHeaders(ownerA));
  assert.equal(calendar.statusCode, 200);
  const blockedDay = (calendar.body as any).data.find((r: any) => r.date === '2026-12-05');
  assert.equal(blockedDay?.status, 'BLOCKED', 'manual block round-trips as BLOCKED');

  // --- Unblock persists an available state and preserves the price override ---
  (propertyAvailabilityDb as any).setBlockedForDate; // keep stub
  manualRows = manualRows.map((r) => r.date === '2026-12-05' ? { ...r, customPricePerNight: '3500' } : r);
  const unblocked = await app.handleHttpRequest('POST', '/api/v1/owner/calendar/toggle-block', ownerHeaders(ownerA), { propertyId, date: '2026-12-05', note: 'UNBLOCKED' });
  assert.equal(unblocked.statusCode, 200);
  assert.equal((unblocked.body as any).data.status, 'AVAILABLE');
  assert.equal((unblocked.body as any).data.customPricePerNight, 3500, 'unblock preserves custom price override');
  assert.equal(persistedWrites[persistedWrites.length - 1].isBooked, false);
  // Re-block for later scenarios.
  await app.handleHttpRequest('POST', '/api/v1/owner/calendar/toggle-block', ownerHeaders(ownerA), { propertyId, date: '2026-12-05', note: 'BLOCKED' });

  // --- Owner calendar distinguishes BOOKED (booking intervals) from BLOCKED (manual) ---
  blockingBookings = [{ checkIn: '2026-12-10', checkOut: '2026-12-13', status: 'CONFIRMED' }];
  const calendar2 = await app.handleHttpRequest('GET', `/api/v1/owner/calendar/${propertyId}`, ownerHeaders(ownerA));
  const byDate = new Map((calendar2.body as any).data.map((r: any) => [r.date, r.status]));
  assert.equal(byDate.get('2026-12-10'), 'BOOKED');
  assert.equal(byDate.get('2026-12-11'), 'BOOKED');
  assert.equal(byDate.get('2026-12-12'), 'BOOKED', 'booking expands with [checkIn, checkOut) half-open nights');
  assert.equal(byDate.get('2026-12-13'), undefined, 'checkOut day is not blocked');
  assert.equal(byDate.get('2026-12-05'), 'BLOCKED');

  // --- Cross-owner read/write rejected ---
  const foreignWrite = await app.handleHttpRequest('POST', '/api/v1/owner/calendar/toggle-block', ownerHeaders(ownerB), { propertyId, date: '2026-12-06', note: 'BLOCKED' });
  assert.equal(foreignWrite.statusCode, 403);
  const foreignRead = await app.handleHttpRequest('GET', `/api/v1/owner/calendar/${propertyId}`, ownerHeaders(ownerB));
  assert.equal(foreignRead.statusCode, 403);
  assert.equal(persistedWrites.some((w) => w.date === '2026-12-06'), false, 'foreign owner never mutates availability');

  // --- Invalid payload rejected ---
  const badDate = await app.handleHttpRequest('POST', '/api/v1/owner/calendar/toggle-block', ownerHeaders(ownerA), { propertyId, date: 'not-a-date', note: 'BLOCKED' });
  assert.equal(badDate.statusCode, 400);

  // --- Customer availability includes manual blocks (public route) ---
  const customerAvailability = await app.handleHttpRequest('GET', `/api/v1/customer/properties/${propertyId}/availability`, {}, undefined);
  assert.equal(customerAvailability.statusCode, 200);
  const ranges = (customerAvailability.body as any).data.unavailableRanges;
  assert.ok(ranges.some((r: any) => r.checkIn === '2026-12-05' && r.checkOut === '2026-12-06'), 'manual block appears as unavailable [D, D+1)');
  assert.ok(ranges.some((r: any) => r.checkIn === '2026-12-10' && r.checkOut === '2026-12-13'), 'blocking booking appears as unavailable');

  // --- Calculate rejects a manual-block overlap ---
  const calc = await app.handleHttpRequest('POST', '/api/v1/customer/bookings/calculate', customerHeaders, { propertyId, checkIn: '2026-12-04', checkOut: '2026-12-06', guests: 2 });
  assert.equal(calc.statusCode, 409, 'calculate fails closed on manual block overlap');
  assert.equal((calc.body as any).error.code, 'DATE_OVERLAP');

  // --- Booking creation rejects an already-blocked manual date ---
  const created = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeaders, { propertyId, checkIn: '2026-12-05', checkOut: '2026-12-07', guests: 2 });
  assert.equal(created.statusCode, 409, 'blocked night rejects the request');
  assert.equal((created.body as any).error.code, 'DATE_OVERLAP');
  assert.equal(createdBookings.length, 0);

  // --- PENDING_OWNER_APPROVAL alone remains non-blocking ---
  blockingBookings = [{ checkIn: '2026-12-10', checkOut: '2026-12-13', status: 'PENDING_OWNER_APPROVAL' }];
  const pendingCreate = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeaders, { propertyId, checkIn: '2026-12-10', checkOut: '2026-12-12', guests: 2 });
  assert.equal(pendingCreate.statusCode, 201, 'pending bookings do not block inventory');
  assert.equal(createdBookings.length, 1);

  // --- Owner approval rejects a manual block placed after the request ---
  await app.handleHttpRequest('POST', '/api/v1/owner/calendar/toggle-block', ownerHeaders(ownerA), { propertyId, date: '2026-12-11', note: 'BLOCKED' });
  const approval = await app.handleHttpRequest('POST', `/api/v1/owner/bookings/${createdBookings[0].id}/approve`, ownerHeaders(ownerA));
  assert.equal(approval.statusCode, 409, 'approval fails while a manual block covers the request');
  assert.equal((approval.body as any).error.code, 'DATE_OVERLAP');

  // --- Correction 3: reverse-race trigger conflict maps to clean 409; unrelated DB failures stay 5xx ---
  blockingBookings = [];
  manualRows = [];
  createdBookings = [];
  bookingCreateError = new Error('REST_BOOKING_INSERT_FAILED: HTTP 400 — {"code":"P0001","message":"DATE_MANUALLY_BLOCKED"}');
  const raceCreate = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeaders, { propertyId, checkIn: '2026-12-20', checkOut: '2026-12-22', guests: 2 });
  assert.equal(raceCreate.statusCode, 409, 'manual block winning the race before INSERT is a clean conflict');
  assert.equal((raceCreate.body as any).error.code, 'DATE_OVERLAP');
  bookingCreateError = new Error('REST_BOOKING_INSERT_FAILED: HTTP 503 — {"message":"connection refused"}');
  const outageCreate = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeaders, { propertyId, checkIn: '2026-12-20', checkOut: '2026-12-22', guests: 2 });
  assert.equal(outageCreate.statusCode, 500, 'unrelated booking persistence failures stay truthful 5xx');
  assert.equal((outageCreate.body as any).error.code, 'BOOKING_PERSISTENCE_FAILED');
  bookingCreateError = null;

  const pendingForApproval = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeaders, { propertyId, checkIn: '2026-12-20', checkOut: '2026-12-22', guests: 2 });
  assert.equal(pendingForApproval.statusCode, 201);
  approvalError = new Error("REST_BOOKING_STATUS_UPDATE_FAILED: HTTP 400 — {\"code\":\"P0001\",\"message\":\"DATE_MANUALLY_BLOCKED\"}");
  const raceApproval = await app.handleHttpRequest('POST', `/api/v1/owner/bookings/${createdBookings[0].id}/approve`, ownerHeaders(ownerA));
  assert.equal(raceApproval.statusCode, 409, 'manual block winning the race before approval is a clean conflict');
  assert.equal((raceApproval.body as any).error.code, 'DATE_OVERLAP');
  approvalError = new Error('REST_BOOKING_STATUS_UPDATE_FAILED: HTTP 503 — {"message":"database unavailable"}');
  const outageApproval = await app.handleHttpRequest('POST', `/api/v1/owner/bookings/${createdBookings[0].id}/approve`, ownerHeaders(ownerA));
  assert.equal(outageApproval.statusCode, 500, 'unrelated approval persistence failures are no longer converted to 409');
  assert.equal((outageApproval.body as any).error.code, 'APPROVAL_PERSISTENCE_FAILED');
  approvalError = null;

  // --- Correction 4: strict toggle action and calendar-date validation before DB access ---
  const writesBefore = writeCallCount;
  const badAction = await app.handleHttpRequest('POST', '/api/v1/owner/calendar/toggle-block', ownerHeaders(ownerA), { propertyId, date: '2026-12-20', note: 'OPEN' });
  assert.equal(badAction.statusCode, 400, 'unknown action is rejected');
  assert.equal((badAction.body as any).error.code, 'INVALID_AVAILABILITY_ACTION');
  const missingAction = await app.handleHttpRequest('POST', '/api/v1/owner/calendar/toggle-block', ownerHeaders(ownerA), { propertyId, date: '2026-12-20' });
  assert.equal(missingAction.statusCode, 400, 'missing action is rejected');
  assert.equal((missingAction.body as any).error.code, 'INVALID_AVAILABILITY_ACTION');
  const impossibleDate = await app.handleHttpRequest('POST', '/api/v1/owner/calendar/toggle-block', ownerHeaders(ownerA), { propertyId, date: '2026-02-31', note: 'BLOCKED' });
  assert.equal(impossibleDate.statusCode, 400, 'impossible calendar date is rejected before DB access');
  assert.equal((impossibleDate.body as any).error.code, 'INVALID_AVAILABILITY_DATE');
  assert.equal(writeCallCount, writesBefore, 'invalid toggles never reach the database');

  console.log('P1.4 availability persistence and blocking integrity suite passed');
} finally {
  (propertyDb as any).getById = originals.propById;
  (userDb as any).getById = originals.userById;
  (ownerDb as any).getById = originals.ownerById;
  (bookingDb as any).getBlocksByPropertyId = originals.blocks;
  (propertyAvailabilityDb as any).getByPropertyId = originals.avRows;
  (propertyAvailabilityDb as any).setBlockedForDate = originals.avSet;
  (bookingDb as any).create = originals.bookingCreate;
  (bookingDb as any).createFinancialSummary = originals.bookingSummary;
  (bookingDb as any).getById = originals.bookingById;
  (bookingDb as any).updateStatusForOwner = originals.approvalUpdate;
}

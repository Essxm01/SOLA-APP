import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// P1.4 contract proof: booking mutations and manual availability-block
// mutations must share ONE property-scoped serialization key at the DB layer,
// so the Worker's separate REST statements can never interleave a
// check-then-write race across the two tables.
const migration = fs.readFileSync(path.resolve('database/migrations/025_availability_blocking_integrity.sql'), 'utf8');

for (const required of ['BEGIN;', 'COMMIT;', 'konfrm_booking_availability_guard', 'konfrm_availability_block_guard', 'schema_migrations']) {
  assert.ok(migration.includes(required), `migration must contain ${required}`);
}

// 1. The shared serialization guard: identical advisory-lock key expression in
// BOTH trigger functions, taken BEFORE either side reads the other table.
const lockKey = 'pg_advisory_xact_lock(hashtextextended(NEW.property_id::text, 0))';
const guardCount = migration.split(lockKey).length - 1;
assert.equal(guardCount, 2, 'both table mutation paths must take the identical property-scoped advisory lock');
const firstBookingLock = migration.indexOf(lockKey);
const firstAvailabilityLock = migration.indexOf(lockKey, firstBookingLock + 1);
assert.ok(firstBookingLock > -1 && firstAvailabilityLock > -1, 'lock precedes cross-table reads in both guards');
assert.ok(migration.indexOf('FROM public.property_availability') > firstBookingLock, 'booking guard re-checks manual blocks only after serialization');
assert.ok(migration.indexOf('FROM public.bookings') > firstAvailabilityLock, 'block guard re-checks blocking bookings only after serialization');

// 2. Booking-side semantics: requestable inserts and blocking transitions are
// guarded; terminal/non-blocking states pass through.
for (const required of [
  "NEW.status NOT IN ('PENDING_OWNER_APPROVAL', 'APPROVED_PENDING_PAYMENT', 'CONFIRMED')",
  "NEW.status IN ('APPROVED_PENDING_PAYMENT', 'CONFIRMED')",
  "pa.is_booked = TRUE",
  'pa.date >= NEW.check_in',
  'pa.date < NEW.check_out',
]) {
  assert.ok(migration.includes(required), `booking guard must contain: ${required}`);
}

// 3. Block-side semantics: only activation is guarded, against canonical
// blocking booking states with [check_in, check_out) night coverage.
for (const required of [
  'NEW.is_booked IS NOT TRUE',
  "b.status IN ('APPROVED_PENDING_PAYMENT', 'CONFIRMED')",
  'NEW.date >= b.check_in',
  'NEW.date < b.check_out',
]) {
  assert.ok(migration.includes(required), `availability guard must contain: ${required}`);
}

// 4. Trigger wiring covers exactly the mutation surfaces that matter.
const normalized = migration.replace(/\s+/g, ' ');
assert.ok(normalized.includes('BEFORE INSERT OR UPDATE OF status, check_in, check_out ON public.bookings'), 'booking trigger covers insert + status/date mutation');
assert.ok(normalized.includes('BEFORE INSERT OR UPDATE OF property_id, date, is_booked ON public.property_availability'), 'availability trigger covers insert + activation mutation');

// 5. Security: trigger functions are internals — SECURITY INVOKER, no direct
// executable surface for PUBLIC/anon/authenticated, never SECURITY DEFINER.
assert.ok(!migration.includes('SECURITY DEFINER'), 'no SECURITY DEFINER functions may be introduced');
assert.ok(migration.includes('SECURITY INVOKER'), 'guards run as invoker');
const revokes = migration.match(/REVOKE ALL ON FUNCTION public\.(konfrm_booking_availability_guard|konfrm_availability_block_guard)\(\)\s*FROM PUBLIC, anon, authenticated;/g) || [];
assert.equal(revokes.length, 2, 'both guard functions must be revoked from PUBLIC, anon, and authenticated');

// 6. The booking-vs-booking GiST exclusion constraint is untouched: the
// migration may reference it in prose but must not drop or alter it.
assert.ok(!/DROP\s+CONSTRAINT\s+no_overlapping_active_bookings/i.test(migration), 'booking exclusion constraint must not be dropped');
assert.ok(!migration.includes('ALTER TABLE bookings'), 'booking table definition must not be altered by this migration');

console.log('P1.4 availability migration concurrency contract suite passed');

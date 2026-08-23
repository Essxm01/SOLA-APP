-- BOOKING-01: pending owner-review requests are intentionally non-blocking.
-- Only an approved-pending-payment or confirmed booking reserves inventory.

BEGIN;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_overlapping_active_bookings;

ALTER TABLE bookings ADD CONSTRAINT no_overlapping_active_bookings
EXCLUDE USING gist (
  property_id WITH =,
  daterange(check_in, check_out, '[)') WITH &&
) WHERE (status IN ('APPROVED_PENDING_PAYMENT', 'CONFIRMED'));

COMMIT;

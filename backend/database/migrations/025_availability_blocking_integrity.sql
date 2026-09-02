-- P1.4 — availability blocking integrity (prepared locally only; unapplied).
--
-- Closes the cross-table race between booking mutations and manual
-- property_availability blocks. The Worker executes separate REST statements,
-- so application-level read-then-write prechecks cannot serialize competing
-- mutations. Both mutation paths now take the SAME property-scoped transaction
-- advisory lock inside BEFORE triggers, so a booking write and a manual-block
-- write for one property can never interleave check-then-write.
--
-- Preserved canonical semantics:
-- - booking-vs-booking overlap stays guarded by the existing
--   no_overlapping_active_bookings GiST exclusion constraint (untouched).
-- - PENDING_OWNER_APPROVAL does not block inventory and does not prevent a
--   later manual block; that request then fails approval while the block stays.
-- - Manual block date D is the night [D, D+1); booking nights are [check_in, check_out).
-- - Unblocking (is_booked = false) never touches booking rows.

BEGIN;

-- ---------------------------------------------------------------------------
-- Guard: booking INSERT (requestable/blocking states) and transitions into
-- APPROVED_PENDING_PAYMENT / CONFIRMED must reject overlapping manual blocks.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.konfrm_booking_availability_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Terminal/non-blocking inserted states never occupy inventory intent.
    IF NEW.status NOT IN ('PENDING_OWNER_APPROVAL', 'APPROVED_PENDING_PAYMENT', 'CONFIRMED') THEN
      RETURN NEW;
    END IF;
  ELSE
    -- UPDATE: guard only transitions into a blocking state, or date moves of a
    -- requestable/blocking booking. Cancellations/rejections pass through.
    IF NEW.status IN ('APPROVED_PENDING_PAYMENT', 'CONFIRMED') THEN
      NULL;
    ELSIF OLD.status IN ('PENDING_OWNER_APPROVAL', 'APPROVED_PENDING_PAYMENT', 'CONFIRMED')
          AND (NEW.check_in IS DISTINCT FROM OLD.check_in OR NEW.check_out IS DISTINCT FROM OLD.check_out) THEN
      NULL;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Shared property-scoped serialization key. The availability trigger takes
  -- the identical key, so competing booking/manual mutations serialize here
  -- before either side re-checks the other table.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.property_id::text, 0));

  IF EXISTS (
    SELECT 1
    FROM public.property_availability pa
    WHERE pa.property_id = NEW.property_id
      AND pa.is_booked = TRUE
      AND pa.date >= NEW.check_in
      AND pa.date < NEW.check_out
  ) THEN
    RAISE EXCEPTION 'DATE_MANUALLY_BLOCKED';
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Guard: manual block creation/activation must reject dates covered by an
-- existing blocking booking. Unblocking returns early and never weakens the
-- booking-side block (bookings are untouched by is_booked = false).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.konfrm_availability_block_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_booked IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.property_id::text, 0));

  IF EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.property_id = NEW.property_id
      AND b.status IN ('APPROVED_PENDING_PAYMENT', 'CONFIRMED')
      AND NEW.date >= b.check_in
      AND NEW.date < b.check_out
  ) THEN
    RAISE EXCEPTION 'DATE_COVERED_BY_ACTIVE_BOOKING';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS konfrm_booking_availability_guard_trg ON public.bookings;
CREATE TRIGGER konfrm_booking_availability_guard_trg
  BEFORE INSERT OR UPDATE OF status, check_in, check_out
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.konfrm_booking_availability_guard();

DROP TRIGGER IF EXISTS konfrm_availability_block_guard_trg ON public.property_availability;
CREATE TRIGGER konfrm_availability_block_guard_trg
  BEFORE INSERT OR UPDATE OF property_id, date, is_booked
  ON public.property_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.konfrm_availability_block_guard();

-- Trigger functions are implementation internals: no direct executable surface.
REVOKE ALL ON FUNCTION public.konfrm_booking_availability_guard()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.konfrm_availability_block_guard()
  FROM PUBLIC, anon, authenticated;

INSERT INTO public.schema_migrations (version)
VALUES ('025_availability_blocking_integrity.sql')
ON CONFLICT (version) DO NOTHING;

COMMIT;

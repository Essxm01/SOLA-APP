-- P1.5 — atomic booking request + financial summary creation (repository only; unapplied).
--
-- Customer booking creation previously performed two sequential PostgREST
-- writes (booking INSERT, then financial-summary INSERT) with a compensating
-- pending-booking DELETE when the second write failed. Compensation is not
-- atomicity. This RPC persists both rows inside ONE PostgreSQL transaction:
-- an unhandled failure of either INSERT aborts the whole function, so a
-- booking can never exist without its canonical financial summary and vice
-- versa (the summary has an FK to the booking, so it can never exist alone).
--
-- Preserved by design:
-- - Migration 025's booking trigger and the no_overlapping_active_bookings
--   GiST exclusion constraint fire on the plain INSERT inside this function;
-- - all bookings/booking_financial_summaries CHECK/FK constraints apply;
-- - no financial formula is recomputed or changed here: the backend's
--   financial engine remains authoritative and its values are persisted.

BEGIN;

CREATE OR REPLACE FUNCTION public.konfrm_create_booking_request(
  p_id uuid,
  p_booking_number text,
  p_property_id uuid,
  p_owner_id uuid,
  p_customer_id uuid,
  p_guest_name text,
  p_guest_phone text,
  p_check_in date,
  p_check_out date,
  p_nights integer,
  p_total_guests integer,
  p_status text,
  p_total_booking_value numeric,
  p_deposit_amount numeric,
  p_sola_commission_amount numeric,
  p_owner_net_deposit_amount numeric,
  p_remaining_balance numeric,
  p_commission_on_remaining_balance numeric DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  "bookingNumber" text,
  "propertyId" uuid,
  "ownerId" uuid,
  "customerId" uuid,
  "guestName" text,
  "checkIn" date,
  "checkOut" date,
  nights integer,
  "guestsCount" integer,
  status text,
  "createdAt" timestamptz,
  "summaryTotalBookingValue" numeric,
  "summaryDepositAmount" numeric,
  "summarySolaCommissionAmount" numeric,
  "summaryOwnerNetDepositAmount" numeric,
  "summaryRemainingBalance" numeric,
  "summaryCommissionOnRemainingBalance" numeric
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
BEGIN
  -- A booking request is created only in its canonical initial state.
  IF p_status <> 'PENDING_OWNER_APPROVAL' THEN
    RAISE EXCEPTION 'BOOKING_REQUEST_STATUS_INVALID';
  END IF;

  -- The booking INSERT executes under Migration 025's trigger and the
  -- booking overlap exclusion constraint; a conflict aborts everything.
  INSERT INTO public.bookings (
    id, booking_number, property_id, owner_id, customer_id,
    guest_name, guest_phone, check_in, check_out, nights, total_guests, status
  ) VALUES (
    p_id, p_booking_number, p_property_id, p_owner_id, p_customer_id,
    p_guest_name, p_guest_phone, p_check_in, p_check_out, p_nights, p_total_guests, p_status
  )
  RETURNING * INTO v_booking;

  -- Same transaction: if this INSERT fails for any reason, the booking INSERT
  -- above is rolled back with it. The FK guarantees the summary can never
  -- exist without its booking.
  INSERT INTO public.booking_financial_summaries (
    booking_id, total_booking_value, deposit_amount, sola_commission_amount,
    owner_net_deposit_amount, remaining_balance, commission_on_remaining_balance
  ) VALUES (
    v_booking.id, p_total_booking_value, p_deposit_amount, p_sola_commission_amount,
    p_owner_net_deposit_amount, p_remaining_balance, p_commission_on_remaining_balance
  );

  RETURN QUERY SELECT
    v_booking.id,
    v_booking.booking_number::text,
    v_booking.property_id,
    v_booking.owner_id,
    v_booking.customer_id,
    v_booking.guest_name,
    v_booking.check_in,
    v_booking.check_out,
    v_booking.nights,
    v_booking.total_guests,
    v_booking.status::text,
    v_booking.created_at,
    p_total_booking_value,
    p_deposit_amount,
    p_sola_commission_amount,
    p_owner_net_deposit_amount,
    p_remaining_balance,
    p_commission_on_remaining_balance;
END;
$$;

-- Backend-internal persistence boundary: no user-callable surface.
REVOKE ALL ON FUNCTION public.konfrm_create_booking_request(
  uuid, text, uuid, uuid, uuid, text, text, date, date, integer, integer, text,
  numeric, numeric, numeric, numeric, numeric, numeric
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.konfrm_create_booking_request(
  uuid, text, uuid, uuid, uuid, text, text, date, date, integer, integer, text,
  numeric, numeric, numeric, numeric, numeric, numeric
) TO service_role;

INSERT INTO public.schema_migrations (version)
VALUES ('026_atomic_booking_request_creation.sql')
ON CONFLICT (version) DO NOTHING;

COMMIT;

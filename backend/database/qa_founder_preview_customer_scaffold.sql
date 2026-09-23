-- KONFRM — FOUNDER PREVIEW QA CUSTOMER SCAFFOLD
-- QA-ONLY INFRASTRUCTURE. DO NOT APPLY TO PRODUCTION.
--
-- The dedicated Auth V2 QA baseline intentionally contains only identity/auth
-- tables. Founder Preview needs truthful canonical Customer reads after session
-- creation, so this file creates the minimum real, empty Customer-domain tables
-- required by Explore/Account bootstrap. It does not seed fake properties,
-- bookings, favorites, money, ratings, or verification state.

BEGIN;

CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE RESTRICT,
  title VARCHAR(200) NOT NULL,
  unit_type VARCHAR(50) NOT NULL,
  property_type VARCHAR(50) NOT NULL,
  address TEXT,
  bedrooms INT NOT NULL DEFAULT 1 CHECK (bedrooms >= 0),
  bathrooms INT NOT NULL DEFAULT 1 CHECK (bathrooms >= 0),
  max_guests INT NOT NULL DEFAULT 2 CHECK (max_guests > 0),
  base_price_per_night NUMERIC(12,2) NOT NULL CHECK (base_price_per_night > 0),
  description TEXT,
  region VARCHAR(100),
  resort_name VARCHAR(150),
  area_sq_m INTEGER,
  beds_count INTEGER,
  amenities JSONB DEFAULT '[]'::jsonb,
  house_rules JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'PAUSED', 'ARCHIVED')),
  verification_status VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED'
    CHECK (verification_status IN ('UNVERIFIED', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS qa_preview_properties_owner_status_idx
  ON public.properties(owner_id, status)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number VARCHAR(30) UNIQUE NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  guest_name VARCHAR(100) NOT NULL,
  guest_phone VARCHAR(20) NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INT NOT NULL CHECK (nights > 0),
  total_guests INT NOT NULL CHECK (total_guests > 0),
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_OWNER_APPROVAL'
    CHECK (status IN (
      'PENDING_OWNER_APPROVAL', 'APPROVED_PENDING_PAYMENT', 'CONFIRMED',
      'REJECTED', 'EXPIRED', 'CANCELLED_BY_OWNER', 'CANCELLED_BY_GUEST', 'COMPLETED'
    )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  CONSTRAINT qa_preview_booking_dates CHECK (check_out > check_in)
);

CREATE INDEX IF NOT EXISTS qa_preview_bookings_customer_created_idx
  ON public.bookings(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS qa_preview_bookings_owner_status_idx
  ON public.bookings(owner_id, status);

CREATE TABLE IF NOT EXISTS public.booking_financial_summaries (
  booking_id UUID PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE,
  total_booking_value NUMERIC(12,2) NOT NULL CHECK (total_booking_value >= 0),
  deposit_amount NUMERIC(12,2) NOT NULL CHECK (deposit_amount >= 0),
  sola_commission_amount NUMERIC(12,2) NOT NULL CHECK (sola_commission_amount >= 0),
  owner_net_deposit_amount NUMERIC(12,2) NOT NULL CHECK (owner_net_deposit_amount >= 0),
  remaining_balance NUMERIC(12,2) NOT NULL CHECK (remaining_balance >= 0),
  commission_on_remaining_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00
    CHECK (commission_on_remaining_balance = 0.00),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_favorites (
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (customer_id, property_id)
);

CREATE INDEX IF NOT EXISTS qa_preview_customer_favorites_created_idx
  ON public.customer_favorites(customer_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.konfrm_add_customer_favorite(
  p_customer_id UUID,
  p_property_id UUID
)
RETURNS TABLE (
  "customerId" UUID,
  "propertyId" UUID,
  "createdAt" TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_customer_id UUID;
  v_property_id UUID;
  v_created_at TIMESTAMPTZ;
BEGIN
  INSERT INTO public.customer_favorites (customer_id, property_id)
  SELECT p_customer_id, p_property_id
  FROM public.properties
  WHERE id = p_property_id
    AND deleted_at IS NULL
    AND status = 'PUBLISHED'
    AND verification_status = 'VERIFIED'
  ON CONFLICT (customer_id, property_id) DO NOTHING
  RETURNING customer_id, property_id, created_at
  INTO v_customer_id, v_property_id, v_created_at;

  IF v_customer_id IS NOT NULL THEN
    RETURN QUERY SELECT v_customer_id, v_property_id, v_created_at;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT cf.customer_id, cf.property_id, cf.created_at
  FROM public.customer_favorites cf
  JOIN public.properties p ON p.id = cf.property_id
  WHERE cf.customer_id = p_customer_id
    AND cf.property_id = p_property_id
    AND p.deleted_at IS NULL
    AND p.status = 'PUBLISHED'
    AND p.verification_status = 'VERIFIED';
END;
$$;

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_financial_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.properties FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.bookings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.booking_financial_summaries FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.customer_favorites FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.konfrm_add_customer_favorite(UUID, UUID) FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.properties TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bookings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.booking_financial_summaries TO service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.customer_favorites TO service_role;
GRANT EXECUTE ON FUNCTION public.konfrm_add_customer_favorite(UUID, UUID) TO service_role;

COMMIT;

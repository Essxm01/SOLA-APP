BEGIN;

CREATE TABLE public.customer_favorites (
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (customer_id, property_id)
);

CREATE INDEX customer_favorites_customer_created_idx
  ON public.customer_favorites(customer_id, created_at DESC);

ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.customer_favorites FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.customer_favorites TO service_role;

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
  -- Attempt atomic insert if property is currently published, verified, and not deleted
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

  -- If a new row was inserted, return it
  IF v_customer_id IS NOT NULL THEN
    RETURN QUERY SELECT v_customer_id, v_property_id, v_created_at;
    RETURN;
  END IF;

  -- Duplicate idempotency path: return existing favorite ONLY if target property is still public
  RETURN QUERY
  SELECT cf.customer_id AS "customerId", cf.property_id AS "propertyId", cf.created_at AS "createdAt"
  FROM public.customer_favorites cf
  JOIN public.properties p ON p.id = cf.property_id
  WHERE cf.customer_id = p_customer_id
    AND cf.property_id = p_property_id
    AND p.deleted_at IS NULL
    AND p.status = 'PUBLISHED'
    AND p.verification_status = 'VERIFIED';
END;
$$;

REVOKE ALL ON FUNCTION public.konfrm_add_customer_favorite(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.konfrm_add_customer_favorite(UUID, UUID)
  TO service_role;

INSERT INTO public.schema_migrations (version)
VALUES ('028_customer_favorites.sql')
ON CONFLICT (version) DO NOTHING;

COMMIT;

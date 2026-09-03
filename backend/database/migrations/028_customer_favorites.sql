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
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.customer_favorites (customer_id, property_id)
  SELECT p_customer_id, p_property_id
  FROM public.properties
  WHERE id = p_property_id
    AND deleted_at IS NULL
    AND status = 'PUBLISHED'
    AND verification_status = 'VERIFIED'
  ON CONFLICT (customer_id, property_id)
  DO UPDATE SET created_at = customer_favorites.created_at
  RETURNING customer_id AS "customerId", property_id AS "propertyId", created_at AS "createdAt";
$$;

REVOKE ALL ON FUNCTION public.konfrm_add_customer_favorite(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.konfrm_add_customer_favorite(UUID, UUID)
  TO service_role;

INSERT INTO public.schema_migrations (version)
VALUES ('028_customer_favorites.sql')
ON CONFLICT (version) DO NOTHING;

COMMIT;

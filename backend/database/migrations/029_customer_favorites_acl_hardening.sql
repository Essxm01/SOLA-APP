BEGIN;

REVOKE ALL ON TABLE public.customer_favorites FROM service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.customer_favorites TO service_role;

INSERT INTO public.schema_migrations (version)
VALUES ('029_customer_favorites_acl_hardening.sql')
ON CONFLICT (version) DO NOTHING;

COMMIT;

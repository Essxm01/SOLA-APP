-- KONFRM P1.2 Stage 3: apply only after the compatible Worker is deployed.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_sessions s LEFT JOIN public.owners o ON o.id = s.user_id
    WHERE s.user_id IS NULL OR s.surface NOT IN ('CUSTOMER','OWNER')
       OR s.role NOT IN ('ROLE_CUSTOMER','ROLE_OWNER')
       OR (s.role = 'ROLE_OWNER' AND (s.owner_id IS NULL OR s.owner_id <> s.user_id OR o.id IS NULL))
       OR (s.role = 'ROLE_CUSTOMER' AND s.owner_id IS NOT NULL)
  ) THEN RAISE EXCEPTION 'SESSION_FINALIZATION_PRECONDITION_FAILED'; END IF;
END $$;

ALTER TABLE public.user_sessions
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN surface SET NOT NULL,
  ALTER COLUMN role SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE public.user_sessions
  ADD CONSTRAINT user_sessions_surface_check CHECK (surface IN ('CUSTOMER', 'OWNER')),
  ADD CONSTRAINT user_sessions_role_check CHECK (role IN ('ROLE_CUSTOMER', 'ROLE_OWNER')),
  ADD CONSTRAINT user_sessions_owner_user_same_uuid_check CHECK (owner_id IS NULL OR owner_id = user_id),
  ADD CONSTRAINT user_sessions_owner_role_requires_owner_check CHECK (role <> 'ROLE_OWNER' OR (owner_id IS NOT NULL AND owner_id = user_id));
CREATE UNIQUE INDEX uq_user_sessions_refresh_token_hash ON public.user_sessions(refresh_token_hash);

DROP TRIGGER IF EXISTS trg_konfrm_compat_user_session_write ON public.user_sessions;
DROP FUNCTION IF EXISTS public.konfrm_compat_user_session_write();
INSERT INTO public.schema_migrations (version)
VALUES ('023_finalize_identity_session_persistence.sql') ON CONFLICT (version) DO NOTHING;
COMMIT;

-- KONFRM P1.2 Stage 1: expand user_sessions without breaking the serving Worker.
-- Historical 015 is intentionally untouched; OTP is not active prototype auth.
BEGIN;

ALTER TABLE public.user_sessions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS surface VARCHAR(20),
  ADD COLUMN IF NOT EXISTS role VARCHAR(50),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- P1.1 evidence: pre-existing rows are owner-scoped and owners use users.id.
UPDATE public.user_sessions
SET user_id = owner_id, surface = 'OWNER', role = 'ROLE_OWNER',
    updated_at = COALESCE(updated_at, created_at, NOW())
WHERE user_id IS NULL OR surface IS NULL OR role IS NULL OR updated_at IS NULL;

-- The old Worker always writes owner_id and a deterministic JSON envelope in
-- device_info. Allow Customer sessions and normalize old transitional writes.
ALTER TABLE public.user_sessions ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE public.user_sessions ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.konfrm_compat_user_session_write()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE payload jsonb; parsed_user_id uuid; parsed_surface text; parsed_role text;
BEGIN
  BEGIN payload := NEW.device_info::jsonb; EXCEPTION WHEN others THEN payload := '{}'::jsonb; END;
  BEGIN parsed_user_id := NULLIF(payload->>'userId', '')::uuid; EXCEPTION WHEN others THEN parsed_user_id := NULL; END;
  parsed_surface := payload->>'surface';
  parsed_role := payload->>'role';
  NEW.user_id := COALESCE(NEW.user_id, parsed_user_id, NEW.owner_id);
  NEW.surface := COALESCE(NEW.surface, parsed_surface, 'OWNER');
  NEW.role := COALESCE(NEW.role, parsed_role, 'ROLE_OWNER');
  NEW.updated_at := COALESCE(NEW.updated_at, NOW());
  IF NEW.user_id IS NULL OR NEW.surface NOT IN ('CUSTOMER', 'OWNER') OR NEW.role NOT IN ('ROLE_CUSTOMER', 'ROLE_OWNER') THEN
    RAISE EXCEPTION 'SESSION_COMPATIBILITY_METADATA_INVALID';
  END IF;
  IF NEW.role = 'ROLE_OWNER' THEN
    IF NEW.owner_id IS NULL OR NEW.owner_id <> NEW.user_id OR NOT EXISTS (SELECT 1 FROM public.owners WHERE id = NEW.user_id) THEN
      RAISE EXCEPTION 'SESSION_OWNER_CAPABILITY_INVALID';
    END IF;
  ELSE
    -- Customer role never needs an Owner capability, including Owner onboarding.
    NEW.owner_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_konfrm_compat_user_session_write ON public.user_sessions;
CREATE TRIGGER trg_konfrm_compat_user_session_write
  BEFORE INSERT OR UPDATE ON public.user_sessions
  FOR EACH ROW EXECUTE FUNCTION public.konfrm_compat_user_session_write();

CREATE INDEX IF NOT EXISTS idx_user_sessions_active_user_surface
  ON public.user_sessions(user_id, surface) WHERE is_revoked IS FALSE;
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token_hash
  ON public.user_sessions(refresh_token_hash);

INSERT INTO public.schema_migrations (version)
VALUES ('022_identity_session_persistence_integrity.sql') ON CONFLICT (version) DO NOTHING;
COMMIT;

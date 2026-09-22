-- CUSTOMER AUTH V2 — EMAIL-FIRST NULLABLE PHONE BOUNDARY
-- Migration: 032_customer_email_first_nullable_phone.sql
--
-- Founder-approved product rule:
--   A Customer may be created with a verified EMAIL and no phone number.
--
-- Safety boundaries:
--   * This migration changes ONLY public.users.phone_number nullability.
--   * public.owners.phone_number remains mandatory and is not altered here.
--   * No fake/placeholder phone numbers are introduced.
--   * public.user_identifiers remains the canonical verified login mapping.
--   * PostgreSQL UNIQUE semantics on users.phone_number continue to protect
--     non-null phones while allowing multiple NULL email-only Customer rows.
--   * Email-only registration is performed through one service-role-only RPC
--     that serializes the same normalized email and creates user + identifier
--     in one database transaction, preventing orphan duplicate user rows.

BEGIN;

ALTER TABLE public.users
  ALTER COLUMN phone_number DROP NOT NULL;

COMMENT ON COLUMN public.users.phone_number IS
  'Canonical verified phone when present. Nullable for Customer accounts created with verified email only; Owner flows enforce phone separately.';

CREATE OR REPLACE FUNCTION public.konfrm_create_email_customer_v2(
  p_user_id UUID,
  p_email VARCHAR(255),
  p_full_name VARCHAR(255),
  p_verified_at TIMESTAMPTZ
)
RETURNS TABLE (
  user_id UUID,
  created BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing_user_id UUID;
  v_email VARCHAR(255) := BTRIM(p_email);
  v_full_name VARCHAR(255) := BTRIM(p_full_name);
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_EMAIL_CUSTOMER_USER_ID';
  END IF;
  IF v_email = '' OR v_email IS NULL THEN
    RAISE EXCEPTION 'INVALID_EMAIL';
  END IF;
  IF v_full_name = '' OR v_full_name IS NULL THEN
    RAISE EXCEPTION 'INVALID_FULL_NAME';
  END IF;
  IF p_verified_at IS NULL THEN
    RAISE EXCEPTION 'EMAIL_NOT_VERIFIED';
  END IF;

  -- Serialize registrations for the exact normalized identifier. The client
  -- normalizer intentionally preserves the local-part and lowercases only the
  -- domain, so the lock key uses the exact canonical value rather than LOWER().
  PERFORM pg_advisory_xact_lock(hashtextextended('KONFRM:EMAIL:' || v_email, 0));

  -- Re-check after acquiring the lock. A concurrent winner, or a registration
  -- completed between OTP verification and Screen 10 submission, always wins.
  SELECT ui.user_id
  INTO v_existing_user_id
  FROM public.user_identifiers ui
  WHERE ui.identifier_type = 'EMAIL'
    AND ui.normalized_value = v_email
  LIMIT 1;

  IF v_existing_user_id IS NOT NULL THEN
    RETURN QUERY SELECT v_existing_user_id, FALSE;
    RETURN;
  END IF;

  INSERT INTO public.users (
    id,
    phone_number,
    phone_verified_at,
    full_name,
    email,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    NULL,
    NULL,
    v_full_name,
    v_email,
    'ACTIVE',
    NOW(),
    NOW()
  );

  INSERT INTO public.user_identifiers (
    id,
    user_id,
    identifier_type,
    normalized_value,
    verified_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    p_user_id,
    'EMAIL',
    v_email,
    p_verified_at,
    NOW(),
    NOW()
  );

  RETURN QUERY SELECT p_user_id, TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.konfrm_create_email_customer_v2(UUID, VARCHAR, VARCHAR, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.konfrm_create_email_customer_v2(UUID, VARCHAR, VARCHAR, TIMESTAMPTZ) TO service_role;

INSERT INTO public.schema_migrations (version)
VALUES ('032_customer_email_first_nullable_phone.sql')
ON CONFLICT (version) DO NOTHING;

COMMIT;

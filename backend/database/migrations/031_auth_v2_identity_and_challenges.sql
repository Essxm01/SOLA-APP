BEGIN;

-- ============================================================================
-- AUTH V2 FOUNDATION 01: ADDITIVE IDENTITY & CHALLENGE FOUNDATION
-- Migration: 031_auth_v2_identity_and_challenges.sql
-- Invariants:
--   1. One canonical human user_id with additive verified identifiers (PHONE, EMAIL).
--   2. Strict DB-level uniqueness on (identifier_type, normalized_value).
--   3. Generic persistent auth_challenges for PHONE / EMAIL and LOGIN / CREATE_ACCOUNT.
--   4. Atomic verification with FOR UPDATE row-level locking (single-winner guarantee).
--   5. Atomic challenge consumption for single-use continuation replay prevention.
--   6. Server-authoritative persistent rate limiting on (bucket_key, window_start).
--   7. Idempotent legacy phone backfill preserving truthful phone_verified_at.
--   8. Profile emails are NOT auto-backfilled or auto-linked.
--   9. users.phone_number NOT NULL is preserved; owners.id = users.id is preserved.
-- ============================================================================

-- 1. Create user_identifiers table
CREATE TABLE IF NOT EXISTS public.user_identifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  identifier_type VARCHAR(20) NOT NULL CHECK (identifier_type IN ('PHONE', 'EMAIL')),
  normalized_value VARCHAR(255) NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_identifiers_type_value UNIQUE (identifier_type, normalized_value)
);

CREATE INDEX IF NOT EXISTS idx_user_identifiers_user_id
  ON public.user_identifiers(user_id);

CREATE INDEX IF NOT EXISTS idx_user_identifiers_lookup
  ON public.user_identifiers(identifier_type, normalized_value);

ALTER TABLE public.user_identifiers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_identifiers FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_identifiers TO service_role;


-- 2. Create auth_challenges table
CREATE TABLE IF NOT EXISTS public.auth_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surface VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER' CHECK (surface IN ('CUSTOMER', 'OWNER', 'ADMIN')),
  intent VARCHAR(50) NOT NULL CHECK (intent IN ('LOGIN', 'CREATE_ACCOUNT')),
  method VARCHAR(20) NOT NULL CHECK (method IN ('PHONE', 'EMAIL')),
  normalized_value VARCHAR(255) NOT NULL,
  otp_digest VARCHAR(255) NOT NULL,
  generation INT NOT NULL DEFAULT 1,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  otp_expires_at TIMESTAMPTZ NOT NULL,
  challenge_expires_at TIMESTAMPTZ NOT NULL,
  resend_available_at TIMESTAMPTZ NOT NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  issue_count INT NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'VERIFIED', 'CONSUMED', 'CANCELLED', 'EXPIRED', 'LOCKED')),
  verified_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  provider_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_challenges_lookup
  ON public.auth_challenges(normalized_value, status);

CREATE INDEX IF NOT EXISTS idx_auth_challenges_expiry
  ON public.auth_challenges(challenge_expires_at);

ALTER TABLE public.auth_challenges ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.auth_challenges FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.auth_challenges TO service_role;


-- 3. Create auth_rate_limits table
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_key VARCHAR(255) NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  attempt_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_auth_rate_limits_bucket_window UNIQUE (bucket_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_lookup
  ON public.auth_rate_limits(bucket_key, window_start DESC);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.auth_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.auth_rate_limits TO service_role;


-- 4. Idempotent Phone Backfill:
-- Copies users.phone_number to user_identifiers, preserving truthful phone_verified_at.
-- Leaves profile emails untouched (no auto-backfill).
INSERT INTO public.user_identifiers (
  id,
  user_id,
  identifier_type,
  normalized_value,
  verified_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  'PHONE',
  u.phone_number,
  u.phone_verified_at,
  u.created_at,
  NOW()
FROM public.users u
WHERE u.phone_number IS NOT NULL AND u.deleted_at IS NULL
ON CONFLICT (identifier_type, normalized_value) DO NOTHING;


-- 5. Atomic Challenge Verification Function (Single-Winner Concurrency Guard)
CREATE OR REPLACE FUNCTION public.konfrm_verify_auth_challenge_v2(
  p_challenge_id UUID,
  p_otp_digest VARCHAR(255),
  p_max_failed_attempts INT DEFAULT 5
)
RETURNS TABLE (
  success BOOLEAN,
  error_code VARCHAR(100),
  challenge_id UUID,
  user_id UUID,
  identifier_type VARCHAR(20),
  normalized_value VARCHAR(255),
  intent VARCHAR(50),
  surface VARCHAR(50),
  failed_attempts INT,
  is_locked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_challenge public.auth_challenges%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_matched_user_id UUID := NULL;
BEGIN
  -- Row-level exclusive lock on challenge record ensures atomic single-winner evaluation
  SELECT * INTO v_challenge
  FROM public.auth_challenges
  WHERE id = p_challenge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'CHALLENGE_NOT_FOUND'::VARCHAR(100), p_challenge_id, NULL::UUID, NULL::VARCHAR(20), NULL::VARCHAR(255), NULL::VARCHAR(50), NULL::VARCHAR(50), 0, FALSE;
    RETURN;
  END IF;

  -- Terminal state: already verified / consumed
  IF v_challenge.status = 'VERIFIED' OR v_challenge.status = 'CONSUMED' THEN
    RETURN QUERY SELECT FALSE, 'CHALLENGE_ALREADY_VERIFIED'::VARCHAR(100), v_challenge.id, NULL::UUID, v_challenge.method, v_challenge.normalized_value, v_challenge.intent, v_challenge.surface, v_challenge.failed_attempts, FALSE;
    RETURN;
  END IF;

  -- Terminal state: cancelled
  IF v_challenge.status = 'CANCELLED' THEN
    RETURN QUERY SELECT FALSE, 'CHALLENGE_CANCELLED'::VARCHAR(100), v_challenge.id, NULL::UUID, v_challenge.method, v_challenge.normalized_value, v_challenge.intent, v_challenge.surface, v_challenge.failed_attempts, FALSE;
    RETURN;
  END IF;

  -- Terminal state: locked due to prior failed attempts
  IF v_challenge.status = 'LOCKED' OR v_challenge.failed_attempts >= p_max_failed_attempts THEN
    RETURN QUERY SELECT FALSE, 'CHALLENGE_LOCKED'::VARCHAR(100), v_challenge.id, NULL::UUID, v_challenge.method, v_challenge.normalized_value, v_challenge.intent, v_challenge.surface, v_challenge.failed_attempts, TRUE;
    RETURN;
  END IF;

  -- Overall challenge lifecycle expiry
  IF v_now > v_challenge.challenge_expires_at THEN
    UPDATE public.auth_challenges
    SET status = 'EXPIRED', updated_at = v_now
    WHERE id = v_challenge.id;

    RETURN QUERY SELECT FALSE, 'CHALLENGE_EXPIRED'::VARCHAR(100), v_challenge.id, NULL::UUID, v_challenge.method, v_challenge.normalized_value, v_challenge.intent, v_challenge.surface, v_challenge.failed_attempts, FALSE;
    RETURN;
  END IF;

  -- Current generation OTP secret expiry
  IF v_now > v_challenge.otp_expires_at THEN
    RETURN QUERY SELECT FALSE, 'OTP_EXPIRED'::VARCHAR(100), v_challenge.id, NULL::UUID, v_challenge.method, v_challenge.normalized_value, v_challenge.intent, v_challenge.surface, v_challenge.failed_attempts, FALSE;
    RETURN;
  END IF;

  -- Digest verification check
  IF v_challenge.otp_digest <> p_otp_digest THEN
    v_challenge.failed_attempts := v_challenge.failed_attempts + 1;
    IF v_challenge.failed_attempts >= p_max_failed_attempts THEN
      UPDATE public.auth_challenges
      SET failed_attempts = v_challenge.failed_attempts,
          status = 'LOCKED',
          updated_at = v_now
      WHERE id = v_challenge.id;

      RETURN QUERY SELECT FALSE, 'MAX_ATTEMPTS_EXCEEDED'::VARCHAR(100), v_challenge.id, NULL::UUID, v_challenge.method, v_challenge.normalized_value, v_challenge.intent, v_challenge.surface, v_challenge.failed_attempts, TRUE;
      RETURN;
    ELSE
      UPDATE public.auth_challenges
      SET failed_attempts = v_challenge.failed_attempts,
          updated_at = v_now
      WHERE id = v_challenge.id;

      RETURN QUERY SELECT FALSE, 'INVALID_OTP'::VARCHAR(100), v_challenge.id, NULL::UUID, v_challenge.method, v_challenge.normalized_value, v_challenge.intent, v_challenge.surface, v_challenge.failed_attempts, FALSE;
      RETURN;
    END IF;
  END IF;

  -- Digest matched! Atomically transition challenge to VERIFIED
  UPDATE public.auth_challenges
  SET status = 'VERIFIED',
      verified_at = v_now,
      updated_at = v_now
  WHERE id = v_challenge.id;

  -- Look up canonical user_id from user_identifiers
  SELECT ui.user_id INTO v_matched_user_id
  FROM public.user_identifiers ui
  WHERE ui.identifier_type = v_challenge.method
    AND ui.normalized_value = v_challenge.normalized_value
  LIMIT 1;

  RETURN QUERY SELECT TRUE, NULL::VARCHAR(100), v_challenge.id, v_matched_user_id, v_challenge.method, v_challenge.normalized_value, v_challenge.intent, v_challenge.surface, v_challenge.failed_attempts, FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.konfrm_verify_auth_challenge_v2(UUID, VARCHAR, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.konfrm_verify_auth_challenge_v2(UUID, VARCHAR, INT) TO service_role;


-- 6. Atomic Challenge Consumption Function (Single-Use Continuation Replay Guard)
CREATE OR REPLACE FUNCTION public.konfrm_consume_auth_challenge_v2(
  p_challenge_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  error_code VARCHAR(100)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_challenge public.auth_challenges%ROWTYPE;
BEGIN
  SELECT * INTO v_challenge
  FROM public.auth_challenges
  WHERE id = p_challenge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'CHALLENGE_NOT_FOUND'::VARCHAR(100);
    RETURN;
  END IF;

  IF v_challenge.status = 'CONSUMED' THEN
    RETURN QUERY SELECT FALSE, 'CONTINUATION_ALREADY_CONSUMED'::VARCHAR(100);
    RETURN;
  END IF;

  IF v_challenge.status <> 'VERIFIED' THEN
    RETURN QUERY SELECT FALSE, 'CHALLENGE_NOT_VERIFIED'::VARCHAR(100);
    RETURN;
  END IF;

  UPDATE public.auth_challenges
  SET status = 'CONSUMED',
      consumed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_challenge_id;

  RETURN QUERY SELECT TRUE, NULL::VARCHAR(100);
END;
$$;

REVOKE ALL ON FUNCTION public.konfrm_consume_auth_challenge_v2(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.konfrm_consume_auth_challenge_v2(UUID) TO service_role;


-- 7. Atomic Persistent Rate Limiting Function
CREATE OR REPLACE FUNCTION public.konfrm_check_rate_limit_v2(
  p_bucket_key VARCHAR(255),
  p_window_seconds INT,
  p_max_attempts INT
)
RETURNS TABLE (
  allowed BOOLEAN,
  remaining_attempts INT,
  retry_after_seconds INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_window_start TIMESTAMPTZ;
  v_attempt_count INT;
BEGIN
  -- Compute aligned window start
  v_window_start := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);

  INSERT INTO public.auth_rate_limits (bucket_key, window_start, attempt_count, created_at, updated_at)
  VALUES (p_bucket_key, v_window_start, 1, v_now, v_now)
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET attempt_count = auth_rate_limits.attempt_count + 1, updated_at = v_now
  RETURNING attempt_count INTO v_attempt_count;

  IF v_attempt_count > p_max_attempts THEN
    RETURN QUERY SELECT FALSE, 0, (p_window_seconds - (extract(epoch from v_now)::INT % p_window_seconds))::INT;
  ELSE
    RETURN QUERY SELECT TRUE, (p_max_attempts - v_attempt_count)::INT, 0;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.konfrm_check_rate_limit_v2(VARCHAR, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.konfrm_check_rate_limit_v2(VARCHAR, INT, INT) TO service_role;


-- 8. Record migration version
INSERT INTO public.schema_migrations (version)
VALUES ('031_auth_v2_identity_and_challenges.sql')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- =============================================================================
-- KONFRM AUTH V2 QA MINIMAL BASELINE
-- Classification: AUTH_QA_MINIMAL_BASELINE
--
-- QA ONLY — DO NOT APPLY TO PRODUCTION.
--
-- This file is deliberately outside database/migrations/. It is not a
-- production migration, is not historical migration lineage, and must never
-- be recorded as a fabricated historical migration version. Retained
-- repository migrations begin at 008 while the original 000–007 baseline is
-- unavailable; replaying retained migrations against an empty database is
-- therefore invalid.
--
-- This minimal Auth-critical shape was derived from verified structural
-- evidence and current Auth/session runtime contracts. It exists only to make
-- isolated PostgreSQL Auth V2 QA reproducible. It intentionally excludes
-- bookings, properties, payments, wallets, favorites, messages, KYC, and
-- Admin business tables.
--
-- Supabase supplies anon, authenticated, and service_role in real projects.
-- Do NOT create those roles here. The isolated test harness creates disposable
-- local stand-ins before applying this baseline.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version VARCHAR(100) PRIMARY KEY,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  phone_verified_at TIMESTAMPTZ,
  full_name VARCHAR(100),
  email VARCHAR(150),
  avatar_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DEACTIVATED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_phone
  ON public.users(phone_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_status
  ON public.users(status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid() REFERENCES public.users(id) ON DELETE RESTRICT,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150),
  avatar_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DEACTIVATED')),
  verification_status VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED'
    CHECK (verification_status IN ('UNVERIFIED', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED')),
  owner_onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL,
  device_info TEXT,
  ip_address VARCHAR(45),
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  surface VARCHAR(20) NOT NULL CHECK (surface IN ('CUSTOMER', 'OWNER')),
  role VARCHAR(50) NOT NULL CHECK (role IN ('ROLE_CUSTOMER', 'ROLE_OWNER')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_sessions_owner_user_same_uuid_check
    CHECK (owner_id IS NULL OR owner_id = user_id),
  CONSTRAINT user_sessions_owner_role_requires_owner_check
    CHECK (role <> 'ROLE_OWNER' OR (owner_id IS NOT NULL AND owner_id = user_id))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_sessions_refresh_token_hash
  ON public.user_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active_user_surface
  ON public.user_sessions(user_id, surface) WHERE is_revoked IS FALSE;
CREATE INDEX IF NOT EXISTS idx_user_sessions_owner
  ON public.user_sessions(owner_id) WHERE is_revoked IS FALSE;
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token_hash
  ON public.user_sessions(refresh_token_hash);

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- EXPECTED_QA_SECURITY_HARDENING: unlike the broader current production
-- table ACLs, this isolated QA baseline exposes Auth persistence only through
-- the service_role backend path while RLS remains enabled.
REVOKE ALL ON TABLE public.users FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.owners FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.user_sessions FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.owners TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_sessions TO service_role;

COMMIT;

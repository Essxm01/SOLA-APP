-- ============================================================================
-- Sola Vacation Rentals — Database Migration 015
-- Target: Supabase Production PostgreSQL
-- Purpose: Authentication Runtime Reliability & Session Model (AUTH-02B2)
-- Location: backend/database/migrations/015_auth_02b2_sessions_and_otp.sql
-- ============================================================================

BEGIN;

-- 1. Create OTP Challenges Table for Worker Isolate Persistence
CREATE TABLE IF NOT EXISTS otp_challenges (
    phone_number VARCHAR(20) PRIMARY KEY,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    request_count INT NOT NULL DEFAULT 1,
    failed_attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Additive migration for user_sessions table: support canonical users.id and explicit surface/role
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    surface VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
    role VARCHAR(50) NOT NULL DEFAULT 'ROLE_CUSTOMER',
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_info TEXT,
    ip_address VARCHAR(45),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns if user_sessions already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_sessions' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE user_sessions ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_sessions' AND column_name = 'surface'
    ) THEN
        ALTER TABLE user_sessions ADD COLUMN surface VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_sessions' AND column_name = 'role'
    ) THEN
        ALTER TABLE user_sessions ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'ROLE_CUSTOMER';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_sessions' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE user_sessions ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;

    -- Make owner_id nullable if it has a NOT NULL constraint
    ALTER TABLE user_sessions ALTER COLUMN owner_id DROP NOT NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id) WHERE is_revoked IS FALSE;
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_hash ON user_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_otp_challenges_phone ON otp_challenges(phone_number);

COMMIT;

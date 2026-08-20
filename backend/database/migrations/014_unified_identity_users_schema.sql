-- ============================================================================
-- Sola Vacation Rentals — Database Migration 014
-- Target: Supabase Production PostgreSQL
-- Purpose: Unified Identity Schema Foundation (AUTH-02A)
-- Location: backend/database/migrations/014_unified_identity_users_schema.sql
-- ============================================================================

BEGIN;

-- 1. Create Canonical Users Table (Apex Human Account)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    phone_verified_at TIMESTAMPTZ,
    full_name VARCHAR(100),
    email VARCHAR(150),
    avatar_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DEACTIVATED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Performance & Identity Indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status) WHERE deleted_at IS NULL;

-- 2. Safe Backfill: Populate users for all existing Owners preserving exact UUIDs
-- Note: full_name, email, and avatar_url are intentionally left NULL to avoid promoting runtime fallbacks
INSERT INTO users (id, phone_number, phone_verified_at, status, created_at, updated_at)
SELECT 
    id,
    phone_number,
    created_at AS phone_verified_at,
    status,
    created_at,
    updated_at
FROM owners
ON CONFLICT (id) DO NOTHING;

-- 3. Establish 1:1 Relationship: owners.id references users.id (Non-destructive RESTRICT)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_owners_users' AND table_name = 'owners'
    ) THEN
        ALTER TABLE owners ADD CONSTRAINT fk_owners_users FOREIGN KEY (id) REFERENCES users(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- 4. Add nullable customer_id to bookings table referencing users.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE bookings ADD COLUMN customer_id UUID NULL REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id) WHERE customer_id IS NOT NULL;

COMMIT;

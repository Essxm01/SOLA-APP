-- ----------------------------------------------------------------------------
-- Sola Vacation Rentals — Property Images & Upload Intent Remediation Schema
-- Migration 012: Upload Intents & Image Integrity Lifecycle
-- Location: database/migrations/012_property_images_remediation.sql
-- ----------------------------------------------------------------------------

-- 1. Upload Intents Table
CREATE TABLE IF NOT EXISTS upload_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_number VARCHAR(50) UNIQUE NOT NULL,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    object_key TEXT UNIQUE NOT NULL,
    expected_mime_type VARCHAR(100) NOT NULL,
    expected_size_bytes BIGINT NOT NULL CHECK (expected_size_bytes > 0 AND expected_size_bytes <= 10485760),
    idempotency_key TEXT UNIQUE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_UPLOAD' CHECK (status IN ('PENDING_UPLOAD', 'COMMITTED', 'EXPIRED', 'CANCELLED')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upload_intents_owner_property ON upload_intents(owner_id, property_id, status);
CREATE INDEX IF NOT EXISTS idx_upload_intents_expires ON upload_intents(expires_at) WHERE status = 'PENDING_UPLOAD';

-- 2. Alter Property Images Table for Integrity & Status Lifecycle
ALTER TABLE property_images ADD COLUMN IF NOT EXISTS upload_intent_id UUID REFERENCES upload_intents(id) ON DELETE SET NULL;
ALTER TABLE property_images ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DELETED'));
ALTER TABLE property_images ADD COLUMN IF NOT EXISTS sha256_checksum VARCHAR(64);
ALTER TABLE property_images ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_property_images_active ON property_images(property_id, sort_order) WHERE status = 'ACTIVE';

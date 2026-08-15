-- ----------------------------------------------------------------------------
-- Sola Vacation Rentals — Property Images & External Storage Metadata Schema
-- Migration 011: Property Images Table
-- Location: database/migrations/011_property_images.sql
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS property_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    object_key TEXT UNIQUE NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760), -- Max 10MB
    sort_order INT NOT NULL DEFAULT 0,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_images_property ON property_images(property_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_property_images_owner ON property_images(owner_id);

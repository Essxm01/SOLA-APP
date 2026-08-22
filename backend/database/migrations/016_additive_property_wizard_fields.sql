-- ----------------------------------------------------------------------------
-- Sola Vacation Rentals — Additive Property Wizard Fields Schema
-- Migration 016: Additive Property Wizard Fields
-- Location: database/migrations/016_additive_property_wizard_fields.sql
-- ----------------------------------------------------------------------------

ALTER TABLE properties ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS region VARCHAR(100);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS resort_name VARCHAR(150);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS area_sq_m INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS beds_count INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS house_rules JSONB DEFAULT '{}'::jsonb;

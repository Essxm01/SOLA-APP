-- ============================================================================
-- Sola Vacation Rentals — Database Migration 013
-- Target: Supabase Production PostgreSQL
-- Purpose: Payment Gateway Integration & Payment Transaction Audit Layer
-- Location: backend/database/migrations/013_add_payment_transactions_table.sql
-- ============================================================================

BEGIN;

-- 1. Expand bookings.status CHECK constraint to include APPROVED_PENDING_PAYMENT
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (
    status IN (
        'PENDING_OWNER_APPROVAL',
        'APPROVED_PENDING_PAYMENT',
        'CONFIRMED',
        'REJECTED',
        'EXPIRED',
        'CANCELLED_BY_OWNER',
        'CANCELLED_BY_GUEST',
        'COMPLETED'
    )
);

-- 2. Create payment_transactions Table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
    provider VARCHAR(30) NOT NULL DEFAULT 'PAYMOB' CHECK (provider IN ('PAYMOB', 'FAWRY', 'STRIPE', 'MOCK')),
    provider_order_id VARCHAR(100) UNIQUE,
    provider_transaction_id VARCHAR(100) UNIQUE,
    merchant_order_id VARCHAR(100) UNIQUE NOT NULL,
    amount_cents INT NOT NULL CHECK (amount_cents > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    payment_method VARCHAR(50) NOT NULL DEFAULT 'CARD' CHECK (payment_method IN ('CARD', 'MOBILE_WALLET', 'INSTAPAY', 'CASH')),
    status VARCHAR(30) NOT NULL DEFAULT 'INITIATED' CHECK (status IN (
        'INITIATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'
    )),
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    paymob_payment_token TEXT,
    paymob_checkout_url TEXT,
    raw_request_payload JSONB,
    raw_webhook_payload JSONB,
    webhook_event_id VARCHAR(100) UNIQUE,
    webhook_received_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    failure_code VARCHAR(50),
    failure_message TEXT,
    refunded_amount_cents INT DEFAULT 0 CHECK (refunded_amount_cents >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Performance & Audit Indexes
CREATE INDEX IF NOT EXISTS idx_payment_tx_booking ON payment_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_customer ON payment_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_provider_tx ON payment_transactions(provider_transaction_id);

COMMIT;

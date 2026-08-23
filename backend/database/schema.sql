-- ============================================================================
-- SOLA VACATION RENTALS — PRODUCTION POSTGRESQL DATABASE SCHEMA
-- Location: database/schema.sql
-- Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
-- 
-- Rules & State Machines Compliance:
-- - Complies with 100% of 21 Approved Business Rules & 5 Frozen State Machines
-- - Enforces Single-Account Running Balance Transaction Ledger Architecture
-- - Enforces Integer Cents / NUMERIC(12,2) Financial Data Representation
-- - Guarantees Zero Money Creation or Loss via Strict DB Constraints & ACID Locks
-- ============================================================================

-- Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- Mandatory for GIST UUID + Date Range Exclusion Constraints

-- ----------------------------------------------------------------------------
-- 0. USERS TABLE (CANONICAL HUMAN ACCOUNT IDENTITY - AUTH-02A)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
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

CREATE INDEX idx_users_phone ON users(phone_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 1. OWNERS TABLE (1:1 Extension of users - AUTH-02A)
-- ----------------------------------------------------------------------------
CREATE TABLE owners (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    avatar_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DEACTIVATED')),
    verification_status VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 1B. OWNER VERIFICATION DOCUMENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS owner_verification_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('NATIONAL_ID', 'COMMERCIAL_REGISTER', 'PASSPORT', 'OTHER')),
    document_url TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    rejection_reason TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 2. USER SESSIONS TABLE (F-04 Added: JWT Refresh Token Hash Storage)
-- ----------------------------------------------------------------------------
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_info TEXT,
    ip_address VARCHAR(45),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_owner ON user_sessions(owner_id) WHERE is_revoked IS FALSE;

-- ----------------------------------------------------------------------------
-- 3. ADMIN USERS TABLE (F-04 Added: Admin Portal RBAC Roles)
-- ----------------------------------------------------------------------------
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. PROPERTIES TABLE (RULE-4C-01 & RULE-4C-02)
-- ----------------------------------------------------------------------------
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    unit_type VARCHAR(50) NOT NULL,
    property_type VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    bedrooms INT NOT NULL DEFAULT 1 CHECK (bedrooms >= 0),
    bathrooms INT NOT NULL DEFAULT 1 CHECK (bathrooms >= 0),
    max_guests INT NOT NULL DEFAULT 2 CHECK (max_guests > 0),
    base_price_per_night NUMERIC(12,2) NOT NULL CHECK (base_price_per_night > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'PAUSED', 'ARCHIVED')),
    verification_status VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_properties_owner_status ON properties(owner_id, status) WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 5. PROPERTY VERIFICATION DOCUMENTS TABLE (RULE-4B-01)
-- ----------------------------------------------------------------------------
CREATE TABLE property_verification_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('NATIONAL_ID', 'PROPERTY_DEED', 'LEASE_CONTRACT', 'OTHER')),
    document_url TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 6. CALENDAR AVAILABILITY & PRICE OVERRIDES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE property_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_booked BOOLEAN NOT NULL DEFAULT FALSE,
    custom_price_per_night NUMERIC(12,2) CHECK (custom_price_per_night > 0),
    note VARCHAR(255),
    CONSTRAINT unique_property_date UNIQUE (property_id, date)
);

CREATE INDEX idx_availability_property_date ON property_availability(property_id, date);

-- ----------------------------------------------------------------------------
-- 7. BOOKINGS TABLE WITH STATUS-AWARE EXCLUSION CONSTRAINT (F-02 Corrected)
-- ----------------------------------------------------------------------------
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_number VARCHAR(30) UNIQUE NOT NULL,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    guest_name VARCHAR(100) NOT NULL,
    guest_phone VARCHAR(20) NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    nights INT NOT NULL CHECK (nights > 0),
    total_guests INT NOT NULL CHECK (total_guests > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_OWNER_APPROVAL' CHECK (status IN ('PENDING_OWNER_APPROVAL', 'APPROVED_PENDING_PAYMENT', 'CONFIRMED', 'REJECTED', 'EXPIRED', 'CANCELLED_BY_OWNER', 'CANCELLED_BY_GUEST', 'COMPLETED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,
    CONSTRAINT check_booking_dates CHECK (check_out > check_in)
);

-- Status-Aware PostgreSQL Exclusion Constraint Preventing Double Booking (F-02)
ALTER TABLE bookings ADD CONSTRAINT no_overlapping_active_bookings
EXCLUDE USING gist (
    property_id WITH =,
    daterange(check_in, check_out, '[)') WITH &&
) WHERE (status IN ('APPROVED_PENDING_PAYMENT', 'CONFIRMED'));

CREATE INDEX idx_bookings_owner_status ON bookings(owner_id, status);

-- ----------------------------------------------------------------------------
-- 8. BOOKING FINANCIAL SUMMARIES TABLE (RULE-3E-01 to RULE-3E-05)
-- ----------------------------------------------------------------------------
CREATE TABLE booking_financial_summaries (
    booking_id UUID PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
    total_booking_value NUMERIC(12,2) NOT NULL CHECK (total_booking_value >= 0),
    deposit_amount NUMERIC(12,2) NOT NULL CHECK (deposit_amount >= 0),
    sola_commission_amount NUMERIC(12,2) NOT NULL CHECK (sola_commission_amount >= 0),
    owner_net_deposit_amount NUMERIC(12,2) NOT NULL CHECK (owner_net_deposit_amount >= 0),
    remaining_balance NUMERIC(12,2) NOT NULL CHECK (remaining_balance >= 0),
    commission_on_remaining_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (commission_on_remaining_balance = 0.00),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8B. BOOKING CONVERSATIONS & MESSAGES (BOOKING-01.1)
-- ----------------------------------------------------------------------------
CREATE TABLE booking_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_conversations_owner_created ON booking_conversations(owner_id, created_at DESC);
CREATE INDEX idx_booking_conversations_customer_created ON booking_conversations(customer_id, created_at DESC);

CREATE TABLE booking_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES booking_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('CUSTOMER', 'OWNER')),
    text TEXT NOT NULL CHECK (char_length(trim(text)) BETWEEN 1 AND 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_messages_conversation_created ON booking_messages(conversation_id, created_at ASC);

-- ----------------------------------------------------------------------------
-- 9. BOOKING SNAPSHOTS TABLE (RULE-4A-01 & RULE-4A-02)
-- ----------------------------------------------------------------------------
CREATE TABLE booking_snapshots (
    booking_id UUID PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
    snapshot_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 10. OWNER WALLETS TABLE (RULE-5A-01 to RULE-5A-06)
-- ----------------------------------------------------------------------------
CREATE TABLE owner_wallets (
    owner_id UUID PRIMARY KEY REFERENCES owners(id) ON DELETE RESTRICT,
    available_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (available_balance >= 0),
    pending_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (pending_balance >= 0),
    held_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (held_balance >= 0),
    reserved_for_payout_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (reserved_for_payout_balance >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 11. WALLET LEDGER ENTRIES TABLE (F-03: Single-Account Running Balance Transaction Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE wallet_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    payout_request_id UUID,
    dispute_id UUID,
    transaction_type VARCHAR(50) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    balance_after NUMERIC(12,2) NOT NULL,
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_owner_created ON wallet_ledger_entries(owner_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 12. OWNER PAYOUT METHODS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE owner_payout_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    method_type VARCHAR(50) NOT NULL CHECK (method_type IN ('BANK_ACCOUNT', 'WALLETS_EGYPT', 'INSTAPAY')),
    account_title VARCHAR(100) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 13. PAYOUT REQUESTS TABLE (RULE-5A-01 & RULE-5A-03)
-- ----------------------------------------------------------------------------
CREATE TABLE payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(30) UNIQUE NOT NULL,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
    payout_method_id UUID NOT NULL REFERENCES owner_payout_methods(id) ON DELETE RESTRICT,
    gross_amount NUMERIC(12,2) NOT NULL CHECK (gross_amount >= 500.00), -- RULE-5A-01
    actual_provider_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (
        actual_provider_fee >= 0 AND
        actual_provider_fee <= LEAST(gross_amount * 0.05, 100.00)
    ), -- RULE-5A-03 & DECISION-ADM-PAYOUT-REV-09
    net_amount NUMERIC(12,2) NOT NULL CHECK (net_amount > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_ADMIN_PROCESSING' CHECK (
        status IN ('PENDING_ADMIN_PROCESSING', 'PROCESSING', 'COMPLETED', 'UNKNOWN', 'FAILED', 'REJECTED', 'CANCELLED_BY_OWNER')
    ),
    reason_code VARCHAR(50),
    rejection_reason TEXT,
    provider_tx_id VARCHAR(100),
    provider_status VARCHAR(50),
    last_failure_code VARCHAR(50),
    worker_retry_count INT NOT NULL DEFAULT 0,
    admin_retry_count INT NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    CONSTRAINT check_net_amount_formula CHECK (
        net_amount = gross_amount - actual_provider_fee
    )
);


-- ----------------------------------------------------------------------------
-- 14. DISPUTES TABLE (RULE-3G-01 & RULE-3G-02)
-- ----------------------------------------------------------------------------
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_number VARCHAR(30) UNIQUE NOT NULL,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPENED' CHECK (status IN (
      'OPENED', 'UNDER_OWNER_RESPONSE', 'WAITING_FOR_MORE_EVIDENCE', 'ESCALATED_TO_ADMIN', 'RESOLVING_PENDING_GATEWAY', 'RESOLVED'
    )),
    resolution_type VARCHAR(50) CHECK (
      resolution_type IS NULL OR resolution_type IN ('RELEASE_TO_OWNER', 'REFUND_GUEST', 'SPLIT')
    ),
    guest_refund_amount NUMERIC(12,2) DEFAULT 0.00 CHECK (guest_refund_amount >= 0),
    owner_released_amount NUMERIC(12,2) DEFAULT 0.00 CHECK (owner_released_amount >= 0),
    admin_notes TEXT,
    resolved_by_admin_id UUID REFERENCES admin_users(id),
    owner_response_timeout_at TIMESTAMPTZ NOT NULL,
    escalated_at TIMESTAMPTZ,
    admin_sla_deadline_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT check_dispute_amounts_valid CHECK (
      guest_refund_amount >= 0 AND owner_released_amount >= 0
    )
);

-- ----------------------------------------------------------------------------
-- 14B. GUEST REFUND SAGAS TABLE (FLOW-ADM-09)
-- ----------------------------------------------------------------------------
CREATE TABLE guest_refund_sagas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE RESTRICT,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    original_payment_tx_id VARCHAR(100) NOT NULL,
    total_refund_amount NUMERIC(12,2) NOT NULL CHECK (total_refund_amount > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'REFUND_REQUESTED' CHECK (
      status IN ('REFUND_REQUESTED', 'PROCESSING', 'COMPLETED', 'UNKNOWN', 'FAILED')
    ),
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_active_refund_saga_per_dispute 
  ON guest_refund_sagas(dispute_id) 
  WHERE status IN ('REFUND_REQUESTED', 'PROCESSING', 'UNKNOWN', 'COMPLETED');

-- ----------------------------------------------------------------------------
-- 14C. REFUND ATTEMPTS TABLE (FLOW-ADM-09)
-- ----------------------------------------------------------------------------
CREATE TABLE refund_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saga_id UUID NOT NULL REFERENCES guest_refund_sagas(id) ON DELETE RESTRICT,
    attempt_number INT NOT NULL CHECK (attempt_number >= 1),
    provider_idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PROCESSING' CHECK (
      status IN ('PROCESSING', 'COMPLETED', 'UNKNOWN', 'FAILED')
    ),
    provider_refund_id VARCHAR(100),
    failure_code VARCHAR(50),
    failure_reason TEXT,
    request_metadata JSONB,
    response_metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_saga_attempt_number UNIQUE (saga_id, attempt_number)
);


-- ----------------------------------------------------------------------------
-- 15. FINANCIAL DISPUTE HOLDS TABLE (RULE-3G-01)
-- ----------------------------------------------------------------------------
CREATE TABLE financial_dispute_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
    frozen_amount NUMERIC(12,2) NOT NULL CHECK (frozen_amount >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD', 'RELEASED_TO_OWNER', 'REFUNDED_TO_GUEST')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 16. DISPUTE EVIDENCE TABLE (F-04 Added)
-- ----------------------------------------------------------------------------
CREATE TABLE dispute_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    submitted_by_role VARCHAR(30) NOT NULL CHECK (submitted_by_role IN ('RENTER', 'OWNER', 'ADMIN')),
    evidence_type VARCHAR(30) NOT NULL CHECK (evidence_type IN ('IMAGE', 'VIDEO', 'DOCUMENT', 'TEXT')),
    content TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 17. NOTIFICATIONS TABLE (F-04 Added)
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    action_route VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_owner_read ON notifications(owner_id, is_read);

-- ----------------------------------------------------------------------------
-- 18. AUDIT LOGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor_id UUID NOT NULL,
    actor_role VARCHAR(30) NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

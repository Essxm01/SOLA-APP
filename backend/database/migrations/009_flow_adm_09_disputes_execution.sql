-- ============================================================================
-- SOLA VACATION RENTALS — PRODUCTION MIGRATION SCRIPT 009
-- Target Domain: FLOW-ADM-09 (Disputes Queue, Operational Governance & Refund Saga)
-- Execution Safety: Idempotent, Non-Destructive, Data-Backfilled
-- ============================================================================

BEGIN;

-- 1. Safely Backfill Legacy Data before applying Constraints
UPDATE disputes 
SET status = 'ESCALATED_TO_ADMIN' 
WHERE status IS NULL OR status = 'OPEN';

-- 2. Expand Disputes Table Columns & Unified Taxonomy Constraints
ALTER TABLE disputes 
  DROP CONSTRAINT IF EXISTS disputes_status_check;

ALTER TABLE disputes 
  ADD CONSTRAINT disputes_status_check 
  CHECK (status IN (
    'OPENED', 
    'UNDER_OWNER_RESPONSE', 
    'WAITING_FOR_MORE_EVIDENCE', 
    'ESCALATED_TO_ADMIN', 
    'RESOLVING_PENDING_GATEWAY', 
    'RESOLVED'
  ));

ALTER TABLE disputes 
  ADD COLUMN IF NOT EXISTS resolution_type VARCHAR(50) CHECK (
    resolution_type IS NULL OR resolution_type IN ('RELEASE_TO_OWNER', 'REFUND_GUEST', 'SPLIT')
  ),
  ADD COLUMN IF NOT EXISTS guest_refund_amount NUMERIC(12,2) DEFAULT 0.00 CHECK (guest_refund_amount >= 0),
  ADD COLUMN IF NOT EXISTS owner_released_amount NUMERIC(12,2) DEFAULT 0.00 CHECK (owner_released_amount >= 0),
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS resolved_by_admin_id UUID REFERENCES admin_users(id),
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_sla_deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- 3. Add Financial Check Invariant on Disputes
ALTER TABLE disputes 
  DROP CONSTRAINT IF EXISTS check_dispute_amounts_valid;

ALTER TABLE disputes 
  ADD CONSTRAINT check_dispute_amounts_valid 
  CHECK (
    guest_refund_amount >= 0 AND 
    owner_released_amount >= 0
  );

-- 4. Create Guest Refund Sagas Table (Parent Saga)
CREATE TABLE IF NOT EXISTS guest_refund_sagas (
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

-- Partial Unique Index to enforce EXACTLY ONE active or completed refund saga per dispute
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_refund_saga_per_dispute 
  ON guest_refund_sagas(dispute_id) 
  WHERE status IN ('REFUND_REQUESTED', 'PROCESSING', 'UNKNOWN', 'COMPLETED');

-- 5. Create Refund Attempts Table (Child Attempt History)
CREATE TABLE IF NOT EXISTS refund_attempts (
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

-- 6. Dispute Evidence Table Hardening & Append-Only Trigger
CREATE TABLE IF NOT EXISTS dispute_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE RESTRICT,
    submitted_by_role VARCHAR(30) NOT NULL CHECK (submitted_by_role IN ('RENTER', 'OWNER', 'ADMIN')),
    evidence_type VARCHAR(30) NOT NULL CHECK (evidence_type IN ('IMAGE', 'VIDEO', 'DOCUMENT', 'TEXT')),
    content TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PostgreSQL Trigger to enforce Append-Only Evidence (Block UPDATE & DELETE)
CREATE OR REPLACE FUNCTION prevent_dispute_evidence_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'DISPUTE_EVIDENCE_IS_IMMUTABLE_APPEND_ONLY: Updates and deletions are strictly forbidden on dispute evidence.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_evidence_mutation ON dispute_evidence;

CREATE TRIGGER trg_prevent_evidence_mutation
BEFORE UPDATE OR DELETE ON dispute_evidence
FOR EACH ROW EXECUTE FUNCTION prevent_dispute_evidence_mutation();

COMMIT;

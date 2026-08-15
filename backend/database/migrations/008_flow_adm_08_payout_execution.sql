-- ============================================================================
-- SOLA VACATION RENTALS — PRODUCTION MIGRATION SCRIPT 008
-- Target Domain: FLOW-ADM-08 (Payout Execution & Processing)
-- Execution Safety: Idempotent, Non-Destructive, Data-Backfilled
-- ============================================================================

BEGIN;

-- 1. Safely Backfill Legacy Data before applying Constraints
UPDATE payout_requests 
SET actual_provider_fee = 0.00 
WHERE actual_provider_fee IS NULL;

UPDATE payout_requests 
SET net_amount = gross_amount - actual_provider_fee 
WHERE net_amount IS NULL OR net_amount <> (gross_amount - actual_provider_fee);

-- 2. Add New Tracking & Rejection Columns if not exist
ALTER TABLE payout_requests 
  ADD COLUMN IF NOT EXISTS reason_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS provider_tx_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS provider_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS last_failure_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS worker_retry_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_retry_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

-- 3. Safely Re-create Status Check Constraint to include UNKNOWN & PROCESSING & FAILED
ALTER TABLE payout_requests 
  DROP CONSTRAINT IF EXISTS payout_requests_status_check;

ALTER TABLE payout_requests 
  ADD CONSTRAINT payout_requests_status_check 
  CHECK (status IN (
    'PENDING_ADMIN_PROCESSING', 
    'PROCESSING', 
    'COMPLETED', 
    'UNKNOWN', 
    'FAILED', 
    'REJECTED', 
    'CANCELLED_BY_OWNER'
  ));

-- 4. Safely Re-create Net Amount Formula Constraint
ALTER TABLE payout_requests 
  DROP CONSTRAINT IF EXISTS check_net_amount_formula;

ALTER TABLE payout_requests 
  ADD CONSTRAINT check_net_amount_formula 
  CHECK (net_amount = gross_amount - actual_provider_fee);

COMMIT;

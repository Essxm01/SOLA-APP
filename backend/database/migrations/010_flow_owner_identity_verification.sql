-- ============================================================================
-- SOLA VACATION RENTALS — MIGRATION 010: OWNER IDENTITY VERIFICATION DOCUMENTS
-- Location: backend/database/migrations/010_flow_owner_identity_verification.sql
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_owner_verif_docs_owner ON owner_verification_documents(owner_id, status);

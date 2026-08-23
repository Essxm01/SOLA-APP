-- OWNER-REGISTRATION-KYC-01
-- Explicit Owner capability registration and private three-document KYC package.
-- This migration is additive. Existing owners are considered to have completed
-- the historical Owner onboarding journey; verification status is untouched.

BEGIN;

ALTER TABLE owners
  ADD COLUMN IF NOT EXISTS owner_onboarding_completed_at TIMESTAMPTZ;

UPDATE owners
SET owner_onboarding_completed_at = COALESCE(owner_onboarding_completed_at, NOW())
WHERE owner_onboarding_completed_at IS NULL;

ALTER TABLE owner_verification_documents
  ADD COLUMN IF NOT EXISTS storage_key TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS submission_id UUID;

ALTER TABLE owner_verification_documents
  ALTER COLUMN document_url DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_owner_verification_documents_submission
  ON owner_verification_documents(owner_id, submission_id, status);

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'owner_verification_documents'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%document_type%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE owner_verification_documents DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE owner_verification_documents
  ADD CONSTRAINT owner_verification_documents_document_type_check
  CHECK (document_type IN (
    'NATIONAL_ID', 'COMMERCIAL_REGISTER', 'PASSPORT', 'OTHER',
    'NATIONAL_ID_FRONT', 'NATIONAL_ID_BACK', 'LIVE_FACE'
  ));

-- Dedicated private identity-document bucket. Property media remains unchanged.
INSERT INTO storage.buckets (id, name, public)
VALUES ('owner-verification', 'owner-verification', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- One explicit registration action creates or extends canonical identity.
CREATE OR REPLACE FUNCTION public.konfrm_register_owner(
  p_phone_number TEXT,
  p_full_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user users%ROWTYPE;
  v_owner owners%ROWTYPE;
  v_created_owner BOOLEAN := false;
BEGIN
  IF COALESCE(BTRIM(p_phone_number), '') = '' OR COALESCE(BTRIM(p_full_name), '') = '' THEN
    RAISE EXCEPTION 'OWNER_REGISTRATION_REQUIRED_FIELDS_MISSING';
  END IF;

  SELECT * INTO v_user
  FROM users
  WHERE phone_number = p_phone_number
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO users (id, phone_number, full_name, status, created_at, updated_at)
    VALUES (gen_random_uuid(), p_phone_number, BTRIM(p_full_name), 'ACTIVE', NOW(), NOW())
    RETURNING * INTO v_user;
  ELSIF v_user.full_name IS NULL OR BTRIM(v_user.full_name) = '' THEN
    UPDATE users
    SET full_name = BTRIM(p_full_name), updated_at = NOW()
    WHERE id = v_user.id
    RETURNING * INTO v_user;
  END IF;

  SELECT * INTO v_owner
  FROM owners
  WHERE id = v_user.id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO owners (
      id, phone_number, full_name, status, verification_status,
      owner_onboarding_completed_at, created_at, updated_at
    ) VALUES (
      v_user.id, v_user.phone_number, COALESCE(NULLIF(BTRIM(v_user.full_name), ''), BTRIM(p_full_name)),
      'ACTIVE', 'UNVERIFIED', NULL, NOW(), NOW()
    )
    RETURNING * INTO v_owner;
    v_created_owner := true;
  END IF;

  RETURN jsonb_build_object(
    'ownerId', v_owner.id,
    'phoneNumber', v_owner.phone_number,
    'fullName', v_owner.full_name,
    'verificationStatus', v_owner.verification_status,
    'ownerOnboardingCompletedAt', v_owner.owner_onboarding_completed_at,
    'createdOwner', v_created_owner
  );
END;
$$;

REVOKE ALL ON FUNCTION public.konfrm_register_owner(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.konfrm_register_owner(TEXT, TEXT) TO service_role;

-- The Worker verifies private objects before it calls this atomic persistence boundary.
CREATE OR REPLACE FUNCTION public.konfrm_submit_owner_kyc(
  p_owner_id UUID,
  p_documents JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner owners%ROWTYPE;
  v_submission_id UUID := gen_random_uuid();
  v_doc JSONB;
  v_document_type TEXT;
  v_required_types TEXT[] := ARRAY['NATIONAL_ID_FRONT', 'NATIONAL_ID_BACK', 'LIVE_FACE'];
  v_existing_submission UUID;
BEGIN
  SELECT * INTO v_owner FROM owners WHERE id = p_owner_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OWNER_CAPABILITY_MISSING'; END IF;

  IF v_owner.verification_status = 'VERIFIED' THEN
    RAISE EXCEPTION 'OWNER_ALREADY_VERIFIED';
  END IF;

  SELECT submission_id INTO v_existing_submission
  FROM owner_verification_documents
  WHERE owner_id = p_owner_id AND status = 'PENDING'
  ORDER BY uploaded_at DESC
  LIMIT 1;

  IF v_existing_submission IS NOT NULL AND v_owner.verification_status = 'PENDING_VERIFICATION' THEN
    RETURN jsonb_build_object(
      'submissionId', v_existing_submission,
      'verificationStatus', v_owner.verification_status,
      'ownerOnboardingCompletedAt', v_owner.owner_onboarding_completed_at,
      'idempotent', true
    );
  END IF;

  IF jsonb_typeof(p_documents) <> 'array' OR jsonb_array_length(p_documents) <> 3 THEN
    RAISE EXCEPTION 'KYC_PACKAGE_INCOMPLETE';
  END IF;

  FOR v_document_type IN SELECT jsonb_array_elements_text(jsonb_path_query_array(p_documents, '$[*].documentType')) LOOP
    IF NOT (v_document_type = ANY(v_required_types)) THEN RAISE EXCEPTION 'KYC_DOCUMENT_TYPE_INVALID'; END IF;
  END LOOP;

  IF (SELECT COUNT(DISTINCT item->>'documentType') FROM jsonb_array_elements(p_documents) item) <> 3
     OR (SELECT COUNT(*) FROM jsonb_array_elements(p_documents) item WHERE item->>'documentType' = ANY(v_required_types)) <> 3 THEN
    RAISE EXCEPTION 'KYC_REQUIRED_DOCUMENTS_MISSING';
  END IF;

  FOR v_doc IN SELECT * FROM jsonb_array_elements(p_documents) LOOP
    INSERT INTO owner_verification_documents (
      owner_id, document_type, document_url, storage_key, mime_type,
      file_size_bytes, submission_id, status, uploaded_at
    ) VALUES (
      p_owner_id, v_doc->>'documentType', NULL, v_doc->>'storageKey', v_doc->>'mimeType',
      (v_doc->>'fileSizeBytes')::BIGINT, v_submission_id, 'PENDING', NOW()
    );
  END LOOP;

  UPDATE owners
  SET verification_status = 'PENDING_VERIFICATION',
      owner_onboarding_completed_at = COALESCE(owner_onboarding_completed_at, NOW()),
      updated_at = NOW()
  WHERE id = p_owner_id
  RETURNING * INTO v_owner;

  RETURN jsonb_build_object(
    'submissionId', v_submission_id,
    'verificationStatus', v_owner.verification_status,
    'ownerOnboardingCompletedAt', v_owner.owner_onboarding_completed_at,
    'idempotent', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.konfrm_submit_owner_kyc(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.konfrm_submit_owner_kyc(UUID, JSONB) TO service_role;

-- A complete pending package is the only package Admin may decide.
CREATE OR REPLACE FUNCTION public.konfrm_review_owner_kyc(
  p_owner_id UUID,
  p_decision TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner owners%ROWTYPE;
  v_submission_id UUID;
  v_document_count INTEGER;
  v_new_status TEXT;
BEGIN
  IF p_decision NOT IN ('APPROVED', 'REJECTED') THEN RAISE EXCEPTION 'KYC_REVIEW_DECISION_INVALID'; END IF;
  IF p_decision = 'REJECTED' AND COALESCE(BTRIM(p_rejection_reason), '') = '' THEN RAISE EXCEPTION 'KYC_REJECTION_REASON_REQUIRED'; END IF;

  SELECT * INTO v_owner FROM owners WHERE id = p_owner_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OWNER_NOT_FOUND'; END IF;
  IF v_owner.verification_status <> 'PENDING_VERIFICATION' THEN RAISE EXCEPTION 'OWNER_KYC_NOT_PENDING'; END IF;

  SELECT submission_id INTO v_submission_id
  FROM owner_verification_documents
  WHERE owner_id = p_owner_id AND status = 'PENDING'
  ORDER BY uploaded_at DESC
  LIMIT 1;

  SELECT COUNT(DISTINCT document_type) INTO v_document_count
  FROM owner_verification_documents
  WHERE owner_id = p_owner_id AND submission_id = v_submission_id AND status = 'PENDING'
    AND document_type IN ('NATIONAL_ID_FRONT', 'NATIONAL_ID_BACK', 'LIVE_FACE');

  IF v_submission_id IS NULL OR v_document_count <> 3 THEN RAISE EXCEPTION 'KYC_PACKAGE_INCOMPLETE'; END IF;

  v_new_status := CASE WHEN p_decision = 'APPROVED' THEN 'VERIFIED' ELSE 'REJECTED' END;

  UPDATE owner_verification_documents
  SET status = v_new_status,
      rejection_reason = CASE WHEN p_decision = 'REJECTED' THEN BTRIM(p_rejection_reason) ELSE NULL END,
      reviewed_at = NOW()
  WHERE owner_id = p_owner_id AND submission_id = v_submission_id AND status = 'PENDING';

  UPDATE owners
  SET verification_status = v_new_status, updated_at = NOW()
  WHERE id = p_owner_id;

  RETURN jsonb_build_object('ownerId', p_owner_id, 'submissionId', v_submission_id, 'verificationStatus', v_new_status);
END;
$$;

REVOKE ALL ON FUNCTION public.konfrm_review_owner_kyc(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.konfrm_review_owner_kyc(UUID, TEXT, TEXT) TO service_role;

INSERT INTO public.schema_migrations (version)
VALUES ('020_owner_registration_kyc.sql')
ON CONFLICT (version) DO NOTHING;

COMMIT;
